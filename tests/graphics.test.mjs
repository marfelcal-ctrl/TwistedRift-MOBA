import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
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
  const field=createBattlefield({scene,laneA,laneB,camps:[[-36,10,'yellow']],wallSpots:[]});
  assert.equal(field.heightAt(-36,10),0);assert.equal(field.heightAt(-33,-33),.61);assert.equal(field.heightAt(-55,55),.77);assert.equal(field.heightAt(0,0),.37);
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
