import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation,BODY_RADIUS} from '../navigation.mjs';
import {gameHarness} from './helpers/game-harness.mjs';

test('swept circles stop fast dashes at walls and slide along rotated terrain without tunneling',()=>{
  const nav=createNavigation({half:15});nav.addBox(0,0,.5,4);nav.addBox(6,6,3,.6,Math.PI/4);
  for(const radius of Object.values(BODY_RADIUS)){
    const p={x:-4,z:0};nav.move(p,10,0,radius);assert.ok(p.x<=-.5-radius+.001);assert.equal(nav.blocked(p,radius),false);
    nav.move(p,3,2,radius);assert.ok(p.x<=-.5-radius+.001);assert.ok(p.z>1.9);assert.equal(nav.blocked(p,radius),false);
  }
  const p={x:3,z:3};nav.resolve(p,.55);for(let i=0;i<60;i++){nav.move(p,.1,.1,.55);assert.equal(nav.blocked(p,.55),false);}
});

test('AI routes around a solid divider; every segment is walkable for its body size',()=>{
  const nav=createNavigation({half:12});nav.addBox(0,0,.65,5);
  for(const radius of Object.values(BODY_RADIUS)){
    const start={x:-5,z:0},goal={x:5,z:0},route=nav.findPath(start,goal,radius);assert.ok(route.length>=2);
    let previous=start;for(const point of route){assert.equal(nav.clear(previous,point,radius),true);previous=point;}
    const actor={group:{position:{...start},rotation:{y:0}},speed:4};
    for(let i=0;i<600;i++){nav.steer(actor,goal,1/60,radius);assert.equal(nav.blocked(actor.group.position,radius),false);}
    assert.ok(Math.hypot(actor.group.position.x-goal.x,actor.group.position.z-goal.z)<.1);
  }
});

test('sight stops at thin and rotated stone, respects openings and sees over low bridge rails',()=>{
  const nav=createNavigation({half:16,cell:2});nav.addBox(0,0,.006,3);
  for(const [a,b]of [[{x:-5,z:0},{x:5,z:0}],[{x:-4,z:4},{x:4,z:-4}],[{x:-4,z:-4},{x:4,z:4}]]){
    assert.equal(nav.lineOfSight(a,b),false);assert.equal(nav.lineOfSight(b,a),false);
  }
  assert.equal(nav.lineOfSight({x:-4,z:4},{x:4,z:4}),true);
  assert.equal(nav.lineOfSight({x:-4,z:-2},{x:-4,z:2}),true);
  const rotated=createNavigation({cell:2});rotated.addBox(-3,-2,3,.4,Math.PI/4);
  const point=(x,z)=>({x:-3+(x+z)*Math.SQRT1_2,z:-2+(-x+z)*Math.SQRT1_2});
  assert.equal(rotated.lineOfSight(point(0,-3),point(0,3)),false);
  assert.equal(rotated.lineOfSight(point(-4,1),point(4,1)),true);
  const gap=createNavigation({cell:2});gap.addBox(0,-2,.3,1.8);gap.addBox(0,2,.3,1.8);
  const a={x:-4,z:0},b={x:4,z:0};assert.equal(gap.lineOfSight(a,b),true);assert.equal(gap.clear(a,b,BODY_RADIUS.hero),false,'sight is not inflated by body clearance');
  const bridge=createNavigation();bridge.addBox(0,0,.24,4,0,'bridge rail');bridge.addCircle(2,0,.2,'tree');
  assert.equal(bridge.clear(a,b),false);assert.equal(bridge.lineOfSight(a,b),true);
});

test('actual terrain keeps lane routes and jungle entrances connected and bridge rails solid',async()=>{
  const g=await gameHarness();try{
    assert.equal(g.run('riftNavigation.blocked(player.group.position,BODY_RADIUS.hero)'),false);
    assert.ok(g.run('a04Jungle.every(j=>!riftNavigation.blocked(j.spawn,BODY_RADIUS.jungle))'));
    assert.ok(g.run('a04Jungle.every(j=>riftNavigation.findPath(player.group.position,j.spawn,BODY_RADIUS.hero).length>0)',60000));
    assert.ok(g.run('[laneA,laneB].every(l=>l.slice(1).every((p,i)=>riftNavigation.clear({x:l[i][0],z:l[i][1]},{x:p[0],z:p[1]},.92)))'),'both lane formations have uninterrupted clearance');
    assert.ok(g.run('riftNavigation.shapes.filter(s=>s.kind==="bridge rail").length===4'));
    // Enter the bridge through an open end and walk over its deck.
    assert.ok(g.run(`[-23.1,23.1].every(k=>{
      const p={x:k+5*Math.SQRT1_2,z:k-5*Math.SQRT1_2};
      riftNavigation.move(p,-10*Math.SQRT1_2,10*Math.SQRT1_2,BODY_RADIUS.hero);
      return Math.hypot(p.x-(k-5*Math.SQRT1_2),p.z-(k+5*Math.SQRT1_2))<.05;
    })`));
    assert.ok(g.run(`[-23.1,23.1].every(k=>{
      const p={x:k,z:k};riftNavigation.move(p,6*Math.SQRT1_2,6*Math.SQRT1_2,BODY_RADIUS.hero);
      const localX=(p.x-k+p.z-k)*Math.SQRT1_2;
      return localX<2.4-.24-BODY_RADIUS.hero+.01&&!riftNavigation.blocked(p,BODY_RADIUS.hero);
    })`));
    assert.equal(g.run('riftBattlefield.heightAt(-23.1,-23.1)'),.61*.8);
    assert.equal(g.run('riftNavigation.clear({x:-20,z:38},{x:-20,z:25},BODY_RADIUS.hero)'),false,'lane divider blocks the direct shortcut');
    assert.equal(g.run('riftNavigation.shapes.some(s=>s.kind==="tree")'),false);
    assert.ok(g.run(`(()=>{
      const matrix=new THREE.Matrix4();
      for(const pine of riftBattlefield.root.children.filter(o=>o.isInstancedMesh&&o.name==='pine'))for(let i=0;i<pine.count;i++){
        pine.getMatrixAt(i,matrix);const center=new THREE.Vector3().setFromMatrixPosition(matrix),start={x:center.x-2,z:center.z},end={x:center.x+2,z:center.z};
        if(!riftNavigation.clear(start,end,BODY_RADIUS.pitlord))continue;
        return Object.values(BODY_RADIUS).every(radius=>{const p={...start};riftNavigation.move(p,4,0,radius);return Math.hypot(p.x-end.x,p.z-end.z)<.001;});
      }return false;
    })()`),'heroes and all creature sizes can walk through a rendered pine trunk');
  }finally{await g.dispose();}
});

test('actual movement and Execution Step respect the same divider; AI and minions stay outside terrain',async()=>{
  const g=await gameHarness();try{
    g.run('player.group.position.set(-20,0,36);player.facing.set(0,0,-1);a06Spend("s3");skill3()');
    assert.ok(g.run('player.group.position.z>32'));assert.equal(g.run('riftNavigation.blocked(player.group.position,BODY_RADIUS.hero)'),false);
    g.run('joy={active:true,x:Math.sin(yaw),y:-Math.cos(yaw)*Math.sin(pitch)};for(let i=0;i<120;i++)updatePlayer(1/60,i/60);clearJoy()');
    assert.ok(g.run('player.group.position.z>32'));
    assert.equal(g.run('riftNavigation.blocked(player.group.position,BODY_RADIUS.hero)'),false);
    g.run('a04SpawnWave();var intersections=0;for(let i=1;i<900;i++){a04UpdateMinions(1/60,i/60);for(const m of a04Minions)if(riftNavigation.blocked(m.group.position,BODY_RADIUS.minion))intersections++;}');
    assert.equal(g.run('intersections'),0);
    g.run('a04UpdateJungle(0,24);a04SpawnPit(true);player.group.position.set(0,0,8);player.hp=999999;var blockedActors=0;for(let i=0;i<360;i++){a04UpdateJungle(1/60,24+i/60);a04UpdatePit(1/60,24+i/60);for(const j of a04Jungle)if(j.alive&&riftNavigation.blocked(j.group.position,BODY_RADIUS.jungle))blockedActors++;if(riftNavigation.blocked(a04Pit.group.position,BODY_RADIUS.pitlord))blockedActors++;}');
    assert.equal(g.run('blockedActors'),0);
  }finally{await g.dispose();}
});
