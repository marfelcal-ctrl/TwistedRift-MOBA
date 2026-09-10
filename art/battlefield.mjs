import * as T from 'three';
import {MATCH,mapCoordinate,mapPoints} from '../match-rules.mjs?version=alpha081';
import {makeTerrain} from './model-factory.mjs';
import {optimizeModel} from './optimize-model.mjs?version=alpha081';
import {BRUSHES} from '../vision-rules.mjs?version=alpha081';
import {createNavigation,LANE_BARRIERS} from '../navigation.mjs?version=alpha081';
// Repeated terrain shares geometry and materials through GPU instancing.
export function createBattlefield({scene,laneA,laneB,camps,wallSpots=[]}){
 const S=MATCH.mapScale,half=MATCH.worldSize/2;
 const root=new T.Group();root.name='Detailed battlefield';scene.add(root);
 const templates=new Map(),placements=new Map(),bounds=new Map(),wind={value:0},navigation=createNavigation({half});
 function place(type,x,z,yaw=0,scale=1,y=0){
   if(!templates.has(type)){const model=optimizeModel(makeTerrain(type));templates.set(type,model);bounds.set(type,new T.Box3().setFromObject(model,true));}
   if(!placements.has(type))placements.set(type,[]);const m=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw),new T.Vector3(scale,scale,scale));placements.get(type).push(m);
   if(type==='cliff'||type==='ruin_wall'){const box=bounds.get(type),center=box.getCenter(new T.Vector3()).applyMatrix4(m),size=box.getSize(new T.Vector3()).multiplyScalar(scale);navigation.addBox(center.x,center.z,size.x/2,size.z/2,yaw,type);}
   if(type==='pine')navigation.addCircle(x,z,.17*scale,'tree');
   if(type==='bridge')for(const side of [-1,1]){const p=new T.Vector3(side*3,0,0).applyMatrix4(m);navigation.addBox(p.x,p.z,.3*scale,6*scale,yaw,'bridge rail');}
 }
 function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
 function laneDistance(x,z){let d=Infinity;for(const lane of [laneA,laneB])for(let i=1;i<lane.length;i++)d=Math.min(d,segmentDistance(x,z,lane[i-1],lane[i]));return d;}
 const waterCenter=t=>Math.sin(t*.075)*1.2;
 function terrainHeight(x,z){const riverD=Math.abs(x-z-waterCenter((x+z)*.5))/Math.SQRT2;const base=Math.min(Math.hypot(x+49*S,z-49*S),Math.hypot(x-49*S,z+49*S));if(base<8||Math.hypot(x,z)<7||laneDistance(x,z)<3.8||camps.some(c=>Math.hypot(x-c[0],z-c[1])<3.7))return 0;if(riverD<4.1)return -.55;const reserve=T.MathUtils.smoothstep(Math.min(laneDistance(x,z),riverD),3.5,7);return (.2+Math.sin(x*.17)*Math.cos(z*.12)*.16+Math.sin(z*.28+x*.14)*.1)*reserve;}
 function heightAt(x,z){for(const k of [-33*S,33*S]){const dx=x-k,dz=z-k,lx=(dx+dz)*Math.SQRT1_2,lz=(-dx+dz)*Math.SQRT1_2;if(Math.abs(lx)<2.9*.8&&Math.abs(lz)<6*.8)return .61*.8;}if(Math.min(Math.hypot(x+55*S,z-55*S),Math.hypot(x-55*S,z+55*S))<3.7*.8)return .77*.8;if(Math.hypot(x,z)<6.5)return .37;if(laneDistance(x,z)<2.7)return .31;return terrainHeight(x,z);}
 const terrain=new T.PlaneGeometry(MATCH.worldSize,MATCH.worldSize,112,112);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position,colors=[];for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrainHeight(x,z)-.055);const n=(Math.sin(x*.51+z*.27)+1)*.5;colors.push(.095+n*.023,.16+n*.025,.125+n*.023);}terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();const land=new T.Mesh(terrain,new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95}));land.receiveShadow=true;root.add(land);
 const riverPos=[],riverUvs=[],riverIdx=[];for(let i=0;i<=120;i++){const t=(-65+i*130/120)*S,off=waterCenter(t);for(const side of [-1,1]){riverPos.push(t+off+side*2.6,-.19,t-side*2.6);riverUvs.push((side+1)/2,i/120*20);}if(i<120){const k=i*2;riverIdx.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const riverGeo=new T.BufferGeometry();riverGeo.setAttribute('position',new T.Float32BufferAttribute(riverPos,3));riverGeo.setAttribute('uv',new T.Float32BufferAttribute(riverUvs,2));riverGeo.setIndex(riverIdx);riverGeo.computeVertexNormals();const waterUniforms={time:{value:0},fogColor:{value:new T.Color(0x111c25)}};
 const water=new T.Mesh(riverGeo,new T.ShaderMaterial({uniforms:waterUniforms,side:T.DoubleSide,vertexShader:`uniform float time;varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec3 p=position;p.y+=sin(p.x*.7+time*1.6)*.028+sin(p.z*1.1-time)*.019;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float time;uniform vec3 fogColor;varying vec2 vUv;varying vec3 vWorld;void main(){float flow=sin(vUv.y*18.-time*3.+sin(vUv.x*18.+time));float wave=pow(max(0.,flow),14.);float edge=pow(abs(vUv.x-.5)*2.,12.);vec3 c=mix(vec3(.015,.085,.12),vec3(.035,.21,.26),.5+.5*sin(vUv.y*.37+time*.3));c+=vec3(.15,.32,.37)*(wave*.5+edge*.35);float f=1.-exp(-length(cameraPosition-vWorld)*.006);gl_FragColor=vec4(mix(c,fogColor,f),1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')}));root.add(water);
 for(const lane of [laneA,laneB])for(let i=1;i<lane.length;i++){const a=lane[i-1],b=lane[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),steps=Math.ceil(length/3.8);for(let s=0;s<steps;s++){const t=(s+.5)/steps;place('lane_tile',a[0]+dx*t,a[1]+dz*t,Math.atan2(dx,dz),1,.025);}}
 for(const k of [-33*S,33*S])place('bridge',k,k,-Math.PI/4,.8);
 for(const {a,b}of LANE_BARRIERS){const dx=b[0]-a[0],dz=b[1]-a[1],steps=Math.ceil(Math.hypot(dx,dz)/3.2),yaw=-Math.atan2(dz,dx);
   for(let i=0;i<steps;i++){const t=(i+.5)/steps,x=a[0]+dx*t,z=a[1]+dz*t;place('cliff',x,z,yaw,.9,terrainHeight(x,z));}
 }
 for(const [x,z,s=1]of wallSpots)place('cliff',x,z,Math.atan2(z,x),s*.85,terrainHeight(x,z));
 for(let i=-half+3;i<=half-3;i+=4.8)for(const [x,z,a]of [[i,-half,0],[i,half,0],[-half,i,Math.PI/2],[half,i,Math.PI/2]])place('cliff',x,z,a,1.6);
 for(const [x,z]of mapPoints([[-28,15],[-14,28],[28,-15],[14,-28],[-28,-17],[28,17]]))place('ruin_wall',x,z,Math.PI/4,1,terrainHeight(x,z));
 // The Pitlord arena is rendered by game-art; use those same pillar transforms.
 for(let i=0;i<14;i++){const a=i*Math.PI*2/14;if(Math.abs(Math.sin(a))>.35)navigation.addBox(Math.sin(a)*6.4,Math.cos(a)*6.4,.575,.6,a,'pit wall');}
 let seed=371;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let i=0;i<550;i++){const x=(rand()*100-50)*S,z=(rand()*100-50)*S;if(laneDistance(x,z)<4.5||Math.abs(x-z)<9.5||Math.hypot(x,z)<9||Math.hypot(x+49*S,z-49*S)<9||Math.hypot(x-49*S,z+49*S)<9||camps.some(c=>Math.hypot(x-c[0],z-c[1])<4.7))continue;place('pine',x,z,rand()*6.28,.55+rand()*.5,terrainHeight(x,z));}
 const windMaterials=new Set();
 for(const [type,matrices]of placements){const prototype=templates.get(type);prototype.updateMatrixWorld(true);prototype.traverse(o=>{if(!o.isMesh)return;let mat=o.material;if(type==='pine'){mat=mat.clone();mat.userData.windUniform=wind;mat.onBeforeCompile=shader=>{shader.uniforms.riftWind=wind;shader.vertexShader='uniform float riftWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat phase=riftWind;\n#ifdef USE_INSTANCING\nphase+=instanceMatrix[3].x*.2+instanceMatrix[3].z*.15;\n#endif\ntransformed.x+=sin(phase+position.y*.8)*.025*pow(max(position.y,0.),1.3);');};mat.customProgramCacheKey=()=> 'rift-wind-v1';windMaterials.add(mat);}
 const cells=new Map();for(const matrix of matrices){const e=matrix.elements,key=`${Math.floor(e[12]/16)},${Math.floor(e[14]/16)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(matrix);}for(const cell of cells.values()){const inst=new T.InstancedMesh(o.geometry,mat,cell.length);inst.name=type;cell.forEach((matrix,i)=>inst.setMatrixAt(i,matrix.clone().multiply(o.matrixWorld)));inst.castShadow=inst.receiveShadow=true;inst.computeBoundingBox();inst.computeBoundingSphere();inst.matrixAutoUpdate=false;root.add(inst);}});}
 // Short grass is visibly distinct from the decorative pine forest. One
 // instanced draw per pocket keeps concealment readable without heavy foliage.
 const blade=new T.ConeGeometry(.09,1.1,3),grassMaterial=new T.MeshStandardMaterial({color:0x67834e,roughness:.95});
 for(const b of BRUSHES){const grass=new T.InstancedMesh(blade,grassMaterial,100);grass.name='Concealment grass';const dummy=new T.Object3D();
   for(let i=0;i<100;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand()),x=b.x+Math.cos(a)*r*b.rx,z=b.z+Math.sin(a)*r*b.rz,h=.85+rand()*.4;
     dummy.position.set(x,heightAt(x,z)+h*.55,z);dummy.rotation.set((rand()-.5)*.25,a,(rand()-.5)*.25);dummy.scale.set(1,h,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}
   grass.receiveShadow=true;grass.computeBoundingSphere();root.add(grass);
 }
 root.updateMatrixWorld(true);root.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
 return {root,heightAt,navigation,windMaterials,water,update(t){wind.value=t;waterUniforms.time.value=t;}};
}
