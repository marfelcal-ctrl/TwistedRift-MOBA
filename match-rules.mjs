// Twisted Rift tuning: compact mobile MOBA pacing, in this game's own world units.
export const MATCH = Object.freeze({
  mapScale: .7, worldSize: 84, heroSpeed: 7.2, minionSpeed: 3.2,
  firstWave: 10, waveInterval: 30, siegeEvery: 3,
  jungleFirstSpawn: 24, jungleRespawn: 45,
  cameraPitch: 49, cameraYaw: 26, cameraDistance: 36, cameraHalfHeight: 9.5,
  heroModelScale: Object.freeze([.68,.86,.68]),
  fountain: Object.freeze({blue: [-38.5, 38.5], red: [38.5, -38.5]})
});
export const mapCoordinate = n => n * MATCH.mapScale;
export const mapPoints = points => points.map(([x, z, ...rest]) => [mapCoordinate(x), mapCoordinate(z), ...rest]);
export const groundDistanceSq = (a, b) => (a.x-b.x)**2 + (a.z-b.z)**2;
export function minimapProject(x,z,width,height){
  const scale=Math.SQRT1_2*.94;
  return [(.5+x/MATCH.worldSize*scale)*width,(.5+z/MATCH.worldSize*scale)*height];
}
export function minimapUnproject(x,y){
  const scale=Math.SQRT1_2*.94,clamp=n=>Math.max(-MATCH.worldSize/2,Math.min(MATCH.worldSize/2,n));
  return [clamp((x-.5)*MATCH.worldSize/scale),clamp((y-.5)*MATCH.worldSize/scale)];
}
export function cameraBounds(width, height) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const halfHeight = Math.max(MATCH.cameraHalfHeight, MATCH.cameraHalfHeight / aspect);
  return {left: -halfHeight*aspect, right: halfHeight*aspect, top: halfHeight, bottom: -halfHeight};
}
// Invert the camera's ground-plane projection. Screen diagonals, joystick
// direction, aimed skills and dragging all use this same basis.
export function screenToWorld(dx,dy){
  const yaw=MATCH.cameraYaw*Math.PI/180,down=dy/Math.sin(MATCH.cameraPitch*Math.PI/180);
  return {x:dx*Math.cos(yaw)+down*Math.sin(yaw),z:-dx*Math.sin(yaw)+down*Math.cos(yaw)};
}

// All combat deadlines use this clock. Rendering may be 20, 60, or 120 FPS.
// Long stalls and hidden tabs pause the whole match; they cannot enqueue waves.
export function createMatchClock() {
  const step = 1/60;
  let previous = null, accumulator = 0, elapsed = 0;
  return {
    get time() { return elapsed; },
    resetFrame() { previous = null; accumulator = 0; },
    advance(timestamp, tick, paused = false) {
      const raw = previous === null ? 0 : Math.max(0, (timestamp-previous)/1000);
      previous = timestamp;
      if (paused || raw > .5) { accumulator = 0; return {realDt: 0, simulated: 0}; }
      accumulator += Math.min(raw, .1);
      let simulated = 0;
      while (accumulator + 1e-9 >= step) {
        accumulator -= step; elapsed += step; simulated += step; tick(step, elapsed);
      }
      return {realDt: raw, simulated};
    }
  };
}

export function waveFormation(wave) {
  const units = [{type:'melee', side:-.48, back:0}, {type:'melee', side:.48, back:0}, {type:'ranged', side:0, back:1.7}];
  if (wave % MATCH.siegeEvery === 0) units.push({type:'special', side:0, back:3.4, visualType:wave % 6 === 0 ? 'cannon' : 'siege'});
  return units;
}

// Keep each unit's lateral lane offset through corners. Spend leftover movement
// on the next segment instead of losing a frame at every waypoint.
export function moveAlongPath(unit, dt,move=null) {
  let remaining = unit.speed * dt;
  const p = unit.group.position;
  while (remaining > 1e-8 && unit.index < unit.path.length) {
    const goal = unit.path[unit.index], dx=goal.x-p.x, dz=goal.z-p.z, distance=Math.hypot(dx,dz);
    if (distance < 1e-8) { unit.index++; continue; }
    const step = Math.min(distance, remaining);
    const x=p.x,z=p.z;
    if(move)move(p,dx/distance*step,dz/distance*step);else {p.x+=dx/distance*step;p.z+=dz/distance*step;}
    unit.group.rotation.y = Math.atan2(dx,dz);
    remaining -= step;
    if (Math.hypot(goal.x-p.x,goal.z-p.z)<1e-7) unit.index++;
    if (Math.hypot(p.x-x,p.z-z)<step*.99) break;
  }
}

// Targeting scales with nearby live units, not every unit spawned in the match.
export class UnitGrid {
  constructor(cellSize = 8) { this.cellSize = cellSize; this.cells = new Map(); this.pool = []; }
  rebuild(units) {
    for (const bucket of this.cells.values()) { bucket.length=0; this.pool.push(bucket); }
    this.cells.clear();
    for (const unit of units) if (unit.alive) {
      const p=unit.group.position, key=`${Math.floor(p.x/this.cellSize)},${Math.floor(p.z/this.cellSize)}`;
      if (!this.cells.has(key)) this.cells.set(key,this.pool.pop() || []);
      this.cells.get(key).push(unit);
    }
  }
  nearestEnemy(team, p, range,canSee=()=>true) {
    let best=null, distance=range*range;
    for(let x=Math.floor((p.x-range)/this.cellSize);x<=Math.floor((p.x+range)/this.cellSize);x++)
      for(let z=Math.floor((p.z-range)/this.cellSize);z<=Math.floor((p.z+range)/this.cellSize);z++)
        for(const unit of this.cells.get(`${x},${z}`) || []) {
          if (!unit.alive || unit.team===team || !canSee(unit)) continue;
          const d=groundDistanceSq(p,unit.group.position);
          if(d<distance) { distance=d;best=unit; }
        }
    return best;
  }
}

// Hysteresis avoids resolution flicker. Quality still controls geometry, shadows,
// lights and effects; this optional helper only adjusts the rendered pixel count.
export function createResolutionController() {
  let scale=1, sampleTime=0, frames=0, stableTime=0;
  return {get scale(){return scale;}, reset(){scale=1;sampleTime=frames=stableTime=0;}, sample(dt){
    if(dt<=0||dt>.5)return false;
    sampleTime+=dt;frames++;
    if(sampleTime<1.5)return false;
    const average=sampleTime/frames, window=sampleTime;sampleTime=frames=0;
    const before=scale;
    if(average>1/48){scale=Math.max(.6,scale-.1);stableTime=0;}
    else if(average<1/57){stableTime+=window;if(stableTime>=6){scale=Math.min(1,scale+.05);stableTime=0;}}
    else stableTime=0;
    return Math.abs(before-scale)>.001;
  }};
}
