// Alpha 0.7: full battlefield art, maximum graphics and animated combat VFX.
scene.children.filter(o=>o.userData.legacyTerrain).forEach(o=>{o.visible=false;o.removeFromParent();});
for(const o of [ground,river,pitArena,pitSigil,...campObjects]){o.visible=false;o.removeFromParent();}
const riftBattlefield=createBattlefield({scene,laneA,laneB,camps,wallSpots});
const riftNavigation=riftBattlefield.navigation;
riftNavigation.resolve(player.group.position,BODY_RADIUS.hero);
for(const enemy of enemies){riftNavigation.resolve(enemy.group.position,BODY_RADIUS.hero);enemy.spawn.copy(enemy.group.position);}
for(let i=0;i<a04Jungle.length;i++){const camp=a04Jungle[i];riftNavigation.resolve(camp.spawn,BODY_RADIUS.jungle);camp.group.position.copy(camp.spawn);camps[i][0]=camp.spawn.x;camps[i][1]=camp.spawn.z;}
player.team=A04_BLUE;for(const enemy of enemies)enemy.team=enemy.type==='stoneback'?'neutral':A04_RED;
const riftVision=createTeamVision({lineOfSight:riftNavigation.lineOfSight,sightRevision:()=>riftNavigation.revision});
const riftBrushStatus=document.querySelector('#brushStatus');
function refreshTeamVision(t=now()){riftVision.refresh([player,...enemies.filter(e=>e.team!== 'neutral'),...a04Minions,...towers.map(t=>t.userData),blueCore.userData,redCore.userData],t);}
function updateTeamVisibility(t=now()){
  refreshTeamVision(t);
  for(const unit of [player,...enemies,...a04Minions,...a04Jungle,a04Pit]){
    const visible=riftVision.visible(unit);if(unit.group.visible!==visible)renderer.shadowMap.needsUpdate=true;
    unit.group.visible=visible;
  }
  const inBrush=player.alive&&riftVision.brushAt(player.group.position)!==-1;
  player.concealed=inBrush&&!riftVision.visible(player,A04_RED);
  if(riftBrushStatus.hidden===inBrush)riftBrushStatus.hidden=!inBrush;
  const text=player.concealed?'HIDDEN':'REVEALED';if(riftBrushStatus.textContent!==text)riftBrushStatus.textContent=text;
  const concealed=String(player.concealed);if(riftBrushStatus.dataset.concealed!==concealed)riftBrushStatus.dataset.concealed=concealed;
}
function visibleMapUnits(){return [player,...enemies,...a04Minions,...a04Jungle,a04Pit].filter(e=>riftVision.visible(e));}
updateTeamVisibility();
const riftFog=createFogOfWar({vision:riftVision,document});
const riftArt=installRiftArt({scene,player,enemies,towers,cores:[blueCore,redCore],pitlord,pitOwner:a04Pit,minions:a04Minions,jungle:a04Jungle,heightAt:riftBattlefield.heightAt,focus:()=>cameraSmoothedFocus,onModel:model=>riftFog.apply(model)});
riftFog.apply(scene);riftFog.update(0,true);
const riftBrush=createBrushAppearance(player.group.getObjectByName('ramzx'));
const riftVfx=createCombatVfx({scene,player,camps,focus:()=>cameraSmoothedFocus,extent:()=>({x:Math.abs(Math.cos(yaw))*camera.right+Math.abs(Math.sin(yaw))*camera.top/Math.sin(pitch)+6,z:Math.abs(Math.sin(yaw))*camera.right+Math.abs(Math.cos(yaw))*camera.top/Math.sin(pitch)+6}),visibleAt:pos=>riftVision.effectVisible(pos),visibleUnit:unit=>riftVision.visible(unit)});
const riftLightSources=[...towers,blueCore,redCore].map(group=>({group,color:group.userData.team==='blue'?0x578dff:0xff4569,height:4,intensity:32}));
const riftGraphics=installGraphics({scene,renderer,camera,moon,lightSources:riftLightSources,onQuality:q=>riftVfx.setBudget(q.particles)});
riftArt.update(0);
camera.position.copy(player.group.position).add(camBaseOffset);
camera.lookAt(player.group.position.clone().add(lookAhead));

fxRing=(...args)=>riftVfx.ring(...args);
fxBurst=(...args)=>riftVfx.burst(...args);
let a07SlashRadius=2.4;
fxSlash=(pos,dir)=>riftVfx.slash(pos,dir,a07SlashRadius);
fxShield=()=>riftVfx.shieldCast();
fxAfterimage=pos=>riftVfx.afterimage(pos);
a04Projectile=(...args)=>riftVfx.projectile(...args);

const a07Sever=skill1;
skill1=function(...args){a07SlashRadius=4.8;try{return a07Sever(...args);}finally{a07SlashRadius=2.4;}};
const a07Step=skill3;
skill3=function(...args){const before=cds.s3,start=player.group.position.clone();const result=a07Step(...args);if(cds.s3>before){const p=player.group.position;p.y=riftBattlefield.heightAt(p.x,p.z);riftVfx.dash(start,p);}return result;};
const a07Ultimate=ultimate;
ultimate=function(...args){const before=cds.ult,first=FX.length,result=a07Ultimate(...args);if(cds.ult>before){
  // The new marker follows the target until expiry/consumption; remove the old static marker.
  for(let i=FX.length-1;i>=first;i--){const f=FX[i];if(f.type==='mark'){f.m.removeFromParent();f.m.geometry.dispose();f.m.material.dispose();FX.splice(i,1);}}
  riftVfx.ring(a04Pos(player.deadlineTarget),0xff345e,.5,1.8,.6);
}return result;};
const a07Attack=attack;
attack=function(...args){const target=player.deadlineTarget,before=cds.attack;const position=target?a04Pos(target).clone():null;const result=a07Attack(...args);if(target&&cds.attack>before&&!player.deadlineTarget)riftVfx.execution(position);return result;};
const a07HurtPlayer=hurtPlayer;
hurtPlayer=function(...args){const hp=player.hp,shield=player.shield;const result=a07HurtPlayer(...args);if(player.hp<hp||player.shield<shield)riftVfx.burst(player.group.position,player.shield>0?0xafa0ff:0xff6c82);return result;};

const a07Graphics=document.createElement('div');a07Graphics.id='graphicsControl';
a07Graphics.innerHTML='<label for="graphicsQuality">Graphics</label> <select id="graphicsQuality" aria-label="Graphics quality"><option value="maximum">Maximum</option><option value="high">High</option><option value="balanced">Balanced</option></select><label id="adaptiveControl" title="Automatically adjust resolution to help frame rate while keeping model detail"><input id="adaptiveResolution" type="checkbox"> Auto resolution</label>';
document.querySelector('#app').append(a07Graphics);
const a07Select=a07Graphics.querySelector('select');a07Select.value=riftGraphics.quality;
a07Select.addEventListener('change',()=>{a07Select.value=riftGraphics.setQuality(a07Select.value);});

const a08Adaptive=a07Graphics.querySelector('#adaptiveResolution');a08Adaptive.checked=riftGraphics.adaptive;
a08Adaptive.addEventListener('change',()=>riftGraphics.setAdaptive(a08Adaptive.checked));

function updateAlpha07(dt,t){riftArt.update(dt);riftBrush.update(player.concealed,dt);riftBattlefield.update(t);}
