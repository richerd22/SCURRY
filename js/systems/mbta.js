// MBTA vignette: actual Boston station names, fictional safe squirrel routes.
// Geometry is generated in-browser. NEVER implies access to restricted real
// infrastructure. The rat-sized culvert joins the fictional Burrows market.
// Station floor is a playable schematic, while train ROW is non-walkable.
import * as THREE from 'three';
import { S } from '../state.js';
import { visibleGroundHeight } from '../world/world.js';
import { TUN } from './burrows.js';
import { clearPlayerInput } from './player.js';
import { toast } from '../ui/hud.js';
import { spawnFood } from './food.js';
import { MBTA_ORIGIN, MBTA_STATIONS, MBTA_ROOMS, MBTA_RAT_GATE,
  MBTA_STAFF, MBTA_HIDE, MBTA_RIDER_ROUTES, clampTransit, transitCrowdLevel, trainAt } from './mbta-rules.js';

const ORIGIN = new THREE.Vector3(MBTA_ORIGIN.x,0,MBTA_ORIGIN.z);
const cloth=new THREE.MeshStandardMaterial({color:0xc3c3bc,roughness:.96});
const dark=new THREE.MeshStandardMaterial({color:0x242932,roughness:.83});
const tile=new THREE.MeshStandardMaterial({color:0xd3c8b2,roughness:.92});
const red=new THREE.MeshStandardMaterial({color:0xb8373a,roughness:.6});
const green=new THREE.MeshStandardMaterial({color:0x257f59,roughness:.62});
const safety=new THREE.MeshStandardMaterial({color:0xe7c84e,roughness:.95});
const steel=new THREE.MeshStandardMaterial({color:0x515960,roughness:.42,metalness:.55});
const screen=new THREE.MeshStandardMaterial({color:0x9bb3bd,roughness:.21,metalness:.16});
let stationRoot=null,elapsed=0,trainGreen=null,trainRed=null,guard=null;
let alert=0,warning=false,cooldown=0,hide=false,hidePoint=null;
const mesh=(parent,geo,mat,x,y,z)=>{
  const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);
  o.receiveShadow=true;parent.add(o);return o;
};
const slab=(p,w,h,d,mat,x,y,z)=>mesh(p,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
function sign(parent,text,color,x,y,z,w=4){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=color;ctx.fillRect(0,0,512,100);
  ctx.fillStyle='#f7f6f1';ctx.font='bold 49px Arial,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,256,51,490);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
  const s=mesh(parent,new THREE.PlaneGeometry(w,.77),
    new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}),x,y,z);
  return s;
}
function makeTrain(parent,line) {
  const g=new THREE.Group();
  const color=line==='red'?red:green;
  slab(g,13.8,2.7,2.5,cloth,0,1.45,0);
  slab(g,13.9,.33,2.55,color,0,1.85,0);
  slab(g,13.7,.24,2.55,steel,0,.15,0);
  slab(g,13.9,.22,2.6,dark,0,2.87,0);
  for(const side of [-1,1]){
    for(let k=0;k<6;k++){
      slab(g,1.28,.82,.045,screen,-5.2+k*2.06,1.72,side*1.274);
    }
    for(const a of [-5.4,5.4])
      slab(g,.58,1.75,.06,steel,a,1.24,side*1.29);
  }
  slab(g,.15,.8,1.3,steel,6.9,1.55,0);
  return g;
}
function attendant(group,x,z) {
  const g=new THREE.Group();
  const navy=new THREE.MeshStandardMaterial({color:0x253d53,roughness:1});
  const skin=new THREE.MeshStandardMaterial({color:0xb99170,roughness:1});
  slab(g,.54,.8,.27,navy,0,1.13,0);
  for(const sx of [-.17,.17]){
    slab(g,.17,.8,.2,dark,sx,.43,0);
    slab(g,.13,.65,.17,navy,sx*1.85,1.10,0);
  }
  mesh(g,new THREE.SphereGeometry(.16,10,8),skin,0,1.68,0);
  slab(g,.42,.09,.34,navy,0,1.85,.04);
  g.position.set(x,0,z);group.add(g);
  return g;
}

function buildSurfaceStair(scene,s){
  if(s.id==='park')return; // keep existing elaborate Park Street headhouse
  const x=s.surfaceX+4.2,z=s.surfaceZ,gy=visibleGroundHeight(x,z);
  const g=new THREE.Group();
  slab(g,3,.15,2.5,dark,0,.02,0);
  for(let i=0;i<4;i++)
    slab(g,2.2,.12,.48,tile,0,.32-i*.065,-.78+i*.52);
  for(const side of [-1,1]){
    slab(g,.1,.64,2.5,steel,side*1.43,.36,0);
    for(const zz of [-1.05,-.36,.36,1.05])
      slab(g,.07,1,.08,steel,side*1.44,.78,zz);
    slab(g,.07,.07,2.4,steel,side*1.44,1.28,0);
  }
  sign(g,s.name,'#216348',0,1.56,1.3,2.8);
  const disk=mesh(g,new THREE.CircleGeometry(.4,20),
    new THREE.MeshBasicMaterial({color:0x1a1c20,side:THREE.DoubleSide}),
    -1.38,2.08,0);
  disk.rotation.y=-Math.PI/2;
  g.position.set(x,gy,z);scene.add(g);
  // Squirrel's actual E entry lies 4.2m to the side, NOT in this solid.
  S.solidBoxes.push({minX:x-1.52,maxX:x+1.52,minZ:z-1.3,maxZ:z+1.3,
    minY:gy-.12,maxY:gy+.55});
}

function isAway(){
  const p=S.player;
  return p.inHollow||p.inBurrow||p.inFenway||p.inGarden||
    p.inCityHall||p.inEsplanade||p.onSwanBoat;
}
function teleport(x,z,toTransit=false,toBurrow=false) {
  const p=S.player;
  p.inMBTA=toTransit;
  p.inBurrow=toBurrow;
  p.onSwanBoat=false;
  p.vel.set(0,0,0);p.climbing=null;p.climbRegrab=.5;
  p.grounded=true;p.moving=false;p.sprinting=false;p.pitch=0;
  p.pos.set(x,toTransit||toBurrow?0:visibleGroundHeight(x,z),z);
  if(toTransit||toBurrow)p.pos.z=z;
  clearPlayerInput();
  hide=false;hidePoint=null;alert=0;warning=false;cooldown=3.5;
}
function enterStation(s){
  const p=S.player;
  if(cooldown>0||p.inMBTA||isAway()||!S.started||S.paused)return;
  if(Math.hypot(p.pos.x-s.surfaceX,p.pos.z-s.surfaceZ)>2.5)return;
  teleport(ORIGIN.x+s.x,ORIGIN.z+s.z,true);
  p.yaw=0;
  toast('THE T — '+s.name+'. watch the yellow line, little guy.',3.2);
}
function exitStation(s,msg='back in the park. underground adventure complete.'){
  if(!S.player.inMBTA)return;
  teleport(s.surfaceX,s.surfaceZ-.9);
  toast(msg,3);
}
function enterFromRats(){
  if(!S.player.inBurrow||cooldown>0)return;
  const p=S.player.pos;
  if(Math.hypot(p.x-(TUN.x+MBTA_RAT_GATE.ratX),
    p.z-(TUN.z+MBTA_RAT_GATE.ratZ))>2.5)return;
  teleport(ORIGIN.x+MBTA_RAT_GATE.x,ORIGIN.z+MBTA_RAT_GATE.z,true);
  toast('a forgotten rodent culvert opens onto the T concourse.',3.3);
}
function exitToRats(){
  if(!S.player.inMBTA||cooldown>0)return;
  teleport(TUN.x+MBTA_RAT_GATE.ratX,TUN.z+MBTA_RAT_GATE.ratZ,false,true);
  toast('back with the rats. somehow the air is better here.',3);
}
export function buildMBTA(scene){
  if(stationRoot)return;
  S.realmGround.mbta=()=>0;S.player.inMBTA=false;
  const root=new THREE.Group();root.position.copy(ORIGIN);
  stationRoot=root;
  // Unified public-platform walkway; the tracks are behind the yellow
  // warning edge and never included in this union of physical supports.
  for(const r of MBTA_ROOMS){
    const cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2;
    slab(root,r.maxX-r.minX,.22,r.maxZ-r.minZ,tile,cx,-.12,cz);
    slab(root,r.maxX-r.minX,.24,r.maxZ-r.minZ,dark,cx,4.1,cz);
  }
  slab(root,220,.18,6,dark,0,-.20,-9);
  for(const rr of [-11.3,-8]){
    slab(root,220,.095,.10,steel,0,.01,rr);
  }
  for(let x=-106;x<108;x+=2.6)
    slab(root,.22,.12,5,steel,x,-.04,-9.5);
  // continuous visible hazard line, a navigational landmark not a fake
  // step-up that physics could accidentally use as support.
  slab(root,207,.06,.42,safety,0,.05,-2.1);
  for(const s of MBTA_STATIONS){
    // Station name above platform, green band and wall tile.
    slab(root,31,3.6,.36,cloth,s.x,2.1,13.8);
    slab(root,30,.38,.39,green,s.x,3.45,13.6);
    sign(root,s.name,s.id==='park'?'#245b44':'#1b644b',s.x,2.4,13.6,7.6);
    slab(root,31,.12,.22,safety,s.x,.04,-2);
    for(const dx of [-11,-6,-1,4,9]){
      const post=slab(root,.22,3.7,.25,steel,s.x+dx,2.1,8.5);
      post.castShadow=false;
    }
    // Bolted seats, squirrel-height shelter beside an official platform.
    slab(root,2.8,.15,.88,dark,s.x-3,0.56,5.8);
    for(const dx of [-1.1,1.1])slab(root,.13,.52,.63,steel,s.x-3+dx,.29,5.8);
    slab(root,2.7,.7,.12,steel,s.x-3,.93,6.22);
  }
  // Red Line is deeper at Park Street; topologically a branch, not a
  // parallel Green Line track. The schematic depicts it in another room.
  slab(root,28,2.9,.30,cloth,73,2.0,69.6);
  slab(root,28,.4,.31,red,73,3.3,69.42);
  sign(root,'PARK STREET  RED LINE','#a72f33',72,2.4,69.32,10);
  slab(root,.45,.07,27,safety,82.3,.05,54);
  slab(root,13,.15,2,dark,69.5,.55,48);
  slab(root,12,.15,2,dark,69.5,.55,61);
  // Red train on separate isolated track beyond the walk union.
  slab(root,9,.14,45,dark,91, -.15,54);
  for(const railX of [89,92]){
    slab(root,.12,.08,45,steel,railX,.01,54);
  }
  trainGreen=makeTrain(root,'green');trainGreen.position.set(-112,0,-9.5);root.add(trainGreen);
  trainRed=makeTrain(root,'red');trainRed.rotation.y=Math.PI/2;root.add(trainRed);
  guard=attendant(root,MBTA_STAFF.x,MBTA_STAFF.z);
  // A station feels populated during service hours but not in a sealed
  // overnight concourse. Commuters are pooled/capped, no spawn churn.
  const riderPos=[[-90,4],[-71,8],[-12,4],[5,8],[64,6],[85,5],[69,51],[73,64]];
  const riders=[];
  for(let i=0;i<riderPos.length;i++){
    const h=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({color:[
      0x42657a,0x8b6c52,0x5b6755,0x884c53][i%4],roughness:1});
    slab(h,.44,.83,.25,mat,0,1.14,0);
    mesh(h,new THREE.SphereGeometry(.145,8,6),
      new THREE.MeshStandardMaterial({color:i%3===0?0x8d6349:0xd7b295}),0,1.65,0);
    slab(h,.25,.81,.22,dark,-.1,.44,0);slab(h,.25,.81,.22,dark,.15,.44,0);
    h.position.set(riderPos[i][0],0,riderPos[i][1]);root.add(h);
    const rec={mesh:h,x:riderPos[i][0],z:riderPos[i][1],
      route:MBTA_RIDER_ROUTES[i],dir:i%2?-1:1,cooldown:0,pause:0};
    const it={
      x:ORIGIN.x+rec.x,z:ORIGIN.z+rec.z,y:0,r:1.6,
      label:()=>S.player.inMBTA&&h.visible&&rec.cooldown<=0?
        'E - ask commuter for a snack':null,
      action:()=>{
        if(!S.player.inMBTA||!h.visible||rec.cooldown>0||
          Math.hypot(S.player.pos.x-ORIGIN.x-rec.x,
            S.player.pos.z-ORIGIN.z-rec.z)>1.65)return;
        rec.cooldown=24;rec.pause=3.4;
        h.rotation.y=Math.atan2(S.player.pos.x-ORIGIN.x-rec.x,
          S.player.pos.z-ORIGIN.z-rec.z);
        if(i%3===0){
          spawnFood('peanut',ORIGIN.x+rec.x+.4,ORIGIN.z+rec.z+.5,
            {y:0,source:'mbta'});
          toast('a commuter leaves a peanut for the station squirrel.',2.2);
        }else toast('the commuter looks amused, then checks the train board.',2);
      }
    };
    rec.interactable=it;S.interactables.push(it);
    riders.push(rec);
  }
  root.userData.riders=riders;
  // Low-cost emissive station tubes replace many dynamic point lights.
  const glow=new THREE.MeshBasicMaterial({color:0xf3ecdb});
  for(let x=-90;x<=90;x+=18)
    slab(root,6,.07,.28,glow,x,3.94,3);
  for(let z=18;z<=67;z+=11)
    slab(root,4,.07,.28,glow,75,3.94,z);
  // The old animal culvert has visible floor ironwork and a market sign.
  const drain=new THREE.Mesh(new THREE.TorusGeometry(.68,.12,7,16),steel);
  drain.rotation.x=Math.PI/2;
  drain.position.set(MBTA_RAT_GATE.x,.14,MBTA_RAT_GATE.z);
  root.add(drain);
  for(let i=-2;i<=2;i++)
    slab(root,1.2,.06,.045,steel,MBTA_RAT_GATE.x,.12,
      MBTA_RAT_GATE.z+i*.18);
  sign(root,'OLD RAT PASSAGE','#2a3a32',MBTA_RAT_GATE.x,1.65,69.45,4);
  scene.add(root);
  for(const s of MBTA_STATIONS)buildSurfaceStair(scene,s);
}
export function initMBTA(){
  if(!stationRoot)return;
  for(const s of MBTA_STATIONS){
    S.interactables.push({
      x:s.surfaceX,z:s.surfaceZ,y:visibleGroundHeight(s.surfaceX,s.surfaceZ),r:2.5,
      label:()=>!S.player.inMBTA&&!isAway()&&cooldown<=0?
        'E - enter '+s.name+' station':null,
      action:()=>enterStation(s),
    });
    S.interactables.push({
      x:ORIGIN.x+s.x,z:ORIGIN.z+s.z,y:0,r:2.3,
      label:()=>S.player.inMBTA&&cooldown<=0?'E - exit to '+s.name+' street':null,
      action:()=>exitStation(s),
    });
  }
  S.interactables.push({
    x:TUN.x+MBTA_RAT_GATE.ratX,z:TUN.z+MBTA_RAT_GATE.ratZ,y:0,r:2.5,
    label:()=>S.player.inBurrow&&cooldown<=0?'E - take the rat passage toward the T':null,
    action:enterFromRats,
  });
  S.interactables.push({
    x:ORIGIN.x+MBTA_RAT_GATE.x,z:ORIGIN.z+MBTA_RAT_GATE.z,y:0,r:2.4,
    label:()=>S.player.inMBTA&&cooldown<=0?'E - return to the rat market':null,
    action:exitToRats,
  });
  S.interactables.push({
    x:ORIGIN.x+MBTA_HIDE.x,z:ORIGIN.z+MBTA_HIDE.z,y:0,r:1.45,
    label:()=>S.player.inMBTA?'E - '+(hide?'come out from under the bench':
      'hide beneath the station bench'):null,
    action:()=>{
      if(!S.player.inMBTA)return;
      const d=Math.hypot(S.player.pos.x-ORIGIN.x-MBTA_HIDE.x,
        S.player.pos.z-ORIGIN.z-MBTA_HIDE.z);
      if(d>1.5)return;
      hide=!hide;hidePoint=hide?{x:S.player.pos.x,z:S.player.pos.z}:null;
      toast(hide?'a subway bench: surprisingly good squirrel cover.':
        'back out in the open. keep an eye on the attendant.',2.2);
    },
  });
}
export function updateMBTA(dt){
  cooldown=Math.max(0,cooldown-dt);
  if(!stationRoot)return;
  elapsed+=dt;
  const level=transitCrowdLevel(S.timeHours);
  stationRoot.userData.riders.forEach((r,i)=>{
    r.mesh.visible=level==='rush'||(level==='regular'&&i<5)||
      (level==='last-trains'&&i<2);
    r.cooldown=Math.max(0,r.cooldown-dt);
    r.pause=Math.max(0,r.pause-dt);
    const target=r.route[r.dir>0?1:0];
    if(r.mesh.visible&&r.pause===0){
      const dx=target[0]-r.x,dz=target[1]-r.z,dist=Math.hypot(dx,dz);
      if(dist<.08)r.dir*=-1;
      else{
        const step=Math.min(dist,.52*dt);
        r.x+=dx/dist*step;r.z+=dz/dist*step;
        r.mesh.rotation.y=Math.atan2(-dx,-dz);
      }
    }
    if(r.mesh.visible&&S.player.inMBTA&&
      Math.hypot(S.player.pos.x-ORIGIN.x-r.x,
        S.player.pos.z-ORIGIN.z-r.z)<1.8){
      r.pause=Math.max(r.pause,.7);
      r.mesh.rotation.y=Math.atan2(S.player.pos.x-ORIGIN.x-r.x,
        S.player.pos.z-ORIGIN.z-r.z);
    }
    r.mesh.position.set(r.x,0,r.z);
    r.interactable.x=ORIGIN.x+r.x;r.interactable.z=ORIGIN.z+r.z;
  });
  guard.visible=true; // overnight station staff may be on duty
  const gx=trainAt(elapsed,0);
  trainGreen.position.x=gx;
  trainGreen.visible=level!=='maintenance';
  const rz=trainAt(elapsed,17);
  trainRed.position.set(91,0,rz*.28+55);
  trainRed.visible=level!=='maintenance';
  if(!S.player.inMBTA)return;
  const p=S.player,localX=p.pos.x-ORIGIN.x,localZ=p.pos.z-ORIGIN.z;
  const fixed=clampTransit(localX,localZ);
  p.pos.x=ORIGIN.x+fixed.x;p.pos.z=ORIGIN.z+fixed.z;
  if(p.pos.y<0){p.pos.y=0;p.vel.y=0;p.grounded=true;}
  if(hide&&hidePoint&&Math.hypot(p.pos.x-hidePoint.x,p.pos.z-hidePoint.z)>1.2){
    hide=false;hidePoint=null;
  }
  const close=Math.hypot(fixed.x-MBTA_STAFF.x,fixed.z-MBTA_STAFF.z)<3.8;
  // Cartoon non-harm encounter, not a claim of exact real MBTA protocol.
  if(close&&!hide&&cooldown<=0){
    alert+=dt;
    if(!warning){toast('station attendant: hey! little squirrel, platforms are for people!',2.8);warning=true;}
    if(alert>2.3){
      exitStation(MBTA_STATIONS[2],'shoo! the attendant escorts you safely back to Boston Common.');
      return;
    }
  }else {alert=Math.max(0,alert-dt*2);if(alert===0)warning=false;}
}
export function mbtaDebugState(){
  return {inMBTA:!!S.player.inMBTA,hidden:hide,alert,
    crowd:transitCrowdLevel(S.timeHours),greenX:trainGreen?.position.x??null};
}


// Test-only time advancement: this calls the SAME station simulation and
// encounter logic as the real world. Only localhost ?qa=1 exposes it;
// no debug UI or public hook. Headless SwiftShader may draw 1 fps.
export function qaAdvanceMBTA(seconds) {
  if(!Number.isFinite(seconds)||seconds<0||seconds>12)
    throw new RangeError('0..12 simulated MBTA seconds');
  const steps=Math.max(1,Math.ceil(seconds/.05));
  for(let i=0;i<steps;i++)updateMBTA(seconds/steps);
  return mbtaDebugState();
}
