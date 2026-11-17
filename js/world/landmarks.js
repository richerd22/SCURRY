// SCURRY - landmarks: the recognizable bones of the Common + Public Garden.
// All code-built stylized geometry. No loaded models (sourcing pass is v0.5).

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundHeight, terrainDisc } from './world.js';
import { graniteTex, stateHouseFacade, glowTex, drumTex, arcadeTex, fluteTex, reliefTex } from './textures.js';

const graniteT = graniteTex();
const stone = new THREE.MeshStandardMaterial({ map: graniteT, color: 0xd8d2c4, roughness: 0.9 });
const granite = new THREE.MeshStandardMaterial({ map: graniteT, roughness: 0.95 });
const facade = stateHouseFacade();
const brick = new THREE.MeshStandardMaterial({
  map: facade.map, emissiveMap: facade.emissiveMap, emissive: 0xffbe6e, emissiveIntensity: 0, roughness: 0.9,
});
const white = new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.8 });
const gold = new THREE.MeshStandardMaterial({ color: 0xd8a921, roughness: 0.24, metalness: 0.9, envMapIntensity: 2.2 });
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
const drumMat = new THREE.MeshStandardMaterial({ map: drumTex(), roughness: 0.75 });
const arcadeMat = new THREE.MeshStandardMaterial({ map: arcadeTex(), roughness: 0.9 });
function buildStateHouse(scene) {
  const g = new THREE.Group();
  const x = 186, z = -92, gy = groundHeight(x, z);
  box(56, 13, 16, brick, 0, 6.5, 0, g);                       // main block
  box(60, 2, 19, white, 0, 1, 0, g);                          // base trim
  box(56, 1.9, 0.25, arcadeMat, 0, 1.0, 9.56, g, false);      // ground-floor arcade on the plinth face
  box(58, 1.6, 18, white, 0, 13.6, 0, g);                     // cornice
  for (const px of [-27.6, 27.6]) box(0.9, 11, 0.3, white, px, 7.2, 8.08, g, false); // corner pilasters
  // balustrade along the front cornice
  box(58, 0.38, 0.3, white, 0, 14.62, 8.2, g, false);
  for (let px = -27; px <= 27; px += 3.4) box(0.22, 0.55, 0.22, white, px, 14.35, 8.2, g, false);
  box(18, 5, 12, brick, 0, 15.5, 0, g);                       // drum block
  for (let i = -2; i <= 2; i++) cyl(0.55, 0.55, 7, white, i * 3.4, 9.5, 9.6, g, 8); // portico columns
  box(20, 1.2, 4, white, 0, 13.4, 9.6, g);                    // portico lintel
  { // triangular pediment over the portico - the Bulfinch signature
    const tri = new THREE.Shape();
    tri.moveTo(-10.6, 0); tri.lineTo(10.6, 0); tri.lineTo(0, 2.7); tri.closePath();
    const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 3.2, bevelEnabled: false }), white);
    ped.position.set(0, 14.05, 8.0);
    ped.castShadow = true; ped.receiveShadow = true;
    g.add(ped);
  }
  cyl(4.6, 5.2, 3.4, drumMat, 0, 19.5, 0, g, 20);             // dome drum, windowed
  cyl(5.35, 5.35, 0.45, white, 0, 21.3, 0, g, 20);            // drum cornice ring
  { // the dome: a lathe bell profile, not a hemisphere
    const prof = [[4.95, 0], [4.9, 0.5], [4.55, 1.6], [3.9, 2.7], [2.9, 3.6], [1.7, 4.25], [0.55, 4.6], [0.02, 4.7]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 22), gold);
    dome.position.set(0, 21.5, 0); dome.castShadow = true;
    g.add(dome);
  }
  // lantern: columned cupola, mini dome, gilded pinecone finial
  cyl(1.05, 1.2, 0.5, white, 0, 26.35, 0, g, 12);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    cyl(0.09, 0.09, 1.3, white, Math.cos(a) * 0.8, 27.25, Math.sin(a) * 0.8, g, 6);
  }
  cyl(1.12, 1.12, 0.3, white, 0, 28.05, 0, g, 12);
  const miniDome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  miniDome.position.set(0, 28.2, 0); miniDome.castShadow = true;
  g.add(miniDome);
  const cone = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 7), gold);
  cone.position.set(0, 29.45, 0); cone.scale.set(1, 1.25, 1); cone.castShadow = true;
  g.add(cone);
  cyl(0.05, 0.05, 0.5, gold, 0, 29.95, 0, g, 6);
  // (windows live in the facade texture now - they glow at dusk via emissiveMap)
  g.position.set(x, gy, z);
  scene.add(g);
  solidBox(x, z, 29, 10);
  S.stateHouseMat = brick; // daycycle raises the window glow at dusk
}

// --- Soldiers and Sailors Monument on the central hill ---
const columnMat = new THREE.MeshStandardMaterial({ map: fluteTex(), roughness: 0.9 });
const reliefMat = new THREE.MeshStandardMaterial({ map: reliefTex(), roughness: 0.55, metalness: 0.55 });
function buildMonument(scene) {
  const g = new THREE.Group();
  const x = 60, z = -45, gy = groundHeight(x, z);
  box(11, 1.2, 11, granite, 0, 0.6, 0, g);
  box(8.5, 1.2, 8.5, stone, 0, 1.8, 0, g);
  box(6, 2.2, 6, granite, 0, 3.5, 0, g);
  // bronze relief panels on the pedestal faces
  for (const [px, pz, ry] of [[0, 3.03, 0], [0, -3.03, 0], [3.03, 0, 1], [-3.03, 0, 1]]) {
    box(ry ? 0.1 : 3.4, 1.5, ry ? 3.4 : 0.1, reliefMat, px, 3.5, pz, g, false);
  }
  // four corner figures on the bottom tier (War, Peace, and friends)
  for (const [fx, fz] of [[-4.9, -4.9], [4.9, -4.9], [-4.9, 4.9], [4.9, 4.9]]) {
    box(0.55, 0.5, 0.55, granite, fx, 1.45, fz, g);
    cyl(0.16, 0.23, 1.05, bronze, fx, 2.23, fz, g, 7);
    const fh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), bronze);
    fh.position.set(fx, 2.95, fz); fh.castShadow = true; g.add(fh);
    S.solids.push({ x: x + fx, z: z + fz, r: 0.45 });
  }
  // the column: lathe-turned with entasis + fluting, capital on top
  cyl(1.7, 1.85, 0.5, stone, 0, 4.85, 0, g, 14);
  {
    const prof = [[1.52, 0], [1.47, 2], [1.38, 6], [1.30, 10], [1.22, 14], [1.16, 16.6]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const col = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), columnMat);
    col.position.set(0, 4.6, 0); col.castShadow = true; col.receiveShadow = true;
    g.add(col);
  }
  cyl(1.5, 1.18, 0.75, stone, 0, 21.55, 0, g, 14);
  box(3.1, 0.5, 3.1, stone, 0, 22.2, 0, g);
  // allegorical figure on top, flag staff in hand
  cyl(0.32, 0.42, 1.9, bronze, 0, 23.4, 0, g, 8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bronze);
  head.position.set(0, 24.6, 0); head.castShadow = true; g.add(head);
  cyl(0.035, 0.035, 2.4, bronze, 0.62, 24.1, 0, g, 5);
  box(0.07, 1.05, 0.72, bronze, 0.62, 24.75, 0.38, g, false);
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
  const deck = cyl(7.5, 8, 1.1, stone, 0, 0.55, 0, g, 28);
  deck.receiveShadow = true;
  cyl(8.4, 8.7, 0.35, stone, 0, 0.17, 0, g, 28); // ground step ring
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    const cx = Math.cos(a) * 6.4, cz = Math.sin(a) * 6.4;
    cyl(0.22, 0.22, 4.6, white, cx, 3.4, cz, g, 8);
    box(0.52, 0.26, 0.52, white, cx, 5.78, cz, g, false); // capitals
    box(0.46, 0.3, 0.46, white, cx, 1.25, cz, g, false);  // bases
  }
  cyl(6.75, 6.75, 0.5, white, 0, 5.95, 0, g, 24); // entablature ring
  { // the roof: a shallow dome, not a cone - apex kept at the old 9.1 line
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xc9c9bd, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(8.8, 24, 10, 0, Math.PI * 2, 0, 1.36), roofMat);
    dome.scale.y = 0.42;
    dome.position.y = 5.33;
    dome.castShadow = true;
    g.add(dome);
  }
  cyl(0.1, 0.15, 0.9, gold, 0, 9.45, 0, g, 6);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 7), gold);
  finial.position.set(0, 10.05, 0); finial.castShadow = true;
  g.add(finial);
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

// --- Public Garden lagoon bridge (1861 suspension bridge) ---
function buildBridge(scene) {
  const g = new THREE.Group();
  const x = MAP.lagoon.x, z = 0;
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.85 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x3c4147, metalness: 0.75, roughness: 0.45 });
  // flat deck (the suspension dressing carries the look; flat keeps squirrel feet honest)
  box(5.4, 0.5, 36, deckMat, 0, 0.9, 0, g);
  // deck fascia: a finished white edge so the slab reads as a built bridge, not a plank
  for (const sx of [-2.68, 2.68]) box(0.14, 0.36, 36.2, white, sx, 0.9, 0, g);
  // stone abutments grounding both ends
  for (const az of [-18.6, 18.6]) box(6.4, 1.5, 2.6, granite, 0, 0.35, az, g);
  // railings: top + mid rails on a run of slim balusters
  const balusters = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.85, 0.045), white, 66);
  {
    const d = new THREE.Object3D();
    let bi = 0;
    for (const sx of [-2.6, 2.6]) {
      box(0.1, 0.1, 35, white, sx, 2.02, 0, g);
      box(0.05, 0.05, 34.6, white, sx, 1.58, 0, g, false);
      for (let bz = -16.8; bz <= 16.8; bz += 1.05) {
        d.position.set(sx, 1.57, bz);
        d.updateMatrix();
        balusters.setMatrixAt(bi++, d.matrix);
      }
    }
    balusters.count = bi;
    balusters.receiveShadow = true;
    g.add(balusters);
  }
  // suspension towers: column pairs, top + mid beams, X-braced between
  for (const tz of [-13.5, 13.5]) {
    for (const sx of [-2.6, 2.6]) cyl(0.14, 0.17, 5.2, white, sx, 2.6, tz, g, 8);
    box(5.9, 0.3, 0.34, white, 0, 5.2, tz, g);
    box(5.6, 0.22, 0.24, white, 0, 2.3, tz, g);
    for (const s of [1, -1]) {
      const brace = box(5.9, 0.09, 0.09, white, 0, 3.75, tz, g, false);
      brace.rotation.z = s * 0.487;
    }
  }
  // main cables: one sagging catenary per side, anchored on the abutments,
  // cresting the tower beams and dipping toward the deck at midspan
  const cableY = (zz) => 2.62 + 2.73 * Math.pow(zz / 13.5, 2);
  for (const sx of [-2.6, 2.6]) {
    const pts = [];
    pts.push(new THREE.Vector3(sx, 1.15, -19.5), new THREE.Vector3(sx, 3.3, -16.8),
      new THREE.Vector3(sx, 5.35, -13.5));
    for (let zz = -10; zz <= 10; zz += 2.5) pts.push(new THREE.Vector3(sx, cableY(zz), zz));
    pts.push(new THREE.Vector3(sx, 5.35, 13.5), new THREE.Vector3(sx, 3.3, 16.8),
      new THREE.Vector3(sx, 1.15, 19.5));
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.045, 5), cableMat);
    tube.castShadow = true;
    g.add(tube);
    // vertical suspender rods, cable to deck edge
    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 4);
    for (let zz = -12; zz <= 12; zz += 2) {
      const top = cableY(zz) - 0.03, len = top - 1.15;
      const rod = new THREE.Mesh(rodGeo, cableMat);
      rod.scale.y = len;
      rod.position.set(sx, 1.15 + len / 2, zz);
      g.add(rod);
    }
  }
  // the arch under the deck (the real bridge's signature curve, flattened)
  const arch = new THREE.Mesh(new THREE.TorusGeometry(15.5, 0.55, 8, 28, Math.PI), deckMat);
  arch.rotation.y = Math.PI / 2;
  arch.scale.set(1, 0.09, 1);
  arch.position.y = -0.5;
  arch.castShadow = true;
  g.add(arch);
  // little globe lamps on the bridge towers, wired into the daycycle glow
  const gTex = glowTex();
  for (const tz of [-13.5, 13.5]) {
    for (const sx of [-2.6, 2.6]) {
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c4, emissive: 0xffb45e, emissiveIntensity: 0 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), bulbMat);
      bulb.position.set(sx, 5.6, tz);
      g.add(bulb);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color: 0xffbe78, transparent: true, opacity: 0, depthWrite: false }));
      sprite.scale.set(3.6, 3.6, 1);
      sprite.position.set(sx, 5.6, tz);
      g.add(sprite);
      S.lamps.push({ sprite, bulbMat, light: null, x: x + sx, z: tz });
    }
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
  // the ducklings stand on cobblestones
  const cobble = terrainDisc(x, z, 3.4, granite, 0.03);
  cobble.rotation.y = 0.8;
  scene.add(cobble);
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
