import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Window} from 'happy-dom';
import {createLobby} from '../../lobby.mjs';
import {createMatchFlow} from '../../match-flow.mjs';
import * as progression from '../../progression.mjs';
import * as rules from '../../match-rules.mjs';
import * as vision from '../../vision-rules.mjs';
import {BODY_RADIUS} from '../../navigation.mjs';
import {createFogOfWar} from '../../art/fog-of-war.mjs';
import {createBattlefield} from '../../art/battlefield.mjs';
import {installRiftArt} from '../../art/game-art.mjs';
import {createCombatVfx} from '../../art/combat-vfx.mjs';
import {QUALITY_PRESETS} from '../../art/graphics.mjs';
const dir=new URL('../../',import.meta.url);
export async function gameHarness({enter=true}={}){
  const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:false}});
  window.document.write(await fs.readFile(new URL('index.html',dir),'utf8'));
  window.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})},{get:(o,k)=>o[k]??(()=>{})});};
  window.HTMLElement.prototype.setPointerCapture=function(){};
  const bootstrap=await fs.readFile(new URL('alpha05_bootstrap.js',dir),'utf8');
  const capture={document:window.document,console,URL,Blob,location:{href:'https://example.invalid/'},setTimeout(){},fetch:async path=>({ok:true,text:()=>fs.readFile(new URL(path.split('?')[0],dir),'utf8')})};
  vm.createContext(capture);
  await vm.runInContext('(async()=>{'+bootstrap.replace('await import(url);','globalThis.captured=source;URL.revokeObjectURL(url);')+'})()',capture);
  assert.ok(capture.captured,'actual bootstrap must assemble source');
  class Renderer {constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}}
  const context=vm.createContext({THREE:{...T,WebGLRenderer:Renderer},...progression,...rules,...vision,BODY_RADIUS,createFogOfWar,createBattlefield,installRiftArt,createCombatVfx,createLobby,createMatchFlow,
    installGraphics({onQuality,camera}){let quality='maximum',adaptive=true;onQuality(QUALITY_PRESETS[quality]);return {get quality(){return quality;},get adaptive(){return adaptive;},setAdaptive(v){adaptive=v;},setQuality(q){quality=q;onQuality(QUALITY_PRESETS[q]);return q;},render(){},renderStage(){},resize(w=1440,h=900){Object.assign(camera,rules.cameraBounds(w,h));camera.updateProjectionMatrix();}};},
    document:window.document,console,innerWidth:1440,innerHeight:900,devicePixelRatio:1.5,performance:{now:()=>0},setTimeout(){return 0;},clearTimeout(){},requestAnimationFrame(){},addEventListener:window.addEventListener.bind(window)
  });
  const run=(s,timeout=30000)=>vm.runInContext(s,context,{timeout});
  run(capture.captured.replace(/^import .*;\n/gm,''));
  if(enter)run('riftLobby.begin();loop(0)');
  return {window,document:window.document,run,async dispose(){run('riftVfx.dispose();riftLobby.dispose();riftFog.dispose()');await window.happyDOM.abort();}};
}
