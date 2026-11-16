// SCURRY - trees. Big elms everywhere: climbable trunks, walkable canopy discs,
// and one great tree near the Frog Pond that hides the Hollow's front door.

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundHeight, distToPaths, inWater } from './world.js';

// small deterministic rng so the park is the same park every load
let seed = 1337;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 1 });
const trunkMat2 = new THREE.MeshStandardMaterial({ color: 0x6e563c, roughness: 1 });
const leafMats = [0x3f7031, 0x4c7d35, 0x5d8a3a, 0x6b8f3e].map(c =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));

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
    // canopy: 3-4 flattened blobs; the lowest blob's underside is the walkable platform
    const canopyR = 2.6 + rnd() * 1.3;
    const canopyY = gy + h + 0.6;
    const blobs = 3 + (rnd() * 2 | 0);
    for (let i = 0; i < blobs; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafMats[(rnd() * leafMats.length) | 0]);
      const r = canopyR * (0.62 + rnd() * 0.45);
      leaf.scale.set(r, r * 0.55, r);
      leaf.position.set((rnd() - 0.5) * 2.4, h + 0.6 + (rnd() - 0.5) * 1.1, (rnd() - 0.5) * 2.4);
      leaf.castShadow = true;
      tree.add(leaf);
    }
    tree.position.set(x, gy, z);
    scene.add(tree);
    S.trees.push({ x, z, r: 0.55, gy, trunkTop: gy + h, canopyY, canopyR });
    S.platforms.push({ x, z, r: canopyR * 0.92, y: canopyY - 0.55 });
    S.solids.push({ x, z, r: 0.62 });
  }

  buildHollowTree(scene);
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
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
    const r = 3.4 + (i % 3);
    leaf.scale.set(r, r * 0.55, r);
    leaf.position.set((i - 2) * 1.6, h + 0.8 + (i % 2) * 0.9, ((i * 7) % 3 - 1) * 1.8);
    leaf.castShadow = true;
    tree.add(leaf);
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
}
