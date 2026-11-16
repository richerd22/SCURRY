// SCURRY - the ranger. Net, boots, and a deep personal commitment to the rules.
// Patrols the paths. Chases a ground squirrel who gets close, or one who was
// SPOTTED stealing. Bite his ankle to end the chase. If he nets you: fade out,
// wake up on the bandstand roof, stash raided by 25%. Relocated, never harmed.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight } from '../world/world.js';
import { makeHuman } from './humans.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { isOnGroundLow } from './player.js';

let ranger;
const PATROL = [[-30, -18], [60, -18], [112, -18], [160, 20], [140, 42], [112, 12], [60, 12], [10, 30], [-20, 40]];

export function buildRanger(scene) {
  const mesh = makeHuman(1.04);
  // ranger uniform: recolor torso green + add a hat and net
  const p = mesh.userData.parts;
  p.torso.material = new THREE.MeshStandardMaterial({ color: 0x39543c, roughness: 0.95 });
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a5a38, roughness: 1 }));
  hat.position.y = 1.82; mesh.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), hat.material);
  brim.position.y = 1.77; mesh.add(brim);
  // the net: pole + hoop + mesh cone, carried in the right hand
  const net = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a6a3c }));
  pole.rotation.z = 0.5; net.add(pole);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 16),
    new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.6, roughness: 0.4 }));
  hoop.position.set(0.55, 0.72, 0); net.add(hoop);
  const bag = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  bag.rotation.x = Math.PI; bag.position.set(0.55, 0.35, 0); net.add(bag);
  net.position.set(0.42, 0.9, 0.15);
  net.rotation.z = -0.4;
  mesh.add(net);
  scene.add(mesh);
  ranger = {
    mesh, net, wi: 0, state: 'patrol', stumble: 0, giveUp: 0,
    pos: new THREE.Vector3(PATROL[0][0], 0, PATROL[0][1]), phase: 1,
  };
  S.ranger = ranger;
}

export function rangerDist() {
  return ranger ? ranger.pos.distanceTo(S.player.pos) : 1e9;
}

export function updateRanger(dt) {
  if (!ranger) return;
  const P = S.player;
  const now = performance.now() / 1000;
  const dist = ranger.pos.distanceTo(P.pos);
  if (S.rangerAlert > 0) S.rangerAlert -= dt;
  if (ranger.stumble > 0) ranger.stumble -= dt;

  const playerCatchable = isOnGroundLow() && !P.inHollow && !P.climbing;
  const wantChase = ranger.stumble <= 0 &&
    ((S.rangerAlert > 0 && dist < 30) || (dist < 6.5)) && playerCatchable;

  if (wantChase) {
    if (ranger.state !== 'chase') { ranger.state = 'chase'; ranger.giveUp = 0; sfx.yelp(); }
    moveToward(P.pos, 5.7, dt);
    if (dist < 1.15) return netCatch();
  } else if (ranger.state === 'chase') {
    // losing the trail: squirrel went up a tree or got far away
    ranger.giveUp += dt;
    if (ranger.giveUp > 2.5 || dist > 34) {
      ranger.state = 'patrol';
      if (S.rangerAlert > 3) S.rangerAlert = 3;
      toast('you lost him. the trees remember their own.', 2.4);
    } else {
      moveToward(P.pos, 5.2, dt);
    }
  } else if (ranger.stumble > 0) {
    // hopping on one foot, dignity gone
    ranger.mesh.position.y = ranger.pos.y + Math.abs(Math.sin(now * 10)) * 0.08;
  } else {
    ranger.state = 'patrol';
    const wp = PATROL[ranger.wi];
    if (Math.hypot(ranger.pos.x - wp[0], ranger.pos.z - wp[1]) < 2) ranger.wi = (ranger.wi + 1) % PATROL.length;
    moveToward({ x: wp[0], z: wp[1] }, 1.7, dt);
  }

  ranger.pos.y = groundHeight(ranger.pos.x, ranger.pos.z);
  if (ranger.stumble <= 0) ranger.mesh.position.copy(ranger.pos);
  else ranger.mesh.position.set(ranger.pos.x, ranger.mesh.position.y, ranger.pos.z);
  const speedF = ranger.state === 'chase' ? 10 : 5.5;
  const sw = Math.sin(now * speedF + ranger.phase) * (ranger.state === 'patrol' ? 0.3 : 0.55);
  const p = ranger.mesh.userData.parts;
  p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
  p.armL.rotation.x = -sw * 0.6;
  ranger.net.rotation.z = -0.4 + (ranger.state === 'chase' ? Math.sin(now * 10) * 0.15 - 0.3 : 0);
}

function moveToward(target, speed, dt) {
  const dx = target.x - ranger.pos.x, dz = target.z - ranger.pos.z;
  const l = Math.hypot(dx, dz);
  if (l < 0.05) return;
  ranger.pos.x += dx / l * speed * dt;
  ranger.pos.z += dz / l * speed * dt;
  const targetYaw = Math.atan2(dx, dz);
  let dy = targetYaw - ranger.mesh.rotation.y;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  ranger.mesh.rotation.y += dy * Math.min(1, dt * 7);
}

function netCatch() {
  const P = S.player;
  sfx.caught();
  const lost = Math.floor(S.stash * 0.25);
  S.stash -= lost;
  S.rangerAlert = 0;
  ranger.state = 'patrol';
  if (S.onStashChange) S.onStashChange();
  if (S.fadeCatch) S.fadeCatch(lost); // main.js does the fade + teleport
}

export function biteRanger() {
  const P = S.player.pos;
  if (ranger && ranger.pos.distanceTo(P) < 1.6 && ranger.stumble <= 0) {
    ranger.stumble = 3.2;
    ranger.state = 'patrol';
    S.rangerAlert = 0;
    sfx.yelp();
    toast('ANKLE BITTEN. the ranger hops. freedom.', 2.6);
    return true;
  }
  return false;
}
