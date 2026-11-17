// SCURRY - landmarks: the recognizable bones of the Common + Public Garden.
// All code-built stylized geometry. No loaded models (sourcing pass is v0.5).

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundHeight, terrainDisc } from './world.js';
import { graniteTex, stateHouseFacade, glowTex, drumTex, arcadeTex, fluteTex, reliefTex, plankTex } from './textures.js';

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
// Rebuilt v0.6.12: was three stacked cylinders on the basin. The real
// Brewer is a two-tier bronze fountain with four seated figures around
// the pedestal (Neptune, Amphitrite, Acis, Galatea) rising out of the
// basin. Lathe-turned pedestal + bowls, composed-shape figures -
// stylized, but the silhouette is the fountain's own.
const bronzeDS = bronze.clone(); bronzeDS.side = THREE.DoubleSide;
const fountainWaterMat = new THREE.MeshStandardMaterial({ color: 0x3d7086, roughness: 0.15, metalness: 0.3 });
function fountainFigure() {
  const f = new THREE.Group();
  box(0.62, 0.75, 0.62, granite, 0, 0.72, 0, f);            // plinth out of the basin water
  box(0.5, 0.24, 0.5, bronze, 0, 1.2, -0.04, f);           // seat
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.21, 9, 7), bronze);
  hips.scale.set(1.1, 0.7, 1); hips.position.set(0, 1.4, 0); hips.castShadow = true; f.add(hips);
  const torso = cyl(0.13, 0.19, 0.55, bronze, 0, 1.76, -0.03, f, 8);
  torso.rotation.x = 0.08;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 7), bronze);
  head.position.set(0, 2.16, -0.01); head.castShadow = true; f.add(head);
  const lap = box(0.36, 0.13, 0.52, bronze, 0, 1.36, 0.3, f);  // thighs, sloping down-forward
  lap.rotation.x = 0.5;
  box(0.34, 0.4, 0.12, bronze, 0, 1.02, 0.52, f);          // shins to the basin
  const arm = cyl(0.05, 0.06, 0.52, bronze, 0.27, 1.58, 0.08, f, 6);
  arm.rotation.z = 0.35; arm.rotation.x = -0.4;
  return f;
}
function buildBrewerFountain(scene) {
  const g = new THREE.Group();
  const x = -25, z = -58, gy = groundHeight(x, z);
  cyl(4.6, 5, 0.8, granite, 0, 0.4, 0, g, 20);
  const basinWater = new THREE.Mesh(new THREE.CircleGeometry(4.2, 20), fountainWaterMat);
  basinWater.rotation.x = -Math.PI / 2; basinWater.position.y = 0.75; g.add(basinWater);
  // lathe-turned central pedestal
  {
    const prof = [[0.62, 0.8], [0.55, 1.0], [0.42, 1.3], [0.38, 1.9], [0.46, 2.15], [0.5, 2.3]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const ped = new THREE.Mesh(new THREE.LatheGeometry(prof, 14), bronzeDS);
    ped.castShadow = true; ped.receiveShadow = true; g.add(ped);
  }
  // four seated figures at the diagonals, facing out over the basin
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const f = fountainFigure();
    f.position.set(Math.sin(a) * 1.5, 0, Math.cos(a) * 1.5);
    f.rotation.y = a;
    g.add(f);
  }
  // lower bowl + its water, column, upper bowl + its water
  {
    const bowl = [[0.3, 2.3], [1.2, 2.42], [2.05, 2.62], [2.3, 2.78], [2.34, 2.86]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const b = new THREE.Mesh(new THREE.LatheGeometry(bowl, 18), bronzeDS);
    b.castShadow = true; b.receiveShadow = true; g.add(b);
    const w = new THREE.Mesh(new THREE.CircleGeometry(2.02, 18), fountainWaterMat);
    w.rotation.x = -Math.PI / 2; w.position.y = 2.68; g.add(w);
    const bowl2 = [[0.18, 3.55], [0.7, 3.64], [1.05, 3.78], [1.14, 3.86]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const b2 = new THREE.Mesh(new THREE.LatheGeometry(bowl2, 16), bronzeDS);
    b2.castShadow = true; g.add(b2);
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(0.92, 16), fountainWaterMat);
    w2.rotation.x = -Math.PI / 2; w2.position.y = 3.8; g.add(w2);
  }
  cyl(0.16, 0.21, 1.05, bronze, 0, 3.1, 0, g, 10);
  // finial: one standing figure, same composed-shape honesty as the four below
  cyl(0.09, 0.15, 0.52, bronze, 0, 4.12, 0, g, 8);
  const fh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 9, 7), bronze);
  fh.position.set(0, 4.48, 0); fh.castShadow = true; g.add(fh);
  g.position.set(x, gy, z);
  scene.add(g);
  S.solids.push({ x, z, r: 5.1 });
}

// --- Park Street station headhouse ---
// Rebuilt v0.6.12: was a green metal box with a PARK ST sign. Now a
// glass-and-iron headhouse: stone base, iron corner posts + mullions,
// glazed walls, an arched glazed gable front and back under a shallow
// arched glass roof, and the T roundel mounted on the glass where it
// reads from across the street. The glass joins S.cityMats so the
// daycycle warms it after dark, like a lit station should.
const headhouseGlass = new THREE.MeshStandardMaterial({
  color: 0xbcd4d8, transparent: true, opacity: 0.38, roughness: 0.12, metalness: 0.1,
  envMapIntensity: 1.6, emissive: 0xffc98a, emissiveIntensity: 0, side: THREE.DoubleSide,
});
const greenMetalDS = greenMetal.clone(); greenMetalDS.side = THREE.DoubleSide;
function roundelTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#101012'; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f4f1e8'; c.beginPath(); c.arc(128, 128, 102, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#101012'; c.font = 'bold 168px Arial, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('T', 128, 138);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildParkStStation(scene) {
  const g = new THREE.Group();
  const x = -33, z = -80, gy = groundHeight(x, z);
  if (S.cityMats) S.cityMats.push(headhouseGlass);
  box(7.2, 0.5, 5.2, granite, 0, 0.25, 0, g);                       // stone base
  box(3.0, 2.4, 3.4, new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 1 }), 0.8, 1.45, 0, g); // stair mass inside
  // glazed walls + iron mullions
  for (const sz of [-2.3, 2.3]) {
    box(6.6, 2.2, 0.06, headhouseGlass, 0, 1.85, sz, g, false);
    for (const mx of [-2.2, 0, 2.2]) box(0.07, 2.2, 0.09, greenMetal, mx, 1.85, sz * 1.01, g, false);
    box(6.6, 0.09, 0.09, greenMetal, 0, 1.85, sz * 1.01, g, false);
    box(7.0, 0.22, 0.22, greenMetal, 0, 3.4, sz, g);
  }
  for (const sx of [-3.3, 3.3]) {
    box(0.06, 2.2, 4.2, headhouseGlass, sx, 1.85, 0, g, false);
    box(0.22, 0.22, 4.8, greenMetal, sx, 3.4, 0, g);
  }
  for (const px of [-3.3, 3.3]) for (const pz of [-2.3, 2.3])
    box(0.18, 2.9, 0.18, greenMetal, px, 2.0, pz, g);
  // arched gable panels (glass in an iron border) front + back
  const archShape = new THREE.Shape();
  archShape.moveTo(-3.3, 0); archShape.lineTo(-3.3, 0.3);
  archShape.absellipse(0, 0.3, 3.3, 0.75, Math.PI, 0, true);
  archShape.lineTo(3.3, 0); archShape.lineTo(-3.3, 0);
  const archHole = new THREE.Path();
  archHole.moveTo(-3.02, 0.07); archHole.lineTo(-3.02, 0.32);
  archHole.absellipse(0, 0.32, 3.02, 0.64, Math.PI, 0, true);
  archHole.lineTo(3.02, 0.07); archHole.lineTo(-3.02, 0.07);
  const archFrameShape = new THREE.Shape(archShape.getPoints(24));
  archFrameShape.holes.push(archHole);
  const archGeo = new THREE.ShapeGeometry(archShape, 20);
  const archFrameGeo = new THREE.ShapeGeometry(archFrameShape, 20);
  for (const sz of [-2.32, 2.32]) {
    const glass = new THREE.Mesh(archGeo, headhouseGlass);
    glass.position.set(0, 3.44, sz); g.add(glass);
    const frame = new THREE.Mesh(archFrameGeo, greenMetalDS);
    frame.position.set(0, 3.44, sz * 1.01); g.add(frame);
    for (const [mx, mh] of [[-2.2, 0.62], [0, 0.78], [2.2, 0.62]])
      box(0.07, mh, 0.08, greenMetal, mx, 3.44 + mh / 2, sz, g, false);
  }
  // shallow arched glass roof + iron ribs (arc radius 6.6, half-angle 0.558)
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(6.6, 6.6, 5.0, 16, 1, true, Math.PI - 0.558, 1.116), headhouseGlass);
  roof.rotation.x = Math.PI / 2; roof.position.set(0, -2.1, 0);
  g.add(roof);
  for (const rz of [-2.4, 0, 2.4]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.05, 6, 24, 1.116), greenMetal);
    rib.rotation.z = Math.PI / 2 - 0.558;
    rib.position.set(0, -2.1, rz);
    g.add(rib);
  }
  // the roundel, both street faces
  const rTex = roundelTex();
  for (const sz of [1, -1]) {
    const r = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24),
      new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.5 }));
    r.position.set(0, 3.82, sz * 2.44);
    if (sz < 0) r.rotation.y = Math.PI;
    g.add(r);
  }
  // sign
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#17301f'; c.fillRect(0, 0, 256, 64);
  c.fillStyle = '#f2ead2'; c.font = 'bold 34px monospace'; c.textAlign = 'center';
  c.fillText('PARK ST', 128, 44);
  const signTex = new THREE.CanvasTexture(cv); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(0, 2.95, 2.44); g.add(sign);
  const sign2 = sign.clone(); sign2.rotation.y = Math.PI; sign2.position.z = -2.44; g.add(sign2);
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

// --- swan boats on the lagoon ---
// Rebuilt v0.6.11: the old boats were a slab hull, three bench backs and
// a neck of stacked cylinders. Now: an extruded plan-view hull with a
// raked bow, slatted bench rows under an arched canvas canopy, and the
// full mute swan at the stern - S-curve neck (one swept tube), folded
// wings, black knob + mask, orange beak. The boats DRIFT: each runs a
// slow ellipse on its own lobe of the lagoon (daycycle owns the motion
// via userData.drift), never crossing the bridge or the goose deck.
const swanBlack = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.55 });
const swanBeak = new THREE.MeshStandardMaterial({ color: 0xe07b28, roughness: 0.55 });
const benchWood = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.85 });
function buildSwanBoats(scene) {
  const boatMat = new THREE.MeshStandardMaterial({ color: 0xf0ebdd, roughness: 0.6 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e4, roughness: 0.9, side: THREE.DoubleSide });
  const deckMat = new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.9 });

  // plan-view hull outline (shape y = -world z: bow at shape +y)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 4.8);
  hullShape.quadraticCurveTo(0.95, 4.5, 1.58, 3.3);
  hullShape.lineTo(1.75, -3.5);
  hullShape.quadraticCurveTo(1.76, -4.25, 1.45, -4.45);
  hullShape.lineTo(-1.45, -4.45);
  hullShape.quadraticCurveTo(-1.76, -4.25, -1.75, -3.5);
  hullShape.lineTo(-1.58, 3.3);
  hullShape.quadraticCurveTo(-0.95, 4.5, 0, 4.8);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.72, bevelEnabled: false });
  hullGeo.rotateX(-Math.PI / 2);

  function swan(g) {
    const s = new THREE.Group();
    // body + breast + folded wings + upswept tail
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 11), white);
    body.scale.set(1.02, 0.78, 1.42); body.position.set(0, 0.42, 0.1); body.castShadow = true; s.add(body);
    const breast = new THREE.Mesh(new THREE.SphereGeometry(0.34, 11, 9), white);
    breast.scale.set(0.9, 1.05, 0.9); breast.position.set(0, 0.62, -0.55); breast.castShadow = true; s.add(breast);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.5, 11, 9), white);
      wing.scale.set(0.32, 0.55, 1.25);
      wing.position.set(sx * 0.52, 0.66, 0.12);
      wing.rotation.z = -sx * 0.15; wing.rotation.x = -0.1;
      wing.castShadow = true; s.add(wing);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8), white);
    tail.position.set(0, 0.78, 0.98); tail.rotation.x = 0.93; tail.castShadow = true; s.add(tail);
    // the S-neck: one swept tube, base at the breast, crown curving back
    const neckPts = [
      new THREE.Vector3(0, 0.62, -0.52), new THREE.Vector3(0, 1.15, -0.72),
      new THREE.Vector3(0, 1.7, -0.62), new THREE.Vector3(0, 2.18, -0.7),
      new THREE.Vector3(0, 2.46, -0.9),
    ];
    const neck = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts), 20, 0.155, 9), white);
    neck.castShadow = true; s.add(neck);
    // head + mute-swan face: black mask + knob, orange beak tipped down
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 11, 9), white);
    head.scale.set(0.78, 0.82, 1.35); head.position.set(0, 2.5, -0.98); head.castShadow = true; s.add(head);
    const mask = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), swanBlack);
    mask.scale.set(0.95, 0.75, 0.7); mask.position.set(0, 2.51, -1.1); s.add(mask);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), swanBlack);
    knob.position.set(0, 2.61, -1.04); s.add(knob);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.4, 8), swanBeak);
    beak.rotation.x = -Math.PI / 2 + 0.3; beak.position.set(0, 2.44, -1.22); s.add(beak);
    s.position.set(0, 0.86, 4.32);
    g.add(s);
  }

  function boat(drift) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(hullGeo, boatMat);
    hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
    const rail = new THREE.Mesh(hullGeo, darkWood);
    rail.scale.set(1.045, 1, 1.03); rail.position.y = 0.7; rail.scale.y = 0.16; g.add(rail);
    const deck = new THREE.Mesh(new THREE.ShapeGeometry(hullShape), deckMat);
    deck.geometry.rotateX(-Math.PI / 2);
    deck.scale.set(0.94, 1, 0.97); deck.position.y = 0.73; deck.receiveShadow = true; g.add(deck);
    // bench rows facing the bow (-z): seat + leaning back + side stringers
    for (let i = 0; i < 5; i++) {
      const bz = -2.4 + i * 1.1;
      box(2.9, 0.09, 0.5, benchWood, 0, 1.0, bz, g);
      const back = box(2.9, 0.55, 0.09, benchWood, 0, 1.3, bz + 0.29, g);
      back.rotation.x = -0.12;
      for (const sx of [-1.35, 1.35]) box(0.08, 0.27, 0.5, benchWood, sx, 0.86, bz, g, false);
    }
    // canopy: arched canvas on four slim posts, edge rails to finish it
    for (const px of [-1.4, 1.4]) for (const pz of [-2.6, 2.3]) cyl(0.05, 0.05, 1.62, white, px, 1.6, pz, g, 6);
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, 5.6, 14, 1, true, Math.PI - 0.8, 1.6), canvasMat);
    roof.rotation.x = Math.PI / 2; roof.position.set(0, 0.98, -0.15);
    roof.castShadow = true; g.add(roof);
    for (const sx of [-1.36, 1.36]) box(0.07, 0.07, 5.6, white, sx, 2.3, -0.15, g, false);
    // stern deck the swan rides on
    box(3.3, 0.14, 1.7, benchWood, 0, 0.8, 3.85, g);
    swan(g);
    g.userData.bobPhase = Math.random() * 6;
    g.userData.drift = drift;
    const p0 = driftPoint(drift, 0);
    g.position.set(p0.x, 0.05, p0.z);
    g.rotation.y = p0.yaw;
    scene.add(g);
    (S.boats = S.boats || []).push(g);
    return g;
  }
  function driftPoint(d, t) {
    const th = d.ph + t * d.w;
    const x = d.cx + d.rx * Math.cos(th), z = d.cz + d.rz * Math.sin(th);
    const vx = -d.rx * Math.sin(th) * d.w, vz = d.rz * Math.cos(th) * d.w;
    return { x, z, yaw: Math.atan2(-vx, -vz) };
  }
  // west lobe + east lobe loops; both stay clear of the bridge deck
  // (x -134.7..-129.3) and inside the lagoon ellipse with hull to spare
  boat({ cx: MAP.lagoon.x - 22, cz: -12, rx: 8, rz: 4.5, w: (Math.PI * 2) / 170, ph: 0.6 });
  boat({ cx: MAP.lagoon.x + 22, cz: 13, rx: 7, rz: 4, w: -(Math.PI * 2) / 190, ph: 3.4 });
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
// Rebuilt v0.6.10: the old horse was boxes with its legs buried inside
// the pedestal. Now a composed equestrian silhouette - barrel/chest/
// rump spheres, two-segment legs (one foreleg raised, as the General's
// horse stands), arched neck, tapered muzzle, and a rider with thighs,
// reins arm and a tricorn. All bronze, all procedural.
function buildWashington(scene) {
  const g = new THREE.Group();
  const x = -132, z = 76, gy = groundHeight(x, z);
  box(4.4, 2.2, 3.2, granite, 0, 1.1, 0, g);
  box(3.6, 0.7, 2.6, stone, 0, 2.55, 0, g);
  const TOP = 2.9; // pedestal cap surface; hooves stand here
  const horse = new THREE.Group();
  const sph = (r, sx, sy, sz, px, py, pz, parent) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), bronze);
    m.scale.set(sx, sy, sz); m.position.set(px, py, pz);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  // barrel + chest + rump: three overlapping spheres read as one body
  sph(1, 0.58, 0.60, 1.28, 0, TOP + 1.80, 0, horse);
  sph(0.54, 1, 1, 1, 0, TOP + 1.88, 0.92, horse);   // chest
  sph(0.57, 1, 1, 1, 0, TOP + 1.92, -0.92, horse);  // rump
  // neck: tapered, leaning up-forward off the chest, plus a mane strip
  const neck = cyl(0.21, 0.33, 1.25, bronze, 0, TOP + 2.62, 1.42, horse, 9);
  neck.rotation.x = 0.55;
  const mane = box(0.09, 1.05, 0.30, bronze, 0, TOP + 2.72, 1.16, horse, false);
  mane.rotation.x = 0.55;
  // head: skull + tapered muzzle angled down, two ear cones
  sph(0.30, 0.92, 1.0, 1.35, 0, TOP + 3.22, 1.86, horse);
  const muzzle = cyl(0.10, 0.155, 0.52, bronze, 0, TOP + 3.02, 2.18, horse, 8);
  muzzle.rotation.x = 1.05;
  for (const ex of [-0.11, 0.11]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), bronze);
    ear.position.set(ex, TOP + 3.52, 1.70); ear.rotation.x = -0.25; ear.castShadow = true;
    horse.add(ear);
  }
  // legs: two segments each. Front-left is raised (bent, hoof off the
  // stone) - the pose the real statue holds.
  function leg(lx, lz, raised) {
    if (raised) {
      const up = cyl(0.105, 0.135, 0.85, bronze, lx, TOP + 1.42, lz + 0.22, horse, 7);
      up.rotation.x = -0.85;
      const lo = cyl(0.075, 0.095, 0.72, bronze, lx, TOP + 1.02, lz + 0.52, horse, 7);
      lo.rotation.x = 0.75;
      box(0.15, 0.08, 0.24, bronze, lx, TOP + 0.70, lz + 0.42, horse, false);
    } else {
      cyl(0.11, 0.14, 0.88, bronze, lx, TOP + 1.28, lz, horse, 7);
      cyl(0.075, 0.10, 0.82, bronze, lx, TOP + 0.44, lz + 0.03, horse, 7);
      box(0.16, 0.09, 0.24, bronze, lx, TOP + 0.045, lz + 0.04, horse, false);
    }
  }
  leg(-0.30, 0.82, true);    // front-left raised
  leg(0.30, 0.82, false);    // front-right
  leg(-0.30, -0.85, false);  // hind-left
  leg(0.30, -0.85, false);   // hind-right
  // tail: two tapering segments flowing off the rump
  const tail1 = cyl(0.07, 0.13, 0.75, bronze, 0, TOP + 1.95, -1.52, horse, 7);
  tail1.rotation.x = -0.45;
  const tail2 = cyl(0.045, 0.07, 0.65, bronze, 0, TOP + 1.45, -1.72, horse, 7);
  tail2.rotation.x = -0.18;
  // saddle + draped blanket
  box(1.12, 0.34, 1.18, bronze, 0, TOP + 2.18, -0.05, horse, false);
  box(0.92, 0.13, 0.98, bronze, 0, TOP + 2.38, -0.05, horse, false);
  // the General: thighs down the horse's sides, torso, reins arm, tricorn
  for (const s of [-1, 1]) {
    const thigh = cyl(0.095, 0.115, 0.78, bronze, s * 0.44, TOP + 2.02, 0.12, horse, 7);
    thigh.rotation.z = s * -0.30; thigh.rotation.x = 0.35;
  }
  const torso = cyl(0.20, 0.27, 0.98, bronze, 0, TOP + 2.95, -0.10, horse, 9);
  torso.rotation.x = 0.07;
  const coat = cyl(0.36, 0.30, 0.42, bronze, 0, TOP + 2.48, -0.30, horse, 9);
  coat.rotation.x = -0.25;
  const armR = cyl(0.07, 0.085, 0.72, bronze, 0.34, TOP + 2.90, 0.28, horse, 6);
  armR.rotation.x = 0.85; armR.rotation.z = -0.35;
  const armL = cyl(0.07, 0.085, 0.70, bronze, -0.34, TOP + 2.82, -0.18, horse, 6);
  armL.rotation.z = 0.38;
  sph(0.20, 1, 1.08, 1, 0, TOP + 3.62, -0.06, horse); // head
  cyl(0.31, 0.31, 0.05, bronze, 0, TOP + 3.76, -0.06, horse, 12); // tricorn brim
  sph(0.19, 1, 0.62, 1, 0, TOP + 3.80, -0.06, horse);             // tricorn crown
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
