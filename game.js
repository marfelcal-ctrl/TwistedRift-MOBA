import * as THREE from 'three';

const canvas = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070b);
scene.fog = new THREE.FogExp2(0x09090d, 0.014);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 220);
const clock = new THREE.Clock();

const ui = {
  loading: document.querySelector('#loading'),
  loadingText: document.querySelector('#loadingText'),
  announcement: document.querySelector('#announcement'),
  hpFill: document.querySelector('#hpFill'),
  shieldFill: document.querySelector('#shieldFill'),
  hpText: document.querySelector('#hpText'),
  targetName: document.querySelector('#targetName'),
  targetHpFill: document.querySelector('#targetHpFill'),
  targetHpText: document.querySelector('#targetHpText'),
  statusText: document.querySelector('#statusText'),
  killsText: document.querySelector('#killsText'),
  fps: document.querySelector('#fps')
};

const FX = [];
const FLOATS = [];

const mat = (color, metalness = .45, roughness = .5, emissive = 0x000000, emissiveIntensity = 0) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity });
const darkSteel = mat(0x23242a, .82, .32);
const blackSteel = mat(0x111217, .9, .28);
const edgeSteel = mat(0x4b4d58, .9, .24);
const crimson = mat(0x5a111d, .5, .42, 0x5f0914, 1.2);
const riftRed = mat(0xb82942, .45, .28, 0xa50c25, 2.8);
const stoneMat = mat(0x202126, .05, .94);
const enemySteel = mat(0x3a2228, .72, .38);
const goldStone = mat(0x514838, .2, .75, 0x241805, .35);

function mesh(geometry, material, parent, x=0,y=0,z=0, rx=0,ry=0,rz=0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m); else scene.add(m);
  return m;
}
function group(parent, x=0,y=0,z=0) {
  const g = new THREE.Group(); g.position.set(x,y,z); if(parent) parent.add(g); else scene.add(g); return g;
}

scene.add(new THREE.HemisphereLight(0x8594b8, 0x110d12, 1.15));
const moon = new THREE.DirectionalLight(0xd3dcff, 3.0);
moon.position.set(-18, 30, 13); moon.castShadow = true;
moon.shadow.mapSize.set(2048,2048);
moon.shadow.camera.left=-40; moon.shadow.camera.right=40; moon.shadow.camera.top=40; moon.shadow.camera.bottom=-40;
scene.add(moon);
const riftLight = new THREE.PointLight(0xc02c56, 42, 38, 2); riftLight.position.set(0,4,0); scene.add(riftLight);
const blueFill = new THREE.PointLight(0x355ab8, 12, 28, 2); blueFill.position.set(-16,6,12); scene.add(blueFill);

mesh(new THREE.CircleGeometry(34,96), mat(0x15161a,.04,.93), null, 0,0,0, -Math.PI/2);
mesh(new THREE.RingGeometry(4.1,4.7,72), mat(0x50132e,.15,.5,0x7a133f,2.4), null, 0,.02,0,-Math.PI/2);
mesh(new THREE.CircleGeometry(3.95,72), mat(0x0f0d12,.1,.95), null, 0,.01,0,-Math.PI/2);
for(let r=8;r<=28;r+=5){
  const ring=mesh(new THREE.RingGeometry(r-.08,r+.08,96),new THREE.MeshBasicMaterial({color:0x383940,transparent:true,opacity:.38,side:THREE.DoubleSide}),null,0,.025,0,-Math.PI/2);
  ring.receiveShadow=false;
}
for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2;
  const path=mesh(new THREE.BoxGeometry(.15,.03,20),new THREE.MeshBasicMaterial({color:0x34353b,transparent:true,opacity:.28}),null,Math.cos(a)*9,.03,Math.sin(a)*9,0,-a,0);
  path.rotation.y=-a;
}
function makeRuneStone(x,z,glowColor){
  const g=group(null,x,0,z);
  mesh(new THREE.CylinderGeometry(1.15,1.5,.5,8),stoneMat,g,0,.25,0);
  const c=mesh(new THREE.OctahedronGeometry(.65,0),mat(glowColor,.35,.25,glowColor,2.4),g,0,1.18,0);
  c.userData.spin=.65+Math.random()*.25;
  return g;
}
makeRuneStone(-13,-9,0x2d64bf); makeRuneStone(13,9,0xbd2d45); makeRuneStone(-12,12,0x6b39b4); makeRuneStone(12,-12,0xc07624);
for(let i=0;i<20;i++){
  const a=i/20*Math.PI*2;
  const h=2.7+Math.random()*3.6;
  const p=mesh(new THREE.CylinderGeometry(.36+.15*Math.random(),.58+.18*Math.random(),h,6),stoneMat,null,Math.cos(a)*30,h/2,Math.sin(a)*30,0,-a,0);
  if(i%4===0){
    const flame=mesh(new THREE.SphereGeometry(.18,10,8),mat(0xb12a35,.1,.25,0xe13845,4),null,p.position.x,h+.35,p.position.z);
    flame.userData.flame=true;
  }
}
for(let i=0;i<45;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.035,5,4),new THREE.MeshBasicMaterial({color:i%2?0xa83d66:0x63489c,transparent:true,opacity:.45}));
  p.position.set((Math.random()-.5)*56,.15+Math.random()*3,(Math.random()-.5)*56);p.userData.drift=Math.random()*10;scene.add(p);FX.push({kind:'ambient',obj:p,life:Infinity});
}

function buildRamzx(){
  const root=group();
  const visual=group(root);
  const pelvis=group(visual,0,1.1,0);
  mesh(new THREE.BoxGeometry(.82,.48,.48),blackSteel,pelvis,0,0,0);
  mesh(new THREE.BoxGeometry(.68,.18,.54),edgeSteel,pelvis,0,.18,0);
  const torso=group(pelvis,0,.8,0);
  const chest=mesh(new THREE.BoxGeometry(1.1,1.2,.62),darkSteel,torso,0,.08,0); chest.scale.set(1,.96,.9);
  mesh(new THREE.BoxGeometry(.72,.78,.08),crimson,torso,0,.05,-.34);
  mesh(new THREE.ConeGeometry(.13,.55,4),riftRed,torso,0,.18,-.43,0,0,Math.PI/4);
  const head=group(torso,0,.96,0);
  mesh(new THREE.CylinderGeometry(.34,.4,.58,6),blackSteel,head,0,.02,0);
  mesh(new THREE.ConeGeometry(.15,.42,4),darkSteel,head,0,.43,0,0,0,Math.PI/4);
  const visor=mesh(new THREE.BoxGeometry(.5,.08,.06),riftRed,head,0,.04,-.37);
  const leftShoulder=group(torso,-.72,.45,0);
  const rightShoulder=group(torso,.72,.45,0);
  for(const s of [leftShoulder,rightShoulder]){
    mesh(new THREE.SphereGeometry(.38,8,6),darkSteel,s,0,0,0);
    const spike=mesh(new THREE.ConeGeometry(.13,.58,5),edgeSteel,s,0,.32,0);
    spike.rotation.z = s===leftShoulder ? .65 : -.65;
  }
  const leftArm=group(leftShoulder,0,-.48,0), rightArm=group(rightShoulder,0,-.48,0);
  mesh(new THREE.CylinderGeometry(.17,.22,.78,7),darkSteel,leftArm,0,-.34,0);
  mesh(new THREE.CylinderGeometry(.17,.22,.78,7),darkSteel,rightArm,0,-.34,0);
  mesh(new THREE.SphereGeometry(.19,7,6),blackSteel,leftArm,0,-.8,0);
  mesh(new THREE.SphereGeometry(.19,7,6),blackSteel,rightArm,0,-.8,0);
  const leftLeg=group(pelvis,-.28,-.38,0), rightLeg=group(pelvis,.28,-.38,0);
  mesh(new THREE.CylinderGeometry(.2,.25,.88,7),darkSteel,leftLeg,0,-.43,0);
  mesh(new THREE.CylinderGeometry(.2,.25,.88,7),darkSteel,rightLeg,0,-.43,0);
  const leftBoot=mesh(new THREE.BoxGeometry(.42,.32,.66),blackSteel,leftLeg,0,-.92,-.08);
  const rightBoot=mesh(new THREE.BoxGeometry(.42,.32,.66),blackSteel,rightLeg,0,-.92,-.08);
  const capePivot=group(torso,0,.45,.32);
  const cape=mesh(new THREE.PlaneGeometry(1.55,2.25,1,4),new THREE.MeshStandardMaterial({color:0x4a0b16,roughness:.96,side:THREE.DoubleSide}),capePivot,0,-.72,.03,.12,0,0);
  cape.castShadow=true;
  const weapon=group(rightArm,.1,-.72,-.1); weapon.rotation.z=-.18;
  mesh(new THREE.CylinderGeometry(.045,.055,.6,8),blackSteel,weapon,0,-.18,0,0,0,Math.PI/2);
  mesh(new THREE.BoxGeometry(.72,.09,.12),edgeSteel,weapon,.05,-.18,0);
  const blade=mesh(new THREE.BoxGeometry(.16,2.45,.14),darkSteel,weapon,.18,-1.52,0); blade.rotation.z=.02;
  mesh(new THREE.BoxGeometry(.045,2.08,.17),riftRed,weapon,.18,-1.5,-.08);
  mesh(new THREE.ConeGeometry(.12,.42,4),darkSteel,weapon,.18,-2.94,0,Math.PI,0,Math.PI/4);
  const selection=mesh(new THREE.RingGeometry(.78,1.02,40),new THREE.MeshBasicMaterial({color:0xb83552,transparent:true,opacity:.7,side:THREE.DoubleSide}),root,0,.035,0,-Math.PI/2);
  root.userData.anim={visual,pelvis,torso,head,leftShoulder,rightShoulder,leftArm,rightArm,leftLeg,rightLeg,leftBoot,rightBoot,capePivot,cape,weapon,blade,visor,selection};
  root.scale.setScalar(1.06);
  return root;
}

const player={
  group:buildRamzx(), hp:2200,maxHp:2200,shield:0,speed:7.2,attackDamage:180,attackRange:3.4,
  facing:new THREE.Vector3(0,0,-1),alive:true,kills:0,deadlineTarget:null,deadlineUntil:0,
  moving:false, animTime:0, attackAnim:0, skillAnim:0, dashAnim:0, hitAnim:0
};
player.group.position.set(0,0,7);scene.add(player.group);
ui.loadingText.textContent='RAMZX forged for Alpha 0.2.';
setTimeout(()=>ui.loading.classList.remove('show'),700);

const enemies=[];
function addFloatingBar(owner, color=0xb53142){
  const g=group(owner,0,3.15,0);
  mesh(new THREE.PlaneGeometry(1.8,.16),new THREE.MeshBasicMaterial({color:0x110d11,side:THREE.DoubleSide}),g,0,0,0);
  const fill=mesh(new THREE.PlaneGeometry(1.72,.1),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}),g,-.04,0,.01);
  g.userData.fill=fill; return g;
}
function buildTrainingKnight(){
  const root=group();
  const torso=group(root,0,1.75,0);
  mesh(new THREE.BoxGeometry(.9,1.0,.55),enemySteel,torso,0,0,0);
  mesh(new THREE.CylinderGeometry(.3,.36,.52,6),blackSteel,torso,0,.78,0);
  const la=group(torso,-.58,.28,0),ra=group(torso,.58,.28,0);
  mesh(new THREE.CylinderGeometry(.14,.2,.76,7),enemySteel,la,0,-.42,0);
  mesh(new THREE.CylinderGeometry(.14,.2,.76,7),enemySteel,ra,0,-.42,0);
  const ll=group(root,-.22,1.15,0),rl=group(root,.22,1.15,0);
  mesh(new THREE.CylinderGeometry(.18,.22,.9,7),enemySteel,ll,0,-.36,0);
  mesh(new THREE.CylinderGeometry(.18,.22,.9,7),enemySteel,rl,0,-.36,0);
  const sword=group(ra,.1,-.72,-.05); mesh(new THREE.BoxGeometry(.11,1.55,.09),riftRed,sword,0,-.75,0);
  root.userData.anim={torso,la,ra,ll,rl,sword}; return root;
}
function buildStoneback(){
  const root=group();
  const body=mesh(new THREE.IcosahedronGeometry(1.0,1),goldStone,root,0,1.15,0);body.scale.set(1.55,.85,1.25);
  const head=mesh(new THREE.IcosahedronGeometry(.55,1),goldStone,root,0,1.1,-1.35);head.scale.set(1,.75,1.1);
  const legs=[];
  for(const sx of [-.75,.75]) for(const sz of [-.65,.65]){
    const l=group(root,sx,.72,sz);mesh(new THREE.CylinderGeometry(.12,.19,.75,6),goldStone,l,0,-.32,0);legs.push(l);
  }
  for(let i=0;i<5;i++) mesh(new THREE.ConeGeometry(.17,.9,5),riftRed,root,(i-2)*.38,2.0+Math.abs(i-2)*.08,.15,0,0,(i-2)*.12);
  root.userData.anim={body,head,legs};return root;
}
function makeEnemy(name,x,z,hp,damage,speed,kind){
  const g=kind==='monster'?buildStoneback():buildTrainingKnight();g.position.set(x,0,z);scene.add(g);
  const bar=addFloatingBar(g,kind==='monster'?0xd18a2e:0xc13b4d);
  const e={name,group:g,hp,maxHp:hp,damage,speed,alive:true,spawn:g.position.clone(),respawnAt:0,nextHit:0,kind,bar,hitAnim:0,attackAnim:0,animTime:0};
  enemies.push(e);return e;
}
makeEnemy('RIFT TRAINING KNIGHT',7,1,1650,90,2.25,'knight');
makeEnemy('STONEBACK',-9,-7,2300,115,1.85,'monster');

function buildTower(){
  const g=group();
  mesh(new THREE.CylinderGeometry(1.4,1.85,.65,10),stoneMat,g,0,.33,0);
  mesh(new THREE.CylinderGeometry(.85,1.15,3.5,8),darkSteel,g,0,2.0,0);
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;mesh(new THREE.BoxGeometry(.45,2.3,.55),blackSteel,g,Math.cos(a)*.85,1.35,Math.sin(a)*.85,0,-a,0);}
  const crown=group(g,0,4.0,0);
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;const sp=mesh(new THREE.ConeGeometry(.15,.9,5),edgeSteel,crown,Math.cos(a)*.62,.25,Math.sin(a)*.62);sp.rotation.z=Math.cos(a)*.35;sp.rotation.x=Math.sin(a)*.35;}
  const crystal=mesh(new THREE.OctahedronGeometry(.75),riftRed,crown,0,.6,0);crystal.userData.spin=1.1;
  g.userData={crystal,firePulse:0};return g;
}
const tower=buildTower();tower.position.set(14,0,-8);scene.add(tower);let towerNext=0;

const keys=new Set();let joy={x:0,y:0,active:false};
addEventListener('keydown',e=>{if(['Space','KeyW','KeyA','KeyS','KeyD','Digit1','Digit2','Digit3','Digit4','KeyR'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Space')attack();if(e.code==='Digit1')skill1();if(e.code==='Digit2')skill2();if(e.code==='Digit3')skill3();if(e.code==='Digit4')ultimate();if(e.code==='KeyR')snapCamera();});
addEventListener('keyup',e=>keys.delete(e.code));
const joyEl=document.querySelector('#joystick'),stick=document.querySelector('#stick');let pid=null;
function moveJoy(e){const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.32;let dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy)||1;if(l>max){dx*=max/l;dy*=max/l}joy={x:dx/max,y:dy/max,active:true};stick.style.transform=`translate(${dx}px,${dy}px)`}
joyEl.addEventListener('pointerdown',e=>{pid=e.pointerId;joyEl.setPointerCapture(pid);moveJoy(e)});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===pid)moveJoy(e)});
function clearJoy(){pid=null;joy={x:0,y:0,active:false};stick.style.transform='translate(0,0)'}
joyEl.addEventListener('pointerup',clearJoy);joyEl.addEventListener('pointercancel',clearJoy);
document.querySelectorAll('.skill').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;if(a==='attack')attack();if(a==='s1')skill1();if(a==='s2')skill2();if(a==='s3')skill3();if(a==='ult')ultimate()}));

const cds={attack:0,s1:0,s2:0,s3:0,ult:0},dur={attack:.82,s1:6.5,s2:11,s3:8,ult:32};
const now=()=>performance.now()/1000;
function announce(t,ms=950){ui.announcement.textContent=t;ui.announcement.classList.add('show');clearTimeout(announce._t);announce._t=setTimeout(()=>ui.announcement.classList.remove('show'),ms)}
function nearest(range=Infinity){let best=null,d0=range;for(const e of enemies){if(!e.alive)continue;const d=player.group.position.distanceTo(e.group.position);if(d<d0){d0=d;best=e}}return best}
function floatText(text,pos,color=0xffd0d5){const el=document.createElement('div');el.textContent=text;el.style.cssText=`position:fixed;z-index:15;color:#${color.toString(16).padStart(6,'0')};font:800 16px system-ui;pointer-events:none;text-shadow:0 2px 4px #000;transform:translate(-50%,-50%);`;document.body.appendChild(el);FLOATS.push({el,pos:pos.clone().add(new THREE.Vector3(0,2.2,0)),life:1});}
function burst(pos,color,count=12,scale=.12){for(let i=0;i<count;i++){const p=mesh(new THREE.SphereGeometry(scale,6,4),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}),null,pos.x,pos.y+1.3,pos.z);p.userData.vel=new THREE.Vector3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5);FX.push({kind:'particle',obj:p,life:.45+Math.random()*.3});}}
function slashArc(pos,dir,color=0xe83d5d,size=2.4){const geo=new THREE.TorusGeometry(size,.07,6,32,Math.PI*.95);const m=mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide}),null,pos.x,pos.y+1.35,pos.z);m.rotation.x=Math.PI/2;m.rotation.z=-Math.atan2(dir.z,dir.x)-Math.PI*.1;FX.push({kind:'fade',obj:m,life:.35});}
function shieldFx(){const s=mesh(new THREE.SphereGeometry(1.45,24,16),new THREE.MeshBasicMaterial({color:0x7b4ce0,transparent:true,opacity:.2,wireframe:true,depthWrite:false}),player.group,0,1.4,0);FX.push({kind:'shield',obj:s,life:1.6});}
function deadlineMark(e){const m=mesh(new THREE.RingGeometry(.65,.82,32),new THREE.MeshBasicMaterial({color:0xff1742,transparent:true,opacity:.95,side:THREE.DoubleSide}),e.group,0,3.55,0,Math.PI/2);FX.push({kind:'mark',obj:m,life:6});}
function hurtEnemy(e,d){if(!e||!e.alive)return;e.hp=Math.max(0,e.hp-d);e.hitAnim=.22;burst(e.group.position,0xff4b62,10,.075);floatText(`-${Math.round(d)}`,e.group.position,0xff9eab);if(e.hp<=0){e.alive=false;e.group.visible=false;e.respawnAt=now()+5;player.kills++;ui.killsText.textContent=`KILLS ${player.kills}`;announce(e.kind==='monster'?'STONEBACK SLAIN':'TARGET EXECUTED',1200)}}
function attack(){const t=now();if(t<cds.attack||!player.alive)return;cds.attack=t+dur.attack;player.attackAnim=.48;const e=nearest(player.attackRange);if(!e){slashArc(player.group.position,player.facing,0xd3445a,1.7);return}player.facing.copy(e.group.position).sub(player.group.position).setY(0).normalize();let dmg=player.attackDamage;if(player.deadlineTarget===e&&t<player.deadlineUntil){dmg+=520;player.deadlineTarget=null;player.deadlineUntil=0;announce('DEADLINE',1300);burst(e.group.position,0xff123d,30,.11);dmg=((e.hp-dmg)/e.maxHp<.15)?e.hp+5:dmg}slashArc(player.group.position,player.facing,0xff3b5e,1.9);hurtEnemy(e,dmg)}
function skill1(){const t=now();if(t<cds.s1||!player.alive)return;cds.s1=t+dur.s1;player.skillAnim=.6;announce('SEVER');slashArc(player.group.position,player.facing,0xff2853,2.8);for(const e of enemies){if(e.alive&&e.group.position.distanceTo(player.group.position)<4.4)hurtEnemy(e,310)}}
function skill2(){const t=now();if(t<cds.s2||!player.alive)return;cds.s2=t+dur.s2;player.shield=Math.min(700,player.shield+430);announce('IRON ORDER');shieldFx();riftLight.intensity=65;setTimeout(()=>riftLight.intensity=42,280)}
function skill3(){const t=now();if(t<cds.s3||!player.alive)return;cds.s3=t+dur.s3;player.dashAnim=.35;announce('EXECUTION STEP');const start=player.group.position.clone();const end=start.clone().addScaledVector(player.facing,4.8);end.x=THREE.MathUtils.clamp(end.x,-31,31);end.z=THREE.MathUtils.clamp(end.z,-31,31);for(let i=0;i<6;i++){const ghost=player.group.userData.anim?player.group.userData.anim.visual.clone():null;if(ghost){ghost.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshBasicMaterial({color:0xb5294c,transparent:true,opacity:.13,wireframe:true})});scene.add(ghost);ghost.position.copy(start).lerp(end,i/6);FX.push({kind:'fade',obj:ghost,life:.25+i*.03});}}player.group.position.copy(end);burst(end,0xb42953,16,.08);for(const e of enemies){if(e.alive&&e.group.position.distanceTo(end)<2.6)hurtEnemy(e,250)}}
function ultimate(){const t=now();if(t<cds.ult||!player.alive)return;const e=nearest(10);if(!e){announce('NO TARGET TO MARK');return}cds.ult=t+dur.ult;player.deadlineTarget=e;player.deadlineUntil=t+6;deadlineMark(e);announce('YOUR DEADLINE HAS COME',1600)}
function hurtPlayer(d){if(!player.alive)return;let left=d;if(player.shield>0){const s=Math.min(player.shield,left);player.shield-=s;left-=s}player.hp=Math.max(0,player.hp-left);player.hitAnim=.22;burst(player.group.position,0xc67d8d,8,.06);if(player.hp<=0){player.alive=false;announce('RAMZX FALLS',1600);setTimeout(()=>{player.hp=player.maxHp;player.shield=0;player.group.position.set(0,0,7);player.alive=true;announce('RETURN TO WAR')},2600)}}

const camOffset=new THREE.Vector3(0,10.8,11.8),lookOffset=new THREE.Vector3(0,1.0,-2.3);
function snapCamera(){camera.position.copy(player.group.position).add(camOffset);camera.lookAt(player.group.position.clone().add(lookOffset))}snapCamera();

function updateRamzxAnim(dt){
  const a=player.group.userData.anim; if(!a)return;
  player.animTime+=dt;
  const walk=player.moving?Math.sin(player.animTime*10):0;
  const breathe=Math.sin(player.animTime*2.6)*.025;
  a.torso.position.y=.8+breathe;
  a.head.rotation.y=Math.sin(player.animTime*1.7)*.025;
  a.capePivot.rotation.x=.12+Math.sin(player.animTime*3.2)*.05+(player.moving?.12:0);
  a.capePivot.rotation.z=Math.sin(player.animTime*2.1)*.04;
  a.leftLeg.rotation.x=player.moving?walk*.55:0;
  a.rightLeg.rotation.x=player.moving?-walk*.55:0;
  a.leftArm.rotation.x=player.moving?-walk*.35:0;
  a.rightArm.rotation.x=player.moving?walk*.2:0;
  a.pelvis.position.y=1.1+(player.moving?Math.abs(Math.sin(player.animTime*10))*.035:0);
  a.selection.rotation.z+=dt*.7;
  a.visor.material.emissiveIntensity=2.4+Math.sin(player.animTime*4)*.6;
  if(player.attackAnim>0){player.attackAnim=Math.max(0,player.attackAnim-dt);const p=1-player.attackAnim/.48;const swing=Math.sin(p*Math.PI);a.rightArm.rotation.z=-1.4*swing;a.rightArm.rotation.x=-.8*swing;a.torso.rotation.y=-.35*swing;}
  else if(player.skillAnim>0){player.skillAnim=Math.max(0,player.skillAnim-dt);const p=1-player.skillAnim/.6;const swing=Math.sin(p*Math.PI);a.rightArm.rotation.z=-1.75*swing;a.leftArm.rotation.z=.45*swing;a.torso.rotation.y=-.55*swing;}
  else{a.torso.rotation.y=THREE.MathUtils.lerp(a.torso.rotation.y,0,dt*10);a.rightArm.rotation.z=THREE.MathUtils.lerp(a.rightArm.rotation.z,0,dt*10);}
  if(player.hitAnim>0){player.hitAnim=Math.max(0,player.hitAnim-dt);a.visual.rotation.z=Math.sin(player.hitAnim*80)*.05;}else a.visual.rotation.z=THREE.MathUtils.lerp(a.visual.rotation.z,0,dt*12);
}
function updatePlayer(dt){if(!player.alive)return;let x=0,z=0;if(keys.has('KeyA'))x--;if(keys.has('KeyD'))x++;if(keys.has('KeyW'))z--;if(keys.has('KeyS'))z++;if(joy.active){x+=joy.x;z+=joy.y}const v=new THREE.Vector3(x,0,z);player.moving=v.lengthSq()>.001;if(player.moving){v.normalize();player.facing.lerp(v,Math.min(1,dt*12)).normalize();player.group.position.addScaledVector(v,player.speed*dt);player.group.position.x=THREE.MathUtils.clamp(player.group.position.x,-31,31);player.group.position.z=THREE.MathUtils.clamp(player.group.position.z,-31,31);const targetRot=Math.atan2(v.x,v.z);let diff=targetRot-player.group.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));player.group.rotation.y+=diff*Math.min(1,dt*12)}updateRamzxAnim(dt)}
function updateEnemies(dt,t){for(const e of enemies){if(!e.alive){if(t>=e.respawnAt){e.hp=e.maxHp;e.group.position.copy(e.spawn);e.group.visible=true;e.alive=true}continue}e.animTime+=dt;const d=e.group.position.distanceTo(player.group.position);const dir=player.group.position.clone().sub(e.group.position).setY(0);if(player.alive&&d<8.7){if(d>2.25){dir.normalize();e.group.position.addScaledVector(dir,e.speed*dt);e.group.rotation.y=Math.atan2(dir.x,dir.z)}else if(t>=e.nextHit){e.nextHit=t+1.2;e.attackAnim=.35;hurtPlayer(e.damage)}}const a=e.group.userData.anim;if(e.kind==='knight'&&a){const walk=d<8.7&&d>2.25?Math.sin(e.animTime*9):0;a.ll.rotation.x=walk*.45;a.rl.rotation.x=-walk*.45;a.la.rotation.x=-walk*.25;if(e.attackAnim>0){e.attackAnim=Math.max(0,e.attackAnim-dt);a.ra.rotation.z=-1.1*Math.sin((1-e.attackAnim/.35)*Math.PI)}else a.ra.rotation.z=THREE.MathUtils.lerp(a.ra.rotation.z,0,dt*10);a.torso.rotation.z=e.hitAnim>0?Math.sin(e.hitAnim*70)*.06:0;}if(e.kind==='monster'&&a){a.body.position.y=1.15+Math.sin(e.animTime*3.5)*.05;a.head.rotation.y=Math.sin(e.animTime*2.4)*.08;a.legs.forEach((l,i)=>l.rotation.x=Math.sin(e.animTime*7+i*Math.PI/2)*.18);}e.hitAnim=Math.max(0,e.hitAnim-dt);e.bar.userData.fill.scale.x=Math.max(.001,e.hp/e.maxHp);e.bar.userData.fill.position.x=-(1-e.hp/e.maxHp)*.86;e.bar.quaternion.copy(camera.quaternion)}}
function towerShot(){const p=mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshBasicMaterial({color:0xff334f}),null,tower.position.x,4.55,tower.position.z);p.userData.target=player.group;FX.push({kind:'projectile',obj:p,life:1.6,speed:18,damage:165});tower.userData.firePulse=.22;burst(new THREE.Vector3(tower.position.x,4.55,tower.position.z),0xff334f,8,.05)}
function updateTower(dt,t){tower.userData.crystal.rotation.y+=dt*1.3;tower.userData.crystal.position.y=.6+Math.sin(t*3)*.08;if(tower.userData.firePulse>0){tower.userData.firePulse-=dt;tower.userData.crystal.scale.setScalar(1+Math.sin(tower.userData.firePulse*25)*.18)}else tower.userData.crystal.scale.setScalar(1);if(player.alive&&tower.position.distanceTo(player.group.position)<8.5&&t>=towerNext){towerNext=t+1.25;towerShot()}}
function updateFx(dt,t){for(let i=FX.length-1;i>=0;i--){const f=FX[i];if(f.kind==='ambient'){f.obj.position.y+=Math.sin(t+f.obj.userData.drift)*.001;continue}f.life-=dt;if(f.kind==='particle'){f.obj.position.addScaledVector(f.obj.userData.vel,dt);f.obj.userData.vel.y-=8*dt;f.obj.material.opacity=Math.max(0,f.life/.7)}if(f.kind==='fade'){if(f.obj.material)f.obj.material.opacity=Math.max(0,f.life/.35);else f.obj.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,f.life/.5)})}if(f.kind==='shield'){f.obj.rotation.y+=dt*1.8;f.obj.scale.addScalar(dt*.18);f.obj.material.opacity=Math.max(0,f.life/1.6*.2)}if(f.kind==='mark'){f.obj.rotation.z+=dt*2.8;f.obj.material.opacity=Math.min(1,f.life)}if(f.kind==='projectile'){const target=f.obj.userData.target;if(!target||!player.alive){f.life=0}else{const dir=target.position.clone().add(new THREE.Vector3(0,1.2,0)).sub(f.obj.position);const d=dir.length();if(d<.35){hurtPlayer(f.damage);burst(f.obj.position,0xff3d58,14,.07);f.life=0}else f.obj.position.addScaledVector(dir.normalize(),f.speed*dt)}}if(f.life<=0){if(f.obj.parent)f.obj.parent.remove(f.obj);scene.remove(f.obj);FX.splice(i,1)}}for(const o of scene.children){if(o.userData&&o.userData.spin)o.rotation.y+=dt*o.userData.spin}}
function updateFloats(){for(let i=FLOATS.length-1;i>=0;i--){const f=FLOATS[i];f.life-=.016;f.pos.y+=.015;const p=f.pos.clone().project(camera);f.el.style.left=`${(p.x*.5+.5)*innerWidth}px`;f.el.style.top=`${(-p.y*.5+.5)*innerHeight}px`;f.el.style.opacity=Math.max(0,f.life);if(f.life<=0){f.el.remove();FLOATS.splice(i,1)}}}
function updateUi(t){ui.hpFill.style.width=`${100*player.hp/player.maxHp}%`;ui.shieldFill.style.width=`${Math.min(100,100*player.shield/player.maxHp)}%`;ui.hpText.textContent=`${Math.ceil(player.hp)} / ${player.maxHp}${player.shield?` +${Math.ceil(player.shield)} SHIELD`:''}`;ui.statusText.textContent=player.deadlineTarget&&t<player.deadlineUntil?'DEADLINE ACTIVE':player.moving?'MOVING':'READY';const n=nearest(10);if(n){ui.targetName.textContent=n.name;ui.targetHpFill.style.width=`${100*n.hp/n.maxHp}%`;ui.targetHpText.textContent=`${Math.ceil(n.hp)} / ${n.maxHp}`}else{ui.targetName.textContent='NO TARGET';ui.targetHpFill.style.width='0%';ui.targetHpText.textContent=''}for(const [a,end] of Object.entries(cds)){const b=document.querySelector(`.skill[data-action="${a}"]`);if(!b)continue;const left=Math.max(0,end-t);b.classList.toggle('cooling',left>0);const em=b.querySelector('em');if(em)em.style.height=`${100*left/dur[a]}%`;const sm=b.querySelector('small');if(sm)sm.textContent=left>0?left.toFixed(left<10?1:0):(a==='ult'?'4':a==='s3'?'3':a==='s2'?'2':'1')}}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
let fpsFrames=0,lastFps=0;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.033),t=now();updatePlayer(dt);updateEnemies(dt,t);updateTower(dt,t);updateFx(dt,t);updateFloats();const desired=player.group.position.clone().add(camOffset);camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(player.group.position.clone().add(lookOffset));updateUi(t);renderer.render(scene,camera);fpsFrames++;if(t-lastFps>1){ui.fps.textContent=`${fpsFrames} FPS`;fpsFrames=0;lastFps=t}}
loop();
