// SCURRY - the squirrel body. Pointer-lock first person at 25cm eye height.
// WASD + mouse, Shift scurry, Space big jump, strong air control, NO fall damage.
// Push into a trunk to climb it; canopy discs are walkable; leap tree to tree.

import * as THREE from 'three';
import { S } from '../state.js';
import { visibleGroundHeight, inWater } from '../world/world.js';
import { walkSurface, resolveHorizontal, createSurfaceIndex, createObstacleIndex } from './collision.js';
import { advanceJumpIntent, resetJumpIntent } from './jump.js';
import { mayAttachToTrunk } from './climb-gate.js';
import { sfx } from './audio.js';

const EYE = 0.25;
const RADIUS = 0.22;
const keys = {};
// Jump is a fresh press (never repeated on landing), with brief grace at edges.
const jumpIntent = { held: false, buffer: 0, coyote: 0 };
const surfaceIndex = createSurfaceIndex(S.platforms, S.platformBoxes, S.platformSegments);
const obstacleIndex = createObstacleIndex(S.solids, S.solidBoxes, S.walls, RADIUS);
let paws, belly, bellyMat, hindMat, pawL, pawR, carriedMesh, carriedVisual;
let tailGroup, tailMat, tailTipMat;
let runPhase = 0;

// Every pause, app switch, and new session discards held keys and queued
// jumps. A missed keyup after Escape must never cause ghost movement.
export function clearPlayerInput() {
  for (const code in keys) keys[code] = false;
  resetJumpIntent(jumpIntent);
  S.player.moving = false;
  S.player.sprinting = false;
}

export function initPlayer(scene, camera) {
  const P = S.player;
  P.pos = new THREE.Vector3(24, 0, 30);
  P.pos.y = visibleGroundHeight(P.pos.x, P.pos.z);
  P.grounded = true;
  P.vel = new THREE.Vector3();
  P.yaw = -2.2; P.pitch = 0;
  buildPawRig(camera);
  document.addEventListener('keydown', (e) => {
    if (S.started && !S.paused) keys[e.code] = true;
  });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', clearPlayerInput);
  window.addEventListener('pagehide', clearPlayerInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearPlayerInput();
  });
  // Pointer lock is preferred, but desktop browsers may deny it. In that
  // case drag on the game canvas to look and click to bite, no dead camera.
  let lookDrag = null;
  const lookBy = (dx, dy, sensitivity) => {
    P.yaw -= dx * sensitivity;
    P.pitch -= dy * sensitivity;
    P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch));
  };
  document.addEventListener('mousemove', (e) => {
    if (S.paused || !S.started || S.isTouch) return;
    const locked = document.pointerLockElement === document.body ||
      document.pointerLockElement === S.renderer.domElement;
    if (locked) { lookBy(e.movementX, e.movementY, 0.0021); return; }
    if (!lookDrag || !(e.buttons & 1)) return;
    const dx = e.clientX - lookDrag.x, dy = e.clientY - lookDrag.y;
    lookDrag.x = e.clientX; lookDrag.y = e.clientY;
    if (Math.hypot(e.clientX - lookDrag.startX, e.clientY - lookDrag.startY) > 5)
      lookDrag.moved = true;
    if (lookDrag.moved) lookBy(dx, dy, 0.004);
  });
  document.addEventListener('mousedown', (e) => {
    if (!S.started || S.paused || S.isTouch || e.button !== 0) return;
    // The canvas is the only bite/aim surface. Map controls and waypoint
    // buttons must not trigger a bite in unlocked mouse-drag mode.
    if (e.target !== S.renderer.domElement) return;
    const locked = document.pointerLockElement === document.body ||
      document.pointerLockElement === S.renderer.domElement;
    if (locked) { tryBite(); return; }
    lookDrag = { x:e.clientX, y:e.clientY,
      startX:e.clientX, startY:e.clientY, moved:false };
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0 || !lookDrag) return;
    if (!lookDrag.moved && S.started && !S.paused) tryBite();
    lookDrag = null;
  });
  const endDrag = () => { lookDrag = null; };
  window.addEventListener('blur', endDrag);
  window.addEventListener('pagehide', endDrag);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) endDrag();
  });
}

// Paw rig v1: Richard's playtest verdict on v0 was "horrifying - giant feet".
// v0.1 shrank the paws, parked them at the bottom edge and faded them out
// when idle. v1 keeps that discipline and fixes the anatomy, which was the
// real problem: the v0 paw was an elongated oval with round toe blobs on
// the side FACING the camera, floating with no leg - that is a human foot.
// A squirrel forepaw is small (~4cm), barely longer than wide, its thin
// fingers point AWAY from the body (the way the squirrel faces), and a
// short foreleg runs from the paw back and down out of frame to the chest.
// Belly/chest and a tail curl return, but flat, low, and strictly gated on
// looking down - they never sit in frame during normal play.
let pawFadeL = 0, pawFadeR = 0, bodyFade = 0, tailFade = 0;
function buildPawRig(camera) {
  paws = new THREE.Group();
  function makePaw(side) {
    // per-paw materials so left/right fade independently (v0.1 pattern)
    const fur = new THREE.MeshStandardMaterial({ color: 0x7d6248, roughness: 1, transparent: true, opacity: 0 });
    const furDark = new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1, transparent: true, opacity: 0 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x2e241a, roughness: 0.6, transparent: true, opacity: 0 });
    const g = new THREE.Group();
    // foreleg: thin, angles back toward the body (local +z) and down out
    // of frame - the paw is attached to something now, not floating
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.0135, 0.09, 7), fur);
    leg.position.set(0, 0.02, 0.05);
    leg.rotation.x = 1.15;
    g.add(leg);
    // paw pad: small and compact, NOT a foot shape
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.0205, 10, 8), fur);
    pad.scale.set(0.95, 0.58, 1.12);
    g.add(pad);
    // four thin fingers at the front tip (-z, away from the viewer), splayed
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * 0.0095;
      const inset = Math.abs(i - 1.5) * 0.0015;
      const finger = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 6, 5), furDark);
      finger.scale.set(1, 0.72, 2.6);
      finger.position.set(off, -0.004, -0.026 - inset);
      finger.rotation.y = off * 1.4;
      g.add(finger);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.0016, 0.007, 5), clawMat);
      claw.rotation.x = -Math.PI / 2 - 0.35;
      claw.position.set(off * 1.15, -0.006, -0.039 - inset);
      g.add(claw);
    }
    // thumb nub on the inner side
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 6, 5), furDark);
    thumb.scale.set(1, 0.7, 1.9);
    thumb.position.set(-side * 0.017, -0.003, -0.012);
    g.add(thumb);
    g.rotation.x = -0.35; // toes tip down-forward, like a planted forepaw
    g.userData.mats = [fur, furDark, clawMat];
    paws.add(g);
    return g;
  }
  pawL = makePaw(-1);
  pawR = makePaw(1);
  pawL.position.set(-0.062, -0.235, -0.29);
  pawR.position.set(0.062, -0.235, -0.29);
  // carried food rides just in front of the right paw, small; animatePaws
  // keeps it glued to wherever the right paw currently is
  carriedMesh = new THREE.Group();
  carriedMesh.position.set(0.062, -0.2, -0.32);
  carriedMesh.visible = false;
  // Allocate this small carried-food visual once. Pickup/swap only recolors
  // it instead of creating a new geometry and GPU material every time.
  carriedVisual = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9, transparent: true, opacity: 0 }));
  carriedVisual.scale.set(1, 0.8, 1.2);
  carriedMesh.add(carriedVisual);
  paws.add(carriedMesh);

  // belly + chest: flat, low, far back - looking down reads as a body
  // curving away under you, not the v0 beach ball. Hind feet flank the
  // belly: a hind foot IS long and narrow, and planted either side of the
  // belly it sells "quadruped seen from above". All pitch-gated (below).
  bellyMat = new THREE.MeshStandardMaterial({ color: 0xdcc9a9, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  belly = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), bellyMat);
  belly.scale.set(1.05, 0.6, 1.3);
  belly.position.set(0, -0.27, -0.04);
  belly.renderOrder = 5;
  paws.add(belly);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), bellyMat);
  chest.scale.set(1.0, 0.62, 1.0);
  chest.position.set(0, -0.215, -0.155);
  chest.renderOrder = 5;
  paws.add(chest);
  hindMat = new THREE.MeshStandardMaterial({ color: 0x6e563d, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  function makeHindFoot(side) {
    const g = new THREE.Group();
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), hindMat);
    foot.scale.set(0.78, 0.42, 2.4);
    g.add(foot);
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.011;
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 6, 5), hindMat);
      toe.scale.set(1, 0.7, 2.4);
      toe.position.set(off, -0.004, -0.052 - Math.abs(i - 1) * 0.002);
      g.add(toe);
    }
    g.position.set(0.108 * side, -0.245, -0.095);
    g.rotation.y = -0.38 * side; // toes splay outward, planted
    g.traverse((o) => { o.renderOrder = 5; });
    paws.add(g);
    return g;
  }
  makeHindFoot(-1);
  makeHindFoot(1);

  // tail: a bushy arc curling into the bottom of frame from behind the
  // belly - where a squirrel's tail actually shows when you look sharply
  // down. Camera-attached, so (like the belly) it is pitch-gated by
  // opacity, and animatePaws gives it a slow flick. Fat in the middle.
  tailMat = new THREE.MeshStandardMaterial({ color: 0x84684c, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  tailTipMat = new THREE.MeshStandardMaterial({ color: 0xcbb59a, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  tailGroup = new THREE.Group();
  const tailPts = [
    [0.0, -0.345, 0.05, 0.020], [0.032, -0.335, -0.05, 0.031], [0.078, -0.305, -0.13, 0.039],
    [0.118, -0.255, -0.185, 0.041], [0.138, -0.195, -0.215, 0.035], [0.132, -0.14, -0.225, 0.025],
  ];
  tailPts.forEach(([x, y, z, r], i) => {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r * 0.82, 9, 7), i >= 4 ? tailTipMat : tailMat);
    seg.scale.set(1, 1, 1.3);
    seg.position.set(x, y, z);
    seg.renderOrder = 4;
    tailGroup.add(seg);
  });
  tailGroup.position.y = -0.035; // hug the bottom rim of the frame
  paws.add(tailGroup);
  camera.add(paws);
}

export function setCarriedVisual(type) {
  if (!type) { carriedMesh.visible = false; return; }
  const mats = { acorn: 0x7a4a22, pretzel: 0xa06a28, sandwich: 0xe3d3a2,
    peanut: 0xc8a86a, croissant: 0xd9a860, popcorn: 0xf5edd6 };
  carriedVisual.material.color.setHex(mats[type] || 0x999999);
  carriedMesh.visible = true;
}

function tryBite() {
  const P = S.player;
  if (!S.started || S.paused || P.biteCooldown > 0 || P.begging > 0) return;
  P.biteCooldown = 1.4;
  P.biteAnim = 0.22;
  sfx.boop();
  // resolve hits in main via S.onBite callback (dogs/ranger check range there)
  if (S.onBite) S.onBite();
}

// touch plumbing: the BITE button calls pressBite; JUMP/SPRINT buttons
// write into the same key table the keyboard uses.
export function pressBite() { tryBite(); }
export function setTouchKey(code, down) {
  if (down && (!S.started || S.paused)) return;
  keys[code] = !!down;
}

// The squirrel's position is at its feet, never at its camera or torso.
const PHYSICS_DT = 1 / 90;  // ~7cm max horizontal stride at full sprint
const STEP_UP = 1.3;       // preserve the original scramble onto stage steps
const SNAP_DOWN = 0.25;    // regular lawn, kerbs and low furniture
const BRANCH_SNAP_DOWN = 0.9; // canopy links can intentionally descend ~0.75m

function baseHeight(x, z) {
  const P = S.player;
  if (P.inHollow || P.inBurrow) return 0;
  if (P.inFenway && S.realmGround.fenway) return S.realmGround.fenway(x, z);
  if (P.inGarden && S.realmGround.garden) return S.realmGround.garden(x, z);
  if (P.inCityHall && S.realmGround.cityhall) return S.realmGround.cityhall(x, z);
  if (P.inEsplanade && S.realmGround.esplanade) return S.realmGround.esplanade(x, z);
  return visibleGroundHeight(x, z);
}

function surfaceAt(x, z, refY, stepTol = 0.55) {
  return walkSurface(x, z, refY, stepTol, baseHeight(x, z),
    S.platforms, S.platformBoxes, S.platformSegments, surfaceIndex);
}

function collideWalls(pos) {
  const P = S.player;
  // The home park's outer clamp is NOT applied to separate destination maps.
  if (!P.inHollow && !P.inBurrow && !P.inFenway && !P.inGarden && !P.inCityHall && !P.inEsplanade) {
    resolveHorizontal(pos, S.solids, S.solidBoxes, S.walls, RADIUS, P.climbing, obstacleIndex);
    pos.x = Math.max(-208, Math.min(208, pos.x));
    pos.z = Math.max(-118, Math.min(118, pos.z));
  } else if (P.inEsplanade) {
    // Trees and the shell in the river realm are also in the registries.
    resolveHorizontal(pos, S.solids, S.solidBoxes, S.walls, RADIUS, P.climbing, obstacleIndex);
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

function moveSubstep(dt, wx, wz, wl, mag, speed) {
  const P = S.player, oldY = P.pos.y, wasGrounded = P.grounded;
  if (wasGrounded) {
    P.vel.x = wx / wl * speed * (P.moving ? 1 : 0);
    P.vel.z = wz / wl * speed * (P.moving ? 1 : 0);
  } else {
    const accel = 26;
    P.vel.x += wx / wl * accel * dt * mag;
    P.vel.z += wz / wl * accel * dt * mag;
    const hs = Math.hypot(P.vel.x, P.vel.z);
    if (hs > 8.5) { P.vel.x *= 8.5 / hs; P.vel.z *= 8.5 / hs; }
    P.vel.y -= 15.5 * dt;
  }
  const wishX = P.pos.x + P.vel.x * dt, wishZ = P.pos.z + P.vel.z * dt;
  P.pos.x = wishX; P.pos.z = wishZ;
  if (!wasGrounded) P.pos.y += P.vel.y * dt;

  // Ground first, then walls: standing ON a bench/roof must not trigger its
  // lower wall collider. Descending uses previous feet Y (a swept landing).
  let support = surfaceAt(P.pos.x, P.pos.z, oldY, wasGrounded ? STEP_UP : 0.08);
  const snapDown = oldY - baseHeight(P.pos.x, P.pos.z) > 2 ? BRANCH_SNAP_DOWN : SNAP_DOWN;
  if (wasGrounded) {
    if (support >= oldY - snapDown && support <= oldY + STEP_UP) {
      P.pos.y = support; P.vel.y = 0;
    } else {
      P.grounded = false;
      P.vel.y = -15.5 * dt;
      P.pos.y = oldY + P.vel.y * dt;
    }
  } else if (P.vel.y <= 0 && oldY + 0.015 >= support && P.pos.y <= support) {
    if (P.vel.y < -9) sfx.splash();
    P.pos.y = support; P.vel.y = 0; P.grounded = true;
  }
  collideWalls(P.pos);
  // A collision push may move the feet OFF the surface they first touched.
  if (P.grounded) {
    support = surfaceAt(P.pos.x, P.pos.z, P.pos.y, STEP_UP);
    if (support >= P.pos.y - snapDown && support <= P.pos.y + STEP_UP) {
      P.pos.y = support; P.vel.y = 0;
    } else P.grounded = false;
  } else {
    const floor = baseHeight(P.pos.x, P.pos.z);
    if (P.pos.y < floor) { P.pos.y = floor; P.vel.y = 0; P.grounded = true; }
  }
  // Stop inertial air acceleration into an impassable wall.
  if (!P.grounded) {
    if (Math.abs(P.pos.x - wishX) > 0.005) P.vel.x = 0;
    if (Math.abs(P.pos.z - wishZ) > 0.005) P.vel.z = 0;
  }
}

export function updatePlayer(dt, camera) {
  const P = S.player;
  if (P.biteCooldown > 0) P.biteCooldown -= dt;
  if (P.biteAnim > 0) P.biteAnim -= dt;
  if (P.scramble > 0) P.scramble -= dt;
  if (P.climbRegrab > 0) P.climbRegrab = Math.max(0, P.climbRegrab - dt);
  const wantsJump = advanceJumpIntent(jumpIntent, !!keys.Space, P.grounded, !!P.climbing, dt);
  if (P.begging > 0) {
    P.begging -= dt; syncPlayerCamera(camera); animatePaws(dt, camera); return;
  }
  let fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  let str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (S.touch) { fwd += -S.touch.y; str += S.touch.x; }
  fwd = Math.max(-1, Math.min(1, fwd));
  str = Math.max(-1, Math.min(1, str));
  const sprint = keys.ShiftLeft || keys.ShiftRight;
  P.sprinting = !!sprint && fwd > 0.3;
  const water = inWater(P.pos.x, P.pos.z) && P.pos.y < 0.3;

  if (P.climbing) {
    updateClimb(dt, fwd, str, wantsJump);
    P.moving = Math.abs(fwd) + Math.abs(str) > 0.12;
  } else {
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
    const wx = -sin * fwd + cos * str;
    const wz = -cos * fwd - sin * str;
    const wl = Math.hypot(wx, wz) || 1, mag = Math.min(1, Math.hypot(fwd, str));
    const speed = (P.sprinting ? 6.6 : 3.3) * (water ? 0.45 : 1) * mag;
    P.moving = mag > 0.12;

    if (wantsJump) {
      P.vel.y = 6.1; P.grounded = false;
      P.climbRegrab = 0.30; // launching beside a trunk must not cancel jump
      sfx.squeak();
    }
    if (P.moving) {
      const t = nearestTrunk(P.pos);
      if (t) {
        const toward = ((t.x - P.pos.x) * wx + (t.z - P.pos.z) * wz) / wl;
        if (mayAttachToTrunk(P, t, toward)) {
          P.climbing = t;
          P.climbAngle = Math.atan2(P.pos.x - t.x, P.pos.z - t.z);
          P.vel.set(0, 0, 0);
        }
      }
    }
    if (P.climbing) updateClimb(dt, fwd, str, false);
    else {
      const steps = Math.max(1, Math.ceil(dt / PHYSICS_DT));
      const subDt = dt / steps;
      for (let i = 0; i < steps; i++) moveSubstep(subDt, wx, wz, wl, mag, speed);
    }
  }
  if (P.grounded && P.moving) runPhase += dt * (P.sprinting ? 16 : 10);
  syncPlayerCamera(camera);
  animatePaws(dt, camera);
}

// Re-sync after destination clamps/portals: these run after player physics.
export function syncPlayerCamera(camera) {
  const P = S.player;
  const bob = P.grounded && P.moving ? Math.sin(runPhase * 2) * 0.02 : 0;
  const eye = S.debugShot && Number.isFinite(S.debugEye) ? S.debugEye : EYE;
  camera.position.set(P.pos.x, P.pos.y + eye + bob, P.pos.z);
  // A human-height *inspection camera* should not display squirrel paws
  // suspended at 1.7m. Normal gameplay and squirrel-height shots are unchanged.
  paws.visible = !(S.debugShot && eye >= 1);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = P.yaw + (P.scramble > 0 ? Math.sin(P.scramble * 40) * 0.03 : 0);
  camera.rotation.x = P.pitch;
  camera.rotation.z = P.grounded && P.moving ? Math.sin(runPhase) * 0.006 : 0;
}

function updateClimb(dt, fwd, str, wantsJump) {
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
  if (wantsJump) {
    // leap off
    P.climbing = null;
    P.climbRegrab = 0.38; // intentional dismount, no instant re-attachment
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
  // Paw positions hug the bottom edge of the frame and tuck close to the
  // chest (x +-0.062, not the old wide +-0.11 stance). Rotation tips the
  // fingers: down-forward when planted/running, up when begging.
  let tL = 0, tR = 0; // target opacities: invisible unless doing something
  if (P.begging > 0) {
    // both paws up together at the chest, fingers tipped up, trembling
    pawL.position.set(-0.03, -0.152 + Math.sin(now * 30) * 0.003, -0.26);
    pawR.position.set(0.03, -0.152 + Math.cos(now * 30) * 0.003, -0.26);
    pawL.rotation.x = 1.05; pawR.rotation.x = 1.05;
    tL = 1; tR = 1;
  } else if (P.climbing) {
    // alternating reaches up the trunk
    const a = Math.sin(now * 9) * 0.04;
    pawL.position.set(-0.075, -0.188 + a, -0.285);
    pawR.position.set(0.075, -0.188 - a, -0.285);
    pawL.rotation.x = -0.1; pawR.rotation.x = -0.1;
    tL = 0.95; tR = 0.95;
  } else if (P.biteAnim > 0) {
    const k = Math.sin((0.22 - P.biteAnim) / 0.22 * Math.PI);
    pawR.position.set(0.06, -0.2, -0.29 - k * 0.13);
    pawR.rotation.x = -0.55;
    pawL.position.set(-0.062, -0.218, -0.29);
    pawL.rotation.x = -0.35;
    tL = 0.7; tR = 1;
  } else if (P.grounded && P.moving) {
    // quadruped scurry: paws pump in and out of the bottom rim in
    // alternation, dipping forward as they reach
    const s = Math.sin(runPhase * 2);
    pawL.position.set(-0.062, -0.214 + Math.abs(s) * 0.015, -0.29 - s * 0.024);
    pawR.position.set(0.062, -0.214 + Math.abs(-s) * 0.015, -0.29 + s * 0.024);
    pawL.rotation.x = -0.35 - s * 0.22;
    pawR.rotation.x = -0.35 + s * 0.22;
    tL = 0.85; tR = 0.85;
  } else if (!P.grounded) {
    // mid-leap: paws tucked just into the bottom of frame
    pawL.position.set(-0.066, -0.222, -0.29);
    pawR.position.set(0.066, -0.222, -0.29);
    pawL.rotation.x = -0.2; pawR.rotation.x = -0.2;
    tL = 0.55; tR = 0.55;
  } else {
    // idle: tucked under the chest, sunk to the rim, faded out entirely
    pawL.position.set(-0.062, -0.238 + Math.sin(now * 2) * 0.002, -0.29);
    pawR.position.set(0.062, -0.238 + Math.cos(now * 2) * 0.002, -0.29);
    pawL.rotation.x = -0.35; pawR.rotation.x = -0.35;
  }
  // carrying food keeps the right paw (and the food) in frame
  if (S.carried) tR = Math.max(tR, 0.9);
  const k = Math.min(1, dt * 10);
  pawFadeL += (tL - pawFadeL) * k;
  pawFadeR += (tR - pawFadeR) * k;
  for (const m of pawL.userData.mats) m.opacity = pawFadeL;
  for (const m of pawR.userData.mats) m.opacity = pawFadeR;
  pawL.visible = pawFadeL > 0.02;
  pawR.visible = pawFadeR > 0.02;
  if (carriedMesh.visible && carriedMesh.children.length) {
    carriedMesh.children[0].material.opacity = pawFadeR;
    carriedMesh.position.set(pawR.position.x, pawR.position.y + 0.012, pawR.position.z - 0.03);
  }
  // belly/chest + hind feet fade in as you look down (pitch < -0.62 rad),
  // the tail curl only on a sharp look down (pitch < -1.02 rad), with a
  // slow idle flick so it feels alive when it does appear
  const down = -P.pitch;
  const bellyT = Math.max(0, Math.min(1, (down - 0.62) / 0.3)) * 0.96;
  const tailT = Math.max(0, Math.min(1, (down - 1.02) / 0.28)) * 0.88;
  const kb = Math.min(1, dt * 7);
  bodyFade += (bellyT - bodyFade) * kb;
  tailFade += (tailT - tailFade) * kb;
  bellyMat.opacity = bodyFade;
  hindMat.opacity = bodyFade;
  tailMat.opacity = tailFade;
  tailTipMat.opacity = tailFade;
  belly.visible = bodyFade > 0.02;
  tailGroup.visible = tailFade > 0.02;
  tailGroup.rotation.z = Math.sin(now * 1.7) * 0.05 + Math.sin(now * 7.3) * 0.012;
  tailGroup.rotation.x = Math.sin(now * 2.3) * 0.03;
}

export function isOnGroundLow() {
  const P = S.player;
  return !P.climbing && P.pos.y - baseHeight(P.pos.x, P.pos.z) < 1.1;
}
