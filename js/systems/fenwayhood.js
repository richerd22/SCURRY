// SCURRY - the Fenway neighborhood: the world OUTSIDE the park.
//
// Fenway used to sit on a plain grey apron - emerge behind home plate and
// everything beyond the walls was void. This module builds the surveyed
// neighborhood around it at the FEN anchor:
//
//   - 174 BPDA massing buildings (City of Boston open data, tile BOS_F_5,
//     PDDL terms - clean to ship), converted from the city's own OBJ
//     models with surveyed footprints + heights and banked as
//     assets/models/fenway-neighborhood.glb. Method, filters and the
//     attribution row: assets-library/models/fenway-neighborhood-bpda/.
//     Massing shells are the right fidelity out here: this is backdrop,
//     seen over the walls, not a second detailed park.
//   - The street grid in the park's own street treatment (asphalt slabs,
//     raised sidewalks, zebra crossings, iron lamps, parked cars):
//     Lansdowne St along the Monster, Brookline Ave down the west side,
//     Boylston St along the south. Jersey St gets NO ribbon - the
//     Warehouse park model's own photo slabs already fill that corridor
//     and a ribbon would bury them / poke through them. Van Ness St
//     likewise stays apron + BPDA shells.
//   - The CITGO sign, hand-built (code geometry + canvas texture - the
//     haul's CITGO SketchUp file is terms-unknown and stays out). The
//     host shell is BPDA model BOS-J3ZCV-XBDQO-P85WZ (the city's catalog
//     literally names it "CITGO Sign"); the panel stands on that shell's
//     surveyed Fenway-facing surface at (116.6, -278.5), 18.3 x 18.3 m,
//     top at the shell's surveyed 27.4 m, facing home plate. Sightlines
//     were raycast against the converted geometry before building:
//     CLEAR from the Monster top and the grandstand line, blocked from
//     field level by the park's own wall - which is also true of the
//     real sign. It burns at night off S.lampFactor like everything
//     else out here.
//
// PLAYER EXPERIENCE - the clamp stays. The neighborhood is backdrop,
// deliberately: there is no honest gate out of the park (the grandstand
// and the Jersey St slabs wall the south, the Monster walls the north),
// and a teleport hop would break the burrow fiction worse than a fence
// does. The field, the Monster climb and the burrow door flow are
// untouched; the squirrel's Fenway stays the field, now with a city
// around it instead of a void. The street props carry no collision
// boxes - the player can never reach them.
//
// NIGHT - the massing follows the Fenway sky discipline: the walls
// material sits in S.cityMats, so daycycle drives its emissive windows
// (a deterministic ~18% of the window grid, warm) and the streetlamp
// bulbs off the same lamp factor as the park's own rig. Nothing out
// here glows on its own.

import * as THREE from 'three';
import { S } from '../state.js';
import { FEN } from './fenway.js';
import { loadModel } from './models.js';

// deterministic little RNG - the layout must be byte-stable run to run
let _seed = 20261117;
function R() { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; }

const _d = new THREE.Object3D();
const _c = new THREE.Color();
function instanced(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    _d.position.set(it.p[0], it.p[1], it.p[2]);
    _d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    _d.scale.set(it.s[0], it.s[1], it.s[2]);
    _d.updateMatrix();
    m.setMatrixAt(i, _d.matrix);
    if (it.c) m.setColorAt(i, _c.set(it.c));
  });
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  // a real bounding sphere over the instances: the whole island sits
  // 6000 m from the Common, so this culls the streets out of every
  // park-side frame (streetwalls sets frustumCulled=false instead -
  // its streets are always near the player; these are not).
  m.computeBoundingSphere();
  return m;
}
const boxGeo = () => new THREE.BoxGeometry(1, 1, 1);

function slab(g, geo, mat, w, h, d, x, yTop, z) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(w, h, d);
  m.position.set(x, yTop - h / 2, z);
  m.receiveShadow = true;
  g.add(m);
  return m;
}

// ------------------------------------------------------------ facade art
// One 12.8 m x 12.8 m tile: a 4 x 4 grid of 3.2 m window cells, drawn
// twice - the daylight facade and its night twin (black except the lit
// windows) - so the emissive map lines up cell for cell.
function winRect(col, row) { return [col * 128 + 34, row * 128 + 30, 60, 68]; }
function cellHash(col, row) {
  const v = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return v - Math.floor(v);
}
function facadeCanvases() {
  const day = document.createElement('canvas'); day.width = day.height = 512;
  const d = day.getContext('2d');
  d.fillStyle = '#ece7dc'; d.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      d.fillStyle = 'rgba(120,100,80,' + (0.02 + R() * 0.05).toFixed(3) + ')';
      d.fillRect(col * 128, row * 128, 128, 128);
      const [x, y, w, h] = winRect(col, row);
      d.fillStyle = cellHash(col + 9, row + 3) < 0.10 ? '#66727f' : '#2e3844';
      d.fillRect(x, y, w, h);
      d.fillStyle = 'rgba(255,255,255,0.10)';
      d.fillRect(x, y, w, 10); // a lintel glint on every pane
    }
    d.fillStyle = 'rgba(70,60,50,0.25)';
    d.fillRect(0, row * 128 - 2, 512, 3); // floor band
  }
  const glow = document.createElement('canvas'); glow.width = glow.height = 512;
  const n = glow.getContext('2d');
  n.fillStyle = '#000'; n.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const hsh = cellHash(col, row);
      if (hsh >= 0.18) continue;
      const [x, y, w, h] = winRect(col, row);
      n.fillStyle = hsh < 0.04 ? '#ffe2b0' : (hsh < 0.10 ? '#ffc37a' : '#ff9e4f');
      n.fillRect(x, y, w, h);
    }
  }
  return { day, glow };
}

// ------------------------------------------------------------ CITGO sign
// The trimark + wordmark, drawn the way the real panel reads: red nested
// triangle over blue CITGO letters on a white ground. Canvas art, no
// sourced imagery.
function citgoCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#f5f3ee'; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = '#b9b4a8'; x.lineWidth = 6; x.strokeRect(8, 8, 496, 496);
  function tri(cx, top, half, base, fill) {
    x.fillStyle = fill; x.beginPath();
    x.moveTo(cx, top); x.lineTo(cx - half, base); x.lineTo(cx + half, base);
    x.closePath(); x.fill();
  }
  tri(256, 58, 118, 252, '#d42b1e');
  tri(256, 104, 82, 252, '#f5f3ee');
  tri(256, 152, 46, 252, '#d42b1e');
  x.fillStyle = '#1e3a96';
  x.font = '800 108px Arial, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  try { x.letterSpacing = '4px'; } catch (e) { /* older canvas: fine */ }
  x.fillText('CITGO', 256, 368);
  return c;
}

// surveyed placement (see header): panel centre on the host shell's
// Fenway-facing surface, face normal toward home plate.
const CITGO_POS = { x: 116.6, z: -278.5 };
const CITGO_YAW = Math.atan2(-0.4652, 0.8852); // normal -> home plate
let citgoMat = null;

function buildCitgo(g) {
  const grp = new THREE.Group();
  grp.position.set(CITGO_POS.x, 0, CITGO_POS.z);
  grp.rotation.y = CITGO_YAW;
  const steel = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.8, metalness: 0.3 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(19.4, 19.4, 0.9), steel);
  frame.position.y = 18.25;
  grp.add(frame);
  const tex = new THREE.CanvasTexture(citgoCanvas());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  citgoMat = new THREE.MeshLambertMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0,
    // fog:false on the sign alone: the scene's night fog (far 230 m, a
    // Common-scale mood grade) would swallow a 257 m sightline whole,
    // but the real sign is floodlit and punches through haze that
    // swallows unlit massing - that is its whole deal. The unlit
    // neighborhood keeps the fog discipline; only the lit panel opts
    // out, and its night level is tempered (see updateFenwayHood).
    fog: false,
  });
  const faceGeo = new THREE.PlaneGeometry(18.3, 18.3);
  const front = new THREE.Mesh(faceGeo, citgoMat);
  front.position.set(0, 18.25, 0.5);
  grp.add(front);
  const back = new THREE.Mesh(faceGeo, citgoMat);
  back.position.set(0, 18.25, -0.5);
  back.rotation.y = Math.PI;
  grp.add(back);
  // support legs + crossbar: the shell fills most of this space; where
  // the photogrammetry dips, the structure reads as the sign's own.
  for (const lx of [-5.5, 5.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 9.4, 0.55), steel);
    leg.position.set(lx, 4.7, 0);
    grp.add(leg);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.55, 0.55), steel);
  bar.position.y = 9.0;
  grp.add(bar);
  g.add(grp);
}

// ------------------------------------------------------------ streets
function buildStreets(g) {
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x33343a });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x8f8c84 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xd8d5cc });
  const unit = boxGeo();
  // [w, d, cx, cz] per ribbon - surveyed street lines, see header
  const asphalt = [
    [335, 11, 17.5, -68.5],   // Lansdowne St
    [340, 16, -5, 131],       // Boylston St
    [14, 230, -130, 20],      // Brookline Ave
  ];
  const walks = [
    [335, 4.5, 17.5, -76.25], [335, 3, 17.5, -61.5],     // Lansdowne
    [340, 3.5, -5, 121.25], [340, 3.5, -5, 140.75],      // Boylston
    [3.5, 230, -121.25, 20], [3.5, 230, -138.75, 20],    // Brookline
  ];
  for (const [w, d, x, z] of asphalt) slab(g, unit, asphaltMat, w, 0.3, d, x, 0.02, z);
  for (const [w, d, x, z] of walks) slab(g, unit, walkMat, w, 0.34, d, x, 0.10, z);

  // zebra crossings: Brookline x Lansdowne, Brookline x Boylston,
  // and the Lansdowne east crossing toward Jersey St
  const stripes = [];
  for (let i = 0; i < 5; i++) stripes.push({ p: [-134.5 + i * 2, 0.032, -68.5], s: [0.55, 0.02, 9] });
  for (let i = 0; i < 6; i++) stripes.push({ p: [-130, 0.032, 125.5 + i * 2.5], s: [12, 0.02, 0.55] });
  for (let i = 0; i < 5; i++) stripes.push({ p: [146 + i * 2.4, 0.032, -68.5], s: [0.55, 0.02, 9] });
  g.add(instanced(unit, stripeMat, stripes));

  // iron lamps on the far sidewalks - bulbs join the city-glow system
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.7, metalness: 0.4 });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0x35322a, emissive: 0xffd9a0 });
  if (S.cityMats) S.cityMats.push(bulbMat);
  const posts = [], bulbs = [];
  const lampAt = (x, z) => { posts.push({ p: [x, 2.3, z], s: [1, 1, 1] }); bulbs.push({ p: [x, 4.72, z], s: [1, 1, 1] }); };
  for (const x of [-140, -100, -60, -20, 20, 60, 100, 140, 175]) lampAt(x, -76.2);
  for (const x of [-160, -110, -60, -10, 40, 90, 140]) lampAt(x, 121.2);
  for (const z of [-80, -30, 20, 70, 120]) lampAt(-121.2, z);
  g.add(instanced(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 6), ironMat, posts));
  g.add(instanced(new THREE.SphereGeometry(0.17, 8, 6), bulbMat, bulbs));

  // parked cars, the streetwalls recipe (body + cabin + wheels, three
  // instanced meshes). No solidBoxes - the clamp keeps the player on
  // the field, these are pure set dressing.
  const paints = [0x8a8d90, 0x2a2d33, 0x5a1f1f, 0x1f3350, 0xd8d5cc, 0x3a4a3a, 0x74552a];
  const paintMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1d242e, roughness: 0.3, metalness: 0.2 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.9 });
  const bodies = [], cabins = [], wheels = [];
  function car(x, z, alongX) {
    const c = paints[((R() * paints.length) | 0)];
    if (alongX) {
      bodies.push({ p: [x, 0.62, z], s: [4.35, 0.58, 1.72], c });
      cabins.push({ p: [x + 0.28, 1.12, z], s: [2.15, 0.46, 1.54] });
      for (const sx of [-1.38, 1.38]) for (const sz of [-0.8, 0.8])
        wheels.push({ p: [x + sx, 0.34, z + sz], s: [1, 1, 1], rx: Math.PI / 2 });
    } else {
      bodies.push({ p: [x, 0.62, z], s: [1.72, 0.58, 4.35], c });
      cabins.push({ p: [x, 1.12, z + 0.28], s: [1.54, 0.46, 2.15] });
      for (const sx of [-0.8, 0.8]) for (const sz of [-1.38, 1.38])
        wheels.push({ p: [x + sx, 0.34, z + sz], s: [1, 1, 1], rz: Math.PI / 2 });
    }
  }
  for (const x of [-125, -92, -34, 42, 88, 148]) car(x, -66.8, true);   // Lansdowne, park-side lane
  for (const x of [-142, -96, -48, 12, 68, 118]) car(x, 126.8, true);   // Boylston, park-side lane
  for (const z of [-58, -8, 44, 92]) car(-133.8, z, false);             // Brookline, west lane
  g.add(instanced(unit, paintMat, bodies));
  g.add(instanced(unit, cabinMat, cabins));
  g.add(instanced(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10), wheelMat, wheels));
}

// ------------------------------------------------------------ build
let hoodGroup=null,hoodLoad=null;
// Background massing is 2.60 MiB. Build the procedural street grid at
// startup but do NOT fetch city meshes until the squirrel visits Fenway.
export function buildFenwayHood(scene) {
  const g = new THREE.Group();
  g.position.copy(FEN);
  scene.add(g);
  buildStreets(g);
  buildCitgo(g);
  hoodGroup=g;
  S.ensureFenwayHoodModel=ensureFenwayHoodModel;
  S.fenwayHoodAssetStatus='idle';
}

// Explicit demand load: the already-built streets and CITGO sign remain
// usable if the model is missing or a slow network never completes.
// No deferred callback can teleport the squirrel or mutate ground floors.
export function ensureFenwayHoodModel(){
  if(!hoodGroup)return Promise.resolve(null);
  if(hoodLoad)return hoodLoad;
  S.fenwayHoodAssetStatus='loading';

  // the surveyed massing: async + best-effort like every sourced model.
  // The streets and the sign are procedural and stand on their own if
  // the GLB never lands.
  hoodLoad=loadModel('assets/models/fenway-neighborhood.glb').then((tpl) => {
    if(!tpl){S.fenwayHoodAssetStatus='fallback';return null;}
    const { day, glow } = facadeCanvases();
    const facadeTex = new THREE.CanvasTexture(day);
    facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
    facadeTex.colorSpace = THREE.SRGBColorSpace;
    facadeTex.anisotropy = 4;
    const glowTex = new THREE.CanvasTexture(glow);
    glowTex.wrapS = glowTex.wrapT = THREE.RepeatWrapping;
    const wallMat = new THREE.MeshLambertMaterial({
      map: facadeTex, emissiveMap: glowTex, emissive: 0xffc37a, vertexColors: true,
    });
    if (S.cityMats) S.cityMats.push(wallMat);
    const roofMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    tpl.scene.traverse((o) => {
      if (!o.isMesh) return;
      if (o.name === 'hood-walls') o.material = wallMat;
      else if (o.name === 'hood-roofs') o.material = roofMat;
      o.castShadow = false;   // backdrop: outside the park's shadow framing anyway
      o.receiveShadow = true;
    });
    hoodGroup.add(tpl.scene);
    S.fenwayHoodAssetStatus='ready';
    return tpl;
  });
  return hoodLoad;
}

export function updateFenwayHood(dt) {
  // the sign is floodlit after dark; it rides the same lamp factor the
  // day cycle publishes for the Fenway rig. (The hood's windows + lamp
  // bulbs need no driver here - they are in S.cityMats.)
  if (citgoMat) citgoMat.emissiveIntensity = (S.lampFactor || 0) * 0.9;
}
