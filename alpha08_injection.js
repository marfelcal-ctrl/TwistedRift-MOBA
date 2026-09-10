// Alpha 0.8: the lobby and entry sequence pause the local practice simulation.
const riftLobby=createLobby({document,environment:scene.environment,renderer,player,items:A05_ITEMS,
  graphics:riftGraphics,isEnded:()=>a04Ended,buy:a05Buy,nearFountain:a05NearFountain,pitDefeated:()=>a04PitBuff.blue>0,
  onFirstSkill:key=>a06Spend(key),
  onEnter(){gameMode='battle';document.querySelector('#app').dataset.mode='battle';clearInput();cameraSmoothedFocus.copy(player.group.position).setY(0);renderer.shadowMap.needsUpdate=true;canvas.focus();announce('THE ABYSS AWAITS',1200);},
  onPause(){gameMode='lobby';document.querySelector('#app').dataset.mode='lobby';clearInput();a06SetOpen(false);a05Shop.style.display='none';},
  onRequestEntry(){gameMode='entry';document.querySelector('#app').dataset.mode='entry';clearInput();riftMatchFlow.show();}
});
const riftMatchFlow=createMatchFlow({document,portrait:id=>riftLobby.portrait(id),
  onPreviewReset:()=>riftLobby.preview('ramzx'),onBegin:()=>riftLobby.begin(),
  onCancel:reason=>{riftLobby.open();if(reason)a05ToastMsg(reason,'#dcb280');}
});
const a08UpdateUi=updateUi;
updateUi=function(t){a08UpdateUi(t);const kda=document.querySelector('#kdaText');kda.textContent=`☠ ${player.heroKills} / ${player.deaths} / ${player.assists}`;kda.setAttribute('aria-label',`Kills ${player.heroKills}, deaths ${player.deaths}, assists ${player.assists}`);};
