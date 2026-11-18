// SCURRY - City Hall Plaza. The burrows run east too: one old tunnel
// ends under Government Center, and a squirrel pops up through a
// planter on the plaza - eleven acres of brick, one enormous concrete
// argument of a building, and nobody around to argue with. The plaza
// is empty. The pigeons have opinions but they keep them to
// themselves. No dogs here either.
//
// The building is the BPDA / City of Boston 3D model of Boston City
// Hall (tile BOS_H_4, CyberCity 3D LOD 1.5 photogrammetry shell -
// see assets-library/ATTRIBUTION.md, Boston City Hall row). Terms are
// PDDL (City of Boston open data) - clean to ship, attributed. The
// haul's detailed City Hall SKPs are terms-unknown and were used as
// reference only; they are NOT in this game. The shell is a massing
// model - exterior only, one untextured material - so the plaza
// around it is composed in code: brick plaza, podium + ceremonial
// steps, terraced fountain, Government Center headhouse, planters,
// lamps, streetwall backdrop shells.
//
// It lives far off-map at CH (6000, 0, 3000) - due east of the
// Common, clear of Fenway (6000, 0, 6000), TD Garden (-6000, 0,
// 6000), the Burrows (3000, 0, 3000) and the Hollow (1000, 0, 1000).
// The anchor's z is +3000 on purpose, NOT -6000: groundHeight()'s
// State House terrace term (8.0 * smooth01((x-146)/26) *
// smooth01((-z-50)/22)) extends infinitely over the x > 172,
// z < -72 quadrant, so a (6000, -6000) plaza would stand on an 8 m
// phantom plateau the destination ground cannot argue with. Due
// east at z +3000 the heightfield answers a clean flat 0. Reachable
// like the others: a door in the rat market (SOUTH wall - the stall
// owns the north, Fenway the east, the other Garden the west),
// signed EASTBOUND / CITY HALL, "E - take the east run" -> emergence
// through a plaza planter just south of the steps, "E - dive back
// to the burrows" returns to the market.
//
// Model calibration: the banked GLB is already in game-local metres
// (bounds x -44.99..44.99, y 0..55.86, z -64.07..64.07; the BPDA
// catalog's Height_Ft 184.4 agrees). It goes in rotated 90 degrees
// (long axis east-west, like the real building on its site), seated
// on the plaza podium at y 1.5, its face 13 m north of the podium
// edge. Ground here is analytic, not sampled: the plaza is flat
// brick, the podium + steps + fountain are code-built boxes with
// known heights, so cityGround() answers from the layout table.
// The clamp is a polygon: the plaza rectangle plus the podium
// terrace strip in front of the facade - the building itself is
// scenery you stand in front of, not a floor.

import * as THREE from 'three';
import { S } from '../state.js';
import { loadModel } from './models.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { TUN, spawnCapAt } from './burrows.js';
import { spawnFood } from './food.js';

// ---------------------------------------------------------------- layout
export const CH = new THREE.Vector3(6000, 0, 3000);
const PODIUM_Y = 1.5;
const HOLE_L = { x: 14, z: 4 };          // the burrow mouth, in its planter
const BLDG = { cx: 0, cz: -58 };         // the shell's seat on the podium

// podium: x -78..78, z -108..-6, top at PODIUM_Y. The building's
// footprint (after the 90-degree turn) is x -64.07..64.07,
// z -102.99..-13.01 - the terrace strip in front of the facade is
// z -13.01..-6.
const PODIUM = { x0: -78, x1: 78, z0: -108, z1: -6 };
// ceremonial steps down the podium's south face, full width:
// z -6..-4 answers 1.0, z -4..-2 answers 0.5, plaza (0) from -2.
const FOUNTAIN = { cx: 28, cz: 45, x0: 20, x1: 36, z0: 40, z1: 50, rimY: 0.5, waterY: 0.12 };
const FOUNTAIN_WATER = { x0: 21.2, x1: 34.8, z0: 41.2, z1: 48.8 };

// the walkable world: plaza rectangle + the podium terrace strip.
// Walked in order; the notch at z -2..-12.4 for |x| < 78 is the
// steps + terrace, the facade line itself (z -13.01) stays scenery.
const CLAMP = [
  [-95, 95], [95, 95], [95, -2], [78, -2], [78, -12.4],
  [-78, -12.4], [-78, -2], [-95, -2],
];
const CLAMP_C = { x: 0, z: 30 };

// the ground, from the layout table (see header). Plaza brick is 0.
function cityGround(lx, lz) {
  if (lx >= FOUNTAIN_WATER.x0 && lx <= FOUNTAIN_WATER.x1 &&
      lz >= FOUNTAIN_WATER.z0 && lz <= FOUNTAIN_WATER.z1) return FOUNTAIN.waterY;
  if (lx >= FOUNTAIN.x0 && lx <= FOUNTAIN.x1 &&
      lz >= FOUNTAIN.z0 && lz <= FOUNTAIN.z1) return FOUNTAIN.rimY;
  if (lx >= PODIUM.x0 && lx <= PODIUM.x1 && lz >= PODIUM.z0 && lz < PODIUM.z1) return PODIUM_Y;
  if (lx >= PODIUM.x0 && lx <= PODIUM.x1) {
    if (lz >= -6 && lz < -4) return 1.0;
    if (lz >= -4 && lz < -2) return 0.5;
  }
  return 0;
}

// ------------------------------------------------------------- tiny utils
function makeSign(text, w = 2.0) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 72;
  const c = cv.getContext('2d');
  c.fillStyle = '#4a3420'; c.fillRect(0, 0, 512, 72);
  c.fillStyle = '#f2e2b8'; c.font = 'bold 30px monospace'; c.textAlign = 'center';
  c.fillText(text, 256, 47);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 72 / 512),
    new THREE.MeshBasicMaterial({ map: tex }));
}

function insidePoly(x, z, poly) {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ok = !ok;
  }
  return ok;
}

function nearestOnPoly(x, z, poly) {
  let bd = 1e18, bx = x, bz = z;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1], bx2 = poly[i][0], bz2 = poly[i][1];
    const dx = bx2 - ax, dz = bz2 - az;
    const L2 = dx * dx + dz * dz;
    let t = L2 > 0 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t, pz = az + dz * t;
    const d = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d < bd) { bd = d; bx = px; bz = pz; }
  }
  return [bx, bz];
}

// ------------------------------------------------------------ textures
// The plaza's brick: warm red-brown courses with per-brick variance,
// drawn once, repeated over the slab + podium top. City Hall Plaza is
// famous brick - it should read brick at 25 cm, not "brown plane".
function brickTexture(rx, ry) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const c = cv.getContext('2d');
  let seed = 4241;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  c.fillStyle = '#5d4034'; c.fillRect(0, 0, 512, 512); // mortar
  const bh = 16, bw = 42;
  for (let row = 0; row * bh < 512; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < 512; col++) {
      const v = (rnd() - 0.5) * 22;
      const r = 128 + v + rnd() * 14, g = 78 + v * 0.7, b = 54 + v * 0.5;
      c.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      c.fillRect(col * bw + off + 1.5, row * bh + 1.5, bw - 3, bh - 3);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 4;
  return tex;
}

// Backdrop-shell facades: one window-grid canvas for the day read,
// and a second canvas with only ~18% of the windows lit for the
// night emissive (daycycle drives S.cityMats emissiveIntensity).
function facadeTextures() {
  const W = 256, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const lit = document.createElement('canvas'); lit.width = W; lit.height = H;
  const lc = lit.getContext('2d');
  lc.fillStyle = '#000'; lc.fillRect(0, 0, W, H);
  let seed = 777;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  c.fillStyle = '#a39a8b'; c.fillRect(0, 0, W, H);
  const cols = 8, rows = 18, cw = W / cols, rh = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + 7, y = r * rh + 6, w = cw - 14, h = rh - 12;
      const warm = rnd() < 0.18;
      c.fillStyle = warm ? '#7d6a4d' : '#4a5560';
      c.fillRect(x, y, w, h);
      if (warm) { lc.fillStyle = '#ffb46b'; lc.fillRect(x, y, w, h); }
    }
  }
  const day = new THREE.CanvasTexture(cv); day.colorSpace = THREE.SRGBColorSpace;
  const night = new THREE.CanvasTexture(lit); night.colorSpace = THREE.SRGBColorSpace;
  return { day, night };
}

// the T roundel: a ring and a T. You know the one.
function roundelTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#20242a'; c.fillRect(0, 0, 128, 128);
  c.beginPath(); c.arc(64, 64, 52, 0, 7);
  c.fillStyle = '#e8e6df'; c.fill();
  c.beginPath(); c.arc(64, 64, 44, 0, 7);
  c.fillStyle = '#20242a'; c.fill();
  c.fillStyle = '#e8e6df'; c.font = 'bold 62px sans-serif'; c.textAlign = 'center';
  c.fillText('T', 64, 86);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ------------------------------------------------------------- plaza sky
// Fenway's arrangement, copied: the park's dome is centred on the
// Common, so every far realm carries its own - same shared materials,
// stars + clouds built lazily on first update (daycycle owns the
// shared materials and may not have made them at build time).
const chClouds = [];
let chSkyBuilt = false;
function buildCitySky(scene) {
  if (chSkyBuilt || !S.starMat || !S.cloudMat) return;
  chSkyBuilt = true;
  const starPos = [];
  let seed = 5150;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 380; i++) {
    const a = rnd() * Math.PI * 2, e = 0.08 + rnd() * 1.35, r = 850;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, S.starMat);
  stars.position.copy(CH);
  scene.add(stars);
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(S.cloudMat);
    const a = rnd() * Math.PI * 2, r = 240 + rnd() * 380;
    sp.position.set(CH.x + Math.cos(a) * r, 95 + rnd() * 85, CH.z + Math.sin(a) * r);
    const sc = 150 + rnd() * 190;
    sp.scale.set(sc, sc * 0.36, 1);
    scene.add(sp);
    chClouds.push({ sp, speed: 0.7 + rnd() * 0.9 });
  }
}

// ------------------------------------------------------------------ build
let discovered = false;
const plazaLights = [];   // PointLights driven by S.lampFactor
let jetMat = null;        // the fountain jet's material (pulsed in update)

export function buildCityHall(scene) {
  // Give the controller the destination's true ground BEFORE motion occurs.
  Object.assign(S.realmGround, { cityhall: (x, z) => cityGround(x - CH.x, z - CH.z) });
  if (typeof S.player.inCityHall !== 'boolean') S.player.inCityHall = false;
  const g = new THREE.Group();
  g.position.copy(CH);

  // own sky dome, same as every far realm (see header)
  if (S.skyMat) {
    const sky2 = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), S.skyMat);
    sky2.userData.isSky = true;
    g.add(sky2);
  }
  // the island's surround: asphalt streets at apron level
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(520, 470),
    new THREE.MeshStandardMaterial({ color: 0x43454a, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.12;
  apron.receiveShadow = true;
  g.add(apron);

  const concrete = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.95 });
  const granite = new THREE.MeshStandardMaterial({ color: 0x7d7a72, roughness: 0.9 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2e3236, roughness: 0.55, metalness: 0.6 });

  // ---- the plaza slab: brick, x -95..95, z -2..97
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(190, 99),
    new THREE.MeshStandardMaterial({ map: brickTexture(24, 12), roughness: 1 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0, 47.5);
  plaza.receiveShadow = true;
  g.add(plaza);

  // ---- podium + steps
  const podium = new THREE.Mesh(new THREE.BoxGeometry(156, PODIUM_Y, 102), concrete);
  podium.position.set(0, PODIUM_Y / 2, -57);
  podium.castShadow = true; podium.receiveShadow = true;
  g.add(podium);
  const podiumTop = new THREE.Mesh(new THREE.PlaneGeometry(156, 102),
    new THREE.MeshStandardMaterial({ map: brickTexture(20, 13), roughness: 1 }));
  podiumTop.rotation.x = -Math.PI / 2;
  podiumTop.position.set(0, PODIUM_Y + 0.005, -57);
  podiumTop.receiveShadow = true;
  g.add(podiumTop);
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(156, 1.0, 2), granite);
  step1.position.set(0, 0.5, -5); step1.castShadow = true; step1.receiveShadow = true; g.add(step1);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(156, 0.5, 2), granite);
  step2.position.set(0, 0.25, -3); step2.castShadow = true; step2.receiveShadow = true; g.add(step2);

  // ---- the fountain: rim ring, wading water, a modest jet
  const rimMat = granite;
  const rimN = new THREE.Mesh(new THREE.BoxGeometry(16, FOUNTAIN.rimY, 1.2), rimMat);
  rimN.position.set(FOUNTAIN.cx, FOUNTAIN.rimY / 2, 40.6); g.add(rimN);
  const rimS = rimN.clone(); rimS.position.z = 49.4; g.add(rimS);
  const rimE = new THREE.Mesh(new THREE.BoxGeometry(1.2, FOUNTAIN.rimY, 7.6), rimMat);
  rimE.position.set(35.4, FOUNTAIN.rimY / 2, FOUNTAIN.cz); g.add(rimE);
  const rimW = rimE.clone(); rimW.position.x = 20.6; g.add(rimW);
  for (const m of [rimN, rimS, rimE, rimW]) { m.castShadow = true; m.receiveShadow = true; }
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 7.6),
    new THREE.MeshStandardMaterial({ color: 0x27333a, roughness: 1 }));
  basin.rotation.x = -Math.PI / 2; basin.position.set(FOUNTAIN.cx, 0.06, FOUNTAIN.cz); g.add(basin);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 7.6),
    new THREE.MeshStandardMaterial({
      color: 0x2e5f6e, roughness: 0.15, metalness: 0.1,
      transparent: true, opacity: 0.88,
    }));
  water.rotation.x = -Math.PI / 2; water.position.set(FOUNTAIN.cx, 0.3, FOUNTAIN.cz); g.add(water);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.3, 8), darkMetal);
  nozzle.position.set(FOUNTAIN.cx, 0.4, FOUNTAIN.cz); g.add(nozzle);
  jetMat = new THREE.MeshBasicMaterial({
    color: 0xcfe8ee, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.15, 10, 1, true), jetMat);
  jet.position.set(FOUNTAIN.cx, 1.05, FOUNTAIN.cz);
  g.add(jet);

  // ---- Government Center headhouse: glass box, roof slab, roundel,
  // and the stair down to a station nobody staffs for squirrels
  const hh = new THREE.Group();
  const hhBase = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.5, 5.4), concrete);
  hhBase.position.y = 0.25; hhBase.castShadow = true; hh.add(hhBase);
  const hhGlass = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.3, 4.8),
    new THREE.MeshStandardMaterial({
      color: 0x9fb6bd, roughness: 0.12, metalness: 0.4,
      transparent: true, opacity: 0.55, emissive: 0xffc37a, emissiveIntensity: 0.05,
    }));
  hhGlass.position.y = 1.65; hh.add(hhGlass);
  if (S.cityMats) S.cityMats.push(hhGlass.material);
  const hhRoof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.28, 5.8), darkMetal);
  hhRoof.position.y = 2.95; hhRoof.castShadow = true; hh.add(hhRoof);
  const roundel = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: roundelTexture() }));
  roundel.position.set(0, 2.1, 2.72); hh.add(roundel);
  const hhSign = makeSign('GOVERNMENT CENTER', 3.4);
  hhSign.position.set(0, 1.15, 2.73); hh.add(hhSign);
  hh.position.set(62, 0, 10);
  g.add(hh);
  // the stair pit beside it: dark slot, iron rail, no bottom you can see
  const pit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 5.2),
    new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
  pit.position.set(56.5, 0.03, 10); g.add(pit);
  for (const dz of [-2.6, 2.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.06), darkMetal);
    rail.position.set(56.5, 0.85, 10 + dz); g.add(rail);
  }
  for (const dx of [-1.65, 1.65]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 5.3), darkMetal);
    rail.position.set(56.5 + dx, 0.85, 10); g.add(rail);
  }

  // ---- planters: concrete boxes, dirt, shrub blobs. One of them
  // has a hole in it. The city has not been notified.
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x4d3620, roughness: 1 });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x39543a, roughness: 1 });
  function planter(cx, cz, w, d) {
    const p = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, d), concrete);
    box.position.y = 0.275; box.castShadow = true; box.receiveShadow = true; p.add(box);
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.5, d - 0.5), dirtMat);
    dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.56; p.add(dirt);
    const n = Math.max(2, Math.floor(w / 1.6));
    for (let i = 0; i < n; i++) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.42 + (i % 3) * 0.08, 8, 6), shrubMat);
      shrub.scale.set(1.25, 0.7, 1);
      shrub.position.set(-w / 2 + 0.9 + (w - 1.8) * (n === 1 ? 0.5 : i / (n - 1)), 0.78, (i % 2 ? 0.25 : -0.25) * d * 0.3);
      shrub.castShadow = true;
      p.add(shrub);
    }
    p.position.set(cx, 0, cz);
    g.add(p);
    return p;
  }
  planter(-40, 20, 9, 2.2);
  planter(44, 20, 9, 2.2);
  planter(-52, 52, 2.2, 9);
  planter(56, 74, 9, 2.2);
  planter(-58, 82, 9, 2.2);
  // the emergence planter: the hole gets its own bed at (14, 4),
  // shrubs flanking instead of over the mouth
  const hbed = new THREE.Group();
  const hbox = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.55, 3.6), concrete);
  hbox.position.y = 0.275; hbox.castShadow = true; hbox.receiveShadow = true; hbed.add(hbox);
  const hdirt = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 3.1), dirtMat);
  hdirt.rotation.x = -Math.PI / 2; hdirt.position.y = 0.56; hbed.add(hdirt);
  for (const sx of [-1.9, 1.9]) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 6), shrubMat);
    shrub.scale.set(1.25, 0.7, 1); shrub.position.set(sx, 0.78, 0); shrub.castShadow = true; hbed.add(shrub);
  }
  hbed.position.set(HOLE_L.x, 0, HOLE_L.z);
  g.add(hbed);
  // the hole home: dirt mound ring + black mouth, burrow-style,
  // sitting in the planter bed
  const mound = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.26, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x5a4026, roughness: 1 }));
  mound.rotation.x = Math.PI / 2; mound.position.set(HOLE_L.x, 0.66, HOLE_L.z);
  mound.scale.set(1, 1, 0.55); g.add(mound);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.56, 16),
    new THREE.MeshBasicMaterial({ color: 0x070403 }));
  mouth.rotation.x = -Math.PI / 2; mouth.position.set(HOLE_L.x, 0.72, HOLE_L.z);
  g.add(mouth);
  // the sign stands on a post at the bed's south edge, facing the
  // plaza - readable on approach, the way the other realms sign
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1 }));
  signPost.position.set(HOLE_L.x + 3.5, 0.5, HOLE_L.z + 2.3);
  g.add(signPost);
  const holeSign = makeSign('CITY HALL PLAZA', 1.9);
  holeSign.position.set(HOLE_L.x + 3.5, 1.12, HOLE_L.z + 2.3);
  g.add(holeSign);

  // ---- benches: slatted seat + back on two legs, plaza furniture
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 });
  function bench(cx, cz, ry) {
    const b = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.55), woodMat);
    seat.position.y = 0.45; seat.castShadow = true; b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.06), woodMat);
    back.position.set(0, 0.78, -0.27); back.rotation.x = -0.16; b.add(back);
    for (const sx of [-0.95, 0.95]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.45, 0.5), darkMetal);
      leg.position.set(sx, 0.225, 0); b.add(leg);
    }
    b.position.set(cx, 0, cz); b.rotation.y = ry;
    g.add(b);
  }
  bench(-14, 44, Math.PI / 2);   // facing the fountain
  bench(44, 45, -Math.PI / 2);   // facing the fountain, other side
  bench(-30, 8, 0);              // facing the steps
  bench(30, 84, Math.PI);        // facing the building from the far end

  // ---- lamps: posts with warm bulbs (cityMats, so daycycle warms
  // them after dark) + two real PointLights on the lamp factor
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x554a38, emissive: 0xffc37a, emissiveIntensity: 0.05, roughness: 0.4,
  });
  if (S.cityMats) S.cityMats.push(bulbMat);
  const lampSpots = [[-62, 24], [-24, 60], [52, 30], [66, 62], [-66, 78], [24, 78]];
  for (const [lx, lz] of lampSpots) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.4, 7), darkMetal);
    pole.position.set(lx, 2.2, lz); pole.castShadow = true; g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), bulbMat);
    bulb.position.set(lx, 4.5, lz); g.add(bulb);
  }
  for (const [lx, lz] of [[-24, 60], [52, 30]]) {
    const L = new THREE.PointLight(0xffe2b0, 0, 130, 2);
    L.position.set(CH.x + lx, 5.2, CH.z + lz);
    scene.add(L);
    plazaLights.push(L);
  }

  // ---- backdrop streetwall: code shells wearing a window grid,
  // ringing the plaza a street away. Backdrop, deliberately - the
  // clamp keeps squirrels on the plaza, same call as Fenway's hood.
  const { day, night } = facadeTextures();
  const shellTints = [0xd8d0c2, 0xcac2b2, 0xd2c8b8];
  let shellSeed = 31415;
  const srnd = () => { shellSeed = (shellSeed * 16807) % 2147483647; return (shellSeed - 1) / 2147483646; };
  function shell(cx, cz, w, h, d, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        map: day, emissive: 0xffb46b, emissiveMap: night, emissiveIntensity: 0.05,
        roughness: 0.95, color: shellTints[Math.floor(srnd() * shellTints.length)],
      }));
    if (S.cityMats) S.cityMats.push(m.material);
    m.position.set(cx, h / 2 - 0.12, cz);
    m.rotation.y = ry;
    g.add(m);
  }
  for (let i = 0; i < 6; i++) shell(-100 + i * 40 + srnd() * 6, 124, 30 + srnd() * 8, 26 + srnd() * 26, 24, 0);       // south, across Congress
  for (let i = 0; i < 5; i++) shell(124, -16 + i * 30 + srnd() * 5, 24, 24 + srnd() * 30, 28 + srnd() * 8, Math.PI / 2); // east
  for (let i = 0; i < 5; i++) shell(-124, -16 + i * 30 + srnd() * 5, 24, 24 + srnd() * 26, 28 + srnd() * 8, Math.PI / 2); // west
  for (let i = 0; i < 4; i++) shell(-84 + i * 56 + srnd() * 6, -138, 34 + srnd() * 10, 30 + srnd() * 24, 26, 0);      // north, behind the hall

  scene.add(g);

  // the building itself: async, best-effort, exactly like every other
  // sourced model in this game. The zone works (plaza, hole, signs,
  // fountain) even if the GLB never lands.
  loadModel('assets/models/cityhall.glb').then((tpl) => {
    if (!tpl) return;
    const hall = tpl.scene;
    hall.rotation.y = Math.PI / 2; // long axis east-west
    hall.position.set(CH.x + BLDG.cx, PODIUM_Y, CH.z + BLDG.cz);
    hall.traverse((o) => {
      if (o.isMesh) {
        // the source material is an untextured photogrammetry grey;
        // the real building is warm concrete + brick - one warm tone
        // is the honest LOD read at plaza distance
        o.material = new THREE.MeshStandardMaterial({ color: 0xa39482, roughness: 0.95 });
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(hall);
    // No bolt-on dressing on the shell, deliberately: three
    // attempts (flat fins, vertex-sampled fins, raycast fins)
    // all fought the envelope. The measured truth (raycast
    // height grid, harness/chprobe4.js): this is a stepped
    // wedding-cake massing - a low wing edge at the southern
    // extreme, the tall face ~8 m behind it stepping 24 m ->
    // 43.5 m, the 55.86 m crown mid-roof. It already HAS the
    // building's distinctive profile; what reads flat in
    // shadowless lowq stills is the single untextured
    // material, and production env light + shadows carry it,
    // same as every other sourced model in this game. The
    // plaza composition around it is the dressing.
    // a little life: the plaza is empty, but things get dropped.
    // Caps ride the burrows machinery, food rides food.js - the
    // trophy cap sits on the podium terrace in front of the facade,
    // because a squirrel earned this view.
    spawnCapAt(CH.x + 0, CH.z - 9.5, PODIUM_Y + 0.04, 40);
    spawnCapAt(CH.x + 0, CH.z - 3, 0.5 + 0.04, 41);
    spawnCapAt(CH.x + FOUNTAIN.cx, CH.z + 49.3, FOUNTAIN.rimY + 0.04, 42);
    spawnCapAt(CH.x + 62, CH.z + 14.5, 0.04, 43);
    spawnCapAt(CH.x - 80, CH.z + 82, 0.04, 44);
    spawnFood('pretzel', CH.x + 58, CH.z + 16, { y: 0.05 });
    spawnFood('peanut', CH.x - 30, CH.z + 66, { y: 0.05 });
    spawnFood('peanut', CH.x + 10, CH.z + 55, { y: 0.05 });
  });

  // the burrow-side door: a dark mouth on the market's SOUTH wall
  // (the stall owns the north wall, Fenway owns the east, the other
  // Garden owns the west). TUN coords, added straight to the scene,
  // built here so burrows.js is untouched.
  const door = new THREE.Group();
  const mouthW = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16),
    new THREE.MeshBasicMaterial({ color: 0x050302 }));
  mouthW.position.set(TUN.x + 45, 0.62, TUN.z + 5.96);
  mouthW.rotation.y = Math.PI;
  door.add(mouthW);
  const s1 = makeSign('EASTBOUND', 1.9);
  s1.position.set(TUN.x + 45, 1.62, TUN.z + 5.94);
  s1.rotation.y = Math.PI;
  door.add(s1);
  const s2 = makeSign('CITY HALL', 2.2);
  s2.position.set(TUN.x + 47.7, 1.28, TUN.z + 5.94);
  s2.rotation.y = Math.PI;
  door.add(s2);
  scene.add(door);
}

// ------------------------------------------------------------------ init
function enterCityHall() {
  const P = S.player;
  P.pos.set(CH.x + HOLE_L.x + 2.6, 0.4, CH.z + HOLE_L.z - 1.2);
  P.vel.set(0, 0, 0);
  // face the building: podium, steps, and 56 m of concrete manners
  P.yaw = Math.atan2(-(0 - (HOLE_L.x + 2.6)), -(-20 - (HOLE_L.z - 1.2)));
  P.pitch = 0.05;
  P.climbing = null; P.grounded = true;
  P.inHollow = false; P.inBurrow = false; P.inFenway = false; P.inGarden = false; P.inCityHall = true;
  if (sfx.dig) sfx.dig();
  if (!discovered) {
    discovered = true;
    toast('CITY HALL. nine floors of argument, poured in concrete.', 4.5);
  } else {
    toast('city hall again. the plaza is empty. the building is still winning.', 2.6);
  }
}

function exitCityHall() {
  const P = S.player;
  P.pos.set(TUN.x + 45, 0, TUN.z + 3.2);
  P.vel.set(0, 0, 0);
  P.yaw = 0; P.pitch = 0; // facing into the market, stall ahead
  P.climbing = null; P.grounded = true;
  P.inCityHall = false; P.inBurrow = true;
  if (sfx.dig) sfx.dig();
  toast('back underground. the rats hold a meeting about the plaza. it goes better than most.', 2.4);
}

export function initCityHall() {
  if (typeof S.player.inCityHall !== 'boolean') S.player.inCityHall = false;
  // down the east run: the market's south wall, room centre
  S.interactables.push({
    x: TUN.x + 45, z: TUN.z + 4.4, y: 0, r: 2.3,
    label: () => S.player.inBurrow ? 'E - take the east run' : null,
    action: () => enterCityHall(),
  });
  // and back: the hole in the planter by the steps
  S.interactables.push({
    x: CH.x + HOLE_L.x, z: CH.z + HOLE_L.z, y: 0, r: 1.9,
    label: () => S.player.inCityHall ? 'E - dive back to the burrows' : null,
    action: () => exitCityHall(),
  });
}

// ---------------------------------------------------------------- update
let elapsed = 0;
export function updateCityHall(dt) {
  elapsed += dt;
  if (!chSkyBuilt) buildCitySky(S.scene);
  for (const c of chClouds) {
    c.sp.position.x += c.speed * dt;
    if (c.sp.position.x > CH.x + 430) c.sp.position.x = CH.x - 430;
  }
  const lamp = S.lampFactor || 0;
  for (const L of plazaLights) L.intensity = lamp * 700;
  if (jetMat) jetMat.opacity = 0.3 + 0.14 * Math.sin(elapsed * 7.3) + 0.06 * Math.sin(elapsed * 17.7);

  const P = S.player;
  if (!P.inCityHall) return;
  const lx = P.pos.x - CH.x, lz = P.pos.z - CH.z;
  if (Math.abs(lx) > 500 || Math.abs(lz) > 500) {
    // paranoia clamp, same spirit as the other realms' grounds crews
    P.pos.set(CH.x + HOLE_L.x + 2.6, 0.4, CH.z + HOLE_L.z - 1.2);
    P.vel.set(0, 0, 0);
    toast('a city worker deposits you back on the plaza. no permit, no entry.', 3);
    return;
  }
  if (!insidePoly(lx, lz, CLAMP)) {
    const [bx, bz] = nearestOnPoly(lx, lz, CLAMP);
    // settle a whisker inside the line, not on it
    const dx = CLAMP_C.x - bx, dz = CLAMP_C.z - bz, dl = Math.hypot(dx, dz) || 1;
    P.pos.x = CH.x + bx + dx / dl * 0.3;
    P.pos.z = CH.z + bz + dz / dl * 0.3;
  }
  // the plaza's surfaces are the ground here (groundHeight() is the
  // Common's, and it says 0) - stand on the layout instead
  const gy = cityGround(P.pos.x - CH.x, P.pos.z - CH.z);
  if (P.pos.y < gy) {
    P.pos.y = gy;
    if (P.vel && P.vel.y < 0) P.vel.y = 0;
    P.grounded = true;
  }
}

// ------------------------------------------------------------ debug poses
// which: 'emerge' | 'plaza' | 'facade' | 'return' | 'door'
// ('door' poses in the market, facing the new south-wall door.)
export function debugEnterCityHall(which) {
  const P = S.player;
  P.climbing = null; P.vel.set(0, 0, 0); P.grounded = true;
  discovered = true;
  if (which === 'door') {
    P.inHollow = false; P.inBurrow = true; P.inFenway = false; P.inGarden = false; P.inCityHall = false;
    P.pos.set(TUN.x + 45, 0, TUN.z + 1.2);
    P.yaw = Math.PI; // face south, straight at the EASTBOUND door
    P.pitch = 0.02;
    return;
  }
  P.inHollow = false; P.inBurrow = false; P.inFenway = false; P.inGarden = false; P.inCityHall = true;
  if (which === 'plaza') {
    // the wide: south-east corner of the plaza, the whole composition
    P.pos.set(CH.x + 80, 0.4, CH.z + 84);
    P.yaw = Math.atan2(-(0 - 80), -(-30 - 84));
    P.pitch = 0.02;
  } else if (which === 'facade') {
    // the straight-on elevation from mid-plaza: steps, podium,
    // the stepped face and the crown in one squirrel-height frame
    P.pos.set(CH.x + 0, 0.4, CH.z + 55);
    P.yaw = Math.atan2(-(0 - 0), -(-25 - 55));
    P.pitch = 0.18;
  } else if (which === 'return') {
    // on the plaza south of the planter, facing the hole you'd
    // dive back down - sign in front, the hall behind it
    P.pos.set(CH.x + HOLE_L.x, 0.4, CH.z + HOLE_L.z + 7);
    P.yaw = 0; // due north
    P.pitch = -0.02;
  } else { // 'emerge'
    P.pos.set(CH.x + HOLE_L.x + 2.6, 0.4, CH.z + HOLE_L.z - 1.2);
    P.yaw = Math.atan2(-(0 - (HOLE_L.x + 2.6)), -(-20 - (HOLE_L.z - 1.2)));
    P.pitch = 0.05;
  }
}
