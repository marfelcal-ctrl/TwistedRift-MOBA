import fs from 'node:fs/promises';
import {GLTFLoader} from '../../art/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../../art/meshopt_decoder.mjs';
import {registerBlenderAsset} from '../../art/blender-assets.mjs';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class ProgressEvent extends Event{
  constructor(type,init={}){super(type);Object.assign(this,init);}
};

// CPU geometry/animation verification. Image decoding and GPU rendering remain
// browser checks; the original material/texture descriptors are returned too.
export async function loadBlenderAssets(){
  const base=new URL('../../assets/models/',import.meta.url);
  const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base),'utf8'));
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const results=[];
  for(const entry of manifest.assets){
    const original=JSON.parse(await fs.readFile(new URL(entry.file,base),'utf8'));
    const data=structuredClone(original);
    for(const buffer of data.buffers||[]){
      if(buffer.uri){const bytes=await fs.readFile(new URL(buffer.uri,base));buffer.uri='data:application/octet-stream;base64,'+bytes.toString('base64');}
    }
    function withoutTextures(value){
      if(!value||typeof value!=='object')return;
      for(const key of Object.keys(value)){if(key.endsWith('Texture'))delete value[key];else withoutTextures(value[key]);}
    }
    data.materials?.forEach(withoutTextures);data.images=[];data.textures=[];
    for(const key of ['extensionsUsed','extensionsRequired'])if(data[key])data[key]=data[key].filter(x=>x!=='EXT_texture_webp');
    const gltf=await loader.parseAsync(JSON.stringify(data),'');
    const model=registerBlenderAsset(entry.id,gltf);
    results.push({entry,original,model});
  }
  return results;
}
