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
};
const geoCache = new THREE.SphereGeometry(1, 8, 6);

function makeFoodMesh(type) {
  const st = FOOD_STYLE[type];
  const m = new THREE.Mesh(geoCache, new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.9 }));
  m.scale.set(st.s, st.s * 0.75, st.s * 1.25);
  m.castShadow = true;
  if (type === 'acorn') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(st.s * 0.95, 8, 5),
      new THREE.MeshStandardMaterial({ color: 0x54331a, roughness: 1 }));
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
  const item = { type, mesh, x, z, steal: !!opts.steal, blanket: opts.blanket || null, born: performance.now() };
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
  for (const [type, x, z] of AMBIENT) spawnFood(type, x, z);
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
  // gentle bob/glint on ground food + pickup checks handled by interact system in main
  const now = performance.now() / 1000;
  for (const f of S.foods) {
    f.mesh.position.y = (f.steal ? f.mesh.position.y : groundHeight(f.x, f.z) + 0.05 + Math.sin(now * 2 + f.x) * 0.008);
    f.mesh.rotation.y += dt * 0.7;
  }
  // ambient respawn keeps the park stocked
  respawnTimer -= dt;
  if (respawnTimer <= 0) {
    respawnTimer = 9;
    if (S.foods.filter(f => !f.steal).length < 20) {
      const [type, x, z] = AMBIENT[(Math.random() * AMBIENT.length) | 0];
      spawnFood(type, x + (Math.random() - 0.5) * 6, z + (Math.random() - 0.5) * 6);
    }
  }
  for (const it of S.interactables) if (it.tick) it.tick(dt);
}

// pickup / steal / bury decisions, called from main's interaction scan
export function nearestFoodAction() {
  const P = S.player.pos;
  let best = null, bd = 1e9;
  for (const f of S.foods) {
    const d = Math.hypot(P.x - f.x, P.z - f.z);
    if (d < bd) { bd = d; best = f; }
  }
  if (!best || bd > 1.15) return null;
  if (best.steal) {
    const b = best.blanket;
    return {
      label: b.lookingAway ? 'E - snatch it (they\'re not looking)' : 'E - snatch it (THEY ARE LOOKING)',
      action: () => {
        removeFood(best);
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
      const old = S.carried;
      removeFood(best);
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
  S.scene.remove(f.mesh);
  S.foods.splice(S.foods.indexOf(f), 1);
}

export function buryAction() {
  const P = S.player.pos;
  if (!S.carried) return null;
  if (S.player.climbing || !S.player.grounded) return null;
  if (!isGrass(P.x, P.z)) return null;
  return {
    label: 'F - bury the ' + S.carried,
    action: () => {
      S.carried = null;
      setCarriedVisual(null);
      S.stash++;
      sfx.dig();
      toast('buried. stash: ' + S.stash + '. future you says thanks.', 2.4);
      if (S.onStashChange) S.onStashChange();
    },
  };
}
