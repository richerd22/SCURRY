// SCURRY - trees. Big elms everywhere: climbable trunks, walkable canopy discs,
// and one great tree near the Frog Pond that hides the Hollow's front door.

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundHeight, distToPaths, inWater, isGrass } from './world.js';
import { barkTex, leafTex, grassBladeTex } from './textures.js';
import { loadModel, fitHeight, shadowify } from '../systems/models.js';

// small deterministic rng so the park is the same park every load
let seed = 1337;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

const bark = barkTex();
const trunkMat = new THREE.MeshStandardMaterial({ map: bark, roughness: 1 });
const trunkMat2 = new THREE.MeshStandardMaterial({ map: bark, color: 0xcfc0ae, roughness: 1 });
const leaf = leafTex();
const leafMats = [0x517d33, 0x5f8a38, 0x6f9a42, 0x7fa34a].map(c =>
  new THREE.MeshStandardMaterial({ map: leaf, color: c, roughness: 1 }));

export function buildTrees(scene) {
  const spots = [];
  // hand-placed clusters guarantee canopy highways in key areas
  const clusters = [
    [30, -60], [38, -52], [24, -48],           // NW Common grove
    [88, -28], [97, -22], [84, -16], [104, -30], // around the Hollow tree
    [20, 60], [30, 68], [12, 70],              // SW Common lawn
    [170, -60], [178, -50], [164, -46],        // NE Common
    [176, 70], [166, 62],                      // SE Common
    [-176, -64], [-166, -56], [-184, -48],     // Garden NW
    [-90, 62], [-98, 70], [-82, 54],           // Garden S
    [-176, 58], [-186, 66],
  ];
  for (const [x, z] of clusters) spots.push([x + (rnd() - 0.5) * 4, z + (rnd() - 0.5) * 4, 0]);
  // scattered fill
  let tries = 0;
  while (spots.length < 120 && tries < 900) {
    tries++;
    const inGarden = rnd() < 0.36;
    const x = inGarden ? -200 + rnd() * 138 : -32 + rnd() * 232;
    const z = -96 + rnd() * 192;
    if (inWater(x, z) || distToPaths(x, z) < 3.4) continue;
    if (Math.hypot(x - 95, z - 12) < 26 || Math.hypot(x - 140, z - z * 0 - 42) < 16) continue; // pond + bandstand plaza
    if (Math.hypot(x - 60, z + 45) < 15) continue;   // monument plaza
    if (Math.hypot(x + 25, z + 58) < 12) continue;  // fountain
    if (Math.hypot(x - 80, z + 8) < 7) continue;    // hollow tree space
    if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 6.5)) continue;
    spots.push([x, z, 0]);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.55, 1, 7);
  const branchGeo = new THREE.CylinderGeometry(0.09, 0.16, 1, 5);
  const leafGeo = new THREE.SphereGeometry(1, 10, 8);

  for (const [x, z] of spots) {
    const gy = groundHeight(x, z);
    const h = 6.5 + rnd() * 3.5;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, rnd() < 0.5 ? trunkMat : trunkMat2);
    trunk.scale.set(1, h, 1);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    // a few branches
    const nb = 3 + (rnd() * 3 | 0);
    for (let i = 0; i < nb; i++) {
      const b = new THREE.Mesh(branchGeo, trunkMat);
      const bl = 2 + rnd() * 2.4;
      b.scale.set(1, bl, 1);
      b.position.y = h * (0.62 + rnd() * 0.3);
      b.rotation.z = 0.7 + rnd() * 0.5;
      b.rotation.y = rnd() * Math.PI * 2;
      b.translateY(bl / 2);
      tree.add(b);
    }
    // canopy: 4-6 flattened blobs; the lowest blob's underside is the walkable platform
    const canopyR = 2.6 + rnd() * 1.3;
    const canopyY = gy + h + 0.6;
    const blobs = 4 + (rnd() * 3 | 0);
    for (let i = 0; i < blobs; i++) {
      const leafMesh = new THREE.Mesh(leafGeo, leafMats[(rnd() * leafMats.length) | 0]);
      const r = canopyR * (0.62 + rnd() * 0.45);
      leafMesh.scale.set(r, r * 0.55, r);
      leafMesh.position.set((rnd() - 0.5) * 2.6, h + 0.6 + (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 2.6);
      leafMesh.castShadow = true;
      tree.add(leafMesh);
    }
    // one high crown blob for a fuller silhouette
    const crown = new THREE.Mesh(leafGeo, leafMats[(rnd() * leafMats.length) | 0]);
    const cr = canopyR * 0.66;
    crown.scale.set(cr, cr * 0.6, cr);
    crown.position.set(0, h + 1.7, 0);
    crown.castShadow = true;
    tree.add(crown);
    tree.position.set(x, gy, z);
    scene.add(tree);
    const rec = { x, z, r: 0.55, gy, trunkTop: gy + h, canopyY, canopyR };
    S.trees.push(rec);
    S.platforms.push({ x, z, r: canopyR * 0.92, y: canopyY - 0.55 });
    S.solids.push({ x, z, r: 0.62 });
    elmVisuals.push({ group: tree, rec });
  }

  buildUnderstory(scene);
  buildHollowTree(scene);
  swapHeroTrees(scene);
}

// Bushes + grass tufts: the squirrel-height detail layer. At 25cm eye height
// a lawn of flat paint reads empty; instanced tufts make it a grass forest.
function buildUnderstory(scene) {
  // bushes: dark flattened blobs tucked along fences, beds and tree lines
  const bushGeo = new THREE.SphereGeometry(1, 8, 6);
  const bushMat = new THREE.MeshStandardMaterial({ map: leafTex(), color: 0x39511f, roughness: 1 });
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 110);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3();
  let bi = 0, guard = 0;
  while (bi < 110 && guard++ < 3000) {
    const x = -200 + rnd() * 405, z = -100 + rnd() * 200;
    if (!isGrass(x, z) || distToPaths(x, z) < 2.8) continue;
    if (Math.hypot(x - 95, z - 12) < 24) continue;
    const s = 0.55 + rnd() * 0.95;
    Q.setFromAxisAngle(V.set(0, 1, 0), rnd() * Math.PI * 2);
    M.compose(new THREE.Vector3(x, groundHeight(x, z) + s * 0.32, z), Q, SC.set(s, s * 0.62, s));
    bushes.setMatrixAt(bi++, M);
  }
  bushes.count = bi;
  bushes.castShadow = true;
  scene.add(bushes);

  // grass tufts: crossed alpha planes, thousands of instances
  const bladeTex = grassBladeTex();
  const tuftGeo = new THREE.PlaneGeometry(0.55, 0.42);
  tuftGeo.translate(0, 0.21, 0);
  const tuftGeo2 = tuftGeo.clone(); tuftGeo2.rotateY(Math.PI / 2);
  const tuftMat = new THREE.MeshStandardMaterial({
    map: bladeTex, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 1,
  });
  const COUNT = 5200;
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, COUNT);
  const tufts2 = new THREE.InstancedMesh(tuftGeo2, tuftMat, COUNT);
  const col = new THREE.Color();
  let ti = 0; guard = 0;
  while (ti < COUNT && guard++ < COUNT * 30) {
    const x = -205 + rnd() * 415, z = -102 + rnd() * 204;
    if (!isGrass(x, z)) continue;
    const s = 0.55 + rnd() * 0.85;
    const y = groundHeight(x, z);
    Q.setFromAxisAngle(V.set(0, 1, 0), rnd() * Math.PI);
    M.compose(new THREE.Vector3(x, y, z), Q, SC.set(s, s * (0.8 + rnd() * 0.5), s));
    tufts.setMatrixAt(ti, M);
    tufts2.setMatrixAt(ti, M);
    col.setHSL(0.26 + rnd() * 0.05, 0.5, 0.32 + rnd() * 0.2);
    tufts.setColorAt(ti, col); tufts2.setColorAt(ti, col);
    ti++;
  }
  tufts.count = tufts2.count = ti;
  scene.add(tufts); scene.add(tufts2);
  // registered so the mobile perf ladder / shot-mode lowq can thin them out
  S.grassTufts = [tufts, tufts2];
  S.grassTuftCount = ti;
}

// The great tree by the Frog Pond: thicker trunk, a knot-hole at squirrel height.
function buildHollowTree(scene) {
  const x = 80, z = -8, gy = groundHeight(x, z);
  const tree = new THREE.Group();
  const h = 9;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.25, h, 10), trunkMat2);
  trunk.position.y = h / 2; trunk.castShadow = true;
  tree.add(trunk);
  const leafGeo = new THREE.SphereGeometry(1, 10, 8);
  const leaves = [];
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
    const r = 3.4 + (i % 3);
    leaf.scale.set(r, r * 0.55, r);
    leaf.position.set((i - 2) * 1.6, h + 0.8 + (i % 2) * 0.9, ((i * 7) % 3 - 1) * 1.8);
    leaf.castShadow = true;
    tree.add(leaf);
    leaves.push(leaf);
  }
  // knot-hole: dark ellipse on the south face, squirrel height
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 20),
    new THREE.MeshBasicMaterial({ color: 0x120a05 })
  );
  hole.scale.y = 1.35;
  hole.position.set(0, 0.42, 1.13);
  tree.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 6, 18), trunkMat);
  rim.position.copy(hole.position); rim.scale.y = 1.35;
  tree.add(rim);
  tree.position.set(x, gy, z);
  scene.add(tree);

  const t = { x, z, r: 1.15, gy, trunkTop: gy + h, canopyY: gy + h + 0.8, canopyR: 4.6, hollow: true };
  S.trees.push(t);
  S.platforms.push({ x, z, r: 4.2, y: t.canopyY - 0.55 });
  S.solids.push({ x, z, r: 1.3 });
  S.hollowTreePos = new THREE.Vector3(x, gy, z);
  S.hollowEntrance = new THREE.Vector3(x, gy + 0.3, z + 1.6);
  hollowVisual = { trunk, leaves, hole, rim, rec: t };
}

// ---------------------------------------------------------------------------
// HERO TREES - Quaternius "Trees" set (CC0 1.0), split from the 5-tree blob
// in the asset library into Tree1..Tree5.glb (see assets-library ledger).
//
// VISUAL SWAP ONLY, same pattern as dogs/humans/lamp posts: the procedural
// elms above are built first and register everything gameplay reads -
// S.trees (climb), S.platforms (canopy discs), S.solids (trunk push-out).
// Those registries stay authoritative and are NEVER touched here. When a
// split GLB loads, its clone is fitted over the matching procedural tree
// (same x/z, height matched to that tree's registered canopy) and only then
// is the procedural mesh hidden. If a GLB fails to load, loadModel resolves
// null and the procedural tree simply stays - the park still works.
// ---------------------------------------------------------------------------

// Measured from the split GLBs (world units of each file): full height,
// bbox centre, trunk axis near the base, trunk radius near the base.
// fitHeight centres the canopy bbox; the axis offsets below shift the clone
// back so the TRUNK (what the squirrel climbs) sits on the registered x/z.
const HERO_TREES = {
  'Tree1.glb': { h: 6.867, cx: -0.105, cz: -0.126, ax: -0.01, az: 0.03, trunkR: 0.17 },
  'Tree2.glb': { h: 6.555, cx: -0.095, cz: 0.051, ax: 0.01, az: -0.03, trunkR: 0.17 },
  'Tree3.glb': { h: 5.281, cx: 0.631, cz: 0.060, ax: 0.01, az: -0.03, trunkR: 0.17 },
  'Tree4.glb': { h: 5.096, cx: -0.237, cz: -0.098, ax: -0.02, az: 0.00, trunkR: 0.18 },
  'Tree5.glb': { h: 2.980, cx: -0.005, cz: 0.010, ax: 0.01, az: 0.00, trunkR: 0.12 },
};
const elmVisuals = [];   // {group, rec} for every procedural elm, in build order
let hollowVisual = null; // {trunk, leaves, hole, rim, rec}

// deterministic per-position hash so hero rotations are stable across loads
function heroYaw(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
}

// Build one fitted hero visual: height matched to the tree's registered
// canopy, trunk axis re-centred on the wrapper origin.
function heroInstance(file, targetH) {
  const meta = HERO_TREES[file];
  return loadModel('assets/models/' + file).then((tpl) => {
    if (!tpl) return null;
    const m = tpl.scene.clone(true);
    fitHeight(m, targetH);
    const s = targetH / meta.h;
    m.position.x -= (meta.ax - meta.cx) * s;
    m.position.z -= (meta.az - meta.cz) * s;
    shadowify(m);
    const g = new THREE.Group();
    g.add(m);
    return { group: g, scale: s, meta };
  }).catch(() => null);
}

// Visual height for an elm: registered canopy top plus a crown allowance,
// so the GLB silhouette roughly matches the procedural tree it replaces.
function elmTargetH(rec) {
  return (rec.canopyY - rec.gy) + rec.canopyR * 0.55;
}

function swapHeroTrees(scene) {
  // The Hollow tree by the Frog Pond gets the biggest tree (Tree1, 8,520 tris).
  // Its knot-hole + rim are the Hollow's front door, so they stay visible and
  // are re-seated on the GLB trunk's surface; only trunk + leaf blobs hide.
  if (hollowVisual) {
    const hv = hollowVisual;
    const targetH = elmTargetH(hv.rec);
    heroInstance('Tree1.glb', targetH).then((hero) => {
      if (!hero) return;
      hero.group.position.set(hv.rec.x, hv.rec.gy, hv.rec.z);
      scene.add(hero.group);
      hv.trunk.visible = false;
      for (const leaf of hv.leaves) leaf.visible = false;
      // re-seat the knot-hole on the (slimmer) GLB trunk, shrunk to fit it
      const trunkR = hero.meta.trunkR * hero.scale;
      const f = Math.min(1, Math.max(0.45, trunkR / 1.15));
      hv.hole.scale.set(f, 1.35 * f, 1);
      hv.rim.scale.set(f, 1.35 * f, 1);
      hv.hole.position.set(0, 0.42, trunkR + 0.03);
      hv.rim.position.copy(hv.hole.position);
    });
  }

  // The Mall: elms flanking the central promenade (z = -18) become heroes.
  const mall = elmVisuals
    .filter(({ rec }) => rec.x >= -30 && rec.x <= 196 && Math.abs(rec.z + 18) <= 13)
    .sort((a, b) => (Math.abs(a.rec.z + 18) - Math.abs(b.rec.z + 18)) || (a.rec.x - b.rec.x))
    .slice(0, 10);
  const mallModels = ['Tree2.glb', 'Tree3.glb', 'Tree4.glb'];

  // Public Garden specimens: a spread of Garden elms across the west half.
  const gardenAll = elmVisuals
    .filter(({ rec }) => rec.x < -60)
    .sort((a, b) => a.rec.x - b.rec.x);
  const garden = [];
  if (gardenAll.length) {
    const stride = Math.max(1, Math.floor(gardenAll.length / 6));
    for (let i = 0; i < gardenAll.length && garden.length < 6; i += stride) garden.push(gardenAll[i]);
  }
  const gardenModels = ['Tree3.glb', 'Tree5.glb', 'Tree4.glb', 'Tree2.glb'];

  const place = ({ group, rec }, file) => {
    let use = file;
    // Tree5 is a small squat tree; never blow it up to full elm height.
    if (use === 'Tree5.glb' && elmTargetH(rec) > 9.5) use = 'Tree3.glb';
    heroInstance(use, elmTargetH(rec)).then((hero) => {
      if (!hero) return;
      hero.group.position.set(rec.x, rec.gy, rec.z);
      hero.group.rotation.y = heroYaw(rec.x, rec.z);
      scene.add(hero.group);
      group.visible = false;
    });
  };
  mall.forEach((e, i) => place(e, mallModels[i % mallModels.length]));
  garden.forEach((e, i) => place(e, gardenModels[i % gardenModels.length]));
}
