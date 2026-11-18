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
// polygon clamp; the stands are scenery you look at, not floors - with
// one exception (v0.6.23): the Monster is climbable, scramble up the
// face and walk the top. The towers also burn at night now.
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
import { TUN, spawnCapAt } from './burrows.js';
import { spawnFood } from './food.js';

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

// The Monster (v0.6.23): the wall in left field is climbable now. Surveyed
// from the GLB (Nov 17): the facade mesh runs x -30.9..5.5, face plane
// z -53.3, top y 7.3; behind it the seats rise to 8.9 at z -58. A squirrel
// scrambles the face (STRIP ramp, field side) and walks the top ledge
// (TOP). No new physics - the Fenway ground function just answers these
// two zones before the field grid. The field polygon overlaps both, so
// zone priority is TOP > STRIP > FIELD.
const MONSTER = { x0: -30.9, x1: 5.5, faceZ: -53.3, topY: 7.3, backY: 8.9, backZ: -57.6 };
const STRIP = [[-30.9, -49.3], [5.5, -49.3], [5.5, -53.3], [-30.9, -53.3]];
const TOP = [[-30.9, -53.3], [5.5, -53.3], [5.5, -57.6], [-30.9, -57.6]];
const TOP_C = { x: -12.7, z: -55.45 };

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

// The Fenway ground: Monster ledge, then the climb ramp, then the field
// grid. The ramp is a smoothstep from field level at its outer edge to
// the wall top at the face - a squirrel scramble, steep but honest.
function fenGround(lx, lz) {
  if (insidePoly(lx, lz, TOP)) {
    return MONSTER.topY + (MONSTER.backY - MONSTER.topY) * ((MONSTER.faceZ - lz) / (MONSTER.faceZ - MONSTER.backZ));
  }
  if (insidePoly(lx, lz, STRIP)) {
    const t = (STRIP[0][1] - lz) / (STRIP[0][1] - MONSTER.faceZ);
    const s = t * t * (3 - 2 * t);
    return MONSTER.topY * s;
  }
  return gridGround(lx, lz);
}

// nearest point on any of the three walkable zones, for the clamp
function nearestFenPoint(lx, lz) {
  let bd = 1e18, bx = lx, bz = lz, bc = FIELD_C;
  for (const [poly, c] of [[FIELD, FIELD_C], [STRIP, { x: -12.7, z: -51.3 }], [TOP, TOP_C]]) {
    const [px, pz] = nearestOnPoly(lx, lz, poly);
    const d = (px - lx) * (px - lx) + (pz - lz) * (pz - lz);
    if (d < bd) { bd = d; bx = px; bz = pz; bc = c; }
  }
  return [bx, bz, bc];
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

// ------------------------------------------------------------------ night
// Fenway at night (v0.6.23): the Warehouse model ships a dedicated
// Fenway_Lights material on all seven tower heads - it takes an emissive
// and burns when the shared day cycle raises the lamps (S.lampFactor).
// On top of that: a halo sprite per tower head, three real PointLights
// (distance-capped, they never reach the Common), and additive light
// pools on the grass so the field itself glows at squirrel height.
let lightsMats = [];
let towerGlowMat = null;
const towerLights = [];
const poolMats = [];

function radialGlowTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.38)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function buildNightRig(scene, park) {
  const glowTex = radialGlowTex();
  const lampHeads = [];
  const matSet = new Set();
  park.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.material.name === 'Fenway_Lights') {
      matSet.add(o.material);
      const b = new THREE.Box3().setFromObject(o);
      lampHeads.push(b.getCenter(new THREE.Vector3()));
    }
  });
  lightsMats = [...matSet];
  for (const m of lightsMats) {
    m.emissive = new THREE.Color(0xfff0c8);
    m.emissiveIntensity = 0;
    // the emissive follows the lamp-bank texture, so the individual
    // lamp cells burn and the housing stays dark - a bank, not a slab
    if (m.map) m.emissiveMap = m.map;
  }
  towerGlowMat = new THREE.SpriteMaterial({
    map: glowTex, color: 0xffdf9e, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  for (const c of lampHeads) {
    const sp = new THREE.Sprite(towerGlowMat);
    sp.position.copy(c);
    sp.scale.set(20, 8.5, 1);
    scene.add(sp);
  }
  // three real lights: the two front towers + one behind home plate,
  // so the infield (where a squirrel enters) is lit from both ends
  for (const [lx, ly, lz, dist] of [[-25, 31, -55, 190], [19, 31, -54, 190], [0, 32, 58, 230]]) {
    const L = new THREE.PointLight(0xffe2b0, 0, dist, 2);
    L.position.set(FEN.x + lx, ly, FEN.z + lz);
    scene.add(L);
    towerLights.push(L);
  }
  // light pools on the grass: soft additive ellipses, the cheap part
  // that actually sells "lit field" at 25 cm
  for (const [lx, lz, w, d] of [[10, -8, 110, 85], [-28, 2, 75, 60], [56, 6, 75, 60]]) {
    const m = new THREE.MeshBasicMaterial({
      map: glowTex, color: 0xffd9a0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(FEN.x + lx, 0.1, FEN.z + lz);
    pool.renderOrder = 2;
    scene.add(pool);
    poolMats.push(m);
  }
}

function updateFenwayNight() {
  const lamp = S.lampFactor || 0;
  for (const m of lightsMats) m.emissiveIntensity = lamp * 2.2;
  if (towerGlowMat) towerGlowMat.opacity = lamp * 0.45;
  for (const L of towerLights) L.intensity = lamp * 1100;
  for (const m of poolMats) m.opacity = lamp * 0.34;
}

// ------------------------------------------------------------- Fenway sky
// The dome was already shared with the Common; the stars and clouds were
// not - they lived over the park only. Fenway gets its own small set:
// stars on the shared S.starMat (daycycle fades it for both skies at
// once), clouds on the shared S.cloudMat, drifted locally here because
// daycycle's wrap logic would teleport them back to the Common.
const fenClouds = [];
let fenSkyBuilt = false;
function buildFenwaySky(scene) {
  if (fenSkyBuilt || !S.starMat || !S.cloudMat) return;
  fenSkyBuilt = true;
  const starPos = [];
  let seed = 9182;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 380; i++) {
    const a = rnd() * Math.PI * 2, e = 0.08 + rnd() * 1.35, r = 850;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, S.starMat);
  stars.position.copy(FEN);
  scene.add(stars);
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(S.cloudMat);
    const a = rnd() * Math.PI * 2, r = 240 + rnd() * 380;
    sp.position.set(FEN.x + Math.cos(a) * r, 95 + rnd() * 85, FEN.z + Math.sin(a) * r);
    const sc = 150 + rnd() * 190;
    sp.scale.set(sc, sc * 0.36, 1);
    scene.add(sp);
    fenClouds.push({ sp, speed: 0.7 + rnd() * 0.9 });
  }
}

function updateFenwaySky(dt) {
  if (!fenSkyBuilt) buildFenwaySky(S.scene);
  for (const c of fenClouds) {
    c.sp.position.x += c.speed * dt;
    if (c.sp.position.x > FEN.x + 430) c.sp.position.x = FEN.x - 430;
  }
}

// ------------------------------------------------------------------ build
let discovered = false;

export function buildFenway(scene) {
  // Give the controller the destination's true ground BEFORE motion occurs.
  Object.assign(S.realmGround, { fenway: (x, z) => fenGround(x - FEN.x, z - FEN.z) });
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
  // a surround apron so the island's edge has something to sit on.
  // v0.6.25: enlarged to carry the BPDA neighborhood (fenwayhood.js) -
  // the fitted buildings span x -542..381, z -434..488 around home, so
  // the plate is 1150 x 1000 centred a touch south; still well inside
  // the 900 m sky dome.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(1150, 1000),
    new THREE.MeshStandardMaterial({ color: 0x59544a, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.12;
  apron.position.z = 27;
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
    buildNightRig(scene, park);
    // a little life (v0.6.23): the crowd drops things and squirrels find
    // things. Caps ride the burrows machinery (surface realm; out here
    // distance is the realm check), food rides food.js - one cap is the
    // Monster-top trophy, the rest are field litter near the walls.
    spawnCapAt(FEN.x + 96, FEN.z + 10, gridGround(96, 10) + 0.04, 20);
    spawnCapAt(FEN.x - 52, FEN.z + 24, gridGround(-52, 24) + 0.04, 21);
    spawnCapAt(FEN.x + 60, FEN.z - 40, gridGround(60, -40) + 0.04, 22);
    spawnCapAt(FEN.x - 12, FEN.z - 55.5, fenGround(-12, -55.5) + 0.04, 23);
    spawnFood('pretzel', FEN.x + 88, FEN.z + 16, { y: 0.05 });
    spawnFood('pretzel', FEN.x - 20, FEN.z - 38, { y: 0.05 });
    spawnFood('peanut', FEN.x + 40, FEN.z + 20, { y: 0.05 });
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
  P.pos.set(FEN.x + HOLE_L.x + 2.6,
    fenGround(HOLE_L.x + 2.6, HOLE_L.z - 1.2), FEN.z + HOLE_L.z - 1.2);
  P.vel.set(0, 0, 0);
  P.yaw = -1.33; P.pitch = 0; // facing the field axis: home, grass, wall
  P.climbing = null; P.climbRegrab = 0; P.grounded = true;
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
let monsterToast = false;
let debugFree = false; // shot-mode aerial pose: park the clamp (see debugEnterFenway 'hood')
export function updateFenway(dt) {
  const P = S.player;
  updateFenwaySky(dt);
  updateFenwayNight();
  if (!P.inFenway) return;
  if (debugFree && S.debugShot) return; // the aerial verification pose floats outside the field on purpose
  const lx = P.pos.x - FEN.x, lz = P.pos.z - FEN.z;
  if (Math.abs(lx) > 500 || Math.abs(lz) > 500) {
    // paranoia clamp, same spirit as the burrows hub deposit
    P.pos.set(FEN.x + HOLE_L.x + 2.6,
    fenGround(HOLE_L.x + 2.6, HOLE_L.z - 1.2), FEN.z + HOLE_L.z - 1.2);
    P.vel.set(0, 0, 0);
    toast('the grounds crew deposits you behind home plate. no questions.', 3);
    return;
  }
  if (!insidePoly(lx, lz, FIELD) && !insidePoly(lx, lz, STRIP) && !insidePoly(lx, lz, TOP)) {
    const [bx, bz, bc] = nearestFenPoint(lx, lz);
    // settle a whisker inside the line, not on it
    const dx = bc.x - bx, dz = bc.z - bz, dl = Math.hypot(dx, dz) || 1;
    P.pos.x = FEN.x + bx + dx / dl * 0.3;
    P.pos.z = FEN.z + bz + dz / dl * 0.3;
  }
  // the model's field is the ground here (groundHeight() is the
  // Common's, and it says 0) - stand on the sampled surface instead,
  // or on the Monster, if that is where the squirrel has got to
  const gy = fenGround(P.pos.x - FEN.x, P.pos.z - FEN.z);
  if (P.pos.y < gy) {
    P.pos.y = gy;
    if (P.vel && P.vel.y < 0) P.vel.y = 0;
    P.grounded = true;
  }
  if (!monsterToast && insidePoly(P.pos.x - FEN.x, P.pos.z - FEN.z, TOP)) {
    monsterToast = true;
    toast('the Monster, climbed. obviously. the whole yard is a postcard from up here.', 4.5);
  }
}

// ------------------------------------------------------------ debug poses
// which: 'plate' | 'monster' | 'wall' | 'top' | 'citgo' | 'hood'
export function debugEnterFenway(which) {
  const P = S.player;
  P.inHollow = false; P.inBurrow = false; P.inFenway = true;
  P.climbing = null; P.vel.set(0, 0, 0); P.grounded = true;
  discovered = true;
  debugFree = which === 'hood';
  if (which === 'citgo') {
    // ON the Monster, turned around: the CITGO sign over left field
    // (panel centre surveyed at local (116.6, 18.25, -278.5)). The
    // stand point is the wall's back rim (z -57.2, the ledge's high
    // edge): from the ledge's middle the wall's own cap sits at a
    // squirrel's eye height and hides the sign, from the rim the
    // sightline is clear - raycast-verified against the live scene.
    P.pos.set(FEN.x - 12, fenGround(-12, -57.2) + 0.1, FEN.z - 57.2);
    P.yaw = Math.atan2(-(116.6 - -12), -(-278.5 - -57.2));
    P.pitch = 0.04;
  } else if (which === 'hood') {
    // outside the park entirely: aerial over the Pike corridor, the
    // neighborhood around the yard (debugFree parks the field clamp)
    P.pos.set(FEN.x + 150, 30, FEN.z - 150);
    P.yaw = Math.atan2(-(0 - 150), -(-10 - -150));
    P.pitch = -0.13;
  } else if (which === 'monster') {
    P.pos.set(FEN.x + 55, 0.5, FEN.z - 18);
    P.yaw = 0.15; P.pitch = 0.12; // open centre field, facing the wall
  } else if (which === 'wall') {
    P.pos.set(FEN.x + 2, 0.5, FEN.z - 38);
    P.yaw = 0; P.pitch = 0.42; // at the Monster's feet, looking up
  } else if (which === 'top') {
    P.pos.set(FEN.x - 12, fenGround(-12, -55.5) + 0.1, FEN.z - 55.5);
    P.yaw = Math.atan2(-(HOME_L.x - -12), -(HOME_L.z - -55.5));
    P.pitch = -0.04; // ON the Monster, the whole yard laid out below
  } else { // 'plate'
    P.pos.set(FEN.x + HOLE_L.x + 2.6, 0.4, FEN.z + HOLE_L.z - 1.2);
    P.yaw = -1.33; P.pitch = 0.02;
  }
}
