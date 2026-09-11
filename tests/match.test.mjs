import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {MATCH,createMatchClock,cameraBounds,screenToWorld,moveAlongPath,UnitGrid,createResolutionController} from '../match-rules.mjs';
import {gameHarness} from './helpers/game-harness.mjs';

test('fixed clock advances movement and deadlines equally at 20/30/60/120 FPS',()=>{
  const results=[];
  for(const fps of [20,30,60,120]){
    const clock=createMatchClock();let distance=0,waves=0,next=MATCH.firstWave;
    for(let i=0;i<=70*fps;i++)clock.advance(i*1000/fps,(dt,t)=>{distance+=MATCH.minionSpeed*dt;if(t+1e-7>=next){waves++;next+=MATCH.waveInterval;}});
    results.push({distance,waves,time:clock.time});
  }
  for(const result of results){assert.ok(Math.abs(result.distance-224)<1e-6);assert.equal(result.waves,3);assert.ok(Math.abs(result.time-70)<1e-6);}
  assert.deepEqual(results[0],results[3]);
});
test('hidden tabs and long stalls cannot advance deadlines or create a wave backlog',()=>{
  const clock=createMatchClock();let steps=0;const tick=()=>steps++;
  clock.advance(0,tick);clock.advance(100,tick);assert.equal(steps,6);
  clock.advance(10000,tick);clock.advance(10100,tick,true);assert.equal(steps,6);
  clock.resetFrame();clock.advance(50000,tick);clock.advance(50050,tick);assert.equal(steps,9);
});
test('path following preserves travel distance across a corner and cannot overshoot',()=>{
  const unit={speed:3.2,index:1,path:[{x:0,z:0},{x:1,z:0},{x:1,z:10}],group:{position:{x:0,y:7,z:0},rotation:{y:0}}};
  moveAlongPath(unit,1);assert.equal(unit.group.position.x,1);assert.ok(Math.abs(unit.group.position.z-2.2)<1e-9);assert.equal(unit.group.position.y,7);
  moveAlongPath(unit,100);assert.equal(unit.group.position.z,10);assert.equal(unit.index,3);
});
test('nearby targeting ignores dead units, allies and height differences across grid borders',()=>{
  const grid=new UnitGrid(),make=(x,z,team='red',alive=true)=>({team,alive,group:{position:{x,z,y:100}}});
  const far=make(30,0),near=make(8.1,0),dead=make(7.9,0,'red',false),ally=make(8,0,'blue');
  grid.rebuild([far,near,dead,ally]);assert.equal(grid.nearestEnemy('blue',{x:7.8,z:0},1),near);
  near.alive=false;assert.equal(grid.nearestEnemy('blue',{x:7.8,z:0},1),null);
  grid.rebuild([]);assert.equal(grid.cells.size,0);
});
test('closer diagonal camera preserves team orientation and projects controls in their screen direction',()=>{
  const pitch=MATCH.cameraPitch*Math.PI/180,yaw=MATCH.cameraYaw*Math.PI/180,camera=new T.OrthographicCamera();Object.assign(camera,cameraBounds(1920,1080));camera.updateProjectionMatrix();
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*MATCH.cameraDistance,Math.sin(pitch)*MATCH.cameraDistance,Math.cos(yaw)*Math.cos(pitch)*MATCH.cameraDistance);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const blue=new T.Vector3(-10,0,10).project(camera),red=new T.Vector3(10,0,-10).project(camera);
  assert.ok(blue.x<0&&blue.y<0&&red.x>0&&red.y>0);assert.ok(MATCH.cameraYaw>=20&&MATCH.cameraYaw<=35);
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1]]){
    const direction=screenToWorld(dx,dy),p=new T.Vector3(direction.x,0,direction.z).project(camera),sx=p.x*1920/2,sy=-p.y*1080/2;
    assert.ok(Math.abs(sx*dy-sy*dx)<1e-7);assert.ok(sx*dx+sy*dy>0);
  }
  const portrait=cameraBounds(390,844);assert.ok(portrait.right-portrait.left>=19);assert.ok(portrait.top>camera.top);
});

test('actual phone camera keeps the hero readable in both orientations without widening the combat body',async()=>{
  const sizes=[];
  for(const [width,height]of [[844,390],[390,844]]){
    const g=await gameHarness({width,height});try{
      const report=JSON.parse(g.run(`JSON.stringify((()=>{
        player.group.position.set(0,0,0);cameraSmoothedFocus.set(0,0,0);loop(0);
        const model=player.group.getObjectByName('ramzx'),sizes=[];
        for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
          player.group.rotation.y=angle;scene.updateMatrixWorld(true);const box=new THREE.Box2();
          model.traverseVisible(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){
            const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);
            box.expandByPoint(new THREE.Vector2((v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2));
          }}});sizes.push({width:box.max.x-box.min.x,height:box.max.y-box.min.y,left:box.min.x,right:box.max.x,top:box.min.y,bottom:box.max.y});
        }return {sizes,bodyRadius:BODY_RADIUS.hero,speed:player.speed};
      })())`));
      for(const frame of report.sizes){
        assert.ok(frame.height>=50&&frame.height<=70,`${width}×${height}: ${JSON.stringify(frame)}`);
        assert.ok(frame.left>width*.25&&frame.right<width*.75&&frame.top>height*.25&&frame.bottom<height*.75,'hero stays in the central touch-free view');
      }
      assert.equal(report.bodyRadius,.55);assert.equal(report.speed,7.2);sizes.push(report.sizes[0]);
    }finally{await g.dispose();}
  }
  assert.ok(Math.abs(sizes[0].height-sizes[1].height)<1e-5,'rotating a phone preserves the hero’s pixel height');
});
test('adaptive resolution reduces sustained load, has a floor and recovers gradually',()=>{
  const controller=createResolutionController();
  for(let i=0;i<20*20;i++)controller.sample(1/20);assert.equal(controller.scale,.6);
  for(let i=0;i<60*5;i++)controller.sample(1/60);assert.equal(controller.scale,.6);
  for(let i=0;i<60*70;i++)controller.sample(1/60);assert.equal(controller.scale,1);
});
test('actual bootstrap: plus buttons learn without casting or opening a modal, gates stay intact',async()=>{
  const g=await gameHarness();try{
    assert.equal(g.document.querySelector('#a06Panel').hidden,true);
    const plus=key=>g.document.querySelector(`.skillUpgrade[data-upgrade="${key}"]`);
    assert.equal(plus('s1').hidden,false);assert.equal(plus('ult').hidden,true);
    plus('s1').dispatchEvent(new g.window.PointerEvent('pointerdown',{bubbles:true,pointerId:4}));
    plus('s1').dispatchEvent(new g.window.MouseEvent('click',{bubbles:true,detail:1}));
    assert.equal(g.run('player.upgrades.ranks.s1'),1);assert.equal(g.run('cds.s1'),0);assert.equal(g.run('aim'),null);
    assert.equal(plus('s1').hidden,true);assert.equal(g.document.querySelector('.skill[data-action="s1"]').disabled,false);
    g.run('a05GainXp(1800)');assert.equal(g.run('player.level'),4);assert.equal(g.document.querySelector('#a06Panel').hidden,true);
    assert.equal(plus('ult').hidden,false);plus('ult').click();assert.equal(plus('ult').hidden,true);
    g.run('a05GainXp(3200)');assert.equal(g.run('player.level'),6);assert.equal(g.run('player.maxHp'),3100);
    assert.equal(plus('ult').hidden,false);plus('ult').click();assert.equal(g.run('player.upgrades.ranks.ult'),2);assert.equal(plus('ult').hidden,true);
    const stats=g.document.querySelector('#quickStats');assert.equal(stats.hidden,false);stats.click();assert.equal(g.run('player.maxHp'),3102);
    assert.equal(g.run('player.physicalDefense'),2);assert.equal(g.run('player.magicalDefense'),2);
    g.document.querySelector('.skill[data-action="s1"]').click();assert.ok(g.run('cds.s1')>0);
    const select=g.document.querySelector('#graphicsQuality');select.value='balanced';select.dispatchEvent(new g.window.Event('change'));assert.equal(g.run('riftGraphics.quality'),'balanced');
    const auto=g.document.querySelector('#adaptiveResolution');assert.equal(auto.checked,true);auto.click();assert.equal(g.run('riftGraphics.adaptive'),false);
  }finally{await g.dispose();}
});
test('actual game: movement at 20 FPS matches 60 FPS, first-wave travel and all map positions agree',async()=>{
  const positions=[];
  for(const fps of [20,60]){
    const g=await gameHarness();try{
      positions.push(g.run(`player.group.position.set(-38.5,0,20);joy={x:Math.sin(yaw),y:-Math.cos(yaw)*Math.sin(pitch),active:true};for(let i=1;i<=${fps*3};i++)loop(i*1000/${fps});keys.clear();player.group.position.z;`));
      assert.equal(g.run('a04Wave'),0);assert.equal(g.run('a05NearFountain()'),false);
      assert.ok(g.run('[...towers,blueCore,redCore,...a04Jungle.map(j=>j.group)].every(o=>Math.abs(o.position.x)<HALF&&Math.abs(o.position.z)<HALF)'));
      assert.ok(g.run('player.group.position.toArray().every(Number.isFinite)'));
      assert.equal(g.run('ground.parent'),null);assert.equal(g.run('river.parent'),null);
    }finally{await g.dispose();}
  }
  assert.ok(Math.abs(positions[0]-positions[1])<1e-8);assert.ok(Math.abs(positions[0]-(20-MATCH.heroSpeed*3))<1e-8);
  const g=await gameHarness();try{
    g.run('for(let i=1;i<=99;i++)loop(i*100)');assert.equal(g.run('a04Wave'),0);
    g.run('loop(10000);loop(10100)');assert.equal(g.run('a04Wave'),1);assert.equal(g.run('a04Minions.length'),12);
    assert.ok(g.run('a04Minions.every(m=>m.speed===MATCH.minionSpeed&&m.group.children.length>0)'));
    const firstHit=g.run('let firstHit=0;for(let i=102;i<=360;i++){loop(i*100);if(!firstHit&&a04Minions.some(m=>m.nextHit>0))firstHit=now();}firstHit;');
    assert.ok(firstHit>=29&&firstHit<=34,`first contact ${firstHit}s`);
    const types=g.run('a04SpawnWave();a04SpawnWave();JSON.stringify(a04Minions.slice(-16).map(m=>m.type))');assert.equal(JSON.parse(types).filter(t=>t==='special').length,4);
  }finally{await g.dispose();}
});
test('ten-minute match retires dead units and mixers instead of accumulating every wave',async()=>{
  const g=await gameHarness();try{
    const report=g.run(`let peak=0;for(let i=1;i<=6000;i++){clock.advance(i*100,simulateMatch);if(i%5===0){riftArt.update(.5);peak=Math.max(peak,a04Minions.length);}}riftArt.update(0);JSON.stringify({wave:a04Wave,live:a04Minions.filter(m=>m.alive).length,retained:a04Minions.length,animated:riftArt.animatedCount,peak});`,60000);
    const result=JSON.parse(report);assert.equal(result.wave,20);assert.ok(result.retained-result.live<=2,report);assert.ok(result.peak<70,report);assert.ok(result.animated<=result.live+20,report);
  }finally{await g.dispose();}
});
