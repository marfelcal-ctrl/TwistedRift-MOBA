const loadingText=document.querySelector('#loadingText');
try{
  const [baseRes,p04Res,p05Res]=await Promise.all([
    fetch('./game.js?base=alpha03'),
    fetch('./alpha04_injection.js?patch=alpha04'),
    fetch('./alpha05_injection.js?patch=alpha05')
  ]);
  if(!baseRes.ok)throw new Error(`game.js ${baseRes.status}`);
  if(!p04Res.ok)throw new Error(`alpha04_injection.js ${p04Res.status}`);
  if(!p05Res.ok)throw new Error(`alpha05_injection.js ${p05Res.status}`);
  let source=await baseRes.text();
  const p04=await p04Res.text();
  const p05=await p05Res.text();
  const anchor='function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}';
  if(!source.includes(anchor))throw new Error('Alpha 0.5 could not find the Alpha 0.3 injection anchor.');
  source=source.replace(anchor,`${p04}\n${p05}\n${anchor}`);
  const loopNeedle='updateWorld(dt,t);if(!panDragging';
  if(!source.includes(loopNeedle))throw new Error('Alpha 0.5 could not patch the game loop.');
  source=source.replace(loopNeedle,'updateWorld(dt,t);updateMatchSystems(dt,t);updateAlpha05(dt,t);if(!panDragging');
  source=source.replace("ui.loadingText.textContent='The Twisted Rift battlefield is ready.';","ui.loadingText.textContent='Alpha 0.5 progression and economy systems are ready.';");
  const blob=new Blob([source],{type:'text/javascript'});
  const url=URL.createObjectURL(blob);
  await import(url);
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}catch(err){
  console.error(err);
  if(loadingText)loadingText.textContent=`Alpha 0.5 failed to load: ${err.message}`;
}
