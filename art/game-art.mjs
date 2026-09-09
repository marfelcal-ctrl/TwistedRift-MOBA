import * as T from 'three';
import {makeHero,makeCreature,makeMinion,makeStructure,makeTerrain,animationClips} from './model-factory.mjs';
import {optimizeModel} from './optimize-model.mjs';
import {detailMaterial} from './graphics.mjs';

// Keep combat objects and their original animation references intact. Repeated
// units share geometry and materials; only their visible models are replaced.
export function installRiftArt({scene,player,enemies,towers,cores,pitlord,pitOwner,minions,jungle,heightAt=()=>0}){
  const animated=[],templates=new Map(),banners=[];let time=0;
  function get(key,build){
    if(!templates.has(key)){
      const model=optimizeModel(build());model.traverse(o=>{if(o.isMesh)detailMaterial(o.material);});templates.set(key,model);
    }
    const model=templates.get(key).clone(true);
    model.traverse(o=>{if(o.isGroup&&o.name.startsWith('banner_'))banners.push(o);});
    return model;
  }
  function animate(model,owner,hero=false){
    const clips=animationClips(model),mixer=new T.AnimationMixer(model);
    const actions=Object.fromEntries(clips.map(c=>[c.name,mixer.clipAction(c)]));
    if(actions.Attack){actions.Attack.setLoop(T.LoopOnce,1);actions.Attack.clampWhenFinished=true;actions.Attack.timeScale=2.5;}
    actions.Idle?.play();const wheels=[];model.traverse(o=>{if(o.name.startsWith('wheel_'))wheels.push(o);});
    animated.push({model,owner,hero,mixer,actions,wheels,state:'Idle',last:owner.group.position.clone(),lastHit:owner.nextHit||0,attackRemaining:0});
  }
  function hideOld(group,keep=[]){for(const c of group.children)if(!keep.includes(c))c.visible=false;}
  const hero=get('ramzx',()=>makeHero('ramzx'));hideOld(player.group,player.group.children.filter(x=>x.geometry?.type==='RingGeometry'));player.group.add(hero);animate(hero,player,true);
  for(const e of enemies){const id=e.type==='stoneback'?'stoneback':'kaelor';const m=get(id,()=>e.type==='stoneback'?makeCreature(id):makeHero(id));if(e.type!=='stoneback')m.scale.set(.62,.72,.62);hideOld(e.group,[e.hb]);e.group.add(m);animate(m,e);}
  for(const t of towers){const m=get(t.userData.team+'_'+t.userData.stage,()=>makeStructure(t.userData.team,t.userData.stage>=2?'defense_tower':'tower'));hideOld(t);t.add(m);t.userData.crystal=m.getObjectByName('crystal');}
  for(const c of cores){const m=get(c.userData.team+'_core',()=>makeStructure(c.userData.team,'core'));hideOld(c);c.add(m);c.userData.crystal=m.getObjectByName('crystal');}
  const boss=get('pitlord',()=>makeCreature('pitlord'));hideOld(pitlord);pitlord.add(boss);animate(boss,pitOwner||{group:pitlord});
  for(const j of jungle){const id={yellow:'stoneback',purple:'riftstalker',blue:'archivist',red:'scorchbeast'}[j.type];const m=get(id,()=>makeCreature(id));m.scale.setScalar(.85);hideOld(j.group);j.group.add(m);animate(m,j);}
  for(const [team,x,z]of [['blue',-55,55],['red',55,-55]]){const f=get(team+'_fountain',()=>makeStructure(team,'fountain'));f.position.set(x,0,z);scene.add(f);}
  scene.add(get('rift_pit',()=>makeTerrain('rift_pit')));
  for(const [team,points]of [['blue',[[-55,47],[-47,55],[-42,49],[-49,42]]],['red',[[55,-47],[47,-55],[42,-49],[49,-42]]]]){
    for(const [x,z]of points){const o=get(team+'_obelisk',()=>makeStructure(team,'tower'));o.position.set(x,0,z);o.scale.set(.48,.58,.48);scene.add(o);}
  }
  let nextMinion=0,special=0;
  return {update(dt){
    time+=dt;
    for(;nextMinion<minions.length;nextMinion++){
      const m=minions[nextMinion];if(!m.alive)continue;
      const type=m.type==='special'?((Math.floor(special++/4)%2)?'cannon':'siege'):m.type;
      const art=get(m.team+'_'+type,()=>makeMinion(m.team,type));art.scale.setScalar(.85);hideOld(m.group);m.group.add(art);animate(art,m);
    }
    for(let i=animated.length-1;i>=0;i--){
      const a=animated[i];
      if(a.owner.kind==='minion'&&!a.owner.alive){a.mixer.stopAllAction();a.mixer.uncacheRoot(a.model);a.owner.group.removeFromParent();animated.splice(i,1);continue;}
      const p=a.owner.group.position;p.y=heightAt(p.x,p.z);
      const moved=Math.hypot(p.x-a.last.x,p.z-a.last.z),moving=moved>.0005;
      const struck=(a.owner.nextHit||0)!==a.lastHit;a.lastHit=a.owner.nextHit||0;
      if(struck)a.attackRemaining=.42;else a.attackRemaining=Math.max(0,a.attackRemaining-dt);
      const state=(a.hero?player.attackAnim>0:a.attackRemaining>0)?'Attack':moving?'Walk':'Idle';
      if(state!==a.state||(struck&&state==='Attack')){a.actions[a.state]?.fadeOut(.08);a.actions[state]?.reset().fadeIn(.08).play();a.state=state;}
      for(const wheel of a.wheels)wheel.rotation.x+=moved/.28;
      if(a.wheels.length)a.model.rotation.x=a.attackRemaining>0?Math.sin((.42-a.attackRemaining)*15)*.055:0;
      a.last.copy(p);if(a.owner.group.visible)a.mixer.update(dt);
    }
    banners.forEach((b,i)=>{b.rotation.z=Math.sin(time*1.5+i)*.025;const cloth=b.children.find(o=>o.name.startsWith('cloth_'));if(cloth)cloth.rotation.x=.08+Math.sin(time*2+i)*.06;});
  },get animatedCount(){return animated.length;}};
}
