// Usage: node art/pack-models.mjs /path/exported-models
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const input=path.resolve(process.argv[2]||'exported-models');
const output=new URL('../assets/models/',import.meta.url);
await fs.mkdir(output,{recursive:true});
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder
});
const manifest=JSON.parse(await fs.readFile(path.join(input,'manifest.json'),'utf8'));
for(const entry of manifest.assets){
  const doc=await io.read(path.join(input,entry.file));
  await doc.transform(dedup(),weld(),meshopt({encoder:MeshoptEncoder,level:'medium',
    quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}),prune());
  // Every asset references the same content-addressed texture files.
  for(const texture of doc.getRoot().listTextures()){
    const hash=createHash('sha256').update(texture.getImage()).digest('hex').slice(0,16);
    texture.setURI(`textures/surface-${hash}.webp`);
  }
  for(const buffer of doc.getRoot().listBuffers())buffer.setURI(entry.id+'.bin');
  await io.write(new URL(entry.file,output).pathname,doc);
  entry.bytes=(await fs.stat(new URL(entry.file,output))).size+
    (await fs.stat(new URL(entry.id+'.bin',output))).size;
  console.log(entry.id,entry.bytes);
}
await fs.writeFile(new URL('manifest.json',output),JSON.stringify(manifest,null,2)+'\n');
