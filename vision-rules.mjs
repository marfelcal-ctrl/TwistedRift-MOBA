import {MATCH,groundDistanceSq,mapPoints} from './match-rules.mjs';

export const VISION=Object.freeze({hero:12,minion:7,tower:9.5,core:11,revealSeconds:2});
// These visible tall-grass pockets are the only concealment areas. Decorative
// trees and cliffs retain the battlefield's existing movement rules.
export const BRUSHES=Object.freeze(mapPoints([
  [-42,-12,3,1.6],[-12,42,1.6,3],[42,12,3,1.6],[12,-42,1.6,3],
  [-16,-20,2.5,1.6],[16,20,2.5,1.6],[-6,10,2.6,1.5],[6,-10,2.6,1.5]
]).map(([x,z,rx,rz])=>Object.freeze({x,z,rx,rz})));
export const visionPosition=unit=>unit.group?.position||unit._group?.position;

export function createTeamVision({brushes=BRUSHES}={}){
  const teams={blue:[],red:[]},reveals=new Map();let time=0;
  const brushAt=p=>brushes.findIndex(b=>((p.x-b.x)/b.rx)**2+((p.z-b.z)/b.rz)**2<=1);
  const radius=unit=>VISION[unit.kind]||VISION.hero;
  function inRange(team,p,conceal=true){
    const brush=conceal?brushAt(p):-1;
    return (teams[team]||[]).some(unit=>unit.alive&&groundDistanceSq(visionPosition(unit),p)<=radius(unit)**2&&
      (brush===-1||brushAt(visionPosition(unit))===brush));
  }
  function revealed(unit,team){return (reveals.get(unit)?.[team]||0)>time&&inRange(team,visionPosition(unit),false);}
  function visible(unit,team='blue'){
    return !!(unit?.alive&&(unit.team===team||revealed(unit,team)||inRange(team,visionPosition(unit))));
  }
  function effectVisible(p,team='blue'){
    if(inRange(team,p))return true;
    for(const [unit]of reveals)if(unit.alive&&revealed(unit,team)&&groundDistanceSq(visionPosition(unit),p)<1.6**2)return true;
    return false;
  }
  return {brushAt,visible,effectVisible,pointVisible:(p,team='blue')=>inRange(team,p),
    sources:(team='blue')=>teams[team]||[],radius,
    refresh(units,t){time=t;teams.blue.length=teams.red.length=0;for(const u of units)if(u.alive&&teams[u.team])teams[u.team].push(u);
      for(const [u,until]of reveals)if(!u.alive||Math.max(until.blue||0,until.red||0)<=t)reveals.delete(u);},
    reveal(unit,team,t=time){if(!unit?.alive||unit.team===team||!teams[team]||!inRange(team,visionPosition(unit),false))return;
      const until=reveals.get(unit)||{};until[team]=t+VISION.revealSeconds;reveals.set(unit,until);},
    // The CPU mask is also used on the minimap. Combat queries never depend on
    // its resolution, interpolation, update cadence, or the camera position.
    rasterize(size=128,team='blue',out=new Uint8Array(size*size)){
      out.fill(0);const step=MATCH.worldSize/size,half=MATCH.worldSize/2;
      const paint=(p,r,conceal)=>{const x0=Math.max(0,Math.floor((p.x-r+half)/step)),x1=Math.min(size-1,Math.ceil((p.x+r+half)/step));
        const z0=Math.max(0,Math.floor((p.z-r+half)/step)),z1=Math.min(size-1,Math.ceil((p.z+r+half)/step));
        const sourceBrush=brushAt(p);
        for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
          const q={x:(x+.5)*step-half,z:(z+.5)*step-half},d=Math.hypot(q.x-p.x,q.z-p.z),brush=conceal?brushAt(q):-1;
          if(d>=r||brush!==-1&&sourceBrush!==brush)continue;
          out[z*size+x]=Math.max(out[z*size+x],Math.round(255*Math.min(1,(r-d)/.75)));
        }};
      for(const u of teams[team]||[])if(u.alive)paint(visionPosition(u),radius(u),true);
      for(const [u]of reveals)if(u.alive&&revealed(u,team))paint(visionPosition(u),1.6,false);
      return out;
    }
  };
}
