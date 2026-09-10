// ---- Alpha 0.4: match systems layered onto the approved Alpha 0.3 battlefield ----
const A04_BLUE='blue',A04_RED='red';
const a04Start=now();
let a04Wave=0,a04NextWave=MATCH.firstWave,a04Ended=false,a04PitSpawned=false,a04PitRespawn=0;
const a04PitBuff={blue:0,red:0};
player.gold=500;
const a04Hud={timer:document.querySelector('#matchTimer'),gold:document.querySelector('#goldText'),wave:document.querySelector('#waveText'),pit:document.querySelector('#pitlordText'),jungle:document.querySelector('#jungleText')};
const a04Time=t=>t-a04Start;

function a04Stage(label){return label.includes('T1')?0:label.includes('T2')?1:label.includes('G1')?2:3}
for(const tw of towers){tw.userData.kind='tower';tw.userData.name=`${tw.userData.team.toUpperCase()} ${tw.userData.label}`;tw.userData.stage=a04Stage(tw.userData.label);tw.userData.lane=tw.userData.label[0];tw.userData.alive=true;tw.userData._group=tw;tw.userData.maxHp=[6000,7500,9500,11000][tw.userData.stage];tw.userData.hp=tw.userData.maxHp;tw.userData.damage=[240,290,350,420][tw.userData.stage];tw.userData.range=8.8;}
for(const core of [blueCore,redCore]){core.userData.kind='core';core.userData.name=`${core.userData.team.toUpperCase()} CORE`;core.userData.alive=true;core.userData._group=core;core.userData.hp=18000;core.userData.maxHp=18000;}

const a04Minions=[];
const a04UnitGrid=new UnitGrid();
function a04SpawnMinion(team,lane,type,formation={side:0,back:0}){
  const base=lane==='A'?laneA:laneB, route=team===A04_BLUE?base:[...base].reverse();
  const path=route.map((p,i)=>{const a=route[Math.max(0,i-1)],b=route[Math.min(route.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;return new THREE.Vector3(p[0]-dz/length*formation.side,0,p[1]+dx/length*formation.side);});
  const group=new THREE.Group(),direction=path[1].clone().sub(path[0]).normalize();
  group.position.copy(path[0]).addScaledVector(direction,-formation.back);scene.add(group);
  const hp=type==='special'?820:type==='ranged'?560:700;
  const m={kind:'minion',name:`${team.toUpperCase()} ${type.toUpperCase()} MINION`,team,lane,type,visualType:formation.visualType,group,body:null,hp,maxHp:hp,damage:type==='ranged'?62:72,range:type==='ranged'?5.2:1.55,speed:MATCH.minionSpeed,path,index:0,alive:true,nextHit:0,respawnAt:Infinity};
  group.visible=team===A04_BLUE;a04Minions.push(m);return m;
}
function a04SpawnWave(){
  a04Wave++;
  for(const lane of ['A','B'])for(const team of [A04_BLUE,A04_RED])for(const formation of waveFormation(a04Wave))a04SpawnMinion(team,lane,formation.type,formation);
  if(a04Wave===1||a04Wave%MATCH.siegeEvery===0)announce(a04Wave===1?'THE LEGIONS MARCH':`WAVE ${a04Wave} · RIFT SIEGE`,850);
}
function a04PruneMinions(){
  let live=0;
  for(const m of a04Minions){if(m.alive)a04Minions[live++]=m;else m.group.removeFromParent();}
  a04Minions.length=live;
}

const a04Jungle=[];
function a04JungleModel(type){
  const g=new THREE.Group(),mat=type==='purple'?materials.purpleGlow:type==='blue'?materials.blueGlow:type==='red'?materials.redGlow:materials.yellowGlow;
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(type==='purple'?1.35:1.05,1),new THREE.MeshStandardMaterial({color:type==='purple'?0x55405e:0x514a43,roughness:.72,metalness:.12}));body.position.y=1.15;body.scale.set(1.15,.9,1.25);body.castShadow=true;g.add(body);
  for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(.14,.72,5),mat);s.position.set((i-1.5)*.32,2.15,.08);s.rotation.z=(i-1.5)*.14;g.add(s)}scene.add(g);return {g,body};
}
for(let i=0;i<camps.length;i++){const [x,z,type]=camps[i],m=a04JungleModel(type);m.g.position.set(x,0,z);m.g.visible=false;const hp=type==='purple'?3000:2100;a04Jungle.push({kind:'jungle',name:type==='purple'?'RIFT BRUTE':type==='blue'?'AZURE WARDEN':type==='red'?'CRIMSON MAULER':'STONEBACK',team:'neutral',type,group:m.g,body:m.body,hp:0,maxHp:hp,damage:type==='purple'?150:105,alive:false,spawn:new THREE.Vector3(x,0,z),respawnAt:MATCH.jungleFirstSpawn,nextHit:0,speed:1.6});}

pitlord.visible=false;
const a04Pit={kind:'pitlord',name:'PITLORD',team:'neutral',group:pitlord,body:pitlord.userData.body,hp:9000,maxHp:9000,damage:230,alive:false,nextHit:0,lastTeam:null,speed:1,spawn:new THREE.Vector3(0,0,0)};
function a04SpawnPit(force=false){if(a04Pit.alive)return;const mt=a04Time(now());if(!force&&mt<210)return;a04Pit.alive=true;a04Pit.hp=a04Pit.maxHp;a04Pit.group.visible=riftVision.visible(a04Pit);a04Pit.group.position.set(0,0,0);a04PitSpawned=true;announce('THE RIFT TREMBLES… PITLORD HAS AWAKENED!',2100);}
function a04KillPit(team){a04Pit.alive=false;a04Pit.group.visible=false;a04PitRespawn=a04Time(now())+180;a04PitBuff[team]=a04Time(now())+90;announce(team===A04_BLUE?'THE RIFT BOWS TO YOUR WILL.':'THE PITLORD HAS FALLEN TO THE ENEMY.',1900);}
addEventListener('keydown',e=>{if(gameMode!=='battle')return;if(e.target.closest?.('input,select,textarea'))return;if(e.code==='KeyP'&&!e.repeat)a04SpawnPit(true)});

function a04Pos(o){return o.group?o.group.position:o._group.position}
function a04LaneUnlocked(t){if(t.stage===0)return true;return !towers.some(x=>x.userData.team===t.team&&x.userData.lane===t.lane&&x.userData.stage===t.stage-1&&x.userData.alive)}
function a04CoreOpen(team){return !towers.some(x=>x.userData.team===team&&x.userData.stage>=2&&x.userData.alive)}
function a04MinionSupport(pos,defTeam,r=9){return a04Minions.some(m=>m.alive&&m.team!==defTeam&&m.group.position.distanceTo(pos)<=r)}
function a04StructureDamage(s,dmg,team){if(!s.alive)return;if(s.kind==='tower'&&!a04LaneUnlocked(s)){if(team===A04_BLUE)announce('DESTROY THE PREVIOUS TOWER FIRST',650);return}if(s.kind==='core'&&!a04CoreOpen(s.team)){if(team===A04_BLUE)announce('THE CORE IS PROTECTED',700);return}if(!a04MinionSupport(a04Pos(s),s.team,s.kind==='core'?10:9))dmg*=.05;if(team===A04_BLUE&&a04PitBuff.blue>a04Time(now()))dmg*=1.10;s.hp=Math.max(0,s.hp-dmg);fxBurst(a04Pos(s));if(s.hp<=0){s.alive=false;s._group.visible=false;if(s.kind==='tower'){announce(team===A04_BLUE?'THEIR FORTRESS CRUMBLES.':'YOUR FORTRESS FALLS.',1200);if(team===A04_BLUE)player.gold+=260}else{a04Ended=true;announce(s.team===A04_RED?'VICTORY · THE RIFT IS YOURS.':'DEFEAT · YOUR JOURNEY ENDS HERE.',3200)}}}
function a04KillUnit(e,byTeam){e.alive=false;e.group.visible=false;if(e.kind==='minion'){if(byTeam===A04_BLUE)player.gold+=e.type==='special'?75:45}else if(e.kind==='jungle'){e.respawnAt=a04Time(now())+MATCH.jungleRespawn;if(byTeam===A04_BLUE){player.gold+=e.type==='purple'?180:110;if(e.type==='red')player.redBuffUntil=a04Time(now())+60;if(e.type==='blue')player.blueBuffUntil=a04Time(now())+60;announce(`${e.name} SLAIN`,600)}}else if(e.kind==='pitlord')a04KillPit(byTeam)}
function a04Hurt(e,dmg,byTeam=A04_BLUE){if(!e||!e.alive)return;riftVision.reveal(e,byTeam,now());if(a05PlayerDamageContext)riftVision.reveal(player,A04_RED,now());if(e.kind==='tower'||e.kind==='core')return a04StructureDamage(e,dmg,byTeam);e.hp=Math.max(0,e.hp-dmg);if(e.body?.material){e.body.material.emissive?.setHex?.(0x70152b);e.body.material.emissiveIntensity=1.7;setTimeout(()=>{if(e.body?.material)e.body.material.emissiveIntensity=0},80)}fxBurst(a04Pos(e));if(e.hp<=0)a04KillUnit(e,byTeam)}

const a03Nearest=nearest,a03HurtEnemy=hurtEnemy;
nearest=function(range=Infinity){let best=a03Nearest(range),d0=best?player.group.position.distanceTo(best.group.position):range;const list=[...a04Minions.filter(m=>m.alive&&m.team===A04_RED),...a04Jungle.filter(j=>j.alive)];if(a04Pit.alive)list.push(a04Pit);for(const tw of towers)if(tw.userData.team===A04_RED&&tw.userData.alive)list.push(tw.userData);if(redCore.userData.alive)list.push(redCore.userData);for(const e of list){if(!riftVision.visible(e))continue;const d=player.group.position.distanceTo(a04Pos(e));if(d<d0){d0=d;best=e}}return best};
hurtEnemy=function(e,dmg){if(e?.kind)return a04Hurt(e,dmg,A04_BLUE);return a03HurtEnemy(e,dmg)};

attack=function(){const t=now();if(t<cds.attack||!player.alive||a04Ended)return;cds.attack=t+dur.attack;player.attackAnim=1;const e=nearest(player.attackRange);fxSlash(player.group.position,player.facing);if(!e){announce('NO TARGET IN RANGE',430);return}player.facing.copy(a04Pos(e)).sub(player.group.position).setY(0).normalize();let dmg=player.attackDamage*(player.redBuffUntil>a04Time(t)?1.10:1);if(player.deadlineTarget===e&&t<player.deadlineUntil){dmg+=player.upgrades?skillEffects(player.upgrades.ranks).deadline:560;announce('DEADLINE',1000);fxRing(a04Pos(e),0xff284c,.8,6,.45);if(e.hp/e.maxHp<(player.upgrades?skillEffects(player.upgrades.ranks).execute:.25))dmg=e.hp+1;player.deadlineTarget=null;player.deadlineUntil=0}if(e.kind)a04Hurt(e,dmg,A04_BLUE);else a03HurtEnemy(e,dmg)};
skill1=function(){const t=now();if(t<cds.s1||!player.alive)return;cds.s1=t+dur.s1;player.attackAnim=1;announce('SEVER');fxSlash(player.group.position,player.facing);fxRing(player.group.position,0xd93758,.8,4.8,.38);const list=[...enemies,...a04Minions,...a04Jungle];if(a04Pit.alive)list.push(a04Pit);for(const e of list){if(!e.alive||e.team===A04_BLUE)continue;const off=a04Pos(e).clone().sub(player.group.position).setY(0),d=off.length();if(d<=4.8&&off.normalize().dot(player.facing)>.05)(e.kind?a04Hurt(e,player.upgrades?skillEffects(player.upgrades.ranks).sever:330,A04_BLUE):a03HurtEnemy(e,player.upgrades?skillEffects(player.upgrades.ranks).sever:330))}};
skill3=function(){const t=now();if(t<cds.s3||!player.alive)return;cds.s3=t+dur.s3;announce('EXECUTION STEP');const start=player.group.position.clone();fxAfterimage(start);riftNavigation.move(player.group.position,player.facing.x*6.2,player.facing.z*6.2,BODY_RADIUS.hero);player.group.position.x=THREE.MathUtils.clamp(player.group.position.x,-PLAYER_BOUND,PLAYER_BOUND);player.group.position.z=THREE.MathUtils.clamp(player.group.position.z,-PLAYER_BOUND,PLAYER_BOUND);fxRing(player.group.position,0xbf3152,.5,3.2,.28);const e=nearest(2.5);if(e)(e.kind?a04Hurt(e,player.upgrades?skillEffects(player.upgrades.ranks).step:270,A04_BLUE):a03HurtEnemy(e,player.upgrades?skillEffects(player.upgrades.ranks).step:270))};
ultimate=function(){const t=now();if(t<cds.ult||!player.alive)return;let e=null,d0=11;for(const x of [...enemies,...a04Minions.filter(m=>m.team===A04_RED),...a04Jungle,...(a04Pit.alive?[a04Pit]:[])]){if(!riftVision.visible(x))continue;const d=player.group.position.distanceTo(a04Pos(x));if(d<d0){d0=d;e=x}}if(!e){announce('NO TARGET TO MARK');return}cds.ult=t+dur.ult;player.deadlineTarget=e;player.deadlineUntil=t+6;announce('YOUR DEADLINE HAS COME',1400);const mark=new THREE.Mesh(new THREE.TorusGeometry(.75,.09,6,28),new THREE.MeshBasicMaterial({color:0xff3456,transparent:true,opacity:.9}));mark.position.set(0,4.1,0);mark.rotation.x=Math.PI/2;e.group.add(mark);FX.push({m:mark,t:0,dur:6,type:'mark',parent:e.group})};

function a04EnemyMinion(team,pos,range){return a04UnitGrid.nearestEnemy(team,pos,range,e=>riftVision.visible(e,team));}
const a04LaneTowers={blue:{A:[],B:[]},red:{A:[],B:[]}};
for(const tower of towers)a04LaneTowers[tower.userData.team][tower.userData.lane].push(tower.userData);
for(const lanes of Object.values(a04LaneTowers))for(const line of Object.values(lanes))line.sort((a,b)=>a.stage-b.stage);
function a04LaneTower(defTeam,lane){return a04LaneTowers[defTeam][lane].find(t=>t.alive)||null;}
function a04MovePath(m,dt){
  const goal=m.path[m.index];if(!goal)return;
  if(m._checkedSegment!==m.index){m._checkedSegment=m.index;m._clearSegment=riftNavigation.clear(m.group.position,goal,BODY_RADIUS.minion);}
  if(m._clearSegment)moveAlongPath(m,dt,(p,dx,dz)=>riftNavigation.move(p,dx,dz,BODY_RADIUS.minion));
  else {riftNavigation.steer(m,goal,dt,BODY_RADIUS.minion);if(groundDistanceSq(m.group.position,goal)<.03**2)m.index++;}
}
function a04Projectile(from,to,color,onHit,dur=.38){const orb=new THREE.Mesh(new THREE.SphereGeometry(.15,7,6),new THREE.MeshBasicMaterial({color}));orb.position.copy(from);scene.add(orb);FX.push({m:orb,t:0,dur,type:'projectile',from:orb.position.clone(),to:to.clone(),onHit})}
function a04UpdateMinions(dt,t){a04PruneMinions();a04UnitGrid.rebuild(a04Minions);const mt=a04Time(t);for(const m of a04Minions){if(!m.alive)continue;const enemy=a04EnemyMinion(m.team,m.group.position,m.range+.5);const defTeam=m.team===A04_BLUE?A04_RED:A04_BLUE;let s=null;if(!enemy){const tw=a04LaneTower(defTeam,m.lane);if(tw&&groundDistanceSq(m.group.position,a04Pos(tw))<(m.range+1.2)**2)s=tw;else{const core=defTeam===A04_RED?redCore.userData:blueCore.userData;if(core.alive&&a04CoreOpen(defTeam)&&groundDistanceSq(m.group.position,a04Pos(core))<(m.range+1.4)**2)s=core}}const target=enemy||s;if(target){const tp=a04Pos(target);m.group.rotation.y=Math.atan2(tp.x-m.group.position.x,tp.z-m.group.position.z);if(mt>=m.nextHit){riftVision.reveal(m,defTeam,t);m.nextHit=mt+(m.type==='ranged'?1.3:1.05);const dmg=m.damage*(a04PitBuff[m.team]>mt?1.15:1);if(m.type==='ranged')a04Projectile(m.group.position.clone().add(new THREE.Vector3(0,1,0)),a04Pos(target).clone().add(new THREE.Vector3(0,1,0)),m.team===A04_BLUE?0x67b8ff:0xff6577,()=>{if(target.alive)a04Hurt(target,dmg,m.team)});else a04Hurt(target,dmg,m.team)}}else a04MovePath(m,dt)}a04UnitGrid.rebuild(a04Minions);}
function a04UpdateJungle(dt,t){const mt=a04Time(t);for(const j of a04Jungle){if(!j.alive){if(mt+1e-7>=j.respawnAt){j.alive=true;j.hp=j.maxHp;j.group.position.copy(j.spawn);j.nextHit=mt+.75;j._a05PlayerHitUntil=0;j.respawnAt=Infinity;j.group.visible=riftVision.visible(j)}continue}const d=j.group.position.distanceTo(player.group.position);if(player.alive&&d<7.2){const v=player.group.position.clone().sub(j.group.position).setY(0);if(d>2){riftNavigation.steer(j,player.group.position,dt,BODY_RADIUS.jungle)}else if(mt>=j.nextHit){j.nextHit=mt+1.3;hurtPlayer(j.damage,j.type==='blue'||j.type==='red'?'magical':'physical')}}else{const home=j.spawn.clone().sub(j.group.position).setY(0);if(home.length()>1)riftNavigation.steer(j,j.spawn,dt,BODY_RADIUS.jungle,1.2)}}}
function a04UpdatePit(dt,t){const mt=a04Time(t);if(!a04Pit.alive){if((!a04PitSpawned&&mt>=210)||(a04PitRespawn&&mt>=a04PitRespawn)){a04PitRespawn=0;a04SpawnPit(true)}return}const d=a04Pit.group.position.distanceTo(player.group.position);if(player.alive&&d<8){const v=player.group.position.clone().sub(a04Pit.group.position).setY(0);if(d>2.8)riftNavigation.steer(a04Pit,player.group.position,dt,BODY_RADIUS.pitlord);else if(mt>=a04Pit.nextHit){a04Pit.nextHit=mt+1.45;hurtPlayer(a04Pit.damage,'magical')}}else if(groundDistanceSq(a04Pit.group.position,a04Pit.spawn)>.1)riftNavigation.steer(a04Pit,a04Pit.spawn,dt,BODY_RADIUS.pitlord);}

const a03UpdateEnemies=updateEnemies;
updateEnemies=function(dt,t){a03UpdateEnemies(dt,t);a04UpdateMinions(dt,t);a04UpdateJungle(dt,t);a04UpdatePit(dt,t)};
updateTowers=function(dt,t){const mt=a04Time(t);for(const tw of towers){const s=tw.userData;if(!s.alive)continue;s.crystal.rotation.y+=dt*1.5;let target=a04EnemyMinion(s.team,tw.position,s.range),bd=s.range;if(!target&&s.team===A04_RED&&player.alive&&riftVision.visible(player,A04_RED)){const d=tw.position.distanceTo(player.group.position);if(d<bd){bd=d;target=player}}if(target&&mt>=s.nextShot){s.nextShot=mt+1;const tp=target===player?player.group.position:target.group.position;a04Projectile(tw.position.clone().add(new THREE.Vector3(0,4.7,0)),tp.clone().add(new THREE.Vector3(0,1.2,0)),s.team===A04_BLUE?0x5bb6ff:0xff4d64,()=>{if(target===player)hurtPlayer(s.damage,'magical');else if(target.alive)a04Hurt(target,s.damage,s.team)},.5)}}};

const a03UpdateUi=updateUi;
updateUi=function(t){a03UpdateUi(t);const mt=Math.max(0,a04Time(t)),mi=Math.floor(mt/60),se=Math.floor(mt%60);if(a04Hud.timer)a04Hud.timer.textContent=`${mi}:${String(se).padStart(2,'0')}`;if(a04Hud.gold)a04Hud.gold.textContent=`${Math.floor(player.gold)} GOLD`;if(a04Hud.wave)a04Hud.wave.textContent=`WAVE ${a04Wave} · NEXT ${Math.max(0,Math.ceil(a04NextWave-mt))}s`;if(a04Hud.jungle){a04Hud.jungle.hidden=mt+1e-7>=MATCH.jungleFirstSpawn;a04Hud.jungle.textContent=`JUNGLE: ${Math.max(0,Math.ceil(MATCH.jungleFirstSpawn-mt-1e-7))}s`;}if(a04Hud.pit)a04Hud.pit.textContent=riftVision.visible(a04Pit)?'PITLORD: ALIVE':mt<210&&!a04PitSpawned?`PITLORD: ${Math.ceil(210-mt)}s`:a04PitBuff.blue>mt?'PITLORD: BLUE BUFF':'PITLORD: NO VISION';ui.statusText.textContent=player.deadlineTarget&&t<player.deadlineUntil?'DEADLINE ACTIVE':a04PitBuff.blue>mt?'PITLORD SIEGE BUFF':'ALPHA 0.8.1 MATCH TEST'};

function updateMatchSystems(dt,t){const mt=a04Time(t);if(!a04Ended&&mt>=a04NextWave){a04SpawnWave();a04NextWave+=MATCH.waveInterval}if(!a04PitSpawned&&mt>=210)a04SpawnPit();}
