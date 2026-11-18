// SCURRY - humans. Path wanderers, bench sitters (beg targets), picnic
// blanket owners (they look away... mostly), cart vendor.
// Visuals: the CC0 Quaternius "Man" (rigged, Walk/Sitting/Idle clips) swaps
// in when it loads; the code-built figures stay as the fallback.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight, PATHS } from '../world/world.js';
import { BENCH_SPOTS } from '../world/props.js';
import { spawnFood, tossFood } from './food.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { loadModel, cloneModel, findClip, fitHeight, shadowify } from './models.js';
import { parkShift, actorVisible } from './park-shifts.js';
import { civilianWildlifeReaction, civilianReactionSeconds } from './civilian-wildlife-rules.js';
import { CIVILIAN_PATH_INDICES } from './civilian-patrol-rules.js';

const SKIN = [0xe8b98f, 0xc98a5e, 0x8a5a34, 0xf0cba8, 0x6e4525];
const SHIRT = [0xb84a4a, 0x4a6eb8, 0x4a9a5e, 0xd9c84a, 0x7a4a9a, 0xe8e4da, 0x3a8a9a, 0xd97f3b];
const PANTS = [0x3a4050, 0x5a4632, 0x2c2c34, 0x6e6e5a, 0x44586e];
let ci = 0;
function pick(arr) { return arr[(ci = (ci * 7 + 3) % 997) % arr.length]; }

// ---- actor registry: every human group, with the role its model should play
const actors = [];
export function setActorRole(group, role) {
  const a = actors.find((x) => x.group === group);
  if (a) { a.role = role; applyActorClip(a); }
}
function registerActor(group) {
  const a = { group, role: 'idle', mixer: null, actions: null, currentAction: null, model: false };
  group.userData.actor = a;
  actors.push(a);
  return a;
}
function playActorClip(a, name) {
  if (!a.actions) return;
  const next = a.actions[name];
  if (!next || a.currentAction === next) return;
  if (a.currentAction) a.currentAction.fadeOut(0.25);
  next.reset().fadeIn(0.25).play();
  a.currentAction = next;
}
function applyActorClip(a) {
  if (!a.mixer) return;
  if (a.role === 'walk') playActorClip(a, 'Walk');
  else if (a.role === 'sit' || a.role === 'groundsit') playActorClip(a, 'Sitting');
  else if (a.role === 'ranger') playActorClip(a, S.ranger && S.ranger.state === 'chase' ? 'Run' : 'Walk');
  else playActorClip(a, 'Idle');
}
// Load the Man template once, then swap every registered actor's body.
let manStarted = false;
function ensureManLoading() {
  if (manStarted) return;
  manStarted = true;
  loadModel('assets/models/Man.glb').then((tpl) => {
    if (!tpl) return;
    for (const a of actors) {
      const m = cloneModel(tpl);
      fitHeight(m, 1.78);
      shadowify(m);
      if (a.role === 'ranger') { // green tint so the uniform reads
        m.traverse((o) => {
          if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(0.72, 0.85, 0.66)); }
        });
      }
      for (const c of [...a.group.children]) { if (!c.userData.keep) c.visible = false; }
      a.group.add(m);
      a.mixer = new THREE.AnimationMixer(m);
      a.actions = {};
      for (const name of ['Walk', 'Run', 'Idle', 'Sitting']) {
        const clip = findClip(tpl.animations, name);
        if (clip) a.actions[name] = a.mixer.clipAction(clip);
      }
      a.model = true;
      if (a.role === 'groundsit' && a.group.userData.groundY !== undefined) {
        a.group.position.y = a.group.userData.groundY - 0.04;
      }
      applyActorClip(a);
    }
  }).catch(() => { /* procedural humans stay */ });
}

export function makeHuman(scale = 1) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: pick(SKIN), roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: pick(SHIRT), roughness: 0.95 });
  const pants = new THREE.MeshStandardMaterial({ color: pick(PANTS), roughness: 0.95 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.18), pants);
  legL.position.set(-0.11, 0.4, 0); legL.castShadow = true;
  const legR = legL.clone(); legR.position.x = 0.11;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.65, 0.24), shirt);
  torso.position.y = 1.12; torso.castShadow = true;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.13), shirt);
  armL.position.set(-0.3, 1.12, 0);
  const armR = armL.clone(); armR.position.x = 0.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skin);
  head.position.y = 1.66; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 6, 0, Math.PI * 2, 0, 1.4),
    new THREE.MeshStandardMaterial({ color: pick([0x2c2018, 0x5a4028, 0x9a8a7a, 0x1a1a1a, 0xb84a2a]), roughness: 1 }));
  hair.position.y = 1.69;
  g.add(legL, legR, torso, armL, armR, head, hair);
  g.scale.setScalar(scale);
  g.userData.parts = { legL, legR, armL, armR, torso, head };
  registerActor(g);
  ensureManLoading();
  return g;
}

function seatOnBench(h, spot) {
  const p = h.userData.parts;
  // sit: thighs forward, shins down - approximate with rotated legs + lowered body
  h.position.set(spot.x, spot.gy + 0.06, spot.z);
  h.rotation.y = spot.rotY;
  p.legL.rotation.x = -1.5; p.legR.rotation.x = -1.5;
  p.legL.position.set(-0.11, 0.52, 0.3); p.legR.position.set(0.11, 0.52, 0.3);
  p.torso.position.y = 0.78;
  p.armL.position.y = 0.8; p.armR.position.y = 0.8;
  p.head.position.y = 1.3;
  h.userData.seated = true;
}

const wanderers = [];
const pendingTosses = [];
let nightWorker=null;

export function buildHumans(scene) {
  // bench sitters - the beg targets
  const sitterBenches = [0, 2, 4, 6, 9, 12, 15, 17, 19, 21];
  for (const bi of sitterBenches) {
    const spot = BENCH_SPOTS[bi];
    if (!spot) continue;
    const h = makeHuman(0.95 + Math.random() * 0.12);
    seatOnBench(h, spot);
    setActorRole(h, 'sit');
    scene.add(h);
    const sitter = { mesh: h, x: spot.x, z: spot.z, cooldown: 0, phase: Math.random() * 9 };
    S.benchSitters.push(sitter);
    S.interactables.push({
      x: spot.x, z: spot.z, y: spot.gy, r: 2.4,
      label: () => !sitter.mesh.visible || sitter.cooldown > 0 ? null : 'E - beg',
      action: () => startBeg(sitter),
    });
  }
  // wanderers on the path network
  const loopIdx = CIVILIAN_PATH_INDICES; // proven dry at every 35cm; never cross Frog Pond
  for (let i = 0; i < 9; i++) {
    const h = makeHuman(0.93 + Math.random() * 0.15);
    setActorRole(h, 'walk');
    scene.add(h);
    const path=PATHS[loopIdx[i % loopIdx.length]];
    const w={
      mesh:h,path,seg:i%Math.max(1,path.length-1),t:(i*.217)%1,dir:1,
      speed:.05+(i%4)*.009,phase:i*1.53, cooldown:0, pause:0,
      pauseCooldown:0,x:path[0][0],z:path[0][1],interactable:null,
    };
    wanderers.push(w);
    const it={
      x:w.x,z:w.z,y:groundHeight(w.x,w.z),r:1.9,
      label:()=>!w.mesh.visible||w.cooldown>0||S.player.onSwanBoat||S.player.inBurrow||
        S.player.inHollow||S.player.inFenway||S.player.inGarden||
        S.player.inCityHall||S.player.inEsplanade?null:'E - beg from passerby',
      action:()=>{
        if(!w.mesh.visible||w.cooldown>0||S.player.begging>0||S.player.onSwanBoat||
           Math.hypot(S.player.pos.x-w.x,S.player.pos.z-w.z)>2)return;
        startBeg(w);
        toast('the passerby stops to see what a squirrel wants.',1.8);
      }
    };
    w.interactable=it;S.interactables.push(it);
  }
  // blanket owners
  for (const b of S.blankets) {
    for (let k = 0; k < 2; k++) {
      const h = makeHuman(0.95);
      h.userData.groundY = b.gy;
      setActorRole(h, 'groundsit');
      const ox = b.x + (k ? 1 : -1) * 1.1, oz = b.z + (k ? 0.6 : -0.7);
      h.position.set(ox, b.gy - 0.42, oz);
      h.rotation.y = Math.atan2(b.x - ox, b.z - oz);
      const p = h.userData.parts;
      p.legL.rotation.x = -1.4; p.legR.rotation.x = -1.4;
      p.legL.position.set(-0.11, 0.45, 0.25); p.legR.position.set(0.11, 0.45, 0.25);
      scene.add(h);
      b['owner' + k] = h;
    }
  }
  // pretzel vendor
  if (S.pretzelCart) {
    const v = makeHuman(1.0);
    setActorRole(v, 'idle');
    const cp = S.pretzelCart;
    v.position.set(cp.x - 0.4, cp.y, cp.z - 1.3);
    v.rotation.y = 2.6;
    scene.add(v);
    const vendor = { mesh: v, x: cp.x - 0.4, z: cp.z - 1.3, cooldown: 0, phase: 0, vendor: true };
    S.interactables.push({
      x: vendor.x, z: vendor.z, y: cp.y, r: 2.6,
      label: () => !vendor.mesh.visible || vendor.cooldown > 0 ? null : 'E - beg (vendor)',
      action: () => startBeg(vendor),
    });
    S.benchSitters.push(vendor);
  }
  // One late-shift park worker, not nine tourists picnicking at 3 AM.
  const nw=makeHuman(1.02);setActorRole(nw,'walk');scene.add(nw);
  nightWorker={mesh:nw,baseX:-27,baseZ:-88};
  S.nightWorker=nw;
  S.interactables.push({
    x:-27,z:-88,y:groundHeight(-27,-88),r:1.8,
    label:()=>nw.visible&&!S.player.inMBTA?'E - greet night-shift worker':null,
    action:()=>{if(nw.visible&&Math.hypot(S.player.pos.x+27,S.player.pos.z+88)<2)
      toast('night shift. someone keeps the Common looking good.',2.4);},
  });
}

function startBeg(sitter) {
  const P = S.player;
  if (sitter.cooldown > 0 || P.begging > 0 || !sitter.mesh.visible) return;
  P.begging = 1.25;
  sitter.cooldown = 26;
  sfx.squeak();
  pendingTosses.push({ timer: 1.25, from: new THREE.Vector3(sitter.x, 1.2, sitter.z), type: sitter.vendor ? 'pretzel' : null });
}

export function updateHumans(dt) {
  const now = performance.now() / 1000;
  const shift=parkShift(S.timeHours);
  if(nightWorker){
    nightWorker.mesh.visible=shift.nightWorker;
    if(shift.nightWorker){
      const x=nightWorker.baseX+Math.sin(now*.35)*1.05;
      const z=nightWorker.baseZ+Math.cos(now*.35)*.4;
      nightWorker.mesh.position.set(x,groundHeight(x,z),z);
      nightWorker.mesh.rotation.y=Math.sin(now*.2)*.9;
    }
  }
  // sourced-model actors: advance mixers, keep the ranger's clip honest
  for (const a of actors) {
    if (!a.mixer) continue;
    if (a.role === 'ranger') applyActorClip(a);
    a.mixer.update(dt);
  }
  for (let j=0;j<S.benchSitters.length;j++) {
    const s=S.benchSitters[j];
    s.mesh.visible=s.vendor?shift.vendor:actorVisible(j,10,shift.sitters);
    if (s.cooldown > 0) s.cooldown -= dt;
    s.mesh.rotation.z = Math.sin(now * 0.8 + s.phase) * 0.02;
  }
  for (let wi=0;wi<wanderers.length;wi++) {
    const w=wanderers[wi];
    w.mesh.visible=actorVisible(wi,wanderers.length,shift.walkers);
    w.cooldown=Math.max(0,w.cooldown-dt);
    w.pauseCooldown=Math.max(0,w.pauseCooldown-dt);
    w.pause=Math.max(0,w.pause-dt);
    const line = w.path;
    let a = line[w.seg], b = line[(w.seg + 1) % line.length];
    if (!a || !b) continue;
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if(w.pause<=0)w.t += w.dir * w.speed * dt * 10 / segLen;
    if (w.t > 1) {
      if (w.seg >= line.length - 2 && line === PATHS[0]) { w.seg = 0; w.t = 0; } // perimeter wraps
      else if (w.seg >= line.length - 2) { w.dir = -1; w.t = 1; }
      else { w.seg++; w.t = 0; }
    } else if (w.t < 0) {
      if (w.seg <= 0) { w.dir = 1; w.t = 0; } else { w.seg--; w.t = 1; }
    }
    // Segment boundary may have changed above: recalculate endpoints
    // before painting the actor, otherwise a one-frame path discontinuity.
    a=line[w.seg];b=line[(w.seg+1)%line.length];
    const x = a[0] + (b[0] - a[0]) * w.t, z = a[1] + (b[1] - a[1]) * w.t;
    const gy = groundHeight(x, z);
    w.x=x;w.z=z;
    w.interactable.x=x;w.interactable.z=z;w.interactable.y=gy;
    w.mesh.position.set(x, gy + Math.abs(Math.sin(now * 7 + w.phase)) * 0.04, z);
    w.mesh.rotation.y = Math.atan2((b[0] - a[0]) * w.dir, (b[1] - a[1]) * w.dir);
    // Everyone now notices actual nearby animals: quiet curiosity at
    // squirrels, longer stillness for cottontails and a slight path turn
    // away from a close rat. No crowd teleport or extra actor spawning.
    if(w.mesh.visible&&w.pauseCooldown<=0&&w.pause<=0&&S.wildlifeActors){
      let nearby=null,best=Infinity,reaction=null;
      for(const v of S.wildlifeActors){
        if(v.underground||!v.mesh.visible)continue;
        const dist=Math.hypot(v.x-x,v.z-z);
        const observed=civilianWildlifeReaction(v.kind,dist);
        if(observed&&dist<best){best=dist;nearby=v;reaction=observed;}
      }
      if(nearby){
        w.pause=civilianReactionSeconds(reaction,nearby.kind);
        w.pauseCooldown=17+(wi%3)*2;
        w.mesh.rotation.y=Math.atan2(nearby.x-x,nearby.z-z);
        if(reaction==='avoid')w.dir*=-1;
        setActorRole(w.mesh,'idle');
      }
    }
    if(w.pause<=0&&w.mesh.userData.actor?.role==='idle')setActorRole(w.mesh,'walk');
    if (!w.mesh.userData.actor || !w.mesh.userData.actor.model) {
      const p = w.mesh.userData.parts;
      const sw = w.pause>0?0:Math.sin(now * 7 + w.phase) * 0.5;
      p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
      p.armL.rotation.x = -sw * 0.7; p.armR.rotation.x = sw * 0.7;
    }
  }
  // Picnics close overnight as a whole, including their food prompts.
  for (const b of S.blankets) {
    if(b.mesh)b.mesh.visible=shift.picnics;
    if(b.owner0)b.owner0.visible=shift.picnics;
    if(b.owner1)b.owner1.visible=shift.picnics;
    b.gazeTimer -= dt;
    if (b.gazeTimer <= 0) {
      b.lookingAway = !b.lookingAway && Math.random() < 0.75 ? true : (Math.random() < 0.5);
      b.lookingAway = Math.random() < 0.55;
      b.gazeTimer = 2.5 + Math.random() * 4.5;
      const lookRot = b.lookingAway ? 1.9 : 0;
      if (b.owner0) b.owner0.rotation.y += lookRot * 0.4;
      if (b.owner1) b.owner1.rotation.y -= lookRot * 0.4;
    }
  }
  // resolve beg tosses
  for (let i = pendingTosses.length - 1; i >= 0; i--) {
    const t = pendingTosses[i];
    t.timer -= dt;
    if (t.timer <= 0) {
      pendingTosses.splice(i, 1);
      const P = S.player.pos;
      const type = t.type || ['acorn', 'peanut', 'sandwich', 'pretzel'][(Math.random() * 4) | 0];
      tossFood(type, t.from, new THREE.Vector3(P.x + (Math.random() - 0.5), 0, P.z + (Math.random() - 0.5)));
      sfx.toss();
      if (Math.random() < 0.4) toast('a human finds you adorable. food acquired.', 2.2);
    }
  }
}
