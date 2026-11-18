// SCURRY - the Burrows. Under the whole park there is an older park: root
// tunnels, dirt halls, storage chambers full of other people's winters,
// and at the deep end, a rat behind a stall who accepts bottle caps and
// asks no questions. Six holes in the surface drop you in. Dogs do not
// know this place exists. That is the entire security system, and it works.
//
// The interior lives far off-map at TUN (3000, 0, 3000), same trick as the
// Hollow: groundHeight() is ~0 out there, so normal physics just works
// with pos.y pinned to 0. Layout is a data table of axis-aligned rects
// (rooms + corridors, local coords relative to TUN); the walkable area is
// the union of all of them, and updateBurrows() clamps the player into it.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight, visibleGroundHeight } from '../world/world.js';
import { sfx } from './audio.js';
import { toast, setGossip } from '../ui/hud.js';
import { spawnFood } from './food.js';
import { ROOMS, CORRIDORS, RECTS } from './burrow-layout.js';

// ---------------------------------------------------------------- layout
export const TUN = new THREE.Vector3(3000, 0, 3000);
const CEIL = 2.3; // tunnel ceiling height, metres. tall for a squirrel, fine.

// Single shared layout: player clamp and NPC patrols use identical rooms.
const WALK_PAD = 0.22; // rooms (and corridors) count as slightly padded

// Entry chambers: centre + the yaw you face on arrival (toward the way in).
// Camera forward is (-sin yaw, -cos yaw): 0 = north, PI = south, -PI/2 = east.
const CHAMBERS = {
  hollow:   { cx: 0,   cz: -23, yaw: Math.PI },       // corridor runs south
  frog:     { cx: -23, cz: 0,   yaw: -Math.PI / 2 },  // corridor runs east
  monument: { cx: -16, cz: 20,  yaw: 0 },             // corridor runs north
  garden:   { cx: 0,   cz: 23,  yaw: 0 },             // corridor runs north
  mall:     { cx: 16,  cz: 20,  yaw: 0 },             // corridor runs north
  lagoon:   { cx: 16,  cz: -23, yaw: Math.PI },       // corridor runs south
};
const HUB = { cx: 0, cz: 0 };
const MARKET = { cx: 45, cz: 0 };
const STALL = { x: 45, z: -3.4 };        // local; stall against the north wall
const STALL_FRONT = { x: 45, z: -1.5 };  // local; where the business happens
const STORAGE_A = { cx: -32, cz: -10 };
const STORAGE_B = { cx: 32, cz: 10 };

// ------------------------------------------------------------ tiny utils
// deterministic scatter (Math.random at build time would make every
// screenshot pose a different tunnel - no thanks)
let _seed = 90210;
function rnd() { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; }

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

function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const c = cv.getContext('2d');
  const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,190,110,0.9)');
  gr.addColorStop(0.4, 'rgba(255,140,50,0.35)');
  gr.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function clink() { if (sfx.clink) sfx.clink(); else if (sfx.boop) sfx.boop(); }

// ------------------------------------------------------------- rat build
// Not a squirrel with a long tail. A rat: low, long, unbothered.
function makeRatMesh(scale = 1, color = 0x6f6259) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xc98a8a, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur);
  body.scale.set(0.95, 0.72, 1.55); body.position.y = 0.13; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 9, 7), fur);
  head.scale.set(0.9, 0.8, 1.1); head.position.set(0, 0.16, 0.26); head.castShadow = true; g.add(head);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 7), fur);
  snout.rotation.x = Math.PI / 2; snout.position.set(0, 0.13, 0.38); g.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), pink);
  nose.position.set(0, 0.13, 0.44); g.add(nose);
  for (const sx of [-0.055, 0.055]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), pink);
    ear.scale.set(1, 1, 0.35); ear.position.set(sx, 0.245, 0.2); g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), dark);
    eye.position.set(sx * 1.35, 0.185, 0.32); g.add(eye);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), pink);
    foot.scale.set(1, 0.5, 1.6); foot.position.set(sx * 1.5, 0.02, 0.14); g.add(foot);
  }
  // the tail: a pink curve that has seen things. Tube along a CatmullRom.
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push(new THREE.Vector3(Math.sin(t * 2.2) * 0.09, 0.025 + Math.sin(t * Math.PI) * 0.02, -0.24 - t * 0.42));
  }
  const tail = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.011, 5), pink);
  tail.castShadow = true; g.add(tail);
  g.scale.setScalar(scale);
  g.userData.tail = tail;
  return g;
}

// ------------------------------------------------------------ the build
const flames = [];   // { mesh, sprite, phase } - flickered in update
const lights = [];   // { light, base, phase } - hard cap: 6 PointLights total
let glowTex = null;
let vendorRat = null, loungeRat = null;

function addTorch(parent, x, z, withLight, phase) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.7, 5),
    new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1 }));
  stick.position.y = 1.15; stick.rotation.z = 0.12; g.add(stick);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 7),
    new THREE.MeshStandardMaterial({ color: 0xffa050, emissive: 0xff7a26, emissiveIntensity: 2.6 }));
  flame.position.y = 1.58; g.add(flame);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffa050, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  spr.scale.set(1.5, 1.5, 1); spr.position.y = 1.58; g.add(spr);
  g.position.set(x, 0, z);
  parent.add(g);
  flames.push({ mesh: flame, sprite: spr, phase });
  if (withLight) {
    const pl = new THREE.PointLight(0xffa050, 14, 13, 1.8);
    pl.position.set(x, 1.6, z);
    parent.add(pl);
    lights.push({ light: pl, base: 14, phase });
  }
}

// wall boxes for one rect, with gaps cut wherever another rect crosses
// the edge (those crossings are the doorways). Overlaps between wall
// boxes just sink into the earth shell and are never seen.
function buildWalls(parent, rect, mat) {
  const edges = [
    { horiz: true,  fixed: rect.minZ, from: rect.minX, to: rect.maxX, out: -1 }, // north
    { horiz: true,  fixed: rect.maxZ, from: rect.minX, to: rect.maxX, out: 1 },  // south
    { horiz: false, fixed: rect.minX, from: rect.minZ, to: rect.maxZ, out: -1 }, // west
    { horiz: false, fixed: rect.maxX, from: rect.minZ, to: rect.maxZ, out: 1 },  // east
  ];
  for (const e of edges) {
    // openings: intervals of this edge covered by any other rect
    const cuts = [];
    for (const o of RECTS) {
      if (o === rect) continue;
      const oFrom = e.horiz ? o.minX : o.minZ, oTo = e.horiz ? o.maxX : o.maxZ;
      const oLo = e.horiz ? o.minZ : o.minX, oHi = e.horiz ? o.maxZ : o.maxX;
      if (e.fixed < oLo || e.fixed > oHi) continue; // other rect doesn't reach this edge line
      const a = Math.max(e.from, oFrom), b = Math.min(e.to, oTo);
      if (b > a) cuts.push([a, b]);
    }
    cuts.sort((p, q) => p[0] - q[0]);
    // walk the edge, building wall only where there is no cut
    let cur = e.from;
    const spans = [];
    for (const [a, b] of cuts) {
      if (a > cur) spans.push([cur, a]);
      cur = Math.max(cur, b);
    }
    if (cur < e.to) spans.push([cur, e.to]);
    for (const [a, b] of spans) {
      const len = b - a;
      if (len < 0.25) continue;
      const mid = (a + b) / 2;
      const geo = e.horiz ? new THREE.BoxGeometry(len, CEIL, 0.35) : new THREE.BoxGeometry(0.35, CEIL, len);
      const wall = new THREE.Mesh(geo, mat);
      if (e.horiz) wall.position.set(mid, CEIL / 2, e.fixed + e.out * 0.17);
      else wall.position.set(e.fixed + e.out * 0.17, CEIL / 2, mid);
      parent.add(wall);
    }
  }
}

function makeAcornPile(parent, cx, cz, n = 30) {
  const pile = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.9 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x54331a, roughness: 1 });
  const geo = new THREE.SphereGeometry(0.14, 7, 5);
  for (let i = 0; i < n; i++) {
    const layer = Math.floor(i / 9);
    const a = i * 2.4, r = Math.max(0, 1.0 - layer * 0.3) * (0.4 + (i % 5) * 0.14);
    const acorn = new THREE.Mesh(geo, mat);
    acorn.scale.set(1, 0.8, 1.25);
    acorn.position.set(Math.cos(a) * r, 0.1 + layer * 0.17, Math.sin(a) * r);
    acorn.rotation.y = a;
    pile.add(acorn);
    if (i % 3 === 0) {
      const cap = new THREE.Mesh(geo, capMat);
      cap.scale.set(0.95, 0.4, 0.95);
      cap.position.set(acorn.position.x, acorn.position.y + 0.09, acorn.position.z);
      pile.add(cap);
    }
  }
  pile.position.set(cx, 0, cz);
  parent.add(pile);
  return pile;
}

export function buildBurrows(scene) {
  if (typeof S.caps !== 'number') S.caps = 0;
  if (typeof S.player.inBurrow !== 'boolean') S.player.inBurrow = false;
  glowTex = glowTexture();
  const g = new THREE.Group();
  g.position.copy(TUN);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x4d3820, roughness: 1 });
  const floorMat2 = new THREE.MeshStandardMaterial({ color: 0x44301c, roughness: 1 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2812, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x77705f, roughness: 1 });

  // network bounds (local) for the earth shell + ceiling
  let bMinX = 1e9, bMaxX = -1e9, bMinZ = 1e9, bMaxZ = -1e9;
  for (const r of RECTS) {
    bMinX = Math.min(bMinX, r.minX); bMaxX = Math.max(bMaxX, r.maxX);
    bMinZ = Math.min(bMinZ, r.minZ); bMaxZ = Math.max(bMaxZ, r.maxZ);
  }
  const bw = bMaxX - bMinX, bd = bMaxZ - bMinZ, bcx = (bMinX + bMaxX) / 2, bcz = (bMinZ + bMaxZ) / 2;

  // the earth itself: one big dark box around everything, seen from
  // inside. Any gap between a wall and a rect edge reads as solid dirt.
  const earth = new THREE.Mesh(new THREE.BoxGeometry(bw + 6, 4.5, bd + 6),
    new THREE.MeshStandardMaterial({ color: 0x1c1108, roughness: 1, side: THREE.BackSide }));
  earth.position.set(bcx, 1.1, bcz);
  g.add(earth);
  // ceiling: one slab over the whole network
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(bw + 6, bd + 6),
    new THREE.MeshStandardMaterial({ color: 0x2a1a0c, roughness: 1, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(bcx, CEIL, bcz);
  g.add(ceil);

  // floors + walls per rect
  RECTS.forEach((r, i) => {
    const w = r.maxX - r.minX, d = r.maxZ - r.minZ;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), i % 2 ? floorMat : floorMat2);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((r.minX + r.maxX) / 2, 0.01, (r.minZ + r.maxZ) / 2);
    floor.receiveShadow = true;
    g.add(floor);
    buildWalls(g, r, wallMat);
  });

  // corridor dressing: support posts + crossbeams, the classic
  // "someone shored this up in 1911 and it has been fine since" look
  for (const c of CORRIDORS) {
    const horiz = (c.maxX - c.minX) >= (c.maxZ - c.minZ);
    const len = horiz ? c.maxX - c.minX : c.maxZ - c.minZ;
    const wid = horiz ? c.maxZ - c.minZ : c.maxX - c.minX;
    const n = Math.floor(len / 4);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const px = horiz ? c.minX + len * t : (c.minX + c.maxX) / 2;
      const pz = horiz ? (c.minZ + c.maxZ) / 2 : c.minZ + len * t;
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, CEIL, 0.14), woodMat);
        post.position.set(horiz ? px : px + s * (wid / 2 - 0.25), CEIL / 2, horiz ? pz + s * (wid / 2 - 0.25) : pz);
        g.add(post);
      }
      const beam = new THREE.Mesh(
        horiz ? new THREE.BoxGeometry(0.18, 0.15, wid) : new THREE.BoxGeometry(wid, 0.15, 0.18), woodMat);
      beam.position.set(px, CEIL - 0.12, pz);
      g.add(beam);
    }
  }

  // hanging roots near the entry chambers + a few in the hub
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1 });
  const rootSpots = [];
  for (const k in CHAMBERS) rootSpots.push([CHAMBERS[k].cx, CHAMBERS[k].cz]);
  rootSpots.push([HUB.cx - 3, HUB.cz - 3], [HUB.cx + 3.5, HUB.cz + 2]);
  for (const [rx, rz] of rootSpots) {
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const len = 0.5 + rnd() * 0.7;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.055, len, 5), rootMat);
      root.position.set(rx + (rnd() - 0.5) * 3.4, CEIL - len / 2, rz + (rnd() - 0.5) * 3.4);
      root.rotation.set((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25);
      g.add(root);
    }
  }

  // scattered stones, seeded so the tunnels are the same tunnels daily
  const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 70; i++) {
    const r = RECTS[Math.floor(rnd() * RECTS.length)];
    const st = new THREE.Mesh(stoneGeo, stoneMat);
    const sc = 0.05 + rnd() * 0.13;
    st.scale.set(sc, sc * 0.6, sc);
    st.position.set(r.minX + 0.3 + rnd() * (r.maxX - r.minX - 0.6), sc * 0.3,
      r.minZ + 0.3 + rnd() * (r.maxZ - r.minZ - 0.6));
    st.rotation.y = rnd() * 3;
    g.add(st);
  }

  // torches: flame + glow every ~8-10 m of corridor, plus room corners.
  // Only six of them get a real PointLight (see addTorch calls with
  // withLight) - the rest are emissive theatre, which underground is
  // honestly most of lighting anyway.
  let torchPhase = 0;
  const torchAt = (x, z, light) => addTorch(g, x, z, light, (torchPhase += 1.7));
  for (const c of CORRIDORS) {
    const horiz = (c.maxX - c.minX) >= (c.maxZ - c.minZ);
    const len = horiz ? c.maxX - c.minX : c.maxZ - c.minZ;
    const n = Math.max(1, Math.floor(len / 9));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, side = i % 2 ? 1 : -1;
      const x = horiz ? c.minX + len * t : (side < 0 ? c.minX + 0.3 : c.maxX - 0.3);
      const z = horiz ? (side < 0 ? c.minZ + 0.3 : c.maxZ - 0.3) : c.minZ + len * t;
      torchAt(x, z, false);
    }
  }
  torchAt(HUB.cx - 5.4, HUB.cz - 5.4, true);            // hub light (1)
  torchAt(HUB.cx + 5.4, HUB.cz + 5.4, false);
  torchAt(22, -1.1, true);                              // market run, halfway down (1)
  torchAt(MARKET.cx - 6.4, MARKET.cz - 5.4, true);      // market light A (1)
  torchAt(MARKET.cx + 6.4, MARKET.cz + 5.4, true);      // market light B (1)
  torchAt(STORAGE_A.cx, STORAGE_A.cz - 3.4, true);      // storage A light (1)
  torchAt(STORAGE_B.cx, STORAGE_B.cz + 3.4, true);      // storage B light (1)
  // ^ total PointLights: 6. Do not add a seventh. The earth is flammable.

  // hub dressing: a sign and absolutely no explanation
  const hubSign = makeSign('THE BURROWS', 2.6);
  hubSign.position.set(HUB.cx, 1.7, HUB.cz - 5.75); g.add(hubSign);
  const hubSign2 = makeSign('DOGS: NO', 1.6);
  hubSign2.position.set(HUB.cx + 3.4, 1.5, HUB.cz - 5.75); g.add(hubSign2);

  // storage chambers: acorn piles (someone's winter, do not judge) + signs
  makeAcornPile(g, STORAGE_A.cx - 1.2, STORAGE_A.cz, 34);
  makeAcornPile(g, STORAGE_A.cx + 1.6, STORAGE_A.cz + 1.4, 18);
  const signA = makeSign('STORAGE A - DO NOT NAP', 2.6);
  signA.position.set(STORAGE_A.cx, 1.6, STORAGE_A.cz - 3.75); g.add(signA);
  makeAcornPile(g, STORAGE_B.cx + 1.2, STORAGE_B.cz, 30);
  makeAcornPile(g, STORAGE_B.cx - 1.8, STORAGE_B.cz - 1.2, 14);
  const signB = makeSign('STORAGE B - NAPPING SPOT', 2.6);
  signB.position.set(STORAGE_B.cx, 1.6, STORAGE_B.cz + 3.75); signB.rotation.y = Math.PI; g.add(signB);

  // entry chambers: a dark "up" hole on the outer wall of each one
  for (const k in CHAMBERS) {
    const ch = CHAMBERS[k];
    const fx = -Math.sin(ch.yaw), fz = -Math.cos(ch.yaw); // forward (toward corridor)
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 14),
      new THREE.MeshBasicMaterial({ color: 0xffe9bb }));
    hole.position.set(ch.cx - fx * 2.85, 0.55, ch.cz - fz * 2.85);
    hole.rotation.y = Math.atan2(fx, fz);
    g.add(hole);
    const up = makeSign('UP', 0.7);
    up.position.set(ch.cx - fx * 2.85, 1.35, ch.cz - fz * 2.8);
    up.rotation.y = Math.atan2(fx, fz);
    g.add(up);
  }

  buildMarket(g);
  const transitSign=makeSign('THE T - RODENT ROUTE',2.5);
  transitSign.position.set(49,1.52,5.8);transitSign.rotation.y=Math.PI;
  g.add(transitSign);
  scene.add(g);
}

// ------------------------------------------------------------- the market
function buildMarket(g) {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x54381f, roughness: 1 });
  const stall = new THREE.Group();
  // crates as the stall body, a plank counter, a striped cloth awning
  const crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  for (const dx of [-1.35, -0.45, 0.45, 1.35]) {
    const crate = new THREE.Mesh(crateGeo, woodMat);
    crate.position.set(dx, 0.45, 0); crate.castShadow = true; stall.add(crate);
  }
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.09, 1.15), darkWood);
  counter.position.set(0, 0.95, 0.1); stall.add(counter);
  for (const dx of [-1.7, 1.7]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 6), darkWood);
    pole.position.set(dx, 1.05, 0.45); stall.add(pole);
  }
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
  const cc = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { cc.fillStyle = i % 2 ? '#8a3a3a' : '#e3d3a2'; cc.fillRect(i * 16, 0, 16, 32); }
  const awnTex = new THREE.CanvasTexture(cv); awnTex.colorSpace = THREE.SRGBColorSpace;
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.7),
    new THREE.MeshStandardMaterial({ map: awnTex, side: THREE.DoubleSide, roughness: 1 }));
  awning.position.set(0, 2.05, 0.25); awning.rotation.x = -0.5; stall.add(awning);
  // stock on the counter: three proud croissant-adjacent lumps
  const stockMat = new THREE.MeshStandardMaterial({ color: 0xc8923e, roughness: 0.85 });
  for (const dx of [-0.9, 0, 0.9]) {
    const lump = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), stockMat);
    lump.scale.set(1.3, 0.6, 0.8); lump.position.set(dx, 1.06, 0.1); stall.add(lump);
  }
  stall.position.set(STALL.x, 0, STALL.z);
  g.add(stall);

  // the staff
  vendorRat = makeRatMesh(1.25, 0x6f6259);
  vendorRat.position.set(STALL.x, 0, STALL.z - 0.85); // behind the counter
  vendorRat.rotation.y = Math.PI; // facing south, facing the customer. you.
  g.add(vendorRat);
  const loungeCrate = new THREE.Mesh(crateGeo, darkWood);
  loungeCrate.position.set(STALL.x + 3.6, 0.45, STALL.z - 0.4); g.add(loungeCrate);
  loungeRat = makeRatMesh(1.1, 0x7d7166);
  loungeRat.position.set(STALL.x + 3.6, 0.9, STALL.z - 0.4);
  loungeRat.rotation.y = -0.9; loungeRat.rotation.z = 0.12; // lounging. on the job.
  g.add(loungeRat);

  // signage: the whole business model, three lines
  const s1 = makeSign('THE EXCHANGE', 2.8);
  s1.position.set(STALL.x, 2.0, STALL.z - 1.35); s1.rotation.y = 0; g.add(s1);
  const s2 = makeSign('1 CROISSANT = 3 CAPS', 2.6);
  s2.position.set(STALL.x - 1.1, 1.35, STALL.z + 0.72); s2.rotation.y = 0.15; g.add(s2);
  const s3 = makeSign('NO CREDIT. NO DOGS.', 2.4);
  s3.position.set(STALL.x + 1.2, 1.3, STALL.z + 0.72); s3.rotation.y = -0.15; g.add(s3);
  const s4 = makeSign('THE EXCHANGE - DEEP END', 2.6);
  s4.position.set(MARKET.cx, 1.7, MARKET.cz - 5.75); g.add(s4);
}

// ------------------------------------------------------- surface entrances
// Filled by initBurrows(): surface spots need S.trees / S.hollowTreePos,
// which exist by then (buildTrees runs before system inits).
const entrances = []; // { key, sx, sz, chamber }
let discovered = false;

function makeEntranceVisual(x, z, drain) {
  const grp = new THREE.Group();
  const gy = groundHeight(x, z);
  if (drain) {
    // pond / lagoon drain: a grey stone ring, reads as infrastructure
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.13, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x8f8a7e, roughness: 0.95 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; grp.add(ring);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x3c3f45, roughness: 0.5, metalness: 0.7 });
    for (const off of [-0.3, 0, 0.3]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.09), barMat);
      bar.position.set(0, 0.07, off); grp.add(bar);
    }
  } else {
    // dirt mound ring, like something dug this recently and often
    const mound = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.26, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x5a4026, roughness: 1 }));
    mound.rotation.x = Math.PI / 2; mound.position.y = 0.02; mound.scale.set(1, 1, 0.55); grp.add(mound);
    const dirt = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x4d3620, roughness: 1 }));
    dirt.scale.set(1.4, 0.35, 1.4); dirt.position.set(0.8, 0.02, 0.5); grp.add(dirt);
  }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.56, 16),
    new THREE.MeshBasicMaterial({ color: 0x070403 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.06; grp.add(hole);
  grp.position.set(x, gy, z);
  return grp;
}

function enterBurrow(ent) {
  const P = S.player, ch = CHAMBERS[ent.key];
  P.pos.set(TUN.x + ch.cx, 0, TUN.z + ch.cz);
  P.vel.set(0, 0, 0);
  P.yaw = ch.yaw; P.pitch = 0;
  P.climbing = null; P.grounded = true;
  P.inHollow = false;
  P.inBurrow = true;
  if (sfx.dig) sfx.dig();
  if (!discovered) {
    discovered = true;
    toast('THE BURROWS. old roots, older deals. dogs do not know this place.', 4.5);
  } else {
    toast('down again. smells like roots and money.', 2);
  }
}

function exitBurrow(ent) {
  const P = S.player;
  const ex = ent.sx + 1.3, ez = ent.sz + 0.9; // just beside the hole, not in it
  // Return onto the same triangle/path/plaza floor used by live player
  // physics, not the lower analytic terrain heightfield.
  P.pos.set(ex, visibleGroundHeight(ex, ez), ez);
  P.vel.set(0, 0, 0);
  P.climbing = null; P.climbRegrab = 0;
  P.inBurrow = false;
  P.grounded = true;
  setGossip('');
  toast('back up. daylight. act natural.', 2.2);
}

// ------------------------------------------------------------------ caps
// Bottle caps: the shiny currency of the underground. Surface spots are
// fixed and restock 120 s after collection; the two in Storage A are a
// one-time bonus for squirrels who explore.
const CAP_SPOTS = [
  [126.5, 54],   // by the pretzel cart
  [52, -20.5],   // a Mall bench
  [110, 8],      // Frog Pond bench edge
  [133, 36],     // bandstand knoll foot
  [-132, -41],   // lagoon bridge, south end
  [-132, 41],    // lagoon bridge, north end
  [140, 48],     // bandstand, other side
  [-20, -52],    // Brewer Fountain rise
  [-30, -76],    // Park St entrance area
  [60, -54],     // monument plaza edge
  [-84, -32],    // Garden path edge
  [16, 68],      // south Common grass
];
const caps = []; // { x, z, y, mesh, active, timer, burrow, phase }
const capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.014, 12);
const capMats = [
  new THREE.MeshStandardMaterial({ color: 0xd8d8dc, metalness: 0.95, roughness: 0.25 }),
  new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.95, roughness: 0.3 }),
];

function makeCap(x, z, y, burrow, idx) {
  const mesh = new THREE.Mesh(capGeo, capMats[idx % capMats.length]);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  // a faint glint sprite: a 5 cm disc of metal at squirrel height in a
  // big park is otherwise a rumour, not a collectible
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xfff2c8, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  spr.scale.set(0.32, 0.32, 1);
  mesh.add(spr);
  S.scene.add(mesh);
  caps.push({ x, z, y, mesh, active: true, timer: 0, burrow, phase: idx * 1.93 });
}

// other realms (Fenway) seed their own caps through the same machinery:
// surface-realm flags, so they spin, restock and collect exactly like the
// park's twelve - the realm check is distance's job out there.
export function spawnCapAt(x, z, y, idx) { makeCap(x, z, y, false, idx); }

function collectCap(c) {
  c.active = false;
  c.mesh.visible = false;
  c.timer = c.burrow ? Infinity : 120; // surface restocks; storage does not
  S.caps++;
  clink();
  if (S.caps <= 3) toast('a bottle cap. shiny. the rats will want this.', 2.6);
}

// ------------------------------------------------------------- rat banter
const RAT_BROKE = [
  'RAT: three caps. that is the whole price list.',
  'RAT: caps, plural. one cap is a rumor.',
  'RAT: the geese pay in violence. you pay in caps.',
  'RAT: come back shiny-side up.',
];
const RAT_TRADE = [
  'RAT: pleasure. tell no geese.',
  'RAT: fresh-ish. do not ask where from.',
  'RAT: a pleasure. the exchange thanks you.',
];
let brokeIdx = 0, tradeIdx = 0;

// ------------------------------------------------------------------ init
export function initBurrows() {
  if (typeof S.caps !== 'number') S.caps = 0;
  if (typeof S.player.inBurrow !== 'boolean') S.player.inBurrow = false;

  // --- the six surface entrances ---
  const defs = [];
  if (S.hollowTreePos) {
    defs.push({ key: 'hollow', sx: S.hollowTreePos.x + 2.2, sz: S.hollowTreePos.z + 2.8, drain: false });
  }
  defs.push({ key: 'frog', sx: 114, sz: 22, drain: true });        // Frog Pond drain
  defs.push({ key: 'monument', sx: 50, sz: -36, drain: false });   // monument hill slope
  // Garden root hole: biggest canopy west of Charles St
  let gardenTree = null;
  for (const t of S.trees) {
    if (t.x < -60 && (!gardenTree || t.canopyR > gardenTree.canopyR)) gardenTree = t;
  }
  if (gardenTree) defs.push({ key: 'garden', sx: gardenTree.x + 1.6, sz: gardenTree.z + 1.6, drain: false });
  // Mall root hole: tree nearest the Mall's east end
  let mallTree = null, mallD = 1e9;
  for (const t of S.trees) {
    const d = Math.hypot(t.x - 170, t.z - (-10));
    if (d < mallD) { mallD = d; mallTree = t; }
  }
  if (mallTree) defs.push({ key: 'mall', sx: mallTree.x + 1.6, sz: mallTree.z - 1.2, drain: false });
  defs.push({ key: 'lagoon', sx: -118, sz: 31, drain: true });     // south lagoon shore drain

  for (const def of defs) {
    const ent = { key: def.key, sx: def.sx, sz: def.sz, chamber: CHAMBERS[def.key] };
    entrances.push(ent);
    S.scene.add(makeEntranceVisual(ent.sx, ent.sz, def.drain));
    // down: surface side
    S.interactables.push({
      x: ent.sx, z: ent.sz, y: groundHeight(ent.sx, ent.sz), r: 1.5,
      label: () => S.player.inBurrow ? null : 'E - dive into the burrow',
      action: () => enterBurrow(ent),
    });
    // up: inside the matching entry chamber, by the outer wall
    const ch = ent.chamber;
    const fx = -Math.sin(ch.yaw), fz = -Math.cos(ch.yaw);
    S.interactables.push({
      x: TUN.x + ch.cx - fx * 1.9, z: TUN.z + ch.cz - fz * 1.9, y: 0, r: 1.7,
      label: () => S.player.inBurrow ? 'E - pop back up' : null,
      action: () => exitBurrow(ent),
    });
  }

  // --- caps: 12 on the surface, 2 in Storage A ---
  CAP_SPOTS.forEach(([x, z], i) => makeCap(x, z, groundHeight(x, z) + 0.04, false, i));
  makeCap(TUN.x + STORAGE_A.cx - 0.6, TUN.z + STORAGE_A.cz + 2.2, 0.05, true, 12);
  makeCap(TUN.x + STORAGE_A.cx + 1.1, TUN.z + STORAGE_A.cz + 2.6, 0.05, true, 13);

  // --- the stall: the whole rat economy in one interactable ---
  S.interactables.push({
    x: TUN.x + STALL_FRONT.x, z: TUN.z + STALL_FRONT.z, y: 0, r: 2,
    label: () => {
      if (!S.player.inBurrow) return null;
      return S.caps >= 3
        ? 'E - trade 3 caps for a croissant (the good stuff)'
        : 'E - ask the rat about prices';
    },
    action: () => {
      if (S.caps >= 3) {
        S.caps -= 3;
        spawnFood('croissant', TUN.x + STALL_FRONT.x, TUN.z + STALL_FRONT.z + 0.6);
        clink();
        toast('the rat nods once. a croissant appears. no receipt.', 3.2);
        setGossip(RAT_TRADE[tradeIdx++ % RAT_TRADE.length]);
      } else {
        toast(RAT_BROKE[brokeIdx++ % RAT_BROKE.length], 3);
        if (sfx.gossip) sfx.gossip();
      }
    },
  });
}

// ---------------------------------------------------------------- update
let elapsed = 0;

function insideAnyRect(lx, lz) {
  for (const r of RECTS) {
    if (lx >= r.minX - WALK_PAD && lx <= r.maxX + WALK_PAD &&
        lz >= r.minZ - WALK_PAD && lz <= r.maxZ + WALK_PAD) return true;
  }
  return false;
}

// project a local point back into the union: nearest clamped point wins
function clampIntoNetwork(P) {
  const lx = P.x - TUN.x, lz = P.z - TUN.z;
  let bestD = 1e18, bx = lx, bz = lz;
  for (const r of RECTS) {
    const cx = Math.max(r.minX, Math.min(r.maxX, lx));
    const cz = Math.max(r.minZ, Math.min(r.maxZ, lz));
    const d = (cx - lx) * (cx - lx) + (cz - lz) * (cz - lz);
    if (d < bestD) { bestD = d; bx = cx; bz = cz; }
  }
  P.x = TUN.x + bx; P.z = TUN.z + bz;
}

export function updateBurrows(dt) {
  elapsed += dt;
  const P = S.player;
  const inB = !!P.inBurrow;

  // caps: spin, bob, restock timers, collection. Runs in both realms;
  // each cap only collects in its own.
  for (const c of caps) {
    if (!c.active) {
      if (c.timer !== Infinity) {
        c.timer -= dt;
        if (c.timer <= 0) { c.active = true; c.mesh.visible = true; }
      }
      continue;
    }
    c.mesh.rotation.y += dt * 2.2;
    c.mesh.position.y = c.y + Math.sin(elapsed * 2.4 + c.phase) * 0.015;
    if (c.burrow !== inB) continue;
    const dx = P.pos.x - c.x, dz = P.pos.z - c.z;
    if (dx * dx + dz * dz < 0.55 * 0.55 && Math.abs(P.pos.y - c.y) < 1.5) collectCap(c);
  }

  if (!inB) return; // on the surface, caps were the whole job

  // underground: the tunnels are safe, flat, and enclosed
  P.pos.y = 0;
  if (P.vel && P.vel.y < 0) P.vel.y = 0;
  const lx = P.pos.x - TUN.x, lz = P.pos.z - TUN.z;
  if (Math.abs(lx) > 90 || Math.abs(lz) > 90) {
    // paranoia clamp: somehow out of the earth entirely - hub, no questions
    P.pos.set(TUN.x + HUB.cx, 0, TUN.z + HUB.cz);
    P.vel.set(0, 0, 0);
    toast('the tunnels deposit you back at the hub. they do that sometimes.', 3);
  } else if (!insideAnyRect(lx, lz)) {
    clampIntoNetwork(P.pos);
  }

  // torch flicker: cheap sine wobble, no allocation, no mercy for physics
  for (const f of flames) {
    const w = 0.85 + 0.15 * Math.sin(elapsed * 11 + f.phase) + 0.06 * Math.sin(elapsed * 23 + f.phase * 2);
    f.mesh.scale.set(1, w, 1);
    f.sprite.material.opacity = 0.6 + 0.25 * w;
  }
  for (const l of lights) {
    l.light.intensity = l.base * (0.88 + 0.12 * Math.sin(elapsed * 11 + l.phase) + 0.05 * Math.sin(elapsed * 27 + l.phase * 3));
  }

  // the staff, working hard
  if (vendorRat) {
    vendorRat.position.y = Math.sin(elapsed * 1.8) * 0.012;
    vendorRat.rotation.y = Math.PI + Math.sin(elapsed * 0.7) * 0.14;
    if (vendorRat.userData.tail) vendorRat.userData.tail.rotation.y = Math.sin(elapsed * 2.3) * 0.1;
  }
  if (loungeRat && loungeRat.userData.tail) {
    loungeRat.userData.tail.rotation.y = Math.sin(elapsed * 1.4 + 2) * 0.16;
  }
}

// ------------------------------------------------------------ debug poses
// Screenshot / verification teleports. which: 'entry' | 'market' |
// 'storage' ('burrow' accepted as an alias for 'entry').
export function debugEnterBurrow(which) {
  const P = S.player;
  if (typeof S.caps !== 'number') S.caps = 0;
  P.inHollow = false;
  P.inBurrow = true;
  P.climbing = null;
  P.vel.set(0, 0, 0);
  P.pitch = 0;
  if (which === 'market') {
    P.pos.set(TUN.x + STALL_FRONT.x, 0, TUN.z + STALL_FRONT.z + 2.2);
    P.yaw = 0; // face north, straight at the stall and its proprietor
  } else if (which === 'storage') {
    P.pos.set(TUN.x + STORAGE_A.cx + 2.6, 0, TUN.z + STORAGE_A.cz + 2.4);
    P.yaw = Math.PI * 0.75; // face the pile in Storage A
  } else { // 'entry' / 'burrow' / anything else: the hollow-tree entry chamber
    const ch = CHAMBERS.hollow;
    P.pos.set(TUN.x + ch.cx, 0, TUN.z + ch.cz);
    P.yaw = ch.yaw;
  }
  P.grounded = true;
  discovered = true; // a pose is not a discovery
}
