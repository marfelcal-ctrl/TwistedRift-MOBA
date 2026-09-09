import * as THREE from 'three';

const canvas = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090c);
scene.fog = new THREE.FogExp2(0x0a0d12, 0.0075);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.45));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 320);
const clock = new THREE.Clock();
const WORLD = 120;
const HALF = WORLD / 2;

const ui = {
  loading: document.querySelector('#loading'), loadingText: document.querySelector('#loadingText'),
  announcement: document.querySelector('#announcement'), hpFill: document.querySelector('#hpFill'),
  shieldFill: document.querySelector('#shieldFill'), hpText: document.querySelector('#hpText'),
  targetName: document.querySelector('#targetName'), targetHpFill: document.querySelector('#targetHpFill'),
  targetHpText: document.querySelector('#targetHpText'), statusText: document.querySelector('#statusText'),
  killsText: document.querySelector('#killsText'), fps: document.querySelector('#fps'),
  minimap: document.querySelector('#minimap')
};
const mm = ui.minimap.getContext('2d');

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: .95, metalness: .02 }),
  lane: new THREE.MeshStandardMaterial({ color: 0x26252a, roughness: .92, metalness: .05 }),
  laneEdge: new THREE.MeshStandardMaterial({ color: 0x3a333a, roughness: .86 }),
  river: new THREE.MeshPhysicalMaterial({ color: 0x172d3b, roughness: .18, metalness: .08, transparent: true, opacity: .82 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: .96 }),
  rock2: new THREE.MeshStandardMaterial({ color: 0x322b31, roughness: .94 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x24262e, metalness: .8, roughness: .32 }),
  blackSteel: new THREE.MeshStandardMaterial({ color: 0x101116, metalness: .92, roughness: .26 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x28171a, roughness: .82 }),
  red: new THREE.MeshStandardMaterial({ color: 0x6d172a, roughness: .55, emissive: 0x24040d, emissiveIntensity: 1.0 }),
  blueGlow: new THREE.MeshStandardMaterial({ color: 0x2c6eae, emissive: 0x174d8c, emissiveIntensity: 2.2, roughness: .28 }),
  redGlow: new THREE.MeshStandardMaterial({ color: 0xb52b42, emissive: 0x7b102a, emissiveIntensity: 2.6, roughness: .25 }),
  purpleGlow: new THREE.MeshStandardMaterial({ color: 0x7441b0, emissive: 0x47207d, emissiveIntensity: 2.4, roughness: .25 }),
  yellowGlow: new THREE.MeshStandardMaterial({ color: 0xa9782c, emissive: 0x62400e, emissiveIntensity: 1.8, roughness: .3 })
};

scene.add(new THREE.HemisphereLight(0x8092b8, 0x171119, 1.05));
const moon = new THREE.DirectionalLight(0xd3ddff, 2.3);
moon.position.set(-45, 70, 30); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048); moon.shadow.camera.left = -70; moon.shadow.camera.right = 70;
moon.shadow.camera.top = 70; moon.shadow.camera.bottom = -70; moon.shadow.camera.near = 1; moon.shadow.camera.far = 170;
scene.add(moon);
const riftLight = new THREE.PointLight(0x7d2c7e, 55, 48, 2); riftLight.position.set(0, 6, 0); scene.add(riftLight);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), materials.ground);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

for (let i = -56; i <= 56; i += 8) {
  for (const [x,z] of [[i,-59],[i,59],[-59,i],[59,i]]) {
    const h = 2.7 + Math.random() * 2.8;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.55, h, 6), Math.random() > .5 ? materials.rock : materials.rock2);
    p.position.set(x, h/2, z); p.rotation.y = Math.random() * Math.PI; p.castShadow = p.receiveShadow = true; p.userData.legacyTerrain=true; scene.add(p);
  }
}

function pathRibbon(points, width, material, y=.025) {
  const group = new THREE.Group();
  group.userData.legacyTerrain=true;
  for (let i=0;i<points.length-1;i++) {
    const a = new THREE.Vector3(points[i][0], y, points[i][1]);
    const b = new THREE.Vector3(points[i+1][0], y, points[i+1][1]);
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, .08, len), material);
    m.position.copy(a).add(b).multiplyScalar(.5); m.rotation.y = Math.atan2(d.x, d.z); m.receiveShadow = true; group.add(m);
  }
  scene.add(group); return group;
}
function runeDisc(x,z,color=0x78324e,scale=1) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.15*scale, 1.5*scale, 32), new THREE.MeshBasicMaterial({color, transparent:true, opacity:.7, side:THREE.DoubleSide}));
  ring.rotation.x = -Math.PI/2; ring.position.y=.08; g.add(ring); g.position.set(x,0,z); scene.add(g); return g;
}
function rockCluster(x,z,s=1) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  g.userData.legacyTerrain=true;
  const n=2+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){
    const h=(1.6+Math.random()*2.4)*s, r=(.7+Math.random()*.85)*s;
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0), Math.random()>.5?materials.rock:materials.rock2);
    m.scale.y=h/(r*2); m.position.set((Math.random()-0.5)*2.2*s,h*.45,(Math.random()-0.5)*2.2*s); m.rotation.set(Math.random()*.3,Math.random()*Math.PI,Math.random()*.2); m.castShadow=m.receiveShadow=true;g.add(m);
  }
  scene.add(g); return g;
}

const laneA = [[-50,50],[-55,31],[-55,-29],[-48,-48],[-28,-55],[31,-55],[50,-50]];
const laneB = [[-50,50],[-31,55],[29,55],[48,48],[55,29],[55,-31],[50,-50]];
pathRibbon(laneA, 7.2, materials.laneEdge, .02); pathRibbon(laneA, 5.7, materials.lane, .07);
pathRibbon(laneB, 7.2, materials.laneEdge, .02); pathRibbon(laneB, 5.7, materials.lane, .07);

const river = new THREE.Mesh(new THREE.PlaneGeometry(12, 170), materials.river);
river.rotation.x=-Math.PI/2; river.rotation.z=Math.PI/4; river.position.y=.11; scene.add(river);
for(let i=-60;i<=60;i+=12){
  const foam=new THREE.Mesh(new THREE.PlaneGeometry(.12,9),new THREE.MeshBasicMaterial({color:0x5a7384,transparent:true,opacity:.18,side:THREE.DoubleSide}));
  foam.rotation.x=-Math.PI/2;foam.rotation.z=Math.PI/4;foam.position.set(i/Math.SQRT2,.13,i/Math.SQRT2);foam.userData.legacyTerrain=true;scene.add(foam);
}

const wallSpots = [
  [-36,25,1.2],[-31,18,1],[-24,12,1.1],[-18,30,1.1],[-12,38,1],[-4,46,1.1],
  [25,36,1.2],[18,31,1],[12,24,1.1],[30,18,1.1],[38,12,1],[46,4,1.1],
  [-25,-36,1.2],[-18,-31,1],[-12,-24,1.1],[-30,-18,1.1],[-38,-12,1],[-46,-4,1.1],
  [36,-25,1.2],[31,-18,1],[24,-12,1.1],[18,-30,1.1],[12,-38,1],[4,-46,1.1],
  [-20,2,1.1],[-14,-5,1],[-6,-15,1],[20,-2,1.1],[14,5,1],[6,15,1]
];
wallSpots.forEach(v=>rockCluster(v[0],v[1],v[2]));

function buildCore(team,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);
  const blue=team==='blue';
  const glowMat=blue?materials.blueGlow:materials.redGlow;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(4.1,5.2,1.5,8),new THREE.MeshStandardMaterial({color:blue?0x172438:0x37171f,metalness:.35,roughness:.6}));base.position.y=.75;base.castShadow=base.receiveShadow=true;g.add(base);
  const mid=new THREE.Mesh(new THREE.CylinderGeometry(2.1,3.0,3.3,8),materials.blackSteel);mid.position.y=2.7;mid.castShadow=true;g.add(mid);
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(1.75,0),glowMat);crystal.position.y=5.5;crystal.rotation.z=.15;g.add(crystal);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(2.5,.11,8,48),new THREE.MeshBasicMaterial({color:blue?0x4ca2ff:0xff5266,transparent:true,opacity:.8}));halo.position.y=5.4;halo.rotation.x=Math.PI/2;g.add(halo);
  g.userData={team,crystal,halo};scene.add(g);return g;
}
function buildFountain(team,x,z){
  const c=team==='blue'?0x318bd7:0xc2384e;
  const g=new THREE.Group();g.position.set(x,0,z);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.8,.5,32),new THREE.MeshStandardMaterial({color:team==='blue'?0x182a3d:0x3b1821,roughness:.65,metalness:.2}));pad.position.y=.25;g.add(pad);
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.7,3.6,48),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.55,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.53;g.add(ring);
  const light=new THREE.PointLight(c,28,18,2);light.position.y=3;g.add(light);g.userData.legacyTerrain=true;scene.add(g);return g;
}
const blueCore=buildCore('blue',-49,49), redCore=buildCore('red',49,-49);
buildFountain('blue',-55,55); buildFountain('red',55,-55);
runeDisc(-55,55,0x3d8fd2,1.6);runeDisc(55,-55,0xd64d62,1.6);

const towers=[];
function buildTower(team,x,z,label){
  const g=new THREE.Group();g.position.set(x,0,z);const blue=team==='blue';
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2.35,1.1,8),new THREE.MeshStandardMaterial({color:blue?0x1a2838:0x382029,roughness:.65,metalness:.24}));base.position.y=.55;base.castShadow=base.receiveShadow=true;g.add(base);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.85,1.25,4.0,8),materials.blackSteel);shaft.position.y=2.55;shaft.castShadow=true;g.add(shaft);
  const arms=new THREE.Mesh(new THREE.TorusGeometry(1.18,.16,6,18,Math.PI*1.6),materials.steel);arms.position.y=4.35;arms.rotation.x=Math.PI/2;arms.rotation.z=-.3;g.add(arms);
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.85,0),blue?materials.blueGlow:materials.redGlow);crystal.position.y=4.85;g.add(crystal);
  const light=new THREE.PointLight(blue?0x2f8fe7:0xe0445b,12,11,2);light.position.y=5;g.add(light);
  g.userData={team,label,crystal,hp:6000,maxHp:6000,nextShot:0};towers.push(g);scene.add(g);return g;
}
const towerDefs={
 blue:[[-54,-26,'A-T1'],[-54,2,'A-T2'],[-52,35,'A-G1'],[-48,43,'A-G2'],[26,54,'B-T1'],[-2,54,'B-T2'],[-35,52,'B-G1'],[-43,48,'B-G2']],
 red:[[54,26,'B-T1'],[54,-2,'B-T2'],[52,-35,'B-G1'],[48,-43,'B-G2'],[-26,-54,'A-T1'],[2,-54,'A-T2'],[35,-52,'A-G1'],[43,-48,'A-G2']]
};
towerDefs.blue.forEach(d=>buildTower('blue',...d));towerDefs.red.forEach(d=>buildTower('red',...d));

function guardObelisk(team,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);const m=team==='blue'?materials.blueGlow:materials.redGlow;
  g.userData.legacyTerrain=true;
  const p=new THREE.Mesh(new THREE.CylinderGeometry(.48,.8,2.8,6),materials.blackSteel);p.position.y=1.4;g.add(p);
  const c=new THREE.Mesh(new THREE.OctahedronGeometry(.38),m);c.position.y=3.1;g.add(c);scene.add(g);
}
[[-55,47],[-47,55],[-42,49],[-49,42]].forEach(p=>guardObelisk('blue',...p));
[[55,-47],[47,-55],[42,-49],[49,-42]].forEach(p=>guardObelisk('red',...p));

const camps=[
 [-36,10,'yellow'],[-28,26,'yellow'],[-10,36,'yellow'],[10,28,'yellow'],[36,-10,'yellow'],[28,-26,'yellow'],[10,-36,'yellow'],[-10,-28,'yellow'],
 [-22,-8,'purple'],[22,8,'purple'],[-33,36,'blue'],[33,-36,'blue'],[-36,-33,'red'],[36,33,'red']
];
function campMarker(x,z,type){
  const mats={yellow:materials.yellowGlow,purple:materials.purpleGlow,blue:materials.blueGlow,red:materials.redGlow};
  const g=new THREE.Group();g.position.set(x,0,z);
  const stone=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.55,.45,8),materials.rock2);stone.position.y=.23;g.add(stone);
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.55),mats[type]);crystal.position.y=1.15;g.add(crystal);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.4,1.75,28),new THREE.MeshBasicMaterial({color:type==='yellow'?0xd49a3a:type==='purple'?0x9b5bd0:type==='blue'?0x4b9be0:0xdb4b55,transparent:true,opacity:.42,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);
  g.userData={type,crystal};scene.add(g);return g;
}
const campObjects=camps.map(c=>campMarker(...c));

const pitArena=new THREE.Mesh(new THREE.RingGeometry(5.4,7.6,64),new THREE.MeshStandardMaterial({color:0x2c202f,emissive:0x33103f,emissiveIntensity:.8,roughness:.78,side:THREE.DoubleSide}));pitArena.rotation.x=-Math.PI/2;pitArena.position.y=.19;scene.add(pitArena);
const pitSigil=new THREE.Mesh(new THREE.RingGeometry(2.7,3.25,48),new THREE.MeshBasicMaterial({color:0x9a4bc1,transparent:true,opacity:.58,side:THREE.DoubleSide}));pitSigil.rotation.x=-Math.PI/2;pitSigil.position.y=.23;scene.add(pitSigil);
function createPitlord(){
  const g=new THREE.Group();g.position.set(0,.15,0);
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8,1),new THREE.MeshStandardMaterial({color:0x3c2945,roughness:.55,metalness:.2,emissive:0x240b32,emissiveIntensity:1}));body.position.y=2.4;body.scale.set(1.25,1.35,1);g.add(body);
  const head=new THREE.Mesh(new THREE.DodecahedronGeometry(1.05,0),materials.blackSteel);head.position.set(0,4.5,.15);g.add(head);
  for(const sx of [-1,1]){const horn=new THREE.Mesh(new THREE.ConeGeometry(.32,2.0,6),materials.purpleGlow);horn.position.set(sx*.9,5.25,0);horn.rotation.z=sx*.72;g.add(horn)}
  const aura=new THREE.PointLight(0x7436a8,25,16,2);aura.position.y=3.5;g.add(aura);g.userData={body};scene.add(g);return g;
}
const pitlord=createPitlord();

function makeRamzx(){
  const root=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.45,1.8,.8),materials.blackSteel);torso.position.y=2.35;torso.castShadow=true;root.add(torso);
  const chest=new THREE.Mesh(new THREE.BoxGeometry(1.7,.55,.94),materials.steel);chest.position.set(0,2.7,.02);chest.castShadow=true;root.add(chest);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(1.25,.28,.72),materials.leather);belt.position.y=1.48;root.add(belt);
  const headPivot=new THREE.Group();headPivot.position.y=3.55;root.add(headPivot);
  const helm=new THREE.Mesh(new THREE.CylinderGeometry(.48,.56,.82,8),materials.blackSteel);helm.position.y=.1;helm.castShadow=true;headPivot.add(helm);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(.78,.2,.12),materials.redGlow);visor.position.set(0,.13,-.51);headPivot.add(visor);
  const crest=new THREE.Mesh(new THREE.ConeGeometry(.18,.75,5),materials.red);crest.position.set(0,.62,.06);crest.rotation.z=.15;headPivot.add(crest);
  const shoulders=[];const arms=[];const legs=[];
  for(const sx of [-1,1]){
    const sh=new THREE.Mesh(new THREE.BoxGeometry(.78,.42,1.0),materials.steel);sh.position.set(sx*1.05,2.92,0);sh.rotation.z=sx*.12;sh.castShadow=true;root.add(sh);shoulders.push(sh);
    const arm=new THREE.Group();arm.position.set(sx*.98,2.72,0);root.add(arm);
    const upper=new THREE.Mesh(new THREE.CylinderGeometry(.25,.32,1.25,7),materials.blackSteel);upper.position.y=-.55;upper.castShadow=true;arm.add(upper);
    const gaunt=new THREE.Mesh(new THREE.BoxGeometry(.52,.48,.55),materials.steel);gaunt.position.y=-1.2;gaunt.castShadow=true;arm.add(gaunt);arms.push(arm);
    const leg=new THREE.Group();leg.position.set(sx*.42,1.35,0);root.add(leg);
    const thigh=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,1.25,7),materials.blackSteel);thigh.position.y=-.55;leg.add(thigh);
    const boot=new THREE.Mesh(new THREE.BoxGeometry(.62,.75,.85),materials.steel);boot.position.set(0,-1.32,-.08);leg.add(boot);legs.push(leg);
  }
  const capePivot=new THREE.Group();capePivot.position.set(0,3.1,.48);root.add(capePivot);
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(1.9,2.75,1,5),new THREE.MeshStandardMaterial({color:0x5e1221,roughness:.88,side:THREE.DoubleSide}));cape.position.y=-1.2;cape.rotation.x=.08;capePivot.add(cape);
  const swordPivot=new THREE.Group();swordPivot.position.set(.98,1.45,-.08);arms[1].add(swordPivot);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.72,8),materials.leather);grip.position.y=-.3;swordPivot.add(grip);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.42,2.9,.15),materials.steel);blade.position.y=-2.0;blade.rotation.z=.06;blade.castShadow=true;swordPivot.add(blade);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(.1,2.7,.19),materials.redGlow);edge.position.set(-.23,-2.0,0);swordPivot.add(edge);
  root.userData={torso,headPivot,arms,legs,capePivot,swordPivot,blade,edge};return root;
}
const player={group:makeRamzx(),hp:3100,maxHp:3100,shield:0,speed:8.8,attackDamage:190,attackRange:3.5,facing:new THREE.Vector3(0,0,-1),alive:true,kills:0,deadlineTarget:null,deadlineUntil:0,attackAnim:0,walkPhase:0};
player.group.position.set(-52,0,52);scene.add(player.group);
const playerRing=new THREE.Mesh(new THREE.RingGeometry(.78,1.08,40),new THREE.MeshBasicMaterial({color:0xa5314f,transparent:true,opacity:.68,side:THREE.DoubleSide}));playerRing.rotation.x=-Math.PI/2;playerRing.position.y=.04;player.group.add(playerRing);

const enemies=[];
function healthBar(color=0xd34655){
  const g=new THREE.Group();g.position.y=4.4;
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.22),new THREE.MeshBasicMaterial({color:0x09090b,side:THREE.DoubleSide}));g.add(bg);
  const fill=new THREE.Mesh(new THREE.PlaneGeometry(2.16,.13),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));fill.position.set(0,0,.01);g.add(fill);g.userData.fill=fill;return g;
}
function createKnight(name,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.35,5,10),new THREE.MeshStandardMaterial({color:0x55222c,metalness:.5,roughness:.5}));body.position.y=1.35;body.castShadow=true;g.add(body);
  const helm=new THREE.Mesh(new THREE.CylinderGeometry(.48,.56,.75,7),materials.blackSteel);helm.position.y=2.85;g.add(helm);
  const sword=new THREE.Mesh(new THREE.BoxGeometry(.18,2.3,.14),materials.steel);sword.position.set(.85,1.35,0);sword.rotation.z=-.3;g.add(sword);
  const hb=healthBar();g.add(hb);scene.add(g);
  const e={name,group:g,body,hb,hp:1900,maxHp:1900,damage:95,speed:2.7,alive:true,spawn:g.position.clone(),respawnAt:0,nextHit:0,type:'knight'};enemies.push(e);return e;
}
function createStoneback(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,1),new THREE.MeshStandardMaterial({color:0x514944,roughness:.82,metalness:.08}));body.position.y=1.5;body.scale.set(1.4,.9,1.7);body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.DodecahedronGeometry(.7,0),materials.rock2);head.position.set(0,1.45,-1.65);g.add(head);
  for(let i=0;i<5;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.18,.85,5),materials.purpleGlow);spike.position.set((i-2)*.42,2.45,(i%2)*.2);spike.rotation.z=(i-2)*.13;g.add(spike)}
  const legs=[];for(const sx of [-1,1])for(const sz of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.2,.28,1.15,6),materials.rock2);leg.position.set(sx*.85,.65,sz*.85);leg.rotation.z=sx*.22;g.add(leg);legs.push(leg)}
  const hb=healthBar(0xb26d4e);hb.position.y=3.6;g.add(hb);scene.add(g);
  const e={name:'STONEBACK',group:g,body,hb,hp:2400,maxHp:2400,damage:120,speed:2.0,alive:true,spawn:g.position.clone(),respawnAt:0,nextHit:0,type:'stoneback',legs};enemies.push(e);return e;
}
createKnight('RIFT SENTINEL',-42,38);createStoneback(-36,10);

const FX=[];
function fxRing(pos,color=0xd74d69,start=.6,end=4,dur=.35){const m=new THREE.Mesh(new THREE.RingGeometry(.8,1.05,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.copy(pos);m.position.y=.18;scene.add(m);FX.push({m,t:0,dur,start,end,type:'ring'});}
function fxBurst(pos,color=0xff5c72){for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.08,5,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));m.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*.6,1+Math.random()*1.5,(Math.random()-.5)*.6));scene.add(m);FX.push({m,t:0,dur:.38,v:new THREE.Vector3((Math.random()-.5)*5,1+Math.random()*4,(Math.random()-.5)*5),type:'particle'});}}
function fxSlash(pos,dir){const m=new THREE.Mesh(new THREE.TorusGeometry(2.2,.09,6,36,Math.PI*1.2),new THREE.MeshBasicMaterial({color:0xf14563,transparent:true,opacity:.85}));m.position.copy(pos);m.position.y=1.25;m.rotation.x=Math.PI/2;m.rotation.z=-Math.atan2(dir.x,dir.z)-.45;scene.add(m);FX.push({m,t:0,dur:.28,type:'fade'});}
function fxShield(){const m=new THREE.Mesh(new THREE.SphereGeometry(1.65,20,14),new THREE.MeshBasicMaterial({color:0x8b3fd1,wireframe:true,transparent:true,opacity:.48}));m.position.copy(player.group.position);m.position.y=1.9;scene.add(m);FX.push({m,t:0,dur:1.0,type:'shield'});}
function fxAfterimage(pos){const m=player.group.clone(true);m.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshBasicMaterial({color:0xa72c51,transparent:true,opacity:.15,depthWrite:false})});m.position.copy(pos);scene.add(m);FX.push({m,t:0,dur:.32,type:'fade'});}
function announce(text,ms=950){ui.announcement.textContent=text;ui.announcement.classList.add('show');clearTimeout(announce._t);announce._t=setTimeout(()=>ui.announcement.classList.remove('show'),ms)}

const cds={attack:0,s1:0,s2:0,s3:0,ult:0},dur={attack:.82,s1:7,s2:12,s3:8,ult:34};
const now=()=>performance.now()/1000;
function nearest(range=Infinity){let best=null,d0=range;for(const e of enemies){if(!e.alive)continue;const d=player.group.position.distanceTo(e.group.position);if(d<d0){d0=d;best=e}}return best}
function hurtEnemy(e,dmg){if(!e||!e.alive)return;e.hp=Math.max(0,e.hp-dmg);e.body.material.emissive?.setHex?.(0x70152b);e.body.material.emissiveIntensity=1.8;setTimeout(()=>{if(e.body.material)e.body.material.emissiveIntensity=0},90);fxBurst(e.group.position);if(e.hp<=0){e.alive=false;e.group.visible=false;e.respawnAt=now()+7;player.kills++;ui.killsText.textContent=`KILLS ${player.kills}`;announce(e.type==='stoneback'?'STONEBACK SLAIN':'TARGET EXECUTED',1200)}}
function attack(){const t=now();if(t<cds.attack||!player.alive)return;cds.attack=t+dur.attack;player.attackAnim=1;const e=nearest(player.attackRange);fxSlash(player.group.position,player.facing);if(!e){announce('NO TARGET IN RANGE',450);return}player.facing.copy(e.group.position).sub(player.group.position).setY(0).normalize();let dmg=player.attackDamage;if(player.deadlineTarget===e&&t<player.deadlineUntil){dmg+=560;announce('DEADLINE',1100);fxRing(e.group.position,0xff284c,.8,6,.45);if(e.hp/e.maxHp<.25)dmg=e.hp+1;player.deadlineTarget=null;player.deadlineUntil=0}hurtEnemy(e,dmg)}
function skill1(){const t=now();if(t<cds.s1||!player.alive)return;cds.s1=t+dur.s1;player.attackAnim=1;announce('SEVER');fxSlash(player.group.position,player.facing);fxRing(player.group.position,0xd93758,.8,4.8,.38);for(const e of enemies){if(!e.alive)continue;const off=e.group.position.clone().sub(player.group.position).setY(0),d=off.length();if(d<=4.8&&off.normalize().dot(player.facing)>.05)hurtEnemy(e,330)}}
function skill2(){const t=now();if(t<cds.s2||!player.alive)return;cds.s2=t+dur.s2;const fx=player.upgrades?skillEffects(player.upgrades.ranks):{shield:520,shieldCap:850};player.shield=Math.min(fx.shieldCap,player.shield+fx.shield);announce('IRON ORDER');fxShield()}
function skill3(){const t=now();if(t<cds.s3||!player.alive)return;cds.s3=t+dur.s3;announce('EXECUTION STEP');const start=player.group.position.clone();fxAfterimage(start);for(let i=1;i<=3;i++)setTimeout(()=>fxAfterimage(player.group.position.clone()),i*45);player.group.position.addScaledVector(player.facing,6.2);player.group.position.x=THREE.MathUtils.clamp(player.group.position.x,-57,57);player.group.position.z=THREE.MathUtils.clamp(player.group.position.z,-57,57);fxRing(player.group.position,0xbf3152,.5,3.2,.28);const e=nearest(2.5);if(e)hurtEnemy(e,270)}
function ultimate(){const t=now();if(t<cds.ult||!player.alive)return;const e=nearest(11);if(!e){announce('NO TARGET TO MARK');return}cds.ult=t+dur.ult;player.deadlineTarget=e;player.deadlineUntil=t+6;announce('YOUR DEADLINE HAS COME',1500);const mark=new THREE.Mesh(new THREE.TorusGeometry(.75,.09,6,28),new THREE.MeshBasicMaterial({color:0xff3456,transparent:true,opacity:.9}));mark.position.set(0,4.35,0);mark.rotation.x=Math.PI/2;e.group.add(mark);FX.push({m:mark,t:0,dur:6,type:'mark',parent:e.group})}
function hurtPlayer(dmg){if(!player.alive)return;let left=dmg;if(player.shield>0){const s=Math.min(left,player.shield);player.shield-=s;left-=s}player.hp=Math.max(0,player.hp-left);if(player.hp<=0){player.alive=false;announce('RAMZX FALLS',1500);setTimeout(()=>{player.hp=player.maxHp;player.shield=0;player.group.position.set(-55,0,55);player.alive=true;announce('RETURN TO WAR')},3000)}}

const keys=new Set();let joy={x:0,y:0,active:false};let panOffset=new THREE.Vector3(),panDragging=false,panPointer=null,lastPan={x:0,y:0};let aim=null;
addEventListener('keydown',e=>{if(e.target.closest?.('input,select,textarea'))return;if(e.code==='Space'&&e.target.closest?.('button'))return;if(['Space','Digit1','Digit2','Digit3','Digit4','KeyR'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Space')attack();if(e.code==='Digit1')skill1();if(e.code==='Digit2')skill2();if(e.code==='Digit3')skill3();if(e.code==='Digit4')ultimate();if(e.code==='KeyR')panOffset.set(0,0,0)});addEventListener('keyup',e=>keys.delete(e.code));
const joyEl=document.querySelector('#joystick'),stick=document.querySelector('#stick');let joyPid=null;
function moveJoy(e){const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.32;let dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy)||1;if(l>max){dx*=max/l;dy*=max/l}joy={x:dx/max,y:dy/max,active:true};stick.style.transform=`translate(${dx}px,${dy}px)`}
joyEl.addEventListener('pointerdown',e=>{joyPid=e.pointerId;joyEl.setPointerCapture(joyPid);moveJoy(e)});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joyPid)moveJoy(e)});function clearJoy(){joyPid=null;joy={x:0,y:0,active:false};stick.style.transform='translate(0,0)'}joyEl.addEventListener('pointerup',clearJoy);joyEl.addEventListener('pointercancel',clearJoy);

function screenAimVector(dx,dy){const right=new THREE.Vector3(1,0,-1).normalize();const forward=new THREE.Vector3(-1,0,-1).normalize();const v=right.multiplyScalar(dx).add(forward.multiplyScalar(-dy));return v.lengthSq()>.001?v.normalize():player.facing.clone()}
document.querySelectorAll('.skill').forEach(btn=>{
  btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);const a=btn.dataset.action;if(a==='attack'){attack();return}const r=btn.getBoundingClientRect();aim={pid:e.pointerId,action:a,cx:r.left+r.width/2,cy:r.top+r.height/2,dx:0,dy:0};});
  btn.addEventListener('pointermove',e=>{if(!aim||aim.pid!==e.pointerId)return;aim.dx=e.clientX-aim.cx;aim.dy=e.clientY-aim.cy;if(Math.hypot(aim.dx,aim.dy)>12)player.facing.copy(screenAimVector(aim.dx,aim.dy));});
  const cast=e=>{if(!aim||aim.pid!==e.pointerId)return;const a=aim.action;aim=null;if(a==='s1')skill1();if(a==='s2')skill2();if(a==='s3')skill3();if(a==='ult')ultimate()};
  btn.addEventListener('pointerup',cast);btn.addEventListener('pointercancel',()=>aim=null);
});

canvas.addEventListener('pointerdown',e=>{if(aim)return;panDragging=true;panPointer=e.pointerId;lastPan={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!panDragging||panPointer!==e.pointerId)return;const dx=e.clientX-lastPan.x,dy=e.clientY-lastPan.y;lastPan={x:e.clientX,y:e.clientY};const right=new THREE.Vector3(1,0,-1).normalize(),forward=new THREE.Vector3(-1,0,-1).normalize();panOffset.addScaledVector(right,-dx*.075);panOffset.addScaledVector(forward,dy*.075);if(panOffset.length()>22)panOffset.setLength(22)});
function endPan(e){if(panPointer===e.pointerId){panDragging=false;panPointer=null}}canvas.addEventListener('pointerup',endPan);canvas.addEventListener('pointercancel',endPan);
document.querySelector('#cameraLock')?.addEventListener('click',()=>panOffset.set(0,0,0));

let mmPointer=null;
function minimapWorld(e){const r=ui.minimap.getBoundingClientRect();const nx=THREE.MathUtils.clamp((e.clientX-r.left)/r.width,0,1),ny=THREE.MathUtils.clamp((e.clientY-r.top)/r.height,0,1);return new THREE.Vector3(nx*WORLD-HALF,0,ny*WORLD-HALF)}
ui.minimap.addEventListener('pointerdown',e=>{mmPointer=e.pointerId;ui.minimap.setPointerCapture(e.pointerId);const p=minimapWorld(e);panOffset.copy(p.sub(player.group.position));if(panOffset.length()>35)panOffset.setLength(35)});
ui.minimap.addEventListener('pointermove',e=>{if(e.pointerId!==mmPointer)return;const p=minimapWorld(e);panOffset.copy(p.sub(player.group.position));if(panOffset.length()>35)panOffset.setLength(35)});
ui.minimap.addEventListener('pointerup',e=>{if(e.pointerId===mmPointer)mmPointer=null});ui.minimap.addEventListener('pointercancel',()=>mmPointer=null);

const pitch=THREE.MathUtils.degToRad(55),yaw=THREE.MathUtils.degToRad(45),distance=32;
const horiz=Math.cos(pitch)*distance,height=Math.sin(pitch)*distance;
const camBaseOffset=new THREE.Vector3(Math.sin(yaw)*horiz,height,Math.cos(yaw)*horiz);
const lookAhead=new THREE.Vector3(0,1.0,0);

function updatePlayer(dt,t){
  if(!player.alive)return;let x=0,z=0;if(keys.has('KeyA'))x--;if(keys.has('KeyD'))x++;if(keys.has('KeyW'))z--;if(keys.has('KeyS'))z++;if(joy.active){x+=joy.x;z+=joy.y}
  const v=new THREE.Vector3(x,0,z),moving=v.lengthSq()>.001;if(moving){v.normalize();player.facing.copy(v);player.group.position.addScaledVector(v,player.speed*dt);player.group.position.x=THREE.MathUtils.clamp(player.group.position.x,-57,57);player.group.position.z=THREE.MathUtils.clamp(player.group.position.z,-57,57);player.group.rotation.y=Math.atan2(v.x,v.z);player.walkPhase+=dt*9}
  const p=player.group.userData,walk=moving?Math.sin(player.walkPhase):0,breathe=Math.sin(t*2.2)*.025;
  p.torso.position.y=2.35+breathe;p.headPivot.rotation.z=Math.sin(t*1.5)*.012;p.legs[0].rotation.x=walk*.55;p.legs[1].rotation.x=-walk*.55;p.arms[0].rotation.x=-walk*.35;p.arms[1].rotation.x=walk*.22;p.capePivot.rotation.x=.13+Math.sin(t*3+player.walkPhase)*.05+(moving?.12:0);
  if(player.attackAnim>0){player.attackAnim=Math.max(0,player.attackAnim-dt*2.8);const s=Math.sin((1-player.attackAnim)*Math.PI);p.arms[1].rotation.z=-.35-s*1.0;p.swordPivot.rotation.x=-.25-s*.95}else{p.arms[1].rotation.z=0;p.swordPivot.rotation.x=-.15}
  playerRing.rotation.z+=dt*.7;
}
function updateEnemies(dt,t){for(const e of enemies){if(!e.alive){if(t>=e.respawnAt){e.hp=e.maxHp;e.group.position.copy(e.spawn);e.group.visible=true;e.alive=true}continue}e.hb.lookAt(camera.position);e.hb.userData.fill.scale.x=Math.max(.001,e.hp/e.maxHp);e.hb.userData.fill.position.x=-(1-e.hp/e.maxHp)*1.08;const d=e.group.position.distanceTo(player.group.position);if(d<7.5&&player.alive){const dir=player.group.position.clone().sub(e.group.position).setY(0);if(d>2.1){dir.normalize();e.group.position.addScaledVector(dir,e.speed*dt);e.group.rotation.y=Math.atan2(dir.x,dir.z)}else if(t>=e.nextHit){e.nextHit=t+1.25;hurtPlayer(e.damage)}}if(e.type==='stoneback')e.legs?.forEach((l,i)=>l.rotation.x=Math.sin(t*6+i*Math.PI/2)*.16)}}
function updateTowers(dt,t){for(const tw of towers){tw.userData.crystal.rotation.y+=dt*1.5;const isEnemy=tw.userData.team==='red';if(isEnemy&&player.alive&&tw.position.distanceTo(player.group.position)<9&&t>=tw.userData.nextShot){tw.userData.nextShot=t+1.4;const orb=new THREE.Mesh(new THREE.SphereGeometry(.22,8,8),new THREE.MeshBasicMaterial({color:0xff415d}));orb.position.copy(tw.position).add(new THREE.Vector3(0,4.7,0));scene.add(orb);const target=player.group.position.clone().add(new THREE.Vector3(0,1.4,0));FX.push({m:orb,t:0,dur:.55,type:'projectile',from:orb.position.clone(),to:target,onHit:()=>hurtPlayer(170)});}}}
function updateFx(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt;const q=Math.min(1,f.t/f.dur);if(f.type==='ring'){const s=THREE.MathUtils.lerp(f.start,f.end,q);f.m.scale.setScalar(s);f.m.material.opacity=.8*(1-q)}else if(f.type==='particle'){f.m.position.addScaledVector(f.v,dt);f.v.y-=8*dt;f.m.material.opacity=1-q}else if(f.type==='fade'){if(f.m.material?.opacity!==undefined)f.m.material.opacity=.8*(1-q);f.m.traverse?.(o=>{if(o.material&&o.material.transparent)o.material.opacity*=.96})}else if(f.type==='shield'){f.m.position.copy(player.group.position);f.m.position.y=1.9;f.m.rotation.y+=dt*2;f.m.material.opacity=.5*(1-q)}else if(f.type==='mark'){f.m.rotation.z+=dt*3;f.m.material.opacity=.9*(1-q)}else if(f.type==='projectile'){f.m.position.lerpVectors(f.from,f.to,q);if(q>=1&&f.onHit)f.onHit()}if(q>=1){f.parent?.remove(f.m);scene.remove(f.m);FX.splice(i,1)}}}
function updateWorld(dt,t){blueCore.userData.crystal.rotation.y+=dt*.8;blueCore.userData.halo.rotation.z+=dt*.3;redCore.userData.crystal.rotation.y-=dt*.8;redCore.userData.halo.rotation.z-=dt*.3;pitSigil.rotation.z+=dt*.22;pitlord.rotation.y=Math.sin(t*.35)*.12;pitlord.userData.body.position.y=2.4+Math.sin(t*1.8)*.12;campObjects.forEach((c,i)=>{c.userData.crystal.rotation.y+=dt*(.7+(i%3)*.1);c.userData.crystal.position.y=1.15+Math.sin(t*2+i)*.08});river.material.opacity=.79+Math.sin(t*.8)*.04}
function updateUi(t){ui.hpFill.style.width=`${100*player.hp/player.maxHp}%`;ui.shieldFill.style.width=`${100*Math.min(1,player.shield/player.maxHp)}%`;ui.hpText.textContent=`${Math.ceil(player.hp)} / ${player.maxHp}${player.shield?` +${Math.ceil(player.shield)} SHIELD`:''}`;ui.statusText.textContent=player.deadlineTarget&&t<player.deadlineUntil?'DEADLINE ACTIVE':'MAP EXPLORATION';const n=nearest(12);if(n){ui.targetName.textContent=n.name;ui.targetHpFill.style.width=`${100*n.hp/n.maxHp}%`;ui.targetHpText.textContent=`${Math.ceil(n.hp)} / ${n.maxHp}`}else{ui.targetName.textContent='NO TARGET';ui.targetHpFill.style.width='0%';ui.targetHpText.textContent=''}for(const [a,end] of Object.entries(cds)){const b=document.querySelector(`.skill[data-action="${a}"]`);if(!b)continue;const left=Math.max(0,end-t);b.classList.toggle('cooling',left>0);const em=b.querySelector('em');if(em)em.style.height=`${100*left/dur[a]}%`;const sm=b.querySelector('small');if(sm&&a!=='attack')sm.textContent=left>0?left.toFixed(left<10?1:0):(a==='ult'?'4':a==='s3'?'3':a==='s2'?'2':'1')}}
function drawMinimap(){const w=ui.minimap.width,h=ui.minimap.height;mm.clearRect(0,0,w,h);mm.fillStyle='#0c1015';mm.fillRect(0,0,w,h);const P=(x,z)=>[(x+HALF)/WORLD*w,(z+HALF)/WORLD*h];mm.strokeStyle='#26313a';mm.lineWidth=10;for(const lane of [laneA,laneB]){mm.beginPath();lane.forEach((p,i)=>{const q=P(...p);i?mm.lineTo(...q):mm.moveTo(...q)});mm.stroke()}mm.strokeStyle='rgba(56,112,145,.7)';mm.lineWidth=9;mm.beginPath();mm.moveTo(...P(-60,-60));mm.lineTo(...P(60,60));mm.stroke();mm.strokeStyle='#7f4b91';mm.lineWidth=2;mm.beginPath();mm.arc(...P(0,0),10,0,Math.PI*2);mm.stroke();for(const c of camps){mm.fillStyle=c[2]==='yellow'?'#c38a31':c[2]==='purple'?'#8f55bb':c[2]==='blue'?'#448bc4':'#c44851';const p=P(c[0],c[1]);mm.beginPath();mm.arc(p[0],p[1],3,0,Math.PI*2);mm.fill()}for(const tw of towers){mm.fillStyle=tw.userData.team==='blue'?'#398ad0':'#d14459';const p=P(tw.position.x,tw.position.z);mm.fillRect(p[0]-2,p[1]-2,4,4)}for(const [core,c] of [[blueCore,'#5eb0f0'],[redCore,'#f05b70']]){mm.fillStyle=c;const p=P(core.position.x,core.position.z);mm.beginPath();mm.arc(p[0],p[1],5,0,Math.PI*2);mm.fill()}const pp=P(player.group.position.x,player.group.position.z);mm.fillStyle='#fff';mm.beginPath();mm.arc(pp[0],pp[1],4,0,Math.PI*2);mm.fill();mm.strokeStyle='#d44262';mm.lineWidth=2;mm.stroke()}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();

let fpsFrames=0,lastFps=0;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.033),t=now();updatePlayer(dt,t);updateEnemies(dt,t);updateTowers(dt,t);updateFx(dt);updateWorld(dt,t);if(!panDragging&&mmPointer===null&&!aim)panOffset.lerp(new THREE.Vector3(),1-Math.pow(.035,dt));const aimOffset=aim?player.facing.clone().multiplyScalar(Math.min(8,Math.hypot(aim.dx,aim.dy)*.035)):new THREE.Vector3();const focus=player.group.position.clone().add(panOffset).add(aimOffset);const desired=focus.clone().add(camBaseOffset);camera.position.lerp(desired,1-Math.pow(.0025,dt));camera.lookAt(focus.clone().add(lookAhead));updateUi(t);drawMinimap();renderer.render(scene,camera);fpsFrames++;if(t-lastFps>1){ui.fps.textContent=`${fpsFrames} FPS`;fpsFrames=0;lastFps=t}}

ui.loadingText.textContent='The Twisted Rift battlefield is ready.';
setTimeout(()=>ui.loading.classList.remove('show'),650);
announce('WELCOME TO TWISTED RIFT',1700);
loop();
