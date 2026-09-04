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
const heroNameEl = document.getElementById('heroName');
const heroRoleEl = document.getElementById('heroRole');
const inventoryStrip = document.getElementById('inventoryStrip');
const heroSelectPanel = document.getElementById('heroSelectPanel');
const heroGrid = document.getElementById('heroGrid');
const shopPanel = document.getElementById('shopPanel');
const shopBtn = document.getElementById('shopBtn');
const closeShopBtn = document.getElementById('closeShopBtn');
const shopItemsEl = document.getElementById('shopItems');
const shopFiltersEl = document.getElementById('shopFilters');
const shopGoldEl = document.getElementById('shopGold');
const goldBtn = document.getElementById('goldBtn');

const VIEW_W = 1280, VIEW_H = 720;
const WORLD_W = 9600, WORLD_H = 9600;
const TEAM_A = 0, TEAM_B = 1, NEUTRAL = 2;
const TEAM_COLORS = ['#67caff', '#ff6976'];

// v0.6 keeps the approved v0.5 source of truth: a large SQUARE battlefield with diagonal bases,
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
  started: false,
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

const HERO_DEFS = {
  RAMZX:{title:'The Dread Marshal',slot:'EXP',role:'EXP',damage:'physical',hp:3100,hpGrowth:185,atk:132,atkGrowth:7.5,magic:0,magicGrowth:0,def:28,defGrowth:2.1,mdef:20,mdefGrowth:1.5,ms:305,range:185,atkCd:.82,color:'#a84f60',skills:['SEVER','IRON ORDER','EXECUTION STEP','DEADLINE']},
  NYRA:{title:'Veil of Death',slot:'JUNGLE',role:'JUNGLE',damage:'physical',hp:2450,hpGrowth:150,atk:126,atkGrowth:7.2,magic:0,magicGrowth:0,def:21,defGrowth:1.6,mdef:17,mdefGrowth:1.3,ms:330,range:165,atkCd:.72,color:'#765090',skills:['NIGHT CUT','BLACK MIST','MARKED SILENCE','NO WITNESS']},
  KAELOR:{title:'The Iron Revenant',slot:'EXP',role:'EXP',damage:'physical',hp:3000,hpGrowth:180,atk:138,atkGrowth:7.8,magic:0,magicGrowth:0,def:27,defGrowth:2,mdef:18,mdefGrowth:1.4,ms:300,range:180,atkCd:.88,color:'#9a5f45',skills:['IRON SWEEP','BREAK THE LINE','VENGEANCE GUARD','WARMAKER']},
  VEYRA:{title:'Mistress of the Void',slot:'TACTICAL',role:'TACTICAL',damage:'magic',hp:2350,hpGrowth:135,atk:88,atkGrowth:4.5,magic:135,magicGrowth:8.2,def:19,defGrowth:1.4,mdef:22,mdefGrowth:1.7,ms:310,range:370,atkCd:.94,color:'#834aae',skills:['VOID LANCE','FRACTURE','RIFT GATE','COLLAPSE']},
  GRIMM:{title:'The Black Bastion',slot:'ROAMER',role:'ROAMER',damage:'physical',hp:3600,hpGrowth:210,atk:105,atkGrowth:5.2,magic:0,magicGrowth:0,def:35,defGrowth:2.6,mdef:25,mdefGrowth:2.0,ms:285,range:165,atkCd:1.0,color:'#59626d',skills:['CHAIN HAMMER','BASTION WALL','HOLD THE LINE','NONE SHALL PASS']},
  SERA:{title:'The Last Saint',slot:'TACTICAL',role:'SUPPORT',damage:'magic',hp:2550,hpGrowth:150,atk:86,atkGrowth:4.2,magic:120,magicGrowth:7.0,def:22,defGrowth:1.6,mdef:24,mdefGrowth:1.8,ms:310,range:350,atkCd:.96,color:'#d1b77a',skills:['SACRED BOLT','SANCTUARY','GUARDIAN GRACE','SECOND DAWN']},
  KAIRO:{title:'The Rift Ranger',slot:'GOLD',role:'GOLD',damage:'physical',hp:2350,hpGrowth:135,atk:118,atkGrowth:7.8,magic:0,magicGrowth:0,def:18,defGrowth:1.3,mdef:16,mdefGrowth:1.2,ms:315,range:460,atkCd:.68,color:'#5f91a9',skills:['PIERCING ROUND','COMBAT ROLL','HUNTER SCOPE','FINAL CALIBER']},
  RAZE:{title:'The Scarlet Outlaw',slot:'GOLD',role:'GOLD',damage:'physical',hp:2450,hpGrowth:145,atk:121,atkGrowth:7.5,magic:0,magicGrowth:0,def:20,defGrowth:1.4,mdef:17,mdefGrowth:1.2,ms:325,range:390,atkCd:.62,color:'#b14f4f',skills:['CROSSFIRE','GUNSMOKE','BOUNTY MARK','BULLET REQUIEM']},
  VOLKRIN:{title:'Beast of the Rift',slot:'JUNGLE',role:'JUNGLE',damage:'physical',hp:2900,hpGrowth:175,atk:130,atkGrowth:7.4,magic:0,magicGrowth:0,def:26,defGrowth:1.9,mdef:20,mdefGrowth:1.5,ms:320,range:175,atkCd:.78,color:'#6e7643',skills:['REND','PREDATOR LEAP','BLOOD SCENT','UNCHAINED']},
  ZYREL:{title:'Storm Heretic',slot:'TACTICAL',role:'TACTICAL',damage:'magic',hp:2400,hpGrowth:140,atk:92,atkGrowth:4.8,magic:130,magicGrowth:8.0,def:20,defGrowth:1.5,mdef:18,mdefGrowth:1.4,ms:325,range:330,atkCd:.85,color:'#5d74a9',skills:['ARC BLADE','FLASHSTEP','STORM PRISON','HEAVENFALL']}
};

const ITEM_DEFS = [
  {id:'dreadcleaver',name:'Dreadcleaver',cat:'Weapons',cost:3100,stats:{atk:55,hp:350},desc:'Repeated pressure weapon. +55 Attack, +350 HP.'},
  {id:'bloodfang',name:'Bloodfang Edge',cat:'Weapons',cost:3300,stats:{atk:65,lifesteal:.15},desc:'+65 Attack and 15% Lifesteal.'},
  {id:'riftpiercer',name:'Riftpiercer',cat:'Weapons',cost:3450,stats:{atk:70,pen:25},desc:'+70 Attack and 25 Physical Penetration.'},
  {id:'headsman',name:"Headsman's Oath",cat:'Weapons',cost:3600,stats:{atk:90,executeBonus:.12},desc:'+90 Attack; +12% damage to heroes below 35% HP.'},
  {id:'voidglass',name:'Voidglass Scepter',cat:'Arcana',cost:3250,stats:{magic:75,magicPen:25},desc:'+75 Magic Power and 25 Magic Penetration.'},
  {id:'ashen',name:'Ashen Codex',cat:'Arcana',cost:3050,stats:{magic:60,cdr:.12},desc:'+60 Magic Power and 12% Cooldown Reduction.'},
  {id:'witchfire',name:'Witchfire Crown',cat:'Arcana',cost:3500,stats:{magic:105},desc:'Pure arcane force: +105 Magic Power.'},
  {id:'grimoire',name:'Grimoire of Ruin',cat:'Arcana',cost:3600,stats:{magic:80,burn:.04},desc:'+80 Magic Power; damaging skills add a small burn.'},
  {id:'dreadplate',name:'Dreadplate',cat:'Armor',cost:3100,stats:{hp:650,def:55},desc:'+650 HP and +55 Physical Defense.'},
  {id:'runeguard',name:'Runeguard Mantle',cat:'Armor',cost:3100,stats:{hp:600,mdef:55},desc:'+600 HP and +55 Magic Defense.'},
  {id:'thornbound',name:'Thornbound Plate',cat:'Armor',cost:3300,stats:{hp:500,def:65,thorns:.08},desc:'+500 HP, +65 Defense; reflects a small amount of hero damage.'},
  {id:'gravewarden',name:'Gravewarden Aegis',cat:'Armor',cost:3500,stats:{hp:600,def:30,mdef:30,lowShield:.18},desc:'Mixed defense; grants an emergency shield at low HP.'},
  {id:'saintlantern',name:"Saint's Lantern",cat:'Relics',cost:2750,stats:{hp:450,magic:35,healPower:.18,cdr:.08},desc:'+18% healing strength with HP, Magic Power and CDR.'},
  {id:'oathbell',name:'Oathkeeper Bell',cat:'Relics',cost:2900,stats:{hp:500,def:20,mdef:20},desc:'Balanced aura-style support defenses.'},
  {id:'pilgrimsigil',name:"Pilgrim's Sigil",cat:'Relics',cost:2600,stats:{hp:300,ms:25,cdr:.10},desc:'Movement + cooldown utility for rotations.'},
  {id:'mercycrown',name:'Crown of Mercy',cat:'Relics',cost:3300,stats:{hp:450,magic:40,healPower:.22,ms:15},desc:'Stronger heals and faster support movement.'},
  {id:'beastfang',name:'Beastfang',cat:'Hunt',cost:800,stats:{atk:20,jungleDamage:.20},desc:'Jungle starter; bonus monster damage works for Junglers.'},
  {id:'bloodhunter',name:'Bloodhunter Fang',cat:'Hunt',cost:3000,stats:{atk:60,hp:300,jungleDamage:.30},desc:'Fighter Jungler item: Attack, HP and monster damage.'},
  {id:'shadeclaw',name:'Shadeclaw',cat:'Hunt',cost:3100,stats:{atk:70,pen:18,ms:10,jungleDamage:.30},desc:'Assassin Jungler item: Attack, penetration and speed.'},
  {id:'titanhunter',name:'Titan Hunter',cat:'Hunt',cost:3000,stats:{hp:650,def:35,jungleDamage:.25},desc:'Durable Jungler item with monster damage.'},
  {id:'warboots',name:'War Boots',cat:'Boots',cost:1050,stats:{ms:35,def:20},desc:'+35 Movement Speed and +20 Physical Defense.'},
  {id:'runeboots',name:'Rune Boots',cat:'Boots',cost:1050,stats:{ms:35,mdef:20},desc:'+35 Movement Speed and +20 Magic Defense.'},
  {id:'arcanesteps',name:'Arcane Steps',cat:'Boots',cost:1200,stats:{ms:35,magicPen:18},desc:'+35 Movement Speed and Magic Penetration.'},
  {id:'berserker',name:'Berserker Greaves',cat:'Boots',cost:1200,stats:{ms:35,attackSpeed:.18},desc:'+35 Movement Speed and +18% Attack Speed.'}
];
const ITEM_BY_ID = Object.fromEntries(ITEM_DEFS.map(i=>[i.id,i]));
function heroDef(name){ return HERO_DEFS[name]||HERO_DEFS.RAMZX; }
function itemMods(hero){
  const out={atk:0,hp:0,def:0,mdef:0,magic:0,ms:0,cdr:0,lifesteal:0,spellVamp:0,pen:0,magicPen:0,attackSpeed:0,crit:0,healPower:0,jungleDamage:0,executeBonus:0,burn:0,thorns:0,lowShield:0};
  for(const id of hero.inventory||[]){const st=ITEM_BY_ID[id]?.stats||{};for(const [k,v] of Object.entries(st))out[k]=(out[k]||0)+v;}
  return out;
}

class Hero extends Entity{
  constructor(x,y,team,name='RAMZX',player=false,role=null){
    super(x,y,team);this.name=name;this.player=player;this.r=26;this.inventory=[];
    this.level=1;this.gold=0;this.xp=0;this.shield=0;this.facing=team===TEAM_A?-.45:2.7;
    this.cool={s1:0,s2:0,s3:0,ult:0,attack:0};this.respawnAt=0;this.botThink=0;this.pathWp=1;
    this.targetMark=null;this.crimsonUntil=0;this.azureUntil=0;this.aiMode='lane';this.aiCampIndex=0;this.aiTargetCamp=null;this.aiRetreat=false;
    this.kills=0;this.deaths=0;this.assists=0;this.heroDamage=0;this.towerDamage=0;this.damageTaken=0;this.pitlordParticipation=0;
    this.killStreak=0;this.rapidKills=0;this.lastKillAt=-999;this.lastCombatAt=-999;this.nextBuyCheck=25;this.stunUntil=0;this.silenceUntil=0;this.slowUntil=0;this.speedBuffUntil=0;this.attackBuffUntil=0;this.damageReduceUntil=0;this.rangeBuffUntil=0;this.transformUntil=0;this.guardUntil=0;this.lowShieldReady=true;
    this.applyDefinition(name,false,role);
  }
  applyDefinition(name,keepInventory=true,roleOverride=null){
    const oldMax=this.maxHp||0, oldHp=this.hp||0;this.name=name;this.defn=heroDef(name);this.slot=this.defn.slot;this.role=roleOverride||this.defn.role;this.lane=this.slot==='GOLD'?2:1;
    if(!keepInventory)this.inventory=[];this.recalcStats(false);this.hp=oldMax?Math.min(this.maxHp,oldHp+Math.max(0,this.maxHp-oldMax)):this.maxHp;this.shield=0;
  }
  recalcStats(preserveMissing=true){
    const d=this.defn||heroDef(this.name),m=itemMods(this),oldMax=this.maxHp||d.hp,missing=Math.max(0,oldMax-(this.hp||oldMax));
    this.maxHp=(d.hp+d.hpGrowth*(this.level-1)+m.hp)*(this.name==='VOLKRIN'&&this.transformUntil>state.time?1.15:1);this.atk=d.atk+d.atkGrowth*(this.level-1)+m.atk;this.magic=d.magic+d.magicGrowth*(this.level-1)+m.magic;
    this.def=d.def+d.defGrowth*(this.level-1)+m.def;this.mdef=d.mdef+d.mdefGrowth*(this.level-1)+m.mdef;this.ms=d.ms+m.ms;this.attackRange=d.range+(this.rangeBuffUntil>state.time?120:0);this.attackCd=d.atkCd/(1+m.attackSpeed);
    this.cdr=Math.min(.40,m.cdr);this.lifesteal=m.lifesteal+(this.name==='KAELOR'&&this.transformUntil>state.time?.20:0);this.spellVamp=m.spellVamp;this.pen=m.pen;this.magicPen=m.magicPen;this.healPower=1+m.healPower;this.jungleDamage=(this.role==='JUNGLE'?m.jungleDamage:0)+(this.name==='VOLKRIN'?.20:0);this.executeBonus=m.executeBonus;this.burn=m.burn;this.thorns=m.thorns;this.lowShield=m.lowShield;
    if(preserveMissing)this.hp=Math.max(1,this.maxHp-missing);else if(!this.hp)this.hp=this.maxHp;
  }
  setCd(key,seconds){this.cool[key]=seconds*(1-this.cdr);}
  disabled(){return this.dead||this.stunUntil>state.time;}
  silenced(){return this.silenceUntil>state.time;}
  take(raw,type='physical',src=null){
    if(this.dead)return;let dmg=raw;if(type==='physical')dmg=raw*100/(100+Math.max(-60,this.def-(src?.pen||0)));if(type==='magic')dmg=raw*100/(100+Math.max(-60,this.mdef-(src?.magicPen||0)));
    if(this.damageReduceUntil>state.time)dmg*=.82;if(this.guardUntil>state.time)dmg*=.60;
    if(src instanceof Hero&&src.team!==this.team){src.heroDamage+=Math.max(0,dmg);src.lastCombatAt=state.time;this.lastCombatAt=state.time;}
    this.damageTaken+=Math.max(0,dmg);if(this.shield>0){const used=Math.min(this.shield,dmg);this.shield-=used;dmg-=used;}
    if(dmg>0)this.damage(dmg,src);
    if(!this.dead&&this.lowShield&&this.lowShieldReady&&this.hp/this.maxHp<=.28){this.lowShieldReady=false;this.shield+=this.maxHp*this.lowShield;addEffect('ring',this.x,this.y,{life:.5,color:'#b895cf',radius:105});setTimeout(()=>this.lowShieldReady=true,45000);}
    if(src instanceof Hero&&this.thorns>0&&!src.dead){src.damage(Math.max(1,dmg*this.thorns),this);}
  }
  die(src){
    const victimStreak=this.killStreak;this.dead=true;this.deaths++;this.killStreak=0;const late=Math.min(18,state.time/60*1.6),levelPart=Math.min(24,this.level*1.75);this.respawnAt=state.time+Math.min(50,6+late+levelPart);addEffect('burst',this.x,this.y,{life:.7,color:'#6f516f',radius:72});
    let killer=(src instanceof Hero&&src.team!==this.team)?src:null;if(!killer){const recent=[...this.damageLog.entries()].filter(([h,t])=>h instanceof Hero&&h.team!==this.team&&state.time-t<=8).sort((a,b)=>b[1]-a[1]);killer=recent[0]?.[0]||null;}
    if(killer){const team=killer.team;const participants=units.filter(h=>h instanceof Hero&&!h.dead&&h.team===team&&(h===killer||(this.damageLog.get(h)??-999)>=state.time-8||dist(h,this)<=420));if(!participants.includes(killer))participants.push(killer);const xpEach=killXpForParticipants(participants.length);killer.kills++;killer.killStreak++;state.teamKills[team]++;killer.gold+=500;if(killer.name==='RAZE'&&killer.targetMark?.target===this&&killer.targetMark.until>state.time){killer.gold+=150;floatText(killer.x,killer.y-60,'BOUNTY +150g','#e2c66d',14);}if(state.time-killer.lastKillAt<=8)killer.rapidKills++;else killer.rapidKills=1;killer.lastKillAt=state.time;for(const h of participants){h.gainXp(xpEach);if(h!==killer){h.assists++;h.gold+=earlyEconomy()&&isRoamerRole(h)?250:150;}}
      if(!state.firstBlood){state.firstBlood=true;announce('HA HA HA... BLOODY MESS.',1.5);}else if(victimStreak>=3)announce('CROWN CLEAVED',1.15);else if(this.player)announce('YOU HAVE FALLEN',1.0);else{const multi={2:'TWIN BLADES',3:'EXECUTIONER',4:'WARLORD',5:'SOVEREIGN OF BLOOD'}[killer.rapidKills];const streak={3:'SLAYER',5:'DREAD KNIGHT',7:'MYTHIC MENACE',10:'IMMORTAL TITAN',15:'BLACK SOVEREIGN',20:'DEATHLESS'}[killer.killStreak];announce(multi||streak||'ENEMY SLAIN',1.0);}}
    this.damageLog.clear();
  }
  respawn(){this.dead=false;this.hp=this.maxHp;this.shield=0;this.x=SPAWNS[this.team].x;this.y=SPAWNS[this.team].y;this.pathWp=1;this.damageLog.clear();this.lowShieldReady=true;if(this.player)announce('YOU HAVE RETURNED',.8);}
  gainXp(n){this.xp+=n;const req=[0,100,650,1800,3000,4300,5700,7200,8800,10500,12300,14200,16200,18300,20500];while(this.level<15&&this.xp>=req[this.level]){this.level++;this.recalcStats(true);if(this.player){announce(`LEVEL ${this.level}`,.6);addEffect('ring',this.x,this.y,{life:.65,color:'#d9b6ef',radius:90});}}}
  forceLevel4(){this.xp=Math.max(this.xp,1800);while(this.level<4){this.level++;this.recalcStats(true);}announce('ULTIMATE READY',.8);}
  speed(){const pit=state.pitBuffUntil[this.team]>state.time&&state.time-this.lastCombatAt>3?1.05:1,water=isInWater(this.x,this.y)?.90:1,slow=this.slowUntil>state.time?.72:1,buff=this.speedBuffUntil>state.time?1.18:1,trans=this.transformUntil>state.time?1.15:1;return this.ms*water*pit*slow*buff*trans;}
  update(dt){for(const k in this.cool)this.cool[k]=Math.max(0,this.cool[k]-dt*(this.azureUntil>state.time?1.20:1));if(this.dead){if(state.time>=this.respawnAt)this.respawn();return;}if(dist(this,SPAWNS[this.team])<260)this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.10*dt);if(earlyEconomy()&&isRoamerRole(this)){this.gold+=10*dt;this.gainXp(7*dt);}this.recalcStats(true);if(!this.player){if(state.time>=this.nextBuyCheck){this.nextBuyCheck=state.time+15;this.autoBuy();}this.botAI(dt);}}
  selectTarget(range=this.attackRange,heroFirst=true){let candidates=[];const enemyHeroes=units.filter(u=>u instanceof Hero&&!u.dead&&u.team!==this.team&&dist(this,u)<=range);const enemyMinions=canHeroDamageMinion(this)?units.filter(u=>u instanceof Minion&&!u.dead&&u.team!==this.team&&dist(this,u)<=range):[];const jungle=canHeroDamageJungle(this)?units.filter(u=>u instanceof JungleCreep&&!u.dead&&dist(this,u)<=range):[];const structs=[...towers.filter(t=>!t.dead&&t.team!==this.team&&dist(this,t)<=range),...cores.filter(c=>!c.dead&&c.team!==this.team&&c.vulnerable()&&dist(this,c)<=range)];candidates=heroFirst?[...enemyHeroes,...enemyMinions,...jungle,...structs]:[...enemyMinions,...enemyHeroes,...jungle,...structs];if(state.pitlord&&!state.pitlord.dead&&dist(this,state.pitlord)<=range)candidates.push(state.pitlord);return candidates.sort((a,b)=>dist(this,a)-dist(this,b))[0]||null;}
  enemies(range,heroesOnly=false){return units.filter(u=>!u.dead&&u.team!==this.team&&u.team!==NEUTRAL&&(!heroesOnly||u instanceof Hero)&&dist(this,u)<=range);}
  nearestAlly(range=500){return units.filter(u=>u instanceof Hero&&!u.dead&&u.team===this.team&&u!==this&&dist(this,u)<=range).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0]||null;}
  applySkillDamage(t,raw,type='physical'){if(!t||t.dead)return false;let dmg=raw;if(t instanceof JungleCreep&&this.jungleDamage)dmg*=1+this.jungleDamage;if(t instanceof Hero&&this.executeBonus&&t.hp/t.maxHp<.35)dmg*=1+this.executeBonus;const ok=damageTargetByHero(this,t,dmg,type);if(ok&&this.spellVamp)this.hp=Math.min(this.maxHp,this.hp+raw*this.spellVamp*.5);if(ok&&this.burn&&t instanceof Hero){setTimeout(()=>{if(!t.dead)t.take(raw*this.burn,'magic',this)},350);}return ok;}
  dash(distance,backward=false){const start={x:this.x,y:this.y},a=this.facing+(backward?Math.PI:0),nx=clamp(this.x+Math.cos(a)*distance,45,WORLD_W-45),ny=clamp(this.y+Math.sin(a)*distance,45,WORLD_H-45);if(!isBlocked(nx,ny)){this.x=nx;this.y=ny;}addEffect('dash',start.x,start.y,{life:.32,x2:this.x,y2:this.y,color:this.defn.color});}
  basicAttack(){if(this.disabled()||this.cool.attack>0)return false;const t=this.selectTarget(this.attackRange,true);if(!t){addEffect('miss',this.x+Math.cos(this.facing)*70,this.y+Math.sin(this.facing)*70,{life:.2});return false;}this.cool.attack=this.attackCd;this.facing=Math.atan2(t.y-this.y,t.x-this.x);let dmg=this.atk*(this.crimsonUntil>state.time?1.15:1)*(this.attackBuffUntil>state.time?1.18:1)*(this.transformUntil>state.time?1.20:1);if(this.name==='KAIRO'&&(this._shots=(this._shots||0)+1)%4===0)dmg*=1.35;if(this.name==='RAZE'&&(this._shots=(this._shots||0)+1)%2===0)dmg*=.88;const critChance=itemMods(this).crit||0;if(Math.random()<critChance)dmg*=2;if(t instanceof Hero&&this.executeBonus&&t.hp/t.maxHp<.35)dmg*=1+this.executeBonus;if(t instanceof JungleCreep&&this.jungleDamage)dmg*=1+this.jungleDamage;addEffect(this.attackRange>250?'hit':'slash',t.x,t.y,{life:.18,angle:this.facing,color:this.defn.color,radius:this.attackRange>250?28:85});damageTargetByHero(this,t,dmg,'physical');if(this.lifesteal)this.hp=Math.min(this.maxHp,this.hp+dmg*this.lifesteal);tone(this.attackRange>250?170:118,.055,'square',.02);return true;}
  skillReady(k){if(this.disabled()||this.silenced()||this.cool[k]>0)return false;if(k==='ult'&&this.level<4){if(this.player)floatText(this.x,this.y-50,'ULTIMATE LOCKED','#dcb8e7',16);return false;}return true;}
  s1(){if(!this.skillReady('s1'))return;const n=this.name;
    if(n==='RAMZX'){this.setCd('s1',7);const range=220;addEffect('cone',this.x,this.y,{life:.28,angle:this.facing,color:'#c85562',radius:range});for(const u of this.enemies(range))if(Math.abs(angleDiff(Math.atan2(u.y-this.y,u.x-this.x),this.facing))<.82)this.applySkillDamage(u,220+this.atk*.9,'physical');}
    else if(n==='NYRA'){this.setCd('s1',6);this.dash(180);for(const u of this.enemies(105))this.applySkillDamage(u,165+this.atk*.75,'physical');}
    else if(n==='KAELOR'){this.setCd('s1',6.5);addEffect('ring',this.x,this.y,{life:.28,color:'#b57352',radius:175});for(const u of this.enemies(175))this.applySkillDamage(u,210+this.atk*.8,'physical');}
    else if(n==='VEYRA'){this.setCd('s1',6);const t=this.selectTarget(650,true);if(t){this.facing=Math.atan2(t.y-this.y,t.x-this.x);addEffect('dash',this.x,this.y,{life:.22,x2:t.x,y2:t.y,color:'#9858c2'});this.applySkillDamage(t,190+this.magic*.85,'magic');}}
    else if(n==='GRIMM'){this.setCd('s1',8);const t=this.enemies(380,true).sort((a,b)=>dist(this,a)-dist(this,b))[0];if(t){this.applySkillDamage(t,150+this.atk*.55,'physical');const a=Math.atan2(this.y-t.y,this.x-t.x);t.x+=Math.cos(a)*95;t.y+=Math.sin(a)*95;addEffect('dash',t.x,t.y,{life:.22,x2:this.x,y2:this.y,color:'#8c929a'});}}
    else if(n==='SERA'){this.setCd('s1',6);const ally=this.nearestAlly(420);if(ally&&ally.hp/ally.maxHp<.72){const h=(180+this.magic*.65)*this.healPower;ally.hp=Math.min(ally.maxHp,ally.hp+h);floatText(ally.x,ally.y-45,`+${Math.round(h)}`,'#9ee6b0',15);}else{const t=this.selectTarget(480,true);if(t)this.applySkillDamage(t,170+this.magic*.7,'magic');}}
    else if(n==='KAIRO'){this.setCd('s1',6);const t=this.selectTarget(760,true);if(t){addEffect('dash',this.x,this.y,{life:.18,x2:t.x,y2:t.y,color:'#7cc6e3'});this.applySkillDamage(t,210+this.atk*.95,'physical');}}
    else if(n==='RAZE'){this.setCd('s1',7);addEffect('cone',this.x,this.y,{life:.35,angle:this.facing,color:'#d16060',radius:330});for(const u of this.enemies(330))if(Math.abs(angleDiff(Math.atan2(u.y-this.y,u.x-this.x),this.facing))<.75)this.applySkillDamage(u,190+this.atk*.72,'physical');}
    else if(n==='VOLKRIN'){this.setCd('s1',5.5);const t=this.selectTarget(190,true);if(t){this.applySkillDamage(t,120+this.atk*.55,'physical');this.applySkillDamage(t,120+this.atk*.55,'physical');}}
    else if(n==='ZYREL'){this.setCd('s1',5.5);const t=this.selectTarget(600,true);if(t){addEffect('dash',this.x,this.y,{life:.18,x2:t.x,y2:t.y,color:'#7aa1e7'});this.applySkillDamage(t,180+this.magic*.8,'magic');}}
    tone(100,.12,'sawtooth',.035);
  }
  s2(){if(!this.skillReady('s2'))return;const n=this.name;
    if(n==='RAMZX'){this.setCd('s2',12);this.shield=Math.min(this.maxHp*.30,this.shield+this.maxHp*.12);this.damageReduceUntil=state.time+3;for(const a of units)if(a instanceof Hero&&!a.dead&&a.team===this.team&&a!==this&&dist(this,a)<180)a.shield=Math.min(a.maxHp*.15,a.shield+a.maxHp*.05);addEffect('ring',this.x,this.y,{life:.55,color:'#d5b6ee',radius:120});}
    else if(n==='NYRA'){this.setCd('s2',12);this.speedBuffUntil=state.time+3;addEffect('ring',this.x,this.y,{life:.8,color:'#58336f',radius:210});for(const u of this.enemies(210,true))u.slowUntil=state.time+2;}
    else if(n==='KAELOR'){this.setCd('s2',9);this.dash(210);for(const u of this.enemies(100,true)){this.applySkillDamage(u,170+this.atk*.65,'physical');u.x+=Math.cos(this.facing)*75;u.y+=Math.sin(this.facing)*75;}}
    else if(n==='VEYRA'){this.setCd('s2',9);const t=this.selectTarget(520,true);const x=t?.x??this.x+Math.cos(this.facing)*330,y=t?.y??this.y+Math.sin(this.facing)*330;addEffect('ring',x,y,{life:.6,color:'#9d52bd',radius:155});for(const u of units.filter(u=>!u.dead&&u.team!==this.team&&u.team!==NEUTRAL&&Math.hypot(u.x-x,u.y-y)<155)){this.applySkillDamage(u,220+this.magic*.75,'magic');if(u instanceof Hero)u.slowUntil=state.time+2;}}
    else if(n==='GRIMM'){this.setCd('s2',10);this.guardUntil=state.time+3;this.shield+=this.maxHp*.10;addEffect('ring',this.x,this.y,{life:.7,color:'#85909b',radius:100});}
    else if(n==='SERA'){this.setCd('s2',10);const h=(150+this.magic*.55)*this.healPower;for(const a of units)if(a instanceof Hero&&!a.dead&&a.team===this.team&&dist(this,a)<230){a.hp=Math.min(a.maxHp,a.hp+h);floatText(a.x,a.y-42,`+${Math.round(h)}`,'#a6e6b4',13);}addEffect('ring',this.x,this.y,{life:.7,color:'#d8c98c',radius:230});}
    else if(n==='KAIRO'){this.setCd('s2',8);this.dash(170);this.attackBuffUntil=state.time+2.5;}
    else if(n==='RAZE'){this.setCd('s2',9);this.dash(170,true);this.speedBuffUntil=state.time+2;addEffect('ring',this.x,this.y,{life:.65,color:'#65434d',radius:150});}
    else if(n==='VOLKRIN'){this.setCd('s2',8);this.dash(250);for(const u of this.enemies(120,true))this.applySkillDamage(u,180+this.atk*.65,'physical');}
    else if(n==='ZYREL'){this.setCd('s2',4.5);this.dash(230);}
    tone(190,.12,'triangle',.025);
  }
  s3(){if(!this.skillReady('s3'))return;const n=this.name;
    if(n==='RAMZX'){this.setCd('s3',10);this.dash(230);let t=this.enemies(100,true)[0];if(t){let dmg=180+this.atk*.8;if(t.hp/t.maxHp<.4)dmg*=1.3;this.applySkillDamage(t,dmg,'physical');}}
    else if(n==='NYRA'){this.setCd('s3',11);const t=this.enemies(470,true)[0];if(t){addEffect('mark',t.x,t.y,{life:.7,color:'#7a4b93',radius:58});this.x=t.x-Math.cos(t.facing||0)*55;this.y=t.y-Math.sin(t.facing||0)*55;this.applySkillDamage(t,210+this.atk*.8,'physical');t.silenceUntil=state.time+.8;}}
    else if(n==='KAELOR'){this.setCd('s3',11);this.guardUntil=state.time+2.2;this.shield+=this.maxHp*.08;this.attackBuffUntil=state.time+3;}
    else if(n==='VEYRA'){this.setCd('s3',13);this.dash(330);const ally=this.nearestAlly(170);if(ally){ally.x=this.x-55;ally.y=this.y-20;}addEffect('ring',this.x,this.y,{life:.55,color:'#a55cd0',radius:95});}
    else if(n==='GRIMM'){this.setCd('s3',12);addEffect('ring',this.x,this.y,{life:.5,color:'#747e88',radius:170});for(const u of this.enemies(170,true)){this.applySkillDamage(u,130+this.atk*.45,'physical');u.stunUntil=state.time+1;}}
    else if(n==='SERA'){this.setCd('s3',11);const a=this.nearestAlly(500)||this;a.shield+=a.maxHp*.16;addEffect('ring',a.x,a.y,{life:.6,color:'#e5d595',radius:85});}
    else if(n==='KAIRO'){this.setCd('s3',12);this.rangeBuffUntil=state.time+5;this.recalcStats(true);addEffect('ring',this.x,this.y,{life:.45,color:'#7dc1da',radius:100});}
    else if(n==='RAZE'){this.setCd('s3',12);const t=this.enemies(520,true)[0];if(t){this.targetMark={target:t,until:state.time+8};addEffect('mark',t.x,t.y,{life:1,color:'#d65b60',radius:65});}}
    else if(n==='VOLKRIN'){this.setCd('s3',10);this.speedBuffUntil=state.time+5;for(const u of this.enemies(520,true))if(u.hp/u.maxHp<.45)addEffect('mark',u.x,u.y,{life:.8,color:'#9e493f',radius:55});}
    else if(n==='ZYREL'){this.setCd('s3',11);addEffect('ring',this.x,this.y,{life:.65,color:'#6d8ed1',radius:190});for(const u of this.enemies(190,true)){this.applySkillDamage(u,150+this.magic*.55,'magic');u.stunUntil=state.time+1.1;}}
  }
  ult(){if(!this.skillReady('ult'))return;const n=this.name;this.setCd('ult',45);
    if(n==='RAMZX'){const t=this.enemies(650,true)[0];if(!t){this.cool.ult=0;return;}this.targetMark={target:t,until:state.time+6};if(this.player)announce('DEADLINE',.75);addEffect('mark',t.x,t.y,{life:1,color:'#ca3f52',radius:74});const old={x:this.x,y:this.y},nn=norm(t.x-this.x,t.y-this.y);this.x=t.x-nn.x*70;this.y=t.y-nn.y*70;addEffect('dash',old.x,old.y,{life:.28,x2:this.x,y2:this.y,color:'#d24c5e'});this.applySkillDamage(t,400+this.atk*1.2,'physical');if(!t.dead&&t.hp/t.maxHp<=.12)t.damage(99999,this);}
    else if(n==='NYRA'){const t=this.enemies(650,true)[0];if(!t){this.cool.ult=0;return;}const old={x:this.x,y:this.y};this.x=t.x-55;this.y=t.y-30;addEffect('dash',old.x,old.y,{life:.28,x2:this.x,y2:this.y,color:'#75508d'});for(let i=0;i<4;i++)this.applySkillDamage(t,105+this.atk*.42+(i===3?(1-t.hp/t.maxHp)*170:0),'physical');}
    else if(n==='KAELOR'){this.transformUntil=state.time+8;this.attackBuffUntil=state.time+8;this.speedBuffUntil=state.time+8;this.lifesteal=Math.max(this.lifesteal,.20);addEffect('ring',this.x,this.y,{life:.8,color:'#b46a45',radius:150});}
    else if(n==='VEYRA'){addEffect('ring',this.x,this.y,{life:1.2,color:'#a450c2',radius:310});for(const u of this.enemies(310,true)){const a=Math.atan2(this.y-u.y,this.x-u.x);u.x+=Math.cos(a)*85;u.y+=Math.sin(a)*85;this.applySkillDamage(u,390+this.magic*1.05,'magic');}}
    else if(n==='GRIMM'){addEffect('ring',this.x,this.y,{life:.9,color:'#8c96a0',radius:290});for(const u of this.enemies(290,true)){this.applySkillDamage(u,250+this.atk*.65,'physical');u.stunUntil=state.time+1.5;}for(const a of units)if(a instanceof Hero&&!a.dead&&a.team===this.team&&dist(this,a)<290)a.shield+=a.maxHp*.14;this.damageReduceUntil=state.time+4;}
    else if(n==='SERA'){const h=(420+this.magic*.9)*this.healPower;for(const a of units)if(a instanceof Hero&&!a.dead&&a.team===this.team&&dist(this,a)<520){a.hp=Math.min(a.maxHp,a.hp+h);a.damageReduceUntil=state.time+3;floatText(a.x,a.y-50,`+${Math.round(h)}`,'#b5edc0',16);}addEffect('ring',this.x,this.y,{life:1,color:'#e0d495',radius:520});}
    else if(n==='KAIRO'){const t=this.enemies(1100,true)[0];if(!t){this.cool.ult=0;return;}addEffect('dash',this.x,this.y,{life:.3,x2:t.x,y2:t.y,color:'#8bcce5'});this.applySkillDamage(t,(390+this.atk*1.25)*(1+(1-t.hp/t.maxHp)*.45),'physical');}
    else if(n==='RAZE'){addEffect('ring',this.x,this.y,{life:1.2,color:'#c7595c',radius:330});for(const u of this.enemies(330,true))for(let i=0;i<4;i++)this.applySkillDamage(u,85+this.atk*.28,'physical');}
    else if(n==='VOLKRIN'){this.transformUntil=state.time+8;this.recalcStats(true);this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.15);this.attackBuffUntil=state.time+8;this.speedBuffUntil=state.time+8;addEffect('ring',this.x,this.y,{life:.9,color:'#80894c',radius:175});}
    else if(n==='ZYREL'){addEffect('ring',this.x,this.y,{life:1.2,color:'#7194d8',radius:350});for(const u of this.enemies(350,true)){this.applySkillDamage(u,120+this.magic*.35,'magic');this.applySkillDamage(u,120+this.magic*.35,'magic');this.applySkillDamage(u,260+this.magic*.75,'magic');}}
    if(this.player)announce(this.defn.skills[3],.9);state.screenShake=.14;tone(55,.22,'sawtooth',.05);
  }
  autoBuy(){
    if(this.player||this.inventory.length>=6)return;const builds={EXP:['dreadcleaver','dreadplate','bloodfang','warboots'],GOLD:['riftpiercer','bloodfang','headsman','berserker'],JUNGLE:['beastfang','shadeclaw','dreadcleaver','warboots'],ROAMER:['dreadplate','runeguard','oathbell','warboots'],SUPPORT:['saintlantern','oathbell','mercycrown','runeboots'],TACTICAL:['ashen','voidglass','witchfire','arcanesteps']};
    const list=builds[this.role]||builds.TACTICAL;for(const id of list){if(this.inventory.includes(id))continue;const it=ITEM_BY_ID[id];if(it&&this.gold>=it.cost&&!(it.cat==='Boots'&&this.inventory.some(x=>ITEM_BY_ID[x]?.cat==='Boots'))){this.gold-=it.cost;this.inventory.push(id);this.recalcStats(true);break;}}
  }
  moveTowardPoint(p,stepScale=.10){const base=Math.atan2(p.y-this.y,p.x-this.x),step=this.speed()*stepScale;for(const off of [0,.38,-.38,.75,-.75,1.12,-1.12,Math.PI]){const a=base+off,nx=clamp(this.x+Math.cos(a)*step,45,WORLD_W-45),ny=clamp(this.y+Math.sin(a)*step,45,WORLD_H-45);if(!isBlocked(nx,ny)){this.facing=a;this.x=nx;this.y=ny;return true;}}return false;}
  botAI(dt){this.botThink-=dt;if(this.botThink>0)return;this.botThink=.12;if(this.stunUntil>state.time)return;if(this.hp/this.maxHp<.24||this.aiRetreat){this.aiRetreat=this.hp/this.maxHp<.72&&dist(this,SPAWNS[this.team])>250;this.moveTowardPoint(SPAWNS[this.team],.12);return;}const dangerTower=towers.find(t=>!t.dead&&t.team!==this.team&&dist(this,t)<t.range+40&&t.backdoorAgainst(this.team));if(dangerTower){this.moveTowardPoint({x:this.x+(this.x-dangerTower.x),y:this.y+(this.y-dangerTower.y)},.13);return;}if(['EXP','GOLD','TACTICAL','SUPPORT'].includes(this.role)){if(this.role==='SUPPORT'&&earlyEconomy())this.lane=2;if(this.role==='TACTICAL')this.lane=(Math.floor(state.time/70)%2)+1;const lp=this.team===TEAM_A?LANES[this.lane]:revPath(LANES[this.lane]);const nearest=lp.reduce((best,q)=>dist(this,q)<dist(this,best)?q:best,lp[0]);if(dist(this,nearest)>620){this.moveTowardPoint(nearest,.12);return;}}
    const close=this.selectTarget(Math.max(235,this.attackRange),true);if(close){const d=dist(this,close);if(d>this.attackRange*.88)this.moveTowardPoint(close,.12);else this.basicAttack();if(close instanceof Hero&&this.cool.s1<=0&&Math.random()<.09)this.s1();if(close instanceof Hero&&this.cool.s2<=0&&Math.random()<.03)this.s2();if(close instanceof Hero&&this.cool.s3<=0&&Math.random()<.035)this.s3();if(close instanceof Hero&&this.level>=4&&this.cool.ult<=0&&Math.random()<.018)this.ult();return;}
    if(this.role==='JUNGLE'){if(state.pitlord&&!state.pitlord.dead&&this.level>=4&&state.time>=210&&Math.random()<.25){this.moveTowardPoint(state.pitlord,.10);return;}let live=camps.filter(c=>c.owner===this.team).flatMap(c=>c.creeps).filter(x=>!x.dead).sort((a,b)=>dist(this,a)-dist(this,b))[0];if(!live)live=camps.flatMap(c=>c.creeps).filter(x=>!x.dead).sort((a,b)=>dist(this,a)-dist(this,b))[0];if(live){const d=dist(this,live);if(d>this.attackRange*.9)this.moveTowardPoint(live,.10);else this.basicAttack();return;}}
    if(this.role==='ROAMER'&&earlyEconomy()){const j=units.find(h=>h instanceof Hero&&!h.dead&&h.team===this.team&&h.role==='JUNGLE');if(j&&dist(this,j)>150){this.moveTowardPoint(j,.10);return;}}if(this.role==='SUPPORT'&&earlyEconomy())this.lane=2;if(this.role==='TACTICAL')this.lane=(Math.floor(state.time/70)%2)+1;const path=this.team===TEAM_A?LANES[this.lane]:revPath(LANES[this.lane]);const p=path[this.pathWp]||path[path.length-1];this.moveTowardPoint(p,.11);if(dist(this,p)<75)this.pathWp=Math.min(path.length-1,this.pathWp+1);
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
const SLOT_OPTIONS={EXP:['RAMZX','KAELOR'],GOLD:['KAIRO','RAZE'],JUNGLE:['VOLKRIN','NYRA'],ROAMER:['GRIMM'],TACTICAL:['VEYRA','SERA','ZYREL']};
function laneForHero(name){const d=heroDef(name);return d.slot==='GOLD'?2:(d.role==='SUPPORT'?2:1);}
function chooseForSlot(slot,avoid,preferLast=false){const arr=SLOT_OPTIONS[slot].filter(n=>n!==avoid);return (preferLast?arr[arr.length-1]:arr[0])||SLOT_OPTIONS[slot][0];}
function buildTeams(selected){
  player.applyDefinition(selected,false);player.x=SPAWNS[0].x+80;player.y=SPAWNS[0].y-70;player.hp=player.maxHp;player.gold=0;player.xp=0;player.level=1;player.inventory=[];player.recalcStats(false);
  const slots=['EXP','GOLD','JUNGLE','ROAMER','TACTICAL'],playerSlot=player.slot;let ai=0;
  for(const slot of slots){if(slot===playerSlot)continue;const n=chooseForSlot(slot,selected,false),d=heroDef(n),h=new Hero(SPAWNS[0].x+35+ai*30,SPAWNS[0].y-5+ai*22,TEAM_A,n,false,d.role);h.lane=laneForHero(n);units.push(h);ai++;}
  let ei=0;for(const slot of slots){const n=chooseForSlot(slot,selected,true),d=heroDef(n),h=new Hero(SPAWNS[1].x-40-ei*30,SPAWNS[1].y+10+ei*22,TEAM_B,n,false,d.role);h.lane=laneForHero(n);units.push(h);ei++;}
}

function spawnWave(){
  for(const team of [TEAM_A,TEAM_B])for(const lane of [1,2])for(let i=0;i<4;i++)units.push(new Minion(team,lane,i));
  tone(190,.04,'triangle',.012);
}
function spawnPitlord(debug=false){if(state.pitlord&&!state.pitlord.dead)return;state.pitlord=new Pitlord();state.pitRespawnAt=0;announce(debug?'PITLORD SUMMONED':'THE RIFT TREMBLES… PITLORD HAS AWAKENED!',1.8);}

const keys=new Set();
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys.add(k);if(e.key===' ')e.preventDefault();
  if(k==='j'||e.key===' ')player.basicAttack();if(k==='1'||k==='q')player.s1();if(k==='2')player.s2();if(k==='3'||k==='e')player.s3();if(k==='4'||k==='r')player.ult();
  if(k==='f')tryDeny();if(k==='p')spawnPitlord(true);if(k==='l')player.forceLevel4();if(k==='g'){player.gold+=5000;announce('+5000 GOLD · TEST',.55);}
  if(k==='b')toggleShop();if(k==='m'){state.cameraManual=false;state.cameraManualUntil=0;}
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
levelBtn.onclick=()=>player.forceLevel4();pitBtn.onclick=()=>spawnPitlord(true);goldBtn.onclick=()=>{if(!state.started)return;player.gold+=5000;announce('+5000 GOLD · TEST',.55)};
let activeShopCategory='All';
function refreshSkillLabels(){const names=player.defn.skills;for(const [i,a] of ['s1','s2','s3','ult'].entries()){const b=document.querySelector(`.skill[data-action="${a}"] span`);if(b)b.textContent=names[i];}}
function toggleShop(force){const on=force??!shopPanel.classList.contains('show');shopPanel.classList.toggle('show',on);if(on)renderShop();}
shopBtn.onclick=()=>toggleShop();closeShopBtn.onclick=()=>toggleShop(false);
function buyItem(id){if(!state.started)return;const it=ITEM_BY_ID[id];if(!it)return;if(player.inventory.length>=6){announce('INVENTORY FULL',.7);return;}if(player.inventory.includes(id)){announce('ITEM ALREADY OWNED',.7);return;}if(it.cat==='Boots'&&player.inventory.some(x=>ITEM_BY_ID[x]?.cat==='Boots')){announce('ONLY ONE PAIR OF BOOTS',.8);return;}if(player.gold<it.cost){announce('NOT ENOUGH GOLD',.65);return;}player.gold-=it.cost;player.inventory.push(id);player.recalcStats(true);announce(it.name.toUpperCase(),.65);renderShop();}
function renderShop(){const cats=['All',...new Set(ITEM_DEFS.map(i=>i.cat))];shopFiltersEl.innerHTML=cats.map(c=>`<button data-cat="${c}" class="${c===activeShopCategory?'active':''}">${c}</button>`).join('');for(const b of shopFiltersEl.querySelectorAll('button'))b.onclick=()=>{activeShopCategory=b.dataset.cat;renderShop();};const list=ITEM_DEFS.filter(i=>activeShopCategory==='All'||i.cat===activeShopCategory);shopItemsEl.innerHTML=list.map(i=>`<div class="itemCard"><div><div class="itemCat">${i.cat}</div><h3>${i.name}</h3><p>${i.desc}</p></div><div><div class="cost">${i.cost}g</div><button data-buy="${i.id}" ${player.gold<i.cost||player.inventory.length>=6?'disabled':''}>BUY</button></div></div>`).join('');for(const b of shopItemsEl.querySelectorAll('[data-buy]'))b.onclick=()=>buyItem(b.dataset.buy);shopGoldEl.textContent=`${Math.floor(player.gold)}g`;}
function renderHeroSelect(){heroGrid.innerHTML=Object.entries(HERO_DEFS).map(([name,d])=>`<button class="heroCard" data-hero="${name}"><div class="heroTop"><strong>${name}</strong><em>${d.role}</em></div><div class="title">${d.title}</div><div class="stats">HP ${d.hp} · ATK ${d.atk}${d.magic?` · MAGIC ${d.magic}`:''}<br>MOVE ${d.ms} · RANGE ${d.range}</div><div class="ultName">ULT · ${d.skills[3]}</div></button>`).join('');for(const b of heroGrid.querySelectorAll('[data-hero]'))b.onclick=()=>startMatch(b.dataset.hero);}
function startMatch(name){if(state.started)return;buildTeams(name);state.started=true;heroSelectPanel.classList.remove('show');refreshSkillLabels();updateUI();announce('WELCOME TO TWISTED RIFT! WARRIORS, STEEL YOURSELVES! YOUR JOURNEY BEGINS!',2.1);}
renderHeroSelect();renderShop();

function updatePlayer(dt){
  if(!state.started||player.dead||player.stunUntil>state.time)return;
  let x=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joyVec.x;let y=(keys.has('s')?1:0)-(keys.has('w')?1:0)+joyVec.y;
  if(x||y){const n=norm(x,y);player.facing=Math.atan2(n.y,n.x);const step=player.speed()*dt,nx=clamp(player.x+n.x*step,45,WORLD_W-45),ny=clamp(player.y+n.y*step,45,WORLD_H-45);if(!isBlocked(nx,player.y))player.x=nx;if(!isBlocked(player.x,ny))player.y=ny;}
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
  const mins=Math.floor(state.time/60),secs=Math.floor(state.time%60);info.textContent=state.started?`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} · BLUE ${state.teamKills[0]}–${state.teamKills[1]} RED · ${earlyEconomy()?'ROLE ECONOMY':'OPEN ECONOMY'} · ${player.role} · Lv ${player.level} · ${Math.floor(player.gold)}g`:'SELECT A HERO TO BEGIN';
  const remain=Math.max(0,210-state.time);if(state.pitlord&&!state.pitlord.dead)pitBanner.textContent=hasVisionAt(state.pitlord.x,state.pitlord.y,TEAM_A)?`PITLORD: ${Math.ceil(state.pitlord.hp)} HP`:'PITLORD: ALIVE';else if(state.pitRespawnAt>state.time){const r=Math.ceil(state.pitRespawnAt-state.time);pitBanner.textContent=`PITLORD: RETURNS · ${Math.floor(r/60)}:${String(r%60).padStart(2,'0')}`;}else pitBanner.textContent=`PITLORD: DORMANT · ${Math.floor(remain/60)}:${String(Math.ceil(remain%60)).padStart(2,'0')}`;
  heroNameEl.textContent=player.name;heroRoleEl.textContent=player.role;hpText.textContent=`${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`;hpFill.style.width=`${Math.max(0,player.hp/player.maxHp*100)}%`;shieldFill.style.width=`${Math.min(100,player.shield/player.maxHp*100)}%`;
  const buffs=[];if(player.crimsonUntil>state.time)buffs.push(`<span class="buff crimson">CRIMSON ${Math.ceil(player.crimsonUntil-state.time)}s</span>`);if(player.azureUntil>state.time)buffs.push(`<span class="buff azure">AZURE ${Math.ceil(player.azureUntil-state.time)}s</span>`);if(state.pitBuffUntil[player.team]>state.time)buffs.push(`<span class="buff pit">PITLORD ${Math.ceil(state.pitBuffUntil[player.team]-state.time)}s</span>`);buffBar.innerHTML=buffs.join('');
  inventoryStrip.innerHTML=player.inventory.map(id=>`<span class="invItem" title="${ITEM_BY_ID[id]?.name||id}">${ITEM_BY_ID[id]?.name||id}</span>`).join('');shopGoldEl.textContent=`${Math.floor(player.gold)}g`;
  for(const b of document.querySelectorAll('.skill[data-action]')){const a=b.dataset.action,cd=a==='attack'?player.cool.attack:(a==='deny'?0:player.cool[a]);b.classList.toggle('cooling',cd>0);b.classList.toggle('locked',a==='ult'&&player.level<4);b.dataset.cd=cd>0?Math.ceil(cd):'';}
}
function update(dt){
  if(state.gameOver)return;if(!state.started){updateCamera();updateUI();return;}state.time+=dt;
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
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(u.facing);ctx.beginPath();ctx.fillStyle=u.team===TEAM_A?u.defn.color:'#ff6f7c';ctx.arc(0,0,u.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=u.player?'#fff':'#f5dfe855';ctx.lineWidth=u.player?4:2;ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(7,-4,26,8);ctx.restore();
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
announce('CHOOSE YOUR HERO',1.2);requestAnimationFrame(loop);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

})();
