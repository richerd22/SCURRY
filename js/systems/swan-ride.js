// SCURRY: steal a little Swan Boat voyage from the Public Garden dock.
// One existing code-authored boat moves; no new WebGL models or draw calls.
// The hide/peek prompt makes operator attention legible and reversible.
import { S } from '../state.js';
import { clearPlayerInput } from './player.js';
import { toast } from '../ui/hud.js';
import { swanRidePose, SWAN_RIDE_SECONDS, SWAN_DOCK } from './swan-ride-rules.js';

let boat = null;
let stage='idle', elapsed=0, exposed=0, hidden=true, cooldown=0, lastWarning=false;
const remote=()=> {
  const p=S.player;
  return p.inHollow||p.inBurrow||p.inFenway||p.inGarden||p.inCityHall||p.inEsplanade||p.inMBTA;
};
function dockBoat() {
  if(!boat)return;
  const d=boat.userData.drift;
  d.cx=SWAN_DOCK.x;d.cz=SWAN_DOCK.z;d.rx=0;d.rz=0;d.w=0;d.yaw=Math.PI/2;
  boat.position.x=SWAN_DOCK.x;boat.position.z=SWAN_DOCK.z;
  boat.rotation.y=d.yaw;
}
function land(message) {
  const p=S.player;
  p.onSwanBoat=false;
  p.pos.set(SWAN_DOCK.boardX,SWAN_DOCK.deckY,SWAN_DOCK.boardZ);
  p.vel.set(0,0,0);p.grounded=true;p.climbing=null;p.climbRegrab=.4;
  clearPlayerInput();
  stage='idle';elapsed=0;exposed=0;hidden=true;cooldown=3;
  dockBoat();
  if(message)toast(message,3.2);
}
function board() {
  if(stage!=='idle'||cooldown>0||remote()||!S.started||S.paused)return;
  const p=S.player;
  if(Math.hypot(p.pos.x-SWAN_DOCK.boardX,p.pos.z-SWAN_DOCK.boardZ)>2.6||
    Math.abs(p.pos.y-SWAN_DOCK.deckY)>1.4)return;
  clearPlayerInput();
  p.onSwanBoat=true;p.climbing=null;p.grounded=true;p.vel.set(0,0,0);
  p.yaw=Math.PI/2;p.pitch=0;
  stage='moving';elapsed=0;exposed=0;hidden=true;lastWarning=false;
  toast('stowaway! stay behind the Swan Boat benches. E to peek out.',3);
}
function interactAboard() {
  if(!S.player.onSwanBoat)return;
  if(stage==='docked'){land('back on the Public Garden dock. nobody noticed a thing.');return;}
  if(stage!=='moving')return;
  hidden=!hidden;
  exposed=0;
  toast(hidden?'ducked behind the seats. invisible-ish.':'peeking over the seats. watch the operator!',2.4);
}
export function initSwanRide() {
  boat=S.boats?.[2]||null;
  if(!boat)return;
  dockBoat();
  S.interactables.push({
    x:SWAN_DOCK.boardX,z:SWAN_DOCK.boardZ,y:SWAN_DOCK.deckY,r:2.6,
    label:()=>!remote()&&!S.player.onSwanBoat&&stage==='idle'&&cooldown<=0
      ?'E - sneak aboard the Swan Boat':null,
    action:board,
  });
  // This interaction follows the moving craft, not its departed pier.
  const aboard={
    x:boat.position.x,z:boat.position.z,y:SWAN_DOCK.deckY,r:2.2,
    label:()=>S.player.onSwanBoat
      ?stage==='docked'?'E - hop back onto the dock'
        :hidden?'E - peek over the seats':'E - duck behind the seats':null,
    action:interactAboard,
  };
  S.interactables.push(aboard);
  boat.userData.swanAboardInteractable=aboard;
}
export function updateSwanRide(dt) {
  if(!boat)return;
  cooldown=Math.max(0,cooldown-dt);
  if(S.player.onSwanBoat&&remote()){land(null);return;}
  if(stage==='moving'){
    elapsed=Math.min(SWAN_RIDE_SECONDS,elapsed+Math.max(0,dt));
    const p=swanRidePose(elapsed/SWAN_RIDE_SECONDS),d=boat.userData.drift;
    d.cx=p.x;d.cz=p.z;d.yaw=p.yaw;
    boat.position.x=p.x;boat.position.z=p.z;boat.rotation.y=p.yaw;
    if(elapsed>=SWAN_RIDE_SECONDS) {
      stage='docked';dockBoat();
      toast('tour complete. back at the dock. E to hop off.',3);
    }
  }
  const a=boat.userData.swanAboardInteractable;
  if(a){a.x=boat.position.x;a.z=boat.position.z;}
  if(!S.player.onSwanBoat)return;
  const p=S.player;
  // Feet are carried by the real visual boat at a known deck height;
  // NEVER feed moving hull coordinates through static terrain collision.
  const localX=.5,localZ=-1.0,theta=boat.rotation.y;
  p.pos.set(boat.position.x+Math.cos(theta)*localX+Math.sin(theta)*localZ,
    boat.position.y+.75,
    boat.position.z-Math.sin(theta)*localX+Math.cos(theta)*localZ);
  p.vel.set(0,0,0);p.grounded=true;p.moving=false;p.sprinting=false;
  // Operator looks around for ~3 sec of every 12. Hiding is always safe;
  // standing in the open for two seconds during a glance gets you spotted.
  if(stage!=='moving')return;
  const glance=(elapsed%12)>5 && (elapsed%12)<8.5;
  if(boat.userData.operator){
    const aim=glance?0.55:0;
    boat.userData.operator.rotation.y+=(aim-boat.userData.operator.rotation.y)*Math.min(1,dt*3);
  }
  if(glance&&!hidden){
    exposed+=dt;
    if(!lastWarning)toast('the operator is looking this way. DUCK!',1.7);
    if(exposed>2){land('the Swan Boat operator spotted a squirrel. escorted to shore.');return;}
  }else exposed=Math.max(0,exposed-dt*2);
  lastWarning=glance;
}


// Only exported to the localhost ?qa=1 harness via main.js.
// Fast-forward the physical route without forcing a 56-second CI delay.
export function qaFinishSwanRide() {
  if(!S.player.onSwanBoat||stage!=='moving')return false;
  elapsed=SWAN_RIDE_SECONDS;
  updateSwanRide(0);
  return stage==='docked';
}
export function swanRideStatus() {
  return {stage,hidden,elapsed,exposed,
    x:boat?.position.x??null,z:boat?.position.z??null};
}
