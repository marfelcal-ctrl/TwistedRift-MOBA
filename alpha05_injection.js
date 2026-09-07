// ---- Alpha 0.5: progression, economy, recall, fountain and shop ----
const A05_VERSION='0.5';
player.level=1;
player.xp=0;
player.role='EXP LANER';
player.items=[];
player.a05Lifesteal=0;
player.a05AbilityAmp=1;
player.a05StructureAmp=1;
player.a05Regen=0;
const A05_XP_THRESHOLDS=[0,100,650,1800,3200,5000,7200,9700,12500,15600,19000,22700,26700,31000,35600];
const A05_FOUNTAIN=new THREE.Vector3(-55,0,55);
let a05LastPassiveGold=a04Time(now());
let a05Recall=false,a05RecallEnd=0,a05RecallStart=new THREE.Vector3();
let a05PlayerDamageContext=false,a05CurrentAction='';

// ----- UI -----
const a05Style=document.createElement('style');
a05Style.textContent=`
#a05Progress{position:absolute;left:84px;bottom:8px;width:min(420px,39vw);z-index:8;pointer-events:none}.a05XpTrack{height:5px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.16);overflow:hidden}.a05XpFill{height:100%;width:0;background:linear-gradient(90deg,#7b3ea5,#d15cda);transition:width .18s}.a05Meta{display:flex;justify-content:space-between;margin-top:3px;font-size:8px;letter-spacing:.08em;color:#c7bece;text-shadow:0 1px 3px #000}
#a05Actions{position:absolute;right:18px;top:136px;display:flex;gap:7px;z-index:10}.a05Action{border:1px solid rgba(255,255,255,.18);background:rgba(7,8,13,.82);color:#eee;padding:7px 10px;font-size:9px;letter-spacing:.08em;cursor:pointer}.a05Action:hover{border-color:rgba(255,255,255,.45)}
#a05RecallBar{position:absolute;left:50%;bottom:116px;transform:translateX(-50%);width:260px;z-index:12;display:none;text-align:center;font-size:9px;letter-spacing:.1em}.a05RecallTrack{height:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.72);margin-top:5px;overflow:hidden}.a05RecallFill{height:100%;width:0;background:linear-gradient(90deg,#5f2fa2,#be4cc8)}
#a05Shop{position:absolute;right:18px;top:186px;width:min(420px,88vw);max-height:61vh;overflow:auto;display:none;z-index:20;background:rgba(7,8,13,.96);border:1px solid rgba(255,255,255,.18);box-shadow:0 15px 50px rgba(0,0,0,.55);padding:12px}.a05ShopHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.a05ShopHead b{font:800 15px Georgia,serif;letter-spacing:.08em}.a05ShopHead span{font-size:9px;color:#aaa}.a05Items{display:grid;grid-template-columns:1fr 1fr;gap:7px}.a05Item{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035);padding:8px;cursor:pointer}.a05Item:hover{border-color:rgba(214,83,113,.7)}.a05Item strong{display:block;font-size:11px}.a05Item small{display:block;color:#aaa;margin:3px 0 6px;line-height:1.35}.a05Price{color:#efca64;font-weight:800;font-size:10px}.a05Owned{color:#66d38e;font-size:9px}.a05Inv{margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);font-size:9px;color:#bbb}.a05Practice{margin-top:8px;width:100%;border:1px dashed rgba(255,255,255,.18);background:transparent;color:#aaa;padding:6px;cursor:pointer;font-size:8px}
#a05Toast{position:absolute;left:50%;top:28%;transform:translateX(-50%);z-index:30;pointer-events:none;font-weight:900;font-size:13px;text-shadow:0 2px 8px #000;opacity:0;transition:opacity .15s;color:#f3d775}
@media(max-width:800px){#a05Progress{left:64px;bottom:4px;width:48vw}#a05Actions{right:8px;top:108px;gap:4px}.a05Action{padding:6px 7px;font-size:7px}#a05Shop{right:8px;top:150px;max-height:55vh}.a05Items{grid-template-columns:1fr}#a05RecallBar{bottom:98px;width:210px}}
`;
document.head.appendChild(a05Style);

const a05Progress=document.createElement('div');a05Progress.id='a05Progress';a05Progress.innerHTML='<div class="a05XpTrack"><div class="a05XpFill" id="a05XpFill"></div></div><div class="a05Meta"><span id="a05Role">EXP LANER · EARLY ECONOMY</span><span id="a05XpText">XP 0 / 100</span></div>';document.querySelector('#app').appendChild(a05Progress);
const a05Actions=document.createElement('div');a05Actions.id='a05Actions';a05Actions.innerHTML='<button class="a05Action" id="a05RecallBtn">V · RECALL</button><button class="a05Action" id="a05ShopBtn">B · SHOP</button>';document.querySelector('#app').appendChild(a05Actions);
const a05RecallBar=document.createElement('div');a05RecallBar.id='a05RecallBar';a05RecallBar.innerHTML='<b>RECALLING TO FOUNTAIN</b><div class="a05RecallTrack"><div class="a05RecallFill" id="a05RecallFill"></div></div>';document.querySelector('#app').appendChild(a05RecallBar);
const a05Shop=document.createElement('div');a05Shop.id='a05Shop';document.querySelector('#app').appendChild(a05Shop);
const a05Toast=document.createElement('div');a05Toast.id='a05Toast';document.querySelector('#app').appendChild(a05Toast);

const A05_ITEMS=[
 {id:'warboots',name:'War Boots',price:1100,desc:'+1.2 Move Speed · occupies one item slot',kind:'boots',apply(){player.speed+=1.2}},
 {id:'dreadcleaver',name:'Dreadcleaver',price:3100,desc:'+70 Attack · +8% structure damage',apply(){player.attackDamage+=70;player.a05StructureAmp*=1.08}},
 {id:'bloodfang',name:'Bloodfang Edge',price:3300,desc:'+65 Attack · 10% basic attack lifesteal',apply(){player.attackDamage+=65;player.a05Lifesteal+=.10}},
 {id:'dreadplate',name:'Dreadplate',price:3100,desc:'+650 Max HP',apply(){player.maxHp+=650;player.hp+=650}},
 {id:'voidglass',name:'Voidglass Scepter',price:3250,desc:'+15% ability damage',apply(){player.a05AbilityAmp*=1.15}},
 {id:'lantern',name:"Saint's Lantern",price:2750,desc:'+450 Max HP · +18 HP/sec regeneration',apply(){player.maxHp+=450;player.hp+=450;player.a05Regen+=18}}
];
function a05NearFountain(){return player.group.position.distanceTo(A05_FOUNTAIN)<8.2}
function a05ToastMsg(text,color='#f3d775'){a05Toast.textContent=text;a05Toast.style.color=color;a05Toast.style.opacity='1';clearTimeout(a05Toast._t);a05Toast._t=setTimeout(()=>a05Toast.style.opacity='0',900)}
function a05RenderShop(){
 const slots=player.items.length<6?`${player.items.length}/6 SLOTS`:'INVENTORY FULL';
 a05Shop.innerHTML=`<div class="a05ShopHead"><b>QUARTERMASTER</b><span>${a05NearFountain()?'FOUNTAIN SHOP':'BROWSE ONLY · RETURN TO FOUNTAIN'}</span></div><div class="a05Items">${A05_ITEMS.map(i=>{const own=player.items.some(x=>x.id===i.id);return `<div class="a05Item" data-item="${i.id}"><strong>${i.name}</strong><small>${i.desc}</small><span class="${own?'a05Owned':'a05Price'}">${own?'OWNED':i.price+' GOLD'}</span></div>`}).join('')}</div><div class="a05Inv">${slots} · ${player.items.length?player.items.map(i=>i.name).join(' · '):'No equipment yet'}</div><button class="a05Practice" id="a05PracticeGold">PRACTICE: +1000 GOLD (G)</button>`;
 a05Shop.querySelectorAll('[data-item]').forEach(el=>el.addEventListener('click',()=>a05Buy(el.dataset.item)));
 a05Shop.querySelector('#a05PracticeGold')?.addEventListener('click',()=>{player.gold+=1000;a05ToastMsg('+1000 PRACTICE GOLD');a05RenderShop()});
}
function a05Buy(id){const item=A05_ITEMS.find(i=>i.id===id);if(!item)return;if(!a05NearFountain()){a05ToastMsg('RETURN TO FOUNTAIN TO BUY','#ff8898');return}if(player.items.length>=6){a05ToastMsg('INVENTORY FULL','#ff8898');return}if(player.items.some(x=>x.id===id)){a05ToastMsg('ITEM ALREADY OWNED','#ff8898');return}if(item.kind==='boots'&&player.items.some(x=>x.kind==='boots')){a05ToastMsg('ONLY ONE BOOTS ITEM','#ff8898');return}if(player.gold<item.price){a05ToastMsg('NOT ENOUGH GOLD','#ff8898');return}player.gold-=item.price;player.items.push(item);item.apply();a05ToastMsg(`${item.name.toUpperCase()} PURCHASED`,'#79e49d');a05RenderShop()}
function a05ToggleShop(){a05Shop.style.display=a05Shop.style.display==='block'?'none':'block';if(a05Shop.style.display==='block')a05RenderShop()}
document.querySelector('#a05ShopBtn').addEventListener('click',a05ToggleShop);

function a05NextXp(){return player.level>=15?A05_XP_THRESHOLDS[14]:A05_XP_THRESHOLDS[player.level]}
function a05GainXp(amount){if(player.level>=15)return;player.xp+=amount;let leveled=false;while(player.level<15&&player.xp>=A05_XP_THRESHOLDS[player.level]){player.level++;player.maxHp+=185;player.hp=Math.min(player.maxHp,player.hp+185);player.attackDamage+=7.5;leveled=true}if(leveled){announce(`LEVEL ${player.level}`,900);fxRing(player.group.position,0xd45ce8,.7,4.5,.45);a05ToastMsg(`LEVEL UP · ${player.level}`,'#e58bff')}const lv=document.querySelector('#levelText');if(lv)lv.textContent=`LV ${player.level}`}

// ----- replace legacy minion reward with proximity XP + last-hit economy -----
const a04KillUnitBase=a04KillUnit;
a04KillUnit=function(e,byTeam){
 if(e?.kind==='heroBot'){e.alive=false;e.group.visible=false;e.respawnAt=a04Time(now())+12;return}
 const before=player.gold;
 const playerLastHit=!!e?._a05PlayerHitUntil&&e._a05PlayerHitUntil>=a04Time(now());
 const nearby=e?.group&&player.group.position.distanceTo(e.group.position)<=12;
 a04KillUnitBase(e,byTeam);
 if(byTeam!==A04_BLUE||!e)return;
 if(e.kind==='minion'){
   player.gold=before;
   if(nearby){
     const xp=e.type==='melee'?45:e.type==='ranged'?40:(e.lane==='A'?70:45);
     const reward=e.type==='melee'?40:e.type==='ranged'?35:(e.lane==='A'?55:95);
     a05GainXp(xp);
     if(playerLastHit){player.gold+=reward;a05ToastMsg(`LAST HIT +${reward}G`)}else player.gold+=Math.round(reward*.2);
   }
 }else if(e.kind==='jungle'){
   a05GainXp(e.type==='purple'?260:160);
 }else if(e.kind==='pitlord'){
   player.gold+=250;a05GainXp(350);a05ToastMsg('PITLORD · +250G +350XP');
 }
};

const a04HurtBase=a04Hurt;
a04Hurt=function(e,dmg,byTeam=A04_BLUE){
 if(a05PlayerDamageContext&&e){e._a05PlayerHitUntil=a04Time(now())+.95;if(a05CurrentAction!=='attack')dmg*=player.a05AbilityAmp;if(e.kind==='tower'||e.kind==='core')dmg*=player.a05StructureAmp}
 const before=e?.hp;
 const out=a04HurtBase(e,dmg,byTeam);
 if(a05PlayerDamageContext&&a05CurrentAction==='attack'&&player.a05Lifesteal>0&&before>0&&e?.hp!==undefined){const dealt=Math.max(0,Math.min(before,dmg));player.hp=Math.min(player.maxHp,player.hp+dealt*player.a05Lifesteal)}
 return out;
};
function a05CancelRecall(reason='RECALL CANCELLED'){if(!a05Recall)return;a05Recall=false;a05RecallBar.style.display='none';a05ToastMsg(reason,'#ff8898')}
function a05WrapCombat(fn,action){return function(...args){a05CancelRecall();a05PlayerDamageContext=true;a05CurrentAction=action;try{return fn(...args)}finally{a05PlayerDamageContext=false;a05CurrentAction=''}}}
attack=a05WrapCombat(attack,'attack');skill1=a05WrapCombat(skill1,'skill');skill2=(f=>function(...args){a05CancelRecall();return f(...args)})(skill2);skill3=a05WrapCombat(skill3,'skill');ultimate=(f=>function(...args){a05CancelRecall();return f(...args)})(ultimate);

const a05HurtPlayerBase=hurtPlayer;
hurtPlayer=function(dmg){if(dmg>0)a05CancelRecall('RECALL INTERRUPTED');return a05HurtPlayerBase(dmg)};

function a05StartRecall(){if(!player.alive||a05Recall)return;if(a05NearFountain()){a05ToastMsg('ALREADY AT FOUNTAIN');return}a05Recall=true;a05RecallEnd=now()+5;a05RecallStart.copy(player.group.position);a05RecallBar.style.display='block';announce('RECALLING…',600)}
function a05FinishRecall(){a05Recall=false;a05RecallBar.style.display='none';player.group.position.copy(A05_FOUNTAIN);player.hp=player.maxHp;player.shield=0;panOffset.set(0,0,0);announce('RETURNED TO FOUNTAIN',800);a05ToastMsg('FOUNTAIN RESTORED YOU','#79e49d')}
document.querySelector('#a05RecallBtn').addEventListener('click',a05StartRecall);
addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='KeyV')a05StartRecall();if(e.code==='KeyB')a05ToggleShop();if(e.code==='KeyG'){player.gold+=1000;a05ToastMsg('+1000 PRACTICE GOLD');if(a05Shop.style.display==='block')a05RenderShop()}});

const a04UpdateUiBase=updateUi;
updateUi=function(t){a04UpdateUiBase(t);const mt=a04Time(t);const next=a05NextXp(),prev=A05_XP_THRESHOLDS[Math.max(0,player.level-1)],span=Math.max(1,next-prev),pct=player.level>=15?100:100*(player.xp-prev)/span;document.querySelector('#a05XpFill').style.width=`${THREE.MathUtils.clamp(pct,0,100)}%`;document.querySelector('#a05XpText').textContent=player.level>=15?'MAX LEVEL':`XP ${Math.floor(player.xp)} / ${next}`;document.querySelector('#a05Role').textContent=mt<300?'EXP LANER · EARLY ECONOMY':'EXP LANER · OPEN ECONOMY';ui.statusText.textContent=player.deadlineTarget&&t<player.deadlineUntil?'DEADLINE ACTIVE':a05Recall?'RECALLING':a04PitBuff.blue>mt?'PITLORD SIEGE BUFF':`LV ${player.level} · ${player.items.length}/6 ITEMS`};

function updateAlpha05(dt,t){
 const mt=a04Time(t);
 // Standard open-economy passive gold begins at 5:00 for this EXP-laner prototype.
 if(mt>=300){while(mt-a05LastPassiveGold>=1){player.gold+=2;a05LastPassiveGold+=1}}else a05LastPassiveGold=mt;
 if(player.a05Regen>0&&player.alive)player.hp=Math.min(player.maxHp,player.hp+player.a05Regen*dt);
 const fd=player.group.position.distanceTo(A05_FOUNTAIN);if(fd<6.5&&player.alive){player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.18*dt)}
 if(a05Recall){
   if(player.group.position.distanceTo(a05RecallStart)>.12){a05CancelRecall();return}
   const left=Math.max(0,a05RecallEnd-t),pct=100*(1-left/5);document.querySelector('#a05RecallFill').style.width=`${THREE.MathUtils.clamp(pct,0,100)}%`;
   if(left<=0)a05FinishRecall();
 }
}

a05RenderShop();
