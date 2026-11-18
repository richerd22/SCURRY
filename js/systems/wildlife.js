// Small living residents of the Common, Public Garden and rat tunnels.
// CPU-light opportunistic animation: no AI models, textures, networking,
// physics colliders or timers when a critter is out of range.
import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { visibleGroundHeight, inWater, onRoad } from '../world/world.js';
import { insideParkLawn } from '../world/ground-rules.js';
import { TUN } from './burrows.js';
import { setCarriedVisual } from './player.js';
import { toast } from '../ui/hud.js';
import { WILDLIFE_SPAWNS, wildlifeResponse } from './wildlife-rules.js';

const actors=[];
const geo=new THREE.SphereGeometry(1,10,7);
const geoEar=new THREE.ConeGeometry(1,1,7);
const tailTube=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,.12,.1),new THREE.Vector3(0,.07,.3),
  new THREE.Vector3(0,.1,.5),new THREE.Vector3(0,.14,.65)
]),9,.014,4,false);
const mats={
  gray:new THREE.MeshStandardMaterial({color:0x766e61,roughness:1}),
  russet:new THREE.MeshStandardMaterial({color:0x8b5a38,roughness:1}),
  dark:new THREE.MeshStandardMaterial({color:0x574940,roughness:1}),
  cream:new THREE.MeshStandardMaterial({color:0xe3d8c3,roughness:1}),
  rabbit:new THREE.MeshStandardMaterial({color:0xb39c83,roughness:1}),
  nose:new THREE.MeshStandardMaterial({color:0x291e1b,roughness:.9}),
  pink:new THREE.MeshStandardMaterial({color:0xb58286,roughness:1}),
};
function ellipsoid(parent,material,scale,xyz) {
  const m=new THREE.Mesh(geo,material);
  m.scale.set(...scale);m.position.set(...xyz);
  m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;
}
function makeCritter(kind,variant) {
  const g=new THREE.Group(),squirrel=kind==='squirrel',rabbit=kind==='rabbit';
  const fur=squirrel?(variant%3===0?mats.russet:mats.gray):rabbit?
    (variant%3===0?mats.cream:mats.rabbit):mats.dark;
  if(squirrel){
    ellipsoid(g,fur,[.13,.16,.22],[0,.17,0]);
    ellipsoid(g,fur,[.115,.11,.11],[0,.28,-.13]);
    for(const sx of [-.07,.07])ellipsoid(g,fur,[.037,.06,.03],[sx,.39,-.14]);
    // Upright curling tail, the squirrel's unmistakable silhouette.
    const tail=new THREE.Group();
    ellipsoid(tail,fur,[.09,.19,.095],[0,.25,.26]);
    ellipsoid(tail,fur,[.105,.17,.095],[0,.48,.3]);
    ellipsoid(tail,fur,[.065,.12,.07],[0,.62,.24]);
    tail.position.set(0,0,.02);g.add(tail);g.userData.tail=tail;
  }else if(rabbit){
    ellipsoid(g,fur,[.17,.16,.24],[0,.17,.02]);
    ellipsoid(g,fur,[.13,.12,.13],[0,.29,-.16]);
    ellipsoid(g,mats.cream,[.085,.08,.085],[0,.24,.27]);
    for(const sx of [-.07,.07]){
      const ear=ellipsoid(g,fur,[.055,.19,.044],[sx,.50,-.18]);
      ear.rotation.z=sx*1.3;
      ellipsoid(g,mats.pink,[.025,.13,.012],[sx,.51,-.208]);
    }
  }else{
    ellipsoid(g,fur,[.105,.1,.24],[0,.11,0]);
    ellipsoid(g,fur,[.105,.085,.12],[0,.16,-.19]);
    for(const sx of [-.07,.07])ellipsoid(g,mats.pink,[.055,.048,.026],[sx,.235,-.20]);
    const tail=new THREE.Mesh(tailTube,mats.pink);g.add(tail);
    g.userData.tail=tail;
  }
  ellipsoid(g,mats.nose,[.021,.021,.021],[0,rabbit?.29:.21,-(rabbit?.29:.31)]);
  for(const sx of [-1,1]){
    ellipsoid(g,mats.nose,[.016,.017,.016],[sx*(rabbit?.095:.075),rabbit?.31:.275,rabbit?-.24:-.22]);
  }
  return g;
}
function isRemote() {
  const p=S.player;
  return p.inHollow||p.inFenway||p.inGarden||p.inCityHall||p.inEsplanade;
}
function dogDistance(x,z) {
  let best=1e6;
  for(const d of S.dogPositions||[])best=Math.min(best,Math.hypot(d.x-x,d.z-z));
  return best;
}
function usable(x,z) {
  return insideParkLawn(x,z,MAP)&&!inWater(x,z)&&!onRoad(x,z);
}
function act(a) {
  const P=S.player,dist=Math.hypot(P.pos.x-a.x,P.pos.z-a.z);
  if(!a.mesh.visible||dist>1.8||Math.abs(P.pos.y-a.y)>1.3||a.cooldown>0)return;
  a.cooldown=a.kind==='squirrel'?7:5;
  if(a.kind==='squirrel'){
    if(S.carried){
      const meal=S.carried;
      S.carried=null;setCarriedVisual(null);
      a.friendly=25;a.flee=0;
      toast('shared a '+meal+'. your new squirrel friend follows for a while.',3);
    }else {
      a.friendly=9;a.flee=0;
      toast(['the squirrel chirps back. important neighborhood business.',
        'a squirrel gives you a professional tail flick.',
        'you exchange updates about the best trees.'][a.index%3],3);
    }
  }else if(a.kind==='rabbit'){
    a.calm=6;a.flee=0;
    toast('you sit quietly. the cottontail decides you can stay.',3);
  }else{
    a.calm=4;
    toast(a.underground?[
      'rat says: market is east of the central hub. bring bottle caps.',
      'rat says: storage rooms have the interesting things.',
      'rat says: every tunnel leads somewhere. except the dead ends.'
    ][a.index%3]:'a city rat pauses, evaluates your snack situation, and moves on.',3);
  }
}
export function buildWildlife(scene) {
  if(actors.length)return;
  WILDLIFE_SPAWNS.forEach(([kind,x,z],index)=>{
    const underground=kind==='burrow-rat';
    const role=underground?'rat':kind;
    const g=makeCritter(role,index);
    const y=underground?0:visibleGroundHeight(x,z);
    g.position.set(x,y,z);
    scene.add(g);
    const a={kind:role,underground,mesh:g,x,z,y,homeX:x,homeZ:z,
      index,phase:index*2.399,clock:0,heading:index*1.79,roam:1+index%4,
      cooldown:0,flee:0,calm:0,friendly:0,exposed:false};
    actors.push(a);
    S.interactables.push({
      x,z,y,r:1.65,
      label:()=>{
        if(!g.visible||a.cooldown>0||a.flee>0)return null;
        if(role==='squirrel')return S.carried?'E - share your food with squirrel':'E - chatter with squirrel';
        return role==='rabbit'?'E - sit quietly with cottontail':'E - hear rat gossip';
      },
      action:()=>act(a),
    });
    a.interactable=S.interactables[S.interactables.length-1];
  });
  S.wildlifeActors=actors;
}
export function updateWildlife(dt) {
  if(!S.player.pos)return;
  const P=S.player,burrow=!!P.inBurrow,remote=isRemote();
  for(const a of actors){
    const sameRealm=a.underground?burrow:!remote&&!burrow;
    const dist=Math.hypot(P.pos.x-a.x,P.pos.z-a.z);
    // Urban rat leaves hiding mostly after dark. A sparse, plausible
    // background character, not evidence of a resident wildlife census.
    const nocturnal=a.kind==='rat'&&!a.underground;
    const visible=sameRealm&&dist<65&&(!nocturnal||(S.timeHours>19||S.timeHours<6));
    a.mesh.visible=visible;
    if(!visible)continue;
    a.clock+=dt;
    a.cooldown=Math.max(0,a.cooldown-dt);
    a.calm=Math.max(0,a.calm-dt);
    a.friendly=Math.max(0,a.friendly-dt);
    a.flee=Math.max(0,a.flee-dt);
    const pace=P.sprinting?6.6:P.moving?3.3:0;
    const response=wildlifeResponse(a.underground?'burrow-rat':a.kind,
      dist,pace,a.underground?100:dogDistance(a.x,a.z),!!S.carried);
    if(response==='flee'&&a.flee<=0&&a.calm<=0)a.flee=2.8;
    let tx=a.homeX+Math.cos(a.clock*.31+a.phase)*a.roam,
      tz=a.homeZ+Math.sin(a.clock*.29+a.phase)*a.roam;
    let speed=a.kind==='rabbit'?.72:.55;
    if(a.friendly>0&&dist>2.1&&dist<16&&a.kind==='squirrel'){
      tx=P.pos.x;tz=P.pos.z;speed=1.85;
    }else if(a.flee>0&&!a.underground){
      const away=Math.atan2(a.z-P.pos.z,a.x-P.pos.x);
      tx=a.x+Math.cos(away)*3;tz=a.z+Math.sin(away)*3;speed=a.kind==='rabbit'?3.2:2.9;
    }else if(a.calm>0){speed=0;}
    if(a.underground&&dist>10)speed=0; // stays in authored chamber, never walks through solid earth
    const dx=tx-a.x,dz=tz-a.z,d=Math.hypot(dx,dz);
    if(d>.1&&speed>0){
      const stride=Math.min(d,speed*dt),nx=a.x+dx/d*stride,nz=a.z+dz/d*stride;
      if(a.underground||usable(nx,nz)){
        a.x=nx;a.z=nz;a.heading=Math.atan2(-dx,-dz);
      }
    }
    a.y=a.underground?0:visibleGroundHeight(a.x,a.z);
    a.mesh.position.set(a.x,a.y+(speed>0&&d>.12?Math.abs(Math.sin(a.clock*11+a.phase))*.035:0),a.z);
    a.mesh.rotation.y=a.heading;
    if(a.mesh.userData.tail)
      a.mesh.userData.tail.rotation.z=Math.sin(a.clock*5+a.phase)*.1;
    a.interactable.x=a.x;a.interactable.z=a.z;a.interactable.y=a.y;
  }
}
export function biteWildlife() {
  const p=S.player.pos;
  for(const a of actors){
    if(!a.mesh.visible||a.underground||a.kind!=='squirrel')continue;
    if(Math.hypot(p.x-a.x,p.z-a.z)<1.2&&Math.abs(p.y-a.y)<1.2){
      a.flee=2;a.friendly=0;
      toast('a squirrel scampers away, mildly offended.',1.8);
      return true;
    }
  }
  return false;
}
