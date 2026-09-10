import * as T from 'three';
import {makeHero,heroes,animationClips} from './art/model-factory.mjs';
import {optimizeModel} from './art/optimize-model.mjs?version=alpha081';
import {detailMaterial} from './art/graphics.mjs?version=alpha081';

// One real 3D preview, sharing the game's renderer and reflection environment.
// Only the selected hero is built; browsing does not run a second battlefield.
export function createLobby({document,environment,renderer,player,items,onEnter,onPause,onRequestEntry,isEnded,buy,nearFountain,pitDefeated,graphics,onFirstSkill}){
  const el=document.querySelector('#lobby'),drawer=document.querySelector('#lobbyDrawer'),content=document.querySelector('#lobbyDrawerContent');
  const stage=new T.Scene();stage.background=new T.Color(0x0a080c);stage.fog=new T.FogExp2(0x120d12,.047);stage.environment=environment;stage.environmentIntensity=.4;
  const camera=new T.PerspectiveCamera(33,1,.1,65);camera.position.set(.2,2.7,10.5);camera.lookAt(0,2,0);
  stage.add(new T.HemisphereLight(0x857fa7,0x291810,1.7));
  const key=new T.DirectionalLight(0xffd4a0,3.8);key.position.set(-4,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-5,near:1,far:24});key.shadow.normalBias=.025;key.shadow.camera.updateProjectionMatrix();stage.add(key);
  const rim=new T.PointLight(0xff3c1b,65,14,2);rim.position.set(2,3,-2);stage.add(rim);
  const fill=new T.PointLight(0x7472cf,35,12,2);fill.position.set(-3,3,1);stage.add(fill);
  const plinth=new T.Mesh(new T.CylinderGeometry(2.65,2.9,.35,48),new T.MeshStandardMaterial({color:0x252025,roughness:.82,metalness:.35}));plinth.position.y=-.2;plinth.receiveShadow=true;stage.add(plinth);
  const rimMaterial=new T.MeshStandardMaterial({color:0x7d2718,emissive:0xa52b12,emissiveIntensity:2,roughness:.5});
  for(const radius of [2.35,2.65]){const ring=new T.Mesh(new T.TorusGeometry(radius,.018,6,72),rimMaterial);ring.rotation.x=Math.PI/2;ring.position.y=-.012;stage.add(ring);}
  for(let i=0;i<12;i++){const rune=new T.Mesh(new T.BoxGeometry(.04,.013,.24),rimMaterial),a=i*Math.PI/6;rune.position.set(Math.sin(a)*2.5,0,Math.cos(a)*2.5);rune.rotation.y=a;stage.add(rune);}
  const motes=new T.InstancedMesh(new T.OctahedronGeometry(.016),new T.MeshBasicMaterial({color:0xe7753a,transparent:true,opacity:.65}),48);motes.frustumCulled=false;stage.add(motes);const dummy=new T.Object3D();
  let model,mixer,ownedMaterials=[],ownedGeometry=[],selected='ramzx',tab='',started=false,elapsed=0,firstSkill='',uiTime=0;
  function preview(id){
    if(!heroes.includes(id))return;
    if(model){mixer?.stopAllAction();mixer?.uncacheRoot(model);model.removeFromParent();ownedMaterials.forEach(m=>m.dispose());ownedGeometry.forEach(g=>g.dispose());}
    const raw=makeHero(id),materials=new Map();
    raw.traverse(o=>{if(o.isMesh){if(!materials.has(o.material)){const m=o.material.clone();delete m.userData.riftSurface;detailMaterial(m);materials.set(o.material,m);}o.material=materials.get(o.material);}});
    model=optimizeModel(raw);ownedMaterials=[...materials.values()];const geometries=new Set();model.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});ownedGeometry=[...geometries];
    selected=id;model.rotation.y=-.2;stage.add(model);mixer=new T.AnimationMixer(model);
    const clips=animationClips(model),idle=clips.find(c=>c.name==='Idle');if(idle)mixer.clipAction(idle).play();
    const arm=model.getObjectByName('arm_r');if(arm)arm.rotation.z=-.2;
    document.querySelector('#lobbyHeroName').textContent=id.toUpperCase();document.querySelector('#lobbyHeroTitle').textContent=model.userData.title;
    document.querySelector('#heroAvailability').textContent=id==='ramzx'?'READY FOR THE DESCENT':'HERO GALLERY · RAMZX ENTERS THIS ALPHA';
    refresh();
  }
  function refresh(){
    document.querySelector('#lobbyGold').textContent=Math.floor(player.gold).toLocaleString();document.querySelector('#profileLevel').textContent=`LV ${player.level}`;
    document.querySelector('#enterAbyssLabel').textContent=isEnded()?'NEW DESCENT':started?'RETURN TO BATTLE':'ENTER THE ABYSS';
    document.querySelector('#lobbyMode').textContent=isEnded()?'THE BATTLE HAS ENDED':started?'MATCH PAUSED · SOLO PRACTICE':'TWISTED RIFT · SOLO PRACTICE';
  }
  function button(label,action,className='lobbySmallButton'){const b=document.createElement('button');b.type='button';b.className=className;b.textContent=label;b.addEventListener('click',action);return b;}
  function paragraph(text,className='drawerIntro'){const p=document.createElement('p');p.className=className;p.textContent=text;content.append(p);return p;}
  function card(title,description){const c=document.createElement('article');c.className='lobbyCard';const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=description;c.append(h,p);content.append(c);return c;}
  function renderTab(){
    content.replaceChildren();document.querySelector('#lobbyDrawerTitle').textContent=tab.toUpperCase();
    if(tab==='Armory'){
      paragraph(nearFountain()?'Spend battle gold to equip an item. Six equipment slots.':'Browse equipment here. Return to your fountain to buy.');
      for(const item of items){const own=player.items.some(x=>x.id===item.id),c=card(item.name,item.desc);const b=button(own?'EQUIPPED':`${item.price.toLocaleString()} GOLD`,()=>{buy(item.id);refresh();renderTab();});b.disabled=own||!nearFountain()||player.gold<item.price||player.items.length>=6;c.append(b);}
    }else if(tab==='Heroes'){
      paragraph('Inspect the Rift’s champions in 3D. RAMZX is playable in this alpha.');
      const grid=document.createElement('div');grid.className='heroRoster';content.append(grid);
      for(const id of heroes){const b=button(id.toUpperCase(),()=>{preview(id);renderTab();},'heroRosterCard');b.dataset.hero=id;b.setAttribute('aria-pressed',String(id===selected));const s=document.createElement('small');s.textContent=id==='ramzx'?'PLAYABLE':'3D GALLERY';b.append(s);grid.append(b);}
    }else if(tab==='Quests'){
      paragraph('Trials for your current descent. Progress follows this battle.');
      for(const [title,text,complete]of [['Baptism of Iron','Defeat the Rift Sentinel.',player.heroKills>0],['Temper the Soul','Reach hero level 6.',player.level>=6],['Silence the Pit','Slay the Pitlord.',pitDefeated()]]){const c=card(title,text),b=document.createElement('span');b.className='questState';b.textContent=complete?'COMPLETED':'IN PROGRESS';c.append(b);}
    }else if(tab==='Forge'){
      paragraph('Choose your opening discipline. All later upgrades remain your choice in battle.');
      const label=document.createElement('label');label.className='forgeField';label.textContent='First skill';const select=document.createElement('select');select.id='openingSkill';select.setAttribute('aria-label','First skill');
      for(const [value,text]of [['','Choose in battle'],['s1','Sever · Cleave'],['s2','Iron Order · Shield'],['s3','Execution Step · Dash']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=firstSkill;select.disabled=started;select.addEventListener('change',()=>firstSkill=select.value);label.append(select);content.append(label);
      paragraph('Ultimate ranks unlock at levels 4, 6 and 9. Stats +2 unlock at level 6. Leveling grants one point; health does not grow automatically.');
      const graphicsLabel=document.createElement('label');graphicsLabel.className='forgeField';graphicsLabel.textContent='Graphics';const quality=document.createElement('select');quality.id='lobbyQuality';quality.setAttribute('aria-label','Lobby graphics quality');
      for(const value of ['maximum','high','balanced']){const option=document.createElement('option');option.value=value;option.textContent=value[0].toUpperCase()+value.slice(1);quality.append(option);}quality.value=graphics.quality;quality.addEventListener('change',()=>{quality.value=graphics.setQuality(quality.value);document.querySelector('#graphicsQuality').value=quality.value;});graphicsLabel.append(quality);content.append(graphicsLabel);
      const autoLabel=document.createElement('label');autoLabel.className='forgeCheck';const auto=document.createElement('input');auto.type='checkbox';auto.checked=graphics.adaptive;auto.setAttribute('aria-label','Automatic resolution');auto.addEventListener('change',()=>{graphics.setAdaptive(auto.checked);document.querySelector('#adaptiveResolution').checked=auto.checked;});autoLabel.append(auto,document.createTextNode(' Auto resolution · keep model detail'));content.append(autoLabel);
    }
  }
  function closeDrawer(){tab='';drawer.hidden=true;document.querySelectorAll('[data-lobby-tab]').forEach(b=>b.setAttribute('aria-expanded','false'));}
  function openTab(name){if(tab===name){closeDrawer();return;}tab=name;drawer.hidden=false;document.querySelectorAll('[data-lobby-tab]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.lobbyTab===name)));renderTab();}
  for(const b of document.querySelectorAll('[data-lobby-tab]'))b.addEventListener('click',()=>openTab(b.dataset.lobbyTab));
  document.querySelector('#closeLobbyDrawer').addEventListener('click',closeDrawer);
  function begin(){if(!started&&firstSkill)onFirstSkill(firstSkill);started=true;el.hidden=true;onEnter();}
  function enter(){if(isEnded()){document.defaultView.location.reload();return;}closeDrawer();if(started)begin();else onRequestEntry();}
  function open(){el.hidden=false;onPause();refresh();if(tab)renderTab();document.querySelector('#enterAbyss').focus();}
  document.querySelector('#enterAbyss').addEventListener('click',enter);document.querySelector('#battleMenu').addEventListener('click',open);
  document.addEventListener('keydown',e=>{if(!el.hidden&&e.code==='Escape')closeDrawer();});
  preview('ramzx');refresh();
  return {stage,camera,enter,begin,open,preview,get selected(){return selected;},get started(){return started;},
    portrait(id){
      preview(id);
      const width=256,height=384,target=new T.WebGLRenderTarget(width,height),portraitCamera=new T.PerspectiveCamera(33,width/height,.1,65);
      target.texture.colorSpace=T.SRGBColorSpace;
      const box=new T.Box3().setFromObject(model,true),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
      const fov=Math.tan(portraitCamera.fov*Math.PI/360),distance=Math.max(size.y/(2*fov),size.x/(2*fov*portraitCamera.aspect))*1.14;
      portraitCamera.position.set(center.x+.15,center.y+.25,center.z+distance);portraitCamera.lookAt(center);
      const previous=renderer.getRenderTarget();
      try{
        renderer.setRenderTarget(target);renderer.shadowMap.needsUpdate=true;renderer.render(stage,portraitCamera);
        const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),image=context.createImageData(width,height);
        for(let y=0;y<height;y++)image.data.set(pixels.subarray(y*width*4,(y+1)*width*4),(height-y-1)*width*4);
        context.putImageData(image,0,0);return canvas.toDataURL('image/png');
      }finally{renderer.setRenderTarget(previous);target.dispose();}
    },
    resize(width,height){camera.aspect=width/height;camera.position.z=width/height<1?13:10.5;camera.setViewOffset(width,height,-width*(width/height<1?.055:.07),0,width,height);camera.updateProjectionMatrix();},
    update(dt){elapsed+=dt;mixer?.update(dt);model.rotation.y=-.2+Math.sin(elapsed*.28)*.13;rim.intensity=62+Math.sin(elapsed*1.4)*4;
      for(let i=0;i<48;i++){const a=i*2.399+elapsed*.035,r=1.2+(i%7)*.35;dummy.position.set(Math.sin(a)*r,(i*.163+elapsed*.13)%4.5,Math.cos(a)*r);dummy.scale.setScalar(.5+Math.sin(i+elapsed)*.3);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);}motes.instanceMatrix.needsUpdate=true;
      uiTime+=dt;if(uiTime>.5){refresh();uiTime=0;}
    },dispose(){mixer?.stopAllAction();ownedMaterials.forEach(m=>m.dispose());ownedGeometry.forEach(g=>g.dispose());const geometries=new Set(),materials=new Set();stage.traverse(o=>{if(o.isMesh&&o!==model){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());motes.dispose();}
  };
}
