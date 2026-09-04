(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');
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
const WORLD_W = 4200, WORLD_H = 2600;
const TEAM_A = 0, TEAM_B = 1, NEUTRAL = 2;
const TEAM_COLORS = ['#67caff', '#ff6976'];
const BASES = [{x:480,y:2120},{x:3720,y:480}];

const lane1 = [
  {x:480,y:2120},{x:410,y:1780},{x:470,y:1370},{x:650,y:980},{x:980,y:650},
  {x:1450,y:430},{x:2100,y:340},{x:2750,y:360},{x:3290,y:410},{x:3720,y:480}
];
const lane2 = [
  {x:480,y:2120},{x:840,y:2230},{x:1320,y:2290},{x:1950,y:2260},{x:2550,y:2140},
  {x:3040,y:1920},{x:3400,y:1580},{x:3600,y:1120},{x:3710,y:760},{x:3720,y:480}
];
const LANES = {1: lane1, 2: lane2};
const revPath = p => [...p].reverse().map(v => ({...v}));

const waterZones = [
  {x:1820,y:1380,rx:400,ry:190,rot:-0.55},
  {x:2300,y:1150,rx:430,ry:180,rot:-0.55},
  {x:2740,y:920,rx:330,ry:150,rot:-0.55}
];
const bridgeZones = [
  {x:1960,y:1310,w:250,h:100,rot:-0.55},
  {x:2490,y:1040,w:250,h:100,rot:-0.55}
];

const state = {
  time: 0,
  lastWave: -999,
  pitlord: null,
  pitBuffUntil: [0,0],
  gameOver: false,
  camera: {x:0,y:0},
  effects: [],
  floating: [],
  screenShake: 0,
  matchStartAnnounced: false
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

class Entity{
  constructor(x,y,team){this.x=x;this.y=y;this.team=team;this.dead=false;this.r=16;this.maxHp=100;this.hp=100;}
  damage(n,src){if(this.dead)return;this.hp-=n;if(n>0)floatText(this.x,this.y-this.r,`-${Math.round(n)}`,'#ffd6d6',14);if(this.hp<=0){this.hp=0;this.die(src)}}
  die(){this.dead=true}
}

class Hero extends Entity{
  constructor(x,y,team,name='RAMZX',player=false,role='EXP'){
    super(x,y,team);this.name=name;this.player=player;this.role=role;this.r=26;
    this.maxHp=player?3100:2600;this.hp=this.maxHp;this.atk=player?132:118;this.def=player?28:24;
    this.ms=player?305:295;this.gold=0;this.xp=0;this.level=1;this.shield=0;this.facing=team===TEAM_A?-0.45:2.7;
    this.cool={s1:0,s2:0,s3:0,ult:0,attack:0};this.respawnAt=0;this.botThink=0;this.pathWp=1;
    this.lane = role==='GOLD'?2:1;this.targetMark=null;this.crimsonUntil=0;this.azureUntil=0;
    this.aiMode='lane';this.aiCampIndex=0;
  }
  take(raw,type='physical',src=null){
    if(this.dead)return;
    let dmg=raw;
    if(type==='physical') dmg=raw*100/(100+this.def);
    if(this.shield>0){const used=Math.min(this.shield,dmg);this.shield-=used;dmg-=used;}
    if(dmg>0)this.damage(dmg,src);
  }
  die(src){
    this.dead=true;this.respawnAt=state.time+10+Math.min(20,this.level*1.4);
    addEffect('burst',this.x,this.y,{life:.7,color:'#6f516f',radius:72});
    if(src instanceof Hero&&src.team!==this.team){src.gold+=500;src.gainXp(120);announce(this.player?'YOU HAVE FALLEN':'BLOODY MESS',1.0)}
  }
  respawn(){this.dead=false;this.hp=this.maxHp;this.shield=0;this.x=BASES[this.team].x;this.y=BASES[this.team].y;this.pathWp=1;}
  gainXp(n){
    this.xp+=n;
    const req=[0,100,650,1800,3000,4300,5700,7200,8800,10500,12300,14200,16200,18300,20500];
    while(this.level<15&&this.xp>=req[this.level]){
      this.level++;this.maxHp+=this.player?185:145;this.hp+=this.player?185:145;this.atk+=this.player?7.5:6;
      if(this.player){announce(`LEVEL ${this.level}`,.6);addEffect('ring',this.x,this.y,{life:.65,color:'#d9b6ef',radius:90});}
    }
  }
  forceLevel4(){this.xp=1800;while(this.level<4){this.level++;this.maxHp+=185;this.hp+=185;this.atk+=7.5;}announce('ULTIMATE READY',.8)}
  speed(){return this.ms*(isInWater(this.x,this.y)?.90:1);}
  update(dt){
    for(const k in this.cool)this.cool[k]=Math.max(0,this.cool[k]-dt*(this.azureUntil>state.time?1.20:1));
    if(this.dead){if(state.time>=this.respawnAt)this.respawn();return;}
    if(!this.player)this.botAI(dt);
  }
  selectTarget(range=180,heroFirst=true){
    let candidates=[];
    const enemyHeroes=units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==this.team&&dist(this,u)<=range);
    const enemyMinions=units.filter(u=>u instanceof Minion&&!u.dead&&u.team!==this.team&&dist(this,u)<=range);
    const jungle=units.filter(u=>u instanceof JungleCreep&&!u.dead&&dist(this,u)<=range);
    const structs=towers.filter(t=>!t.dead&&t.team!==this.team&&dist(this,t)<=range);
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
    if(t instanceof Tower){if(state.pitBuffUntil[this.team]>state.time)dmg*=1.10;t.hitByHero(dmg,this);}
    else if(t instanceof Hero)t.take(dmg,'physical',this);
    else if(t instanceof JungleCreep)t.hit(dmg,this);
    else if(t instanceof Pitlord)t.hit(dmg,this);
    else t.damage(dmg,this);
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
      if(u instanceof Hero)u.take(dmg,'physical',this); else if(u instanceof JungleCreep||u instanceof Pitlord)u.hit(dmg,this); else u.damage(dmg,this);
      hits++;
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
    this.x=clamp(this.x+Math.cos(this.facing)*dash,45,WORLD_W-45);this.y=clamp(this.y+Math.sin(this.facing)*dash,45,WORLD_H-45);
    addEffect('dash',start.x,start.y,{life:.35,x2:this.x,y2:this.y,color:'#bc6073'});
    let t=null,best=9999;
    for(const u of units){if(u.dead||u.team===this.team||u===this)continue;const d=dist(this,u);if(d<95&&d<best){best=d;t=u;}}
    if(t){let dmg=180+this.atk*.8;if(t instanceof Hero&&t.hp/t.maxHp<.4)dmg*=1.3;if(t instanceof Hero)t.take(dmg,'physical',this);else if(t instanceof JungleCreep)t.hit(dmg,this);else t.damage(dmg,this);}
    state.screenShake=.08;tone(96,.10,'sawtooth',.04);
  }
  ult(){
    if(this.level<4||this.cool.ult>0||this.dead){if(this.level<4&&this.player)floatText(this.x,this.y-50,'ULTIMATE LOCKED','#dcb8e7',16);return;}
    const targets=units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==this.team&&dist(this,u)<=600).sort((a,b)=>dist(this,a)-dist(this,b));
    const t=targets[0];if(!t){floatText(this.x,this.y-50,'NO HERO IN RANGE','#dcb8e7',14);return;}
    this.cool.ult=45;this.targetMark={target:t,until:state.time+6};announce('DEADLINE',.75);addEffect('mark',t.x,t.y,{life:1.0,color:'#ca3f52',radius:74});
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
  botAI(dt){
    this.botThink-=dt;if(this.botThink>0)return;this.botThink=.12;
    const close=this.selectTarget(220,true);
    if(close){
      const d=dist(this,close);if(d>145){const n=norm(close.x-this.x,close.y-this.y);this.facing=Math.atan2(n.y,n.x);this.x+=n.x*this.speed()*.12;this.y+=n.y*this.speed()*.12;}
      else this.basicAttack();
      if(close instanceof Hero&&this.level>=4&&this.cool.ult<=0&&Math.random()<.02)this.ult();
      return;
    }
    if(this.role==='JUNGLE'){
      const live=camps.map(c=>c.creeps.find(x=>!x.dead)).find(Boolean);
      if(live){const n=norm(live.x-this.x,live.y-this.y);this.facing=Math.atan2(n.y,n.x);this.x+=n.x*this.speed()*.10;this.y+=n.y*this.speed()*.10;return;}
    }
    const path=this.team===TEAM_A?LANES[this.lane]:revPath(LANES[this.lane]);
    const p=path[this.pathWp]||path[path.length-1];const n=norm(p.x-this.x,p.y-this.y);this.facing=Math.atan2(n.y,n.x);this.x+=n.x*this.speed()*.11;this.y+=n.y*this.speed()*.11;if(dist(this,p)<75)this.pathWp=Math.min(path.length-1,this.pathWp+1);
  }
}

class Minion extends Entity{
  constructor(team,lane,index){
    const path=team===TEAM_A?LANES[lane]:revPath(LANES[lane]), p=path[0];
    super(p.x+(index-1.5)*18,p.y+(index-1.5)*10,team);this.lane=lane;this.path=path;this.wp=1;this.r=index===3?15:13;
    this.maxHp=index===3?480:390;this.hp=this.maxHp;this.atk=index===3?50:42;this.ms=94;this.cool=0;this.xpReward=index===3?70:45;this.goldReward=index===3?65:40;
    if(state.pitBuffUntil[team]>state.time){this.maxHp*=1.15;this.hp=this.maxHp;this.atk*=1.15;}
  }
  update(dt){
    if(this.dead)return;this.cool-=dt;
    const targets=[...units.filter(u=>u!==this&&!u.dead&&u.team!==this.team&&u.team!==NEUTRAL&&dist(this,u)<105),...towers.filter(t=>!t.dead&&t.team!==this.team&&dist(this,t)<112)];
    if(targets.length){targets.sort((a,b)=>dist(this,a)-dist(this,b));const t=targets[0];if(this.cool<=0){if(t instanceof Hero)t.take(this.atk,'physical',this);else if(t instanceof Tower)t.hitByMinion(this.atk,this);else t.damage(this.atk,this);this.cool=1.1;}return;}
    const p=this.path[this.wp];if(!p)return;const n=norm(p.x-this.x,p.y-this.y);this.x+=n.x*this.ms*dt;this.y+=n.y*this.ms*dt;if(dist(this,p)<28)this.wp=Math.min(this.path.length-1,this.wp+1);
  }
  die(src){
    this.dead=true;addEffect('burst',this.x,this.y,{life:.25,color:'#8c778f',radius:35});
    const nearby=units.filter(u=>u instanceof Hero&&!u.dead&&u.team===src?.team&&dist(u,this)<300);
    for(const h of nearby)h.gainXp(this.xpReward);
    if(src instanceof Hero){src.gold+=this.goldReward;const eligible=nearby.filter(h=>h.role!=='ROAMER'&&h.role!=='SUPPORT');if(eligible.length>=2)src.gold+=10;}
  }
}

class JungleCreep extends Entity{
  constructor(camp,kind,index=0){
    super(camp.x+(index?34:-20),camp.y+(index?18:-10),NEUTRAL);this.camp=camp;this.kind=kind;this.index=index;this.r=kind==='buff'?25:kind==='brute'?22:18;
    this.maxHp=kind==='buff'?1500:kind==='brute'?1050:620;this.hp=this.maxHp;this.atk=kind==='buff'?95:kind==='brute'?78:55;this.def=12;this.cool=0;this.aggro=null;this.speed=125;
    this.xpReward=kind==='buff'?220:kind==='brute'?150:90;this.goldReward=kind==='buff'?250:kind==='brute'?170:95;
  }
  hit(raw,src){
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
    if(src instanceof Hero){src.gold+=this.goldReward;src.gainXp(this.xpReward);
      if(this.kind==='buff'){
        if(this.camp.buff==='crimson'){src.crimsonUntil=state.time+90;announce(src.player?'CRIMSON BUFF ACQUIRED':'CRIMSON CLAIMED',.7);}
        if(this.camp.buff==='azure'){src.azureUntil=state.time+90;announce(src.player?'AZURE BUFF ACQUIRED':'AZURE CLAIMED',.7);}
      }
    }
    if(this.camp.creeps.every(c=>c.dead))this.camp.respawnAt=state.time+50;
  }
}

class JungleCamp{
  constructor(x,y,label,kind='small',buff=null){this.x=x;this.y=y;this.label=label;this.kind=kind;this.buff=buff;this.respawnAt=0;this.creeps=[];this.color=buff==='crimson'?'#ad4957':buff==='azure'?'#4d8fb8':'#765682';this.spawn();}
  spawn(){this.creeps=[];if(this.kind==='buff')this.creeps.push(new JungleCreep(this,'buff'));else if(this.kind==='brute')this.creeps.push(new JungleCreep(this,'brute'));else{this.creeps.push(new JungleCreep(this,'small',0),new JungleCreep(this,'small',1));}units.push(...this.creeps);this.respawnAt=0;}
  update(){if(this.respawnAt&&state.time>=this.respawnAt)this.spawn();}
}

class Tower extends Entity{
  constructor(team,lane,slot,x,y,maxHp,dmg,range){super(x,y,team);this.lane=lane;this.slot=slot;this.r=34;this.maxHp=maxHp;this.hp=maxHp;this.baseDmg=dmg;this.range=range;this.cool=0;this.fury=new Map();this.repairUntil=0;this.lastHitByEnemyAt=-999;}
  enemyMinionInRange(attackingTeam){return units.some(u=>u instanceof Minion&&!u.dead&&u.team===attackingTeam&&dist(this,u)<this.range);}
  backdoorAgainst(attackerTeam){return !this.enemyMinionInRange(attackerTeam);}
  hitByHero(raw,hero){const back=this.backdoorAgainst(hero.team);const dmg=raw*(back?.05:1);this.lastHitByEnemyAt=state.time;this.damage(dmg,hero);if(back){this.repairUntil=state.time+2;floatText(this.x,this.y-60,'95% BLOCKED','#d9b5ed',13);}}
  hitByMinion(raw,min){this.damage(raw,min);}
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
    if(!denied&&src instanceof Hero&&src.team!==this.team)src.gold+=350;
  }
}

class Core extends Entity{
  constructor(team,x,y){super(x,y,team);this.r=56;this.maxHp=18000;this.hp=this.maxHp;}
  vulnerable(){return towers.filter(t=>t.team===this.team&&!t.dead).length===0;}
}

class Pitlord extends Entity{
  constructor(){super(2100,1290,NEUTRAL);this.r=62;this.maxHp=10000;this.hp=this.maxHp;this.atk=170;this.def=18;this.cool=0;this.aggro=null;}
  hit(raw,src){const dmg=raw*100/(100+this.def);if(src instanceof Hero)this.aggro=src;this.damage(dmg,src);addEffect('hit',this.x,this.y,{life:.18,color:'#bd6fce',radius:76});}
  update(dt){if(this.dead)return;this.cool-=dt;const target=this.aggro&&!this.aggro.dead&&dist(this,this.aggro)<420?this.aggro:units.filter(u=>u instanceof Hero&&!u.dead&&dist(this,u)<190)[0];if(target&&this.cool<=0){target.take(this.atk,'physical',this);this.cool=1.15;addEffect('burst',target.x,target.y,{life:.2,color:'#7a3a88',radius:50});}}
  die(src){this.dead=true;addEffect('burst',this.x,this.y,{life:1.0,color:'#954aab',radius:190});if(src instanceof Hero){state.pitBuffUntil[src.team]=state.time+90;src.gold+=300;src.gainXp(250);announce('THE RIFT BOWS TO YOUR WILL',1.6);}}
}

function placeStructures(){
  const hp=[6000,7500,9500,11000], dmg=[240,290,350,420], rng=[230,240,250,260], progress=[.20,.42,.73,.86];
  for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2]){
    const path=team===TEAM_A?LANES[lane]:revPath(LANES[lane]);
    for(let i=0;i<4;i++){const p=pointAlongPath(path,progress[i]);towers.push(new Tower(team,lane,i+1,p.x,p.y,hp[i],dmg[i],rng[i]));}
  }
  cores.push(new Core(TEAM_A,BASES[0].x,BASES[0].y),new Core(TEAM_B,BASES[1].x,BASES[1].y));
}

function placeCamps(){
  const data=[
    [920,1700,'Crimson Guardian','buff','crimson'],[1260,1450,'Rift Wolves','small'],[1450,1870,'Stone Brute','brute'],
    [1740,1580,'Azure Guardian','buff','azure'],[2040,1910,'Grave Beasts','small'],[2280,1630,'Rift Brute','brute'],
    [3280,900,'Crimson Guardian','buff','crimson'],[2940,1140,'Rift Wolves','small'],[2770,720,'Stone Brute','brute'],
    [2470,1010,'Azure Guardian','buff','azure'],[2200,700,'Grave Beasts','small'],[1930,970,'Rift Brute','brute']
  ];
  for(const d of data)camps.push(new JungleCamp(...d));
}

placeStructures();placeCamps();

const player=new Hero(BASES[0].x+70,BASES[0].y-50,TEAM_A,'RAMZX',true,'EXP');units.push(player);
const allyNames=[['SERA','SUPPORT',1],['KAIRO','GOLD',2],['GRIMM','ROAMER',1],['VOLKRIN','JUNGLE',2]];
for(let i=0;i<allyNames.length;i++){const [n,r,l]=allyNames[i];const h=new Hero(BASES[0].x+30+i*24,BASES[0].y+40+i*20,TEAM_A,n,false,r);h.lane=l;h.maxHp=r==='ROAMER'?3300:2600;h.hp=h.maxHp;h.aiMode=r;units.push(h);}
const enemyNames=[['NYRA','JUNGLE',1],['VEYRA','TACTICAL',1],['KAELOR','EXP',1],['RAZE','GOLD',2],['SERA','SUPPORT',2]];
for(let i=0;i<enemyNames.length;i++){const [n,r,l]=enemyNames[i];const h=new Hero(BASES[1].x-40-i*24,BASES[1].y+40+i*18,TEAM_B,n,false,r);h.lane=l;h.maxHp=r==='SUPPORT'?2900:2550;h.hp=h.maxHp;units.push(h);}

function spawnWave(){
  for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2])for(let i=0;i<4;i++)units.push(new Minion(team,lane,i));
  tone(190,.04,'triangle',.012);
}
function spawnPitlord(debug=false){if(state.pitlord&&!state.pitlord.dead)return;state.pitlord=new Pitlord();announce(debug?'PITLORD SUMMONED':'THE RIFT TREMBLES… PITLORD HAS AWAKENED!',1.8);}

const keys=new Set();
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys.add(k);if(e.key===' ')e.preventDefault();
  if(k==='j'||e.key===' ')player.basicAttack();
  if(k==='1'||k==='q')player.s1();
  if(k==='2')player.s2();
  if(k==='3'||k==='e')player.s3();
  if(k==='4'||k==='r')player.ult();
  if(k==='f')tryDeny();if(k==='p')spawnPitlord(true);if(k==='l')player.forceLevel4();
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

document.querySelectorAll('.skill').forEach(b=>b.addEventListener('pointerdown',e=>{
  e.preventDefault();const a=b.dataset.action;if(a==='attack')player.basicAttack();if(a==='s1')player.s1();if(a==='s2')player.s2();if(a==='s3')player.s3();if(a==='ult')player.ult();if(a==='deny')tryDeny();
}));
levelBtn.onclick=()=>player.forceLevel4();pitBtn.onclick=()=>spawnPitlord(true);

function updatePlayer(dt){
  if(player.dead)return;
  let x=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joyVec.x;
  let y=(keys.has('s')?1:0)-(keys.has('w')?1:0)+joyVec.y;
  if(x||y){const n=norm(x,y);player.facing=Math.atan2(n.y,n.x);player.x=clamp(player.x+n.x*player.speed()*dt,45,WORLD_W-45);player.y=clamp(player.y+n.y*player.speed()*dt,45,WORLD_H-45);}
}

function updateEffects(dt){
  for(const e of state.effects)e.life-=dt;state.effects=state.effects.filter(e=>e.life>0);
  for(const f of state.floating){f.life-=dt;f.y-=28*dt;}state.floating=state.floating.filter(f=>f.life>0);
  state.screenShake=Math.max(0,state.screenShake-dt);
}
function updateCamera(){
  const maxX=WORLD_W-VIEW_W,maxY=WORLD_H-VIEW_H;
  state.camera.x=clamp(player.x-VIEW_W/2,0,maxX);state.camera.y=clamp(player.y-VIEW_H/2,0,maxY);
  if(state.screenShake>0){state.camera.x+=Math.random()*8-4;state.camera.y+=Math.random()*8-4;}
}
function updateUI(){
  const mins=Math.floor(state.time/60),secs=Math.floor(state.time%60);
  info.textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} · ${player.role} · Lv ${player.level} · ${Math.floor(player.gold)}g`;
  const remain=Math.max(0,210-state.time);pitBanner.textContent=state.pitlord?(state.pitlord.dead?'PITLORD: DEFEATED':`PITLORD: ${Math.ceil(state.pitlord.hp)} HP`):`PITLORD: DORMANT · ${Math.floor(remain/60)}:${String(Math.ceil(remain%60)).padStart(2,'0')}`;
  hpText.textContent=`${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`;hpFill.style.width=`${Math.max(0,player.hp/player.maxHp*100)}%`;shieldFill.style.width=`${Math.min(100,player.shield/player.maxHp*100)}%`;
  const buffs=[];if(player.crimsonUntil>state.time)buffs.push(`<span class="buff crimson">CRIMSON ${Math.ceil(player.crimsonUntil-state.time)}s</span>`);if(player.azureUntil>state.time)buffs.push(`<span class="buff azure">AZURE ${Math.ceil(player.azureUntil-state.time)}s</span>`);if(state.pitBuffUntil[player.team]>state.time)buffs.push(`<span class="buff pit">PITLORD ${Math.ceil(state.pitBuffUntil[player.team]-state.time)}s</span>`);buffBar.innerHTML=buffs.join('');
  for(const b of document.querySelectorAll('.skill[data-action]')){const a=b.dataset.action,cd=a==='attack'?player.cool.attack:(a==='deny'?0:player.cool[a]);b.classList.toggle('cooling',cd>0);b.classList.toggle('locked',a==='ult'&&player.level<4);b.dataset.cd=cd>0?Math.ceil(cd):'';}
}

function update(dt){
  if(state.gameOver)return;state.time+=dt;
  if(state.lastWave<0&&state.time>=.5){spawnWave();state.lastWave=.5;}else if(state.time-state.lastWave>=20){spawnWave();state.lastWave+=20;}
  if(!state.pitlord&&state.time>=210)spawnPitlord();
  updatePlayer(dt);
  for(const u of [...units])u.update?.(dt);
  for(const t of towers)t.update(dt);
  for(const c of camps)c.update();
  state.pitlord?.update(dt);
  for(let i=units.length-1;i>=0;i--){const u=units[i];if(u.dead&&!(u instanceof Hero)&&!(u instanceof JungleCreep))units.splice(i,1);}
  updateEffects(dt);updateCamera();updateUI();
}

function drawPath(path,color,width){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();const a=screenPos(path[0].x,path[0].y);ctx.moveTo(a.x,a.y);for(const p of path.slice(1)){const s=screenPos(p.x,p.y);ctx.lineTo(s.x,s.y)}ctx.stroke();
}
function drawWorldBackground(){
  ctx.fillStyle='#121118';ctx.fillRect(0,0,VIEW_W,VIEW_H);
  const grid=140;ctx.strokeStyle='#242229';ctx.lineWidth=1;
  const sx=-(state.camera.x%grid),sy=-(state.camera.y%grid);
  for(let x=sx;x<VIEW_W;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,VIEW_H);ctx.stroke();}
  for(let y=sy;y<VIEW_H;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(VIEW_W,y);ctx.stroke();}
  drawPath(lane1,'#5c5261',82);drawPath(lane1,'#29252d',7);drawPath(lane2,'#5f574c',82);drawPath(lane2,'#2a2724',7);
  // Central Rift route
  const rs=screenPos(930,1900),re=screenPos(3230,650);ctx.strokeStyle='#6e3e7e';ctx.lineWidth=13;ctx.setLineDash([24,18]);ctx.beginPath();ctx.moveTo(rs.x,rs.y);ctx.lineTo(re.x,re.y);ctx.stroke();ctx.setLineDash([]);
  // Water
  for(const z of waterZones){const s=screenPos(z.x,z.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(z.rot);ctx.beginPath();ctx.ellipse(0,0,z.rx,z.ry,0,0,Math.PI*2);ctx.fillStyle='#16313a';ctx.fill();ctx.strokeStyle='#245160';ctx.lineWidth=5;ctx.stroke();for(let i=-2;i<=2;i++){ctx.strokeStyle='#2c6574aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-z.rx*.65,i*34);ctx.quadraticCurveTo(0,i*34+18,z.rx*.65,i*34);ctx.stroke();}ctx.restore();}
  for(const z of bridgeZones){const s=screenPos(z.x,z.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(z.rot);ctx.fillStyle='#514335';ctx.fillRect(-z.w/2,-z.h/2,z.w,z.h);ctx.strokeStyle='#806a50';ctx.lineWidth=4;for(let x=-z.w/2;x<z.w/2;x+=32){ctx.beginPath();ctx.moveTo(x,-z.h/2);ctx.lineTo(x,z.h/2);ctx.stroke();}ctx.restore();}
  // bases
  for(let team=0;team<2;team++){const b=screenPos(BASES[team].x,BASES[team].y);ctx.beginPath();ctx.fillStyle=team===0?'#183b4d':'#4d1b24';ctx.arc(b.x,b.y,150,0,Math.PI*2);ctx.fill();ctx.strokeStyle=TEAM_COLORS[team];ctx.lineWidth=5;ctx.stroke();}
  // pit ring
  const p=screenPos(2100,1290);ctx.beginPath();ctx.fillStyle='#201326';ctx.arc(p.x,p.y,130,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7f4790';ctx.lineWidth=7;ctx.stroke();ctx.fillStyle='#c69ed0';ctx.font='800 16px system-ui';ctx.textAlign='center';ctx.fillText('PITLORD',p.x,p.y+5);ctx.textAlign='left';
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
  if(u.dead)return;const s=screenPos(u.x,u.y);if(s.x<-100||s.x>VIEW_W+100||s.y<-100||s.y>VIEW_H+100)return;
  if(u instanceof Minion){ctx.beginPath();ctx.fillStyle=TEAM_COLORS[u.team];ctx.arc(s.x,s.y,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;ctx.stroke();hpbar(u,34);return;}
  if(u instanceof JungleCreep){ctx.beginPath();ctx.fillStyle=u.camp.color;ctx.arc(s.x,s.y,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e7d8eb88';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillText(u.kind==='buff'?'BUFF':u.kind==='brute'?'BRUTE':'CREEP',s.x,s.y+3);ctx.textAlign='left';hpbar(u,48);return;}
  if(u instanceof Hero){
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(u.facing);ctx.beginPath();ctx.fillStyle=u.team===TEAM_A?'#7bd3ff':'#ff7b85';ctx.arc(0,0,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=u.player?'#fff':'#f5dfe855';ctx.lineWidth=u.player?4:2;ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(7,-4,26,8);ctx.restore();
    ctx.fillStyle='#fff';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText(`${u.name} · ${u.level}`,s.x,s.y+4);ctx.textAlign='left';hpbar(u,72);return;
  }
}
function drawTower(t){
  if(t.dead)return;const s=screenPos(t.x,t.y);if(s.x<-100||s.x>VIEW_W+100||s.y<-100||s.y>VIEW_H+100)return;
  const back=t.backdoorAgainst(1-t.team);ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle=t.team===0?'#2f6d8d':'#8d3540';ctx.fillRect(-24,-38,48,76);ctx.fillStyle='#c4b2ca';ctx.fillRect(-15,-54,30,20);ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeRect(-24,-38,48,76);if(back){ctx.strokeStyle='#b163c7';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,52,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#fff';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText(`T${t.slot}`,0,4);ctx.textAlign='left';ctx.restore();hpbar(t,84);
}
function drawCore(c){const s=screenPos(c.x,c.y);ctx.beginPath();ctx.fillStyle=c.team===0?'#22506a':'#6a2630';ctx.arc(s.x,s.y,c.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c.vulnerable()?'#fff':'#c39acf';ctx.lineWidth=6;ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(c.vulnerable()?'CORE':'CORE SHIELDED',s.x,s.y+4);ctx.textAlign='left';hpbar(c,100);}
function drawPitlord(){
  if(!state.pitlord||state.pitlord.dead)return;const p=state.pitlord,s=screenPos(p.x,p.y);ctx.beginPath();ctx.fillStyle='#703682';ctx.arc(s.x,s.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e3c7ea';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.fillText('PITLORD',s.x,s.y+5);ctx.textAlign='left';hpbar(p,130);
}
function drawEffects(){
  for(const e of state.effects){const k=e.life/e.max,s=screenPos(e.x,e.y);ctx.save();ctx.globalAlpha=Math.min(1,k*1.7);if(e.type==='slash'){ctx.strokeStyle=e.color;ctx.lineWidth=12*k+2;ctx.beginPath();ctx.arc(s.x,s.y,e.radius,-.65+e.angle,.65+e.angle);ctx.stroke();}else if(e.type==='cone'){ctx.fillStyle=e.color+'55';ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.arc(s.x,s.y,e.radius,e.angle-.82,e.angle+.82);ctx.closePath();ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=4;ctx.stroke();}else if(e.type==='ring'){ctx.strokeStyle=e.color;ctx.lineWidth=7*k+1;ctx.beginPath();ctx.arc(s.x,s.y,e.radius*(1-k*.15),0,Math.PI*2);ctx.stroke();}else if(e.type==='burst'||e.type==='hit'){ctx.fillStyle=e.color+'88';ctx.beginPath();ctx.arc(s.x,s.y,e.radius*(1-k*.5),0,Math.PI*2);ctx.fill();}else if(e.type==='dash'){const q=screenPos(e.x2,e.y2);ctx.strokeStyle=e.color;ctx.lineWidth=18*k;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(q.x,q.y);ctx.stroke();}else if(e.type==='mark'){ctx.strokeStyle=e.color;ctx.lineWidth=6;ctx.beginPath();ctx.arc(s.x,s.y,e.radius*(1.15-k*.15),0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(s.x-e.radius,s.y);ctx.lineTo(s.x+e.radius,s.y);ctx.stroke();}else if(e.type==='miss'){ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(s.x,s.y,12,0,Math.PI*2);ctx.fill();}ctx.restore();}
  for(const f of state.floating){const s=screenPos(f.x,f.y);ctx.save();ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font=`900 ${f.size}px system-ui`;ctx.textAlign='center';ctx.fillText(f.text,s.x,s.y);ctx.restore();}
}
function drawMinimap(){
  const w=minimap.width,h=minimap.height,sx=w/WORLD_W,sy=h/WORLD_H;mctx.clearRect(0,0,w,h);mctx.fillStyle='#0d0c11';mctx.fillRect(0,0,w,h);
  function mp(path,color){mctx.strokeStyle=color;mctx.lineWidth=4;mctx.beginPath();mctx.moveTo(path[0].x*sx,path[0].y*sy);for(const p of path.slice(1))mctx.lineTo(p.x*sx,p.y*sy);mctx.stroke();}
  mp(lane1,'#63586a');mp(lane2,'#6c6255');mctx.strokeStyle='#633973';mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(930*sx,1900*sy);mctx.lineTo(3230*sx,650*sy);mctx.stroke();
  for(const t of towers){if(t.dead)continue;mctx.fillStyle=TEAM_COLORS[t.team];mctx.fillRect(t.x*sx-2,t.y*sy-2,4,4);}
  for(const c of camps){mctx.fillStyle=c.color;mctx.beginPath();mctx.arc(c.x*sx,c.y*sy,2.2,0,Math.PI*2);mctx.fill();}
  for(const u of units){if(!(u instanceof Hero)||u.dead)continue;mctx.fillStyle=u.player?'#fff':TEAM_COLORS[u.team];mctx.beginPath();mctx.arc(u.x*sx,u.y*sy,u.player?4:2.6,0,Math.PI*2);mctx.fill();}
  mctx.strokeStyle='#ffffff55';mctx.strokeRect(state.camera.x*sx,state.camera.y*sy,VIEW_W*sx,VIEW_H*sy);
}
function draw(){
  drawWorldBackground();for(const c of camps)drawCamp(c);for(const c of cores)drawCore(c);for(const t of towers)drawTower(t);drawPitlord();for(const u of units)drawEntity(u);drawEffects();drawMinimap();
}

let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop);}
announce('WELCOME TO TWISTED RIFT! YOUR JOURNEY BEGINS!',2.1);requestAnimationFrame(loop);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

})();
