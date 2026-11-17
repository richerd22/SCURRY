// SCURRY - street walls: the built edges that define the parks. The Common
// and Garden read as places because of what faces them - Beacon St's
// brownstone row to the north, Charles St's shopfronts between the parks,
// and the ring of city blocks behind everything. All procedural, all
// instanced: whole streets land in a dozen draw calls.

import * as THREE from 'three';
import { S } from '../state.js';
import { brownstoneFacade, storefrontFacade, tremontFacade } from './textures.js';

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
  const lintels = [], sills = [];
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
      let bowOff = null, bowTop = 0;
      if (R() < 0.72) {
        const bx = cx + (R() - 0.5) * 2.2, bh = h - 3.1, by = base + 1.15;
        bowOff = bx - cx; bowTop = by + bh;
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
      // fence-line relief (v0.6.18): the flat fronts were texture-only, so
      // at the fence they read flat. Give every painted window a real
      // stone lintel + sill, placed from the texture's own grid
      // (brownstoneFacade: cols at px 52/128/204 of 256, rows below).
      // Windows hidden behind the bow keep the bow's own glass instead;
      // the parlor sill beside the stoop would clip the door - skipped
      // (its lintel doubles as the door's). No R() calls here: the
      // seeded row layout above must not shift.
      for (const [wy, wh] of [[30, 76], [140, 76], [250, 76], [360, 108]]) {
        const topY = base + h * (1 - wy / 512), botY = base + h * (1 - (wy + wh) / 512);
        const midY = (topY + botY) / 2;
        for (const off of [-2.375, 0, 2.375]) {
          if (bowOff !== null && Math.abs(off - bowOff) < 1.8 && midY < bowTop - 0.1) continue;
          lintels.push({ p: [cx + off, topY + 0.13, frontZ + 0.05], s: [1.9, 0.24, 0.14] });
          if (!(wy === 360 && off === 2.375)) {
            sills.push({ p: [cx + off, botY - 0.08, frontZ + 0.05], s: [1.85, 0.15, 0.2] });
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
  if (lintels.length) scene.add(instanced(boxGeo(), stoneMat, lintels));
  if (sills.length) scene.add(instanced(boxGeo(), stoneMat, sills));
}

// ---------- Ring blocks: the city mass behind everything ----------
// Was ~38 individual boxes + 38 roof caps (~76 draw calls, unseeded
// heights). Now instanced by facade material with setback tiers, roof
// caps on the top tier, and the odd rooftop water tower - 6 draw calls,
// same city-glow materials, and pushed back a street's width on the
// north so the Beacon row owns that edge.
export function buildRingBlocks(scene) {
  const R = rng(20261119);
  const bodies = [[], [], []], caps = [], tanks = [], tankCaps = [];
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 1 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.95 });
  function block(x, z, w, d, h, ry = 0) {
    const v = (R() * 3) | 0, tone = 0.82 + R() * 0.3;
    const col = new THREE.Color(tone, tone, tone).getHex();
    bodies[v].push({ p: [x, h / 2 - 1, z], s: [w, h, d], ry, c: col });
    let tw = w, td = d, top = h - 1;
    if (R() < 0.45) { // setback tier 2
      tw *= 0.68; td *= 0.68; const h2 = h * (0.4 + R() * 0.25);
      bodies[v].push({ p: [x, top + h2 / 2, z], s: [tw, h2, td], ry, c: col });
      top += h2;
      if (R() < 0.4) { // tier 3
        tw *= 0.7; td *= 0.7; const h3 = h * (0.22 + R() * 0.18);
        bodies[v].push({ p: [x, top + h3 / 2, z], s: [tw, h3, td], ry, c: col });
        top += h3;
      }
    }
    caps.push({ p: [x, top + 0.3, z], s: [tw * 1.05, 0.6, td * 1.05], ry });
    if (R() < 0.16) { // rooftop water tower (cap derived from the tank below)
      tanks.push({ p: [x + (R() - 0.5) * w * 0.3, top + 2.2, z + (R() - 0.5) * d * 0.3], s: [1, 3.2, 1] });
    }
  }
  for (let x = -204; x <= 208; x += 33) {
    block(x + (R() - 0.5) * 6, -138, 24 + R() * 6, 22, 20 + R() * 26);       // north, behind Beacon
    block(x + (R() - 0.5) * 6, 136, 24 + R() * 6, 22, 20 + R() * 26);        // south, behind Boylston
  }
  for (let z = -96; z <= 100; z += 33) {
    block(237, z + (R() - 0.5) * 6, 22, 24 + R() * 6, 22 + R() * 28);        // east, behind the Tremont row
    block(-234, z + (R() - 0.5) * 6, 22, 24 + R() * 6, 18 + R() * 22);       // west, behind Arlington
  }
  bodies.forEach((items, i) => { if (items.length) scene.add(instanced(boxGeo(), S.cityMats[i], items)); });
  scene.add(instanced(boxGeo(), capMat, caps));
  if (tanks.length) {
    scene.add(instanced(new THREE.CylinderGeometry(1.7, 1.7, 1, 9), tankMat, tanks));
    for (const t of tanks) tankCaps.push({ p: [t.p[0], t.p[1] + 2.3, t.p[2]], s: [1, 1.5, 1] });
    scene.add(instanced(new THREE.ConeGeometry(2.05, 1, 9), tankMat, tankCaps));
  }
}

// ---------- Boylston (south) + Arlington (west): lower-detail street rows ----------
// Plain city-facade slabs at streetwall scale, varied heights and tones,
// stone cornice strips - the parks' south and west faces get a street,
// not a void. One instanced pass per material, like the ring.
export function buildSouthWestRows(scene, groundHeight) {
  const R = rng(20261120);
  const bodies = [[], [], []], cornices = [], caps = [];
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb8ac96, roughness: 0.9 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 1 });
  function unit(cx, cz, w, d, frontGy) {
    const v = (R() * 3) | 0, h = 10 + R() * 6, tone = 0.84 + R() * 0.26;
    const base = frontGy - 0.6, col = new THREE.Color(tone, tone, tone).getHex();
    bodies[v].push({ p: [cx, base + h / 2, cz], s: [w, h, d], c: col });
    cornices.push({ p: [cx, base + h + 0.08, cz], s: [w + 0.3, 0.4, d + 0.3] });
    caps.push({ p: [cx, base + h + 0.42, cz], s: [w - 0.2, 0.35, d - 0.2] });
  }
  for (let x = -202; x + 13 <= 204; x += 13) { // Boylston: fronts face the parks (north)
    unit(x + 6.5, 114, 13, 10, groundHeight(x + 6.5, 108));
  }
  for (let z = -92; z + 13 <= 94; z += 13) { // Arlington: fronts face the Garden (east)
    unit(-216, z + 6.5, 10, 13, groundHeight(-210, z + 6.5));
  }
  bodies.forEach((items, i) => { if (items.length) scene.add(instanced(boxGeo(), S.cityMats[i], items)); });
  scene.add(instanced(boxGeo(), stoneMat, cornices));
  scene.add(instanced(boxGeo(), capMat, caps));
}

// ---------- Tremont Street: the downtown edge, east side of the Common ----------
// The Common's east fence had only ring blocks behind it. Now the full
// streetscape: sidewalk + asphalt + crosswalks + lamps + parked cars,
// then a streetwall row across the street - storefront glass at street
// level, office massing above (tremontFacade), stone cornices, awnings.
// One notch more dressing than Boylston/Arlington because this edge is
// in constant view from the Mall and Frog Pond. Fronts face WEST (-x);
// they sit across the street from the fence, like the real Tremont.
export function buildTremontRow(scene, groundHeight) {
  const R = rng(20261121);
  const FRONT = 215.8, DEPTH = 9, CX = FRONT + DEPTH / 2;
  const bases = ['#6b5a48', '#59524e', '#716354'];
  const mats = bases.map((b, i) => {
    const f = tremontFacade(711 + i * 7, b);
    const m = new THREE.MeshStandardMaterial({
      map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffc37a,
      emissiveIntensity: 0.12, roughness: 0.92,
    });
    if (S.cityMats) S.cityMats.push(m);
    return m;
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb8ac96, roughness: 0.9 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 1 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9b968b, roughness: 0.95 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x33343a, roughness: 0.97 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.8 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.55, metalness: 0.6 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x443b28, emissive: 0xffc37a, emissiveIntensity: 0.12, roughness: 0.4,
  });
  if (S.cityMats) S.cityMats.push(bulbMat);
  const awnMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const awnCols = [0x2e4a34, 0x6e2430, 0x24344e, 0x1c1c1e, 0x74552a];

  // the street itself: asphalt slabs + a raised sidewalk on the park curb
  const street = [], walks = [];
  for (let z = -96; z < 96; z += 16) {
    street.push({ p: [209.9, groundHeight(209.9, z + 8) + 0.02, z + 8], s: [13.2, 0.1, 16.4] });
    walks.push({ p: [206.1, groundHeight(206.1, z + 8) + 0.09, z + 8], s: [3.0, 0.16, 16.4] });
  }
  scene.add(instanced(boxGeo(), asphaltMat, street));
  scene.add(instanced(boxGeo(), concrete, walks));

  // crosswalk zebras where the park paths meet the street (Park St, Frog Pond)
  const stripes = [];
  for (const cz of [-80, 14]) {
    for (let i = 0; i < 5; i++) stripes.push({ p: [208.6 + i * 1.55, groundHeight(210, cz) + 0.1, cz], s: [1.1, 0.05, 4.4] });
  }
  scene.add(instanced(boxGeo(), stripeMat, stripes));

  // street lamps on the park-side sidewalk (emissive bulbs only)
  const posts = [], bulbs = [];
  for (let i = 0; i < 8; i++) {
    const z = -91 + i * 26, x = 205.3;
    const gy = groundHeight(x, z);
    posts.push({ p: [x, gy + 2.3, z], s: [1, 4.6, 1] });
    bulbs.push({ p: [x, gy + 4.72, z], s: [1, 1, 1] });
  }
  scene.add(instanced(new THREE.CylinderGeometry(0.07, 0.1, 1, 6), ironMat, posts));
  scene.add(instanced(new THREE.SphereGeometry(0.17, 8, 6), bulbMat, bulbs));

  // parked cars along the far curb, clear of the two crossings
  const paints = [0x8a8d90, 0x2a2d33, 0x5a1f1f, 0x1f3350, 0xd8d5cc, 0x3a4a3a, 0x74552a];
  const carBodies = [], carCabins = [], carWheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.9 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1d242e, roughness: 0.3, metalness: 0.2 });
  const paintMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 });
  function car(x, z) {
    const gy = groundHeight(x, z);
    carBodies.push({ p: [x, gy + 0.62, z], s: [1.72, 0.58, 4.35], c: paints[(R() * paints.length) | 0] });
    carCabins.push({ p: [x, gy + 1.12, z + 0.28], s: [1.54, 0.46, 2.15] });
    for (const sx of [-0.8, 0.8]) for (const sz of [-1.38, 1.38]) {
      carWheels.push({ p: [x + sx, gy + 0.34, z + sz], s: [1, 1, 1], rz: Math.PI / 2 });
    }
    S.solidBoxes.push({ minX: x - 0.95, maxX: x + 0.95, minZ: z - 2.25, maxZ: z + 2.25 });
  }
  for (const z of [-92, -58, -40, -8, 34, 52, 78, 92]) car(213.4, z);
  scene.add(instanced(boxGeo(), paintMat, carBodies));
  scene.add(instanced(boxGeo(), cabinMat, carCabins));
  scene.add(instanced(wheelGeo, wheelMat, carWheels));

  // the streetwall row: 11 m units, storefront below, offices above
  const bodies = [[], [], []], cornices = [], caps = [], awnings = [];
  for (let z = -99; z + 11 <= 99.5; z += 11) {
    const cz = z + 5.5, v = (R() * 3) | 0, h = 15 + R() * 9;
    const base = groundHeight(CX, cz) - 0.6, tone = 0.82 + R() * 0.3;
    bodies[v].push({ p: [CX, base + h / 2, cz], s: [DEPTH, h, 11], c: new THREE.Color(tone, tone, tone).getHex() });
    cornices.push({ p: [CX, base + h + 0.12, cz], s: [DEPTH + 0.5, 0.5, 11.4] });
    caps.push({ p: [CX, base + h + 0.55, cz], s: [DEPTH - 0.3, 0.4, 10.7] });
    awnings.push({
      p: [FRONT - 0.95, base + h * 0.215 + 0.1, cz], s: [2.1, 0.09, 9.6], rz: 0.38,
      c: awnCols[(R() * awnCols.length) | 0],
    });
  }
  bodies.forEach((items, i) => { if (items.length) scene.add(instanced(boxGeo(), mats[i], items)); });
  scene.add(instanced(boxGeo(), stoneMat, cornices));
  scene.add(instanced(boxGeo(), capMat, caps));
  scene.add(instanced(boxGeo(), awnMat, awnings));
}

// ---------- Charles Street: shopfronts + streetscape between the parks ----------
// The asphalt band alone read as a gap. Now it has sidewalks, crosswalks,
// street lamps, parked cars, and a low shopfront row (Beacon Hill's Charles
// St shops are the reference) facing it from behind the Garden fence, with
// gaps left at the three path crossings (z -70, -18, 30).
export function buildCharlesStreet(scene, groundHeight) {
  const R = rng(20261118);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9b968b, roughness: 0.95 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.8 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.55, metalness: 0.6 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x443b28, emissive: 0xffc37a, emissiveIntensity: 0.12, roughness: 0.4,
  });
  if (S.cityMats) S.cityMats.push(bulbMat);

  // sidewalks: segmented slabs hugging the terrain on both curbs
  const walks = [];
  for (let z = -96; z < 96; z += 16) {
    for (const cx of [-59.9, -40.1]) {
      walks.push({ p: [cx, groundHeight(cx, z + 8) + 0.06, z + 8], s: [2.7, 0.14, 16.4] });
    }
  }
  scene.add(instanced(boxGeo(), concrete, walks));

  // crosswalk zebras at the three path crossings
  const stripes = [];
  for (const cz of [-70, -18, 30]) {
    for (let i = 0; i < 6; i++) stripes.push({ p: [-56.5 + i * 2.6, 0.055, cz], s: [1.7, 0.03, 3.6] });
  }
  scene.add(instanced(boxGeo(), stripeMat, stripes));

  // street lamps: plain posts + emissive bulbs (no PointLights - the park
  // lamps carry the light budget; these join the city-glow system instead)
  const posts = [], bulbs = [];
  for (let i = 0; i < 8; i++) {
    const z = -91 + i * 26, x = i % 2 ? -40.3 : -59.7;
    const gy = groundHeight(x, z);
    posts.push({ p: [x, gy + 2.3, z], s: [1, 4.6, 1] });
    bulbs.push({ p: [x, gy + 4.72, z], s: [1, 1, 1] });
  }
  scene.add(instanced(new THREE.CylinderGeometry(0.07, 0.1, 1, 6), ironMat, posts));
  scene.add(instanced(new THREE.SphereGeometry(0.17, 8, 6), bulbMat, bulbs));

  // parked cars: body + cabin + wheels, three instanced meshes total.
  // Curbs kept clear within 6 m of the crossings so path traffic reads.
  const paints = [0x8a8d90, 0x2a2d33, 0x5a1f1f, 0x1f3350, 0xd8d5cc, 0x3a4a3a, 0x74552a];
  const carBodies = [], carCabins = [], carWheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.9 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1d242e, roughness: 0.3, metalness: 0.2 });
  const paintMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 });
  function car(x, z, hz) {
    const gy = groundHeight(x, z);
    carBodies.push({ p: [x, gy + 0.62, z], s: [1.72, 0.58, 4.35], c: paints[(R() * paints.length) | 0] });
    carCabins.push({ p: [x, gy + 1.12, z - hz * 0.28], s: [1.54, 0.46, 2.15] });
    for (const sx of [-0.8, 0.8]) for (const sz of [-1.38, 1.38]) {
      carWheels.push({ p: [x + sx, gy + 0.34, z + sz], s: [1, 1, 1], rz: Math.PI / 2 });
    }
    S.solidBoxes.push({ minX: x - 0.95, maxX: x + 0.95, minZ: z - 2.25, maxZ: z + 2.25 });
  }
  for (const z of [-88, -52, -38, 2, 48, 64, 84]) car(-56.1, z, 1);
  for (const z of [-80, -46, -6, 12, 56, 76]) car(-43.9, z, -1);
  scene.add(instanced(boxGeo(), paintMat, carBodies));
  scene.add(instanced(boxGeo(), cabinMat, carCabins));
  scene.add(instanced(wheelGeo, wheelMat, carWheels));

  // shopfront row: two segments on the west side, fronts facing the street
  const shopDefs = [
    ['#6e4636', '#274435'], ['#5d4a3a', '#5e2430'], ['#71564a', '#24344e'],
  ];
  const shopMats = shopDefs.map(([b, band], i) => {
    const f = storefrontFacade(611 + i * 7, b, band);
    const m = new THREE.MeshStandardMaterial({
      map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffc37a,
      emissiveIntensity: 0.12, roughness: 0.92,
    });
    if (S.cityMats) S.cityMats.push(m);
    return m;
  });
  const awnMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const awnCols = [0x2e4a34, 0x6e2430, 0x24344e, 0x1c1c1e, 0x74552a];
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0x59524a, roughness: 1 });
  const shopBodies = [[], [], []], awnings = [], parapets = [];
  const FRONT = -63.8, DEPTH = 7.5, H = 7.8;
  for (const [z0, z1] of [[-58, -26], [-8, 22]]) {
    S.solidBoxes.push({ minX: FRONT - DEPTH, maxX: FRONT, minZ: z0, maxZ: z1 });
    const segBase = groundHeight(FRONT - DEPTH / 2, (z0 + z1) / 2) - 0.4;
    parapets.push({ p: [FRONT - DEPTH / 2, segBase + H + 0.18, (z0 + z1) / 2], s: [DEPTH + 0.3, 0.34, z1 - z0 + 0.3] });
    for (let z = z0; z + 6.2 <= z1 + 0.01; z += 6.2) {
      const cz = z + 3.1, v = (R() * 3) | 0;
      const base = groundHeight(FRONT - DEPTH / 2, cz) - 0.4;
      shopBodies[v].push({ p: [FRONT - DEPTH / 2, base + H / 2, cz], s: [DEPTH, H, 6.2] });
      awnings.push({
        p: [FRONT + 0.95, base + 3.08, cz], s: [2.2, 0.09, 5.5], rz: -0.38,
        c: awnCols[(R() * awnCols.length) | 0],
      });
    }
  }
  shopBodies.forEach((items, i) => { if (items.length) scene.add(instanced(boxGeo(), shopMats[i], items)); });
  scene.add(instanced(boxGeo(), awnMat, awnings));
  scene.add(instanced(boxGeo(), parapetMat, parapets));
}
