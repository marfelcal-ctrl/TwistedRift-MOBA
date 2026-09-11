// Static collision uses the same footprints and transforms as the rendered
// terrain. Short swept steps prevent fast movement and dashes crossing walls.
export const BODY_RADIUS=Object.freeze({hero:.55,minion:.42,jungle:.85,pitlord:1.45});
export const LANE_BARRIERS=Object.freeze([-1,1].flatMap(side=>[
  ...[[-28,-12],[-6,12],[18,28]].map(([a,b])=>({a:[a,side*32],b:[b,side*32]})),
  ...[[-28,-18],[-12,6],[12,28]].map(([a,b])=>({a:[side*32,a],b:[side*32,b]}))
]));

export function createNavigation({half=42,cell=4}={}){
  const shapes=[],buckets=new Map(),paths=new WeakMap(),grids=new Map();let revision=0,sightRay=0;
  const clamp=(v,r)=>Math.max(-half+r+.1,Math.min(half-r-.1,v));
  function add(shape){shape.id=shapes.length;shape.c=Math.cos(shape.yaw||0);shape.s=Math.sin(shape.yaw||0);
    const extent=shape.radius||Math.hypot(shape.hx,shape.hz);shapes.push(shape);
    for(let x=Math.floor((shape.x-extent)/cell);x<=Math.floor((shape.x+extent)/cell);x++)for(let z=Math.floor((shape.z-extent)/cell);z<=Math.floor((shape.z+extent)/cell);z++){
      const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(shape);
    }revision++;grids.clear();return shape;
  }
  function candidates(p,r){const found=new Set();for(let x=Math.floor((p.x-r)/cell);x<=Math.floor((p.x+r)/cell);x++)for(let z=Math.floor((p.z-r)/cell);z<=Math.floor((p.z+r)/cell);z++)for(const s of buckets.get(x+','+z)||[])found.add(s);return found;}
  function penetration(p,r,s){const dx=p.x-s.x,dz=p.z-s.z;
    if(s.radius){const d=Math.hypot(dx,dz),depth=r+s.radius-d;return depth>1e-7?{x:d>1e-8?dx/d:1,z:d>1e-8?dz/d:0,depth}:null;}
    const x=s.c*dx-s.s*dz,z=s.s*dx+s.c*dz,cx=Math.max(-s.hx,Math.min(s.hx,x)),cz=Math.max(-s.hz,Math.min(s.hz,z));
    let nx=x-cx,nz=z-cz,d=Math.hypot(nx,nz),depth=r-d;
    if(d>1e-8){if(depth<=1e-7)return null;nx/=d;nz/=d;}
    else {const ax=s.hx-Math.abs(x),az=s.hz-Math.abs(z);if(ax<az){nx=x<0?-1:1;nz=0;depth=r+ax;}else{nx=0;nz=z<0?-1:1;depth=r+az;}}
    return {x:s.c*nx+s.s*nz,z:-s.s*nx+s.c*nz,depth};
  }
  function blocked(p,r=.55){if(Math.abs(p.x)>half-r-.1||Math.abs(p.z)>half-r-.1)return true;for(const s of candidates(p,r))if(penetration(p,r,s))return true;return false;}
  function resolve(p,r=.55){p.x=clamp(p.x,r);p.z=clamp(p.z,r);for(let i=0;i<8;i++){let moved=false;for(const s of candidates(p,r)){const hit=penetration(p,r,s);if(hit){p.x=clamp(p.x+hit.x*(hit.depth+.0001),r);p.z=clamp(p.z+hit.z*(hit.depth+.0001),r);moved=true;}}if(!moved)break;}return p;}
  function move(p,dx,dz,r=.55){const length=Math.hypot(dx,dz);if(!length)return resolve(p,r);
    const steps=Math.max(1,Math.ceil(length/Math.min(.18,r*.45)));dx/=steps;dz/=steps;
    for(let i=0;i<steps;i++){const x=p.x,z=p.z;p.x+=dx;p.z+=dz;resolve(p,r);if(blocked(p,r)){p.x=x;p.z=z;break;}}
    return p;
  }
  function clear(a,b,r=.55){const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(distance/.25));
    for(let i=0;i<=steps;i++){const t=i/steps;if(blocked({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},r))return false;}return true;}
  // Sight uses an exact segment against the rendered terrain footprints, with
  // no body-radius inflation. Low bridge rails and foliage do not block sight.
  function intersectsSight(a,dx,dz,s){
    const ax=a.x-s.x,az=a.z-s.z;
    if(s.radius){const lengthSq=dx*dx+dz*dz,t=Math.max(0,Math.min(1,-(ax*dx+az*dz)/lengthSq));return (ax+dx*t)**2+(az+dz*t)**2<=s.radius*s.radius;}
    const x=s.c*ax-s.s*az,z=s.s*ax+s.c*az,vx=s.c*dx-s.s*dz,vz=s.s*dx+s.c*dz;
    let enter=0,exit=1;
    if(Math.abs(vx)<1e-10){if(Math.abs(x)>s.hx)return false;}
    else {const t0=(-s.hx-x)/vx,t1=(s.hx-x)/vx;enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));}
    if(Math.abs(vz)<1e-10){if(Math.abs(z)>s.hz)return false;}
    else {const t0=(-s.hz-z)/vz,t1=(s.hz-z)/vz;enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));}
    return enter<=exit&&exit>1e-7&&enter<1-1e-7;
  }
  function lineOfSight(a,b){
    const dx=b.x-a.x,dz=b.z-a.z;if(dx*dx+dz*dz<1e-12)return true;
    const stamp=++sightRay,endX=Math.floor(b.x/cell),endZ=Math.floor(b.z/cell),sx=Math.sign(dx),sz=Math.sign(dz);
    let x=Math.floor(a.x/cell),z=Math.floor(a.z/cell);
    const deltaX=dx?cell/Math.abs(dx):Infinity,deltaZ=dz?cell/Math.abs(dz):Infinity;
    let nextX=dx?((x+(sx>0?1:0))*cell-a.x)/dx:Infinity,nextZ=dz?((z+(sz>0?1:0))*cell-a.z)/dz:Infinity;
    const steps=Math.abs(endX-x)+Math.abs(endZ-z)+1;
    for(let i=0;i<=steps;i++){
      for(const s of buckets.get(x+','+z)||[]){
        if(s.sightRay===stamp||s.kind==='tree'||s.kind==='bridge rail')continue;s.sightRay=stamp;
        if(intersectsSight(a,dx,dz,s))return false;
      }
      if(x===endX&&z===endZ)return true;
      if(nextX<nextZ){x+=sx;nextX+=deltaX;}
      else if(nextZ<nextX){z+=sz;nextZ+=deltaZ;}
      else {x+=sx;z+=sz;nextX+=deltaX;nextZ+=deltaZ;}
    }
    return true;
  }
  // A one-unit static navigation grid is cached per body radius. AI paths are
  // reused until a target moves or terrain changes; combat never allocates a
  // new path on every frame.
  function gridFor(r){const key=r.toFixed(3);if(grids.has(key))return grids.get(key);
    const n=Math.floor(half*2)+1,walk=new Uint8Array(n*n);for(let z=0;z<n;z++)for(let x=0;x<n;x++)walk[z*n+x]=!blocked({x:x-half,z:z-half},r+.025);
    const grid={n,walk};grids.set(key,grid);return grid;
  }
  function findPath(from,to,r=.55){if(clear(from,to,r))return [{x:to.x,z:to.z}];
    const {n,walk}=gridFor(r),point=i=>({x:i%n-half,z:Math.floor(i/n)-half});
    function anchor(p){let best=-1,dist=Infinity;const cx=Math.round(p.x+half),cz=Math.round(p.z+half);
      for(let z=Math.max(0,cz-4);z<=Math.min(n-1,cz+4);z++)for(let x=Math.max(0,cx-4);x<=Math.min(n-1,cx+4);x++)if(walk[z*n+x]){const q={x:x-half,z:z-half},d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<dist&&clear(p,q,r)){best=z*n+x;dist=d;}}return best;}
    const start=anchor(from),goal=anchor(to);if(start<0||goal<0)return [];
    const cost=new Float32Array(n*n).fill(Infinity),came=new Int32Array(n*n).fill(-1),closed=new Uint8Array(n*n),heap=[];
    const heuristic=i=>Math.hypot(i%n-goal%n,Math.floor(i/n)-Math.floor(goal/n));
    function push(i,score){const entry={i,score};heap.push(entry);let at=heap.length-1;while(at>0){const parent=(at-1)>>1;if(heap[parent].score<=score)break;heap[at]=heap[parent];at=parent;}heap[at]=entry;}
    function pop(){const first=heap[0],last=heap.pop();if(heap.length){let at=0;while(at*2+1<heap.length){let child=at*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[at]=heap[child];at=child;}heap[at]=last;}return first.i;}
    cost[start]=0;push(start,heuristic(start));
    while(heap.length){const at=pop();if(closed[at])continue;closed[at]=1;
      if(at===goal){const route=[{x:to.x,z:to.z}];for(let i=at;i>=0;i=came[i])route.push(point(i));route.reverse();
        // Remove unnecessary corners only if the entire shortcut is clear.
        const result=[];let current=from;for(let i=0;i<route.length;){let next=i;while(next+1<route.length&&clear(current,route[next+1],r))next++;result.push(route[next]);current=route[next];i=next+1;}return result;}
      const x=at%n,z=Math.floor(at/n),p=point(at);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=n||nz>=n)continue;const next=nz*n+nx;
        if(!walk[next]||closed[next]||dx&&dz&&(!walk[z*n+nx]||!walk[nz*n+x]))continue;
        const value=cost[at]+Math.hypot(dx,dz);if(value>=cost[next]||!clear(p,point(next),r))continue;cost[next]=value;came[next]=at;push(next,value+heuristic(next));
      }
    }return [];
  }
  function steer(owner,target,dt,r=.55,speed=owner.speed){const p=owner.group.position;target=resolve({x:target.x,z:target.z},r);let route=paths.get(owner);
    if(!route||route.ttl<=0||route.revision!==revision||Math.hypot(target.x-route.goal.x,target.z-route.goal.z)>1.5){route={points:findPath(p,target,r),index:0,ttl:.8,revision,goal:{x:target.x,z:target.z}};paths.set(owner,route);}
    route.ttl-=dt;let remaining=speed*dt;
    while(remaining>1e-7&&route.index<route.points.length){const goal=route.points[route.index],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d<.03){route.index++;continue;}
      const step=Math.min(d,remaining),x=p.x,z=p.z;move(p,dx/d*step,dz/d*step,r);remaining-=step;
      if(Math.hypot(p.x-x,p.z-z)<step*.2){route.ttl=0;break;}owner.group.rotation.y=Math.atan2(p.x-x,p.z-z);
      if(Math.hypot(p.x-goal.x,p.z-goal.z)<.03)route.index++;
    }return p;
  }
  return {addBox:(x,z,hx,hz,yaw=0,kind='wall')=>add({x,z,hx,hz,yaw,kind}),addCircle:(x,z,radius,kind='tree')=>add({x,z,radius,kind}),blocked,resolve,move,clear,lineOfSight,findPath,steer,shapes,get revision(){return revision;}};
}
