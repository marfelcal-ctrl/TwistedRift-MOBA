const loadingText = document.querySelector('#loadingText');

try {
  const response = await fetch('./game.js?cameraPatch=alpha02');
  if (!response.ok) throw new Error(`game.js ${response.status}`);
  let source = await response.text();

  const replaceRequired = (from, to, label) => {
    if (!source.includes(from)) throw new Error(`Camera patch could not find: ${label}`);
    source = source.replace(from, to);
  };

  replaceRequired(
    "const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 220);",
    "const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 240);",
    'Perspective camera declaration'
  );

  replaceRequired(
    "addEventListener('keyup',e=>keys.delete(e.code));\nconst joyEl=document.querySelector('#joystick'),stick=document.querySelector('#stick');let pid=null;",
    `addEventListener('keyup',e=>keys.delete(e.code));

// ---------- MOBA camera input ----------
// Narrow perspective FOV, roughly 55° pitch and 45° yaw.
const cameraPanOffset=new THREE.Vector3();
let screenPanPointer=null,screenPanLast=null;
let skillAimPointer=null,skillAimAction=null,skillAimStart=null;
function cameraBasis(){const forward=new THREE.Vector3(-1,0,-1).normalize();const right=new THREE.Vector3(1,0,-1).normalize();return{forward,right}}
function applyPanDelta(dx,dy,scale=.026){const{forward,right}=cameraBasis();cameraPanOffset.addScaledVector(right,-dx*scale);cameraPanOffset.addScaledVector(forward,-dy*scale);if(cameraPanOffset.length()>11)cameraPanOffset.setLength(11)}
function recenterCamera(){cameraPanOffset.set(0,0,0)}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||skillAimPointer!==null)return;screenPanPointer=e.pointerId;screenPanLast={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==screenPanPointer||!screenPanLast)return;const dx=e.clientX-screenPanLast.x,dy=e.clientY-screenPanLast.y;screenPanLast={x:e.clientX,y:e.clientY};applyPanDelta(dx,dy)});
function endScreenPan(e){if(e.pointerId!==screenPanPointer)return;screenPanPointer=null;screenPanLast=null;recenterCamera()}
canvas.addEventListener('pointerup',endScreenPan);canvas.addEventListener('pointercancel',endScreenPan);
const cameraLock=document.querySelector('#cameraLock');if(cameraLock)cameraLock.addEventListener('pointerdown',e=>{e.preventDefault();recenterCamera();snapCamera()});

const joyEl=document.querySelector('#joystick'),stick=document.querySelector('#stick');let pid=null;`,
    'camera input insertion point'
  );

  replaceRequired(
    "document.querySelectorAll('.skill').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;if(a==='attack')attack();if(a==='s1')skill1();if(a==='s2')skill2();if(a==='s3')skill3();if(a==='ult')ultimate()}));",
    `document.querySelectorAll('.skill').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;if(a==='attack'){attack();return}if(a==='s2'){skill2();return}skillAimPointer=e.pointerId;skillAimAction=a;skillAimStart={x:e.clientX,y:e.clientY};b.setPointerCapture(e.pointerId)});
  b.addEventListener('pointermove',e=>{if(e.pointerId!==skillAimPointer||!skillAimStart)return;const dx=e.clientX-skillAimStart.x,dy=e.clientY-skillAimStart.y,len=Math.hypot(dx,dy);if(len>12){const{forward,right}=cameraBasis();const aim=forward.clone().multiplyScalar(-dy).addScaledVector(right,dx);if(aim.lengthSq()>.001){aim.normalize();player.facing.copy(aim);player.group.rotation.y=Math.atan2(aim.x,aim.z);cameraPanOffset.copy(aim).multiplyScalar(Math.min(7.5,len*.025))}}});
  const finish=e=>{if(e.pointerId!==skillAimPointer)return;const a=skillAimAction;skillAimPointer=null;skillAimAction=null;skillAimStart=null;recenterCamera();if(a==='s1')skill1();if(a==='s3')skill3();if(a==='ult')ultimate()};
  b.addEventListener('pointerup',finish);b.addEventListener('pointercancel',e=>{if(e.pointerId===skillAimPointer){skillAimPointer=null;skillAimAction=null;skillAimStart=null;recenterCamera()}})
});`,
    'skill pointer controls'
  );

  replaceRequired(
    "// ---------- Camera ----------\nconst camOffset=new THREE.Vector3(0,10.8,11.8),lookOffset=new THREE.Vector3(0,1.0,-2.3);\nfunction snapCamera(){camera.position.copy(player.group.position).add(camOffset);camera.lookAt(player.group.position.clone().add(lookOffset))}snapCamera();",
    `// ---------- Strategic MOBA Camera Rig ----------
// FOV 38°, yaw 45°, pitch ~55°. Look-ahead keeps RAMZX slightly below screen center.
const camOffset=new THREE.Vector3(9.2,18.5,9.2),lookOffset=new THREE.Vector3(-1.8,1.1,-1.8);
function cameraTarget(){return player.group.position.clone().add(cameraPanOffset)}
function snapCamera(){recenterCamera();const t=cameraTarget();camera.position.copy(t).add(camOffset);camera.lookAt(t.clone().add(lookOffset))}snapCamera();`,
    'camera rig'
  );

  replaceRequired(
    "const desired=player.group.position.clone().add(camOffset);camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(player.group.position.clone().add(lookOffset));",
    "const camTarget=cameraTarget(),desired=camTarget.clone().add(camOffset);camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(camTarget.clone().add(lookOffset));",
    'camera follow loop'
  );

  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  await import(blobUrl);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
} catch (error) {
  console.error(error);
  if (loadingText) loadingText.textContent = `Camera patch failed: ${error.message}`;
}
