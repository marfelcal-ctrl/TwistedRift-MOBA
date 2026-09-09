import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mapPoints} from '../match-rules.mjs';
import {createCombatVfx} from '../art/combat-vfx.mjs';
import {createBattlefield} from '../art/battlefield.mjs';
import {installRiftArt} from '../art/game-art.mjs';
import {detailMaterial,QUALITY_PRESETS} from '../art/graphics.mjs';

function fixture(){const scene=new T.Scene(),player={group:new T.Group(),alive:true,shield:0,attackAnim:0};scene.add(player.group);return {scene,player};}
test('projectile damage survives visual saturation and quality changes, exactly once',()=>{
  const f=fixture(),vfx=createCombatVfx(f);let hits=0;
  for(let i=0;i<160;i++)vfx.projectile(new T.Vector3(),new T.Vector3(3,1,0),0xff4466,()=>hits++,.5);
  vfx.setBudget(QUALITY_PRESETS.balanced.particles);vfx.update(.25,1);assert.equal(hits,0);
  vfx.update(.25,1.25);assert.equal(hits,160);assert.equal(vfx.counts.projectiles,0);
  for(let i=0;i<100;i++)vfx.update(.033,1.25+i*.033);assert.equal(hits,160);
  assert.ok(vfx.counts.particles<=QUALITY_PRESETS.balanced.particles);vfx.dispose();assert.equal(f.scene.children.length,1);
});
test('temporary effects expire, shield and ultimate track their actual state',()=>{
  const f=fixture(),vfx=createCombatVfx(f),target={alive:true,group:new T.Group()};f.player.deadlineTarget=target;f.player.deadlineUntil=2;f.player.shield=100;
  for(let i=0;i<150;i++){vfx.ring(new T.Vector3());vfx.slash(new T.Vector3(),new T.Vector3(0,0,1));}
  assert.equal(vfx.counts.effects,128);vfx.update(.6,1);
  assert.equal(vfx.counts.effects,0);f.player.shield=0;target.alive=false;vfx.update(.01,2.1);
  const groups=f.scene.getObjectByName('Combat and ambient effects').children.filter(o=>o.isGroup);
  assert.equal(groups.filter(o=>!o.visible).length,2);vfx.dispose();
});
test('terrain reserves lane and spawn space and supports the bridge deck',()=>{
  const scene=new T.Scene(),laneA=[[-50,50],[-55,-29],[-48,-48],[50,-50]],laneB=[[-50,50],[48,48],[55,-31],[50,-50]];
  const field=createBattlefield({scene,laneA:mapPoints(laneA),laneB:mapPoints(laneB),camps:mapPoints([[-36,10,'yellow']]),wallSpots:[]});
  assert.equal(field.heightAt(-25.2,7),0);assert.equal(field.heightAt(-23.1,-23.1),.61*.8);assert.equal(field.heightAt(-38.5,38.5),.77*.8);assert.equal(field.heightAt(0,0),.37);
  assert.ok(field.root.children.some(o=>o.isInstancedMesh&&o.name==='bridge'));assert.ok(field.root.children.some(o=>o.isInstancedMesh&&o.name==='pine'));
  field.root.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));if(o.isInstancedMesh)assert.ok(o.instanceMatrix.array.every(Number.isFinite));}});
  field.update(12);assert.equal(field.water.material.uniforms.time.value,12);
});
test('surface detail composes with wind and all shader includes resolve cleanly',()=>{
  const material=new T.MeshStandardMaterial();let inherited=0;
  material.onBeforeCompile=shader=>{inherited++;shader.uniforms.wind={value:0};};detailMaterial(material);detailMaterial(material);
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,{});
  assert.equal(inherited,1);assert.ok(shader.uniforms.wind);assert.ok(shader.uniforms.riftGrainStrength);
  function resolve(s){return s.replace(/#include <([^>]+)>/g,(_,name)=>{assert.ok(T.ShaderChunk[name],name);return resolve(T.ShaderChunk[name]);});}
  for(const source of [shader.vertexShader,shader.fragmentShader])assert.ok(!resolve(source).includes('#include'));
  assert.ok(shader.fragmentShader.indexOf('float riftGrain=')<shader.fragmentShader.indexOf('roughnessFactor=clamp'));
  assert.match(material.customProgramCacheKey(),/rift-surface/);
});
test('new minions gain articulated models, move their wheels and release dead animation state',()=>{
  const f=fixture(),pitlord=new T.Group(),minions=[];f.scene.add(pitlord);
  const art=installRiftArt({...f,pitlord,pitOwner:{group:pitlord},enemies:[],towers:[],cores:[],jungle:[],minions,heightAt:()=>.31});
  const m={kind:'minion',team:'blue',type:'special',group:new T.Group(),alive:true,nextHit:0};f.scene.add(m.group);minions.push(m);
  art.update(.016);assert.equal(art.animatedCount,3);assert.equal(m.group.position.y,.31);
  const wheel=m.group.getObjectByName('wheel_-1_-0.4');assert.ok(wheel);m.group.position.x=1;art.update(.016);assert.notEqual(wheel.rotation.x,0);
  m.alive=false;art.update(.016);assert.equal(art.animatedCount,2);assert.equal(m.group.parent,null);
});

test('model batching preserves triangles, bounds, crystal nodes and articulated animation',async()=>{
  const {makeHero,makeMinion,makeStructure,animationClips}=await import('../art/model-factory.mjs');
  const {optimizeModel}=await import('../art/optimize-model.mjs');
  const count=root=>{let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;meshes++;}});return {triangles,meshes};};
  for(const build of [()=>makeHero('ramzx'),()=>makeMinion('blue','siege'),()=>makeStructure('red','tower')]){
    const original=build(),optimized=optimizeModel(original.clone(true));
    assert.equal(count(optimized).triangles,count(original).triangles);assert.ok(count(optimized).meshes<count(original).meshes);
    const before=new T.Box3().setFromObject(original,true),after=new T.Box3().setFromObject(optimized,true);
    assert.ok(before.min.distanceTo(after.min)<1e-5);assert.ok(before.max.distanceTo(after.max)<1e-5);
    for(const name of ['Idle','Walk','Attack']){
      const clips=animationClips(original),clip=clips.find(c=>c.name===name);if(!clip)continue;
      const a=new T.AnimationMixer(original),b=new T.AnimationMixer(optimized);
      a.clipAction(clip).play();b.clipAction(animationClips(optimized).find(c=>c.name===name)).play();a.update(.25);b.update(.25);
      for(const track of clip.tracks){const joint=track.name.split('.')[0],x=original.getObjectByName(joint),y=optimized.getObjectByName(joint);assert.ok(y);assert.ok(x.quaternion.toArray().every((v,i)=>Math.abs(v-y.quaternion.toArray()[i])<1e-6),`${joint} ${x.quaternion.toArray()} vs ${y.quaternion.toArray()}`);assert.equal(y.matrixAutoUpdate,true);}
      a.stopAllAction();b.stopAllAction();
    }
    if(original.getObjectByName('crystal'))assert.ok(optimized.getObjectByName('crystal')?.isMesh);
  }
});
test('offscreen VFX omit visual work while delivering damage once',()=>{
  const f=fixture(),vfx=createCombatVfx({...f,focus:()=>new T.Vector3()});let hits=0;
  vfx.projectile(new T.Vector3(100,1,100),new T.Vector3(101,1,100),0xff0000,()=>hits++,.3);
  vfx.burst(new T.Vector3(100,1,100));vfx.ring(new T.Vector3(100,0,100));
  assert.equal(vfx.counts.particles,0);assert.equal(vfx.counts.effects,0);
  vfx.update(.3,.3,false);vfx.present();assert.equal(hits,1);vfx.update(.3,.6);assert.equal(hits,1);vfx.dispose();
});
