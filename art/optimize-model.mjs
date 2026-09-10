import * as T from 'three';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';
// Flatten decorative groups within each articulated joint before merging. Every
// triangle and animation joint is retained; static detail takes fewer draw calls.
const jointName=/^(arm_|leg_|wheel_|banner_|cloth_|cape$|torso$|head$|weapon$|shield$)/;
export function optimizeModel(root){
  function flatten(parent){
    for(const child of [...parent.children]){
      if(child.isGroup&&!jointName.test(child.name)){
        child.updateMatrix();
        // Applying the exact matrix retains nested nonuniform scale and shear.
        for(const part of [...child.children]){part.updateMatrix();part.matrix.premultiply(child.matrix);part.matrix.decompose(part.position,part.quaternion,part.scale);part.matrixAutoUpdate=false;parent.add(part);}
        parent.remove(child);flatten(parent);return;
      }
      if(child.isGroup)flatten(child);
    }
  }
  flatten(root);
  for(const parent of [...walk(root)]){
    const buckets=new Map();
    for(const child of [...parent.children]){
      if(!child.isMesh||['body','crystal'].includes(child.name)||Array.isArray(child.material))continue;
      if(child.matrixAutoUpdate)child.updateMatrix();
      const key=child.material; if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child);
    }
    for(const [mat,items]of buckets){
      if(items.length<2)continue;
      const geometries=items.map(child=>{const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(child.matrix);geo.deleteAttribute('uv');geo.clearGroups();return geo;});
      const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;
      const mesh=new T.Mesh(merged,mat);mesh.castShadow=items.some(o=>o.castShadow);mesh.receiveShadow=items.some(o=>o.receiveShadow);mesh.matrixAutoUpdate=false;parent.add(mesh);
      for(const child of items)parent.remove(child);
    }
    // Joint matrices must continue responding to the animation mixer.
    if(parent.isGroup&&jointName.test(parent.name))parent.matrixAutoUpdate=true;
  }
  return root;
}
function* walk(root){yield root;for(const c of [...root.children])yield* walk(c);}
