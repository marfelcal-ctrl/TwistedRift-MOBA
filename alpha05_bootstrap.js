const loadingText=document.querySelector('#loadingText');
try{
  const [baseRes,p04Res,p05Res,p06Res,p07Res,p08Res]=await Promise.all([
    fetch('./game.js?base=alpha082'),
    fetch('./alpha04_injection.js?patch=alpha082'),
    fetch('./alpha05_injection.js?patch=alpha082'),
    fetch('./alpha06_injection.js?patch=alpha082'),
    fetch('./alpha07_injection.js?patch=alpha082'),
    fetch('./alpha08_injection.js?patch=alpha082')
  ]);
  if(!baseRes.ok)throw new Error(`game.js ${baseRes.status}`);
  if(!p04Res.ok)throw new Error(`alpha04_injection.js ${p04Res.status}`);
  if(!p05Res.ok)throw new Error(`alpha05_injection.js ${p05Res.status}`);
  if(!p06Res.ok)throw new Error(`alpha06_injection.js ${p06Res.status}`);
  if(!p07Res.ok)throw new Error(`alpha07_injection.js ${p07Res.status}`);
  if(!p08Res.ok)throw new Error(`alpha08_injection.js ${p08Res.status}`);
  let source=await baseRes.text();
  const artUrl=new URL('./art/game-art.mjs?version=alpha082',location.href).href;
  source=`import {installRiftArt} from ${JSON.stringify(artUrl)};\n`+source;
  source=`import {MATCH,mapCoordinate,mapPoints,groundDistanceSq,minimapProject,minimapUnproject,cameraBounds,screenToWorld,createMatchClock,waveFormation,moveAlongPath,UnitGrid} from ${JSON.stringify(new URL('./match-rules.mjs?version=alpha082',location.href).href)};\n`+source;
  source=`import {createTeamVision,BRUSHES} from ${JSON.stringify(new URL('./vision-rules.mjs?version=alpha082',location.href).href)};\n`+source;
  source=`import {createFogOfWar} from ${JSON.stringify(new URL('./art/fog-of-war.mjs?version=alpha082',location.href).href)};\n`+source;
  source=`import {createBrushAppearance} from ${JSON.stringify(new URL('./art/brush-appearance.mjs?version=alpha082',location.href).href)};\n`+source;
  source=`import {BODY_RADIUS} from ${JSON.stringify(new URL('./navigation.mjs?version=alpha082',location.href).href)};\n`+source;
  const p04=await p04Res.text();
  const p05=await p05Res.text();
  const p06=await p06Res.text();
  const p07=await p07Res.text();
  const p08=await p08Res.text();
  for(const [name,path]of [['createLobby','lobby'],['createMatchFlow','match-flow']])source=`import {${name}} from ${JSON.stringify(new URL('./'+path+'.mjs?version=alpha082',location.href).href)};\n`+source;
  for(const [name,path]of [['createBattlefield','battlefield'],['createCombatVfx','combat-vfx'],['installGraphics','graphics']]){
    source=`import {${name}} from ${JSON.stringify(new URL('./art/'+path+'.mjs?version=alpha082',location.href).href)};\n`+source;
  }
  const progressionUrl=new URL('./progression.mjs',location.href).href;
  source=`import {createUpgrades,grantLevelPoints,upgradeStatus,spendUpgrade,skillEffects,reduceDamage,HERO_STAT_GROWTH} from ${JSON.stringify(progressionUrl)};\n`+source;
  const anchor='function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}';
  if(!source.includes(anchor))throw new Error('Alpha 0.8.2 could not find the Alpha 0.3 injection anchor.');
  source=source.replace(anchor,`${p04}\n${p05}\n${p06}\n${p07}\n${p08}\n${anchor}`);
  source=source.replace("ui.loadingText.textContent='The Twisted Rift battlefield is ready.';","ui.loadingText.textContent='Alpha 0.8.2 is ready. The gates are open.';");
  source=source.replace(anchor,'function resize(){riftGraphics.resize(innerWidth,innerHeight);riftLobby.resize(innerWidth,innerHeight)}');
  const blob=new Blob([source],{type:'text/javascript'});
  const url=URL.createObjectURL(blob);
  await import(url);
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}catch(err){
  console.error(err);
  if(loadingText)loadingText.textContent=`Alpha 0.8.2 failed to load: ${err.message}`;
}
