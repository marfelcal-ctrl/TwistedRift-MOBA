// Allocation rules are independent of the renderer and DOM.
export const MAX_LEVEL = 15;
export const ULTIMATE_LEVELS = [4, 6, 9];
export const NORMAL_SKILLS = ['s1', 's2', 's3'];
// Absolute stats per purchase, not percentages. Other heroes can provide their
// own growth profile when they become playable; no unapproved balance values.
export const HERO_STAT_GROWTH = Object.freeze({ramzx: Object.freeze({health: 2, physical: 2, magical: 2})});
export function createUpgrades(hero='ramzx') {
  return {hero, points:1, grantedThrough:1, ranks:{s1:0,s2:0,s3:0,ult:0}, stats:0};
}
export function grantLevelPoints(state, level) {
  const target=Math.min(MAX_LEVEL,Math.max(1,Math.floor(level)));
  const earned=Math.max(0,target-state.grantedThrough);
  state.points+=earned;state.grantedThrough=Math.max(state.grantedThrough,target);return earned;
}
export function upgradeStatus(state,level,key) {
  if (![...NORMAL_SKILLS,'ult','stats'].includes(key)) return {allowed:false,reason:'Unknown upgrade'};
  const rank=key==='stats'?state.stats:state.ranks[key];
  const cap=key==='stats'?5:key==='ult'?3:10;
  if(rank>=cap)return {allowed:false,reason:'Maximum rank'};
  if(key==='stats'&&level<6)return {allowed:false,reason:'Unlocks at level 6'};
  if(key==='stats'&&!HERO_STAT_GROWTH[state.hero])return {allowed:false,reason:'Hero growth not configured'};
  if(key==='ult'&&level<ULTIMATE_LEVELS[rank])return {allowed:false,reason:`Unlocks at level ${ULTIMATE_LEVELS[rank]}`};
  if(state.points<1)return {allowed:false,reason:'Gain a level for another point'};
  return {allowed:true,reason:'Spend 1 upgrade point'};
}
export function spendUpgrade(state,level,key) {
  if(!upgradeStatus(state,level,key).allowed)return null;
  state.points--;
  if(key==='stats'){state.stats++;return {...HERO_STAT_GROWTH[state.hero]};}
  state.ranks[key]++;return {};
}
export function skillEffects(ranks) {
 const rank=key=>Math.max(0,Math.min(key==='ult'?3:10,ranks[key]||0));
 return {
  sever:rank('s1')?330*(1+.125*(rank('s1')-1)):0,
  step:rank('s3')?270*(1+.125*(rank('s3')-1)):0,
  shield:rank('s2')?520+80*(rank('s2')-1):0,
  shieldCap:rank('s2')?850+80*(rank('s2')-1):0,
  deadline:rank('ult')?560+200*(rank('ult')-1):0,
  execute:rank('ult')?.25+.05*(rank('ult')-1):0
 };
}
export function reduceDamage(damage,defense=0,type='physical') {
 if(type==='true')return Math.max(0,damage);
 return Math.max(0,damage)*100/(100+Math.max(0,defense));
}
