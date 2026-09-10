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
