import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import fs from 'node:fs/promises';
import {createMatchFlow,PREVIEW_TEAMS} from '../match-flow.mjs';
import {minimapProject,minimapUnproject,MATCH} from '../match-rules.mjs';
import {gameHarness} from './helpers/game-harness.mjs';

test('round minimap retains every map corner and drag scouting is its inverse',()=>{
  for(const x of [-42,0,42])for(const z of [-42,0,42]){const p=minimapProject(x,z,220,220);assert.ok(Math.hypot(p[0]-110,p[1]-110)<110);const q=minimapUnproject(p[0]/220,p[1]/220);assert.ok(Math.abs(x-q[0])<1e-8);assert.ok(Math.abs(z-q[1])<1e-8);}
  const outer=minimapUnproject(0,0);assert.equal(outer[0],-MATCH.worldSize/2);assert.equal(outer[1],-MATCH.worldSize/2);
});
test('acceptance preview requires the player oath, supports expiry/cancel, and prepares ten real portrait jobs',async()=>{
  const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:false}}),document=window.document;
  document.write(await fs.readFile(new URL('../index.html',import.meta.url),'utf8'));
  let began=0,canceled=0,portraits=[];
  const flow=createMatchFlow({document,portrait:id=>{portraits.push(id);return 'data:image/png;base64,preview-fixture';},onBegin:()=>began++,onCancel:()=>canceled++,onPreviewReset(){}});
  try{
    flow.show();for(let i=0;i<21;i++)flow.update(1);assert.equal(flow.phase,'idle');assert.equal(canceled,1);assert.equal(began,0);
    flow.show();document.querySelector('#cancelMatch').click();assert.equal(canceled,2);assert.equal(document.querySelector('#matchFlow').hidden,true);
    flow.show();flow.update(2);assert.equal(document.querySelector('#readyCount').textContent,'9 / 10 READY');assert.equal(began,0);
    document.querySelector('#acceptBattle').click();document.querySelector('#acceptBattle').click();flow.update(.05);assert.equal(flow.phase,'loading');assert.equal(document.querySelectorAll('.readyShield.ready').length,10);
    for(let i=0;i<50;i++)flow.update(.1);assert.equal(flow.phase,'idle');assert.equal(began,1);assert.deepEqual(portraits,[...PREVIEW_TEAMS.allies,...PREVIEW_TEAMS.enemies]);
    assert.equal(document.querySelectorAll('.versusCard img').length,10);assert.equal(document.querySelector('#assetProgressFill').style.width,'100%');
    assert.match(document.querySelector('.flowDisclosure').textContent,/preview/);
  }finally{await window.happyDOM.abort();}
});
test('actual lobby: game remains paused; hero gallery, forge and acceptance lead into battle once',async()=>{
  const g=await gameHarness({enter:false});try{
    assert.equal(g.document.querySelector('#app').dataset.mode,'lobby');
    g.run('for(let i=1;i<=100;i++)loop(i*100)');assert.equal(g.run('clock.time'),0);assert.equal(g.run('a04Wave'),0);
    g.window.dispatchEvent(new g.window.KeyboardEvent('keydown',{code:'KeyW'}));assert.equal(g.run('keys.size'),0);
    g.document.querySelector('[data-lobby-tab="Heroes"]').click();assert.equal(g.document.querySelectorAll('.heroRosterCard').length,10);
    g.document.querySelector('[data-hero="nyra"]').click();assert.equal(g.run('riftLobby.selected'),'nyra');assert.equal(g.document.querySelector('#lobbyHeroName').textContent,'NYRA');assert.match(g.document.querySelector('#heroAvailability').textContent,/GALLERY/);
    g.document.querySelector('[data-lobby-tab="Forge"]').click();const first=g.document.querySelector('#openingSkill');first.value='s2';first.dispatchEvent(new g.window.Event('change'));assert.equal(g.run('player.upgrades.points'),1);
    g.document.querySelector('#enterAbyss').click();assert.equal(g.document.querySelector('#app').dataset.mode,'entry');assert.equal(g.document.querySelector('#matchFlow').hidden,false);
    g.document.querySelector('#acceptBattle').click();g.run('for(let i=101;i<=158;i++)loop(i*100)');
    assert.equal(g.document.querySelector('#app').dataset.mode,'battle');assert.equal(g.run('player.upgrades.ranks.s2'),1);assert.equal(g.run('player.upgrades.points'),0);assert.equal(g.run('cds.s2'),0);
    assert.equal(g.document.querySelector('#lobby').hidden,true);assert.equal(g.run('riftLobby.selected'),'ramzx');assert.equal(g.document.querySelectorAll('[data-portrait-error="true"]').length,10);
    const before=g.run('clock.time');g.document.querySelector('#battleMenu').click();g.run('for(let i=159;i<=200;i++)loop(i*100)');assert.equal(g.run('clock.time'),before);
    g.document.querySelector('#enterAbyss').click();assert.equal(g.document.querySelector('#app').dataset.mode,'battle');assert.equal(g.run('player.upgrades.points'),0);assert.equal(g.document.querySelector('#matchFlow').hidden,true);
  }finally{await g.dispose();}
});
test('armory purchases use battle gold, quest states reflect play, and scoreboard tracks hero deaths/kills',async()=>{
  const g=await gameHarness({enter:false});try{
    g.document.querySelector('[data-lobby-tab="Armory"]').click();assert.equal(g.document.querySelectorAll('.lobbyCard').length,6);assert.equal(g.document.querySelector('.lobbySmallButton').disabled,true);
    g.run('player.gold=1200');g.document.querySelector('[data-lobby-tab="Quests"]').click();g.document.querySelector('[data-lobby-tab="Armory"]').click();g.document.querySelector('.lobbySmallButton').click();assert.equal(g.run('player.items[0].id'),'warboots');assert.equal(g.run('player.gold'),100);
    g.run('riftLobby.begin();loop(0);player.hp=10;hurtPlayer(20);updateUi(now())');assert.match(g.document.querySelector('#kdaText').getAttribute('aria-label'),/deaths 1/);
    g.run('a03HurtEnemy(enemies[0],99999);updateUi(now())');assert.match(g.document.querySelector('#kdaText').getAttribute('aria-label'),/Kills 1/);
    g.document.querySelector('#battleMenu').click();g.document.querySelector('[data-lobby-tab="Quests"]').click();assert.equal(g.document.querySelector('.questState').textContent,'COMPLETED');
  }finally{await g.dispose();}
});
