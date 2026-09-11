import * as T from 'three';
import {MATCH,minimapProject} from '../match-rules.mjs?version=alpha082';

// One small shared texture darkens unexplored terrain. Model visibility and
// targeting are decided separately and synchronously by the team-vision rules.
export function createFogOfWar({vision,document=globalThis.document,size=128}){
  const mask=new Uint8Array(size*size),texture=new T.DataTexture(mask,size,size,T.RedFormat);
  texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  const originals=new Map(),materials=new Set(),canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const context=canvas.getContext('2d'),pixels=context.createImageData(size,size);let elapsed=1;
  function shade(shader){
    shader.uniforms.riftVisionMap={value:texture};
    shader.vertexShader='varying vec2 vRiftVisionUv;\n'+shader.vertexShader;
    const world=`vec4 riftVisionPosition=vec4(transformed,1.);
      #ifdef USE_BATCHING
        riftVisionPosition=batchingMatrix*riftVisionPosition;
      #endif
      #ifdef USE_INSTANCING
        riftVisionPosition=instanceMatrix*riftVisionPosition;
      #endif
      vRiftVisionUv=((modelMatrix*riftVisionPosition).xz+${(MATCH.worldSize/2).toFixed(1)})/${MATCH.worldSize.toFixed(1)};`;
    // Standard/basic materials use project_vertex. The river has its own shader.
    if(shader.vertexShader.includes('#include <project_vertex>'))shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',world+'\n#include <project_vertex>');
    else shader.vertexShader=shader.vertexShader.replace('gl_Position=',`vRiftVisionUv=((modelMatrix*vec4(p,1.)).xz+${MATCH.worldSize/2}.)/${MATCH.worldSize}.;gl_Position=`);
    shader.fragmentShader='uniform sampler2D riftVisionMap;varying vec2 vRiftVisionUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',
      'gl_FragColor.rgb*=mix(.18,1.,texture2D(riftVisionMap,clamp(vRiftVisionUv,0.,1.)).r);\n#include <tonemapping_fragment>');
  }
  function material(original){
    if(materials.has(original))return original;
    if(originals.has(original))return originals.get(original);
    const m=original.clone(),compile=original.onBeforeCompile,key=original.customProgramCacheKey();
    if(original.isShaderMaterial)m.uniforms=original.uniforms;
    m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shade(shader);};
    m.customProgramCacheKey=()=>key+'|rift-team-vision-v1';m.needsUpdate=true;
    originals.set(original,m);materials.add(m);return m;
  }
  function apply(root){root.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);});}
  function update(dt=0,force=false){elapsed+=dt;if(!force&&elapsed<.1)return;elapsed=0;
    vision.rasterize(size,'blue',mask);texture.needsUpdate=true;
    for(let i=0;i<mask.length;i++){pixels.data[i*4]=4;pixels.data[i*4+1]=6;pixels.data[i*4+2]=10;pixels.data[i*4+3]=Math.round((255-mask[i])*.78);}
    context.putImageData(pixels,0,0);
  }
  function minimap(ctx,width,height){const a=minimapProject(-MATCH.worldSize/2,-MATCH.worldSize/2,width,height),b=minimapProject(MATCH.worldSize/2,MATCH.worldSize/2,width,height);ctx.drawImage(canvas,a[0],a[1],b[0]-a[0],b[1]-a[1]);}
  return {apply,update,minimap,texture,dispose(){texture.dispose();for(const m of materials)m.dispose();materials.clear();originals.clear();}};
}
