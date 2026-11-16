// SCURRY - the squirrel body. Pointer-lock first person at 25cm eye height.
// WASD + mouse, Shift scurry, Space big jump, strong air control, NO fall damage.
// Push into a trunk to climb it; canopy discs are walkable; leap tree to tree.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight, inWater } from '../world/world.js';
import { sfx } from './audio.js';

const EYE = 0.25;
const RADIUS = 0.22;
const keys = {};
let paws, belly, pawL, pawR, carriedMesh;
let runPhase = 0;

export function initPlayer(scene, camera) {
  const P = S.player;
  P.pos = new THREE.Vector3(24, 0, 30);
  P.pos.y = groundHeight(P.pos.x, P.pos.z);
  P.vel = new THREE.Vector3();
  P.yaw = -2.2; P.pitch = 0;
  buildPawRig(camera);
  document.addEventListener('keydown', (e) => { keys[e.code] = true; });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== document.body && document.pointerLockElement !== S.renderer.domElement) return;
    if (S.paused || !S.started) return;
    P.yaw -= e.movementX * 0.0021;
    P.pitch -= e.movementY * 0.0021;
    P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch));
  });
  document.addEventListener('mousedown', (e) => {
    if (!S.started || S.paused) return;
    if (e.button === 0) tryBite();
  });
}

function buildPawRig(camera) {
  paws = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x8a6a4e, roughness: 1 });
  const furLight = new THREE.MeshStandardMaterial({ color: 0xcbb59a, roughness: 1 });
  const pawGeo = new THREE.SphereGeometry(0.045, 8, 6);
  function makePaw(side) {
    const g = new THREE.Group();
    const main = new THREE.Mesh(pawGeo, fur);
    main.scale.set(1, 0.55, 1.5);
    g.add(main);
    for (let i = -1; i <= 1; i++) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), furLight);
      toe.position.set(i * 0.026, -0.012, 0.062);
      g.add(toe);
    }
    g.position.set(0.11 * side, -0.13, -0.3);
    paws.add(g);
    return g;
  }
  pawL = makePaw(-1);
  pawR = makePaw(1);
  // carried food rides in the right paw
  carriedMesh = new THREE.Group();
  carriedMesh.position.set(0.11, -0.1, -0.34);
  carriedMesh.visible = false;
  paws.add(carriedMesh);
  // belly patch: fades in when you look down
  belly = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9c6a8, roughness: 1, transparent: true, opacity: 0 }));
  belly.scale.set(1.1, 0.7, 1.3);
  belly.position.set(0, -0.24, -0.12);
  paws.add(belly);
  camera.add(paws);
}

export function setCarriedVisual(type) {
  while (carriedMesh.children.length) carriedMesh.remove(carriedMesh.children[0]);
  if (!type) { carriedMesh.visible = false; return; }
  const mats = { acorn: 0x7a4a22, pretzel: 0xa06a28, sandwich: 0xe3d3a2, peanut: 0xc8a86a };
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6),
    new THREE.MeshStandardMaterial({ color: mats[type] || 0x999999, roughness: 0.9 }));
  m.scale.set(1, 0.8, 1.2);
  carriedMesh.add(m);
  carriedMesh.visible = true;
}

function tryBite() {
  const P = S.player;
  if (P.biteCooldown > 0 || P.begging > 0) return;
  P.biteCooldown = 1.4;
  P.biteAnim = 0.22;
  sfx.boop();
  // resolve hits in main via S.onBite callback (dogs/ranger check range there)
  if (S.onBite) S.onBite();
}

// highest walkable surface at (x,z) that is at or below refY + stepTol
function surfaceAt(x, z, refY, stepTol = 0.55) {
  let best = groundHeight(x, z);
  for (const p of S.platforms) {
    if (Math.hypot(x - p.x, z - p.z) < p.r && p.y <= refY + stepTol && p.y > best) best = p.y;
  }
  for (const b of S.platformBoxes) {
    if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && b.y <= refY + stepTol && b.y > best) best = b.y;
  }
  return best;
}

function collideWalls(pos) {
  for (const s of S.solids) {
    const dx = pos.x - s.x, dz = pos.z - s.z;
    const d = Math.hypot(dx, dz), min = s.r + RADIUS;
    if (d < min && d > 0.0001) {
      // don't push out of a trunk we are climbing
      if (S.player.climbing && Math.abs(s.x - S.player.climbing.x) < 0.01 && Math.abs(s.z - S.player.climbing.z) < 0.01) continue;
      pos.x = s.x + dx / d * min;
      pos.z = s.z + dz / d * min;
    }
  }
  for (const b of S.solidBoxes) {
    if (pos.x > b.minX - RADIUS && pos.x < b.maxX + RADIUS && pos.z > b.minZ - RADIUS && pos.z < b.maxZ + RADIUS) {
      const dxl = pos.x - (b.minX - RADIUS), dxr = (b.maxX + RADIUS) - pos.x;
      const dzl = pos.z - (b.minZ - RADIUS), dzr = (b.maxZ + RADIUS) - pos.z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) pos.x = b.minX - RADIUS; else if (m === dxr) pos.x = b.maxX + RADIUS;
      else if (m === dzl) pos.z = b.minZ - RADIUS; else pos.z = b.maxZ + RADIUS;
    }
  }
  if (!S.player.inHollow) {
    pos.x = Math.max(-208, Math.min(208, pos.x));
    pos.z = Math.max(-118, Math.min(118, pos.z));
  }
}

function nearestTrunk(pos) {
  let best = null, bd = 1e9;
  for (const t of S.trees) {
    const d = Math.hypot(pos.x - t.x, pos.z - t.z);
    if (d < bd) { bd = d; best = t; }
  }
  return bd < 1.35 ? best : null;
}

export function updatePlayer(dt, camera) {
  const P = S.player;
  if (P.biteCooldown > 0) P.biteCooldown -= dt;
  if (P.biteAnim > 0) P.biteAnim -= dt;
  if (P.scramble > 0) P.scramble -= dt;
  if (P.begging > 0) { P.begging -= dt; animatePaws(dt, camera); return; }

  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sprint = keys.ShiftLeft || keys.ShiftRight;
  P.sprinting = !!sprint && fwd > 0;
  const inWaterNow = inWater(P.pos.x, P.pos.z) && P.pos.y < 0.3;

  if (P.climbing) {
    updateClimb(dt, fwd, str);
  } else {
    // wish direction in world space
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
    const wx = (-sin * fwd + cos * str);
    const wz = (-cos * fwd - sin * str);
    const wl = Math.hypot(wx, wz) || 1;
    const speed = (P.sprinting ? 6.6 : 3.3) * (inWaterNow ? 0.45 : 1);
    P.moving = (fwd !== 0 || str !== 0);

    if (P.grounded) {
      P.vel.x = wx / wl * speed * (P.moving ? 1 : 0);
      P.vel.z = wz / wl * speed * (P.moving ? 1 : 0);
      if (keys.Space) {
        P.vel.y = 6.1;                     // big squirrel jump
        P.grounded = false;
        sfx.squeak();
      }
      // start climbing: pushing toward a trunk
      if (P.moving) {
        const t = nearestTrunk(P.pos);
        if (t && P.pos.y < t.trunkTop - 0.5) {
          const toward = ((t.x - P.pos.x) * wx + (t.z - P.pos.z) * wz) / wl;
          if (toward > 0.45) {
            P.climbing = t;
            P.climbAngle = Math.atan2(P.pos.x - t.x, P.pos.z - t.z);
            P.vel.set(0, 0, 0);
          }
        }
      }
    } else {
      // air control: tail-steer hard toward wish dir, keep momentum
      const accel = 26;
      P.vel.x += wx / wl * accel * dt * (P.moving ? 1 : 0);
      P.vel.z += wz / wl * accel * dt * (P.moving ? 1 : 0);
      const hs = Math.hypot(P.vel.x, P.vel.z), maxH = 8.5;
      if (hs > maxH) { P.vel.x *= maxH / hs; P.vel.z *= maxH / hs; }
      P.vel.y -= 15.5 * dt;
      // grab a trunk mid-air too
      if (P.moving) {
        const t = nearestTrunk(P.pos);
        if (t && P.pos.y > t.gy + 0.3 && P.pos.y < t.trunkTop) {
          const toward = ((t.x - P.pos.x) * wx + (t.z - P.pos.z) * wz) / wl;
          if (toward > 0.3) {
            P.climbing = t;
            P.climbAngle = Math.atan2(P.pos.x - t.x, P.pos.z - t.z);
            P.vel.set(0, 0, 0);
          }
        }
      }
    }

    if (!P.climbing) {
      P.pos.x += P.vel.x * dt;
      P.pos.z += P.vel.z * dt;
      P.pos.y += P.vel.y * dt;
      const stepTol = P.grounded ? 1.3 : 0.55; // squirrels scramble up steps and stage edges
      const surf = surfaceAt(P.pos.x, P.pos.z, P.pos.y, stepTol);
      if (P.pos.y <= surf) {
        if (!P.grounded && P.vel.y < -9) sfx.splash(); // landing thump, never damage
        P.pos.y = surf;
        P.vel.y = 0;
        P.grounded = true;
      } else if (P.pos.y > surf + 0.05) {
        P.grounded = false;
      }
      collideWalls(P.pos);
      const surf2 = surfaceAt(P.pos.x, P.pos.z, P.pos.y, stepTol);
      if (P.grounded && surf2 > P.pos.y) P.pos.y = surf2;
    }
  }

  // camera
  const bob = P.grounded && P.moving ? Math.sin(runPhase * 2) * 0.02 : 0;
  camera.position.set(P.pos.x, P.pos.y + EYE + bob, P.pos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = P.yaw + (P.scramble > 0 ? Math.sin(P.scramble * 40) * 0.03 : 0);
  camera.rotation.x = P.pitch;
  camera.rotation.z = P.grounded && P.moving ? Math.sin(runPhase) * 0.006 : 0;
  if (P.grounded && P.moving) runPhase += dt * (P.sprinting ? 16 : 10);
  animatePaws(dt, camera);
}

function updateClimb(dt, fwd, str) {
  const P = S.player, t = P.climbing;
  const climbSpeed = 2.6;
  P.pos.y += fwd * climbSpeed * dt;
  if (str !== 0) {
    P.climbAngle += str * dt * 1.6 / Math.max(0.6, t.r + 0.3);
  }
  const rr = t.r + 0.3;
  P.pos.x = t.x + Math.sin(P.climbAngle) * rr;
  P.pos.z = t.z + Math.cos(P.climbAngle) * rr;
  P.yaw = P.climbAngle; // face the trunk (camera forward = (-sin yaw, -cos yaw))
  if (keys.Space) {
    // leap off
    P.climbing = null;
    P.vel.set(Math.sin(P.climbAngle) * 4.5, 5.2, Math.cos(P.climbAngle) * 4.5);
    P.grounded = false;
    return;
  }
  if (P.pos.y >= t.canopyY - 0.6) {
    // scramble onto the canopy platform
    P.pos.y = surfaceAt(P.pos.x, P.pos.z, P.pos.y, 1.6);
    P.climbing = null;
    P.grounded = true;
    P.vel.set(0, 0, 0);
  } else if (P.pos.y <= t.gy + 0.02) {
    P.pos.y = t.gy;
    P.climbing = null;
    P.grounded = true;
    P.vel.set(0, 0, 0);
  }
}

function animatePaws(dt, camera) {
  const P = S.player;
  const now = performance.now() / 1000;
  if (P.begging > 0) {
    // both paws up, center, trembling cutely
    pawL.position.set(-0.045, -0.07 + Math.sin(now * 30) * 0.004, -0.26);
    pawR.position.set(0.045, -0.07 + Math.cos(now * 30) * 0.004, -0.26);
  } else if (P.climbing) {
    const a = Math.sin(now * 9) * 0.05;
    pawL.position.set(-0.13, -0.1 + a, -0.3);
    pawR.position.set(0.13, -0.1 - a, -0.3);
  } else if (P.biteAnim > 0) {
    const k = Math.sin((0.22 - P.biteAnim) / 0.22 * Math.PI);
    pawR.position.set(0.09, -0.1, -0.3 - k * 0.17);
    pawL.position.set(-0.11, -0.13, -0.3);
  } else if (P.grounded && P.moving) {
    const s = Math.sin(runPhase * 2);
    pawL.position.set(-0.11, -0.14 + Math.abs(s) * 0.02, -0.3 - s * 0.03);
    pawR.position.set(0.11, -0.14 + Math.abs(-s) * 0.02, -0.3 + s * 0.03);
  } else {
    pawL.position.set(-0.11, -0.135 + Math.sin(now * 2) * 0.003, -0.3);
    pawR.position.set(0.11, -0.135 + Math.cos(now * 2) * 0.003, -0.3);
  }
  belly.material.opacity += (((P.pitch < -0.85) ? 0.95 : 0) - belly.material.opacity) * Math.min(1, dt * 8);
}

export function isOnGroundLow() {
  const P = S.player;
  return !P.climbing && P.pos.y - groundHeight(P.pos.x, P.pos.z) < 1.1;
}
