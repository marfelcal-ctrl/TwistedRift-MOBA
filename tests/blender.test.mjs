import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {loadBlenderAssets} from './helpers/load-blender-assets.mjs';
import {instantiateBlenderAsset} from '../art/blender-assets.mjs';
import {HERO_PORTRAITS} from '../art/portraits.mjs';
import {gameHarness} from './helpers/game-harness.mjs';

test('45 Blender exports decode, preserve UVs, animate independent joints, and run in the actual battle',async()=>{
  const assets=await loadBlenderAssets();assert.equal(assets.length,45);
  for(const {entry,original,model} of assets){
    const box=new T.Box3().setFromObject(model,true);
    assert.ok(!box.isEmpty()&&box.min.toArray().every(Number.isFinite),entry.id);
    assert.ok(Math.abs(box.getCenter(new T.Vector3()).x)<3,entry.id+' must not retain the authoring grid');
    assert.ok(Math.abs(box.getCenter(new T.Vector3()).z)<3,entry.id+' must remain near the origin');
    if(entry.category!=='Effects'){
      assert.ok(original.images?.length>0,entry.id+' has PBR textures');
      for(const mesh of original.meshes)for(const primitive of mesh.primitives){
        const mat=original.materials?.[primitive.material];
        if(mat?.pbrMetallicRoughness?.baseColorTexture||mat?.normalTexture)
          assert.ok(primitive.attributes.TEXCOORD_0!==undefined,entry.id+' preserves textured UVs');
      }
    }
    for(const image of original.images||[])await fs.access(new URL('../assets/models/'+image.uri,import.meta.url));
  }
  const a=instantiateBlenderAsset('ramzx'),b=instantiateBlenderAsset('ramzx');
  assert.deepEqual(new Set(a.animations.map(c=>c.name)),new Set(['Idle','Walk','Attack']));
  const leg=a.getObjectByName('leg_l'),other=b.getObjectByName('leg_l'),before=leg.quaternion.clone();
  const mixer=new T.AnimationMixer(a);mixer.clipAction(a.animations.find(c=>c.name==='Walk')).play();mixer.update(.25);
  assert.ok(leg.quaternion.angleTo(before)>.1,'exported walk moves the leg');
  assert.ok(other.quaternion.angleTo(before)<1e-6,'other clones retain independent pose');
  for(const src of Object.values(HERO_PORTRAITS))await fs.access(new URL(src));
  const g=await gameHarness();try{
    assert.ok(g.run('player.group.children.some(c=>c.userData.blenderAsset===\'ramzx\')'));
    assert.ok(g.run('riftBattlefield.root.children.some(c=>c.userData.blenderAsset===\'battlefield_ground\')'));
    g.run('for(let i=1;i<=300;i++)loop(i*100)');
    assert.ok(g.run('a04Minions.length>0'));
    assert.ok(g.run('a04Minions.every(m=>m.group.children.some(c=>c.userData.blenderAsset))'));
    assert.ok(g.run('Number.isFinite(player.group.position.y)'));
    g.run('riftVfx.slash(player.group.position,new THREE.Vector3(0,0,1));riftVfx.update(.1)');
    assert.ok(g.run('riftVfx.counts.effects>0'));
  }finally{await g.dispose();}
});
