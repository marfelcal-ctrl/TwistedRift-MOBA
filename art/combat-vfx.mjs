import * as T from 'three';
import {MATCH} from '../match-rules.mjs?version=alpha081';

// Visual particles are pooled. Projectile callbacks have their own lifetime so
// lowering graphics or reaching the visual budget never drops combat damage.
export function createCombatVfx({scene,player,camps=[],focus=null,extent=()=>({x:30,z:28}),visibleAt=()=>true,visibleUnit=()=>true}){
  const root=new T.Group();root.name='Combat and ambient effects';scene.add(root);
  const shapes={orb:new T.IcosahedronGeometry(1,1),ring:new T.TorusGeometry(1,.026,6,64),
    arc:new T.RingGeometry(.68,1,56,1,0,Math.PI*1.15),
    shell:new T.IcosahedronGeometry(1,3),beam:new T.CylinderGeometry(.06,.2,1,10,1,true),
    shard:new T.OctahedronGeometry(1),rune:new T.TorusGeometry(1,.02,4,6)};
  const effects=[],shots=[],particles=[],capacity=1000;let budget=1000,elapsed=0,ambientTime=0;
  const particleGeometry=new T.IcosahedronGeometry(1,0),life=new T.InstancedBufferAttribute(new Float32Array(capacity),1);
  particleGeometry.setAttribute('riftLife',life);
  const particleMaterial=new T.MeshBasicMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  particleMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float riftLife;varying float vRiftLife;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRiftLife=riftLife;');
    shader.fragmentShader='varying float vRiftLife;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vRiftLife;');
  };
  particleMaterial.customProgramCacheKey=()=> 'rift-particles-v1';
  const pool=new T.InstancedMesh(particleGeometry,particleMaterial,capacity);pool.instanceMatrix.setUsage(T.DynamicDrawUsage);pool.frustumCulled=false;pool.count=0;root.add(pool);
  const dummy=new T.Object3D(),scratchColor=new T.Color();
  function inView(pos){if(!visibleAt(pos))return false;if(!focus)return true;const p=focus(),bounds=extent();return Math.abs(pos.x-p.x)<bounds.x&&Math.abs(pos.z-p.z)<bounds.z;}
  function emit(pos,color,count=16,speed=3,size=.075,lifetime=.6,up=2){
    if(!inView(pos))return;
    count=Math.min(Math.ceil(count*budget/capacity),budget-particles.length);
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,r=Math.random();particles.push({p:pos.clone(),v:new T.Vector3(Math.sin(a)*speed*r,up+Math.random()*speed,Math.cos(a)*speed*r),size:size*(.5+Math.random()),age:0,dur:lifetime*(.7+Math.random()*.6),color:new T.Color(color).multiplyScalar(2.6)});}
  }
  function material(color,opacity=1){return new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(2),transparent:true,opacity,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});}
  function mesh(g,shape,color,opacity=1){const m=new T.Mesh(shapes[shape],material(color,opacity));m.userData.opacity=opacity;g.add(m);return m;}
  function remove(g){g.removeFromParent();g.traverse(o=>{if(o.isMesh)o.material.dispose();});}
  function effect(pos,duration,build,update){if(effects.length>=128||!inView(pos))return null;const g=new T.Group();g.position.copy(pos);build(g);root.add(g);effects.push({g,age:0,duration,update});return g;}
  function fade(g,alpha){g.traverse(o=>{if(o.isMesh)o.material.opacity=o.userData.opacity*alpha;});}
  function ring(pos,color=0xe93763,start=.6,end=4,duration=.45){return effect(pos,duration,g=>{g.position.y+=.24;const a=mesh(g,'ring',color,.9);a.rotation.x=-Math.PI/2;const b=mesh(g,'rune',color,.32);b.rotation.x=-Math.PI/2;b.scale.setScalar(.83);},(g,q)=>{g.scale.setScalar(T.MathUtils.lerp(start,end,1-(1-q)**2));g.rotation.y+=.02;fade(g,1-q);});}
  function burst(pos,color=0xff426d){emit(pos.clone().add(new T.Vector3(0,1,0)),color,22,4,.085,.55,1.5);}
  function slash(pos,dir,radius=2.4,color=0xff315b){
    const angle=Math.atan2(dir.x,dir.z);
    effect(pos,.3,g=>{g.position.y+=1;g.rotation.y=angle;const a=mesh(g,'arc',color,.38);a.rotation.x=-Math.PI/2;a.rotation.z=-Math.PI*.07;const b=mesh(g,'arc',0xffb3c0,.85);b.rotation.copy(a.rotation);b.scale.set(.94,.94,1);b.position.y=.035;g.scale.setScalar(radius);},(g,q)=>{g.rotation.y=angle-.6+q*1.2;fade(g,(1-q)**1.5);});
    emit(pos.clone().addScaledVector(dir,radius*.7).add(new T.Vector3(0,1.1,0)),color,9,2,.07,.35,.8);
  }
  function dash(from,to){
    const distance=from.distanceTo(to),center=from.clone().lerp(to,.5).add(new T.Vector3(0,.7,0));
    effect(center,.42,g=>{const beam=mesh(g,'beam',0xf74470,.6);beam.scale.set(2,distance,2);beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());},(g,q)=>fade(g,1-q));
    for(let i=0;i<12;i++)emit(from.clone().lerp(to,i/11).add(new T.Vector3(0,.5,0)),0xe93b78,3,1,.095,.55,.3);
  }
  function afterimage(pos){emit(pos.clone().add(new T.Vector3(0,1.1,0)),0xb659fa,9,1,.11,.45,.4);}
  function execution(pos){
    ring(pos,0xff315b,.7,5.3,.65);emit(pos.clone().add(new T.Vector3(0,1,0)),0xff3a63,80,6,.14,1.1,4);
    effect(pos,.7,g=>{const beam=mesh(g,'beam',0xff4b76,.8);beam.position.y=5;beam.scale.set(5,10,5);for(let i=0;i<3;i++){const r=mesh(g,'rune',0xff577f,.8);r.rotation.x=Math.PI/2;r.position.y=.6+i*1.2;r.scale.setScalar(1.2-i*.25);}},(g,q)=>{g.rotation.y=q*4;fade(g,(1-q)**1.5);});
  }
  const shield=new T.Group();shield.visible=false;root.add(shield);
  const shell=mesh(shield,'shell',0x826dff,.09);shell.scale.set(1.1,1.6,1.1);
  const cage=mesh(shield,'shell',0xa399ff,.16);cage.material.wireframe=true;cage.scale.copy(shell.scale).multiplyScalar(1.012);
  for(let i=0;i<3;i++){const r=mesh(shield,'ring',0xb1b9ff,.4);r.scale.set(1.12,1.6,1.12);r.rotation.y=i*Math.PI/3;}
  function shieldCast(){ring(player.group.position,0x9784ff,.3,2.1,.5);emit(player.group.position.clone().add(new T.Vector3(0,.5,0)),0xbaa1ff,36,1.5,.08,.9,3);}
  const mark=new T.Group();root.add(mark);mark.visible=false;
  const mr=mesh(mark,'rune',0xff345e,.9);mr.rotation.x=Math.PI/2;
  const ms=mesh(mark,'shard',0xff567e,.9);ms.position.y=.65;ms.scale.set(.16,.5,.16);
  for(const x of [-.5,.5]){const m=mesh(mark,'beam',0xff7795,.8);m.position.set(x,.6,0);m.scale.set(.8,1.1,.8);m.rotation.z=x>0?-.55:.55;}
  function projectile(from,to,color,onHit,duration=.38){
    const g=new T.Group();let visible=(inView(from)||inView(to))&&shots.filter(s=>s.g).length<128;
    if(visible){const orb=mesh(g,'orb',color);orb.scale.setScalar(from.y>3?.22:.13);const halo=mesh(g,'orb',color,.15);halo.scale.setScalar(from.y>3?.45:.29);g.position.copy(from);root.add(g);}
    shots.push({from:from.clone(),to:to.clone(),color,onHit,duration:Math.max(.001,duration),age:0,trail:0,g:visible?g:null});
  }
  const ambients=[];
  for(const [x,z,color,radius,height]of [[...MATCH.fountain.blue,0x519cfa,2.08,.68],[...MATCH.fountain.red,0xee4465,2.08,.68],[0,0,0xa751ec,4,.52]]){
    const g=new T.Group();g.position.set(x,height,z);root.add(g);
    for(let i=0;i<2;i++){const r=mesh(g,'ring',color,.28);r.rotation.x=-Math.PI/2;r.scale.setScalar(radius*(1-i*.11));r.position.y=i*.12;}
    ambients.push({g,color,radius});
  }
  function update(dt,t=elapsed+dt,renderParticles=true){
    elapsed=t;
    for(let i=effects.length-1;i>=0;i--){const f=effects[i];f.age+=dt;const q=Math.min(1,f.age/f.duration);f.update(f.g,q);if(q>=1){remove(f.g);effects.splice(i,1);}}
    for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.age+=dt;s.trail+=dt;const q=Math.min(1,s.age/s.duration);if(s.g){s.g.position.lerpVectors(s.from,s.to,q);s.g.position.y+=Math.sin(q*Math.PI)*.22;s.g.rotation.y+=dt*8;if(s.trail>.045){s.trail=0;emit(s.g.position,s.color,3,.4,.065,.26,.1);}}
      if(q>=1){if(s.g)remove(s.g);shots.splice(i,1);burst(s.to.clone().add(new T.Vector3(0,-1,0)),s.color);s.onHit?.();}}
    shield.visible=player.alive&&player.shield>0;if(shield.visible){shield.position.copy(player.group.position).add(new T.Vector3(0,1.25,0));shield.rotation.y=t*.65;shell.material.opacity=.07+Math.sin(t*3)*.02;}
    const target=player.deadlineTarget;mark.visible=!!(player.alive&&target?.alive&&visibleUnit(target)&&t<player.deadlineUntil);
    if(mark.visible){mark.position.copy(target.group?target.group.position:target._group.position);mark.position.y+=3.2;mr.rotation.z=t*1.7;ms.position.y=.7+Math.sin(t*5)*.1;}
    ambientTime+=dt;for(const a of ambients){a.g.rotation.y=t*.18;a.g.children[1].position.y=.14+Math.sin(t*1.3)*.06;if(ambientTime>.15){const angle=Math.random()*Math.PI*2;emit(a.g.position.clone().add(new T.Vector3(Math.sin(angle)*a.radius,0,Math.cos(angle)*a.radius)),a.color,2,.25,.05,2,1);}}
    if(ambientTime>.15){ambientTime=0;const c=camps[Math.floor(Math.random()*camps.length)];if(c){const color={yellow:0xeac36a,purple:0xb461ef,blue:0x5aa7ff,red:0xff664e}[c[2]];emit(new T.Vector3(c[0],.5,c[1]),color,2,.5,.05,1.5,.6);}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.dur||i>=budget){particles[i]=particles[particles.length-1];particles.pop();continue;}p.p.addScaledVector(p.v,dt);p.v.y-=dt*2.3;}
    if(renderParticles)present();
  }
  function present(){
    for(const f of effects)f.g.visible=inView(f.g.position);
    for(const s of shots)if(s.g)s.g.visible=inView(s.g.position);
    for(const a of ambients)a.g.visible=inView(a.g.position);
    if(mark.visible)mark.visible=visibleUnit(player.deadlineTarget);
    let count=0;
    for(let i=0;i<particles.length;i++){const p=particles[i];if(!inView(p.p))continue;const q=1-p.age/p.dur;dummy.position.copy(p.p);dummy.rotation.set(p.age*4,i*2.4,p.age*2);dummy.scale.setScalar(p.size*(.25+q*.75));dummy.updateMatrix();pool.setMatrixAt(count,dummy.matrix);pool.setColorAt(count,scratchColor.copy(p.color));life.setX(count++,q*q);}
    pool.count=count;pool.instanceMatrix.needsUpdate=true;if(pool.instanceColor)pool.instanceColor.needsUpdate=true;life.needsUpdate=true;
  }
  return {ring,burst,slash,dash,afterimage,execution,shieldCast,projectile,update,present,emit,
    setBudget(n){budget=T.MathUtils.clamp(Math.round(n),1,capacity);},
    get counts(){return {particles:particles.length,effects:effects.length,projectiles:shots.length};},
    dispose(){for(const f of effects)remove(f.g);for(const s of shots)if(s.g)remove(s.g);effects.length=shots.length=particles.length=0;remove(shield);remove(mark);for(const a of ambients)remove(a.g);pool.removeFromParent();pool.dispose();particleGeometry.dispose();particleMaterial.dispose();Object.values(shapes).forEach(g=>g.dispose());root.removeFromParent();}
  };
}
