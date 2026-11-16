// SCURRY - the Hollow. Front door version: one great tree by the Frog Pond,
// a knot-hole at squirrel height, and inside - a carved room, a vault pile
// that grows with your stash, and an elder with park gossip. Another world
// is stacked here for later (canopy highways, burrows); tonight, the door.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight } from '../world/world.js';
import { sfx } from './audio.js';
import { setGossip, toast } from '../ui/hud.js';

const CENTER = new THREE.Vector3(1000, 0, 1000); // interior lives far off-map
let vaultPile, vaultCount = -1;
let elder, gossipTimer = 0;

const GOSSIP = [
  'ELDER: the pretzel man drops the day-olds by the third bench. every day. a saint.',
  'ELDER: dogs cannot climb. this is the whole of the law.',
  'ELDER: the ranger respects a squirrel who respects the stash. mostly.',
  'ELDER: bury on grass, never on the path. paths are for humans and trouble.',
  'ELDER: the red boxes on posts? gamewell boxes. old alarm bells. our kind pulled one in 1911. legend.',
  'ELDER: geese hold the garden bridge at dawn. we do not negotiate with geese. (yet.)',
  'ELDER: a hawk works the monument hill on clear days. watch the shadows, not the sky.',
  'ELDER: winter is coming. it is always coming. bury accordingly.',
  'ELDER: the swan boats sleep at the dock. the swans themselves answer to no one.',
  'ELDER: crows will trade shiny things. someday we will learn their prices.',
];

export function buildHollow(scene) {
  const g = new THREE.Group();
  // round room: inside of a trunk
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.4, 7, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1, side: THREE.BackSide }));
  wall.position.y = 3.5; g.add(wall);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6.4, 18),
    new THREE.MeshStandardMaterial({ color: 0x7d5a36, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(6, 18),
    new THREE.MeshStandardMaterial({ color: 0x54381f, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 7; g.add(ceil);
  // root ribs
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x5d3f24, roughness: 1 }));
    rib.position.set(Math.cos(a) * 5.7, 3.5, Math.sin(a) * 5.7);
    g.add(rib);
  }
  // warm light: knothole glow + a firefly lamp
  const warm = new THREE.PointLight(0xffb45e, 30, 16, 1.8);
  warm.position.set(0, 3.4, 0); g.add(warm);
  const lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb45e, emissiveIntensity: 2.4 }));
  lampBall.position.set(0, 3.4, 0); g.add(lampBall);
  // a rug (stolen picnic energy)
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.2, 14),
    new THREE.MeshStandardMaterial({ color: 0x8a3a3a, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = 0.02; g.add(rug);

  // the vault: a pile that grows with the stash
  vaultPile = new THREE.Group();
  vaultPile.position.set(-3.4, 0, -3.2);
  g.add(vaultPile);
  const vaultSign = makeSign('THE VAULT');
  vaultSign.position.set(-3.4, 1.7, -4.6); g.add(vaultSign);

  // the elder: a large, calm squirrel on a stump
  elder = makeSquirrelMesh(2.6, 0x9a8a7a);
  elder.position.set(2.6, 0.55, -2.4);
  elder.rotation.y = -0.7;
  g.add(elder);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1, 0.55, 10),
    new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1 }));
  stump.position.set(2.6, 0.27, -2.4); g.add(stump);
  const elderSign = makeSign('ELDER BRAMBLE');
  elderSign.position.set(2.6, 2.2, -3.6); g.add(elderSign);

  // exit knot-hole (glowing rim, south wall)
  const exitHole = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe9bb }));
  exitHole.position.set(0, 0.5, 5.94); exitHole.rotation.y = Math.PI;
  g.add(exitHole);
  g.position.copy(CENTER);
  scene.add(g);

  rebuildVault();
}

function makeSign(text) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 56;
  const c = cv.getContext('2d');
  c.fillStyle = '#4a3420'; c.fillRect(0, 0, 256, 56);
  c.fillStyle = '#f2e2b8'; c.font = 'bold 24px monospace'; c.textAlign = 'center';
  c.fillText(text, 128, 37);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.42), new THREE.MeshBasicMaterial({ map: tex }));
}

// a simple low-poly squirrel (elder + future NPCs)
export function makeSquirrelMesh(scale = 1, color = 0x8a6a4e) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  const light = new THREE.MeshStandardMaterial({ color: 0xd9c6a8, roughness: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), fur);
  body.scale.set(1, 1.05, 1.15); body.position.y = 0.24; body.castShadow = true; g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), light);
  belly.position.set(0, 0.22, 0.1); belly.scale.set(0.8, 1, 0.7); g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 7), fur);
  head.position.set(0, 0.52, 0.06); head.castShadow = true; g.add(head);
  for (const sx of [-0.07, 0.07]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 5), fur);
    ear.position.set(sx, 0.64, 0.04); g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0x14100c }));
    eye.position.set(sx * 1.4, 0.54, 0.16); g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), fur);
  tail.scale.set(0.75, 1.5, 0.75); tail.position.set(0, 0.42, -0.28); tail.rotation.x = -0.5;
  tail.castShadow = true; g.add(tail);
  g.scale.setScalar(scale);
  g.userData.tail = tail;
  return g;
}

function rebuildVault() {
  if (!vaultPile) return;
  while (vaultPile.children.length) vaultPile.remove(vaultPile.children[0]);
  const n = Math.min(46, S.stash);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.9 });
  const geo = new THREE.SphereGeometry(0.14, 7, 5);
  for (let i = 0; i < n; i++) {
    const layer = Math.floor(i / 9);
    const a = i * 2.4, r = Math.max(0, 1.05 - layer * 0.3) * (0.4 + (i % 5) * 0.14);
    const acorn = new THREE.Mesh(geo, mat);
    acorn.scale.set(1, 0.8, 1.25);
    acorn.position.set(Math.cos(a) * r, 0.1 + layer * 0.17, Math.sin(a) * r);
    acorn.rotation.y = a;
    vaultPile.add(acorn);
  }
  vaultCount = S.stash;
}

export function initHollowInteractables() {
  // outside: the knot-hole on the great tree
  const e = S.hollowEntrance;
  S.interactables.push({
    x: e.x, z: e.z, y: e.y, r: 1.5,
    label: () => S.player.inHollow ? null : 'E - slip into the knot-hole',
    action: () => enterHollow(),
  });
  // inside: exit hole
  S.interactables.push({
    x: CENTER.x, z: CENTER.z + 5.2, y: 0, r: 1.7,
    label: () => S.player.inHollow ? 'E - slip back outside' : null,
    action: () => exitHollow(),
  });
}

function enterHollow() {
  const P = S.player;
  P.pos.set(CENTER.x, 0, CENTER.z + 3.6);
  P.vel.set(0, 0, 0);
  P.yaw = 0; // face into the room (elder is to the north)
  P.inHollow = true;
  sfx.gossip();
  toast('THE HOLLOW. home. mind the elder.', 3);
  rebuildVault();
}
function exitHollow() {
  const P = S.player;
  const t = S.hollowTreePos;
  P.pos.set(t.x + 1.5, t.y, t.z + 2.6);
  P.vel.set(0, 0, 0);
  P.inHollow = false;
  setGossip('');
  toast('back to the park. try to look innocent.', 2.4);
}

export function updateHollow(dt) {
  if (vaultCount !== S.stash && S.player.inHollow) rebuildVault();
  if (S.player.inHollow) {
    // keep the squirrel inside the trunk: soft round wall
    const P = S.player.pos;
    const dx = P.x - CENTER.x, dz = P.z - CENTER.z;
    const d = Math.hypot(dx, dz);
    if (d > 5.3) { P.x = CENTER.x + dx / d * 5.3; P.z = CENTER.z + dz / d * 5.3; }
    P.pos.y = 0;
  }
  if (elder) {
    elder.userData.tail.rotation.z = Math.sin(performance.now() / 900) * 0.12;
  }
  if (!S.player.inHollow) { gossipTimer = 0; return; }
  const P = S.player.pos;
  const nearElder = Math.hypot(P.x - (CENTER.x + 2.6), P.z - (CENTER.z - 2.4)) < 3;
  if (nearElder) {
    gossipTimer -= dt;
    if (gossipTimer <= 0) {
      gossipTimer = 7;
      setGossip(GOSSIP[S.gossipIndex % GOSSIP.length]);
      S.gossipIndex++;
      sfx.gossip();
    }
  } else {
    setGossip('');
    gossipTimer = 0.5;
  }
}
