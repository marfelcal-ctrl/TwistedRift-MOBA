const loadingText=document.querySelector('#loadingText');
try{
  const [baseRes,p04Res,p05Res,p06Res,p07Res]=await Promise.all([
    fetch('./game.js?base=alpha07'),
    fetch('./alpha04_injection.js?patch=alpha07'),
    fetch('./alpha05_injection.js?patch=alpha07'),
    fetch('./alpha06_injection.js?patch=alpha07'),
    fetch('./alpha07_injection.js?patch=alpha07')
  ]);
  if(!baseRes.ok)throw new Error(`game.js ${baseRes.status}`);
  if(!p04Res.ok)throw new Error(`alpha04_injection.js ${p04Res.status}`);
  if(!p05Res.ok)throw new Error(`alpha05_injection.js ${p05Res.status}`);
  if(!p06Res.ok)throw new Error(`alpha06_injection.js ${p06Res.status}`);
  if(!p07Res.ok)throw new Error(`alpha07_injection.js ${p07Res.status}`);
  let source=await baseRes.text();
  const artUrl=new URL('./art/game-art.mjs',location.href).href;
  source=`import {installRiftArt} from ${JSON.stringify(artUrl)};\n`+source;
  const p04=await p04Res.text();
  const p05=await p05Res.text();
  const p06=await p06Res.text();
  const p07=await p07Res.text();
  for(const [name,path]of [['createBattlefield','battlefield'],['createCombatVfx','combat-vfx'],['installGraphics','graphics']]){
    source=`import {${name}} from ${JSON.stringify(new URL('./art/'+path+'.mjs',location.href).href)};\n`+source;
  }
  const progressionUrl=new URL('./progression.mjs',location.href).href;
  source=`import {createUpgrades,grantLevelPoints,upgradeStatus,spendUpgrade,skillEffects,reduceDamage,HERO_STAT_GROWTH} from ${JSON.stringify(progressionUrl)};\n`+source;
  const anchor='function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}';
  if(!source.includes(anchor))throw new Error('Alpha 0.7 could not find the Alpha 0.3 injection anchor.');
  source=source.replace(anchor,`${p04}\n${p05}\n${p06}\n${p07}\n${anchor}`);
  const loopNeedle='updateWorld(dt,t);if(!panDragging';
  if(!source.includes(loopNeedle))throw new Error('Alpha 0.7 could not patch the game loop.');
  source=source.replace(loopNeedle,'updateWorld(dt,t);updateMatchSystems(dt,t);updateAlpha05(dt,t);updateAlpha07(dt,t);if(!panDragging');
  source=source.replace("ui.loadingText.textContent='The Twisted Rift battlefield is ready.';","ui.loadingText.textContent='Alpha 0.7 is ready. Choose your first skill.';");
  source=source.replace(anchor,'function resize(){riftGraphics.resize(innerWidth,innerHeight)}');
  if(!source.includes('renderer.render(scene,camera);'))throw new Error('Alpha 0.7 could not install the graphics renderer.');
  source=source.replace('renderer.render(scene,camera);','riftGraphics.render(dt);');
  const blob=new Blob([source],{type:'text/javascript'});
  const url=URL.createObjectURL(blob);
  await import(url);
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}catch(err){
  console.error(err);
  if(loadingText)loadingText.textContent=`Alpha 0.7 failed to load: ${err.message}`;
}
