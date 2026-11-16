// SCURRY - the Public Garden lagoon bridge geese. Three of them. They hold
// the bridge the way a union holds a job site: it is theirs, it has always
// been theirs, and crossing it is a negotiation, not a right.
//
// The bridge is the only dry, ground-level crossing of the lagoon, so the
// geese are a toll gate with feathers - never a wall. Every goose move is
// telegraphed (posture up, honk) before anything charges, and there are
// always three honest ways past:
//
//   WAIT  - stop on the deck, stay clear of them, be patient for ~4 s.
//           Geese respect patience. They shuffle to the rails for 6 s
//           and leave the centre of the deck open. Rush the shuffle and
//           they change their minds.
//   TOLL  - bring food. Carry something within reach and the nearest
//           goose takes it as payment; food left sitting on the deck
//           gets collected too. A fed flock is a content flock: 30-45 s
//           at the rails, no charges, no attitude.
//   BYPASS - they only hold the DECK. The canopy above it, the water
//           below it, and both shores are none of their business. The
//           "on the bridge" test below is the whole jurisdiction.
//
// A charge that connects is a soft fail, same as Hawk Dua and the ranger:
// fade out, wake up at the nearest end of the bridge, stash intact. The
// only casualty is dignity, and that was never insured. Nothing here can
// hurt the squirrel. Geese do not kill. Geese relocate.

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundHeight } from '../world/world.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { setCarriedVisual } from './player.js';
import { removeFoodItem } from './food.js';

// ---------------------------------------------------------------- tuning
const BRIDGE_X = MAP.lagoon.x;        // -132: the deck runs along Z here
const DECK_HALF_W = 2.7;              // deck x: BRIDGE_X +/- 2.7
const DECK_HALF_L = 18;               // deck z: -18..18
const RAIL_OFF = 1.9;                 // stand-down / fed offset from centre

const WARN_RANGE = 8;                 // on deck, this close = posture + honk
const NEIGHBOUR_RANGE = 6;            // warn spreads to geese this close
const CHARGE_RANGE = 3.2;             // warned + this close = charge
const CHARGE_SPEED = 3.4;
const CHARGE_TIME = 4;                // a charge gives up after this long
const CONTACT_DIST = 0.75;            // GOOSE JUSTICE radius
const FLOCK_COOLDOWN = 4;             // after a catch, everyone calms down
const CHARGE_COOLDOWN = 2.5;          // after a whiffed charge, that goose rests

const WAIT_DIST = 4.5;                // wait-out: stay at least this clear...
const WAIT_SPEED = 0.35;              // ...and slower than this (m/s)...
const WAIT_TIME = 4;                  // ...for this long, continuously
const ASIDE_TIME = 6;                 // stand-down lasts this long
const RUSH_DIST = 2.5;                // rushing the shuffle: this close...
const RUSH_SPEED = 2;                 // ...and faster than this = re-warn
const RUSH_GRACE = 0.5;               // no charge for this long after a re-warn

const TOLL_RANGE = 2.4;               // carried food is collected this close
const TOLL_FED_TIME = 45;             // carried toll buys this much peace
const DECK_FOOD_RANGE = 3.5;          // deck food noticed this close to a goose
const DECK_FOOD_FED_TIME = 30;        // deck food buys this much peace
const EAT_DIST = 0.55;                // close enough to a deck snack to eat it

const RETURN_SPEED = 1.2;             // waddle back to post / to the rail
const EAT_SPEED = 1.4;                // waddle to a deck snack (motivated)
const HONK_WARN_EVERY = 1.6;          // warning honk cadence
const HONK_CHARGE_EVERY = 0.55;       // charging honk cadence (a faster clip)
const WARN_TOAST_EVERY = 30;          // the bridge lecture, at most this often

const WARN_TOAST = 'the bridge is held by geese. they accept patience, bribes (food), or altitude.';
const TOLL_TOAST = 'toll paid. the geese respect the arrangement.';
const CATCH_TOAST = 'GOOSE JUSTICE. deposited at the end of the bridge. stash intact. dignity: pending.';

// posts on the deck: [x, z, facing yaw] - facing runs along the bridge
const POSTS = [
  [-132.9, -6.0, 0],
  [-131.1, 0.5, Math.PI],
  [-132.6, 6.5, 0],
];

let geese = [];
let deckY = 0.55;

// flock-shared state: one alert level for the whole flock, individual
// states per goose (in each goose record below)
const flock = {
  fed: 0,              // seconds of contentment remaining (toll paid)
  cooldown: 0,         // seconds of post-catch calm (no warn, no charge)
  grace: 0,            // seconds of no-charge grace after a rush re-warn
  aside: 0,            // seconds of stand-down remaining (geese at rails)
  wait: 0,             // continuous patient seconds banked toward stand-down
  honkCd: 0,           // shared honk cadence timer
  warnToastCd: 0,      // throttle for the bridge lecture
  contentHonkCd: -1,   // one (1) content honk per feeding, -1 = spent/none
  anyWarn: false,      // recomputed every frame: is any goose warning?
  anyCharge: false,    // recomputed every frame: is any goose charging?
};

// ------------------------------------------------------------- the goose
// Procedural goose, ~0.78 m at the head - a boss at squirrel scale, which
// is exactly what a goose is. White body, S-neck in two segments so the
// poses read (relaxed / upright / low-and-forward), orange cone beak,
// black bead eyes, flattened cone tail, webbed feet, and wings pivoted at
// the shoulders for the charge flap. No imagery, just geometry.
function makeGooseMesh() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.95 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 1 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xe07b24, roughness: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x14120e, roughness: 0.4 });

  // body: sphere stretched long, breast forward (+Z is the facing)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), white);
  body.scale.set(1, 0.85, 1.35);
  body.position.set(0, 0.34, 0);
  body.castShadow = true;
  g.add(body);
  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), white);
  breast.scale.set(0.95, 0.9, 1);
  breast.position.set(0, 0.32, 0.16);
  g.add(breast);

  // neck: base group at the breast, two cylinder segments. Posing rotates
  // the base (and a little of the upper joint for the S-curve / droop).
  const neck = new THREE.Group();
  neck.position.set(0, 0.42, 0.22);
  const neckLow = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.065, 0.2, 8), white);
  neckLow.position.y = 0.09;
  neckLow.castShadow = true;
  neck.add(neckLow);
  const neckUp = new THREE.Group();
  neckUp.position.y = 0.18;
  const neckHigh = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.16, 8), white);
  neckHigh.position.y = 0.06;
  neckHigh.castShadow = true;
  neckUp.add(neckHigh);

  // head: sphere + orange cone beak + bead eyes
  const head = new THREE.Group();
  head.position.y = 0.15;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), white);
  skull.scale.set(0.9, 0.9, 1.15);
  skull.castShadow = true;
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.15, 8), orange);
  beak.rotation.x = Math.PI / 2; // cone tip forward (+Z)
  beak.position.set(0, -0.01, 0.15);
  head.add(beak);
  for (const sx of [-0.062, 0.062]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), black);
    eye.position.set(sx, 0.028, 0.062);
    head.add(eye);
  }
  neckUp.add(head);
  neck.add(neckUp);
  g.add(neck);

  // tail: flattened cone tipped up at the back, the classic goose shrug
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 8), grey);
  tail.scale.set(1.15, 1, 0.45);
  tail.rotation.x = -1.15; // tip up and back
  tail.position.set(0, 0.46, -0.3);
  g.add(tail);

  // wings: flattened spheres on shoulder pivots, rotation.z is the flap
  function makeWing(side) {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 7), grey);
    wing.scale.set(1.15, 0.28, 1.5);
    wing.position.set(side * 0.2, 0, -0.03);
    pivot.add(wing);
    pivot.position.set(side * 0.17, 0.44, 0.02);
    g.add(pivot);
    return pivot;
  }
  const wingL = makeWing(-1);
  const wingR = makeWing(1);

  // webbed feet: flattened orange boxes, mostly hidden, entirely smug
  for (const sx of [-0.1, 0.1]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.24), orange);
    foot.position.set(sx, 0.015, 0.05);
    g.add(foot);
  }

  g.userData = { neck, neckUp, head, tail, wingL, wingR };
  return g;
}

// the rail a goose retires to: whichever side its post already leans to,
// so the flock splits and the centre of the deck opens up
function railX(g) {
  return g.home.x < BRIDGE_X ? BRIDGE_X - RAIL_OFF : BRIDGE_X + RAIL_OFF;
}

// ------------------------------------------------------------------ build
export function buildGeese(scene) {
  geese = [];
  // the deck height comes from the bridge's own walkable box (landmarks.js
  // registers it); fall back to a plausible deck if it is somehow missing
  deckY = 0.55;
  for (const b of S.platformBoxes || []) {
    if (BRIDGE_X >= b.minX && BRIDGE_X <= b.maxX && 0 >= b.minZ && 0 <= b.maxZ) {
      deckY = b.y;
      break;
    }
  }
  if (typeof S.gooseWarn !== 'number') S.gooseWarn = 0;

  for (let i = 0; i < POSTS.length; i++) {
    const [x, z, yaw] = POSTS[i];
    const mesh = makeGooseMesh();
    mesh.position.set(x, deckY, z);
    mesh.rotation.y = yaw;
    scene.add(mesh);
    geese.push({
      mesh,
      pos: new THREE.Vector3(x, deckY, z), // feet on the deck, always deckY
      home: { x, z },
      yaw,
      phase: Math.random() * 9,            // idle animation offset
      state: 'idle',   // idle | warn | charge | return | aside | fed | eat
      cooldown: 0,     // personal post-charge rest
      chargeT: 0,      // seconds spent on the current charge
      neckX: 0.3,      // current neck pitch (smoothed toward a pose target)
      flapPhase: Math.random() * 9,
      peckT: 1 + Math.random() * 3,        // countdown to the next idle peck
      pecking: 0,      // seconds of peck remaining
      happyT: 0,       // seconds of toll-celebration neck-bob remaining
      warnFlag: false, // recomputed per frame by the flock alert pass
      food: null,      // deck food item this goose is collecting, if any
      tx: x, tz: z,    // current movement target (scalars, no allocation)
    });
  }
  return geese;
}

// --------------------------------------------------------------- helpers
// The whole jurisdiction, in one place: standing ON the deck. Canopy above
// fails the y test, water/shore fail the x/z test, hollow/burrow players
// are off-map anyway. Bypass is not an exploit; it is the design.
function playerOnBridge(P) {
  if (!P || !P.pos || P.inHollow || P.inBurrow) return false;
  return Math.abs(P.pos.x - BRIDGE_X) < 3.4 &&
    Math.abs(P.pos.z) < 19.5 &&
    Math.abs(P.pos.y - deckY) < 1.3;
}

function honk() {
  if (sfx.honk) sfx.honk();
}

function chomp() {
  if (sfx.chomp) sfx.chomp();
}

// smooth-turn the goose's mesh toward a yaw, ranger-style angle wrapping
function faceYaw(g, targetYaw, dt, rate) {
  let dy = targetYaw - g.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  g.yaw += dy * Math.min(1, dt * rate);
}

// steer toward (tx, tz) on the deck plane; returns distance remaining.
// Geese never leave the deck: the target and the result are both clamped
// to it, and pos.y is pinned to deckY no matter what.
function moveToward(g, tx, tz, speed, dt) {
  const cx = Math.max(BRIDGE_X - DECK_HALF_W + 0.2, Math.min(BRIDGE_X + DECK_HALF_W - 0.2, tx));
  const cz = Math.max(-DECK_HALF_L + 0.3, Math.min(DECK_HALF_L - 0.3, tz));
  const dx = cx - g.pos.x, dz = cz - g.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.03) {
    const step = Math.min(d, speed * dt);
    g.pos.x += dx / d * step;
    g.pos.z += dz / d * step;
    faceYaw(g, Math.atan2(dx, dz), dt, 8);
  }
  g.pos.y = deckY;
  return d;
}

function distToPlayer(g, P) {
  return Math.hypot(P.pos.x - g.pos.x, P.pos.z - g.pos.z);
}

// the flock gets fed: everyone stands down, retires to the rails, and the
// one permitted content honk is scheduled. Peace, bought and paid for.
function feedFlock(seconds) {
  flock.fed = Math.max(flock.fed, seconds);
  flock.wait = 0;
  flock.aside = 0;
  flock.contentHonkCd = 0.9;
  for (const g of geese) {
    g.state = 'fed';
    g.food = null;
    g.chargeT = 0;
  }
}

// GOOSE JUSTICE: fade + deposit at the nearest end of the bridge, on the
// shore, stash intact. The one allocation here is the destination - a
// catch is a rare event, not a per-frame cost.
function gooseJustice(P) {
  const endZ = (P.pos.z >= 0 ? 1 : -1) * 22.5;
  const dest = new THREE.Vector3(BRIDGE_X, groundHeight(BRIDGE_X, endZ), endZ);
  flock.cooldown = FLOCK_COOLDOWN;
  flock.wait = 0;
  for (const g of geese) {
    if (g.state !== 'fed') g.state = 'return';
    g.chargeT = 0;
    g.food = null;
  }
  if (S.fadeCatch) {
    try {
      S.fadeCatch(0, { pos: dest, message: CATCH_TOAST, grounded: true });
      return;
    } catch (e) { /* fall through to the hard teleport below */ }
  }
  P.pos.copy(dest);
  if (P.vel) P.vel.set(0, 0, 0);
  P.climbing = null;
  P.grounded = true;
  toast(CATCH_TOAST, 4.5);
}

// ---------------------------------------------------------------- update
export function updateGeese(dt) {
  if (!geese.length) return;
  if (!(dt > 0)) dt = 0;
  const P = S.player;
  const now = performance.now() / 1000;
  const onBridge = playerOnBridge(P);
  const speedH = (P && P.vel) ? Math.hypot(P.vel.x, P.vel.z) : 0;

  // ---- flock timers ----
  if (flock.cooldown > 0) flock.cooldown -= dt;
  if (flock.grace > 0) flock.grace -= dt;
  if (flock.warnToastCd > 0) flock.warnToastCd -= dt;
  if (flock.honkCd > 0) flock.honkCd -= dt;
  if (flock.fed > 0) {
    flock.fed -= dt;
    if (flock.contentHonkCd > 0) {
      flock.contentHonkCd -= dt;
      if (flock.contentHonkCd <= 0) honk(); // the one content honk
    }
    if (flock.fed <= 0) {
      // peace expires: drift back to the posts, normal rules resume
      flock.fed = 0;
      for (const g of geese) if (g.state === 'fed') g.state = 'return';
    }
  }
  if (flock.aside > 0) flock.aside -= dt;

  // ---- FOOD TOLL (a): carried food, collected by the nearest goose ----
  // Warned or not - a goose does not need to be angry to accept a bribe.
  // Skipped while already fed: the arrangement is honoured, keep your food.
  if (flock.fed <= 0 && S.carried && P && P.pos && onBridge) {
    let best = null, bd = TOLL_RANGE;
    for (const g of geese) {
      const d = distToPlayer(g, P);
      if (d < bd) { bd = d; best = g; }
    }
    if (best) {
      S.carried = null;
      try { setCarriedVisual(null); } catch (e) { /* visual only */ }
      chomp();
      best.happyT = 1.2;
      feedFlock(TOLL_FED_TIME);
      toast(TOLL_TOAST, 3.2);
    }
  }

  // ---- FOOD TOLL (b): food sitting on the deck gets collected ----
  // A goose waddles over and eats it; same peace, slightly shorter -
  // delivery was not included.
  if (flock.fed <= 0 && S.foods && S.foods.length) {
    let busy = false;
    for (const g of geese) if (g.state === 'eat') { busy = true; break; }
    if (!busy) {
      let foundGoose = null, foundFood = null, bd = DECK_FOOD_RANGE;
      for (const f of S.foods) {
        if (!f || !f.mesh) continue;
        const fp = f.mesh.position;
        if (Math.abs(fp.y - deckY) > 1.3) continue;              // not on the deck
        if (Math.abs(fp.x - BRIDGE_X) >= 3 || Math.abs(fp.z) >= 18) continue;
        for (const g of geese) {
          if (g.state === 'charge' || g.cooldown > 0) continue;
          const d = Math.hypot(fp.x - g.pos.x, fp.z - g.pos.z);
          if (d < bd) { bd = d; foundGoose = g; foundFood = f; }
        }
      }
      if (foundGoose && foundFood) {
        foundGoose.state = 'eat';
        foundGoose.food = foundFood;
      }
    }
  }

  // ---- flock alert pass: who is warning this frame ----
  flock.anyWarn = false;
  flock.anyCharge = false;
  for (const g of geese) {
    g.warnFlag = false;
    if (g.state === 'charge') flock.anyCharge = true;
  }
  const canAlert = flock.fed <= 0 && flock.aside <= 0 && flock.cooldown <= 0;
  if (canAlert && onBridge && P && P.pos) {
    // primary: any goose with the player inside WARN_RANGE
    for (const g of geese) {
      if (g.cooldown <= 0 && g.state !== 'eat' && distToPlayer(g, P) < WARN_RANGE) g.warnFlag = true;
    }
    // neighbours: warning is contagious within NEIGHBOUR_RANGE of a warner
    for (const g of geese) {
      if (g.warnFlag || g.cooldown > 0 || g.state === 'eat') continue;
      for (const o of geese) {
        if (o !== g && o.warnFlag &&
            Math.hypot(o.pos.x - g.pos.x, o.pos.z - g.pos.z) < NEIGHBOUR_RANGE) {
          g.warnFlag = true;
          break;
        }
      }
    }
    for (const g of geese) if (g.warnFlag) flock.anyWarn = true;
  }

  // warning side effects: the HUD line, the honks, the lecture (throttled)
  if (flock.anyWarn) {
    S.gooseWarn = 1.6;
    if (flock.honkCd <= 0) {
      honk();
      flock.honkCd = flock.anyCharge ? HONK_CHARGE_EVERY : HONK_WARN_EVERY;
    }
    if (flock.warnToastCd <= 0) {
      toast(WARN_TOAST, 3.6);
      flock.warnToastCd = WARN_TOAST_EVERY;
    }
  } else if (typeof S.gooseWarn === 'number' && S.gooseWarn > 0) {
    // nobody is actively warning: the HUD line decays away on our watch
    S.gooseWarn = Math.max(0, S.gooseWarn - dt);
  }

  // ---- WAIT-OUT: patience, measured honestly ----
  // On the deck, clear of every goose, and actually slow - continuously.
  // Any drift toward them, or any hurry, resets the clock.
  if (flock.anyWarn && onBridge && P && P.pos) {
    let clear = true;
    for (const g of geese) {
      if (distToPlayer(g, P) < WAIT_DIST) { clear = false; break; }
    }
    if (clear && speedH < WAIT_SPEED) {
      flock.wait += dt;
      if (flock.wait >= WAIT_TIME) {
        // stand down: shuffle to the rails, centre open, 6 s to cross
        flock.wait = 0;
        flock.aside = ASIDE_TIME;
        for (const g of geese) {
          if (g.state === 'warn' || g.state === 'idle') g.state = 'aside';
          g.warnFlag = false;
        }
        flock.anyWarn = false;
        if (typeof S.gooseWarn === 'number') S.gooseWarn = Math.min(S.gooseWarn, 0.4);
      }
    } else {
      flock.wait = 0;
    }
  } else if (!flock.anyWarn) {
    flock.wait = 0;
  }

  // ---- rushing the shuffle re-warns instantly (with a charge grace) ----
  if (flock.aside > 0 && flock.fed <= 0 && onBridge && P && P.pos && speedH > RUSH_SPEED) {
    for (const g of geese) {
      if (distToPlayer(g, P) < RUSH_DIST) {
        flock.aside = 0;
        flock.grace = RUSH_GRACE;
        for (const o of geese) if (o.state === 'aside') o.state = 'warn';
        flock.anyWarn = true;
        S.gooseWarn = 1.6;
        honk();
        flock.honkCd = HONK_WARN_EVERY;
        break;
      }
    }
  }
  if (flock.aside <= 0) {
    for (const g of geese) if (g.state === 'aside') g.state = 'return';
  }

  // ---- per-goose behaviour, movement, and posing ----
  let justicePending = false;
  for (const g of geese) {
    if (g.cooldown > 0) g.cooldown -= dt;
    if (g.peckT > 0) g.peckT -= dt;
    if (g.pecking > 0) g.pecking -= dt;
    if (g.happyT > 0) g.happyT -= dt;
    g.flapPhase += dt;

    // state selection (flock events above may have already set a state)
    if (flock.fed > 0) {
      if (g.state !== 'fed') { g.state = 'fed'; g.food = null; }
    } else if (g.state === 'fed') {
      g.state = 'return';
    } else if (g.state === 'charge') {
      // charging continues until contact, escape, or timeout (below)
    } else if (g.state === 'eat') {
      // collecting continues until the snack is gone (below)
    } else if (flock.aside > 0) {
      g.state = 'aside';
    } else if (g.warnFlag && g.cooldown <= 0) {
      g.state = 'warn';
    } else if (g.state === 'warn') {
      g.state = 'return';
    }

    // charge trigger: warned, close, off cooldown, flock calm, no grace
    if (g.state === 'warn' && onBridge && P && P.pos &&
        flock.cooldown <= 0 && flock.grace <= 0 && g.cooldown <= 0 &&
        distToPlayer(g, P) < CHARGE_RANGE) {
      g.state = 'charge';
      g.chargeT = 0;
      flock.anyCharge = true;
      honk();
      flock.honkCd = HONK_CHARGE_EVERY;
    }

    // movement by state
    let moving = false;
    if (g.state === 'charge') {
      g.chargeT += dt;
      moving = true;
      moveToward(g, P.pos.x, P.pos.z, CHARGE_SPEED, dt);
      if (flock.honkCd <= 0) { honk(); flock.honkCd = HONK_CHARGE_EVERY; }
      const d = distToPlayer(g, P);
      if (onBridge && d < CONTACT_DIST) {
        justicePending = true;
      } else if (!onBridge || g.chargeT >= CHARGE_TIME) {
        // the squirrel left the deck, or the goose ran out of conviction
        g.state = 'return';
        g.cooldown = CHARGE_COOLDOWN;
        g.chargeT = 0;
      }
    } else if (g.state === 'eat') {
      const f = g.food;
      // the snack may have been taken by the squirrel (or another fate)
      if (!f || !S.foods || S.foods.indexOf(f) === -1 || !f.mesh) {
        g.food = null;
        g.state = 'return';
      } else {
        moving = true;
        const d = moveToward(g, f.mesh.position.x, f.mesh.position.z, EAT_SPEED, dt);
        if (d < EAT_DIST) {
          try { removeFoodItem(f); } catch (e) { /* food.js owns removal */ }
          chomp();
          g.food = null;
          g.happyT = 1.2;
          feedFlock(DECK_FOOD_FED_TIME);
        }
      }
    } else if (g.state === 'fed' || g.state === 'aside') {
      // at the rails: content (fed) or stood-down (aside), centre is open
      const d = moveToward(g, railX(g), g.home.z, RETURN_SPEED, dt);
      moving = d > 0.1;
    } else if (g.state === 'return') {
      const d = moveToward(g, g.home.x, g.home.z, RETURN_SPEED, dt);
      moving = d > 0.1;
      if (d <= 0.1) g.state = g.warnFlag ? 'warn' : 'idle';
    } else if (g.state === 'warn') {
      // hold the post, face the intruder, be a warning about it
      if (P && P.pos) faceYaw(g, Math.atan2(P.pos.x - g.pos.x, P.pos.z - g.pos.z), dt, 7);
    } else {
      // idle: drift home if displaced, otherwise hold the post and preen
      const d = Math.hypot(g.home.x - g.pos.x, g.home.z - g.pos.z);
      if (d > 0.2) {
        moveToward(g, g.home.x, g.home.z, RETURN_SPEED * 0.6, dt);
        moving = true;
      }
      if (g.peckT <= 0) { g.peckT = 2 + Math.random() * 3.5; g.pecking = 0.55; }
    }

    // ---- posing: neck, head, wings, body language ----
    // neck pitch targets: idle relaxed with occasional pecks, warn fully
    // upright, charge low and forward, fed/content curved down, happy
    // toll-bobbing. Negative pitch = reared up, positive = bent forward.
    const u = g.mesh.userData;
    let neckTarget = 0.3;
    let flapAmp = 0.04, flapFreq = 2, spread = 0.06, rockAmp = 0.02, rockFreq = 3;
    if (g.happyT > 0) {
      neckTarget = 0.25 + Math.sin(now * 11 + g.phase) * 0.3; // the toll bob
      spread = 0.15;
    } else if (g.state === 'charge') {
      neckTarget = 0.88; // low, forward, incoming
      flapAmp = 0.85; flapFreq = 26; spread = 0.5;
      rockAmp = 0.06; rockFreq = 18;
    } else if (g.state === 'warn') {
      neckTarget = -0.08; // fully upright, aimed at the player
      spread = 0.28; flapAmp = 0.05; flapFreq = 3;
      rockAmp = 0.045; rockFreq = 5; // the slow, deliberate body rock
    } else if (g.state === 'fed') {
      neckTarget = 0.52; // curved down, grazing at nothing, unbothered
      if (g.pecking > 0) neckTarget = 0.95;
      rockAmp = 0.03; rockFreq = 2.2; // slow contented waddle-rock
    } else if (g.state === 'eat') {
      neckTarget = 0.45;
      if (moving) { rockAmp = 0.05; rockFreq = 9; }
    } else if (g.state === 'aside') {
      neckTarget = 0.35;
      if (moving) { rockAmp = 0.05; rockFreq = 8; }
    } else if (moving) {
      neckTarget = 0.35;
      rockAmp = 0.05; rockFreq = 9; // waddle
    } else if (g.pecking > 0) {
      neckTarget = 0.95; // idle peck at the deck, preening, gossip
    }

    g.neckX += (neckTarget - g.neckX) * Math.min(1, dt * 8);
    if (u.neck) u.neck.rotation.x = g.neckX;
    if (u.neckUp) u.neckUp.rotation.x = g.neckX * 0.45; // the S-curve
    if (u.head) {
      // warn: head locked on the player. Otherwise it rides the neck,
      // counter-pitching a little so the gaze stays level-ish.
      u.head.rotation.x = g.state === 'warn' ? -g.neckX * 0.6 : -g.neckX * 0.35;
    }
    const flap = Math.sin(g.flapPhase * flapFreq) * flapAmp;
    if (u.wingL) u.wingL.rotation.z = -(spread + flap);
    if (u.wingR) u.wingR.rotation.z = spread + flap;
    if (u.tail) u.tail.rotation.y = Math.sin(now * 2.1 + g.phase) * (g.state === 'fed' ? 0.3 : 0.12);

    g.mesh.position.copy(g.pos);
    g.mesh.rotation.set(0, g.yaw, Math.sin(now * rockFreq + g.phase) * rockAmp);
  }

  // a charge connected this frame: justice is served after the loop so
  // no goose iterates over a flock mid-relocation
  if (justicePending && P && P.pos) gooseJustice(P);
}
