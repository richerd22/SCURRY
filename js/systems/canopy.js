// SCURRY - canopy highways: the squirrel world above the park.
// Deliberate branch routes between neighbouring big trees whose crowns
// nearly touch, cache hollows stocked with bonus food on those routes,
// one dead snag bridging Charles Street, and a lookout perch on the west
// edge of the Common with the stream cam bolted to it.
//
// How walking works here (from player.js): S.platforms are walkable discs
// and S.platformBoxes are walkable axis-aligned box tops; surfaceAt() picks
// the highest surface at or below feet + step tolerance. A bridge is
// therefore a chain of small axis-aligned stepping boxes laid along the
// line between two canopy discs (boxes because platformBoxes cannot
// rotate), heights interpolated with a slight sag, plus a visible bark
// limb swept under the chain (v0.6: an organic tube - tapered, wandering,
// twigged - the boxes are the road, the tube is just the wood). Every route endpoint is a registered
// S.trees entry, so the existing trunk-climb system reaches both ends.
//
// Build order: trees.js calls buildCanopy() at the end of buildTrees(),
// when S.trees / S.platforms / S.solids are fully registered. Cache food
// is stocked through food.js's spawnFood(); updateFood() snaps non-steal
// food meshes to the ground every frame, so updateCanopy() (called from
// main right after updateHollow, i.e. after updateFood) re-pins cache
// food to its branch and runs the slow-restock timers.

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundHeight } from '../world/world.js';
import { barkTex } from '../world/textures.js';
import { spawnFood } from './food.js';
import { toast } from '../ui/hud.js';
import { sfx } from './audio.js';

// bridge admission: crowns nearly touch, heights compatible
const MAX_DIST = 14;      // trunk-to-trunk metres
const MAX_GAP = 7;        // open air between canopy platform edges
const MAX_DY = 3.2;       // platform height difference
const LOOP_GAP = 2.5;     // crowns actually touching: keep loop hops too
const STEP = 0.55;        // stepping-box spacing along a bridge
const BOX_HALF = 0.7;     // stepping boxes are 1.4m square pads
const CACHE_COUNT = 6;
const CACHE_RESPAWN = 150; // seconds before a raided hollow restocks
const CACHE_STOCK = ['acorn', 'peanut'];

let built = false;
const caches = [];        // {x, z, y, tree, stock: [{type, item}], timer}
let perchState = null;    // {x, z, y, tree, cooldown}

const platY = (t) => t.canopyY - 0.55;
const platR = (t) => t.canopyR * 0.92; // matches the disc trees.js registered

// ---------------------------------------------------------------- network
// Kruskal over candidate pairs, shortest crown-gap first, plus short loop
// hops where crowns genuinely touch. Returns index pairs into S.trees.
function computeNetwork(trees) {
  const cand = [];
  for (let i = 0; i < trees.length; i++) for (let j = i + 1; j < trees.length; j++) {
    const a = trees[i], b = trees[j];
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    const gap = d - platR(a) - platR(b);
    const dy = Math.abs(platY(a) - platY(b));
    if (d <= MAX_DIST && gap <= MAX_GAP && dy <= MAX_DY) cand.push({ i, j, d, gap, dy });
  }
  cand.sort((p, q) => p.gap - q.gap || p.d - q.d);
  const parent = trees.map((_, i) => i);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const edges = [];
  for (const e of cand) {
    const a = find(e.i), b = find(e.j);
    if (a !== b) { parent[a] = b; edges.push(e); }
    else if (e.gap <= LOOP_GAP) edges.push(e);
  }
  return edges;
}

// ------------------------------------------------------------ bridge build
let barkMat, snagMat;
const limbGeo = new THREE.CylinderGeometry(0.11, 0.15, 1, 6);
const twigGeo = new THREE.CylinderGeometry(0.008, 0.03, 1, 5);
const UP = new THREE.Vector3(0, 1, 0);

function limb(scene, from, to, mat) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.01) return;
  const m = new THREE.Mesh(limbGeo, mat || barkMat);
  m.scale.set(1, len, 1);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.castShadow = true;
  scene.add(m);
}

// deterministic per-bridge rng (textures.js LCG style - same park every load)
function bridgeRng(a, b) {
  let s = (Math.round((a.x + 220) * 131 + (a.z + 140) * 17) * 48271 +
    Math.round((b.x + 220) * 131 + (b.z + 140) * 17) * 69621) % 2147483646 + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// v0.6 organic pass: the visible bridge limb is one swept tube, not a
// stack of straight cylinder segments. It follows the same sag profile
// as the stepping boxes (yAt), crown pinned ~0.185 below the walk line
// (the clearance the old cylinders kept, minus a whisper of noise) so
// feet meet wood exactly where they did before. Per-bridge seeded
// variation: end-swollen taper, a slow radius ripple, a gentle lateral
// wander (<= ~0.23m - well inside the 1.4m stepping pads), slightly
// ridged out-of-round cross-sections, bark UVs running with the grain,
// end caps, and 0-2 twig stubs on longer spans. Purely visual: the
// stepping boxes above are untouched, so walks/collisions cannot move.
const LIMB_RADIAL = 8;
function buildBridgeLimb(scene, a, b, yAt, d) {
  const R = bridgeRng(a, b);
  const baseR = 0.15 + R() * 0.05;
  const wanderAmp = 0.09 + R() * 0.14;
  const wanderFreq = 2.0 + R() * 1.8;
  const wanderPhase = R() * Math.PI * 2;
  const ripA = R() * Math.PI * 2, ripB = R() * Math.PI * 2;
  const ridgePhase = R() * Math.PI * 2;
  const dx = b.x - a.x, dz = b.z - a.z;
  const px = -dz / d, pz = dx / d; // unit perpendicular, horizontal
  const n = Math.max(6, Math.ceil(d / 0.75));
  const centers = [], radii = [], tangents = [], cum = [0];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const swell = 0.74 + 0.5 * Math.pow(Math.abs(2 * t - 1), 1.6);
    const ripple = 1 + 0.085 * Math.sin(t * 9.3 + ripA) + 0.05 * Math.sin(t * 21.7 + ripB);
    const r = baseR * swell * ripple;
    const wander = Math.sin(Math.PI * t) * wanderAmp * Math.sin(wanderPhase + t * wanderFreq);
    const crown = yAt(t) - 0.185 + 0.02 * Math.sin(t * 13.1 + ripB);
    centers.push(new THREE.Vector3(a.x + dx * t + px * wander, crown - r, a.z + dz * t + pz * wander));
    radii.push(r);
    if (i > 0) cum.push(cum[i - 1] + centers[i].distanceTo(centers[i - 1]));
  }
  for (let i = 0; i <= n; i++) {
    const p = centers[Math.max(0, i - 1)], q = centers[Math.min(n, i + 1)];
    tangents.push(new THREE.Vector3().subVectors(q, p).normalize());
  }
  const pos = [], uv = [], idx = [];
  const side = new THREE.Vector3(), upv = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    side.crossVectors(UP, tangents[i]).normalize();
    upv.crossVectors(tangents[i], side).normalize();
    for (let j = 0; j <= LIMB_RADIAL; j++) {
      const th = (j / LIMB_RADIAL) * Math.PI * 2;
      const ridge = 1 + 0.055 * Math.sin(3 * th + ridgePhase + t * 5.0);
      const rr = radii[i] * ridge, co = Math.cos(th), si = Math.sin(th) * 0.94;
      pos.push(
        centers[i].x + (side.x * co + upv.x * si) * rr,
        centers[i].y + (side.y * co + upv.y * si) * rr,
        centers[i].z + (side.z * co + upv.z * si) * rr);
      uv.push(j / LIMB_RADIAL, cum[i] / 1.35);
    }
  }
  const ring = LIMB_RADIAL + 1;
  for (let i = 0; i < n; i++) for (let j = 0; j < LIMB_RADIAL; j++) {
    const r0 = i * ring + j, r1 = r0 + ring;
    idx.push(r0, r0 + 1, r1, r1, r0 + 1, r1 + 1);
  }
  // end caps: fans to a point tucked half a radius past each end ring
  const capS = pos.length / 3;
  const cs = centers[0].clone().addScaledVector(tangents[0], -radii[0] * 0.5);
  pos.push(cs.x, cs.y, cs.z); uv.push(0.5, 0);
  for (let j = 0; j < LIMB_RADIAL; j++) idx.push(capS, j + 1, j);
  const capE = pos.length / 3;
  const ce = centers[n].clone().addScaledVector(tangents[n], radii[n] * 0.5);
  pos.push(ce.x, ce.y, ce.z); uv.push(0.5, cum[n] / 1.35);
  const base = n * ring;
  for (let j = 0; j < LIMB_RADIAL; j++) idx.push(capE, base + j, base + j + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, barkMat);
  mesh.castShadow = true;
  scene.add(mesh);
  // twig stubs on longer spans, angled up off the crown, roots buried
  const twigs = d > 9 ? (R() < 0.75 ? 2 : 1) : (R() < 0.45 ? 1 : 0);
  for (let k = 0; k < twigs; k++) {
    const i = 2 + Math.floor(R() * (n - 4));
    const from = centers[i].clone(); from.y += radii[i] * 0.55;
    const dir = new THREE.Vector3(px * (R() - 0.5) * 1.4, 1, pz * (R() - 0.5) * 1.4).normalize();
    const to = from.clone().addScaledVector(dir, 0.35 + R() * 0.45);
    const tw = new THREE.Mesh(twigGeo, barkMat);
    tw.scale.set(1, from.distanceTo(to), 1);
    tw.position.copy(from).lerp(to, 0.5);
    tw.quaternion.setFromUnitVectors(UP, dir);
    tw.castShadow = true;
    scene.add(tw);
  }
}

// One walkable route between trees a and b: stepping boxes + a sagged limb.
// The height profile is flat at each end while the route is still over
// that tree's canopy disc (the disc is flat at platY), and only ramps
// across the open-air span between disc edges - ramping from the trunk
// would leave a >step-tolerance cliff where the route exits the disc on
// steep pairings.
function buildBridge(scene, a, b) {
  const ya = platY(a), yb = platY(b);
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const sag = Math.min(0.3, d * 0.02);
  const t0 = Math.min(0.45, (platR(a) * 0.8) / d);
  const t1 = Math.max(0.55, 1 - (platR(b) * 0.8) / d);
  const yAt = (t) => {
    if (t <= t0) return ya;
    if (t >= t1) return yb;
    const u = (t - t0) / (t1 - t0);
    return ya + (yb - ya) * u - Math.sin(Math.PI * u) * sag;
  };
  const n = Math.max(2, Math.ceil(d / STEP));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    S.platformBoxes.push({
      minX: x - BOX_HALF, maxX: x + BOX_HALF,
      minZ: z - BOX_HALF, maxZ: z + BOX_HALF,
      y: yAt(t) - 0.16, // feet ride just above the limb's crown
    });
  }
  // visible limb: one swept organic tube under the stepping boxes (v0.6)
  buildBridgeLimb(scene, a, b, yAt, d);
  return d;
}

// ------------------------------------------------------- Charles St snag
// The Common and the Garden face each other across Charles Street with no
// crowns anywhere near touching (nearest pair ~34m). One dead snag at the
// midpoint is the waypoint: climbable, a small bare platform on top, and
// a bridge leg to each side. Registered exactly like a normal tree, so
// the climb system, solids and canopy logic all treat it as one.
function buildSnag(scene) {
  let A = null, B = null, bd = 1e9;
  for (const a of S.trees) {
    if (a.x <= MAP.charlesMaxX) continue;
    for (const b of S.trees) {
      if (b.x >= MAP.charlesMinX) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d < bd) { bd = d; A = a; B = b; }
    }
  }
  if (!A || !B) return null;
  const x = (A.x + B.x) / 2, z = (A.z + B.z) / 2;
  const gy = groundHeight(x, z);
  const py = (platY(A) + platY(B)) / 2;
  const canopyY = py + 0.55;
  const rec = { x, z, r: 0.42, gy, trunkTop: canopyY - 0.6, canopyY, canopyR: 1.7, snag: true };
  S.trees.push(rec);
  S.platforms.push({ x, z, r: 1.55, y: py });
  S.solids.push({ x, z, r: 0.55 });
  // bare grey trunk + stub limbs, no leaves - it is very dead
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.52, canopyY - gy, 7), snagMat);
  trunk.position.y = (canopyY - gy) / 2;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 1.5, 5), snagMat);
    stub.position.y = (canopyY - gy) * (0.72 + i * 0.09);
    stub.rotation.z = 1.0;
    stub.rotation.y = i * 2.1;
    stub.translateY(0.7);
    stub.castShadow = true;
    g.add(stub);
  }
  g.position.set(x, gy, z);
  scene.add(g);
  return { rec, A, B, gap: bd };
}

// ------------------------------------------------------------ cache hollow
// A dark knot-hole on a stub limb at a route junction, stocked with bonus
// food via food.js's spawnFood. Pickup is the normal food flow; when a
// stocked item leaves S.foods it was collected, and the hollow restocks
// after CACHE_RESPAWN seconds.
function buildCache(scene, tree, neighbours) {
  // face the cache along the average bridge direction out of this tree
  let dx = 1, dz = 0;
  if (neighbours.length) {
    dx = 0; dz = 0;
    for (const nb of neighbours) { dx += nb.x - tree.x; dz += nb.z - tree.z; }
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  }
  const off = platR(tree) * 0.55;
  const x = tree.x + dx * off, z = tree.z + dz * off;
  const y = platY(tree) + 0.07;
  // stub limb from the trunk out to the cache point, just under the food
  limb(scene,
    new THREE.Vector3(tree.x, platY(tree) - 0.22, tree.z),
    new THREE.Vector3(x + dx * 0.5, platY(tree) - 0.22, z + dz * 0.5));
  // knot-hole disc + bark rim on a short upright stub at the junction
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.62, 7), barkMat);
  stub.position.set(x + dx * 0.42, y + 0.18, z + dz * 0.42);
  stub.castShadow = true;
  scene.add(stub);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16),
    new THREE.MeshBasicMaterial({ color: 0x120a05 }));
  hole.scale.y = 1.3;
  hole.position.set(x + dx * 0.42 + dx * 0.17, y + 0.24, z + dz * 0.42 + dz * 0.17);
  hole.lookAt(hole.position.x + dx, hole.position.y, hole.position.z + dz);
  scene.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 6, 14), barkMat);
  rim.position.copy(hole.position);
  rim.lookAt(rim.position.x + dx, rim.position.y, rim.position.z + dz);
  scene.add(rim);

  const slot = { x, z, y, tree, stock: [], timer: 0 };
  slot.stock = CACHE_STOCK.map((type, i) => ({
    type,
    item: spawnFood(type, x + (i ? 0.38 : -0.1), z + (i ? 0.3 : 0.12), { y: y - 0.05 }),
  }));
  caches.push(slot);
  return slot;
}

function pickCacheTrees(edges) {
  const deg = new Map(), adj = new Map();
  for (const e of edges) {
    deg.set(e.i, (deg.get(e.i) || 0) + 1);
    deg.set(e.j, (deg.get(e.j) || 0) + 1);
    (adj.get(e.i) || adj.set(e.i, []).get(e.i)).push(e.j);
    (adj.get(e.j) || adj.set(e.j, []).get(e.j)).push(e.i);
  }
  const picks = [];
  const hollowIdx = S.trees.findIndex((t) => t.hollow);
  if (hollowIdx >= 0 && deg.has(hollowIdx)) picks.push(hollowIdx);
  // Frog Pond hub: highest-degree bridged tree near the pond
  let hub = -1, hd = 0;
  for (const [i, d] of deg) {
    const t = S.trees[i];
    if (Math.hypot(t.x - 92, t.z + 5) < 48 && d > hd && !picks.includes(i)) { hd = d; hub = i; }
  }
  if (hub >= 0) picks.push(hub);
  // then spread by degree, at least 25m from every existing pick
  const byDeg = [...deg.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  for (const [i] of byDeg) {
    if (picks.length >= CACHE_COUNT) break;
    if (picks.includes(i)) continue;
    const t = S.trees[i];
    if (picks.every((p) => Math.hypot(S.trees[p].x - t.x, S.trees[p].z - t.z) >= 25)) picks.push(i);
  }
  return { picks, adj };
}

// ------------------------------------------------------------- the perch
// West edge of the Common, nearest big tree to Charles St on the Frog
// Pond sightline: a platform disc off its canopy, a support limb, and
// the stream cam itself - small box, lens, red eye - pointed east
// across the Common, the way the real one watches.
function buildPerch(scene) {
  const cand = S.trees
    .filter((t) => !t.hollow && !t.snag && t.x > -45 && t.x < -15 && t.canopyR >= 3.3)
    .sort((a, b) => Math.hypot(a.x + 38, a.z + 2) - Math.hypot(b.x + 38, b.z + 2));
  if (!cand.length) return null;
  const t = cand[0];
  const py = platY(t);
  const px = t.x - (platR(t) + 0.9), pz = t.z;
  S.platforms.push({ x: px, z: pz, r: 1.15, y: py });
  // limb out to the perch + a diagonal brace back down to the trunk
  limb(scene, new THREE.Vector3(t.x - 0.3, py - 0.2, t.z), new THREE.Vector3(px - 0.5, py - 0.2, pz));
  limb(scene, new THREE.Vector3(px - 0.3, py - 0.24, pz), new THREE.Vector3(t.x - 1.1, py - 2.1, t.z));
  // the cam: pole, body, lens facing east, tally light
  const cam = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.6, metalness: 0.5 }));
  pole.position.y = 0.27; cam.add(pole);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.5, metalness: 0.3 }));
  body.position.y = 0.62; cam.add(body);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.09, 10),
    new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.25, metalness: 0.4 }));
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.17, 0.62, 0); cam.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.038, 10),
    new THREE.MeshBasicMaterial({ color: 0x39506b }));
  glass.rotation.y = Math.PI / 2;
  glass.position.set(0.216, 0.62, 0); cam.add(glass);
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
  tally.position.set(0.05, 0.71, 0.06); cam.add(tally);
  cam.position.set(px - 0.72, py, pz);
  cam.traverse((o) => { o.castShadow = true; });
  scene.add(cam);

  perchState = { x: px, z: pz, y: py, tree: t, cooldown: 0 };
  S.interactables.push({
    x: px, z: pz, y: py, r: 1.6,
    label: () => {
      if (!perchState || perchState.cooldown > 0) return null;
      const P = S.player.pos;
      if (!P || P.climbing || Math.abs(P.y - py) > 1.0) return null; // must be up on the perch
      return 'E - sit in frame';
    },
    action: () => {
      if (!perchState || perchState.cooldown > 0) return;
      perchState.cooldown = 60;
      sfx.squeak();
      toast('somewhere out there, chat just saw a squirrel. you\'re welcome, chat.', 3.6);
    },
    tick: (dt) => { if (perchState && perchState.cooldown > 0) perchState.cooldown -= dt; },
  });
  return perchState;
}

// ----------------------------------------------------------------- build
export function buildCanopy(scene) {
  if (built) return;
  built = true;
  barkMat = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 1 });
  snagMat = new THREE.MeshStandardMaterial({ map: barkTex(), color: 0x9d968c, roughness: 1 });

  const crossing = buildSnag(scene);
  const edges = computeNetwork(S.trees);
  const summaries = [];
  let totalLen = 0;
  for (const e of edges) {
    totalLen += buildBridge(scene, S.trees[e.i], S.trees[e.j]);
    summaries.push({ a: [S.trees[e.i].x, S.trees[e.i].z], b: [S.trees[e.j].x, S.trees[e.j].z], d: +e.d.toFixed(1), gap: +e.gap.toFixed(1) });
  }
  if (crossing) {
    const si = S.trees.indexOf(crossing.rec);
    const ai = S.trees.indexOf(crossing.A), bi = S.trees.indexOf(crossing.B);
    for (const [i, j] of [[ai, si], [si, bi]]) {
      const a = S.trees[i], b = S.trees[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      totalLen += buildBridge(scene, a, b);
      summaries.push({ a: [a.x, a.z], b: [b.x, b.z], d: +d.toFixed(1), gap: 0, via: 'snag' });
      // crossing legs join the adjacency the cache picker sees
      edges.push({ i, j, d, gap: 0, dy: Math.abs(platY(a) - platY(b)) });
    }
  }

  const { picks, adj } = pickCacheTrees(edges);
  for (const i of picks) {
    buildCache(scene, S.trees[i], (adj.get(i) || []).map((j) => S.trees[j]));
  }
  const perch = buildPerch(scene);

  // ledger for debugging / verification
  S.canopy = {
    bridges: summaries,
    bridgeCount: summaries.length,
    totalLength: +totalLen.toFixed(1),
    caches: caches.map((c) => ({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), y: +c.y.toFixed(2), stock: c.stock.map((s) => s.type) })),
    perch: perch ? { x: +perch.x.toFixed(1), z: +perch.z.toFixed(1), y: +perch.y.toFixed(2), tree: [perch.tree.x, perch.tree.z] } : null,
    snag: crossing ? { x: +crossing.rec.x.toFixed(1), z: +crossing.rec.z.toFixed(1), crossGap: +crossing.gap.toFixed(1) } : null,
  };
  console.info('[canopy] ' + summaries.length + ' bridges, ' + totalLen.toFixed(0) + 'm of route, ' +
    caches.length + ' cache hollows' + (perch ? ', perch at ' + perch.x.toFixed(0) + ',' + perch.z.toFixed(0) : ''));
}

// ---------------------------------------------------------------- update
// Cache upkeep: re-pin stocked food to its branch (updateFood snaps
// non-steal food to the ground each frame; this runs after it), notice
// pickups, and restock raided hollows on a slow timer.
export function updateCanopy(dt) {
  if (!built) return;
  const now = performance.now() / 1000;
  const P = S.player.pos;
  for (const slot of caches) {
    let missing = 0;
    for (const s of slot.stock) {
      if (s.item && S.foods.includes(s.item)) {
        s.item.mesh.position.y = slot.y + Math.sin(now * 2 + s.item.x) * 0.008;
      } else if (s.item) {
        s.item = null; // collected (pickup removes it from S.foods)
        missing++;
      } else missing++;
    }
    if (missing > 0 && slot.timer <= 0) {
      slot.timer = CACHE_RESPAWN;
      if (P && Math.hypot(P.x - slot.x, P.z - slot.z) < 7 && Math.abs(P.y - slot.y) < 2.5) {
        toast('cache hollow cleaned out. somewhere, a very organised squirrel is furious.', 2.8);
        sfx.chomp();
      }
    }
    if (slot.timer > 0) {
      slot.timer -= dt;
      if (slot.timer <= 0) {
        for (const s of slot.stock) {
          if (!s.item) {
            const i = slot.stock.indexOf(s);
            s.item = spawnFood(s.type, slot.x + (i ? 0.38 : -0.1), slot.z + (i ? 0.3 : 0.12), { y: slot.y - 0.05 });
          }
        }
      }
    }
  }
}
