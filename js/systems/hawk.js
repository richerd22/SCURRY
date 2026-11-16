// SCURRY - HAWK DUA, the red-tailed hawk. Canon name, Richard's.
// She owns the open sky over the Common. Canopy is safety, platforms are
// safety, the Hollow is safety - bare ground under bare sky is hers.
// State machine: ROOST / CIRCLE -> SCREECH (telegraph) -> DIVE -> RECOVER.
// A catch is a relocation, never a harming: fade out, wake up in a canopy,
// stash intact, dignity not. A well-timed bite as she swoops in boops her
// off the line and she remembers it (longer cooldown, feather tax paid).

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight } from '../world/world.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { dropCarried } from './food.js';

const CIRCLE_CENTRE = { x: 95, z: 12 };   // Frog Pond / Mall area
const CIRCLE_R = 45;                       // 35-55 m band, mid-picked
const CIRCLE_H = 32;                       // ~32 m up
const CIRCLE_SPEED = 8.5;                  // lazy m/s along the circle
const DAY_START = 6.0, DAY_END = 19.5;     // hunts in daylight only
const SCREECH_TIME = 1.1;
const BITE_SCREECH_WINDOW = 0.45;          // last moments of the screech
const DIVE_SPEED = 27.5;                   // 25-30 m/s band, mid-picked
const CATCH_RADIUS = 1.2;
const DODGE_DISTANCE = 3.0;
const BITE_RANGE = 3.0;
const FIRST_DIVE_AFTER = 20;               // no dive in the first 20 s
const BANDSTAND = { x: 140, z: 42, r: 8.6 }; // roof cone radius (landmarks.js)
const ROOST = { x: 60, z: -45 };           // Soldiers & Sailors Monument

const CATCH_TOAST = 'Hawk Dua has relocated you. the stash survives. the dignity does not.';
const BITE_TOAST = 'you booped Hawk Dua. she will remember this.';
const FIRST_DIVE_TOAST = 'a shadow, circling. Hawk Dua has noticed you. canopy is safety.';

let hawk = null;

// ---------------------------------------------------------------- helpers
function isDaylight() {
  const h = S.timeHours;
  return typeof h === 'number' && h >= DAY_START && h <= DAY_END;
}

function onPlatformOrBox(P) {
  for (const p of S.platforms || []) {
    if (Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < p.r && Math.abs(P.pos.y - p.y) <= 0.75) return true;
  }
  for (const b of S.platformBoxes || []) {
    if (P.pos.x > b.minX && P.pos.x < b.maxX && P.pos.z > b.minZ && P.pos.z < b.maxZ &&
        Math.abs(P.pos.y - b.y) <= 0.75) return true;
  }
  return false;
}

function underCanopy(P) {
  for (const t of S.trees || []) {
    if (t.canopyR && Math.hypot(P.pos.x - t.x, P.pos.z - t.z) < t.canopyR) return true;
  }
  return false;
}

function underBandstand(P) {
  return Math.hypot(P.pos.x - BANDSTAND.x, P.pos.z - BANDSTAND.z) < BANDSTAND.r;
}

// The fair, readable targeting rule, in one place: on the ground, not
// climbing, not on any platform/box, not in the Hollow, in open sky.
export function isPlayerExposed() {
  const P = S.player;
  if (!P || !P.pos) return false;
  if (P.inHollow || P.climbing) return false;
  if (!P.grounded) return false;
  if (onPlatformOrBox(P)) return false;
  if (underCanopy(P)) return false;
  if (underBandstand(P)) return false;
  return true;
}

function randCooldown(min, max) { return min + Math.random() * (max - min); }

function circlePos(angle, out) {
  out.set(
    CIRCLE_CENTRE.x + Math.cos(angle) * CIRCLE_R,
    CIRCLE_H,
    CIRCLE_CENTRE.z + Math.sin(angle) * CIRCLE_R
  );
  return out;
}

function roostPos(out) {
  // Perched on top of the monument figure (landmarks: gy + ~24.8).
  out.set(ROOST.x, groundHeight(ROOST.x, ROOST.z) + 24.8, ROOST.z);
  return out;
}

// ------------------------------------------------------------------ model
// Procedural red-tailed hawk, low tri, no shadows (castShadow stays off -
// the ground shadow DISC below is the readable telegraph, not a shadowmap).
function makeHawkMesh() {
  const g = new THREE.Group();
  const brown = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const darkBrown = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 1 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xe8ddc8, roughness: 1 });
  const rust = new THREE.MeshStandardMaterial({ color: 0xa03d1e, roughness: 0.95, side: THREE.DoubleSide });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.5 });
  const cereMat = new THREE.MeshStandardMaterial({ color: 0xd8a921, roughness: 0.6 });

  // body + pale underside (belly sphere tucked just under the body)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), brown);
  body.scale.set(0.9, 0.85, 1.6);
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 7), pale);
  belly.scale.set(0.82, 0.62, 1.45);
  belly.position.set(0, -0.09, 0.02);
  g.add(belly);

  // head + hooked beak (cone tipped down at the tip, the hook)
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.155, 9, 7), brown);
  skull.scale.set(0.95, 0.9, 1.05);
  head.add(skull);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), pale);
  face.scale.set(0.9, 0.75, 0.9);
  face.position.set(0, -0.05, 0.05);
  head.add(face);
  const cere = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), cereMat);
  cere.position.set(0, 0.01, 0.15);
  head.add(cere);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), beakMat);
  beak.rotation.x = Math.PI / 2 + 0.55; // points forward, tip hooks down
  beak.position.set(0, -0.02, 0.2);
  head.add(beak);
  head.position.set(0, 0.09, 0.42);
  g.add(head);

  // fanned RUST-RED tail - the field mark. Three overlapping feather
  // planes fanned at the rear, unmistakably red from below and above.
  const tail = new THREE.Group();
  const tailGeo = new THREE.PlaneGeometry(0.2, 0.36);
  for (const a of [-0.32, 0, 0.32]) {
    const f = new THREE.Mesh(tailGeo, rust);
    f.rotation.x = -Math.PI / 2;
    f.rotation.z = a;
    f.position.set(Math.sin(a) * 0.1, 0, -0.1 - Math.cos(a) * 0.05);
    tail.add(f);
  }
  tail.position.set(0, 0.01, -0.42);
  g.add(tail);

  // broad swept wings, pivoted at the root so rotation.z is the flap.
  // Each wing: a tapered box (scaled plane-ish) swept slightly back,
  // brown on top with a pale leading patch via a second small mesh.
  function makeWing(side) {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.03, 0.4), brown);
    wing.position.set(side * 0.58, 0, -0.06);
    wing.rotation.y = side * -0.18; // swept back
    pivot.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.3), darkBrown);
    tip.position.set(side * 1.18, 0, -0.14);
    tip.rotation.y = side * -0.3;
    pivot.add(tip);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.032, 0.12), pale);
    patch.position.set(side * 0.52, -0.004, 0.1);
    pivot.add(patch);
    pivot.position.set(side * 0.14, 0.1, 0.05);
    g.add(pivot);
    return pivot;
  }
  const wingL = makeWing(-1);
  const wingR = makeWing(1);

  // little yellow talons, tucked unless diving (update tips them out)
  const talons = new THREE.Group();
  for (const sx of [-0.09, 0.09]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 5), cereMat);
    t.rotation.x = Math.PI;
    t.position.set(sx, -0.2, 0.12);
    talons.add(t);
  }
  g.add(talons);

  g.traverse((o) => { o.castShadow = false; });
  g.userData = { wingL, wingR, tail, talons, head };
  return g;
}

function makeShadowDisc() {
  // Soft-edged dark disc: radial-gradient canvas alpha (procedural, no
  // imagery), so the edge feathers out instead of reading as a hard ring.
  let mat;
  try {
    if (typeof document !== 'undefined' && document.createElement) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const c = cv.getContext('2d');
      const grad = c.createRadialGradient(64, 64, 6, 64, 64, 64);
      grad.addColorStop(0, 'rgba(8,10,6,0.85)');
      grad.addColorStop(0.65, 'rgba(8,10,6,0.5)');
      grad.addColorStop(1, 'rgba(8,10,6,0)');
      c.fillStyle = grad;
      c.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(cv);
      mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.16, depthWrite: false });
    }
  } catch (e) { /* plain material below */ }
  if (!mat) mat = new THREE.MeshBasicMaterial({ color: 0x0a0c06, transparent: true, opacity: 0.16, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  m.castShadow = false;
  return m;
}

function spawnFeatherPuff(scene, at) {
  if (!scene || !hawk) return;
  const geo = new THREE.PlaneGeometry(0.13, 0.07);
  const cols = [0xe8ddc8, 0xa03d1e, 0x6b4a2f];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
    const f = new THREE.Mesh(geo, mat);
    f.position.copy(at);
    f.position.x += (Math.random() - 0.5) * 0.4;
    f.position.y += (Math.random() - 0.5) * 0.3;
    f.position.z += (Math.random() - 0.5) * 0.4;
    f.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(f);
    hawk.feathers.push({
      mesh: f, life: 2.4 + Math.random() * 0.6, phase: Math.random() * 9,
      vx: (Math.random() - 0.5) * 0.7, vz: (Math.random() - 0.5) * 0.7,
    });
  }
}

function updateFeathers(dt) {
  if (!hawk) return;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  for (let i = hawk.feathers.length - 1; i >= 0; i--) {
    const f = hawk.feathers[i];
    f.life -= dt;
    if (f.life <= 0) {
      if (S.scene) S.scene.remove(f.mesh);
      hawk.feathers.splice(i, 1);
      continue;
    }
    // flutter down: slow fall, sideways sway, tumbling rotation
    f.mesh.position.y -= 0.55 * dt;
    f.mesh.position.x += (f.vx + Math.sin(now * 5 + f.phase) * 0.35) * dt;
    f.mesh.position.z += (f.vz + Math.cos(now * 4.2 + f.phase) * 0.35) * dt;
    f.mesh.rotation.x += dt * 2.4;
    f.mesh.rotation.z += dt * 1.7;
    const gy = groundHeight(f.mesh.position.x, f.mesh.position.z) + 0.03;
    if (f.mesh.position.y < gy) f.mesh.position.y = gy;
    if (f.mesh.material) f.mesh.material.opacity = Math.min(0.95, f.life / 1.2);
  }
}

// ------------------------------------------------------------------- build
export function buildHawk(scene) {
  const mesh = makeHawkMesh();
  scene.add(mesh);
  const disc = makeShadowDisc();
  scene.add(disc);
  const startAngle = Math.atan2(30 - CIRCLE_CENTRE.z, 24 - CIRCLE_CENTRE.x);
  hawk = {
    mesh, disc, discMat: disc.material,
    state: isDaylight() ? 'circle' : 'roost',
    pos: new THREE.Vector3(),
    angle: startAngle,
    timer: 0,                 // state timer (screech / recover)
    cooldown: 6,              // no-attack cooldown (the 20 s gate is separate)
    sessionTime: 0,           // seconds since build - first-dive gate
    flapPhase: Math.random() * 9,
    screechTarget: new THREE.Vector3(),
    diveFrom: new THREE.Vector3(),
    diveTarget: new THREE.Vector3(),
    diveT: 1, diveDur: 1,
    recoverFrom: new THREE.Vector3(),
    recoverT: 1, recoverDur: 2.8,
    warned: false,            // first-dive toast spent
    feathers: [],
  };
  if (hawk.state === 'roost') roostPos(hawk.pos);
  else circlePos(hawk.angle, hawk.pos);
  hawk.mesh.position.copy(hawk.pos);
  hawk.disc.visible = hawk.state !== 'roost';
  S.hawk = hawk;
  return hawk;
}

// Introspection for tests / debugging (no gameplay effect).
export function hawkState() {
  if (!hawk) return null;
  return {
    state: hawk.state, cooldown: hawk.cooldown, timer: hawk.timer,
    sessionTime: hawk.sessionTime, warned: hawk.warned,
    pos: hawk.pos, diveTarget: hawk.diveTarget, screechTarget: hawk.screechTarget,
    featherCount: hawk.feathers.length,
  };
}

// ------------------------------------------------------------------ catch
function doCatch() {
  const P = S.player;
  const catchPoint = P.pos.clone();
  // carried food drops at the catch point (trivial via food.js, dogs do it)
  if (S.carried) { try { dropCarried(); } catch (e) { /* food is a bonus */ } }
  sfx.caught();
  // relocation: a random registered tree's canopy platform
  const cands = (S.trees || []).filter((t) => t && typeof t.canopyY === 'number');
  let dest;
  if (cands.length) {
    const t = cands[(Math.random() * cands.length) | 0];
    let y = t.canopyY - 0.55; // the platform trees.js registered for it
    for (const p of S.platforms || []) {
      if (p.x === t.x && p.z === t.z) { y = p.y; break; }
    }
    dest = new THREE.Vector3(t.x, y, t.z);
  } else if (S.respawnPoint) {
    dest = S.respawnPoint.clone();
  } else {
    dest = catchPoint.clone();
  }
  P.vel.set(0, 0, 0);
  // Fade via the ranger's mechanism, extended in main.js with a
  // destination + message (the stock ranger call still defaults to the
  // bandstand roof). Stash is INTACT: lost is 0 and S.stash is untouched.
  let handled = false;
  if (S.fadeCatch) {
    try { S.fadeCatch(0, { pos: dest, message: CATCH_TOAST, grounded: true }); handled = true; } catch (e) { handled = false; }
  }
  if (!handled) {
    P.pos.copy(dest);
    P.climbing = null;
    P.grounded = true;
    toast(CATCH_TOAST, 4.5);
  }
  hawk.state = 'recover';
  startRecover(randCooldown(18, 30));
}

function startRecover(cooldown) {
  hawk.recoverFrom.copy(hawk.pos);
  hawk.recoverT = 0;
  hawk.recoverDur = 2.8;
  hawk.cooldown = cooldown;
  hawk.state = 'recover';
}

// ------------------------------------------------------------------ update
const _next = new THREE.Vector3();
const _discPos = new THREE.Vector3();

function flap(dt, mode) {
  // mode: 'circle' slow flap with glides between, 'tucked' dive,
  // 'folded' roost, 'hard' recover climb-out
  if (!hawk) return;
  hawk.flapPhase += dt * (mode === 'hard' ? 7 : 2.1);
  const u = hawk.mesh.userData;
  if (!u || !u.wingL || !u.wingR) return;
  let a;
  if (mode === 'tucked') a = -0.55;
  else if (mode === 'folded') a = -0.95;
  else if (mode === 'hard') a = Math.sin(hawk.flapPhase) * 0.65;
  else {
    // glide between flaps: flap hard for ~1.6 s of every ~4 s cycle
    const cyc = hawk.flapPhase % 8.4;
    a = cyc < 3.4 ? Math.sin(hawk.flapPhase * 2.4) * 0.38 : 0.1 + Math.sin(hawk.flapPhase * 0.7) * 0.04;
  }
  u.wingL.rotation.z = -a;
  u.wingR.rotation.z = a;
  if (u.talons) u.talons.rotation.x = mode === 'tucked' ? 0.5 : 0;
}

function placeDisc(x, z, scale, opacity) {
  if (!hawk || !hawk.disc) return;
  hawk.disc.visible = true;
  hawk.disc.position.set(x, groundHeight(x, z) + 0.07, z);
  hawk.disc.scale.set(scale, scale, 1);
  if (hawk.discMat) hawk.discMat.opacity = opacity;
}

export function updateHawk(dt) {
  if (!hawk) return;
  if (!(dt > 0)) dt = 0;
  hawk.sessionTime += dt;
  if (hawk.cooldown > 0) hawk.cooldown -= dt;
  updateFeathers(dt);
  const P = S.player;
  const daylight = isDaylight();

  switch (hawk.state) {
    case 'roost': {
      roostPos(hawk.pos);
      hawk.mesh.position.copy(hawk.pos);
      hawk.mesh.rotation.set(0, 0.6, 0);
      flap(dt, 'folded');
      if (hawk.disc) hawk.disc.visible = false;
      if (daylight) {
        // launch: rejoin the circle at the nearest angle
        hawk.angle = Math.atan2(hawk.pos.z - CIRCLE_CENTRE.z, hawk.pos.x - CIRCLE_CENTRE.x);
        hawk.state = 'circle';
      }
      break;
    }

    case 'circle': {
      if (!daylight) { hawk.state = 'roost'; break; }
      hawk.angle += (CIRCLE_SPEED / CIRCLE_R) * dt;
      circlePos(hawk.angle, hawk.pos);
      hawk.pos.y = CIRCLE_H + Math.sin(hawk.flapPhase * 0.5) * 0.8;
      hawk.mesh.position.copy(hawk.pos);
      circlePos(hawk.angle + 0.05, _next);
      if (hawk.mesh.lookAt) hawk.mesh.lookAt(_next.x, hawk.pos.y, _next.z);
      flap(dt, 'circle');
      // faint, wide disc drifting under her - present, not yet a threat
      placeDisc(hawk.pos.x, hawk.pos.z, 3.6, 0.13);
      // start a hunt?
      if (hawk.sessionTime > FIRST_DIVE_AFTER && hawk.cooldown <= 0 && isPlayerExposed()) {
        hawk.state = 'screech';
        hawk.timer = SCREECH_TIME;
        hawk.screechTarget.copy(P.pos);
        if (sfx.screech) sfx.screech();
        S.spottedFlash = Math.max(S.spottedFlash || 0, 1.6);
        if (!hawk.warned) { hawk.warned = true; toast(FIRST_DIVE_TOAST, 3.2); }
      }
      break;
    }

    case 'screech': {
      hawk.timer -= dt;
      // she keeps circling, tightening her attention on the target below
      hawk.angle += (CIRCLE_SPEED / CIRCLE_R) * dt * 1.4;
      circlePos(hawk.angle, hawk.pos);
      hawk.pos.y = CIRCLE_H - (1 - Math.max(0, hawk.timer) / SCREECH_TIME) * 4;
      hawk.mesh.position.copy(hawk.pos);
      circlePos(hawk.angle + 0.05, _next);
      if (hawk.mesh.lookAt) hawk.mesh.lookAt(_next.x, hawk.pos.y, _next.z);
      flap(dt, 'circle');
      if (!isPlayerExposed()) {
        // broke cover / climbed / ducked under canopy: abort, lesson taught
        hawk.state = 'circle';
        hawk.cooldown = Math.max(hawk.cooldown, randCooldown(4, 6));
        break;
      }
      // disc locks onto the player and pulses for the whole telegraph
      hawk.screechTarget.copy(P.pos);
      const pulse = 2.1 + Math.sin(hawk.sessionTime * 18) * 0.45;
      placeDisc(P.pos.x, P.pos.z, pulse, 0.34 + Math.sin(hawk.sessionTime * 18) * 0.08);
      S.spottedFlash = Math.max(S.spottedFlash || 0, 0.4);
      if (hawk.timer <= 0) {
        // the dive point is FIXED from here on
        hawk.diveTarget.copy(P.pos);
        hawk.diveTarget.y = groundHeight(P.pos.x, P.pos.z) + 0.25;
        hawk.diveFrom.copy(hawk.pos);
        const dist = hawk.diveFrom.distanceTo(hawk.diveTarget);
        hawk.diveDur = Math.max(0.3, dist / DIVE_SPEED);
        hawk.diveT = 0;
        hawk.state = 'dive';
      }
      break;
    }

    case 'dive': {
      hawk.diveT += dt / hawk.diveDur;
      const t = Math.min(1, hawk.diveT);
      // swoop curve: horizontal lerp, height eases in hard at the end
      hawk.pos.x = hawk.diveFrom.x + (hawk.diveTarget.x - hawk.diveFrom.x) * t;
      hawk.pos.z = hawk.diveFrom.z + (hawk.diveTarget.z - hawk.diveFrom.z) * t;
      const ey = Math.pow(t, 1.35);
      hawk.pos.y = hawk.diveFrom.y + (hawk.diveTarget.y - hawk.diveFrom.y) * ey;
      hawk.mesh.position.copy(hawk.pos);
      if (hawk.mesh.lookAt) hawk.mesh.lookAt(hawk.diveTarget.x, hawk.diveTarget.y, hawk.diveTarget.z);
      flap(dt, 'tucked');
      // the telegraph pays off: disc sits on the fixed point, shrinking
      // and darkening as she falls out of the sky at it
      placeDisc(hawk.diveTarget.x, hawk.diveTarget.z, 2.6 - 1.8 * t, 0.2 + 0.38 * t);
      if (t >= 1) {
        const distToPoint = P && P.pos ? Math.hypot(P.pos.x - hawk.diveTarget.x, P.pos.z - hawk.diveTarget.z) : 1e9;
        if (distToPoint <= CATCH_RADIUS && isPlayerExposed()) {
          doCatch();
        } else {
          // clean miss: moved >3 m, got under canopy, onto a platform,
          // or started climbing (isPlayerExposed false / point vacated).
          // She swoops through and climbs out either way.
          if (distToPoint > DODGE_DISTANCE) { /* dodged - no comment, no spam */ }
          startRecover(randCooldown(18, 30));
        }
      }
      break;
    }

    case 'recover': {
      hawk.recoverT += dt / hawk.recoverDur;
      const t = Math.min(1, hawk.recoverT);
      circlePos(hawk.angle + t * 0.4, _next);
      hawk.pos.x = hawk.recoverFrom.x + (_next.x - hawk.recoverFrom.x) * t;
      hawk.pos.z = hawk.recoverFrom.z + (_next.z - hawk.recoverFrom.z) * t;
      hawk.pos.y = hawk.recoverFrom.y + (CIRCLE_H - hawk.recoverFrom.y) * (t * t * (3 - 2 * t));
      hawk.mesh.position.copy(hawk.pos);
      if (hawk.mesh.lookAt) hawk.mesh.lookAt(_next.x, CIRCLE_H, _next.z);
      flap(dt, 'hard');
      placeDisc(hawk.pos.x, hawk.pos.z, 3.2, 0.13 * (1 - t * 0.4));
      if (t >= 1) {
        hawk.angle = Math.atan2(hawk.pos.z - CIRCLE_CENTRE.z, hawk.pos.x - CIRCLE_CENTRE.x);
        hawk.state = daylight ? 'circle' : 'roost';
      }
      break;
    }

    default: hawk.state = daylight ? 'circle' : 'roost'; break;
  }
}

// -------------------------------------------------------------------- bite
// Called through S.onBite in main.js, in the same chain as biteDogs /
// biteRanger. The bite itself is gated by player.js tryBite(), which sets
// S.player.biteCooldown = 1.4 before invoking S.onBite - exactly how the
// dog and ranger bites respect the cooldown, so this one does too (it
// never initiates a bite on its own and never bypasses that gate).
export function biteHawk() {
  if (!hawk || !S.player || !S.player.pos) return false;
  if (hawk.state !== 'screech' && hawk.state !== 'dive') return false;
  if (hawk.state === 'screech' && hawk.timer > BITE_SCREECH_WINDOW) return false;
  if (hawk.pos.distanceTo(S.player.pos) >= BITE_RANGE) return false;
  // veer off hard: climb out sideways, feather tax, longer memory
  if (S.scene) spawnFeatherPuff(S.scene, hawk.pos);
  else spawnFeatherPuff(hawk.mesh && hawk.mesh.parent ? hawk.mesh.parent : null, hawk.pos);
  toast(BITE_TOAST, 3);
  startRecover(randCooldown(38, 48));
  return true;
}
