// SCURRY - TD Garden. The burrows run north too, in their way: one
// older tunnel ends under an arena, and a squirrel pops up through the
// parquet at centre court. THE Garden, the other one - the expensive
// one. No game on. Nobody here but the building, the banners, and the
// big screen watching itself. No dogs here either.
//
// The building is a sourced model of the TD Garden interior (Celtics
// parquet, seating bowl, jumbotron) from Richard's model haul - see
// assets-library/ATTRIBUTION.md, TD Garden row. LICENSING: that file's
// terms are UNKNOWN (the haul recorded no author or license), so the
// converted GLB was HELD in the asset library through v0.6.25 and the
// load below stayed gated. RELEASED Nov 17 2026 on the project
// owner's explicit decision: the GLB now ships at
// assets/models/garden.glb and this file loads it through the
// standard sourced-model pattern (best-effort - the destination
// still works, hole/signs/lights/doors, if the file ever fails).
//
// It lives far off-map at GDN (-6000, 0, 6000), same trick as the
// Hollow, the Burrows and Fenway. Reachable the same way Fenway is:
// a door in the rat market (west wall - NORTHBOUND / THE OTHER
// GARDEN), "E - take the north run", emergence through the parquet
// just east of the centre-court logo, "E - dive back to the burrows"
// to return.
//
// Model calibration (from the conversion survey, Nov 17): the DAE was
// built in inches and measures ~2x the real arena - the parquet is
// 60.4 x 28.7 model-metres against the real 28.65 x 15.24 m court
// (apron included; the centre-court logo agrees) - so the GLB goes in
// at a uniform 0.5. Placement puts the parquet centre on the GDN
// origin and the parquet surface on y=0: in Garden-local coords the
// court runs x -15.1..15.1, z -7.2..7.2, the jumbotron hangs over
// centre court with its screens at y 9.8..14.7, and the bowl footprint
// spans roughly x -62..60, z -51..53.
//
// Ground is a height grid sampled off the loaded model (bucketed
// triangle rasterization in sampleHeights - Fenway's raycast approach
// does not scale to 159k tris) - and the arena is a bowl, not a
// field: the sampler takes the highest surface under a 19 m cap (the
// top rows live ~17.5 m up; the roof starts ~26 m) and ignores the
// hanging jumbotron rig (RIG_MATS) so centre court samples the
// parquet, not the screen.
// The clamp is a 24-gon ellipse fitted inside the bowl footprint.
// Interior lighting is arena lighting: five constant PointLights over
// the court + emissive jumbotron screens, independent of the park's
// day cycle (distance-capped, they never reach the Common).

import * as THREE from 'three';
import { S } from '../state.js';
import { loadModel } from './models.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { TUN, spawnCapAt } from './burrows.js';
import { spawnFood } from './food.js';

// ---------------------------------------------------------------- layout
export const GDN = new THREE.Vector3(-6000, 0, 6000);
const SCALE = 0.5;
// group transform: game = GDN + model * SCALE + T, chosen so the
// parquet centre (GLB 165.09, 0.02, -91.26) lands on Garden-local (0, 0, 0).
const T = { x: -165.09 * SCALE, z: 91.26 * SCALE };
const HOLE_L = { x: 3.2, z: 0 };        // the burrow mouth, just east of the logo
const COURT_C = { x: 0, z: 0.85 };      // centre court / jumbotron axis

// materials that hang over centre court - never ground (surveyed names
// from the conversion: the screens, the logo boards, the rig + mount)
const RIG_MATS = new Set([
  'Celtics_Jumbotron', 'celticslogo', 'material_35', 'material_40',
  'ID3891', 'ID3901', 'ID4615',
]);
const HEIGHT_CAP = 19;

// the bowl footprint as a 24-gon ellipse (Garden-local), fitted ~2.5 m
// inside the surveyed building bbox so the clamp keeps squirrels off
// the outer walls
const CLAMP = [];
const CLAMP_C = { x: -0.95, z: 0.9 };
for (let i = 0; i < 24; i++) {
  const a = (i / 24) * Math.PI * 2;
  CLAMP.push([CLAMP_C.x + Math.cos(a) * 58.5, CLAMP_C.z + Math.sin(a) * 49.5]);
}

// height grid over the arena bbox (local coords), sampled off the GLB
const GRID = { minX: -60, maxX: 58, minZ: -49, maxZ: 51, nx: 54, nz: 46, h: null };

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

// ------------------------------------------------------------------ build
let discovered = false;

export function buildGarden(scene) {
  // Give the controller the destination's true ground BEFORE motion occurs.
  Object.assign(S.realmGround, { garden: (x, z) => gridGround(x - GDN.x, z - GDN.z) });
  if (typeof S.player.inGarden !== 'boolean') S.player.inGarden = false;
  const g = new THREE.Group();
  g.position.copy(GDN);

  // second sky dome, same as Fenway's: the park's is centred on the
  // Common. Mostly this one is a backstop for gaps in the roof - and
  // the whole view if the GLB is absent.
  if (S.skyMat) {
    const sky2 = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), S.skyMat);
    sky2.userData.isSky = true;
    g.add(sky2);
  }
  // a surround apron so the island's edge has something to sit on
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(420, 360),
    new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.12;
  g.add(apron);

  // the hole home: a dirt mound ring + black mouth on the parquet,
  // burrow-style. Yes, through the floor. The rats regret nothing.
  const mound = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.26, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x5a4026, roughness: 1 }));
  mound.rotation.x = Math.PI / 2; mound.position.set(HOLE_L.x, 0.1, HOLE_L.z);
  mound.scale.set(1, 1, 0.55); g.add(mound);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.56, 16),
    new THREE.MeshBasicMaterial({ color: 0x070403 }));
  mouth.rotation.x = -Math.PI / 2; mouth.position.set(HOLE_L.x, 0.16, HOLE_L.z);
  g.add(mouth);
  const holeSign = makeSign('CENTRE COURT', 1.7);
  holeSign.position.set(HOLE_L.x + 0.4, 0.85, HOLE_L.z - 1.7);
  holeSign.rotation.y = -Math.PI / 2.4;
  g.add(holeSign);

  scene.add(g);

  // arena lighting: constant, day-cycle-independent, distance-capped.
  // Four banks over the court corners + one high centre light. These
  // burn whether or not the model loads - an empty lot out here is
  // still floodlit, which is its own kind of liminal.
  for (const [lx, ly, lz] of [[-19, 15.5, -10.5], [19, 15.5, -10.5], [-19, 15.5, 10.5], [19, 15.5, 10.5], [0, 17.5, 0]]) {
    const L = new THREE.PointLight(0xfff2dd, 420, 170, 2);
    L.position.set(GDN.x + lx, ly, GDN.z + lz);
    scene.add(L);
  }

  // the building itself: async, best-effort, exactly like every other
  // sourced model in this game. Through v0.6.25 this load was GATED
  // (RELEASED=false) while the model was license-held: an un-gated
  // request would have 404'd on every boot of the live site and
  // logged a console resource error for every player, and this
  // game's bar is a clean console. RELEASED Nov 17 2026 on the
  // project owner's explicit decision, with the GLB dropped at
  // assets/models/garden.glb. (The harness window flag remains as a
  // local-proof path; it is no longer needed.)
  const RELEASED = true;
  if (RELEASED || (typeof window !== 'undefined' && window.__scurryGardenAsset)) {
    loadModel('assets/models/garden.glb').then((tpl) => {
    if (!tpl) return;
    const park = tpl.scene;
    park.scale.setScalar(SCALE);
    park.position.set(GDN.x + T.x, -0.02 * SCALE, GDN.z + T.z);
    park.traverse((o) => {
      if (o.isMesh) {
        // interior: receive the arena light, don't cast - the roof
        // would eat the shadow budget and the sun has no business
        // in here anyway
        o.castShadow = false;
        o.receiveShadow = true;
        // the screens glow like screens, day or night
        const mn = (o.material && o.material.name) || '';
        if (mn === 'Celtics_Jumbotron' || mn === 'celticslogo' || mn === 'celtics') {
          o.material.emissive = new THREE.Color(0xffffff);
          if (o.material.map) o.material.emissiveMap = o.material.map;
          o.material.emissiveIntensity = mn === 'Celtics_Jumbotron' ? 0.55 : 0.3;
        }
      }
    });
    scene.add(park);
    sampleHeights(park);
    // a little life: the crowd that isn't here drops things anyway.
    // Caps ride the burrows machinery, food rides food.js - the
    // trophy cap sits on the centre-court logo, because of course.
    spawnCapAt(GDN.x + 0, GDN.z + 0.85, gridGround(0, 0.85) + 0.04, 30);
    spawnCapAt(GDN.x + 13.5, GDN.z + 0, gridGround(13.5, 0) + 0.04, 31);
    spawnCapAt(GDN.x - 13.5, GDN.z + 0, gridGround(-13.5, 0) + 0.04, 32);
    spawnCapAt(GDN.x - 30, GDN.z - 24, gridGround(-30, -24) + 0.04, 33);
    spawnCapAt(GDN.x + 24, GDN.z + 30, gridGround(24, 30) + 0.04, 34);
    spawnFood('popcorn', GDN.x + 6.5, GDN.z + 3.4, { y: gridGround(6.5, 3.4) + 0.05 });
    spawnFood('popcorn', GDN.x - 2.5, GDN.z - 5.5, { y: gridGround(-2.5, -5.5) + 0.05 });
    spawnFood('peanut', GDN.x + 11, GDN.z - 6.2, { y: gridGround(11, -6.2) + 0.05 });
    });
  }

  // the burrow-side door: a dark mouth on the market's WEST wall
  // (the stall owns the north wall, Fenway owns the east). TUN coords,
  // added straight to the scene, built here so burrows.js is untouched.
  const door = new THREE.Group();
  const mouthW = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16),
    new THREE.MeshBasicMaterial({ color: 0x050302 }));
  mouthW.position.set(TUN.x + 38.04, 0.62, TUN.z + 3.8);
  mouthW.rotation.y = Math.PI / 2;
  door.add(mouthW);
  const s1 = makeSign('NORTHBOUND', 1.9);
  s1.position.set(TUN.x + 38.06, 1.62, TUN.z + 3.8);
  s1.rotation.y = Math.PI / 2;
  door.add(s1);
  const s2 = makeSign('THE OTHER GARDEN', 2.2);
  s2.position.set(TUN.x + 38.06, 1.28, TUN.z + 1.15);
  s2.rotation.y = Math.PI / 2;
  door.add(s2);
  scene.add(door);
}

// Sample a height grid over the bowl off the loaded arena: gives the
// player a ground to stand on, from the parquet up the seating tiers.
// Fenway raycasts its grid with three.js - fine at 4.7k tris, hopeless
// at this model's 159k (a Raycaster pass per column is minutes). So
// this buckets the model's triangles on a coarse XZ grid once, then
// answers each column with 2D barycentric tests on its bucket only.
// Highest surface under the cap wins; the hanging jumbotron rig is
// excluded up front, and near-vertical triangles (walls) are skipped -
// they are not ground.
function sampleHeights(park) {
  const G = GRID;
  G.h = new Float32Array(G.nx * G.nz);
  park.updateMatrixWorld(true);
  const CELL = 4;
  const bx0 = Math.floor((G.minX - 4) / CELL), bx1 = Math.floor((G.maxX + 4) / CELL);
  const bz0 = Math.floor((G.minZ - 4) / CELL), bz1 = Math.floor((G.maxZ + 4) / CELL);
  const nbX = bx1 - bx0 + 1, nbZ = bz1 - bz0 + 1;
  const buckets = new Array(nbX * nbZ);
  const tris = []; // flat world-space verts, 9 per tri
  const _v = new THREE.Vector3();
  park.traverse((o) => {
    if (!o.isMesh) return;
    const mn = (o.material && o.material.name) || '';
    if (RIG_MATS.has(mn)) return;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    const idx = geo.index;
    const n = idx ? idx.count : pos.count;
    const get = (i) => {
      _v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
      return [_v.x - GDN.x, _v.y, _v.z - GDN.z];
    };
    for (let i = 0; i + 2 < n; i += 3) {
      const a = get(i), b = get(i + 1), c = get(i + 2);
      if (a[1] > HEIGHT_CAP && b[1] > HEIGHT_CAP && c[1] > HEIGHT_CAP) continue; // roof & rig
      const ti = tris.length / 9;
      tris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      const mnx = Math.min(a[0], b[0], c[0]), mxx = Math.max(a[0], b[0], c[0]);
      const mnz = Math.min(a[2], b[2], c[2]), mxz = Math.max(a[2], b[2], c[2]);
      const ix0 = Math.max(bx0, Math.floor(mnx / CELL)), ix1 = Math.min(bx1, Math.floor(mxx / CELL));
      const iz0 = Math.max(bz0, Math.floor(mnz / CELL)), iz1 = Math.min(bz1, Math.floor(mxz / CELL));
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const k = (iz - bz0) * nbX + (ix - bx0);
          (buckets[k] || (buckets[k] = [])).push(ti);
        }
      }
    }
  });
  const T = new Float32Array(tris);
  for (let iz = 0; iz < G.nz; iz++) {
    for (let ix = 0; ix < G.nx; ix++) {
      const lx = G.minX + (G.maxX - G.minX) * ix / (G.nx - 1);
      const lz = G.minZ + (G.maxZ - G.minZ) * iz / (G.nz - 1);
      const k = (Math.floor(lz / CELL) - bz0) * nbX + (Math.floor(lx / CELL) - bx0);
      const bucket = buckets[k];
      let y = 0;
      if (bucket) {
        for (const ti of bucket) {
          const o9 = ti * 9;
          const ax = T[o9], ay = T[o9 + 1], az = T[o9 + 2];
          const bx = T[o9 + 3], by = T[o9 + 4], bz = T[o9 + 5];
          const cx = T[o9 + 6], cy = T[o9 + 7], cz = T[o9 + 8];
          const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
          if (Math.abs(d) < 1e-9) continue; // vertical - a wall, not ground
          const w0 = ((bz - cz) * (lx - cx) + (cx - bx) * (lz - cz)) / d;
          const w1 = ((cz - az) * (lx - cx) + (ax - cx) * (lz - cz)) / d;
          const w2 = 1 - w0 - w1;
          if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) continue;
          const hy = w0 * ay + w1 * by + w2 * cy;
          if (hy <= HEIGHT_CAP && hy > y) y = hy;
        }
      }
      G.h[iz * G.nx + ix] = y;
    }
  }
}

// ------------------------------------------------------------------ init
function enterGarden() {
  const P = S.player;
  P.pos.set(GDN.x + HOLE_L.x + 2.2,
    gridGround(HOLE_L.x + 2.2, HOLE_L.z - 1.0), GDN.z + HOLE_L.z - 1.0);
  P.vel.set(0, 0, 0);
  // face centre court: the logo, the far basket, the big screen
  P.yaw = Math.atan2(-(COURT_C.x - (HOLE_L.x + 2.2)), -(COURT_C.z - (HOLE_L.z - 1.0)));
  P.pitch = 0.06;
  P.climbing = null; P.climbRegrab = 0; P.grounded = true;
  P.inHollow = false; P.inBurrow = false; P.inFenway = false; P.inGarden = true;
  if (sfx.dig) sfx.dig();
  if (!discovered) {
    discovered = true;
    toast('TD GARDEN. the other garden. the expensive one.', 4.5);
  } else {
    toast('the garden again. still no game. still counts.', 2.6);
  }
}

function exitGarden() {
  const P = S.player;
  P.pos.set(TUN.x + 40.3, 0, TUN.z + 3.8);
  P.vel.set(0, 0, 0);
  P.yaw = -Math.PI / 2; P.pitch = 0; // facing into the market
  P.climbing = null; P.grounded = true;
  P.inGarden = false; P.inBurrow = true;
  if (sfx.dig) sfx.dig();
  toast('back underground. the cheap seats were free after all.', 2.4);
}

export function initGarden() {
  if (typeof S.player.inGarden !== 'boolean') S.player.inGarden = false;
  // down the north run: the market's west wall, south stretch
  S.interactables.push({
    x: TUN.x + 39.7, z: TUN.z + 3.8, y: 0, r: 2.3,
    label: () => S.player.inBurrow ? 'E - take the north run' : null,
    action: () => enterGarden(),
  });
  // and back: the hole at centre court
  S.interactables.push({
    x: GDN.x + HOLE_L.x, z: GDN.z + HOLE_L.z, y: 0, r: 1.9,
    label: () => S.player.inGarden ? 'E - dive back to the burrows' : null,
    action: () => exitGarden(),
  });
}

// ---------------------------------------------------------------- update
export function updateGarden(dt) {
  const P = S.player;
  if (!P.inGarden) return;
  const lx = P.pos.x - GDN.x, lz = P.pos.z - GDN.z;
  if (Math.abs(lx) > 500 || Math.abs(lz) > 500) {
    // paranoia clamp, same spirit as Fenway's grounds crew
    P.pos.set(GDN.x + HOLE_L.x + 2.2,
    gridGround(HOLE_L.x + 2.2, HOLE_L.z - 1.0), GDN.z + HOLE_L.z - 1.0);
    P.vel.set(0, 0, 0);
    toast('an usher deposits you at centre court. no questions.', 3);
    return;
  }
  if (!insidePoly(lx, lz, CLAMP)) {
    const [bx, bz] = nearestOnPoly(lx, lz, CLAMP);
    // settle a whisker inside the line, not on it
    const dx = CLAMP_C.x - bx, dz = CLAMP_C.z - bz, dl = Math.hypot(dx, dz) || 1;
    P.pos.x = GDN.x + bx + dx / dl * 0.3;
    P.pos.z = GDN.z + bz + dz / dl * 0.3;
  }
  // the model's surfaces are the ground here (groundHeight() is the
  // Common's, and it says 0) - stand on the sampled bowl instead
  const gy = gridGround(P.pos.x - GDN.x, P.pos.z - GDN.z);
  if (P.pos.y < gy) {
    P.pos.y = gy;
    if (P.vel && P.vel.y < 0) P.vel.y = 0;
    P.grounded = true;
  }
}

// ------------------------------------------------------------ debug poses
// which: 'court' | 'bowl' | 'jumbo'
export function debugEnterGarden(which) {
  const P = S.player;
  P.inHollow = false; P.inBurrow = false; P.inFenway = false; P.inGarden = true;
  P.climbing = null; P.vel.set(0, 0, 0); P.grounded = true;
  discovered = true;
  if (which === 'bowl') {
    // in the lower bowl, south-west seats - y starts low on purpose,
    // updateGarden settles the squirrel onto the tier
    P.pos.set(GDN.x - 26, 0.4, GDN.z - 24);
    P.yaw = Math.atan2(-(0 - -26), -(0 - -24));
    P.pitch = -0.06; // across the court, screen at the frame's top edge
  } else if (which === 'jumbo') {
    // back at the free-throw line, tilted up: the screens are vertical
    // faces - from directly underneath you only get the housing's dark
    // underside (verified; it's a ceiling, not a screen)
    P.pos.set(GDN.x + 11.5, 0.4, GDN.z + 0);
    P.yaw = Math.atan2(-(0 - 11.5), -(0.85 - 0));
    P.pitch = 0.62; // the jumbotron's near face, glowing over centre court
  } else { // 'court'
    P.pos.set(GDN.x + 7.5, 0.4, GDN.z + 2.5);
    P.yaw = Math.atan2(-(0 - 7.5), -(0.85 - 2.5));
    P.pitch = 0.1; // the parquet, the far basket, the screen overhead
  }
}
