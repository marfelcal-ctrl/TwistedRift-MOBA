// Dither the local hero while concealed so the player can still steer them.
// Enemy visibility remains a gameplay decision on the entire unit group.
// Coverage fading keeps opaque depth ordering and avoids sorting armor parts.
export function createBrushAppearance(root){
  const fade={value:0},materials=new Map();
  function material(original){
    if(materials.has(original))return materials.get(original);
    const m=original.clone(),compile=original.onBeforeCompile,key=original.customProgramCacheKey();
    m.onBeforeCompile=function(shader,renderer){
      compile.call(this,shader,renderer);shader.uniforms.riftBrushFade=fade;
      shader.fragmentShader='uniform float riftBrushFade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
        float riftBrushPattern=mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y)*2.,4.)*.25+.125;
        if(riftBrushPattern<riftBrushFade*.5)discard;`);
    };
    m.customProgramCacheKey=()=>key+'|rift-local-brush-v1';m.needsUpdate=true;materials.set(original,m);return m;
  }
  root.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);});
  return {update(concealed,dt){fade.value+=((concealed?1:0)-fade.value)*Math.min(1,Math.max(0,dt)*12);},
    dispose(){for(const m of materials.values())m.dispose();materials.clear();}};
}
