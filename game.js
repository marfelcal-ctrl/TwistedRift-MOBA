(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=1600,H=900;
const info=document.getElementById('matchInfo'),ann=document.getElementById('announcement'),pitBanner=document.getElementById('pitlordBanner');
const soundBtn=document.getElementById('soundBtn');
let soundOn=true,audioCtx=null;
function tone(freq=120,dur=.12,type='sawtooth',gain=.035){if(!soundOn)return; audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur)}
soundBtn.onclick=()=>{soundOn=!soundOn;soundBtn.textContent=soundOn?'🔊':'🔇'};

const TEAM_A=0,TEAM_B=1;
const teamColor=['#72c5ff','#ff6d78'];
const lanes={
  1:[{x:180,y:720},{x:180,y:570},{x:220,y:390},{x:360,y:210},{x:620,y:150},{x:930,y:150},{x:1220,y:170},{x:1420,y:180}],
  2:[{x:180,y:720},{x:390,y:760},{x:710,y:760},{x:1010,y:720},{x:1240,y:610},{x:1370,y:440},{x:1420,y:180}]
};
function rev(path){return [...path].reverse().map(p=>({...p}))}
const bases=[{x:180,y:720},{x:1420,y:180}];

const state={time:0,lastWave:-999,pitlord:null,pitBuffUntil:[0,0],gameOver:false,messageUntil:0};
const units=[],towers=[],cores=[];
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function announce(text,d=1.5){ann.textContent=text;ann.classList.add('show');state.messageUntil=state.time+d;tone(75,.22,'sawtooth',.045);setTimeout(()=>ann.classList.remove('show'),d*1000)}
function norm(x,y){const m=Math.hypot(x,y)||1;return{x:x/m,y:y/m}}

class Entity{constructor(x,y,team){this.x=x;this.y=y;this.team=team;this.dead=false;this.r=16;this.maxHp=100;this.hp=100;}damage(n,src){if(this.dead)return;this.hp-=n;if(this.hp<=0){this.hp=0;this.die(src)}}die(){this.dead=true}}
class Hero extends Entity{
  constructor(x,y,team,name='RAMZX',player=false){super(x,y,team);this.name=name;this.player=player;this.r=25;this.maxHp=3100;this.hp=this.maxHp;this.atk=132;this.def=28;this.ms=230;this.gold=0;this.xp=0;this.level=1;this.shield=0;this.fury=0;this.targetMark=null;this.cool={s1:0,s2:0,s3:0,ult:0,attack:0};this.botThink=0;this.respawnAt=0;}
  take(raw,type='physical',src=null){if(this.dead)return;let dmg=raw;if(type==='physical')dmg=raw*100/(100+this.def);if(this.shield>0){const s=Math.min(this.shield,dmg);this.shield-=s;dmg-=s;}if(dmg>0)this.damage(dmg,src)}
  die(src){this.dead=true;this.respawnAt=state.time+10; if(src?.team!==undefined&&src.team!==this.team){src.gold=(src.gold||0)+500;announce(this.player?'YOU HAVE FALLEN':'BLOODY MESS',1.1)}}
  respawn(){this.dead=false;this.hp=this.maxHp;this.shield=0;this.x=bases[this.team].x;this.y=bases[this.team].y}
  gainXp(n){this.xp+=n;const req=[0,100,650,1800,3000,4300,5700,7200,8800,10500,12300,14200,16200,18300,20500];while(this.level<15&&this.xp>=req[this.level]){this.level++;this.maxHp+=185;this.hp+=185;this.atk+=7.5;if(this.player)announce('LEVEL '+this.level,.65)}}
  update(dt){for(const k in this.cool)this.cool[k]=Math.max(0,this.cool[k]-dt);if(this.dead){if(state.time>=this.respawnAt)this.respawn();return}if(!this.player)this.botAI(dt)}
  botAI(dt){this.botThink-=dt;if(this.botThink>0)return;this.botThink=.18;const p=player;if(p.dead)return;const d=dist(this,p);if(d<360){if(d>75){const n=norm(p.x-this.x,p.y-this.y);this.x+=n.x*this.ms*.18;this.y+=n.y*this.ms*.18}else if(this.cool.attack<=0){p.take(110,'physical',this);this.cool.attack=.9;tone(155,.05,'square',.02)}}else{const target=bases[TEAM_A];const n=norm(target.x-this.x,target.y-this.y);this.x+=n.x*this.ms*.11;this.y+=n.y*this.ms*.11}}
  basicAttack(){if(this.dead||this.cool.attack>0)return;this.cool.attack=.85;let candidates=[...units.filter(u=>!u.dead&&u.team!==this.team&&dist(this,u)<110),...towers.filter(t=>!t.dead&&t.team!==this.team&&dist(this,t)<125)];if(state.pitlord&&!state.pitlord.dead&&dist(this,state.pitlord)<125)candidates.push(state.pitlord);candidates.sort((a,b)=>dist(this,a)-dist(this,b));const t=candidates[0];if(!t)return;
    if(t instanceof Tower){let dmg=this.atk; if(state.pitBuffUntil[this.team]>state.time)dmg*=1.10;t.hitByHero(dmg,this)}
    else if(t instanceof Pitlord){t.damage(this.atk,this)}
    else if(t instanceof Hero)t.take(this.atk,'physical',this);
    else t.damage(this.atk,this);tone(115,.06,'square',.025)}
  s1(){if(this.cool.s1>0||this.dead)return;this.cool.s1=7;for(const u of units){if(!u.dead&&u.team!==this.team&&dist(this,u)<145){const n=norm(u.x-this.x,u.y-this.y);const dot=n.x*1+n.y*0;if(dot>-2)u instanceof Hero?u.take(220+this.atk*.9,'physical',this):u.damage(220+this.atk*.9,this)}}tone(85,.12,'sawtooth',.04)}
  s2(){if(this.cool.s2>0||this.dead)return;this.cool.s2=12;this.shield+=this.maxHp*.12;tone(210,.15,'triangle',.03)}
  s3(){if(this.cool.s3>0||this.dead)return;this.cool.s3=10;let t=nearestEnemyHero(this,300);if(!t)return;const n=norm(t.x-this.x,t.y-this.y);this.x=t.x-n.x*58;this.y=t.y-n.y*58;let dmg=180+this.atk*.8;if(t.hp/t.maxHp<.4)dmg*=1.3;t.take(dmg,'physical',this);tone(95,.1,'sawtooth',.045)}
  ult(){if(this.level<4||this.cool.ult>0||this.dead)return;let t=nearestEnemyHero(this,450);if(!t)return;this.cool.ult=45;this.targetMark={target:t,until:state.time+6};announce('DEADLINE',.8);setTimeout(()=>{if(!t.dead&&dist(this,t)<500){let dmg=400+this.atk*1.2;t.take(dmg,'physical',this);if(!t.dead&&t.hp/t.maxHp<=.12)t.damage(99999,this);tone(55,.25,'sawtooth',.06)}},450)}
}
function nearestEnemyHero(src,range){return units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==src.team&&dist(src,u)<=range).sort((a,b)=>dist(src,a)-dist(src,b))[0]}

class Minion extends Entity{
  constructor(team,lane,index){const path=team===TEAM_A?lanes[lane]:rev(lanes[lane]);const p=path[0];super(p.x+(Math.random()*12-6),p.y+(Math.random()*12-6),team);this.lane=lane;this.path=path;this.wp=1;this.r=12;this.maxHp=380;this.hp=this.maxHp;this.atk=42;this.ms=74;this.cool=0;this.xpReward=45;this.goldReward=40; if(state.pitBuffUntil[team]>state.time){this.maxHp*=1.15;this.hp=this.maxHp;this.atk*=1.15}}
  update(dt){if(this.dead)return;this.cool-=dt;let enemy=[...units.filter(u=>u!==this&&!u.dead&&u.team!==this.team&&dist(this,u)<70),...towers.filter(t=>!t.dead&&t.team!==this.team&&dist(this,t)<78)];if(enemy.length){enemy.sort((a,b)=>dist(this,a)-dist(this,b));const t=enemy[0];if(this.cool<=0){if(t instanceof Hero)t.take(this.atk,'physical',this);else if(t instanceof Tower)t.hitByMinion(this.atk,this);else t.damage(this.atk,this);this.cool=1.15}return;}const p=this.path[this.wp];if(!p)return;const n=norm(p.x-this.x,p.y-this.y);this.x+=n.x*this.ms*dt;this.y+=n.y*this.ms*dt;if(dist(this,p)<18)this.wp=Math.min(this.path.length-1,this.wp+1)}
  die(src){this.dead=true;if(src instanceof Hero){src.gainXp(this.xpReward);src.gold+=this.goldReward}}
}

class Tower extends Entity{
  constructor(team,lane,slot,x,y,maxHp,dmg,range){super(x,y,team);this.lane=lane;this.slot=slot;this.r=30;this.maxHp=maxHp;this.hp=maxHp;this.baseDmg=dmg;this.range=range;this.cool=0;this.fury=new Map();this.repairUntil=0;}
  enemyMinionInRange(attackingTeam){return units.some(u=>u instanceof Minion&&!u.dead&&u.team===attackingTeam&&dist(this,u)<this.range)}
  backdoorAgainst(attackerTeam){return !this.enemyMinionInRange(attackerTeam)}
  hitByHero(raw,hero){const back=this.backdoorAgainst(hero.team);const dmg=raw*(back?.05:1);this.damage(dmg,hero);if(back)this.repairUntil=state.time+2}
  hitByMinion(raw,min){this.damage(raw,min)}
  update(dt){if(this.dead)return;this.cool-=dt;if(this.repairUntil>state.time){this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.015*dt)}
    let enemies=units.filter(u=>!u.dead&&u.team!==this.team&&dist(this,u)<this.range);if(!enemies.length)return;enemies.sort((a,b)=>(a instanceof Minion?-1:0)-(b instanceof Minion?-1:0)||dist(this,a)-dist(this,b));const target=enemies[0];if(this.cool<=0){let mult=1;const back=this.backdoorAgainst(target.team);if(back&&target instanceof Hero){mult=this.fury.get(target)||1;this.fury.set(target,Math.min(10,mult*2));}else this.fury.clear();const dmg=this.baseDmg*mult;if(target instanceof Hero)target.take(dmg,'physical',this);else target.damage(dmg,this);this.cool=1;tone(back?60:90,.07,'square',.025)}}
  die(src){this.dead=true;announce(src?.team===this.team?'TOWER DENIED':'FORTRESS CRUMBLES',1);if(src instanceof Hero&&src.team!==this.team)src.gold+=350}
}
class Core extends Entity{constructor(team,x,y){super(x,y,team);this.r=45;this.maxHp=18000;this.hp=this.maxHp;}isVulnerable(){return towers.filter(t=>t.team===this.team&&!t.dead).length===0}}
class Pitlord extends Entity{constructor(){super(800,450,2);this.r=55;this.maxHp=9000;this.hp=this.maxHp;this.atk=150;this.cool=0;this.dead=false}update(dt){if(this.dead)return;this.cool-=dt;const nearby=units.filter(u=>u instanceof Hero&&!u.dead&&dist(this,u)<140);if(nearby.length&&this.cool<=0){nearby[0].take(this.atk,'physical',this);this.cool=1.2}}die(src){this.dead=true;if(src?.team===0||src?.team===1){state.pitBuffUntil[src.team]=state.time+90;src.gold+=300;src.gainXp(250);announce('THE RIFT BOWS TO YOUR WILL',1.8)}}}

function placeStructures(){
  // Four towers per lane, per team. Positions intentionally prototype-only.
  const hp=[6000,7500,9500,11000],dmg=[240,290,350,420],rng=[145,150,158,165];
  for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2]){
    const path=team===TEAM_A?lanes[lane]:rev(lanes[lane]); const slots=[.26,.48,.72,.86];
    for(let i=0;i<4;i++){const idx=Math.min(path.length-1,Math.floor((path.length-1)*slots[i]));const p=path[idx];towers.push(new Tower(team,lane,i+1,p.x,p.y,hp[i],dmg[i],rng[i]))}
  }
  cores.push(new Core(TEAM_A,bases[0].x,bases[0].y),new Core(TEAM_B,bases[1].x,bases[1].y));
}
placeStructures();
const player=new Hero(240,700,TEAM_A,'RAMZX',true);units.push(player);
const enemy=new Hero(1280,230,TEAM_B,'NYRA',false);enemy.maxHp=2450;enemy.hp=2450;enemy.atk=126;enemy.ms=250;units.push(enemy);

function spawnWave(){for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2])for(let i=0;i<4;i++){const m=new Minion(team,lane,i);m.x+=(i-1.5)*7;m.y+=(i-1.5)*7;units.push(m)}tone(190,.05,'triangle',.015)}

const keys=new Set();addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key===' ')e.preventDefault();const k=e.key.toLowerCase();if(k==='j'||e.key===' ')player.basicAttack();if(k==='q')player.s1();if(k==='w')player.s2();if(k==='e')player.s3();if(k==='r')player.ult();if(k==='f')tryDeny();if(k==='p'&&!state.pitlord)spawnPitlord(true)});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function tryDeny(){if(player.dead)return;const own=towers.filter(t=>!t.dead&&t.team===player.team&&t.hp/t.maxHp<=.10&&dist(player,t)<130&&!t.backdoorAgainst(1-player.team)).sort((a,b)=>dist(player,a)-dist(player,b))[0];if(own){own.die(player);announce('DENIED! NOT A COIN FOR THEM.',1.5)}}

const joy=document.getElementById('joystick'),stick=document.getElementById('stick');let joyId=null,joyVec={x:0,y:0};
function joyMove(e){const r=joy.getBoundingClientRect(),t=[...e.touches].find(t=>t.identifier===joyId)||e.changedTouches?.[0];if(!t)return;let dx=t.clientX-(r.left+r.width/2),dy=t.clientY-(r.top+r.height/2);const lim=r.width*.34,m=Math.hypot(dx,dy)||1;if(m>lim){dx=dx/m*lim;dy=dy/m*lim}stick.style.transform=`translate(${dx}px,${dy}px)`;joyVec={x:dx/lim,y:dy/lim}}
joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e)},{passive:false});joy.addEventListener('touchmove',e=>{e.preventDefault();joyMove(e)},{passive:false});joy.addEventListener('touchend',e=>{joyId=null;joyVec={x:0,y:0};stick.style.transform=''},{passive:false});
document.querySelectorAll('.skill').forEach(b=>b.addEventListener('pointerdown',()=>{const a=b.dataset.action;if(a==='attack')player.basicAttack();if(a==='s1')player.s1();if(a==='s2')player.s2();if(a==='s3')player.s3();if(a==='ult')player.ult();if(a==='deny')tryDeny()}));

function spawnPitlord(debug=false){state.pitlord=new Pitlord();announce(debug?'PITLORD SUMMONED':'THE RIFT TREMBLES… PITLORD HAS AWAKENED!',1.8)}
function updatePlayer(dt){if(player.dead)return;let x=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joyVec.x,y=(keys.has('s')?1:0)-(keys.has('w')?1:0)+joyVec.y;if(x||y){const n=norm(x,y);player.x=clamp(player.x+n.x*player.ms*dt,35,W-35);player.y=clamp(player.y+n.y*player.ms*dt,35,H-35)}}
function update(dt){if(state.gameOver)return;state.time+=dt;if(state.lastWave<0&&state.time>=.5){spawnWave();state.lastWave=.5}else if(state.time-state.lastWave>=20){spawnWave();state.lastWave+=20}if(!state.pitlord&&state.time>=210)spawnPitlord();
 updatePlayer(dt); for(const u of units)u.update?.(dt);for(const t of towers)t.update(dt);state.pitlord?.update(dt);
 units.splice(0,units.length,...units.filter(u=>!u.dead||u instanceof Hero));
 const mins=Math.floor(state.time/60),secs=Math.floor(state.time%60);info.textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} · EXP · Lv ${player.level} · ${Math.floor(player.gold)}g`;
 const remain=Math.max(0,210-state.time);pitBanner.textContent=state.pitlord?(state.pitlord.dead?'PITLORD: DEFEATED':`PITLORD: ${Math.ceil(state.pitlord.hp)} HP`):`PITLORD: DORMANT · ${Math.floor(remain/60)}:${String(Math.ceil(remain%60)).padStart(2,'0')}`;
 for(const b of document.querySelectorAll('.skill[data-action]')){const a=b.dataset.action,cd=a==='attack'?player.cool.attack:(a==='deny'?0:player.cool[a]);b.classList.toggle('cooling',cd>0);b.dataset.cd=cd>0?Math.ceil(cd):''}
}

function drawMap(){ctx.fillStyle='#17161c';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#29272f';ctx.lineWidth=2;for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 // water / Rift
 ctx.fillStyle='#17252d';ctx.beginPath();ctx.ellipse(800,450,270,145,-.28,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6b3980';ctx.lineWidth=8;ctx.setLineDash([18,14]);ctx.beginPath();ctx.moveTo(300,680);ctx.lineTo(1300,220);ctx.stroke();ctx.setLineDash([]);
 for(const [id,path] of Object.entries(lanes)){ctx.strokeStyle=id==='1'?'#6f596f':'#665d52';ctx.lineWidth=54;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();ctx.strokeStyle='#3b3440';ctx.lineWidth=3;ctx.stroke()}
 ctx.font='700 22px system-ui';ctx.fillStyle='#a997ae';ctx.fillText('LANE 1',420,120);ctx.fillText('LANE 2',760,820);ctx.fillStyle='#a76fbd';ctx.fillText('THE RIFT',742,455);
}
function hpbar(e,w=56){const x=e.x-w/2,y=e.y-e.r-15;ctx.fillStyle='#000a';ctx.fillRect(x,y,w,7);ctx.fillStyle=e.team===TEAM_A?'#70c8ff':e.team===TEAM_B?'#ff6671':'#b677ca';ctx.fillRect(x,y,w*Math.max(0,e.hp/e.maxHp),7);if(e.shield){ctx.fillStyle='#e5c8ff';ctx.fillRect(x,y-4,w*Math.min(1,e.shield/e.maxHp),3)}}
function draw(){drawMap();
 for(const c of cores){ctx.beginPath();ctx.fillStyle=c.team===0?'#23475d':'#5d242c';ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d6c5df';ctx.lineWidth=4;ctx.stroke();hpbar(c,90)}
 for(const t of towers){if(t.dead)continue;const back=t.backdoorAgainst(1-t.team);ctx.save();ctx.translate(t.x,t.y);ctx.fillStyle=t.team===0?'#315f78':'#78313a';ctx.fillRect(-20,-30,40,60);ctx.fillStyle='#b9a3c1';ctx.fillRect(-12,-42,24,18);if(back){ctx.strokeStyle='#a864bd';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2);ctx.stroke()}ctx.restore();hpbar(t,72)}
 if(state.pitlord&&!state.pitlord.dead){const p=state.pitlord;ctx.beginPath();ctx.fillStyle='#6b2f7f';ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e2c4ed';ctx.font='900 20px system-ui';ctx.textAlign='center';ctx.fillText('PITLORD',p.x,p.y+6);ctx.textAlign='left';hpbar(p,120)}
 for(const u of units){if(u.dead)continue;if(u instanceof Minion){ctx.beginPath();ctx.fillStyle=teamColor[u.team];ctx.arc(u.x,u.y,u.r,0,Math.PI*2);ctx.fill();hpbar(u,28)}else if(u instanceof Hero){ctx.beginPath();ctx.fillStyle=u.team===0?'#83d1ff':'#ff7881';ctx.arc(u.x,u.y,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f8efff';ctx.lineWidth=u.player?4:2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(u.name,u.x,u.y+4);ctx.textAlign='left';hpbar(u,70)}}
 // player skill range cue
 if(player.targetMark&&player.targetMark.until>state.time&&!player.targetMark.target.dead){ctx.strokeStyle='#bd3e54';ctx.lineWidth=4;ctx.beginPath();ctx.arc(player.targetMark.target.x,player.targetMark.target.y,38,0,Math.PI*2);ctx.stroke()}
}
let last=performance.now();function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}
announce('WELCOME TO TWISTED RIFT! YOUR JOURNEY BEGINS!',2.2);requestAnimationFrame(loop);
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
