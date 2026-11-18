// SCURRY - food: the whole economy. Spawn, toss, pick up, carry one, bury it.
// Sources: begging tosses, benches, the pretzel cart, trash cans (jackpot),
// and picnic blankets (steal it when they're not looking... or don't).

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight, isGrass } from '../world/world.js';
import { sfx } from './audio.js';
import { toast, setGossip } from '../ui/hud.js';
import { setCarriedVisual } from './player.js';

const FOOD_STYLE = {
  acorn:    { color: 0x7a4a22, s: 0.055 },
  pretzel:  { color: 0xa06a28, s: 0.06 },
  sandwich: { color: 0xe3d3a2, s: 0.07 },
  peanut:   { color: 0xc8a86a, s: 0.045 },
  popcorn:  { color: 0xf5edd6, s: 0.05 },   // arena spill (TD Garden destination)
  croissant:{ color: 0xd9a860, s: 0.075 },  // rat-market premium; buries for 3 (BURY_VALUES)
};
// stash value per food type when buried; everything is 1 except the
// rat market's croissant - three caps of shinies buys three stash.
const BURY_VALUES = { croissant: 3 };
// A shared sphere and one material per type: repeated food pickups and
// respawns shouldn't compile hundreds of identical GPU materials on iPhones.
const geoCache = new THREE.SphereGeometry(1, 8, 6);
const foodMats = {};
const capGeo = new THREE.SphereGeometry(FOOD_STYLE.acorn.s * 0.95, 8, 5);
const capMat = new THREE.MeshStandardMaterial({ color: 0x54331a, roughness: 1 });

function makeFoodMesh(type) {
  const st = FOOD_STYLE[type];
  const mat = foodMats[type] || (foodMats[type] = new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.9 }));
  const m = new THREE.Mesh(geoCache, mat);
  m.scale.set(st.s, st.s * 0.75, st.s * 1.25);
  m.castShadow = true;
  if (type === 'acorn') {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = st.s * 0.5; cap.scale.y = 0.5;
    m.add(cap);
  }
  return m;
}

export function spawnFood(type, x, z, opts = {}) {
  const mesh = makeFoodMesh(type);
  const gy = opts.y !== undefined ? opts.y : groundHeight(x, z);
  mesh.position.set(x, gy + 0.05, z);
  S.scene.add(mesh);
  // Preserve an explicitly placed floor (arena parquet, Esplanade lawn,
  // canopy cache). The old per-frame groundHeight() snap moved all those
  // foods to y=0 regardless of the destination's visible floor.
  const item = { type, mesh, x, z, floorY: gy,
    source: opts.source || 'world', steal: !!opts.steal,
    blanket: opts.blanket || null, born: performance.now() };
  S.foods.push(item);
  return item;
}

const projectiles = [];
export function tossFood(type, from, to) {
  const mesh = makeFoodMesh(type);
  mesh.position.copy(from);
  S.scene.add(mesh);
  projectiles.push({ mesh, type, from: from.clone(), to: to.clone(), t: 0, dur: 0.55 });
}

// ambient spawns near benches, carts, trash cans
const AMBIENT = [
  ['acorn', 30, -58], ['acorn', 92, -24], ['peanut', 55, -16], ['pretzel', 124, 52],
  ['acorn', 15, 66], ['peanut', 172, 4], ['acorn', -100, -18], ['peanut', -160, 18],
  ['sandwich', 44, -22], ['acorn', 110, 30], ['peanut', -88, 60], ['acorn', 66, 84],
  ['pretzel', -20, -50], ['acorn', 190, -56], ['peanut', 8, -84], ['acorn', -150, -60],
];
let respawnTimer = 8;

export function initFood() {
  for (const [type, x, z] of AMBIENT) spawnFood(type, x, z, { source: 'ambient' });
  // blanket food: stealable
  for (const b of S.blankets) {
    spawnFood('sandwich', b.x + 0.4, b.z - 0.3, { steal: true, blanket: b, y: b.gy + 0.06 });
    spawnFood('pretzel', b.x - 0.5, b.z + 0.5, { steal: true, blanket: b, y: b.gy + 0.06 });
  }
  // trash can jackpots: interactable digs
  for (const c of S.trashCans || []) {
    let cooldown = 0;
    S.interactables.push({
      x: c.x, z: c.z, y: c.y, r: 1.5,
      label: () => cooldown > 0 ? null : 'E - raid trash can',
      action: () => {
        if (cooldown > 0) return;
        cooldown = 45;
        sfx.dig();
        if (Math.random() < 0.8) {
          const type = ['pretzel', 'sandwich', 'peanut'][(Math.random() * 3) | 0];
          tossFood(type, new THREE.Vector3(c.x, 1.1, c.z), new THREE.Vector3(S.player.pos.x, 0, S.player.pos.z));
          toast('jackpot. perfectly good food, thrown away. humans.', 2.6);
        } else {
          toast('just a banana peel. tragic.', 2.2);
        }
      },
      tick: (dt) => { if (cooldown > 0) cooldown -= dt; },
    });
  }
}

export function dropCarried() {
  if (!S.carried) return null;
  const P = S.player.pos;
  const item = spawnFood(S.carried, P.x + (Math.random() - 0.5), P.z + (Math.random() - 0.5));
  S.carried = null;
  setCarriedVisual(null);
  return item;
}

export function updateFood(dt) {
  // toss arcs
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.t += dt / p.dur;
    if (p.t >= 1) {
      projectiles.splice(i, 1);
      S.scene.remove(p.mesh);
      spawnFood(p.type, p.to.x, p.to.z);
    } else {
      p.mesh.position.lerpVectors(p.from, p.to, p.t);
      p.mesh.position.y += Math.sin(p.t * Math.PI) * 1.1 + (groundHeight(p.to.x, p.to.z) - p.from.y) * p.t;
      p.mesh.rotation.x += dt * 9;
    }
  }
  // Gentle bob/glint on food. Static floors were sampled once at spawn;
  // caller-provided ground heights must survive every frame (other realms).
  const now = performance.now() / 1000;
  for (const f of S.foods) {
    f.mesh.position.y = (f.steal ? f.mesh.position.y : f.floorY + 0.05 + Math.sin(now * 2 + f.x) * 0.008);
    f.mesh.rotation.y += dt * 0.7;
  }
  // ambient respawn keeps the park stocked
  respawnTimer -= dt;
  if (respawnTimer <= 0) {
    respawnTimer = 9;
    // Canopy caches, market croissants and destination snacks live in the
    // same registry but must NOT exhaust the Common's ambient food budget.
    // Cap the park's freely scattered ground food independently.
    let ambientCount = 0;
    for (const food of S.foods) if (food.source === 'ambient') ambientCount++;
    if (ambientCount < 20) {
      const [type, x, z] = AMBIENT[(Math.random() * AMBIENT.length) | 0];
      spawnFood(type, x + (Math.random() - 0.5) * 6, z + (Math.random() - 0.5) * 6,
        { source: 'ambient' });
    }
  }
  for (const it of S.interactables) if (it.tick) it.tick(dt);
}

// pickup / steal / bury decisions, called from main's interaction scan
// Vertical pickup gate, in metres between the food's y and the player's
// FEET y (S.player.pos is feet - see state.js / player.js). Food items
// store no y of their own (spawnFood keeps only x/z on the item), so the
// gate reads f.mesh.position.y, which is the live y at scan time: main's
// loop runs scanInteractions after updateFood and updateCanopy, so cache
// food has already been re-pinned to its branch for this frame.
// Explicit spawn floors are stable and do not get overwritten by a home-park
// height sample each frame (critical for Esplanade, TD Garden and roofs).
// Per-source audit of intended dy (food mesh y minus feet y):
//   ground spawns / respawns / drops / swaps / beg + trash-can tosses
//     (all land via spawnFood with no y): groundHeight + 0.05, dy ~0.05
//     (worst slope case, the terrace-edge ambient acorn: ~0.55)
//   blanket steal food: mesh pinned at blanket gy + 0.11, dy ~0.11
//   ground food grabbed from a low walkable surface beside it
//     (bandstand stage gy+1.1, bridge deck 1.15, monument step gy+1.2):
//     dy up to ~1.25 - the highest intended case, sets the gate floor
//   canopy cache food (canopy.js): mesh at platY + 0.07 where platY is
//     canopyY - 0.55 and elm canopyY is gy + 7.1..10.6, so dy ~0.07
//     standing on the canopy platform, but dy >= ~6.6 from the ground
// No food spawns on the pretzel cart or a trash-can rim (the can is an
// interactable; its jackpot is tossed and lands on the ground), so no
// case needs a gate above 1.25. 1.5 clears it with margin and is still
// far under the lowest ground-to-cache dy.
const FOOD_REACH_Y = 1.5;
const FOOD_REACH_XZ = 1.15;
function canReachFood(f, pos) {
  return S.foods.includes(f) && Math.abs(f.mesh.position.y - pos.y) <= FOOD_REACH_Y
    && Math.hypot(pos.x - f.x, pos.z - f.z) <= FOOD_REACH_XZ;
}
export function nearestFoodAction() {
  const P = S.player.pos;
  let best = null, bd = 1e9;
  for (const f of S.foods) {
    if (Math.abs(f.mesh.position.y - P.y) > FOOD_REACH_Y) continue;
    const d = Math.hypot(P.x - f.x, P.z - f.z);
    if (d < bd) { bd = d; best = f; }
  }
  if (!best || bd > FOOD_REACH_XZ) return null;
  if (best.steal) {
    const b = best.blanket;
    return {
      label: b.lookingAway ? 'E - snatch it (they\'re not looking)' : 'E - snatch it (THEY ARE LOOKING)',
      action: () => {
        // The crow, goose or another input may already have consumed it
        // since the last prompt scan. Never remove a different inventory item.
        if (!canReachFood(best, P) || !removeFood(best)) return;
        if (S.carried) spawnFood(S.carried, P.x - 0.4, P.z + 0.3);
        if (!b.lookingAway) {
          S.rangerAlert = 14;
          S.spottedFlash = 3;
          sfx.yelp();
          toast('SPOTTED. the ranger has been informed. rude.', 3);
        } else {
          toast('smooth. a true professional.', 2);
        }
        takeFood(best.type);
      },
    };
  }
  return {
    label: S.carried ? 'E - swap for ' + best.type : 'E - take ' + best.type,
    action: () => {
      if (!canReachFood(best, P) || !removeFood(best)) return;
      const old = S.carried;
      if (old) spawnFood(old, P.x + 0.4, P.z + 0.3);
      takeFood(best.type);
    },
  };
}

function takeFood(type) {
  S.carried = type;
  setCarriedVisual(type);
  sfx.chomp();
}
function removeFood(f) {
  const index = S.foods.indexOf(f);
  if (index < 0) return false;
  S.foods.splice(index, 1);
  S.scene.remove(f.mesh);
  return true;
}
// shared removal for other systems (geese eating off the bridge deck)
export function removeFoodItem(f) { removeFood(f); }

// The home park owns isGrass(): away from the Common/Garden its paths and
// lagoon tests are undefined, so remote concrete and even burrow tunnels
// previously passed as grass. Keep the rule local until a realm supplies its
// own explicit buryable ground mask (never silently treat all land as grass).
function canBuryHere() {
  const player = S.player;
  const P = player.pos;
  if (!S.carried || !player.grounded || player.climbing) return false;
  if (player.inHollow || player.inBurrow || player.inFenway || player.inGarden ||
      player.inCityHall || player.inEsplanade) return false;
  if (P.y - groundHeight(P.x, P.z) > FOOD_REACH_Y) return false;
  return isGrass(P.x, P.z);
}
export function buryAction() {
  if (!canBuryHere()) return null;
  return {
    label: 'F - bury the ' + S.carried,
    action: () => {
      // A prompt may be executed twice before the next render, or after
      // teleport / jump. Reject stale actions instead of minting free stash.
      if (!canBuryHere()) return;
      const type = S.carried;
      const value = BURY_VALUES[type] || 1;
      S.carried = null;
      setCarriedVisual(null);
      S.stash += value;
      sfx.dig();
      toast(value > 1
        ? 'buried. stash: ' + S.stash + ' (+' + value + ' - the good stuff). future you is eating well.'
        : 'buried. stash: ' + S.stash + '. future you says thanks.', 2.4);
      if (S.onStashChange) S.onStashChange();
    },
  };
}
