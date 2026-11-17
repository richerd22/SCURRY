// SCURRY - street walls: the built edges that define the parks. The Common
// and Garden read as places because of what faces them - Beacon St's
// brownstone row to the north, Charles St's shopfronts between the parks,
// and the ring of city blocks behind everything. All procedural, all
// instanced: whole streets land in a dozen draw calls.

import * as THREE from 'three';
import { S } from '../state.js';
import { brownstoneFacade } from './textures.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const _d = new THREE.Object3D();
const _c = new THREE.Color();
// Build an InstancedMesh from a list of {p:[x,y,z], s:[sx,sy,sz], ry?, rz?, c?}
function instanced(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    _d.position.set(it.p[0], it.p[1], it.p[2]);
    _d.rotation.set(0, it.ry || 0, it.rz || 0);
    _d.scale.set(it.s[0], it.s[1], it.s[2]);
    _d.updateMatrix();
    m.setMatrixAt(i, _d.matrix);
    if (it.c) m.setColorAt(i, _c.set(it.c));
  });
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.frustumCulled = false;
  return m;
}
const boxGeo = () => new THREE.BoxGeometry(1, 1, 1);

// ---------- Beacon Street: the brownstone / bow-front row ----------
// Faces the Common along its whole north edge (and the Garden's), at
// townhouse scale - 8 m party-wall units, parlor floor raised over a
// basement, stoops, iron rails, stone cornices. The State House end
// steps up the terrace with the terrain, like the real street.
export function buildBeaconRow(scene, groundHeight) {
  const R = rng(20261117);
  const bases = ['#6d4630', '#59392a', '#7d5a3c', '#66453a'];
  const mats = bases.map((b, i) => {
    const f = brownstoneFacade(511 + i * 7, b);
    const m = new THREE.MeshStandardMaterial({
      map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffc37a,
      emissiveIntensity: 0.12, roughness: 0.94,
    });
    if (S.cityMats) S.cityMats.push(m);
    return m;
  });
  const bowMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.9 });
  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x8f887a, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 1 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x1f1a16, roughness: 0.8 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.55, metalness: 0.6 });
  const glassDark = new THREE.MeshStandardMaterial({ color: 0x222a34, roughness: 0.35, metalness: 0.15 });
  const glassLit = new THREE.MeshStandardMaterial({
    color: 0x2a2118, emissive: 0xffc37a, emissiveIntensity: 0.12, roughness: 0.4,
  });
  if (S.cityMats) S.cityMats.push(glassLit);

  const bodies = [[], [], [], []], bows = [], bowWinDark = [], bowWinLit = [];
  const cornices = [], caps = [], stoops = [], doors = [], rails = [];
  function row(x0, x1, frontZ) {
    for (let x = x0; x + 8 <= x1 + 0.01; x += 8) {
      const cx = x + 4, h = 12.4 + R() * 1.8, v = (R() * 4) | 0;
      const base = groundHeight(cx, frontZ + 3) - 0.7;
      const tone = 0.8 + R() * 0.24;
      bodies[v].push({ p: [cx, base + h / 2, frontZ - 4.5], s: [8, h, 9], c: new THREE.Color(tone, tone, tone).getHex() });
      cornices.push({ p: [cx, base + h + 0.12, frontZ - 4.5], s: [8.35, 0.55, 9.5] });
      caps.push({ p: [cx, base + h + 0.62, frontZ - 4.5], s: [7.9, 0.5, 8.9] });
      // stoop up to the raised parlor door + the door itself
      const dx = cx + 2.1;
      stoops.push({ p: [dx, base + 0.48, frontZ + 0.8], s: [2.1, 0.96, 1.7] });
      stoops.push({ p: [dx, base + 0.24, frontZ + 2.05], s: [2.1, 0.48, 0.85] });
      doors.push({ p: [dx, base + 2.2, frontZ + 0.07], s: [1.2, 2.5, 0.12] });
      // area railings along the front line
      rails.push({ p: [cx, base + 1.04, frontZ + 1.62], s: [7.8, 0.06, 0.06] });
      rails.push({ p: [cx, base + 0.58, frontZ + 1.62], s: [7.8, 0.05, 0.05] });
      // bow front on most units: a half-cylinder bay with its own glass
      if (R() < 0.72) {
        const bx = cx + (R() - 0.5) * 2.2, bh = h - 3.1, by = base + 1.15;
        bows.push({ p: [bx, by + bh / 2, frontZ - 0.25], s: [1, bh, 1], c: new THREE.Color(bases[v]).multiplyScalar(0.92 + R() * 0.16).getHex() });
        for (const fy of [0.3, 0.54, 0.78]) {
          for (const a of [-0.62, 0, 0.62]) {
            const item = {
              p: [bx + Math.sin(a) * 1.96, base + h * fy, frontZ - 0.25 + Math.cos(a) * 1.96],
              s: [0.66, 1.55, 0.08], ry: a,
            };
            (R() < 0.35 ? bowWinLit : bowWinDark).push(item);
          }
        }
      }
    }
  }
  row(-36, 204, -110.5);   // the Common's north edge
  row(-200, -68, -107);    // the Garden's north edge (Beacon St again)

  const bowGeo = new THREE.CylinderGeometry(1.9, 1.9, 1, 9, 1, false, -Math.PI / 2, Math.PI);
  bodies.forEach((items, i) => { if (items.length) scene.add(instanced(boxGeo(), mats[i], items)); });
  if (bows.length) scene.add(instanced(bowGeo, bowMat, bows));
  if (bowWinDark.length) scene.add(instanced(boxGeo(), glassDark, bowWinDark));
  if (bowWinLit.length) scene.add(instanced(boxGeo(), glassLit, bowWinLit));
  scene.add(instanced(boxGeo(), stoneMat, cornices));
  scene.add(instanced(boxGeo(), roofMat, caps));
  scene.add(instanced(boxGeo(), graniteMat, stoops));
  scene.add(instanced(boxGeo(), doorMat, doors));
  scene.add(instanced(boxGeo(), ironMat, rails));
}
