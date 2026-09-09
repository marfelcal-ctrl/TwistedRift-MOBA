import * as T from 'three';
import {EffectComposer} from './postprocessing/EffectComposer.js';
import {RenderPass} from './postprocessing/RenderPass.js';
import {UnrealBloomPass} from './postprocessing/UnrealBloomPass.js';
import {OutputPass} from './postprocessing/OutputPass.js';
import {RoomEnvironment} from './environments/RoomEnvironment.js';

export const QUALITY_PRESETS=Object.freeze({
  maximum:{pixelRatio:2,shadow:4096,bloom:.55,particles:1000,samples:4,lights:8},
  high:{pixelRatio:1.5,shadow:2048,bloom:.4,particles:650,samples:2,lights:5},
  balanced:{pixelRatio:1,shadow:1024,bloom:0,particles:280,samples:0,lights:2}
});

// Object-space surface grain works on the merged models without UV seams.
export function detailMaterial(material){
  if(!material.isMeshStandardMaterial||material.userData.riftSurface||material.emissive?.getHex())return;
  material.userData.riftSurface=true;
  const compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.uniforms.riftGrainStrength={value:material.metalness>.5?.007:.025};
    shader.vertexShader='varying vec3 vRiftSurface;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRiftSurface=position;');
    shader.fragmentShader=`varying vec3 vRiftSurface;
uniform float riftGrainStrength;
float riftHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float riftNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(riftHash(i),riftHash(i+vec3(1,0,0)),f.x),mix(riftHash(i+vec3(0,1,0)),riftHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(riftHash(i+vec3(0,0,1)),riftHash(i+vec3(1,0,1)),f.x),mix(riftHash(i+vec3(0,1,1)),riftHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float riftGrain=riftNoise(vRiftSurface*75.);
float riftPatina=riftNoise(vRiftSurface*7.);
diffuseColor.rgb*=mix(.85,1.08,riftPatina*.8+riftGrain*.2);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(riftGrain-.5)*.13,.12,1.);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 riftDx=dFdx(-vViewPosition),riftDy=dFdy(-vViewPosition);
vec3 riftR1=cross(riftDy,normal),riftR2=cross(normal,riftDx);
float riftDet=dot(riftDx,riftR1);
vec3 riftBump=abs(riftDet)*normal-sign(riftDet)*(dFdx(riftGrain)*riftR1+dFdy(riftGrain)*riftR2)*riftGrainStrength;
if(dot(riftBump,riftBump)>1.e-14)normal=normalize(riftBump);`);
  };
  material.customProgramCacheKey=()=>cacheKey+'|rift-surface-v1';
  material.needsUpdate=true;
}

export function installGraphics({scene,renderer,camera,moon,lightSources=[],onQuality=()=>{}}){
  scene.background.setHex(0x111c25);
  scene.fog.color.setHex(0x111c25);scene.fog.density=.0048;
  renderer.toneMappingExposure=1.22;
  moon.color.setHex(0xe1e5ed);moon.intensity=2.6;
  moon.shadow.bias=-.00012;moon.shadow.normalBias=.045;
  // Follow the current camera focus with a tighter shadow frustum, retaining detail while scouting.
  moon.shadow.camera.left=moon.shadow.camera.bottom=-36;
  moon.shadow.camera.right=moon.shadow.camera.top=36;
  moon.shadow.camera.updateProjectionMatrix();scene.add(moon.target);
  const fill=new T.DirectionalLight(0x6b9bbc,.65);fill.position.set(40,20,-40);scene.add(fill);
  const localLights=Array.from({length:8},()=>{const light=new T.PointLight(0xffffff,0,14,2);scene.add(light);return light;});
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.32;
  room.dispose();pmrem.dispose();
  scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])detailMaterial(m);});
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});
  const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new T.Vector2(1,1),.55,.48,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
  let quality='maximum',width=1,height=1;
  function resize(w=innerWidth,h=innerHeight){width=Math.max(1,w);height=Math.max(1,h);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();composer.setSize(width,height);}
  function setQuality(key){
    quality=Object.hasOwn(QUALITY_PRESETS,key)?key:'maximum';const q=QUALITY_PRESETS[quality];
    const ratio=Math.min(globalThis.devicePixelRatio||1,q.pixelRatio);
    renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);
    for(const rt of [composer.renderTarget1,composer.renderTarget2]){rt.samples=Math.min(q.samples,renderer.capabilities.maxSamples);rt.dispose();}
    const size=Math.min(q.shadow,renderer.capabilities.maxTextureSize);
    moon.shadow.mapSize.set(size,size);moon.shadow.map?.dispose();moon.shadow.map=null;moon.shadow.needsUpdate=true;
    localLights.forEach((light,i)=>{light.visible=i<q.lights;});
    bloom.enabled=q.bloom>0;bloom.strength=q.bloom;resize(width,height);onQuality(q,quality);
    try{localStorage.setItem('twisted-rift-graphics',quality);}catch{}
    return quality;
  }
  let saved;try{saved=localStorage.getItem('twisted-rift-graphics');}catch{}setQuality(saved||'maximum');
  const direction=new T.Vector3(),focus=new T.Vector3();
  return {setQuality,resize,get quality(){return quality;},render(dt){
    camera.getWorldDirection(direction);focus.copy(camera.position).addScaledVector(direction,32);
    moon.target.position.set(focus.x,0,focus.z);moon.position.set(focus.x-45,70,focus.z+30);
    const nearby=lightSources.filter(s=>s.group.visible).sort((a,b)=>a.group.position.distanceToSquared(focus)-b.group.position.distanceToSquared(focus));
    localLights.forEach((light,i)=>{const source=nearby[i];light.intensity=source&&source.group.position.distanceToSquared(focus)<1200?source.intensity||28:0;if(light.intensity){light.color.setHex(source.color);light.position.copy(source.group.position);light.position.y+=source.height||3;}});
    composer.render(dt);
  },dispose(){composer.dispose();bloom.dispose();environment.dispose();scene.environment=null;localLights.forEach(l=>l.removeFromParent());fill.removeFromParent();}};
}
