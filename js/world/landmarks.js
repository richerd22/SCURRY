// SCURRY - landmarks: the recognizable bones of the Common + Public Garden.
// All code-built stylized geometry. No loaded models (sourcing pass is v0.5).

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundHeight } from './world.js';

const stone = new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.9 });
const granite = new THREE.MeshStandardMaterial({ color: 0x8f8b82, roughness: 0.95 });
const brick = new THREE.MeshStandardMaterial({ color: 0x8a4a38, roughness: 0.9 });
const white = new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.8 });
const gold = new THREE.MeshStandardMaterial({ color: 0xd8a921, roughness: 0.3, metalness: 0.85 });
const bronze = new THREE.MeshStandardMaterial({ color: 0x6e5a33, roughness: 0.45, metalness: 0.7 });
const greenMetal = new THREE.MeshStandardMaterial({ color: 0x2e4a38, roughness: 0.5, metalness: 0.4 });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x54402a, roughness: 1 });

function box(w, h, d, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function solidBox(x, z, hw, hd, parent4) {
  S.solidBoxes.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
}

export function buildLandmarks(scene) {
  buildStateHouse(scene);
  buildMonument(scene);
  buildBandstand(scene);
  buildBrewerFountain(scene);
  buildParkStStation(scene);
  buildBridge(scene);
  buildSwanBoats(scene);
  buildDucklings(scene);
  buildWashington(scene);
  buildGamewellBoxes(scene);
}

// --- Massachusetts State House, NE hill edge, gold dome ---
function buildStateHouse(scene) {
  const g = new THREE.Group();
  const x = 186, z = -92, gy = groundHeight(x, z);
  box(56, 13, 16, brick, 0, 6.5, 0, g);                       // main block
  box(60, 2, 19, white, 0, 1, 0, g);                          // base trim
  box(58, 1.6, 18, white, 0, 13.6, 0, g);                     // cornice
  box(18, 5, 12, brick, 0, 15.5, 0, g);                       // drum block
  for (let i = -2; i <= 2; i++) cyl(0.55, 0.55, 7, white, i * 3.4, 9.5, 9.6, g, 8); // portico columns
  box(20, 1.2, 4, white, 0, 13.4, 9.6, g);                    // portico lintel
  cyl(4.6, 5.2, 3.4, white, 0, 19.5, 0, g, 16);               // dome drum
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  dome.position.set(0, 21.2, 0); dome.castShadow = true;
  g.add(dome);
  cyl(0.3, 0.5, 2.6, gold, 0, 27.2, 0, g, 8);                 // lantern spike
  // windows: emissive-ish dark strips
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.3, metalness: 0.4 });
  for (let i = -6; i <= 6; i++) { if (i === 0) continue; box(1.6, 3.2, 0.2, winMat, i * 3.8, 8, 8.15, g, false); }
  g.position.set(x, gy, z);
  scene.add(g);
  solidBox(x, z, 29, 10);
}

// --- Soldiers and Sailors Monument on the central hill ---
function buildMonument(scene) {
  const g = new THREE.Group();
  const x = 60, z = -45, gy = groundHeight(x, z);
  box(11, 1.2, 11, granite, 0, 0.6, 0, g);
  box(8.5, 1.2, 8.5, stone, 0, 1.8, 0, g);
  box(6, 2.2, 6, granite, 0, 3.5, 0, g);
  cyl(1.15, 1.5, 17, stone, 0, 13.2, 0, g, 14);
  box(3.4, 1, 3.4, stone, 0, 22.2, 0, g);
  // abstract figure on top
  cyl(0.32, 0.42, 1.9, bronze, 0, 23.6, 0, g, 8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bronze);
  head.position.set(0, 24.8, 0); head.castShadow = true; g.add(head);
  g.position.set(x, gy, z);
  scene.add(g);
  S.solids.push({ x, z, r: 3.1 }); // pedestal + column core; the steps stay walkable
  // walkable steps
  S.platformBoxes.push({ minX: x - 5.5, maxX: x + 5.5, minZ: z - 5.5, maxZ: z + 5.5, y: gy + 1.2 });
  S.platformBoxes.push({ minX: x - 4.25, maxX: x + 4.25, minZ: z - 4.25, maxZ: z + 4.25, y: gy + 2.4 });
}

// --- Parkman Bandstand (respawn roof lives here) ---
function buildBandstand(scene) {
  const g = new THREE.Group();
  const x = 140, z = 42, gy = groundHeight(x, z);
  const deck = cyl(7.5, 8, 1.1, stone, 0, 0.55, 0, g, 8);
  deck.receiveShadow = true;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    cyl(0.22, 0.22, 4.6, white, Math.cos(a) * 6.4, 3.4, Math.sin(a) * 6.4, g, 8);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 3.4, 8), new THREE.MeshStandardMaterial({ color: 0x707a72, roughness: 0.7, metalness: 0.3 }));
  roof.position.y = 7.4; roof.castShadow = true;
  g.add(roof);
  cyl(0.2, 0.2, 1.6, gold, 0, 9.8, 0, g, 6);
  g.position.set(x, gy, z);
  scene.add(g);
  // no solid box: the stage edge is a squirrel-sized step up (player step tolerance handles it)
  // stage top + roof are walkable
  S.platformBoxes.push({ minX: x - 7.4, maxX: x + 7.4, minZ: z - 7.4, maxZ: z + 7.4, y: gy + 1.1 });
  S.platforms.push({ x, z, r: 4.4, y: gy + 9.1 });
  S.respawnPoint = new THREE.Vector3(x, gy + 9.3, z);
}

// --- Brewer Fountain near Park St ---
function buildBrewerFountain(scene) {
  const g = new THREE.Group();
  const x = -25, z = -58, gy = groundHeight(x, z);
  cyl(4.6, 5, 0.8, granite, 0, 0.4, 0, g, 20);
  const basinWater = new THREE.Mesh(new THREE.CircleGeometry(4.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x3d7086, roughness: 0.15, metalness: 0.3 }));
  basinWater.rotation.x = -Math.PI / 2; basinWater.position.y = 0.75; g.add(basinWater);
  cyl(0.5, 0.8, 2.6, bronze, 0, 2, 0, g, 10);
  cyl(1.6, 1.2, 0.5, bronze, 0, 3.1, 0, g, 12);
  cyl(0.2, 0.3, 1.2, bronze, 0, 3.9, 0, g, 8);
  g.position.set(x, gy, z);
  scene.add(g);
  S.solids.push({ x, z, r: 5.1 });
}

// --- Park Street station headhouse ---
function buildParkStStation(scene) {
  const g = new THREE.Group();
  const x = -33, z = -80, gy = groundHeight(x, z);
  box(7, 3.4, 5, greenMetal, 0, 1.7, 0, g);
  const roofM = box(8, 0.3, 6, darkWood, 0, 3.6, 0, g);
  roofM.rotation.z = 0.06;
  // sign
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#17301f'; c.fillRect(0, 0, 256, 64);
  c.fillStyle = '#f2ead2'; c.font = 'bold 34px monospace'; c.textAlign = 'center';
  c.fillText('PARK ST', 128, 44);
  const signTex = new THREE.CanvasTexture(cv); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(0, 2.6, 2.56); g.add(sign);
  const sign2 = sign.clone(); sign2.rotation.y = Math.PI; sign2.position.z = -2.56; g.add(sign2);
  // dark stair hole beside it
  box(3.4, 0.25, 4.4, new THREE.MeshBasicMaterial({ color: 0x060606 }), 5.6, 0.13, 0, g, false);
  g.position.set(x, gy, z);
  scene.add(g);
  solidBox(x, z, 3.6, 2.6);
}

// --- Public Garden lagoon bridge ---
function buildBridge(scene) {
  const g = new THREE.Group();
  const x = MAP.lagoon.x, z = 0;
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.85 });
  // flat deck (the suspension dressing carries the look; flat keeps squirrel feet honest)
  box(5.4, 0.5, 36, deckMat, 0, 0.9, 0, g);
  // railings
  for (const sx of [-2.6, 2.6]) {
    box(0.12, 0.9, 35, white, sx, 1.55, 0, g);
  }
  // suspension towers + cables
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.4 });
  for (const tz of [-13.5, 13.5]) {
    for (const sx of [-2.6, 2.6]) cyl(0.14, 0.14, 5.2, white, sx, 2.6, tz, g, 6);
    box(5.6, 0.3, 0.3, white, 0, 5.2, tz, g);
  }
  for (const sx of [-2.6, 2.6]) {
    const cable = cyl(0.035, 0.035, 30, cableMat, sx, 3.4, 0, g, 4);
    cable.rotation.x = Math.PI / 2;
    cable.scale.y = 1;
  }
  g.position.set(x, 0, z);
  scene.add(g);
  S.platformBoxes.push({ minX: x - 2.7, maxX: x + 2.7, minZ: -18, maxZ: 18, y: 1.15 });
  // entry ramps on both banks
  S.platformBoxes.push({ minX: x - 2.7, maxX: x + 2.7, minZ: -21.5, maxZ: -17.5, y: 0.5 });
  S.platformBoxes.push({ minX: x - 2.7, maxX: x + 2.7, minZ: 17.5, maxZ: 21.5, y: 0.5 });
}

// --- swan boats docked on the lagoon ---
function buildSwanBoats(scene) {
  const boatMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.7 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x9db8c9, roughness: 0.8 });
  function boat(x, z, rotY) {
    const g = new THREE.Group();
    box(3.2, 0.8, 8.5, boatMat, 0, 0.4, 0, g);
    box(3.4, 0.25, 8.7, darkWood, 0, 0.9, 0, g);
    for (let i = 0; i < 3; i++) box(2.8, 0.5, 0.3, darkWood, 0, 1.1, -2.6 + i * 2.4, g); // bench backs
    for (const px of [-1.3, 1.3]) cyl(0.07, 0.07, 1.7, darkWood, px, 1.7, 0.5, g, 6);
    const can = box(3.3, 0.18, 5.4, canopyMat, 0, 2.6, 0.5, g);
    can.rotation.x = 0.03;
    // the swan: neck curve from cylinders + head
    const neckMat = white;
    let nx = 0, ny = 1.2, nz = -4.6;
    for (let i = 0; i < 4; i++) {
      const seg = cyl(0.16 - i * 0.02, 0.18 - i * 0.02, 0.85, neckMat, nx, ny + i * 0.55, nz + i * 0.16, g, 8);
      seg.rotation.x = -0.35 + i * 0.22;
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), neckMat);
    head.position.set(0, 3.6, -3.8); head.scale.set(0.8, 0.85, 1.35); head.castShadow = true; g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0xe07b28, roughness: 0.6 }));
    beak.rotation.x = -Math.PI / 2 - 0.25; beak.position.set(0, 3.5, -4.25); g.add(beak);
    g.position.set(x, 0.05, z);
    g.rotation.y = rotY;
    g.userData.bobPhase = Math.random() * 6;
    scene.add(g);
    (S.boats = S.boats || []).push(g);
    return g;
  }
  boat(MAP.lagoon.x - 20, -13, 0.5);
  boat(MAP.lagoon.x + 24, 14, -2.4);
}

// --- Make Way for Ducklings, Garden path near the Charles St gate ---
function buildDucklings(scene) {
  const g = new THREE.Group();
  function duck(s) {
    const d = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 10, 8), bronze);
    body.scale.set(1, 0.85, 1.3); body.position.y = 0.42 * s; body.castShadow = true; d.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 9, 7), bronze);
    head.position.set(0, 0.78 * s, 0.5 * s); head.castShadow = true; d.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.3 * s, 7), bronze);
    beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.74 * s, 0.78 * s); d.add(beak);
    return d;
  }
  const mother = duck(1.15); g.add(mother);
  for (let i = 0; i < 8; i++) {
    const d = duck(0.52);
    d.position.set(Math.sin(i * 1.7) * 0.35, 0, -0.95 - i * 0.62);
    d.rotation.y = Math.sin(i * 2.3) * 0.2;
    g.add(d);
  }
  const x = -78, z = 34, gy = groundHeight(x, z);
  g.position.set(x, gy, z);
  g.rotation.y = 0.8;
  scene.add(g);
  S.solids.push({ x, z, r: 1.6 });
}

// --- George Washington statue, Garden south mall ---
function buildWashington(scene) {
  const g = new THREE.Group();
  const x = -132, z = 76, gy = groundHeight(x, z);
  box(4.4, 2.2, 3.2, granite, 0, 1.1, 0, g);
  box(3.6, 0.7, 2.6, stone, 0, 2.55, 0, g);
  // horse, abstract low-poly
  const horse = new THREE.Group();
  const body = box(1, 1.05, 2.5, bronze, 0, 3.4, 0, horse);
  body.rotation.x = -0.1;
  const neck = box(0.55, 1.3, 0.8, bronze, 0, 4.2, 1.35, horse); neck.rotation.x = 0.6;
  box(0.42, 0.5, 1, bronze, 0, 4.75, 1.9, horse).rotation.x = 0.5;
  for (const [lx, lz, lift] of [[-0.32, 0.9, 0], [0.32, 0.9, 0.35], [-0.32, -0.95, 0.3], [0.32, -0.95, 0]]) {
    const leg = cyl(0.11, 0.09, 1.6 - lift, bronze, lx, 2.1 + lift / 2, lz, horse, 6);
    if (lift) leg.rotation.x = -0.5;
  }
  box(0.3, 0.9, 0.5, bronze, 0, 3.6, -1.55, horse).rotation.x = -0.4; // tail
  // rider
  cyl(0.2, 0.26, 1.1, bronze, 0, 4.6, -0.1, horse, 7);
  const rh = new THREE.Mesh(new THREE.SphereGeometry(0.21, 9, 7), bronze);
  rh.position.set(0, 5.35, -0.1); rh.castShadow = true; horse.add(rh);
  g.add(horse);
  g.position.set(x, gy, z);
  scene.add(g);
  solidBox(x, z, 2.4, 1.8);
}

// --- Gamewell alarm boxes: little red sentinels (Alarm Club canon) ---
function buildGamewellBoxes(scene) {
  const red = new THREE.MeshStandardMaterial({ color: 0xa8232a, roughness: 0.5 });
  const spots = [[-30, -66], [58, -14], [150, -14], [100, 88], [-70, -66], [-136, 44]];
  for (const [x, z] of spots) {
    const gy = groundHeight(x, z);
    const g = new THREE.Group();
    cyl(0.09, 0.11, 2.2, granite, 0, 1.1, 0, g, 7);
    box(0.55, 0.8, 0.4, red, 0, 2.4, 0, g);
    box(0.6, 0.12, 0.45, gold, 0, 2.86, 0, g);
    g.position.set(x, gy, z);
    scene.add(g);
    S.solids.push({ x, z, r: 0.35 });
  }
}
