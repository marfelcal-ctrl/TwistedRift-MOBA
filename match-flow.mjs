// A clearly labelled local practice entry flow, with a preview 5v5 lineup.
// There is no network matchmaking service or simulated human acceptance claim.
export const PREVIEW_TEAMS=Object.freeze({allies:['ramzx','nyra','grimm','sera','kairo'],enemies:['kaelor','veyra','raze','volkrin','zyrel']});
export function createMatchFlow({document,portrait,onBegin,onCancel,onPreviewReset}){
  const root=document.querySelector('#matchFlow'),ready=document.querySelector('#readyScreen'),versus=document.querySelector('#versusScreen'),accept=document.querySelector('#acceptBattle');
  const shields=[],cards=[],lineup=[...PREVIEW_TEAMS.allies,...PREVIEW_TEAMS.enemies];
  const crest='<svg viewBox="0 0 30 36" aria-hidden="true"><path d="m3 4 12-3 12 3v16L15 33 3 20Z"/><path d="m15 7 5 10-5 10-5-10Z"/></svg>';
  for(let i=0;i<10;i++){
    const shield=document.createElement('div');shield.className='readyShield'+(i===0?' playerSlot':'');shield.innerHTML=crest;shield.setAttribute('aria-label',i===0?'Your acceptance pending':`Preview slot ${i+1}, pending`);(i<5?document.querySelector('#allyShields'):document.querySelector('#enemyShields')).append(shield);shields.push(shield);
    const card=document.createElement('article');card.className='versusCard';card.dataset.hero=lineup[i];
    const name=document.createElement('strong');name.className='heroCardName';name.textContent=lineup[i].toUpperCase();
    const footer=document.createElement('footer'),playerName=document.createElement('strong');playerName.textContent=i===0?'YOU · RAMZX':`${i<5?'ALLY':'ENEMY'} ${i<5?i+1:i-4} · PREVIEW`;
    const progress=document.createElement('small');progress.textContent='0%';const track=document.createElement('div');track.className='cardProgress';const fill=document.createElement('i');track.append(fill);footer.append(playerName,progress,track);card.append(name,footer);(i<5?document.querySelector('#allyCards'):document.querySelector('#enemyCards')).append(card);cards.push({card,progress,fill});
  }
  let phase='idle',time=0,accepted=false,job=0,jobStage=0,finishedTime=0;
  function show(){phase='ready';time=0;accepted=false;job=0;jobStage=0;finishedTime=0;root.hidden=false;ready.hidden=false;versus.hidden=true;accept.disabled=false;accept.textContent='ENTER BATTLE';
    for(const s of shields){s.classList.remove('ready');s.setAttribute('aria-label',s===shields[0]?'Your acceptance pending':'Preview slot, pending');}
    for(const c of cards){c.card.querySelector('img')?.remove();c.progress.textContent='0%';c.fill.style.width='0%';c.card.removeAttribute('data-portrait-error');}
    document.querySelector('#readyCountdown').textContent='20';document.querySelector('#readyCount').textContent='0 / 10 READY';document.querySelector('.runestone').style.setProperty('--countdown-angle','360deg');document.querySelector('#flowStatus').textContent='Confirm your descent. Other seals show the preview lineup.';document.querySelector('#assetProgressFill').style.width='0%';document.querySelector('#assetProgress').textContent='Preparing hero portraits · 0 / 10';accept.focus();
  }
  function cancel(reason=''){if(phase==='idle')return;phase='idle';root.hidden=true;onPreviewReset();onCancel(reason);}
  function startLoading(){phase='loading';ready.hidden=true;versus.hidden=false;time=0;document.querySelector('#assetProgress').textContent='Preparing hero portraits · 0 / 10';}
  accept.addEventListener('click',()=>{if(phase!=='ready'||accepted)return;accepted=true;accept.disabled=true;accept.textContent='OATH SEALED';shields[0].classList.add('ready');shields[0].setAttribute('aria-label','Your oath accepted');document.querySelector('#flowStatus').textContent='Preparing the descent…';});
  document.querySelector('#cancelMatch').addEventListener('click',()=>cancel());
  document.addEventListener('keydown',e=>{if(e.code==='Escape'&&phase==='ready')cancel();});
  return {show,cancel,get phase(){return phase;},update(dt){
    if(phase==='idle')return;time+=dt;
    if(phase==='ready'){
      let count=accepted?1:0;
      for(let i=1;i<10;i++)if(time>=i*.17){shields[i].classList.add('ready');shields[i].setAttribute('aria-label',`Preview crest ${i+1}, illuminated`);count++;}
      const remaining=Math.max(0,20-time);document.querySelector('#readyCountdown').textContent=String(Math.ceil(remaining));document.querySelector('#readyCount').textContent=`${count} / 10 READY`;document.querySelector('.runestone').style.setProperty('--countdown-angle',`${remaining/20*360}deg`);
      if(accepted&&count===10)startLoading();else if(!remaining)cancel('The oath expired. Enter the Abyss when ready.');
    }else if(phase==='loading'){
      if(job<lineup.length){
        const c=cards[job];
        if(jobStage===0){c.progress.textContent='25%';c.fill.style.width='25%';jobStage=1;}
        else{
          try{const src=portrait(lineup[job]);if(src){const img=document.createElement('img');img.alt=`${lineup[job].toUpperCase()} 3D hero portrait`;img.src=src;c.card.prepend(img);}else throw Error('Portrait unavailable');c.progress.textContent='100%';}
          catch{c.progress.textContent='READY · NO PORTRAIT';c.card.dataset.portraitError='true';}
          c.fill.style.width='100%';job++;jobStage=0;document.querySelector('#assetProgress').textContent=`Preparing hero portraits · ${job} / 10`;document.querySelector('#assetProgressFill').style.width=`${job*10}%`;
        }
      }else{finishedTime+=dt;if(finishedTime>=1.2){phase='idle';root.hidden=true;onPreviewReset();onBegin();}}
    }
  }};
}
