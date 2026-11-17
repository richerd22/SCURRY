// SCURRY - Fenway Park. The burrows run further than the park. One long
// westbound tunnel, older than the rest, ends under a ballpark: pop up
// behind home plate and the whole yard is yours - the Monster, the
// towers, a field kept for giants. No dogs here either. The security
// system continues to work.
//
// The park itself is the Garner / King / Thrall 3D Warehouse model (see
// assets-library/ATTRIBUTION.md), fetched as the Warehouse's own
// server-generated GLB after the SKP proved unconvertible in-sandbox.
// It lives far off-map at FEN (6000, 0, 6000), same trick as the Hollow
// and the Burrows. The squirrel is kept on the playing field by a
// polygon clamp; the stands are scenery you look at, not floors.
//
// Model calibration (from the survey, Nov 17): the SKP was built in
// yards - home -> mound measures 20.0 model units against the real
// 60.5 ft - so the GLB goes in at a uniform 0.9144. Home plate sits at
// model (-54, 6) and lands at Fenway-local (-35, 10). The model's own
// ground is a draped Google Earth photo sheet, lumpy by a metre or
// more - at a 0.25 m eye height those lumps are mountains: verified
// the hard way, the sheet alone filled the whole sky from behind home
// plate. The sheet is REMOVED at load (the architecture - bowl,
// Monster, towers, facades - is all real geometry and stays), the
// field is flat like a real ballfield, and the overlay + player
// ground come from a raycast height grid sampled off what remains,
// not from groundHeight().

import * as THREE from 'three';
import { S } from '../state.js';
import { loadModel } from './models.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { TUN } from './burrows.js';

// ---------------------------------------------------------------- layout
export const FEN = new THREE.Vector3(6000, 0, 6000);
const SCALE = 0.9144;
// group transform: game = FEN + T + model * SCALE, chosen so model home
// plate (-54, 6) lands on Fenway-local (-35, 10).
const T = { x: 14.38, z: 4.51 };
const HOME_L = { x: -35, z: 10 };
const HOLE_L = { x: -46, z: 17.3 };      // the burrow mouth, behind home
const AXIS = { x: 0.972, z: -0.236 };     // home -> deep centre, normalized

// The playing field, Fenway-local. Padded ~2.5 m inside the walls and
// ~17 m behind home (foul ground + the hole). Simple polygon, walked
// in order: behind home, up the third-base side, along the Monster,
// through centre, down to Pesky's corner, home again.
const FIELD = [
  [-52, 30], [-58, 2], [-60, -44], [-40, -53], [10, -55], [55, -51],
  [88, -36], [104, -8], [100, 20], [76, 26], [30, 33], [-25, 34],
];
const FIELD_C = { x: 22, z: -10 }; // rough centroid, for clamp nudges

// height grid over the field bbox (local coords), sampled off the GLB
const GRID = { minX: -62, maxX: 106, minZ: -57, maxZ: 36, nx: 42, nz: 24, h: null };

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

// bilinear sample of the raycast height grid; 0 outside / before sampling
function gridGround(lx, lz) {
  const G = GRID;
  if (!G.h) return 0;
  if (lx < G.minX || lx > G.maxX || lz < G.minZ || lz > G.maxZ) return 0;
  const fx = (lx - G.minX) / (G.maxX - G.minX) * (G.nx - 1);
  const fz = (lz - G.minZ) / (G.maxZ - G.minZ) * (G.nz - 1);
  const ix = Math.min(G.nx - 2, Math.floor(fx)), iz = Math.min(G.nz - 2, Math.floor(fz));
  const tx = fx - ix, tz = fz - iz;
  const i00 = iz * G.nx + ix;
  const a = G.h[i00], b = G.h[i00 + 1], c = G.h[i00 + G.nx], d = G.h[i00 + G.nx + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

// ------------------------------------------------------------ field paint
// A grounds-crew pass over the model's draped aerial photo: mow stripes
// along the home->centre axis, a dirt warning track inside the walls,
// the skin infield, foul lines. Drawn on a canvas in Fenway-local
// metres (u = x, v = z), clipped to the field polygon by alpha.
function fieldTexture() {
  const W = 2048, H = 1136;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const px = (x) => (x - GRID.minX) / (GRID.maxX - GRID.minX) * W;
  const pz = (z) => (z - GRID.minZ) / (GRID.maxZ - GRID.minZ) * H;
  const PM = W / (GRID.maxX - GRID.minX); // pixels per metre
  const path = () => {
    c.beginPath();
    FIELD.forEach(([x, z], i) => { if (i === 0) c.moveTo(px(x), pz(z)); else c.lineTo(px(x), pz(z)); });
    c.closePath();
  };
  path(); c.save(); c.clip();
  // mow stripes: bands perpendicular to the home->centre axis
  c.translate(px(HOME_L.x), pz(HOME_L.z));
  c.rotate(Math.atan2(AXIS.z, AXIS.x));
  for (let i = -14; i < 14; i++) {
    c.fillStyle = i % 2 ? '#41763a' : '#4a8140';
    c.fillRect(-500, i * 3.8 * PM, 3400, 3.8 * PM);
  }
  c.restore();
  path(); c.save(); c.clip();
  // warning track: a dirt stroke on the boundary - the outer half is
  // clipped by the second clip pass below, the inner half stays
  c.strokeStyle = '#8a5a38'; c.lineWidth = 4.4 * PM; c.lineJoin = 'round';
  c.stroke();
  c.strokeStyle = 'rgba(60,35,18,0.55)'; c.lineWidth = 0.5 * PM; c.stroke();
  c.restore();
  path(); c.save(); c.clip();
  // the skin infield
  const dirt = '#9c6a40';
  const base = (ang) => {
    const dx = AXIS.x * Math.cos(ang) - AXIS.z * Math.sin(ang);
    const dz = AXIS.x * Math.sin(ang) + AXIS.z * Math.cos(ang);
    return [HOME_L.x + dx * 27.43, HOME_L.z + dz * 27.43];
  };
  const b1 = base(Math.PI / 4), b3 = base(-Math.PI / 4);
  const b2 = [HOME_L.x + AXIS.x * 38.8, HOME_L.z + AXIS.z * 38.8];
  const mound = [HOME_L.x + AXIS.x * 18.44, HOME_L.z + AXIS.z * 18.44];
  c.fillStyle = dirt;
  c.beginPath(); c.arc(px(HOME_L.x), pz(HOME_L.z), 9.5 * PM, 0, 7); c.fill();
  c.strokeStyle = dirt; c.lineWidth = 2.1 * PM; c.lineCap = 'round';
  for (const [a, b] of [[[HOME_L.x, HOME_L.z], b1], [b1, b2], [b2, b3], [b3, [HOME_L.x, HOME_L.z]]]) {
    c.beginPath(); c.moveTo(px(a[0]), pz(a[1])); c.lineTo(px(b[0]), pz(b[1])); c.stroke();
  }
  for (const b of [b1, b2, b3]) { c.beginPath(); c.arc(px(b[0]), pz(b[1]), 3.1 * PM, 0, 7); c.fill(); }
  c.beginPath(); c.arc(px(mound[0]), pz(mound[1]), 2.7 * PM, 0, 7); c.fill();
  // foul lines, home through the corners
  c.strokeStyle = '#f4f1e6'; c.lineWidth = 0.22 * PM;
  for (const b of [b1, b3]) {
    const dx = b[0] - HOME_L.x, dz = b[1] - HOME_L.z, L = Math.hypot(dx, dz);
    c.beginPath();
    c.moveTo(px(HOME_L.x), pz(HOME_L.z));
    c.lineTo(px(HOME_L.x + dx / L * 150), pz(HOME_L.z + dz / L * 150));
    c.stroke();
  }
  // the bases themselves
  c.fillStyle = '#f8f6ee';
  for (const b of [b1, b2, b3]) c.fillRect(px(b[0]) - 3, pz(b[1]) - 3, 6, 6);
  c.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ------------------------------------------------------------------ build
let discovered = false;

export function buildFenway(scene) {
  if (typeof S.player.inFenway !== 'boolean') S.player.inFenway = false;
  const g = new THREE.Group();
  g.position.copy(FEN);

  // second sky dome: the park's is centred on the Common and the far
  // plane eats it from out here. Same material, same sky.
  if (S.skyMat) {
    const sky2 = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), S.skyMat);
    sky2.userData.isSky = true;
    g.add(sky2);
  }
  // a surround apron so the island's edge has something to sit on
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(760, 560),
    new THREE.MeshStandardMaterial({ color: 0x59544a, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.12;
  g.add(apron);

  // the hole home: a dirt mound ring + black mouth, burrow-style
  const mound = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.26, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x5a4026, roughness: 1 }));
  mound.rotation.x = Math.PI / 2; mound.position.set(HOLE_L.x, 0.1, HOLE_L.z);
  mound.scale.set(1, 1, 0.55); g.add(mound);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.56, 16),
    new THREE.MeshBasicMaterial({ color: 0x070403 }));
  mouth.rotation.x = -Math.PI / 2; mouth.position.set(HOLE_L.x, 0.16, HOLE_L.z);
  g.add(mouth);
  const holeSign = makeSign('THE LONG RUN', 1.7);
  holeSign.position.set(HOLE_L.x - 1.6, 0.85, HOLE_L.z + 0.4);
  holeSign.rotation.y = Math.PI / 2.6;
  g.add(holeSign);

  scene.add(g);

  // the park itself: async, best-effort, exactly like every other
  // sourced model in this game. The zone works (hole, signs, sky)
  // even if the GLB never lands.
  loadModel('assets/models/fenway.glb').then((tpl) => {
    if (!tpl) return;
    const park = tpl.scene;
    park.scale.setScalar(SCALE);
    park.position.set(FEN.x + T.x, 0, FEN.z + T.z);
    park.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    // drop the Google Earth ground sheet (see header): lumpy photo
    // terrain, fatal at squirrel height. Apron + field overlay are
    // the ground here.
    const sheets = [];
    park.traverse((o) => {
      if (o.isMesh && o.material && (o.material.name || '').includes('Google Earth')) sheets.push(o);
    });
    for (const m of sheets) if (m.parent) m.parent.remove(m);
    scene.add(park);
    sampleHeights(park);
    buildOverlay(scene, park);
  });

  // the burrow-side door: a dark mouth on the market's east wall.
  // Built here (not in burrows.js) so the tunnels stay untouched;
  // TUN coords, added straight to the scene.
  const door = new THREE.Group();
  const mouthW = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16),
    new THREE.MeshBasicMaterial({ color: 0x050302 }));
  mouthW.position.set(TUN.x + 51.96, 0.62, TUN.z);
  mouthW.rotation.y = -Math.PI / 2;
  door.add(mouthW);
  const s1 = makeSign('WESTBOUND', 1.9);
  s1.position.set(TUN.x + 51.94, 1.62, TUN.z);
  s1.rotation.y = -Math.PI / 2;
  door.add(s1);
  const s2 = makeSign('GREEN AT THE END OF IT', 2.2);
  s2.position.set(TUN.x + 51.94, 1.28, TUN.z + 2.6);
  s2.rotation.y = -Math.PI / 2;
  door.add(s2);
  scene.add(door);
}

// raycast the loaded park on a grid over the field: gives the overlay
// a surface to lie on and the player a ground to stand on.
const _rc = new THREE.Raycaster();
const _down = new THREE.Vector3(0, -1, 0);
const _org = new THREE.Vector3();
function sampleHeights(park) {
  const G = GRID;
  G.h = new Float32Array(G.nx * G.nz);
  for (let iz = 0; iz < G.nz; iz++) {
    for (let ix = 0; ix < G.nx; ix++) {
      const lx = G.minX + (G.maxX - G.minX) * ix / (G.nx - 1);
      const lz = G.minZ + (G.maxZ - G.minZ) * iz / (G.nz - 1);
      _org.set(FEN.x + lx, 60, FEN.z + lz);
      _rc.set(_org, _down);
      const hit = _rc.intersectObject(park, true)[0];
      let y = hit ? hit.point.y : 0;
      // stands / walls / towers also live in this bbox - anything
      // above field height is not ground, treat it as field level
      if (y > 2.0 || y < -1) y = 0;
      G.h[iz * G.nx + ix] = y;
    }
  }
}

function buildOverlay(scene, park) {
  const G = GRID;
  const w = G.maxX - G.minX, d = G.maxZ - G.minZ;
  const geo = new THREE.PlaneGeometry(w, d, G.nx - 1, G.nz - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i) + (G.minX + G.maxX) / 2;
    const lz = pos.getZ(i) + (G.minZ + G.maxZ) / 2;
    pos.setY(i, gridGround(lx, lz) + 0.045);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: fieldTexture(), transparent: true, alphaTest: 0.4, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(FEN.x + (G.minX + G.maxX) / 2, 0, FEN.z + (G.minZ + G.maxZ) / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// ------------------------------------------------------------------ init
function enterFenway() {
  const P = S.player;
  P.pos.set(FEN.x + HOLE_L.x + 2.6, 0.4, FEN.z + HOLE_L.z - 1.2);
  P.vel.set(0, 0, 0);
  P.yaw = -1.33; P.pitch = 0; // facing the field axis: home, grass, wall
  P.climbing = null; P.grounded = true;
  P.inHollow = false; P.inBurrow = false; P.inFenway = true;
  if (sfx.dig) sfx.dig();
  if (!discovered) {
    discovered = true;
    toast('FENWAY PARK. the long run ends at a ballpark. obviously.', 4.5);
  } else {
    toast('the yard again. mind the wall - it is not sorry.', 2.6);
  }
}

function exitFenway() {
  const P = S.player;
  P.pos.set(TUN.x + 48.5, 0, TUN.z + 2.2);
  P.vel.set(0, 0, 0);
  P.yaw = Math.PI / 2; P.pitch = 0;
  P.climbing = null; P.grounded = true;
  P.inFenway = false; P.inBurrow = true;
  if (sfx.dig) sfx.dig();
  toast('back underground. dirt, roots, retail.', 2.4);
}

export function initFenway() {
  if (typeof S.player.inFenway !== 'boolean') S.player.inFenway = false;
  // down the long run: the market's east wall, deep end of the burrows
  S.interactables.push({
    x: TUN.x + 50.4, z: TUN.z + 0, y: 0, r: 2.3,
    label: () => S.player.inBurrow ? 'E - take the long west run' : null,
    action: () => enterFenway(),
  });
  // and back: the hole behind home plate
  S.interactables.push({
    x: FEN.x + HOLE_L.x, z: FEN.z + HOLE_L.z, y: 0, r: 1.9,
    label: () => S.player.inFenway ? 'E - dive back to the burrows' : null,
    action: () => exitFenway(),
  });
}

// ---------------------------------------------------------------- update
export function updateFenway(dt) {
  const P = S.player;
  if (!P.inFenway) return;
  const lx = P.pos.x - FEN.x, lz = P.pos.z - FEN.z;
  if (Math.abs(lx) > 500 || Math.abs(lz) > 500) {
    // paranoia clamp, same spirit as the burrows hub deposit
    P.pos.set(FEN.x + HOLE_L.x + 2.6, 0.4, FEN.z + HOLE_L.z - 1.2);
    P.vel.set(0, 0, 0);
    toast('the grounds crew deposits you behind home plate. no questions.', 3);
    return;
  }
  if (!insidePoly(lx, lz, FIELD)) {
    const [bx, bz] = nearestOnPoly(lx, lz, FIELD);
    // settle a whisker inside the line, not on it
    P.pos.x = FEN.x + bx + (FIELD_C.x - bx) * 0.01;
    P.pos.z = FEN.z + bz + (FIELD_C.z - bz) * 0.01;
  }
  // the model's field is the ground here (groundHeight() is the
  // Common's, and it says 0) - stand on the sampled surface instead
  const gy = gridGround(P.pos.x - FEN.x, P.pos.z - FEN.z);
  if (P.pos.y < gy) {
    P.pos.y = gy;
    if (P.vel && P.vel.y < 0) P.vel.y = 0;
    P.grounded = true;
  }
}

// ------------------------------------------------------------ debug poses
// which: 'plate' | 'monster' | 'wall'
export function debugEnterFenway(which) {
  const P = S.player;
  P.inHollow = false; P.inBurrow = false; P.inFenway = true;
  P.climbing = null; P.vel.set(0, 0, 0); P.grounded = true;
  discovered = true;
  if (which === 'monster') {
    P.pos.set(FEN.x + 55, 0.5, FEN.z - 18);
    P.yaw = 0.15; P.pitch = 0.12; // open centre field, facing the wall
  } else if (which === 'wall') {
    P.pos.set(FEN.x + 2, 0.5, FEN.z - 38);
    P.yaw = 0; P.pitch = 0.42; // at the Monster's feet, looking up
  } else { // 'plate'
    P.pos.set(FEN.x + HOLE_L.x + 2.6, 0.4, FEN.z + HOLE_L.z - 1.2);
    P.yaw = -1.33; P.pitch = 0.02;
  }
}
