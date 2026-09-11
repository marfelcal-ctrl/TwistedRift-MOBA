import {MATCH,groundDistanceSq,mapPoints} from './match-rules.mjs?version=alpha082';

export const VISION=Object.freeze({hero:12,minion:7,tower:9.5,core:11,revealSeconds:2});
// Tall grass conceals occupants. Decorative trees are passable; stone terrain
// blocks sight using the same placement footprints as movement collision.
export const BRUSHES=Object.freeze(mapPoints([
  [-42,-12,3,1.6],[-12,42,1.6,3],[42,12,3,1.6],[12,-42,1.6,3],
  [-16,-20,2.5,1.6],[16,20,2.5,1.6],[-6,10,2.6,1.5],[6,-10,2.6,1.5]
]).map(([x,z,rx,rz])=>Object.freeze({x,z,rx,rz})));
export const visionPosition=unit=>unit.group?.position||unit._group?.position;

export function createTeamVision({brushes=BRUSHES,lineOfSight=()=>true,sightRevision=()=>0}={}){
  const teams={blue:[],red:[]},reveals=new Map(),sourceMasks=new WeakMap(),rasterGrids=new Map();let time=0;
  const brushAt=p=>brushes.findIndex(b=>((p.x-b.x)/b.rx)**2+((p.z-b.z)/b.rz)**2<=1);
  const radius=unit=>VISION[unit.kind]||VISION.hero;
  function sees(p,q,r,conceal=true){
    if(groundDistanceSq(p,q)>r*r)return false;
    const brush=conceal?brushAt(q):-1;
    return (brush===-1||brushAt(p)===brush)&&lineOfSight(p,q);
  }
  function inRange(team,p,conceal=true){
    return (teams[team]||[]).some(unit=>unit.alive&&sees(visionPosition(unit),p,radius(unit),conceal));
  }
  function exposed(unit,team){const until=reveals.get(unit);return (team==='neutral'?Math.max(until?.blue||0,until?.red||0):(until?.[team]||0))>time;}
  function revealed(unit,team){return exposed(unit,team)&&inRange(team,visionPosition(unit),false);}
  function visible(unit,team='blue'){
    return !!(unit?.alive&&(unit.team===team||revealed(unit,team)||inRange(team,visionPosition(unit))));
  }
  function effectVisible(p,team='blue'){
    if(inRange(team,p))return true;
    for(const [unit]of reveals)if(unit.alive&&revealed(unit,team)&&groundDistanceSq(visionPosition(unit),p)<1.6**2&&
      inRange(team,p,false)&&lineOfSight(visionPosition(unit),p))return true;
    return false;
  }
  function rasterGrid(size){
    if(rasterGrids.has(size))return rasterGrids.get(size);
    const step=MATCH.worldSize/size,half=MATCH.worldSize/2,coordinates=Float64Array.from({length:size},(_,i)=>(i+.5)*step-half),brush=new Int16Array(size*size);
    for(let z=0;z<size;z++)for(let x=0;x<size;x++)brush[z*size+x]=brushAt({x:coordinates[x],z:coordinates[z]});
    const grid={step,half,coordinates,brush};rasterGrids.set(size,grid);return grid;
  }
  function region(p,r,size,{step,half}){
    const x0=Math.max(0,Math.floor((p.x-r+half)/step)),x1=Math.min(size-1,Math.ceil((p.x+r+half)/step));
    const z0=Math.max(0,Math.floor((p.z-r+half)/step)),z1=Math.min(size-1,Math.ceil((p.z+r+half)/step));
    return {x0,z0,width:Math.max(0,x1-x0+1),height:Math.max(0,z1-z0+1)};
  }
  function sourceMask(unit,size,grid){
    const p=visionPosition(unit),r=radius(unit),revision=sightRevision();let cached=sourceMasks.get(unit);
    if(cached&&cached.x===p.x&&cached.z===p.z&&cached.size===size&&cached.radius===r&&cached.revision===revision)return cached;
    const bounds=region(p,r,size,grid),{x0,z0,width,height}=bounds,length=width*height;
    const mask=cached?.mask.length===length?cached.mask:new Uint8Array(length);mask.fill(0);
    cached={...bounds,mask,x:p.x,z:p.z,size,radius:r,revision};sourceMasks.set(unit,cached);
    const sourceBrush=brushAt(p),q={x:0,z:0};
    for(let z=0;z<height;z++){q.z=grid.coordinates[z+z0];for(let x=0;x<width;x++){
      q.x=grid.coordinates[x+x0];const d2=groundDistanceSq(q,p),brush=grid.brush[(z+z0)*size+x+x0];
      if(d2>=r*r||(brush!==-1&&sourceBrush!==brush)||!lineOfSight(p,q))continue;
      mask[z*width+x]=Math.round(255*Math.min(1,(r-Math.sqrt(d2))/.75));
    }}return cached;
  }
  return {brushAt,visible,effectVisible,pointVisible:(p,team='blue')=>inRange(team,p),
    canSee:(observer,unit,range=radius(observer))=>!!(observer?.alive&&unit?.alive&&sees(visionPosition(observer),visionPosition(unit),range,!exposed(unit,observer.team))),
    sources:(team='blue')=>teams[team]||[],radius,
    refresh(units,t){time=t;teams.blue.length=teams.red.length=0;for(const u of units)if(u.alive&&teams[u.team])teams[u.team].push(u);
      for(const [u,until]of reveals)if(!u.alive||Math.max(until.blue||0,until.red||0)<=t)reveals.delete(u);},
    reveal(unit,team,t=time){if(!unit?.alive||unit.team===team||!teams[team])return;
      const until=reveals.get(unit)||{};until[team]=t+VISION.revealSeconds;reveals.set(unit,until);},
    // The CPU mask is also used on the minimap. Combat queries never depend on
    // its resolution, interpolation, update cadence, or the camera position.
    // Stationary sources reuse their own small masks; moving sources raycast
    // only their radius through the navigation buckets, at the fog's 10 Hz.
    rasterize(size=128,team='blue',out=new Uint8Array(size*size)){
      out.fill(0);const grid=rasterGrid(size);
      for(const u of teams[team]||[])if(u.alive){
        const {x0,z0,width,height,mask}=sourceMask(u,size,grid);
        for(let z=0;z<height;z++)for(let x=0;x<width;x++){const index=(z+z0)*size+x+x0;out[index]=Math.max(out[index],mask[z*width+x]);}
      }
      for(const [u]of reveals)if(u.alive&&revealed(u,team)){
        const p=visionPosition(u),r=1.6,{x0,z0,width,height}=region(p,r,size,grid),q={x:0,z:0};
        for(let z=0;z<height;z++){q.z=grid.coordinates[z+z0];for(let x=0;x<width;x++){
          q.x=grid.coordinates[x+x0];const d=groundDistanceSq(p,q);
          if(d>=r*r||!lineOfSight(p,q)||!inRange(team,q,false))continue;
          const index=(z+z0)*size+x+x0;out[index]=Math.max(out[index],Math.round(255*Math.min(1,(r-Math.sqrt(d))/.75)));
        }}
      }
      return out;
    }
  };
}
