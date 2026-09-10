import * as T from 'three';
import {MATCH,mapPoints} from '../match-rules.mjs?version=alpha081';
import {makeHero,makeCreature,makeMinion,makeStructure,makeTerrain,animationClips} from './model-factory.mjs';
import {optimizeModel} from './optimize-model.mjs?version=alpha081';
import {detailMaterial} from './graphics.mjs?version=alpha081';

// Keep combat objects and their original animation references intact. Repeated
// units share geometry and materials; only their visible models are replaced.
export function installRiftArt({scene,player,enemies,towers,cores,pitlord,pitOwner,minions,jungle,heightAt=()=>0,focus=()=>player.group.position,onModel=()=>{}}){
  const animated=[],templates=new Map(),banners=[];let time=0;
  function get(key,build){
    if(!templates.has(key)){
      const model=optimizeModel(build());model.traverse(o=>{if(o.isMesh)detailMaterial(o.material);});templates.set(key,model);
    }
    const model=templates.get(key).clone(true);
    model.traverse(o=>{if(o.isGroup&&o.name.startsWith('banner_'))banners.push({joint:o,cloth:o.children.find(c=>c.name.startsWith('cloth_'))});});
    return model;
  }
  function animate(model,owner,hero=false){
    const clips=animationClips(model),mixer=new T.AnimationMixer(model);
    const actions=Object.fromEntries(clips.map(c=>[c.name,mixer.clipAction(c)]));
    if(actions.Attack){actions.Attack.setLoop(T.LoopOnce,1);actions.Attack.clampWhenFinished=true;actions.Attack.timeScale=2.5;}
    actions.Idle?.play();const wheels=[];model.traverse(o=>{if(o.name.startsWith('wheel_'))wheels.push(o);});
    animated.push({model,owner,hero,mixer,actions,wheels,state:'Idle',last:owner.group.position.clone(),lastHit:owner.nextHit||0,attackRemaining:0,animationTime:0,grounded:false});
  }
  function hideOld(group,keep=[]){for(const c of [...group.children])if(!keep.includes(c)){c.visible=false;c.removeFromParent();}}
  const hero=get('ramzx',()=>makeHero('ramzx'));hideOld(player.group,player.group.children.filter(x=>x.geometry?.type==='RingGeometry'));player.group.add(hero);animate(hero,player,true);
  for(const e of enemies){const id=e.type==='stoneback'?'stoneback':'kaelor';const m=get(id,()=>e.type==='stoneback'?makeCreature(id):makeHero(id));if(e.type!=='stoneback')m.scale.set(.62,.72,.62);hideOld(e.group,[e.hb]);e.group.add(m);animate(m,e);}
  for(const t of towers){const m=get(t.userData.team+'_'+t.userData.stage,()=>makeStructure(t.userData.team,t.userData.stage>=2?'defense_tower':'tower'));hideOld(t);t.add(m);t.userData.crystal=m.getObjectByName('crystal');}
  for(const c of cores){const m=get(c.userData.team+'_core',()=>makeStructure(c.userData.team,'core'));hideOld(c);c.add(m);c.userData.crystal=m.getObjectByName('crystal');}
  const boss=get('pitlord',()=>makeCreature('pitlord'));hideOld(pitlord);pitlord.add(boss);animate(boss,pitOwner||{group:pitlord});
  for(const j of jungle){const id={yellow:'stoneback',purple:'riftstalker',blue:'archivist',red:'scorchbeast'}[j.type];const m=get(id,()=>makeCreature(id));m.scale.setScalar(.85);hideOld(j.group);j.group.add(m);animate(m,j);}
  for(const [team,[x,z]]of Object.entries(MATCH.fountain)){const f=get(team+'_fountain',()=>makeStructure(team,'fountain'));f.position.set(x,0,z);f.scale.setScalar(.8);scene.add(f);}
  scene.add(get('rift_pit',()=>makeTerrain('rift_pit')));
  for(const [team,points]of [['blue',[[-55,47],[-47,55],[-42,49],[-49,42]]],['red',[[55,-47],[47,-55],[42,-49],[49,-42]]]]){
    for(const [x,z]of mapPoints(points)){const o=get(team+'_obelisk',()=>makeStructure(team,'tower'));o.position.set(x,0,z);o.scale.set(.48,.58,.48);scene.add(o);}
  }
  const attachedMinions=new WeakSet();
  return {update(dt){
    time+=dt;
    for(const m of minions){
      if(!m.alive||attachedMinions.has(m))continue;attachedMinions.add(m);
      const type=m.visualType||(m.type==='special'?'siege':m.type);
      const art=get(m.team+'_'+type,()=>makeMinion(m.team,type));art.scale.setScalar(.85);onModel(art);hideOld(m.group);m.group.add(art);animate(art,m);
    }
    for(let i=animated.length-1;i>=0;i--){
      const a=animated[i];
      if(a.owner.kind==='minion'&&!a.owner.alive){a.mixer.stopAllAction();a.mixer.uncacheRoot(a.model);a.owner.group.removeFromParent();animated.splice(i,1);continue;}
      const p=a.owner.group.position;
      if(!a.grounded||p.x!==a.last.x||p.z!==a.last.z){p.y=heightAt(p.x,p.z);a.grounded=true;}
      const moved=Math.hypot(p.x-a.last.x,p.z-a.last.z),moving=moved>.0005;
      const struck=(a.owner.nextHit||0)!==a.lastHit;a.lastHit=a.owner.nextHit||0;
      if(struck)a.attackRemaining=.42;else a.attackRemaining=Math.max(0,a.attackRemaining-dt);
      const state=(a.hero?player.attackAnim>0:a.attackRemaining>0)?'Attack':moving?'Walk':'Idle';
      if(state!==a.state||(struck&&state==='Attack')){a.actions[a.state]?.fadeOut(.08);a.actions[state]?.reset().fadeIn(.08).play();a.state=state;}
      for(const wheel of a.wheels)wheel.rotation.x+=moved/.28;
      if(a.wheels.length)a.model.rotation.x=a.attackRemaining>0?Math.sin((.42-a.attackRemaining)*15)*.055:0;
      a.last.copy(p);a.animationTime+=dt;
      const cameraFocus=focus(),near=Math.abs(p.x-cameraFocus.x)<28&&Math.abs(p.z-cameraFocus.z)<28;
      if(a.owner.group.visible&&(near||a.animationTime>=.15)){a.mixer.update(a.animationTime);a.animationTime=0;}
    }
    banners.forEach(({joint,cloth},i)=>{joint.rotation.z=Math.sin(time*1.5+i)*.025;if(cloth)cloth.rotation.x=.08+Math.sin(time*2+i)*.06;});
  },get animatedCount(){return animated.length;}};
}
