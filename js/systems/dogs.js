// SCURRY - dogs. Three off-leash menaces. They chase a ground-level squirrel,
// bark up a fuss, and on contact knock your food loose and send you scrambling.
// A well-timed BITE (click) boops the nose and sends them off, feelings hurt.
// Visuals: CC0 Quaternius dogs (rigged + animated) swap in when they load;
// the code-built dog stays as the fallback.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight, inWater, onRoad } from '../world/world.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { dropCarried } from './food.js';
import { isOnGroundLow } from './player.js';
import { loadModel, cloneModel, findClip, fitHeight, shadowify } from './models.js';
import { makeHuman, setActorRole } from './humans.js';
import { DOG_PROFILES, DOG_PATROLS, dogMayChase } from './dog-rules.js';
import { parkShift, actorVisible } from './park-shifts.js';

const dogs = [];

function makeDog(coat, profile) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: coat, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat);
  body.scale.set(1, profile.long ? 0.64 : 0.85, profile.long ? 2.3 : 1.55); body.position.y = 0.52; body.castShadow = true; g.add(body);
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 7), mat);
  skull.castShadow = true; head.add(skull);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.24), mat);
  snout.position.set(0, -0.04, 0.22); head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), dark);
  nose.position.set(0, -0.02, 0.35); head.add(nose);
  for (const sx of [-0.11, 0.11]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 5), mat);
    ear.position.set(sx, 0.18, -0.02); ear.rotation.z = sx * -1.2; head.add(ear);
  }
  head.position.set(0, 0.78, 0.48);
  g.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 5), mat);
  tail.position.set(0, 0.66, -0.5); tail.rotation.x = -0.8; g.add(tail);
  const legs = [];
  for (const [lx, lz] of [[-0.15, 0.28], [0.15, 0.28], [-0.15, -0.3], [0.15, -0.3]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.45, 5), mat);
    if(profile.long){leg.scale.y=.55;leg.position.y=.16;}
    else leg.position.set(lx, 0.24, lz);
    g.add(leg); legs.push(leg);
  }
  g.userData = { head, tail, legs };
  return g;
}

const PATROLS = DOG_PATROLS;
export function buildDogs(scene) {
  S.dogPositions=dogs;
  for (let i = 0; i < DOG_PROFILES.length; i++) {
    const profile=DOG_PROFILES[i];
    const outer = new THREE.Group();
    const proc = makeDog(profile.coat,profile);
    proc.scale.setScalar(profile.scale);
    outer.add(proc);
    scene.add(outer);
    const d = {
      mesh: outer, proc, wp: PATROLS[i], wi: 0, state: 'patrol', timer: 0,
      pos: new THREE.Vector3(PATROLS[i][0][0], 0, PATROLS[i][0][1]),
      profile,speed:profile.cruise,phase:i*1.7, barkCd:0,petCooldown:0,
      mixer:null,actions:null,currentAction:null,walker:null,leash:null,
    };
    dogs.push(d);
    if(profile.leashed){
      const walker=makeHuman(.97);
      setActorRole(walker,'walk');
      scene.add(walker);d.walker=walker;
      const leash=new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),new THREE.Vector3()]),
        new THREE.LineBasicMaterial({color:0x6e6255,transparent:true,opacity:.82}));
      leash.frustumCulled=false;scene.add(leash);d.leash=leash;
      const it={x:d.pos.x,z:d.pos.z,y:0,r:1.55,
        label:()=>!d.mesh.visible||d.petCooldown>0||S.player.onSwanBoat||S.player.inBurrow||S.player.inHollow||S.player.inMBTA?
          null:'E - say hello to '+profile.name,
        action:()=>{
          if(d.petCooldown>0||S.player.onSwanBoat||d.pos.distanceTo(S.player.pos)>1.7)return;
          d.petCooldown=12;d.state='proud';d.timer=2.5;
          toast('a '+profile.name+' wags hello. the walker smiles.',2.3);
        }};
      S.interactables.push(it);d.petInteractable=it;
    }
    attachDogModel(d, i);
  }
}

// Swap in a rigged CC0 dog (Quaternius): dog 1 is the Shiba, the others the
// standard Dog. Clips: patrol=Walk, chase/flee=Run|Gallop, proud=Idle.
function attachDogModel(d, i) {
  const isShiba = i === 1;
  if(d.profile.procOnly)return;
  loadModel(isShiba ? 'assets/models/ShibaInu.glb' : 'assets/models/Dog.glb').then((tpl) => {
    if (!tpl) return;
    const m = cloneModel(tpl);
    fitHeight(m, isShiba ? 0.58 : 0.72 * d.profile.scale);
    shadowify(m);
    d.mesh.add(m);
    d.proc.visible = false;
    const mixer = new THREE.AnimationMixer(m);
    const A = {};
    for (const name of ['Walk', 'Run', 'Gallop', 'Idle']) {
      const clip = findClip(tpl.animations, name);
      if (clip) A[name] = mixer.clipAction(clip);
    }
    d.mixer = mixer; d.actions = A;
    playDogClip(d, 'Walk');
  }).catch(() => { /* procedural dog stays */ });
}

function playDogClip(d, name) {
  if (!d.actions) return;
  const next = d.actions[name] || d.actions.Walk || d.actions.Idle;
  if (!next || d.currentAction === next) return;
  if (d.currentAction) d.currentAction.fadeOut(0.22);
  next.reset().fadeIn(0.22).play();
  d.currentAction = next;
}

export function nearestDogDist() {
  const P = S.player.pos;
  let bd = 1e9;
  for (const d of dogs) if (d.mesh.visible) bd = Math.min(bd, d.pos.distanceTo(P));
  return bd;
}

export function updateDogs(dt) {
  const P = S.player;
  const now = performance.now() / 1000;
  const shift=parkShift(S.timeHours);
  for (let i=0;i<dogs.length;i++) {
    const d=dogs[i];
    const active=actorVisible(i,dogs.length,shift.dogs);
    d.mesh.visible=active;
    if(d.walker)d.walker.visible=active;
    if(d.leash)d.leash.visible=active;
    if(!active){d.state='patrol';continue;}
    const dist = d.pos.distanceTo(P.pos);
    if (d.barkCd > 0) d.barkCd -= dt;
    if (d.petCooldown > 0) d.petCooldown -= dt;
    if (d.timer > 0) d.timer -= dt;

    if (d.state === 'flee') {
      moveToward(d, d.fleeFrom, -1, 5.2, dt); // run directly away
      if (d.timer <= 0) d.state = 'patrol';
    } else if (d.state === 'proud') {
      // sits, tail wagging, extremely pleased with itself
      if (d.timer <= 0) d.state = 'patrol';
    } else if (dist < d.profile.alert && dogMayChase(d.profile,{
      grounded:isOnGroundLow(),onSwanBoat:!!P.onSwanBoat,
      remote:P.inHollow||P.inBurrow||P.inFenway||P.inGarden||P.inCityHall||P.inEsplanade||P.inMBTA,
      sprinting:P.sprinting,
    })) {
      if (d.state !== 'chase') {
        d.state = 'chase';
        if (d.barkCd <= 0) { sfx.bark(); d.barkCd = 6; }
        S.spottedFlash = Math.max(S.spottedFlash, 1.2);
      }
      moveToward(d, P.pos, 1, d.profile.chase, dt);
      if (dist < 0.85) {
        // GOTCHA (gentle): food knocked loose, squirrel scrambled
        d.state = 'proud'; d.timer = 3.5;
        P.scramble = 0.9;
        P.vel.set((P.pos.x - d.pos.x) * 2.2, 4.2, (P.pos.z - d.pos.z) * 2.2);
        P.grounded = false;
        sfx.squeak();
        if (S.carried) { dropCarried(); toast('the dog got your food. devastating.', 2.6); }
        else toast('dog boop! undignified. you are fine.', 2.4);
      }
    } else {
      d.state = 'patrol';
      const wp = d.wp[d.wi];
      if (Math.hypot(d.pos.x - wp[0], d.pos.z - wp[1]) < 2.5) d.wi = (d.wi + 1) % d.wp.length;
      moveToward(d, { x: wp[0], z: wp[1] }, 1, d.profile.cruise, dt);
    }

    d.pos.y = groundHeight(d.pos.x, d.pos.z);
    d.mesh.position.copy(d.pos);
    if(d.petInteractable){
      d.petInteractable.x=d.pos.x;d.petInteractable.z=d.pos.z;d.petInteractable.y=d.pos.y;
    }
    if(d.walker){
      const angle=d.mesh.rotation.y;
      const wx=d.pos.x-Math.sin(angle)*1.6,wz=d.pos.z-Math.cos(angle)*1.6;
      const wy=groundHeight(wx,wz);
      d.walker.position.set(wx,wy,wz);d.walker.rotation.y=angle;
      const attr=d.leash.geometry.getAttribute('position');
      attr.setXYZ(0,d.pos.x,d.pos.y+.35*d.profile.scale,d.pos.z);
      attr.setXYZ(1,wx,wy+1.0,wz);attr.needsUpdate=true;
    }
    if (d.mixer) {
      // rigged model: state drives the clip
      if (d.state === 'chase' || d.state === 'flee') playDogClip(d, d.actions.Gallop ? 'Gallop' : 'Run');
      else if (d.state === 'proud') playDogClip(d, 'Idle');
      else playDogClip(d, 'Walk');
      d.mixer.update(dt);
    } else {
      // procedural fallback: trot animation on the code-built dog
      const moving = d.state === 'chase' || d.state === 'flee' || d.state === 'patrol';
      const f = d.state === 'patrol' ? 6 : 11;
      const sw = moving ? Math.sin(now * f + d.phase) * 0.45 : 0;
      const u = d.proc.userData;
      u.legs[0].rotation.x = sw; u.legs[3].rotation.x = sw;
      u.legs[1].rotation.x = -sw; u.legs[2].rotation.x = -sw;
      u.tail.rotation.z = Math.sin(now * (d.state === 'proud' ? 16 : 6) + d.phase) * 0.4;
      u.head.position.y = 0.78 + Math.sin(now * 3 + d.phase) * 0.02;
    }
  }
}

function moveToward(d, target, dirSign, speed, dt) {
  const dx = (target.x - d.pos.x) * dirSign, dz = (target.z - d.pos.z) * dirSign;
  const l = Math.hypot(dx, dz);
  if (l < 0.05) return;
  const step=speed*dt,ux=dx/l,uz=dz/l;
  let sx=ux,sz=uz,nx=d.pos.x+ux*step,nz=d.pos.z+uz*step;
  if(inWater(nx,nz)||onRoad(nx,nz)){
    // A non-player creature should not walk straight through the lagoon
    // or across the busy Charles Street simply because it sees a squirrel.
    // Follow either shoreline tangent instead; if neither is safe, stay.
    let found=false;
    for(const side of [1,-1]){
      const vx=-uz*side,vz=ux*side;
      const x=d.pos.x+vx*step,z=d.pos.z+vz*step;
      if(!inWater(x,z)&&!onRoad(x,z)){
        nx=x;nz=z;sx=vx;sz=vz;found=true;break;
      }
    }
    if(!found)return;
  }
  d.pos.x=nx;d.pos.z=nz;
  const targetYaw = Math.atan2(sx, sz);
  let dy = targetYaw - d.mesh.rotation.y;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  d.mesh.rotation.y += dy * Math.min(1, dt * 8);
}

// bite resolution: called by player via S.onBite chaining in main
export function biteDogs() {
  const P = S.player.pos;
  for (const d of dogs) {
    if (!d.profile.leashed && d.mesh.visible && d.pos.distanceTo(P) < 1.5 && d.state !== 'flee') {
      d.state = 'flee'; d.timer = 3.5; d.fleeFrom = P.clone();
      sfx.yelp();
      toast('nose booped. the dog reconsiders everything.', 2.2);
      return true;
    }
  }
  return false;
}
