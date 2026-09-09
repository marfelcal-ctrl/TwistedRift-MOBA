// Alpha 0.6: choose skills or stats; no automatic level-based attribute growth.
player.heroId='ramzx';
player.upgrades=createUpgrades(player.heroId);
player.physicalDefense=0;
player.magicalDefense=0;
// Scale the model, not combat reach or the movement coordinates.
player.group.scale.set(.62,.72,.62);

const a06Style=document.createElement('style');
a06Style.textContent=`
#a06Open{position:absolute;left:18px;top:284px;z-index:15;background:#241c32;color:#f7e7ff;border:1px solid #b584d2;border-radius:5px;padding:10px 12px;font-size:14px;cursor:pointer}
#a06Panel{position:absolute;left:220px;top:86px;max-height:calc(100dvh - 210px);width:min(365px,calc(100vw - 36px));overflow:auto;z-index:24;background:#11131ff5;color:#eee;border:1px solid #8b769e;border-radius:7px;padding:16px;box-shadow:0 12px 44px #0009}
#a06Panel[hidden]{display:none}#a06Panel header{display:flex;justify-content:space-between;align-items:center;gap:12px}#a06Panel h2{font-size:18px;margin:0}#a06Close{background:transparent;color:#eee;border:1px solid #777;padding:5px 9px;font-size:14px;cursor:pointer}#a06Panel p{font-size:14px;line-height:1.45;color:#c2b9ce}#a06Choices{display:grid;gap:8px}.a06Choice{display:block;text-align:left;border:1px solid #747084;border-radius:5px;background:#262237;color:#fff;padding:11px;width:100%;cursor:pointer;font-size:14px}.a06Choice strong{display:block;font-size:15px;margin-bottom:5px}.a06Choice small{display:block;font-size:13px;line-height:1.4;color:#ccc2d5}.a06Choice:disabled{opacity:.6;cursor:not-allowed;background:#1a1a23}.a06Choice:focus-visible,#a06Open:focus-visible{outline:2px solid #f3d18c;outline-offset:2px}.a06Unlearned{filter:grayscale(1);opacity:.55}.a06Rank{position:absolute;left:4px;bottom:5px;font-size:11px;color:#eee;pointer-events:none}
@media(max-width:800px){#a06Open{left:10px;top:203px;padding:8px;font-size:13px}#a06Panel{left:18px;top:58px;max-height:calc(100dvh - 150px);width:min(365px,calc(100vw - 36px));padding:12px}}
`;
document.head.appendChild(a06Style);
const a06Open=document.createElement('button');a06Open.id='a06Open';a06Open.type='button';a06Open.setAttribute('aria-controls','a06Panel');
const a06Panel=document.createElement('section');a06Panel.id='a06Panel';a06Panel.setAttribute('aria-label','Level upgrades');
a06Panel.innerHTML='<header><h2>Level upgrades</h2><button id="a06Close" type="button" aria-label="Close upgrades">Close</button></header><p id="a06Points" aria-live="polite"></p><div id="a06Choices"></div><p id="a06Stats"></p>';
document.querySelector('#app').append(a06Open,a06Panel);
const a06Names={s1:'Sever',s2:'Iron Order',s3:'Execution Step',ult:'Deadline',stats:'Stats +2'};
function a06Description(key,rank){
 const next={...player.upgrades.ranks,[key]:rank+1},effect=skillEffects(next);
 if(key==='s1')return `${Math.round(effect.sever)} cleave damage`;
 if(key==='s2')return `${effect.shield} shield · ${effect.shieldCap} shield cap`;
 if(key==='s3')return `${Math.round(effect.step)} dash damage`;
 if(key==='ult')return `+${effect.deadline} empowered damage · executes below ${Math.round(effect.execute*100)}% HP`;
 const growth=HERO_STAT_GROWTH[player.heroId];return `+${growth.health} max HP · +${growth.physical} physical defense · +${growth.magical} magical defense`;
}
function a06Render(){
 const state=player.upgrades;
 a06Open.textContent=`U · UPGRADES (${state.points})`;a06Open.setAttribute('aria-expanded',String(!a06Panel.hidden));
 a06Panel.querySelector('#a06Points').textContent=`Level ${player.level} · ${state.points} point${state.points===1?'':'s'} available. Spend one point or save it for later.`;
 const choices=a06Panel.querySelector('#a06Choices');choices.replaceChildren();
 for(const key of ['s1','s2','s3','ult','stats']){const rank=key==='stats'?state.stats:state.ranks[key],cap=key==='stats'?5:key==='ult'?3:10,status=upgradeStatus(state,player.level,key);const b=document.createElement('button');b.type='button';b.className='a06Choice';b.dataset.upgrade=key;b.disabled=!status.allowed;
 const title=document.createElement('strong');title.textContent=`${a06Names[key]} · ${rank}/${cap}`;const desc=document.createElement('small');desc.textContent=rank===cap?'Fully upgraded':a06Description(key,rank);const reason=document.createElement('small');reason.textContent=status.reason;b.append(title,desc,reason);choices.append(b);}
 a06Panel.querySelector('#a06Stats').textContent=`Max HP ${player.maxHp} · Physical defense ${player.physicalDefense} · Magical defense ${player.magicalDefense}. Stats never increase automatically on level-up.`;
 for(const key of ['s1','s2','s3','ult']){const b=document.querySelector(`.skill[data-action="${key}"]`);if(!b)continue;const rank=state.ranks[key];b.disabled=rank===0;b.classList.toggle('a06Unlearned',rank===0);b.setAttribute('aria-label',`${a06Names[key]}, ${rank?'rank '+rank:'unlearned'}`);let badge=b.querySelector('.a06Rank');if(!badge){badge=document.createElement('b');badge.className='a06Rank';b.append(badge);}badge.textContent=rank?`R${rank}`:'LEARN';}
}
function a06SetOpen(open){a06Panel.hidden=!open;a06Open.setAttribute('aria-expanded',String(open));}
a06Open.addEventListener('click',()=>{a06SetOpen(a06Panel.hidden);a06Render();});
a06Panel.querySelector('#a06Close').addEventListener('click',()=>{a06SetOpen(false);a06Open.focus();});
a06Panel.addEventListener('click',e=>{const b=e.target.closest('[data-upgrade]');if(!b)return;const key=b.dataset.upgrade;const growth=spendUpgrade(player.upgrades,player.level,key);if(!growth)return;if(key==='stats'){player.maxHp+=growth.health;player.hp=Math.min(player.maxHp,player.hp+growth.health);player.physicalDefense+=growth.physical;player.magicalDefense+=growth.magical;}a05ToastMsg(`${a06Names[key].toUpperCase()} UPGRADED`,'#d5a1ff');a06Render();if(!player.upgrades.points){a06SetOpen(false);a06Open.focus();}else{const next=a06Panel.querySelector(`[data-upgrade="${key}"]:not(:disabled)`)||a06Panel.querySelector('.a06Choice:not(:disabled)');next?.focus();}});
addEventListener('keydown',e=>{if(e.target.closest?.('input,select,textarea'))return;if(e.repeat)return;if(e.code==='KeyU'){e.preventDefault();a06SetOpen(a06Panel.hidden);a06Render();}if(e.code==='Escape')a06SetOpen(false);});
const a06GainXpBase=a05GainXp;
a05GainXp=function(amount){a06GainXpBase(amount);const earned=grantLevelPoints(player.upgrades,player.level);if(earned){a06Render();a06SetOpen(true);a05ToastMsg(`+${earned} UPGRADE POINT${earned===1?'':'S'}`,'#d5a1ff');}};
function a06Guard(fn,key){return function(...args){if(!player.upgrades.ranks[key]){a05ToastMsg(`LEARN ${a06Names[key].toUpperCase()} FIRST`,'#ffadb7');return;}return fn(...args);};}
skill1=a06Guard(skill1,'s1');skill2=a06Guard(skill2,'s2');skill3=a06Guard(skill3,'s3');ultimate=a06Guard(ultimate,'ult');
a06Render();
