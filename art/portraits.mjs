// Supplied hero artwork, matched by the name printed on each portrait.
export const HERO_PORTRAITS=Object.freeze(Object.fromEntries(
  ['ramzx','nyra','kaelor','veyra','grimm','sera','kairo','raze','volkrin','zyrel']
    .map(id=>[id,new URL(`../assets/portraits/${id}.webp`,import.meta.url).href])
));
const cache=new WeakMap();

// Finish a loading job only after the browser has decoded the actual artwork.
export function prepareHeroPortrait(id,document){
  const src=HERO_PORTRAITS[id];
  if(!src)throw new Error(`Unknown portrait: ${id}`);
  if(!cache.has(document))cache.set(document,new Map());
  const images=cache.get(document);
  if(images.has(id))return images.get(id);
  const job=new Promise((resolve,reject)=>{
    const img=document.createElement('img');
    const timer=setTimeout(()=>finish(new Error(`Portrait timed out: ${id}`)),15000);
    let done=false;
    function finish(error){
      if(done)return;done=true;clearTimeout(timer);img.onload=img.onerror=null;
      if(error)reject(error);else resolve(src);
    }
    img.onload=()=>{
      if(typeof img.decode==='function')img.decode().then(()=>finish(),finish);
      else finish();
    };
    img.onerror=()=>finish(new Error(`Portrait unavailable: ${id}`));
    img.src=src;
  });
  images.set(id,job);
  job.catch(()=>images.delete(id));
  return job;
}
