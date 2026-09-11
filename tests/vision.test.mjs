import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createTeamVision} from '../vision-rules.mjs';
import {createCombatVfx} from '../art/combat-vfx.mjs';
import {createFogOfWar} from '../art/fog-of-war.mjs';
import {createBattlefield} from '../art/battlefield.mjs';
import {createNavigation} from '../navigation.mjs';
import {createBrushAppearance} from '../art/brush-appearance.mjs';
import {gameHarness} from './helpers/game-harness.mjs';

const unit=(team,x,z,kind='hero')=>({team,alive:true,kind,group:{position:{x,y:0,z}}});

test('living allies share sight; dead sources, neutral camps and the enemy team cannot reveal the map',()=>{
  const vision=createTeamVision({brushes:[]}),hero=unit('blue',-20,0),enemy=unit('red',20,0),scout=unit('blue',15,0,'minion'),camp=unit('neutral',0,0,'jungle');
  vision.refresh([hero,enemy,camp],0);assert.equal(vision.visible(enemy),false);assert.equal(vision.visible(camp),false);assert.equal(vision.visible(hero),true);
  vision.refresh([hero,enemy,camp,scout],0);assert.equal(vision.visible(enemy),true);
  scout.alive=false;assert.equal(vision.visible(enemy),false);
  const tower=unit('blue',12,0,'tower');vision.refresh([hero,enemy,tower],0);assert.equal(vision.visible(enemy),true);
  tower.alive=false;assert.equal(vision.visible(enemy),false);
  hero.group.position.x=12;assert.equal(vision.visible(enemy),true);
  hero.alive=false;assert.equal(vision.visible(enemy),false);
});

test('grass conceals enemies until an ally enters or nearby combat briefly reveals them',()=>{
  const vision=createTeamVision({brushes:[{x:0,z:0,rx:2,rz:2}]}),hero=unit('blue',-4,0),enemy=unit('red',0,0);
  vision.refresh([hero,enemy],0);assert.equal(vision.visible(enemy),false);assert.equal(vision.pointVisible(enemy.group.position),false);
  vision.reveal(enemy,'blue',0);assert.equal(vision.visible(enemy),true);assert.equal(vision.effectVisible(enemy.group.position),true);
  vision.refresh([hero,enemy],2.01);assert.equal(vision.visible(enemy),false);
  hero.group.position.x=-1;assert.equal(vision.visible(enemy),true);
  hero.group.position.x=-4;assert.equal(vision.visible(enemy),false);
  vision.reveal(enemy,'blue',2.01);hero.group.position.x=-30;assert.equal(vision.visible(enemy),false,'combat reveal cannot track an enemy across the map');
});

test('terrain cuts team sight, fog and combat reveals; living allies can reveal the other side',()=>{
  const nav=createNavigation();nav.addBox(0,0,.4,5);
  let rays=0;const vision=createTeamVision({brushes:[],lineOfSight:(a,b)=>{rays++;return nav.lineOfSight(a,b);},sightRevision:()=>nav.revision});
  const hero=unit('blue',-4,0),enemy=unit('red',4,0),scout=unit('blue',5,0,'minion');
  const sample=(mask,x,z)=>mask[Math.floor((z+42)/84*128)*128+Math.floor((x+42)/84*128)];
  vision.refresh([hero,enemy],0);assert.equal(vision.visible(enemy),false);assert.equal(vision.visible(hero,'red'),false);
  vision.reveal(enemy,'blue');assert.equal(vision.visible(enemy),false);assert.equal(vision.effectVisible(enemy.group.position),false);
  const mask=vision.rasterize();assert.equal(sample(mask,4,0),0);assert.ok(sample(mask,-4,3)>0);
  const count=rays;vision.rasterize();assert.equal(rays-count,1,'stationary masks reuse their rays; only the live combat-reveal query remains');
  vision.refresh([hero,enemy,scout],.1);assert.equal(vision.visible(enemy),true);assert.ok(sample(vision.rasterize(),4,0)>0);
  scout.alive=false;assert.equal(vision.visible(enemy),false);assert.equal(sample(vision.rasterize(),4,0),0);
  hero.group.position.z=7;enemy.group.position.z=7;assert.equal(vision.visible(enemy),true);assert.ok(sample(vision.rasterize(),4,7)>0);
  nav.addBox(0,7,.4,1);assert.equal(vision.visible(enemy),false);assert.equal(sample(vision.rasterize(),4,7),0,'terrain revisions invalidate cached masks');
});

test('brush exposure never leaks through walls, including nearby effects and neutral aggro',()=>{
  const nav=createNavigation(),vision=createTeamVision({brushes:[{x:0,z:0,rx:2,rz:2}],lineOfSight:nav.lineOfSight,sightRevision:()=>nav.revision});
  const hero=unit('blue',-4,0),enemy=unit('red',0,0),monster=unit('neutral',-3,0,'jungle');
  vision.refresh([hero,enemy],0);assert.equal(vision.canSee(monster,enemy,7.2),false);
  vision.reveal(enemy,'blue');assert.equal(vision.visible(enemy),true);assert.equal(vision.canSee(monster,enemy,7.2),true);
  nav.addBox(.5,0,.04,2);assert.equal(vision.effectVisible({x:1,z:0}),false);
  const mask=vision.rasterize();assert.equal(mask[64*128+65],0,'the reveal halo cannot light the far side of a wall');
  nav.addBox(-1,0,.04,2);assert.equal(vision.visible(enemy),false);assert.equal(vision.canSee(monster,enemy,7.2),false);
});

test('actual walls hide nearby enemies, camps and Pitlord from models, minimap, effects and target selection',async()=>{
  const g=await gameHarness();try{
    g.run(`for(const t of towers)t.userData.alive=false;blueCore.userData.alive=redCore.userData.alive=false;
      a04SpawnWave();for(const m of a04Minions)m.alive=false;
      var hiddenMinion=a04SpawnMinion('red','A','melee');a04UpdateJungle(0,24);a04SpawnPit(true);
      var hiddenUnits=[enemies[0],hiddenMinion,a04Jungle[0],a04Pit];
      player.group.position.set(-20,0,36);for(const u of hiddenUnits)u.group.position.set(-20,0,28);updateTeamVisibility();riftFog.update(0,true);`);
    assert.ok(g.run('hiddenUnits.every(u=>u.alive&&!u.group.visible&&!visibleMapUnits().includes(u)&&nearest(Infinity)!==u)'));
    assert.equal(g.run('riftVision.effectVisible({x:-20,z:28})'),false);
    assert.equal(g.run('riftFog.texture.image.data[Math.floor((28+42)/84*128)*128+Math.floor((-20+42)/84*128)]'),0);
    g.run('for(const u of hiddenUnits)riftVision.reveal(u,"blue");updateTeamVisibility()');assert.ok(g.run('hiddenUnits.every(u=>!u.group.visible)'));
    g.run('var scout=a04SpawnMinion("blue","A","melee");scout.group.position.set(-20,0,27);updateTeamVisibility()');assert.ok(g.run('hiddenUnits.every(u=>u.group.visible&&visibleMapUnits().includes(u))'));
    g.run('scout.alive=false;updateTeamVisibility()');assert.ok(g.run('hiddenUnits.every(u=>!u.group.visible)'));
  }finally{await g.dispose();}
});

test('the local hero conceals in grass, stops enemy pursuit, and displays combat exposure until it expires',async()=>{
  const g=await gameHarness();try{
    g.run(`for(const t of towers)t.userData.alive=false;blueCore.userData.alive=redCore.userData.alive=false;for(const e of enemies.slice(1))e.alive=false;
      var b=BRUSHES[6],guard=enemies[0];player.group.position.set(b.x,0,b.z);guard.group.position.set(b.x,0,b.z+b.rz+.5);
      updateTeamVisibility();updateAlpha07(.2,now());var guardStart=guard.group.position.clone();a03UpdateEnemies(.5,now());`);
    assert.equal(g.run('player.concealed'),true);assert.equal(g.run('player.group.visible'),true);
    assert.equal(g.document.querySelector('#brushStatus').textContent,'HIDDEN');assert.equal(g.document.querySelector('#brushStatus').hidden,false);
    assert.equal(g.run('guard.group.position.distanceTo(guardStart)'),0);assert.equal(g.run('riftVision.visible(player,"red")'),false);
    g.run('guard.group.position.set(b.x+.4,0,b.z);updateTeamVisibility()');assert.equal(g.run('player.concealed'),false);assert.equal(g.document.querySelector('#brushStatus').textContent,'REVEALED');
    g.run('guard.group.position.copy(guardStart);updateTeamVisibility()');assert.equal(g.run('player.concealed'),true);
    g.run('player.facing.set(0,0,1);a06Spend("s1");skill1();updateTeamVisibility()');assert.equal(g.run('player.concealed'),false);assert.equal(g.document.querySelector('#brushStatus').textContent,'REVEALED');
    g.run('updateTeamVisibility(now()+2.01)');assert.equal(g.run('player.concealed'),true);
    g.run('player.group.position.z+=b.rz+.8;updateTeamVisibility(now()+2.02)');assert.equal(g.run('player.concealed'),false);assert.equal(g.document.querySelector('#brushStatus').hidden,true);
    g.run('player.alive=false;updateTeamVisibility()');assert.equal(g.run('player.group.visible'),false);assert.equal(g.document.querySelector('#brushStatus').hidden,true);
  }finally{await g.dispose();}
});

test('local brush fading preserves fog shaders, opaque depth and other heroes’ shared materials',()=>{
  const context={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}},document={createElement:()=>({getContext:()=>context})};
  const vision=createTeamVision(),fog=createFogOfWar({vision,document}),original=new T.MeshStandardMaterial(),local=new T.Mesh(new T.BoxGeometry(),original),other=local.clone();
  const scene=new T.Scene();scene.add(local,other);fog.apply(scene);const shared=other.material,appearance=createBrushAppearance(local);
  assert.notEqual(local.material,shared);assert.equal(other.material,shared);assert.equal(local.material.transparent,false);assert.equal(local.material.depthWrite,true);
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};local.material.onBeforeCompile(shader,{});
  assert.ok(shader.uniforms.riftVisionMap);assert.ok(shader.uniforms.riftBrushFade);assert.match(shader.fragmentShader,/riftBrushPattern<riftBrushFade\*\.5/);
  appearance.update(true,.2);assert.equal(shader.uniforms.riftBrushFade.value,1);appearance.update(false,.2);assert.equal(shader.uniforms.riftBrushFade.value,0);
  const otherShader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};other.material.onBeforeCompile(otherShader,{});assert.equal(otherShader.uniforms.riftBrushFade,undefined);
  appearance.dispose();fog.dispose();
});

test('jungle first appears at 0:24 match time, pauses in lobby, and respawns only after its defeat timer',async()=>{
  const g=await gameHarness({enter:false});try{
    g.run('for(let i=0;i<400;i++)loop(i*100)');assert.equal(g.run('now()'),0);
    assert.equal(g.run('a04Jungle.some(j=>j.alive||j.group.visible)'),false);
    assert.equal(g.run("enemies.some(e=>e.type==='stoneback')"),false,'no duplicate always-spawned Stoneback');
    g.run('riftLobby.begin();clock.resetFrame();clock.advance(0,simulateMatch);for(let i=1;i<=239;i++)clock.advance(i*100,simulateMatch)');
    assert.equal(g.run('a04Jungle.some(j=>j.alive)'),false);
    g.run('clock.advance(24000,simulateMatch);updateUi(now())');
    assert.equal(g.run('a04Jungle.filter(j=>j.alive).length'),14);
    assert.equal(g.document.querySelector('#jungleText').hidden,true);
    assert.ok(g.run('a04Jungle.every(j=>j.hp===j.maxHp)'));
    g.run('a04Hurt(a04Jungle[0],99999)');assert.equal(g.run('a04Jungle[0].alive'),false);
    const deadline=g.run('a04Jungle[0].respawnAt');assert.ok(Math.abs(deadline-69)<1e-7);
    g.run('a04UpdateJungle(0,a04Jungle[0].respawnAt-.01)');assert.equal(g.run('a04Jungle[0].alive'),false);
    g.run('a04UpdateJungle(0,a04Jungle[0].respawnAt)');assert.equal(g.run('a04Jungle[0].alive'),true);
    assert.ok(g.run('a04Jungle[0].group.position.distanceTo(a04Jungle[0].spawn)<.0001'));
    assert.equal(g.run('a04Jungle[0].hp'),g.run('a04Jungle[0].maxHp'));
  }finally{await g.dispose();}
});

test('camera scouting cannot reveal remote minions, camps or Pitlord in models, minimap or targeting',async()=>{
  const g=await gameHarness();try{
    g.run("a04SpawnWave();a04UpdateJungle(0,24);a04SpawnPit(true);updateTeamVisibility();var farMinion=a04Minions.find(m=>m.team==='red');var farCamp=a04Jungle.find(j=>j.spawn.x>20&&j.spawn.z<0)");
    assert.ok(g.run('[farMinion,farCamp,a04Pit].every(e=>e.alive&&!e.group.visible&&!visibleMapUnits().includes(e))'));
    g.run('camera.position.set(0,30,15);camera.lookAt(0,0,0);cameraSmoothedFocus.set(0,0,0);panOffset.set(30,0,-30);updateTeamVisibility()');
    assert.ok(g.run('[farMinion,farCamp,a04Pit].every(e=>!e.group.visible&&!visibleMapUnits().includes(e))'));
    assert.ok(g.run('![farMinion,farCamp,a04Pit].includes(nearest(Infinity))'));
    g.run('player.group.position.set(0,0,5);updateTeamVisibility()');
    assert.equal(g.run('a04Pit.group.visible'),true);assert.equal(g.run('visibleMapUnits().includes(a04Pit)'),true);
    g.run('player.group.position.set(-38.5,0,38.5);updateTeamVisibility()');assert.equal(g.run('a04Pit.group.visible'),false);
    g.run('a04SpawnMinion("blue","A","melee").group.position.set(0,0,5);updateTeamVisibility()');assert.equal(g.run('a04Pit.group.visible'),true);
    g.run('a04Minions[a04Minions.length-1].alive=false;updateTeamVisibility()');assert.equal(g.run('a04Pit.group.visible'),false);
  }finally{await g.dispose();}
});

test('hidden grass targets cannot be auto-attacked or marked, but aimed Sever can hit and reveal them',async()=>{
  const g=await gameHarness();try{
    g.run('var b=BRUSHES[6];enemies[0].group.position.set(b.x,0,b.z);player.group.position.set(b.x,0,b.z+b.rz+.5);player.facing.set(0,0,-1);updateTeamVisibility();a05GainXp(1800);a06Spend("ult");a06Spend("s1")');
    assert.equal(g.run('riftVision.visible(enemies[0])'),false);assert.equal(g.run('nearest(3)'),null);
    g.run('attack();ultimate();updateUi(now())');assert.equal(g.run('player.deadlineTarget'),null);assert.equal(g.run('cds.ult'),0);assert.equal(g.run('enemies[0].hp'),1900);
    assert.equal(g.document.querySelector('#targetName').textContent,'NO TARGET');
    g.run('skill1();updateTeamVisibility()');assert.ok(g.run('enemies[0].hp<1900'));assert.equal(g.run('enemies[0].group.visible'),true);
    g.run('ultimate()');assert.equal(g.run('player.deadlineTarget===enemies[0]'),true);
  }finally{await g.dispose();}
});

test('effects, particles, projectiles and Deadline marks disappear when vision is lost; damage still lands once',()=>{
  const scene=new T.Scene(),player={alive:true,group:new T.Group(),shield:0},target={alive:true,group:new T.Group()};
  let sight=true,hits=0;player.deadlineTarget=target;player.deadlineUntil=10;
  const vfx=createCombatVfx({scene,player,visibleAt:()=>sight,visibleUnit:()=>sight});
  vfx.projectile(new T.Vector3(),new T.Vector3(3,1,0),0xff0000,()=>hits++,1);vfx.ring(new T.Vector3());vfx.burst(new T.Vector3());vfx.update(.1,.1);
  assert.ok(scene.getObjectByName('Combat and ambient effects').children.find(o=>o.isInstancedMesh).count>0);
  sight=false;vfx.update(.1,.2,false);vfx.present();
  const root=scene.getObjectByName('Combat and ambient effects');assert.equal(root.children.find(o=>o.isInstancedMesh).count,0);
  assert.equal(root.children.filter(o=>o.isGroup).some(o=>o.visible),false);
  vfx.update(1,1.2);assert.equal(hits,1);vfx.update(1,2.2);assert.equal(hits,1);vfx.dispose();
});

test('fog mask refills when sight leaves; shader hooks preserve animated water and do not alter lobby materials',()=>{
  const context={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}},document={createElement:()=>({getContext:()=>context})};
  const vision=createTeamVision({brushes:[]}),hero=unit('blue',0,0);vision.refresh([hero],0);
  const fog=createFogOfWar({vision,document}),material=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),material);
  let inherited=0;material.onBeforeCompile=shader=>{inherited++;shader.uniforms.originalAnimation={value:1};};
  fog.apply(mesh);assert.notEqual(mesh.material,material);assert.equal(material.userData.riftVision,undefined);
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};mesh.material.onBeforeCompile(shader,{});
  assert.equal(inherited,1);assert.ok(shader.uniforms.originalAnimation);assert.ok(shader.uniforms.riftVisionMap);assert.match(shader.vertexShader,/instanceMatrix\*riftVisionPosition/);
  assert.match(shader.fragmentShader,/gl_FragColor.rgb\*=mix/);
  const scene=new T.Scene(),field=createBattlefield({scene,laneA:[[-30,30],[-30,-30]],laneB:[[30,30],[30,-30]],camps:[]});fog.apply(field.root);
  field.update(7);assert.equal(field.water.material.uniforms.time.value,7);
  const waterShader={vertexShader:field.water.material.vertexShader,fragmentShader:field.water.material.fragmentShader,uniforms:{...field.water.material.uniforms}};field.water.material.onBeforeCompile(waterShader,{});
  assert.match(waterShader.vertexShader,/vRiftVisionUv=\(\(modelMatrix\*vec4\(p,1\.\)/);
  assert.match(waterShader.fragmentShader,/texture2D\(riftVisionMap/);
  for(const s of [shader.vertexShader,shader.fragmentShader,waterShader.vertexShader,waterShader.fragmentShader])s.replace(/#include <([^>]+)>/g,(_,key)=>{assert.ok(T.ShaderChunk[key],key);return '';});
  fog.update(0,true);const center=64*128+64;assert.equal(fog.texture.image.data[center],255);
  hero.group.position.x=-30;fog.update(0,true);assert.equal(fog.texture.image.data[center],0);fog.dispose();
});
