(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');
const fogCanvas = document.createElement('canvas'); fogCanvas.width=1280; fogCanvas.height=720;
const fctx = fogCanvas.getContext('2d');
const info = document.getElementById('matchInfo');
const ann = document.getElementById('announcement');
const pitBanner = document.getElementById('pitlordBanner');
const soundBtn = document.getElementById('soundBtn');
const levelBtn = document.getElementById('levelBtn');
const pitBtn = document.getElementById('pitBtn');
const buffBar = document.getElementById('buffBar');
const hpText = document.getElementById('hpText');
const hpFill = document.getElementById('hpFill');
const shieldFill = document.getElementById('shieldFill');

const VIEW_W = 1280, VIEW_H = 720;
const WORLD_W = 9600, WORLD_H = 9600;
const TEAM_A = 0, TEAM_B = 1, NEUTRAL = 2;
const TEAM_COLORS = ['#67caff', '#ff6976'];

// v0.5 source of truth: a large SQUARE battlefield with diagonal bases,
// two perimeter lanes, a broad upper-left -> lower-right river, and Pitlord at center.
const BASES = [{x:900,y:8700},{x:8700,y:900}];
const SPAWNS = [{x:340,y:9260},{x:9260,y:340}];
const PIT_POS = {x:4800,y:4800};

// Lane 1 wraps Blue base -> left edge -> top edge -> Red base.
const lane1 = [
  {x:900,y:8700},{x:760,y:8150},{x:680,y:7000},{x:620,y:5700},{x:620,y:4300},
  {x:700,y:3000},{x:980,y:1900},{x:1650,y:1050},{x:2850,y:700},{x:4300,y:610},
  {x:5850,y:600},{x:7250,y:650},{x:8150,y:740},{x:8700,y:900}
];
// Lane 2 wraps Blue base -> bottom edge -> right edge -> Red base.
const lane2 = [
  {x:900,y:8700},{x:1650,y:8850},{x:3000,y:8970},{x:4550,y:9000},{x:6100,y:8940},
  {x:7400,y:8650},{x:8300,y:8050},{x:8870,y:7050},{x:9000,y:5750},{x:9000,y:4300},
  {x:8970,y:2850},{x:8870,y:1750},{x:8700,y:900}
];
const LANES = {1: lane1, 2: lane2};
const revPath = p => [...p].reverse().map(v => ({...v}));

// A broad river cuts diagonally through the inner jungle.
const waterZones = [
  {x:1500,y:1500,rx:900,ry:330,rot:.78},{x:2750,y:2750,rx:980,ry:350,rot:.78},
  {x:4000,y:4000,rx:980,ry:355,rot:.78},{x:5200,y:5200,rx:980,ry:355,rot:.78},
  {x:6450,y:6450,rx:980,ry:350,rot:.78},{x:7750,y:7750,rx:950,ry:330,rot:.78}
];
const bridgeZones = [
  {x:2250,y:2250,w:420,h:150,rot:-.79},
  {x:7250,y:7250,w:420,h:150,rot:-.79}
];

// Prototype jungle walls: black stone / dense terrain silhouettes based on the user's sketch.
const jungleWalls = [
  {x:2100,y:1800,w:820,h:260,rot:.10},{x:3300,y:1350,w:900,h:250,rot:-.08},
  {x:4700,y:1450,w:760,h:250,rot:.05},{x:6200,y:1550,w:900,h:260,rot:-.10},
  {x:7700,y:2150,w:820,h:260,rot:.28},{x:7900,y:3400,w:760,h:260,rot:-.22},
  {x:7200,y:4700,w:900,h:280,rot:.15},{x:6900,y:5900,w:760,h:260,rot:-.18},
  {x:5900,y:7200,w:900,h:270,rot:.08},{x:4400,y:7600,w:850,h:260,rot:-.08},
  {x:3000,y:7450,w:900,h:260,rot:.10},{x:1850,y:6750,w:760,h:250,rot:-.28},
  {x:1500,y:5400,w:760,h:260,rot:.18},{x:1600,y:3950,w:820,h:270,rot:-.10},
  {x:3050,y:4050,w:720,h:240,rot:.55},{x:4200,y:3000,w:720,h:240,rot:-.35},
  {x:5550,y:3600,w:720,h:240,rot:.40},{x:5200,y:6300,w:760,h:250,rot:-.45}
];
const state = {
  time: 0,
  lastWave: -999,
  pitlord: null,
  pitBuffUntil: [0,0],
  gameOver: false,
  camera: {x:0,y:0},
  cameraManual: false, cameraManualUntil: 0,
  effects: [],
  floating: [],
  screenShake: 0,
  matchStartAnnounced: false,
  teamKills: [0,0],
  firstBlood: false,
  pitRespawnAt: 0,
  pitKills: [0,0],
  economyAnnounced: false,
  resultsShown: false
};

let soundOn = true, audioCtx = null;
function tone(freq=120,dur=.10,type='sawtooth',gain=.025){
  if(!soundOn) return;
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=gain;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);
    o.stop(audioCtx.currentTime+dur);
  }catch{}
}
soundBtn.onclick=()=>{soundOn=!soundOn;soundBtn.textContent=soundOn?'🔊':'🔇'};

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function norm(x,y){ const m=Math.hypot(x,y)||1; return {x:x/m,y:y/m}; }
function lerp(a,b,t){ return a+(b-a)*t; }
function angleDiff(a,b){ let d=(a-b+Math.PI)%(Math.PI*2)-Math.PI; if(d<-Math.PI)d+=Math.PI*2; return d; }
function screenPos(x,y){ return {x:x-state.camera.x,y:y-state.camera.y}; }
function pointInRotEllipse(px,py,z){
  const c=Math.cos(-z.rot), s=Math.sin(-z.rot), dx=px-z.x, dy=py-z.y;
  const x=dx*c-dy*s, y=dx*s+dy*c;
  return (x*x)/(z.rx*z.rx)+(y*y)/(z.ry*z.ry)<=1;
}
function pointInRotRect(px,py,z){
  const c=Math.cos(-z.rot), s=Math.sin(-z.rot), dx=px-z.x, dy=py-z.y;
  const x=dx*c-dy*s, y=dx*s+dy*c;
  return Math.abs(x)<=z.w/2 && Math.abs(y)<=z.h/2;
}
function isInWater(x,y){
  if(bridgeZones.some(z=>pointInRotRect(x,y,z))) return false;
  return waterZones.some(z=>pointInRotEllipse(x,y,z));
}
function isBlocked(x,y){
  if(x<90||y<90||x>WORLD_W-90||y>WORLD_H-90)return true;
  return jungleWalls.some(z=>pointInRotRect(x,y,z));
}
function teamVisionSources(team){
  const src=[];
  for(const u of units){
    if(u.dead||u.team!==team)continue;
    if(u instanceof Hero)src.push({x:u.x,y:u.y,r:760});
    else if(u instanceof Minion)src.push({x:u.x,y:u.y,r:470});
  }
  for(const t of towers)if(!t.dead&&t.team===team)src.push({x:t.x,y:t.y,r:700});
  const c=cores.find(c=>c.team===team&&!c.dead);if(c)src.push({x:c.x,y:c.y,r:760});
  return src;
}
function hasVisionAt(x,y,team=TEAM_A){
  return teamVisionSources(team).some(v=>Math.hypot(v.x-x,v.y-y)<=v.r);
}
function visibleToPlayer(e){
  if(!e||e.dead)return false;
  if(e.team===TEAM_A)return true;
  if(e instanceof Tower||e instanceof Core)return true; // structures/HP stay known as requested
  return hasVisionAt(e.x,e.y,TEAM_A);
}
function pointAlongPath(path, t){
  const seg=[]; let total=0;
  for(let i=0;i<path.length-1;i++){const d=dist(path[i],path[i+1]);seg.push(d);total+=d;}
  let target=total*t;
  for(let i=0;i<seg.length;i++){
    if(target<=seg[i]){const q=target/seg[i];return {x:lerp(path[i].x,path[i+1].x,q),y:lerp(path[i].y,path[i+1].y,q)};}
    target-=seg[i];
  }
  return {...path[path.length-1]};
}
function announce(text,d=1.3){
  ann.textContent=text;ann.classList.add('show');
  tone(72,.22,'sawtooth',.038);
  clearTimeout(announce._t);
  announce._t=setTimeout(()=>ann.classList.remove('show'),d*1000);
}
function floatText(x,y,text,color='#fff',size=16){ state.floating.push({x,y,text,color,size,life:1.0}); }
function addEffect(type,x,y,opts={}){ state.effects.push({type,x,y,life:opts.life||.5,max:opts.life||.5,...opts}); }

const units=[], towers=[], cores=[], camps=[];

function earlyEconomy(){ return state.time < 300; }
function isRoamerRole(h){ return h && (h.role==='ROAMER'||h.role==='SUPPORT'); }
function isLaneFarmer(h){ return h && (h.role==='EXP'||h.role==='GOLD'||h.role==='TACTICAL'); }
function canHeroDamageMinion(h){ return !earlyEconomy() || h.role!=='JUNGLE'; }
function canHeroDamageJungle(h){ return !earlyEconomy() || h.role==='JUNGLE'; }
function killXpForParticipants(n){ return ({1:140,2:115,3:100,4:95,5:90})[Math.max(1,Math.min(5,n))]||90; }

function damageTargetByHero(hero,target,dmg,type='physical'){
  if(!target||target.dead)return false;
  if(target instanceof Minion){
    if(!canHeroDamageMinion(hero)){ if(hero.player)floatText(hero.x,hero.y-55,'JUNGLER: NO LANE FARM','#d8b45e',13); return false; }
    target.hitByHero(dmg,hero); return true;
  }
  if(target instanceof JungleCreep){
    if(!canHeroDamageJungle(hero)){ if(hero.player)floatText(hero.x,hero.y-55,'JUNGLE PROTECTED UNTIL 5:00','#d8b45e',12); return false; }
    target.hit(dmg,hero); return true;
  }
  if(target instanceof Pitlord){ target.hit(dmg,hero); return true; }
  if(target instanceof Hero){ target.take(dmg,type,hero); return true; }
  if(target instanceof Tower){ if(state.pitBuffUntil[hero.team]>state.time)dmg*=1.10; target.hitByHero(dmg,hero); return true; }
  if(target instanceof Core){ if(state.pitBuffUntil[hero.team]>state.time)dmg*=1.10; target.hitByHero(dmg,hero); return true; }
  target.damage(dmg,hero); return true;
}

class Entity{
  constructor(x,y,team){this.x=x;this.y=y;this.team=team;this.dead=false;this.r=16;this.maxHp=100;this.hp=100;this.damageLog=new Map();}
  damage(n,src){
    if(this.dead)return;
    if(this instanceof Hero && src instanceof Hero && src.team!==this.team)this.damageLog.set(src,state.time);
    this.hp-=n;if(n>0)floatText(this.x,this.y-this.r,`-${Math.round(n)}`,'#ffd6d6',14);if(this.hp<=0){this.hp=0;this.die(src)}
  }
  die(){this.dead=true}
}

class Hero extends Entity{
  constructor(x,y,team,name='RAMZX',player=false,role='EXP'){
    super(x,y,team);this.name=name;this.player=player;this.role=role;this.r=26;
    this.maxHp=player?3100:2600;this.hp=this.maxHp;this.atk=player?132:118;this.def=player?28:24;
    this.ms=player?305:295;this.gold=0;this.xp=0;this.level=1;this.shield=0;this.facing=team===TEAM_A?-0.45:2.7;
    this.cool={s1:0,s2:0,s3:0,ult:0,attack:0};this.respawnAt=0;this.botThink=0;this.pathWp=1;
    this.lane = role==='GOLD'?2:1;this.targetMark=null;this.crimsonUntil=0;this.azureUntil=0;
    this.aiMode='lane';this.aiCampIndex=0;this.aiTargetCamp=null;this.aiRetreat=false;
    this.kills=0;this.deaths=0;this.assists=0;this.heroDamage=0;this.towerDamage=0;this.damageTaken=0;this.pitlordParticipation=0;
    this.killStreak=0;this.rapidKills=0;this.lastKillAt=-999;this.lastCombatAt=-999;
  }
  take(raw,type='physical',src=null){
    if(this.dead)return;
    let dmg=raw;
    if(type==='physical') dmg=raw*100/(100+this.def);
    if(src instanceof Hero&&src.team!==this.team){src.heroDamage+=Math.max(0,dmg);src.lastCombatAt=state.time;this.lastCombatAt=state.time;}
    this.damageTaken+=Math.max(0,dmg);
    if(this.shield>0){const used=Math.min(this.shield,dmg);this.shield-=used;dmg-=used;}
    if(dmg>0)this.damage(dmg,src);
  }
  die(src){
    const victimStreak=this.killStreak;this.dead=true;this.deaths++;this.killStreak=0;
    const late=Math.min(18,state.time/60*1.6), levelPart=Math.min(24,this.level*1.75);
    this.respawnAt=state.time+Math.min(50,6+late+levelPart);
    addEffect('burst',this.x,this.y,{life:.7,color:'#6f516f',radius:72});
    let killer=(src instanceof Hero&&src.team!==this.team)?src:null;
    if(!killer){
      const recent=[...this.damageLog.entries()].filter(([h,t])=>h instanceof Hero&&h.team!==this.team&&state.time-t<=8).sort((a,b)=>b[1]-a[1]);
      killer=recent[0]?.[0]||null;
    }
    if(killer){
      const team=killer.team;
      const participants=units.filter(h=>h instanceof Hero&&!h.dead&&h.team===team&&(h===killer||(this.damageLog.get(h)??-999)>=state.time-8||dist(h,this)<=420));
      if(!participants.includes(killer))participants.push(killer);
      const xpEach=killXpForParticipants(participants.length);
      killer.kills++;killer.killStreak++;state.teamKills[team]++;killer.gold+=500;
      if(state.time-killer.lastKillAt<=8)killer.rapidKills++;else killer.rapidKills=1;killer.lastKillAt=state.time;
      for(const h of participants){h.gainXp(xpEach);if(h!==killer){h.assists++;h.gold+=earlyEconomy()&&isRoamerRole(h)?250:150;}}
      if(!state.firstBlood){state.firstBlood=true;announce('HA HA HA... BLOODY MESS.',1.5);}
      else if(victimStreak>=3)announce('CROWN CLEAVED',1.15);
      else if(this.player)announce('YOU HAVE FALLEN',1.0);
      else{
        const multi={2:'TWIN BLADES',3:'EXECUTIONER',4:'WARLORD',5:'SOVEREIGN OF BLOOD'}[killer.rapidKills];
        const streak={3:'SLAYER',5:'DREAD KNIGHT',7:'MYTHIC MENACE',10:'IMMORTAL TITAN',15:'BLACK SOVEREIGN',20:'DEATHLESS'}[killer.killStreak];
        announce(multi||streak||'ENEMY SLAIN',1.0);
      }
    }
    this.damageLog.clear();
  }

  respawn(){this.dead=false;this.hp=this.maxHp;this.shield=0;this.x=SPAWNS[this.team].x;this.y=SPAWNS[this.team].y;this.pathWp=1;this.damageLog.clear();if(this.player)announce('YOU HAVE RETURNED',.8);}
  gainXp(n){
    this.xp+=n;
    const req=[0,100,650,1800,3000,4300,5700,7200,8800,10500,12300,14200,16200,18300,20500];
    while(this.level<15&&this.xp>=req[this.level]){
      this.level++;this.maxHp+=this.player?185:145;this.hp+=this.player?185:145;this.atk+=this.player?7.5:6;
      if(this.player){announce(`LEVEL ${this.level}`,.6);addEffect('ring',this.x,this.y,{life:.65,color:'#d9b6ef',radius:90});}
    }
  }
  forceLevel4(){this.xp=1800;while(this.level<4){this.level++;this.maxHp+=185;this.hp+=185;this.atk+=7.5;}announce('ULTIMATE READY',.8)}
  speed(){const pit=state.pitBuffUntil[this.team]>state.time&&state.time-this.lastCombatAt>3?1.05:1;return this.ms*(isInWater(this.x,this.y)?.90:1)*pit;}
  update(dt){
    for(const k in this.cool)this.cool[k]=Math.max(0,this.cool[k]-dt*(this.azureUntil>state.time?1.20:1));
    if(this.dead){if(state.time>=this.respawnAt)this.respawn();return;}
    // Fountain is behind the Core: rapid healing and safe regrouping.
    if(dist(this,SPAWNS[this.team])<260)this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.10*dt);
    // Roamer/Support early economy: 10 gold/sec + roaming XP. Jungle companion XP is added on camp kills.
    if(earlyEconomy()&&isRoamerRole(this)){this.gold+=10*dt;this.gainXp(7*dt);}
    if(!this.player)this.botAI(dt);
  }
  selectTarget(range=180,heroFirst=true){
    let candidates=[];
    const enemyHeroes=units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==this.team&&dist(this,u)<=range);
    const enemyMinions=canHeroDamageMinion(this)?units.filter(u=>u instanceof Minion&&!u.dead&&u.team!==this.team&&dist(this,u)<=range):[];
    const jungle=canHeroDamageJungle(this)?units.filter(u=>u instanceof JungleCreep&&!u.dead&&dist(this,u)<=range):[];
    const structs=[...towers.filter(t=>!t.dead&&t.team!==this.team&&dist(this,t)<=range),...cores.filter(c=>!c.dead&&c.team!==this.team&&c.vulnerable()&&dist(this,c)<=range)];
    if(heroFirst)candidates=[...enemyHeroes,...enemyMinions,...jungle,...structs]; else candidates=[...enemyMinions,...enemyHeroes,...jungle,...structs];
    if(state.pitlord&&!state.pitlord.dead&&dist(this,state.pitlord)<=range)candidates.push(state.pitlord);
    return candidates.sort((a,b)=>dist(this,a)-dist(this,b))[0]||null;
  }
  basicAttack(){
    if(this.dead||this.cool.attack>0)return false;
    const t=this.selectTarget(this.player?185:170,true);if(!t){addEffect('miss',this.x+Math.cos(this.facing)*70,this.y+Math.sin(this.facing)*70,{life:.2});return false;}
    this.cool.attack=.82;
    this.facing=Math.atan2(t.y-this.y,t.x-this.x);
    let dmg=this.atk*(this.crimsonUntil>state.time?1.15:1);
    addEffect('slash',this.x,this.y,{life:.18,angle:this.facing,color:this.team===TEAM_A?'#bcecff':'#ffb6be',radius:85});
    damageTargetByHero(this,t,dmg,'physical');
    tone(118,.055,'square',.02);return true;
  }
  s1(){
    if(this.cool.s1>0||this.dead)return;
    this.cool.s1=7;const range=220,half=0.82;let hits=0;
    addEffect('cone',this.x,this.y,{life:.28,angle:this.facing,color:'#c85562',radius:range});
    const targets=[...units.filter(u=>!u.dead&&u.team!==this.team),...(state.pitlord&&!state.pitlord.dead?[state.pitlord]:[])];
    for(const u of targets){
      const d=dist(this,u);if(d>range+u.r)continue;
      const a=Math.atan2(u.y-this.y,u.x-this.x);if(Math.abs(angleDiff(a,this.facing))>half)continue;
      const dmg=220+this.atk*.9;
      if(damageTargetByHero(this,u,dmg,'physical'))hits++;
    }
    if(hits)state.screenShake=.10;tone(86,.12,'sawtooth',.04);
  }
  s2(){
    if(this.cool.s2>0||this.dead)return;
    this.cool.s2=12;const shield=this.maxHp*.12;this.shield=Math.min(this.maxHp*.25,this.shield+shield);
    for(const a of units){if(a instanceof Hero&&!a.dead&&a.team===this.team&&a!==this&&dist(this,a)<180)a.shield=Math.min(a.maxHp*.15,a.shield+a.maxHp*.05);}
    addEffect('ring',this.x,this.y,{life:.55,color:'#d5b6ee',radius:120});tone(210,.16,'triangle',.028);
  }
  s3(){
    if(this.cool.s3>0||this.dead)return;
    this.cool.s3=10;const start={x:this.x,y:this.y};const dash=230;
    {const nx=clamp(this.x+Math.cos(this.facing)*dash,45,WORLD_W-45),ny=clamp(this.y+Math.sin(this.facing)*dash,45,WORLD_H-45);if(!isBlocked(nx,ny)){this.x=nx;this.y=ny;}}
    addEffect('dash',start.x,start.y,{life:.35,x2:this.x,y2:this.y,color:'#bc6073'});
    let t=null,best=9999;
    for(const u of units){if(u.dead||u.team===this.team||u===this)continue;const d=dist(this,u);if(d<95&&d<best){best=d;t=u;}}
    if(t){let dmg=180+this.atk*.8;if(t instanceof Hero&&t.hp/t.maxHp<.4)dmg*=1.3;damageTargetByHero(this,t,dmg,'physical');}
    state.screenShake=.08;tone(96,.10,'sawtooth',.04);
  }
  ult(){
    if(this.level<4||this.cool.ult>0||this.dead){if(this.level<4&&this.player)floatText(this.x,this.y-50,'ULTIMATE LOCKED','#dcb8e7',16);return;}
    const targets=units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==this.team&&dist(this,u)<=600).sort((a,b)=>dist(this,a)-dist(this,b));
    const t=targets[0];if(!t){floatText(this.x,this.y-50,'NO HERO IN RANGE','#dcb8e7',14);return;}
    this.cool.ult=45;this.targetMark={target:t,until:state.time+6};if(this.player)announce('DEADLINE',.75);addEffect('mark',t.x,t.y,{life:1.0,color:'#ca3f52',radius:74});
    setTimeout(()=>{
      if(this.dead||t.dead)return;
      const d=dist(this,t);if(d>650)return;
      const old={x:this.x,y:this.y};const n=norm(t.x-this.x,t.y-this.y);this.x=t.x-n.x*70;this.y=t.y-n.y*70;
      addEffect('dash',old.x,old.y,{life:.28,x2:this.x,y2:this.y,color:'#d24c5e'});
      let dmg=400+this.atk*1.2;t.take(dmg,'physical',this);
      if(!t.dead&&t.hp/t.maxHp<=.12)t.damage(99999,this);
      addEffect('burst',t.x,t.y,{life:.48,color:'#d23d50',radius:125});state.screenShake=.18;tone(54,.24,'sawtooth',.055);
    },420);
  }
  moveTowardPoint(p,stepScale=.10){
    const base=Math.atan2(p.y-this.y,p.x-this.x),step=this.speed()*stepScale;
    for(const off of [0,.38,-.38,.75,-.75,1.12,-1.12,Math.PI]){
      const a=base+off,nx=clamp(this.x+Math.cos(a)*step,45,WORLD_W-45),ny=clamp(this.y+Math.sin(a)*step,45,WORLD_H-45);
      if(!isBlocked(nx,ny)){this.facing=a;this.x=nx;this.y=ny;return true;}
    }
    return false;
  }
  botAI(dt){
    this.botThink-=dt;if(this.botThink>0)return;this.botThink=.12;
    // Retreat when critically low; fountain heals quickly.
    if(this.hp/this.maxHp<.24||this.aiRetreat){
      this.aiRetreat=this.hp/this.maxHp<.72&&dist(this,SPAWNS[this.team])>250;
      const p=SPAWNS[this.team];this.moveTowardPoint(p,.12);return;
    }
    // Do not suicide into a protected enemy tower without an allied wave.
    const dangerTower=towers.find(t=>!t.dead&&t.team!==this.team&&dist(this,t)<t.range+40&&t.backdoorAgainst(this.team));
    if(dangerTower){this.moveTowardPoint({x:this.x+(this.x-dangerTower.x),y:this.y+(this.y-dangerTower.y)},.13);return;}
    if(['EXP','GOLD','TACTICAL','SUPPORT'].includes(this.role)){
      if(this.role==='SUPPORT'&&earlyEconomy())this.lane=2;
      if(this.role==='TACTICAL')this.lane=(Math.floor(state.time/70)%2)+1;
      const lp=this.team===TEAM_A?LANES[this.lane]:revPath(LANES[this.lane]);
      const nearest=lp.reduce((best,q)=>dist(this,q)<dist(this,best)?q:best,lp[0]);
      if(dist(this,nearest)>620){this.moveTowardPoint(nearest,.12);return;}
    }
    const close=this.selectTarget(235,true);
    if(close){
      const d=dist(this,close);if(d>150){this.moveTowardPoint(close,.12);}
      else this.basicAttack();
      if(close instanceof Hero&&this.cool.s1<=0&&Math.random()<.08)this.s1();
      if(close instanceof Hero&&d>120&&d<260&&this.cool.s3<=0&&Math.random()<.025)this.s3();
      if(close instanceof Hero&&this.level>=4&&this.cool.ult<=0&&Math.random()<.015)this.ult();
      return;
    }
    // Junglers clear their own jungle first. After Pitlord spawns, the Jungler/Roamer may rotate to it.
    if(this.role==='JUNGLE'){
      if(state.pitlord&&!state.pitlord.dead&&this.level>=4&&state.time>=210&&Math.random()<.25){
        this.moveTowardPoint(state.pitlord,.10);return;
      }
      let live=camps.filter(c=>c.owner===this.team).flatMap(c=>c.creeps).filter(x=>!x.dead).sort((a,b)=>dist(this,a)-dist(this,b))[0];
      if(!live)live=camps.flatMap(c=>c.creeps).filter(x=>!x.dead).sort((a,b)=>dist(this,a)-dist(this,b))[0];
      if(live){const d=dist(this,live);if(d>150)this.moveTowardPoint(live,.10);else this.basicAttack();return;}
    }
    // Tank/Support follows the Jungler during the role-economy phase, then rotates to the nearest ally/fight.
    if(this.role==='ROAMER'&&earlyEconomy()){
      const j=units.find(h=>h instanceof Hero&&!h.dead&&h.team===this.team&&h.role==='JUNGLE');
      if(j&&dist(this,j)>150){this.moveTowardPoint(j,.10);return;}
    }
    if(this.role==='SUPPORT'&&earlyEconomy())this.lane=2;
    // Tactical Mage is flexible; it alternates assistance lanes every ~70 seconds.
    if(this.role==='TACTICAL')this.lane=(Math.floor(state.time/70)%2)+1;
    const path=this.team===TEAM_A?LANES[this.lane]:revPath(LANES[this.lane]);
    const p=path[this.pathWp]||path[path.length-1];this.moveTowardPoint(p,.11);if(dist(this,p)<75)this.pathWp=Math.min(path.length-1,this.pathWp+1);
  }
}

class Minion extends Entity{
  constructor(team,lane,index){
    const path=team===TEAM_A?LANES[lane]:revPath(LANES[lane]), p=path[0];
    super(p.x+(index-1.5)*18,p.y+(index-1.5)*10,team);this.lane=lane;this.path=path;this.wp=1;this.r=index===3?15:13;
    this.maxHp=index===3?480:390;this.hp=this.maxHp;this.atk=index===3?50:42;this.ms=94;this.cool=0;
    if(index<2){this.xpReward=45;this.goldReward=40;this.kind='melee';}
    else if(index===2){this.xpReward=40;this.goldReward=35;this.kind='ranged';}
    else if(lane===1){this.xpReward=70;this.goldReward=55;this.kind='exp';}
    else {this.xpReward=45;this.goldReward=95;this.kind='gold';}
    this.pitEmpowered=false;if(state.pitBuffUntil[team]>state.time){this.pitEmpowered=true;this.maxHp*=1.15;this.hp=this.maxHp;this.atk*=1.15;}
  }
  hitByHero(raw,hero){if(!canHeroDamageMinion(hero))return;this.damage(raw,hero);}
  update(dt){
    if(this.dead)return;this.cool-=dt;
    const targets=[...units.filter(u=>u!==this&&!u.dead&&u.team!==this.team&&u.team!==NEUTRAL&&dist(this,u)<105),...towers.filter(t=>!t.dead&&t.team!==this.team&&dist(this,t)<112),...cores.filter(c=>!c.dead&&c.team!==this.team&&c.vulnerable()&&dist(this,c)<125)];
    if(targets.length){targets.sort((a,b)=>dist(this,a)-dist(this,b));const t=targets[0];if(this.cool<=0){if(t instanceof Hero)t.take(this.atk,'physical',this);else if(t instanceof Tower)t.hitByMinion(this.atk,this);else if(t instanceof Core)t.hitByMinion(this.atk,this);else t.damage(this.atk,this);this.cool=1.1;}return;}
    const p=this.path[this.wp];if(!p)return;const n=norm(p.x-this.x,p.y-this.y);this.x+=n.x*this.ms*dt;this.y+=n.y*this.ms*dt;if(dist(this,p)<28)this.wp=Math.min(this.path.length-1,this.wp+1);
  }
  die(src){
    this.dead=true;addEffect('burst',this.x,this.y,{life:.25,color:'#8c778f',radius:35});
    const rewardTeam=src?.team;
    if(rewardTeam===TEAM_A||rewardTeam===TEAM_B){
      const nearby=units.filter(u=>u instanceof Hero&&!u.dead&&u.team===rewardTeam&&dist(u,this)<330);
      if(earlyEconomy()){
        const farmers=nearby.filter(isLaneFarmer);
        for(const h of farmers)h.gainXp(this.xpReward); // duo lane XP is not split in the protected phase
        for(const h of nearby.filter(isRoamerRole))h.gainXp(this.xpReward*.25); // support/tank companion XP
        if(farmers.length){const share=this.goldReward/farmers.length;for(const h of farmers)h.gold+=share;}
        if(src instanceof Hero&&isLaneFarmer(src)&&farmers.length>=2)src.gold+=10;
      }else{
        const n=Math.max(1,nearby.length);for(const h of nearby){h.gainXp(this.xpReward/n);h.gold+=this.goldReward/n;}
      }
    }
  }
}

class JungleCreep extends Entity{
  constructor(camp,kind,index=0){
    super(camp.x+(index?34:-20),camp.y+(index?18:-10),NEUTRAL);this.camp=camp;this.kind=kind;this.index=index;this.r=kind==='buff'?25:kind==='brute'?22:18;
    this.maxHp=kind==='buff'?1500:kind==='brute'?1050:620;this.hp=this.maxHp;this.atk=kind==='buff'?95:kind==='brute'?78:55;this.def=12;this.cool=0;this.aggro=null;this.speed=125;
    this.xpReward=kind==='buff'?520:kind==='brute'?450:220;this.goldReward=kind==='buff'?250:kind==='brute'?180:90;
  }
  hit(raw,src){
    if(src instanceof Hero&&!canHeroDamageJungle(src)){if(src.player)floatText(src.x,src.y-55,'JUNGLE PROTECTED UNTIL 5:00','#d8b45e',12);return;}
    const dmg=raw*100/(100+this.def);this.aggro=src instanceof Hero?src:this.aggro;this.damage(dmg,src);addEffect('hit',this.x,this.y,{life:.16,color:'#d8b2df',radius:this.r+14});
  }
  update(dt){
    if(this.dead)return;this.cool-=dt;
    if(this.aggro&&(!this.aggro.dead)&&dist(this,this.aggro)<450){
      const d=dist(this,this.aggro);if(d>80){const n=norm(this.aggro.x-this.x,this.aggro.y-this.y);this.x+=n.x*this.speed*dt;this.y+=n.y*this.speed*dt;}
      else if(this.cool<=0){this.aggro.take(this.atk,'physical',this);this.cool=1.1;}
    }else{
      this.aggro=null;const d=Math.hypot(this.x-this.camp.x,this.y-this.camp.y);if(d>45){const n=norm(this.camp.x-this.x,this.camp.y-this.y);this.x+=n.x*this.speed*.6*dt;this.y+=n.y*this.speed*.6*dt;}
      if(this.hp<this.maxHp)this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.015*dt);
    }
  }
  die(src){
    this.dead=true;addEffect('burst',this.x,this.y,{life:.45,color:this.camp.color,radius:70});
    if(src instanceof Hero){
      if(!earlyEconomy()||src.role==='JUNGLE'){src.gold+=this.goldReward;src.gainXp(this.xpReward);}
      if(earlyEconomy()&&src.role==='JUNGLE'){
        const escorts=units.filter(h=>h instanceof Hero&&!h.dead&&h.team===src.team&&isRoamerRole(h)&&dist(h,this)<470);
        for(const h of escorts)h.gainXp(this.xpReward*.25);
      }
      if(this.kind==='buff'){
        if(this.camp.buff==='crimson'){src.crimsonUntil=state.time+90;if(src.player)announce('CRIMSON BUFF ACQUIRED',.7);}
        if(this.camp.buff==='azure'){src.azureUntil=state.time+90;if(src.player)announce('AZURE BUFF ACQUIRED',.7);}
      }
    }
    if(this.camp.creeps.every(c=>c.dead))this.camp.respawnAt=state.time+50;
  }
}

class JungleCamp{
  constructor(x,y,label,kind='small',buff=null,owner=NEUTRAL){this.x=x;this.y=y;this.label=label;this.kind=kind;this.buff=buff;this.owner=owner;this.respawnAt=0;this.creeps=[];this.color=buff==='crimson'?'#c93f50':buff==='azure'?'#2998d6':buff==='yellow'?'#f0d332':buff==='purple'?'#b54bd3':'#765682';this.spawn();}
  spawn(){this.creeps=[];if(this.kind==='buff')this.creeps.push(new JungleCreep(this,'buff'));else if(this.kind==='brute')this.creeps.push(new JungleCreep(this,'brute'));else{this.creeps.push(new JungleCreep(this,'small',0),new JungleCreep(this,'small',1));}units.push(...this.creeps);this.respawnAt=0;}
  update(){if(this.respawnAt&&state.time>=this.respawnAt)this.spawn();}
}

class Tower extends Entity{
  constructor(team,lane,slot,x,y,maxHp,dmg,range){super(x,y,team);this.lane=lane;this.slot=slot;this.r=34;this.maxHp=maxHp;this.hp=maxHp;this.baseDmg=dmg;this.range=range;this.cool=0;this.fury=new Map();this.repairUntil=0;this.lastHitByEnemyAt=-999;}
  // T1 (outer) -> T2 (inner) -> G1 -> G2. You cannot skip deeper structures.
  vulnerable(){return towers.filter(t=>t.team===this.team&&t.lane===this.lane&&t.slot<this.slot&&!t.dead).length===0;}
  enemyMinionInRange(attackingTeam){return units.some(u=>u instanceof Minion&&!u.dead&&u.team===attackingTeam&&dist(this,u)<this.range);}
  backdoorAgainst(attackerTeam){return !this.enemyMinionInRange(attackerTeam);}
  hitByHero(raw,hero){if(!this.vulnerable()){floatText(this.x,this.y-60,'FORTIFIED','#d9b5ed',13);return;}const back=this.backdoorAgainst(hero.team);const dmg=raw*(back?.05:1);this.lastHitByEnemyAt=state.time;hero.towerDamage+=Math.max(0,Math.min(this.hp,dmg));this.damage(dmg,hero);if(back){this.repairUntil=state.time+2;floatText(this.x,this.y-60,'95% BLOCKED','#d9b5ed',13);}}
  hitByMinion(raw,min){if(!this.vulnerable())return;this.damage(raw,min);}
  update(dt){
    if(this.dead)return;this.cool-=dt;
    if(this.repairUntil>state.time)this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.015*dt);
    const enemyHeroes=units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==this.team&&dist(this,u)<this.range);
    const enemyMinions=units.filter(u=>u instanceof Minion&&!u.dead&&u.team!==this.team&&dist(this,u)<this.range);
    const targets=[...enemyMinions,...enemyHeroes];if(!targets.length){this.fury.clear();return;}
    const target=targets[0];if(this.cool<=0){let mult=1;const back=this.backdoorAgainst(target.team);if(back&&target instanceof Hero){mult=this.fury.get(target)||1;this.fury.set(target,Math.min(10,mult*2));}else this.fury.clear();const raw=this.baseDmg*mult;if(target instanceof Hero)target.take(raw,'physical',this);else target.damage(raw,this);if(back&&target instanceof Hero)floatText(this.x,this.y-92,`RIFT FURY ×${mult}`,'#d25b79',13);this.cool=1;tone(back?60:90,.06,'square',.02);}
  }
  die(src){
    this.dead=true;addEffect('burst',this.x,this.y,{life:.75,color:'#ae6a8b',radius:120});
    const denied=src instanceof Hero&&src.team===this.team;
    announce(denied?'DENIED! NOT A COIN FOR THEM.':'THEIR FORTRESS CRUMBLES',1.25);
    if(!denied&&src instanceof Hero&&src.team!==this.team){for(const h of units)if(h instanceof Hero&&h.team===src.team)h.gold+=100;src.gold+=250;}
  }
}

class Core extends Entity{
  constructor(team,x,y){super(x,y,team);this.r=56;this.maxHp=22000;this.hp=this.maxHp;this.range=340;this.baseDmg=520;this.cool=0;this.fury=new Map();this.repairUntil=0;}
  vulnerable(){return towers.filter(t=>t.team===this.team&&t.slot>=3&&!t.dead).length===0;}
  enemyMinionInRange(attackingTeam){return units.some(u=>u instanceof Minion&&!u.dead&&u.team===attackingTeam&&dist(this,u)<this.range);}
  backdoorAgainst(attackerTeam){return !this.enemyMinionInRange(attackerTeam);}
  hitByHero(raw,hero){
    if(!this.vulnerable()){floatText(this.x,this.y-82,'CORE SHIELDED','#d9b5ed',14);return;}
    const back=this.backdoorAgainst(hero.team),dmg=raw*(back?.05:1);hero.towerDamage+=Math.max(0,Math.min(this.hp,dmg));this.damage(dmg,hero);
    if(back){this.repairUntil=state.time+2;floatText(this.x,this.y-82,'CORE RIFT WARD · 95%','#d9b5ed',13);}
  }
  hitByMinion(raw,min){if(!this.vulnerable())return;this.damage(raw,min);}
  update(dt){
    if(this.dead||!this.vulnerable())return;this.cool-=dt;if(this.repairUntil>state.time)this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.012*dt);
    const enemyMinions=units.filter(u=>u instanceof Minion&&!u.dead&&u.team!==this.team&&dist(this,u)<this.range);
    const enemyHeroes=units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==this.team&&dist(this,u)<this.range);
    const target=(enemyMinions[0]||enemyHeroes[0]);if(!target||this.cool>0){if(!target)this.fury.clear();return;}
    let mult=1,back=this.backdoorAgainst(target.team);if(back&&target instanceof Hero){mult=this.fury.get(target)||1;this.fury.set(target,Math.min(10,mult*2));}else this.fury.clear();
    if(target instanceof Hero)target.take(this.baseDmg*mult,'physical',this);else target.damage(this.baseDmg,this);this.cool=.9;
  }
  die(src){this.dead=true;addEffect('burst',this.x,this.y,{life:1.4,color:'#e1b2eb',radius:260});state.gameOver=true;showResults(src?.team===player.team);}
}

class Pitlord extends Entity{
  constructor(){super(PIT_POS.x,PIT_POS.y,NEUTRAL);this.r=62;this.maxHp=14000;this.hp=this.maxHp;this.atk=190;this.def=20;this.cool=0;this.aggro=null;}
  hit(raw,src){const dmg=raw*100/(100+this.def);if(src instanceof Hero)this.aggro=src;this.damage(dmg,src);addEffect('hit',this.x,this.y,{life:.18,color:'#bd6fce',radius:76});}
  update(dt){if(this.dead)return;this.cool-=dt;const target=this.aggro&&!this.aggro.dead&&dist(this,this.aggro)<440?this.aggro:units.filter(u=>u instanceof Hero&&!u.dead&&dist(this,u)<210)[0];if(target&&this.cool<=0){target.take(this.atk,'physical',this);this.cool=1.1;addEffect('burst',target.x,target.y,{life:.2,color:'#7a3a88',radius:50});}}
  die(src){
    this.dead=true;addEffect('burst',this.x,this.y,{life:1.0,color:'#954aab',radius:190});state.pitRespawnAt=state.time+180;
    if(src instanceof Hero){state.pitBuffUntil[src.team]=state.time+90;state.pitKills[src.team]++;for(const h of units)if(h instanceof Hero&&!h.dead&&h.team===src.team){h.gold+=150;h.gainXp(120);h.pitlordParticipation++;}for(const m of units)if(m instanceof Minion&&!m.dead&&m.team===src.team&&!m.pitEmpowered){m.pitEmpowered=true;m.maxHp*=1.15;m.hp*=1.15;m.atk*=1.15;}src.gold+=300;src.gainXp(250);announce('THE RIFT BOWS TO YOUR WILL',1.6);}
  }
}

function placeStructures(){
  const hp=[6500,8000,10000,11500], dmg=[250,305,365,435], rng=[245,255,265,275];
  // Two outer lane towers are placed along each perimeter route.
  // G1/G2 are explicitly placed around the Core so each base visibly has 4 defending towers.
  const outerProgress={1:.34,2:.19};
  for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2]){
    const path=team===TEAM_A?LANES[lane]:revPath(LANES[lane]);
    for(let slot=1;slot<=2;slot++){
      const p=pointAlongPath(path,outerProgress[slot]);
      towers.push(new Tower(team,lane,slot,p.x,p.y,hp[slot-1],dmg[slot-1],rng[slot-1]));
    }
  }
  const guards={
    0:{1:[{x:790,y:8050},{x:860,y:8360}],2:[{x:1550,y:8720},{x:1210,y:8660}]},
    1:{1:[{x:8050,y:790},{x:8360,y:860}],2:[{x:8720,y:1550},{x:8660,y:1210}]}
  };
  for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2]){
    const g=guards[team][lane];
    towers.push(new Tower(team,lane,3,g[0].x,g[0].y,hp[2],dmg[2],rng[2]));
    towers.push(new Tower(team,lane,4,g[1].x,g[1].y,hp[3],dmg[3],rng[3]));
  }
  cores.push(new Core(TEAM_A,BASES[0].x,BASES[0].y),new Core(TEAM_B,BASES[1].x,BASES[1].y));
}

function placeCamps(){
  const data=[
    // 8 yellow standard camps (4 per side)
    [1700,7450,'Riftlings','small','yellow',TEAM_A],[2700,6500,'Riftlings','small','yellow',TEAM_A],[3500,7100,'Stonepack','brute','yellow',TEAM_A],[4050,6100,'Riftlings','small','yellow',TEAM_A],
    [7600,2550,'Riftlings','small','yellow',TEAM_B],[6900,3100,'Riftlings','small','yellow',TEAM_B],[6200,1850,'Stonepack','brute','yellow',TEAM_B],[5550,3450,'Riftlings','small','yellow',TEAM_B],
    // 2 purple major camps
    [3550,5050,'Umbral Warden','brute','purple',TEAM_A],[6050,4550,'Umbral Warden','brute','purple',TEAM_B],
    // 2 blue utility/mana camps
    [2450,5050,'Azure Guardian','buff','azure',TEAM_A],[7150,4550,'Azure Guardian','buff','azure',TEAM_B],
    // 2 red offensive camps
    [4200,6150,'Crimson Guardian','buff','crimson',TEAM_A],[5850,4100,'Crimson Guardian','buff','crimson',TEAM_B]
  ];
  for(const d of data)camps.push(new JungleCamp(...d));
}

placeStructures();placeCamps();

const player=new Hero(SPAWNS[0].x+80,SPAWNS[0].y-70,TEAM_A,'RAMZX',true,'EXP');units.push(player);
const allyNames=[['SERA','SUPPORT',1],['KAIRO','GOLD',2],['GRIMM','ROAMER',1],['VOLKRIN','JUNGLE',2]];
for(let i=0;i<allyNames.length;i++){const [n,r,l]=allyNames[i];const h=new Hero(SPAWNS[0].x+40+i*26,SPAWNS[0].y-10+i*20,TEAM_A,n,false,r);h.lane=l;h.maxHp=r==='ROAMER'?3300:2600;h.hp=h.maxHp;h.aiMode=r;units.push(h);}
const enemyNames=[['NYRA','JUNGLE',1],['VEYRA','TACTICAL',1],['KAELOR','EXP',1],['RAZE','GOLD',2],['GRIMM','ROAMER',2]];
for(let i=0;i<enemyNames.length;i++){const [n,r,l]=enemyNames[i];const h=new Hero(SPAWNS[1].x-40-i*26,SPAWNS[1].y+10+i*20,TEAM_B,n,false,r);h.lane=l;h.maxHp=r==='SUPPORT'?2900:2550;h.hp=h.maxHp;units.push(h);}

function spawnWave(){
  for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2])for(let i=0;i<4;i++)units.push(new Minion(team,lane,i));
  tone(190,.04,'triangle',.012);
}
function spawnPitlord(debug=false){if(state.pitlord&&!state.pitlord.dead)return;state.pitlord=new Pitlord();state.pitRespawnAt=0;announce(debug?'PITLORD SUMMONED':'THE RIFT TREMBLES… PITLORD HAS AWAKENED!',1.8);}

const keys=new Set();
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys.add(k);if(e.key===' ')e.preventDefault();
  if(k==='j'||e.key===' ')player.basicAttack();
  if(k==='1'||k==='q')player.s1();
  if(k==='2')player.s2();
  if(k==='3'||k==='e')player.s3();
  if(k==='4'||k==='r')player.ult();
  if(k==='f')tryDeny();if(k==='p')spawnPitlord(true);if(k==='l')player.forceLevel4();if(k==='m'){state.cameraManual=false;state.cameraManualUntil=0;}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

function tryDeny(){
  if(player.dead)return;
  const own=towers.filter(t=>!t.dead&&t.team===player.team&&t.hp/t.maxHp<=.10&&dist(player,t)<180&&!t.backdoorAgainst(1-player.team)).sort((a,b)=>dist(player,a)-dist(player,b))[0];
  if(own){own.die(player);announce('DENIED! NOT A COIN FOR THEM.',1.4);}else floatText(player.x,player.y-55,'NO DENIABLE TOWER','#d8b45e',13);
}

const joy=document.getElementById('joystick'),stick=document.getElementById('stick');let joyId=null,joyVec={x:0,y:0};
function joyMove(e){
  const r=joy.getBoundingClientRect(),t=[...e.touches].find(t=>t.identifier===joyId)||e.changedTouches?.[0];if(!t)return;
  let dx=t.clientX-(r.left+r.width/2),dy=t.clientY-(r.top+r.height/2);const lim=r.width*.34,m=Math.hypot(dx,dy)||1;if(m>lim){dx=dx/m*lim;dy=dy/m*lim;}
  stick.style.transform=`translate(${dx}px,${dy}px)`;joyVec={x:dx/lim,y:dy/lim};
}
joystickListeners();
function joystickListeners(){
  joy.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e)},{passive:false});
  joy.addEventListener('touchmove',e=>{e.preventDefault();joyMove(e)},{passive:false});
  joy.addEventListener('touchend',()=>{joyId=null;joyVec={x:0,y:0};stick.style.transform=''},{passive:false});
  joy.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){joyId='mouse';const r=joy.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),lim=r.width*.34,m=Math.hypot(dx,dy)||1;if(m>lim){dx=dx/m*lim;dy=dy/m*lim}joyVec={x:dx/lim,y:dy/lim};stick.style.transform=`translate(${dx}px,${dy}px)`;}});
  addEventListener('pointerup',()=>{if(joyId==='mouse'){joyId=null;joyVec={x:0,y:0};stick.style.transform='';}});
}

let miniDrag=false;
function scoutMinimap(clientX,clientY){
  const r=minimap.getBoundingClientRect(),mx=clamp((clientX-r.left)/r.width,0,1),my=clamp((clientY-r.top)/r.height,0,1);
  state.cameraManual=true;state.cameraManualUntil=state.time+1.8;
  state.camera.x=clamp(mx*WORLD_W-VIEW_W/2,0,WORLD_W-VIEW_W);state.camera.y=clamp(my*WORLD_H-VIEW_H/2,0,WORLD_H-VIEW_H);
}
minimap.addEventListener('pointerdown',e=>{miniDrag=true;minimap.setPointerCapture?.(e.pointerId);scoutMinimap(e.clientX,e.clientY);e.preventDefault();});
minimap.addEventListener('pointermove',e=>{if(miniDrag){scoutMinimap(e.clientX,e.clientY);e.preventDefault();}});
minimap.addEventListener('pointerup',e=>{miniDrag=false;state.cameraManual=false;state.cameraManualUntil=state.time+1.8;e.preventDefault();});
minimap.addEventListener('pointercancel',()=>{miniDrag=false;state.cameraManual=false;});
minimap.addEventListener('dblclick',()=>{state.cameraManual=false;state.cameraManualUntil=0;});

document.querySelectorAll('.skill').forEach(b=>b.addEventListener('pointerdown',e=>{
  e.preventDefault();const a=b.dataset.action;if(a==='attack')player.basicAttack();if(a==='s1')player.s1();if(a==='s2')player.s2();if(a==='s3')player.s3();if(a==='ult')player.ult();if(a==='deny')tryDeny();
}));
levelBtn.onclick=()=>player.forceLevel4();pitBtn.onclick=()=>spawnPitlord(true);

function updatePlayer(dt){
  if(player.dead)return;
  let x=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joyVec.x;
  let y=(keys.has('s')?1:0)-(keys.has('w')?1:0)+joyVec.y;
  if(x||y){
    const n=norm(x,y);player.facing=Math.atan2(n.y,n.x);
    const step=player.speed()*dt, nx=clamp(player.x+n.x*step,45,WORLD_W-45), ny=clamp(player.y+n.y*step,45,WORLD_H-45);
    if(!isBlocked(nx,player.y))player.x=nx;
    if(!isBlocked(player.x,ny))player.y=ny;
  }
}

function updateEffects(dt){
  for(const e of state.effects)e.life-=dt;state.effects=state.effects.filter(e=>e.life>0);
  for(const f of state.floating){f.life-=dt;f.y-=28*dt;}state.floating=state.floating.filter(f=>f.life>0);
  state.screenShake=Math.max(0,state.screenShake-dt);
}
function updateCamera(){
  const maxX=WORLD_W-VIEW_W,maxY=WORLD_H-VIEW_H;
  if(!state.cameraManual && state.time>=state.cameraManualUntil){
    state.camera.x=clamp(player.x-VIEW_W/2,0,maxX);state.camera.y=clamp(player.y-VIEW_H/2,0,maxY);
  }
  state.camera.x=clamp(state.camera.x,0,maxX);state.camera.y=clamp(state.camera.y,0,maxY);
  if(state.screenShake>0&&!state.cameraManual){state.camera.x+=Math.random()*8-4;state.camera.y+=Math.random()*8-4;}
}
function updateUI(){
  const mins=Math.floor(state.time/60),secs=Math.floor(state.time%60);
  info.textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} · BLUE ${state.teamKills[0]}–${state.teamKills[1]} RED · ${earlyEconomy()?'ROLE ECONOMY':'OPEN ECONOMY'} · ${player.role} · Lv ${player.level} · ${Math.floor(player.gold)}g`;
  const remain=Math.max(0,210-state.time);
  if(state.pitlord&&!state.pitlord.dead)pitBanner.textContent=hasVisionAt(state.pitlord.x,state.pitlord.y,TEAM_A)?`PITLORD: ${Math.ceil(state.pitlord.hp)} HP`:'PITLORD: ALIVE';
  else if(state.pitRespawnAt>state.time){const r=Math.ceil(state.pitRespawnAt-state.time);pitBanner.textContent=`PITLORD: RETURNS · ${Math.floor(r/60)}:${String(r%60).padStart(2,'0')}`;}
  else pitBanner.textContent=`PITLORD: DORMANT · ${Math.floor(remain/60)}:${String(Math.ceil(remain%60)).padStart(2,'0')}`;
  hpText.textContent=`${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`;hpFill.style.width=`${Math.max(0,player.hp/player.maxHp*100)}%`;shieldFill.style.width=`${Math.min(100,player.shield/player.maxHp*100)}%`;
  const buffs=[];if(player.crimsonUntil>state.time)buffs.push(`<span class="buff crimson">CRIMSON ${Math.ceil(player.crimsonUntil-state.time)}s</span>`);if(player.azureUntil>state.time)buffs.push(`<span class="buff azure">AZURE ${Math.ceil(player.azureUntil-state.time)}s</span>`);if(state.pitBuffUntil[player.team]>state.time)buffs.push(`<span class="buff pit">PITLORD ${Math.ceil(state.pitBuffUntil[player.team]-state.time)}s</span>`);buffBar.innerHTML=buffs.join('');
  for(const b of document.querySelectorAll('.skill[data-action]')){const a=b.dataset.action,cd=a==='attack'?player.cool.attack:(a==='deny'?0:player.cool[a]);b.classList.toggle('cooling',cd>0);b.classList.toggle('locked',a==='ult'&&player.level<4);b.dataset.cd=cd>0?Math.ceil(cd):'';}
}

function update(dt){
  if(state.gameOver)return;state.time+=dt;
  if(state.lastWave<0&&state.time>=.5){spawnWave();state.lastWave=.5;}else if(state.time-state.lastWave>=20){spawnWave();state.lastWave+=20;}
  if(!state.pitlord&&state.time>=210)spawnPitlord();
  if(state.pitlord?.dead&&state.pitRespawnAt&&state.time>=state.pitRespawnAt)spawnPitlord();
  if(!state.economyAnnounced&&state.time>=300){state.economyAnnounced=true;announce('THE RIFT OPENS. ALL FARM IS NOW UNBOUND.',1.8);}
  updatePlayer(dt);
  for(const u of [...units])u.update?.(dt);
  for(const t of towers)t.update(dt);
  for(const c of cores)c.update(dt);
  for(const c of camps)c.update();
  state.pitlord?.update(dt);
  for(let i=units.length-1;i>=0;i--){const u=units[i];if(u.dead&&!(u instanceof Hero)&&!(u instanceof JungleCreep))units.splice(i,1);}
  updateEffects(dt);updateCamera();updateUI();
}

function showResults(victory){
  if(state.resultsShown)return;state.resultsShown=true;
  announce(victory?'THE RIFT IS YOURS':'YOUR JOURNEY ENDS HERE',2.2);
  const panel=document.getElementById('resultPanel'),title=document.getElementById('resultTitle'),stats=document.getElementById('resultStats');
  title.textContent=victory?'VICTORY':'DEFEAT';
  stats.innerHTML=`<div><b>K / D / A</b><span>${player.kills} / ${player.deaths} / ${player.assists}</span></div><div><b>Gold</b><span>${Math.floor(player.gold)}</span></div><div><b>Hero Damage</b><span>${Math.floor(player.heroDamage)}</span></div><div><b>Tower Damage</b><span>${Math.floor(player.towerDamage)}</span></div><div><b>Damage Taken</b><span>${Math.floor(player.damageTaken)}</span></div><div><b>Pitlord Participation</b><span>${player.pitlordParticipation}</span></div><div><b>Team Score</b><span>${state.teamKills[0]} – ${state.teamKills[1]}</span></div>`;
  panel.classList.add('show');
}
document.getElementById('restartBtn')?.addEventListener('click',()=>location.reload());

function drawPath(path,color,width){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();const a=screenPos(path[0].x,path[0].y);ctx.moveTo(a.x,a.y);for(const p of path.slice(1)){const s=screenPos(p.x,p.y);ctx.lineTo(s.x,s.y)}ctx.stroke();
}
function drawRotWall(z){
  const s=screenPos(z.x,z.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(z.rot);ctx.fillStyle='#07090b';ctx.strokeStyle='#202729';ctx.lineWidth=6;
  const r=Math.min(z.h/2,90),x=-z.w/2,y=-z.h/2,w=z.w,h=z.h;
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();ctx.restore();
}
function drawWorldBackground(){
  // Grey-green playable field similar to the approved sketch.
  ctx.fillStyle='#405254';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  const grid=180;ctx.strokeStyle='#4b5d5d55';ctx.lineWidth=1;
  const sx=-(state.camera.x%grid),sy=-(state.camera.y%grid);
  for(let x=sx;x<VIEW_W;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,VIEW_H);ctx.stroke();}
  for(let y=sy;y<VIEW_H;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(VIEW_W,y);ctx.stroke();}
  // Base territories
  for(let team=0;team<2;team++){
    const b=screenPos(BASES[team].x,BASES[team].y),sp=screenPos(SPAWNS[team].x,SPAWNS[team].y);
    ctx.fillStyle=team===0?'#315f7a88':'#78394688';ctx.beginPath();ctx.arc(b.x,b.y,650,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.fillStyle=team===0?'#2a7598':'#9a3646';ctx.arc(sp.x,sp.y,105,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e8f0f077';ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle='#f6fbfb';ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.fillText('RESPAWN',sp.x,sp.y+4);ctx.textAlign='left';
  }
  // Outer lane roads
  drawPath(lane1,'#667473',110);drawPath(lane1,'#273032',8);drawPath(lane2,'#6a7470',110);drawPath(lane2,'#30302d',8);
  // River
  for(const z of waterZones){const s=screenPos(z.x,z.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(z.rot);ctx.beginPath();ctx.ellipse(0,0,z.rx,z.ry,0,0,Math.PI*2);ctx.fillStyle='#157083';ctx.fill();ctx.strokeStyle='#2192a4';ctx.lineWidth=5;ctx.stroke();for(let i=-2;i<=2;i++){ctx.strokeStyle='#54b0bd66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-z.rx*.7,i*42);ctx.quadraticCurveTo(0,i*42+22,z.rx*.7,i*42);ctx.stroke();}ctx.restore();}
  for(const z of bridgeZones){const s=screenPos(z.x,z.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(z.rot);ctx.fillStyle='#74756b';ctx.fillRect(-z.w/2,-z.h/2,z.w,z.h);ctx.strokeStyle='#302d28';ctx.lineWidth=5;ctx.strokeRect(-z.w/2,-z.h/2,z.w,z.h);ctx.restore();}
  // Jungle walls after river so they form real corridors/choke points.
  for(const z of jungleWalls)drawRotWall(z);
  // Pitlord basin / magenta objective symbol
  const p=screenPos(PIT_POS.x,PIT_POS.y);ctx.beginPath();ctx.fillStyle='#20232a';ctx.arc(p.x,p.y,170,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#71398c';ctx.lineWidth=8;ctx.stroke();
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#d34df0';ctx.fillRect(-28,-28,56,56);ctx.fillStyle='#70268a';ctx.fillRect(-13,-13,26,26);ctx.restore();
  ctx.fillStyle='#f1d9f5';ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.fillText('PITLORD',p.x,p.y+108);ctx.textAlign='left';
}
function hpbar(e,w=62){
  const s=screenPos(e.x,e.y),x=s.x-w/2,y=s.y-e.r-18;if(x<-w||x>VIEW_W||y<-30||y>VIEW_H)return;
  ctx.fillStyle='#000b';ctx.fillRect(x,y,w,8);ctx.fillStyle=e.team===TEAM_A?'#68caff':e.team===TEAM_B?'#ff6c77':'#a868b5';ctx.fillRect(x,y,w*Math.max(0,e.hp/e.maxHp),8);if(e.shield){ctx.fillStyle='#e2c5f4';ctx.fillRect(x,y-4,w*Math.min(1,e.shield/e.maxHp),3);}
}
function drawCamp(c){
  const s=screenPos(c.x,c.y);if(s.x<-120||s.x>VIEW_W+120||s.y<-120||s.y>VIEW_H+120)return;
  ctx.save();ctx.translate(s.x,s.y);ctx.strokeStyle=c.color;ctx.lineWidth=4;ctx.setLineDash([6,7]);ctx.beginPath();ctx.arc(0,0,58,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#100d14aa';ctx.beginPath();ctx.arc(0,0,50,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d7c5db';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(c.label.toUpperCase(),0,75);ctx.textAlign='left';ctx.restore();
}
function drawEntity(u){
  if(u.dead||!visibleToPlayer(u))return;const s=screenPos(u.x,u.y);if(s.x<-100||s.x>VIEW_W+100||s.y<-100||s.y>VIEW_H+100)return;
  if(u instanceof Minion){ctx.beginPath();ctx.fillStyle=TEAM_COLORS[u.team];ctx.arc(s.x,s.y,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=u.kind==='exp'?'#f0d65d':u.kind==='gold'?'#f3a54f':'#ffffff55';ctx.lineWidth=u.kind==='exp'||u.kind==='gold'?3:2;ctx.stroke();if(u.pitEmpowered){ctx.strokeStyle='#c95ee4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,u.r+5,0,Math.PI*2);ctx.stroke();}hpbar(u,34);return;}
  if(u instanceof JungleCreep){ctx.beginPath();ctx.fillStyle=u.camp.color;ctx.arc(s.x,s.y,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e7d8eb88';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillText(u.kind==='buff'?'BUFF':u.kind==='brute'?'BRUTE':'CREEP',s.x,s.y+3);ctx.textAlign='left';hpbar(u,48);return;}
  if(u instanceof Hero){
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(u.facing);ctx.beginPath();ctx.fillStyle=u.team===TEAM_A?'#7bd3ff':'#ff7b85';ctx.arc(0,0,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=u.player?'#fff':'#f5dfe855';ctx.lineWidth=u.player?4:2;ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(7,-4,26,8);ctx.restore();
    ctx.fillStyle='#fff';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(`${u.name} · ${u.level} · ${u.role}`,s.x,s.y+4);ctx.textAlign='left';hpbar(u,72);return;
  }
}
function drawTower(t){
  if(t.dead)return;const s=screenPos(t.x,t.y);if(s.x<-100||s.x>VIEW_W+100||s.y<-100||s.y>VIEW_H+100)return;
  const back=t.backdoorAgainst(1-t.team);ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle=t.team===0?'#2f6d8d':'#8d3540';ctx.fillRect(-24,-38,48,76);ctx.fillStyle='#c4b2ca';ctx.fillRect(-15,-54,30,20);ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeRect(-24,-38,48,76);if(back){ctx.strokeStyle='#b163c7';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,52,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#fff';ctx.font='900 10px system-ui';ctx.textAlign='center';const label=t.slot===1?'T1':t.slot===2?'T2':t.slot===3?'G1':'G2';ctx.fillText(label,0,4);if(!t.vulnerable()){ctx.strokeStyle='#eed9ff88';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,44,0,Math.PI*2);ctx.stroke();}ctx.textAlign='left';ctx.restore();hpbar(t,84);
}
function drawCore(c){if(c.dead)return;const s=screenPos(c.x,c.y);if(s.x<-120||s.x>VIEW_W+120||s.y<-120||s.y>VIEW_H+120)return;ctx.beginPath();ctx.fillStyle=c.team===0?'#22506a':'#6a2630';ctx.arc(s.x,s.y,c.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c.vulnerable()?'#fff':'#c39acf';ctx.lineWidth=6;ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(c.vulnerable()?'CORE':'CORE SHIELDED',s.x,s.y+4);ctx.textAlign='left';hpbar(c,100);}
function drawPitlord(){
  if(!state.pitlord||state.pitlord.dead||!hasVisionAt(state.pitlord.x,state.pitlord.y,TEAM_A))return;const p=state.pitlord,s=screenPos(p.x,p.y);ctx.beginPath();ctx.fillStyle='#703682';ctx.arc(s.x,s.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e3c7ea';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.fillText('PITLORD',s.x,s.y+5);ctx.textAlign='left';hpbar(p,130);
}
function drawEffects(){
  for(const e of state.effects){const k=e.life/e.max,s=screenPos(e.x,e.y);ctx.save();ctx.globalAlpha=Math.min(1,k*1.7);if(e.type==='slash'){ctx.strokeStyle=e.color;ctx.lineWidth=12*k+2;ctx.beginPath();ctx.arc(s.x,s.y,e.radius,-.65+e.angle,.65+e.angle);ctx.stroke();}else if(e.type==='cone'){ctx.fillStyle=e.color+'55';ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.arc(s.x,s.y,e.radius,e.angle-.82,e.angle+.82);ctx.closePath();ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=4;ctx.stroke();}else if(e.type==='ring'){ctx.strokeStyle=e.color;ctx.lineWidth=7*k+1;ctx.beginPath();ctx.arc(s.x,s.y,e.radius*(1-k*.15),0,Math.PI*2);ctx.stroke();}else if(e.type==='burst'||e.type==='hit'){ctx.fillStyle=e.color+'88';ctx.beginPath();ctx.arc(s.x,s.y,e.radius*(1-k*.5),0,Math.PI*2);ctx.fill();}else if(e.type==='dash'){const q=screenPos(e.x2,e.y2);ctx.strokeStyle=e.color;ctx.lineWidth=18*k;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(q.x,q.y);ctx.stroke();}else if(e.type==='mark'){ctx.strokeStyle=e.color;ctx.lineWidth=6;ctx.beginPath();ctx.arc(s.x,s.y,e.radius*(1.15-k*.15),0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(s.x-e.radius,s.y);ctx.lineTo(s.x+e.radius,s.y);ctx.stroke();}else if(e.type==='miss'){ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(s.x,s.y,12,0,Math.PI*2);ctx.fill();}ctx.restore();}
  for(const f of state.floating){const s=screenPos(f.x,f.y);ctx.save();ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font=`900 ${f.size}px system-ui`;ctx.textAlign='center';ctx.fillText(f.text,s.x,s.y);ctx.restore();}
}
function drawFog(){
  fctx.clearRect(0,0,VIEW_W,VIEW_H);fctx.fillStyle='rgba(3,6,8,.58)';fctx.fillRect(0,0,VIEW_W,VIEW_H);
  fctx.save();fctx.globalCompositeOperation='destination-out';
  for(const v of teamVisionSources(TEAM_A)){
    const p=screenPos(v.x,v.y);if(p.x+v.r<0||p.x-v.r>VIEW_W||p.y+v.r<0||p.y-v.r>VIEW_H)continue;
    const g=fctx.createRadialGradient(p.x,p.y,v.r*.58,p.x,p.y,v.r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');fctx.fillStyle=g;fctx.beginPath();fctx.arc(p.x,p.y,v.r,0,Math.PI*2);fctx.fill();
  }
  fctx.restore();ctx.drawImage(fogCanvas,0,0);
}

function drawMinimap(){
  const w=minimap.width,h=minimap.height,sx=w/WORLD_W,sy=h/WORLD_H;mctx.clearRect(0,0,w,h);mctx.fillStyle='#344747';mctx.fillRect(0,0,w,h);
  function mp(path,color){mctx.strokeStyle=color;mctx.lineWidth=4;mctx.lineCap='round';mctx.beginPath();mctx.moveTo(path[0].x*sx,path[0].y*sy);for(const p of path.slice(1))mctx.lineTo(p.x*sx,p.y*sy);mctx.stroke();}
  mp(lane1,'#7b8580');mp(lane2,'#7b8580');
  // river diagonal
  mctx.strokeStyle='#16788a';mctx.lineWidth=13;mctx.beginPath();mctx.moveTo(900*sx,900*sy);mctx.lineTo(8700*sx,8700*sy);mctx.stroke();
  // jungle walls
  mctx.strokeStyle='#090b0c';mctx.lineWidth=5;for(const z of jungleWalls){mctx.save();mctx.translate(z.x*sx,z.y*sy);mctx.rotate(z.rot);mctx.strokeRect(-z.w*sx/2,-z.h*sy/2,z.w*sx,z.h*sy);mctx.restore();}
  // bases + cores
  for(let team=0;team<2;team++){mctx.fillStyle=TEAM_COLORS[team];mctx.fillRect(BASES[team].x*sx-4,BASES[team].y*sy-4,8,8);mctx.strokeStyle='#fff9';mctx.strokeRect(SPAWNS[team].x*sx-3,SPAWNS[team].y*sy-3,6,6);}
  // camps (known map markers)
  for(const c of camps){mctx.fillStyle=c.color;mctx.beginPath();mctx.arc(c.x*sx,c.y*sy,2.8,0,Math.PI*2);mctx.fill();}
  // Pitlord marker is always known, entity/HP is only visible with vision.
  mctx.fillStyle='#dc4ee9';mctx.save();mctx.translate(PIT_POS.x*sx,PIT_POS.y*sy);mctx.rotate(Math.PI/4);mctx.fillRect(-4,-4,8,8);mctx.restore();
  // Towers always appear and show HP state.
  for(const t of towers){if(t.dead)continue;const x=t.x*sx,y=t.y*sy;mctx.fillStyle=TEAM_COLORS[t.team];mctx.fillRect(x-3,y-3,6,6);mctx.fillStyle='#101418';mctx.fillRect(x-5,y-7,10,2);mctx.fillStyle=t.hp/t.maxHp>.55?'#7fe383':t.hp/t.maxHp>.2?'#e9c74e':'#ef5b63';mctx.fillRect(x-5,y-7,10*(t.hp/t.maxHp),2);}
  // Allied minions are always known. Enemy minions only while revealed.
  for(const u of units){if(u.dead)continue;if(u instanceof Minion){if(u.team!==TEAM_A&&!hasVisionAt(u.x,u.y,TEAM_A))continue;mctx.fillStyle=TEAM_COLORS[u.team];mctx.globalAlpha=.75;mctx.fillRect(u.x*sx-1,u.y*sy-1,2,2);mctx.globalAlpha=1;}}
  // Allied heroes always visible; enemy heroes only while under allied vision.
  for(const u of units){if(!(u instanceof Hero)||u.dead)continue;if(u.team!==TEAM_A&&!hasVisionAt(u.x,u.y,TEAM_A))continue;mctx.fillStyle=u.player?'#ffffff':TEAM_COLORS[u.team];mctx.beginPath();mctx.arc(u.x*sx,u.y*sy,u.player?4:3,0,Math.PI*2);mctx.fill();}
  // camera viewport
  mctx.strokeStyle='#ffffffaa';mctx.lineWidth=1.5;mctx.strokeRect(state.camera.x*sx,state.camera.y*sy,VIEW_W*sx,VIEW_H*sy);
}
function draw(){
  drawWorldBackground();for(const c of camps)drawCamp(c);drawFog();for(const c of cores)drawCore(c);for(const t of towers)drawTower(t);drawPitlord();for(const u of units)drawEntity(u);drawEffects();drawMinimap();
}

let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop);}
announce('WELCOME TO TWISTED RIFT! YOUR JOURNEY BEGINS!',2.1);requestAnimationFrame(loop);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

})();
