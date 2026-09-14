import {GLTFLoader} from './loaders/GLTFLoader.js';
import {MeshoptDecoder} from './meshopt_decoder.mjs';
import {clone} from './utils/SkeletonUtils.js';

const models=new Map();
const sharedTextures=new Map();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let preload;

function shareMaterialTextures(material,parser){
  if(!parser?.associations)return;
  for(const [slot,texture] of Object.entries(material)){
    if(!texture?.isTexture)continue;
    const index=parser.associations.get(texture)?.textures;
    const definition=parser.json.textures?.[index];
    const imageIndex=definition?.extensions?.EXT_texture_webp?.source??definition?.source;
    const uri=parser.json.images?.[imageIndex]?.uri;
    if(!uri)continue;
    const key=JSON.stringify([uri,texture.colorSpace,texture.wrapS,texture.wrapT,
      texture.magFilter,texture.minFilter,texture.channel,texture.flipY,
      texture.offset.toArray(),texture.repeat.toArray(),texture.center.toArray(),texture.rotation]);
    if(sharedTextures.has(key)){
      const shared=sharedTextures.get(key);
      if(shared!==texture){material[slot]=shared;texture.dispose();}
    }else sharedTextures.set(key,texture);
  }
}

export function registerBlenderAsset(id,gltf){
  const source=gltf.scene;
  source.name=id;
  const asset=source.children.find(o=>o.userData.riftAsset===id);
  source.userData={...asset?.userData,blenderAsset:id};
  // The source file namespaces joints for the authoring grid. Each runtime
  // model has its own animation mixer, so restore the original joint names.
  source.traverse(o=>{
    if(o.name.startsWith(id+'__'))o.name=o.name.slice(id.length+2);
    if(o.isMesh){o.castShadow=o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        m.userData.blenderSurface=true;shareMaterialTextures(m,gltf.parser);
      }
    }
  });
  source.animations=gltf.animations.map(original=>{
    const clip=original.clone();
    for(const track of clip.tracks)track.name=track.name.replaceAll(id+'__','');
    return clip;
  });
  models.set(id,source);
  return source;
}

export function instantiateBlenderAsset(id){
  const source=models.get(id);
  if(!source)return null;
  const instance=clone(source);
  instance.animations=source.animations;
  return instance;
}

export function preloadBlenderAssets(onProgress=()=>{}){
  if(preload)return preload;
  preload=(async()=>{
    const manifestUrl=new URL('../assets/models/manifest.json',import.meta.url);
    const response=await fetch(manifestUrl);
    if(!response.ok)throw new Error(`Asset manifest ${response.status}`);
    const manifest=await response.json(),assets=manifest.assets,failed=[];
    let next=0,finished=0;
    onProgress({finished,total:assets.length,failed:0});
    async function worker(){
      while(next<assets.length){
        const asset=assets[next++];
        try{
          const gltf=await loader.loadAsync(new URL(asset.file,manifestUrl).href);
          registerBlenderAsset(asset.id,gltf);
        }catch(error){failed.push(asset.id);console.warn(`Model unavailable: ${asset.id}`,error);}
        finished++;onProgress({finished,total:assets.length,failed:failed.length});
      }
    }
    await Promise.all([worker(),worker(),worker()]);
    return {total:assets.length,loaded:models.size,failed};
  })();
  return preload;
}

// Effects reuse authored mesh shapes, with runtime lifetime, motion and damage.
export function blenderEffectGeometry(id){
  const source=models.get(id);if(!source)return null;
  source.updateMatrixWorld(true);
  let mesh;source.traverse(o=>{if(o.isMesh&&!mesh)mesh=o;});
  return mesh?mesh.geometry.clone().applyMatrix4(mesh.matrixWorld):null;
}
