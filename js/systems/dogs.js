// SCURRY - dogs. Three off-leash menaces. They chase a ground-level squirrel,
// bark up a fuss, and on contact knock your food loose and send you scrambling.
// A well-timed BITE (click) boops the nose and sends them off, feelings hurt.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight } from '../world/world.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { dropCarried } from './food.js';
import { isOnGroundLow } from './player.js';

const COATS = [0x8a5a34, 0x3a3a3a, 0xc8b088, 0x6e4525];
const dogs = [];

function makeDog(coat) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: coat, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat);
  body.scale.set(1, 0.85, 1.55); body.position.y = 0.52; body.castShadow = true; g.add(body);
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
    leg.position.set(lx, 0.24, lz); g.add(leg); legs.push(leg);
  }
  g.userData = { head, tail, legs };
  return g;
}

const PATROLS = [
  [[20, 20], [70, 60], [110, 20], [60, -10]],
  [[150, -30], [185, 20], [150, 70], [120, 10]],
  [[-90, -40], [-150, -20], [-170, 30], [-110, 45]],
];
export function buildDogs(scene) {
  for (let i = 0; i < 3; i++) {
    const mesh = makeDog(COATS[i]);
    scene.add(mesh);
    dogs.push({
      mesh, wp: PATROLS[i], wi: 0, state: 'patrol', timer: 0,
      pos: new THREE.Vector3(PATROLS[i][0][0], 0, PATROLS[i][0][1]),
      speed: 2.2, phase: Math.random() * 9, barkCd: 0,
    });
  }
}

export function nearestDogDist() {
  const P = S.player.pos;
  let bd = 1e9;
  for (const d of dogs) bd = Math.min(bd, d.pos.distanceTo(P));
  return bd;
}

export function updateDogs(dt) {
  const P = S.player;
  const now = performance.now() / 1000;
  for (const d of dogs) {
    const dist = d.pos.distanceTo(P.pos);
    if (d.barkCd > 0) d.barkCd -= dt;
    if (d.timer > 0) d.timer -= dt;

    if (d.state === 'flee') {
      moveToward(d, d.fleeFrom, -1, 5.2, dt); // run directly away
      if (d.timer <= 0) d.state = 'patrol';
    } else if (d.state === 'proud') {
      // sits, tail wagging, extremely pleased with itself
      if (d.timer <= 0) d.state = 'patrol';
    } else if (dist < 13 && isOnGroundLow() && !P.inHollow) {
      if (d.state !== 'chase') {
        d.state = 'chase';
        if (d.barkCd <= 0) { sfx.bark(); d.barkCd = 6; }
        S.spottedFlash = Math.max(S.spottedFlash, 1.2);
      }
      moveToward(d, P.pos, 1, 5.4, dt);
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
      moveToward(d, { x: wp[0], z: wp[1] }, 1, 2.1, dt);
    }

    d.pos.y = groundHeight(d.pos.x, d.pos.z);
    d.mesh.position.copy(d.pos);
    // trot animation
    const moving = d.state === 'chase' || d.state === 'flee' || d.state === 'patrol';
    const f = d.state === 'patrol' ? 6 : 11;
    const sw = moving ? Math.sin(now * f + d.phase) * 0.45 : 0;
    d.mesh.userData.legs[0].rotation.x = sw; d.mesh.userData.legs[3].rotation.x = sw;
    d.mesh.userData.legs[1].rotation.x = -sw; d.mesh.userData.legs[2].rotation.x = -sw;
    d.mesh.userData.tail.rotation.z = Math.sin(now * (d.state === 'proud' ? 16 : 6) + d.phase) * 0.4;
    d.mesh.userData.head.position.y = 0.78 + Math.sin(now * 3 + d.phase) * 0.02;
  }
}

function moveToward(d, target, dirSign, speed, dt) {
  const dx = (target.x - d.pos.x) * dirSign, dz = (target.z - d.pos.z) * dirSign;
  const l = Math.hypot(dx, dz);
  if (l < 0.05) return;
  d.pos.x += dx / l * speed * dt;
  d.pos.z += dz / l * speed * dt;
  const targetYaw = Math.atan2(dx, dz);
  let dy = targetYaw - d.mesh.rotation.y;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  d.mesh.rotation.y += dy * Math.min(1, dt * 8);
}

// bite resolution: called by player via S.onBite chaining in main
export function biteDogs() {
  const P = S.player.pos;
  for (const d of dogs) {
    if (d.pos.distanceTo(P) < 1.5 && d.state !== 'flee') {
      d.state = 'flee'; d.timer = 3.5; d.fleeFrom = P.clone();
      sfx.yelp();
      toast('nose booped. the dog reconsiders everything.', 2.2);
      return true;
    }
  }
  return false;
}
