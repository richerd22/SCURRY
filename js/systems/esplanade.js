// SCURRY - the Esplanade + Hatch Shell. The burrows run north too:
// one old tunnel climbs the riverbank and lets out in a mulched tree
// bed on the Charles River Esplanade - the Hatch Shell on its lawn,
// the path, the granite seawall, and the whole grey-green river
// sliding past toward the Longfellow Bridge. Cambridge watches from
// across the water and keeps its opinions over there.
//
// The shell is the BPDA / City of Boston 3D model of the Hatch
// Memorial Shell (tile BOS_H_4, CyberCity 3D LOD 1.5 photogrammetry
// shell - see assets-library/ATTRIBUTION.md, Hatch Memorial Shell
// row). Terms are PDDL (City of Boston open data) - clean to ship,
// attributed. It is a massing model - exterior only, one untextured
// material, a CLOSED solid (there is no hollow conch to stand in) -
// so it stands on its granite pad as scenery and the Esplanade
// around it is composed in code: lawn, oval, gravel path, seawall
// bank, stepping stones, elms, benches, lamps, backdrop skylines.
//
// It lives far off-map at ESP (-3000, 0, -6000), north-west - clear
// of the Common, the Hollow (1000, 0, 1000), the Burrows (3000, 0,
// 3000), Fenway (6000, 0, 6000), TD Garden (-6000, 0, 6000) and City
// Hall (6000, 0, 3000). The anchor was PROBED before committing
// (harness/espprobe.js): groundHeight() over the whole 640 m grid
// answers exactly 0 at every one of 1681 points. Due north (0, 0,
// -6000) was rejected: its grid's east columns (world x > 172) catch
// the State House terrace term (8.0 * smooth01((x-146)/26) *
// smooth01((-z-50)/22), which extends infinitely over the x > 172,
// z < -72 quadrant - the same phantom plateau that moved City Hall.
// At x = -3000 the entire zone sits west of the term's reach.
//
// Heights here are an embankment, deliberately: the land stands at
// LAND_Y 1.05, the riverbed at 0, the water plane at 0.5. The bed
// MUST be 0 - player.js surfaceAt() starts from groundHeight(),
// which answers 0 out here, so any destination floor below 0 is
// unwalkable (the physics would snap the squirrel back up to 0).
// With the bed at 0 the wade is honest physics, and the land rides
// the same raise-to-ground pattern City Hall's podium proved.
//
// The river uses the park's own water: the shared S.waterMat
// (DoubleSide since v0.6.28, daycycle-driven sheen) on the river
// plane, and the zone registers its water body in S.waterBodiesExtra
// so daycycle's v0.6.28 submerge read (murk fog + tint) covers the
// Charles too. Wading the deep part puts a 25 cm squirrel's eye
// under the plane - that is the read working, not a bug.
//
// Reachable like the others: a door in the rat market (NORTH wall,
// west of the Exchange stall - Fenway owns the east wall, TD Garden
// the west, City Hall the south), signed RIVERBOUND / THE
// ESPLANADE, "E - take the river run" -> emergence in the tree bed,
// "E - dive back to the burrows" returns to the market.

import * as THREE from 'three';
import { S } from '../state.js';
import { loadModel } from './models.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { TUN, spawnCapAt } from './burrows.js';
import { spawnFood } from './food.js';

// ---------------------------------------------------------------- layout
export const ESP = new THREE.Vector3(-3000, 0, -6000);
const LAND_Y = 1.05;                     // the embankment top
const WATER_Y = 0.5;                     // the river plane
const BED_Y = 0;                         // the riverbed (== groundHeight out here)
const HOLE_L = { x: 56, z: 14 };         // the burrow mouth, in its tree bed
const SHELL = { cx: 0, cz: 26 };         // the shell's seat on its pad
const PAD = { x0: -26, x1: 26, z0: 6, z1: 46, y: 1.17 };
// the bank: verge to z -41, riprap slope z -44..-41, bed beyond
const SLOPE = { zTop: -41, zBot: -44 };
// stepping stones into the shallows (platformBox tops)
const STONE_A = { x: 21, z: -49, y: WATER_Y - 0.02 };
const STONE_B = { x: 21, z: -53.5, y: 0.98 };

// the walkable world: the land, the bank, and a wading margin out
// to the buoy line at z -56. The far shore is backdrop, full stop.
const CLAMP = [
  [-185, 100], [185, 100], [185, -56], [-185, -56],
];
const CLAMP_C = { x: 0, z: 10 };

// the ground, from the layout table (see header). Land is LAND_Y.
function espGround(lx, lz) {
  if (lx >= PAD.x0 && lx <= PAD.x1 && lz >= PAD.z0 && lz <= PAD.z1) return PAD.y;
  if (lz < SLOPE.zBot) return BED_Y;
  if (lz < SLOPE.zTop) {
    const s = (lz - SLOPE.zBot) / (SLOPE.zTop - SLOPE.zBot); // 0 at bed, 1 at verge
    return BED_Y + (LAND_Y - BED_Y) * (s * s * (3 - 2 * s));
  }
  return LAND_Y;
}

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

// ------------------------------------------------------------- textures
// seeded lawn: green noise with mow-band striping, drawn once.
function lawnTexture(rx, ry) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const c = cv.getContext('2d');
  let seed = 9182;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  c.fillStyle = '#4a6b32'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = (rnd() - 0.5) * 26;
    c.fillStyle = `rgb(${74 + v | 0},${107 + v | 0},${50 + v * 0.7 | 0})`;
    c.fillRect(rnd() * 512, rnd() * 512, 2.2, 2.2);
  }
  c.fillStyle = 'rgba(255,255,240,0.045)';
  for (let x = 0; x < 512; x += 64) c.fillRect(x, 0, 32, 512); // mow bands
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 4;
  return tex;
}

// packed gravel for the path, same seeded treatment.
function gravelTexture(rx, ry) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  let seed = 515;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  c.fillStyle = '#9a8f7a'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    const v = (rnd() - 0.5) * 34;
    c.fillStyle = `rgb(${154 + v | 0},${143 + v | 0},${122 + v * 0.8 | 0})`;
    c.fillRect(rnd() * 256, rnd() * 256, 1.8, 1.8);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 4;
  return tex;
}

// Backdrop-shell facades, City Hall's arrangement: a window-grid day
// canvas + a sparse lit canvas for the night emissive (S.cityMats).
function facadeTextures() {
  const W = 256, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const lit = document.createElement('canvas'); lit.width = W; lit.height = H;
  const lc = lit.getContext('2d');
  lc.fillStyle = '#000'; lc.fillRect(0, 0, W, H);
  let seed = 2024;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  c.fillStyle = '#8f8a80'; c.fillRect(0, 0, W, H);
  const cols = 8, rows = 18, cw = W / cols, rh = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + 7, y = r * rh + 6, w = cw - 14, h = rh - 12;
      const warm = rnd() < 0.16;
      c.fillStyle = warm ? '#77683f' : '#46525c';
      c.fillRect(x, y, w, h);
      if (warm) { lc.fillStyle = '#ffb46b'; lc.fillRect(x, y, w, h); }
    }
  }
  const day = new THREE.CanvasTexture(cv); day.colorSpace = THREE.SRGBColorSpace;
  const night = new THREE.CanvasTexture(lit); night.colorSpace = THREE.SRGBColorSpace;
  return { day, night };
}

// ------------------------------------------------------------- esp sky
// Every far realm carries its own dome on the shared materials
// (City Hall / Fenway arrangement); stars + clouds built lazily.
const espClouds = [];
let espSkyBuilt = false;
function buildEspSky(scene) {
  if (espSkyBuilt || !S.starMat || !S.cloudMat) return;
  espSkyBuilt = true;
  const starPos = [];
  let seed = 777;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 380; i++) {
    const a = rnd() * Math.PI * 2, e = 0.08 + rnd() * 1.35, r = 850;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, S.starMat);
  stars.position.copy(ESP);
  scene.add(stars);
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(S.cloudMat);
    const a = rnd() * Math.PI * 2, r = 240 + rnd() * 380;
    sp.position.set(ESP.x + Math.cos(a) * r, 95 + rnd() * 85, ESP.z + Math.sin(a) * r);
    const sc = 150 + rnd() * 190;
    sp.scale.set(sc, sc * 0.36, 1);
    scene.add(sp);
    espClouds.push({ sp, speed: 0.7 + rnd() * 0.9 });
  }
}

// ------------------------------------------------------------------ build
let discovered = false;
const espLights = [];   // PointLights driven by S.lampFactor
const espFoods = [];    // this zone's food items (re-pinned by tick)
const TREE_SPOTS = [];  // filled in build; the canopy cap rides one

export function buildEsplanade(scene) {
  if (typeof S.player.inEsplanade !== 'boolean') S.player.inEsplanade = false;
  const g = new THREE.Group();
  g.position.copy(ESP);

  // own sky dome, same as every far realm
  if (S.skyMat) {
    const sky2 = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), S.skyMat);
    sky2.userData.isSky = true;
    g.add(sky2);
  }
  // the island's surround: riverbed-dark apron under everything
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(820, 620),
    new THREE.MeshStandardMaterial({ color: 0x33322c, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.08;
  apron.receiveShadow = true;
  g.add(apron);

  const granite = new THREE.MeshStandardMaterial({ color: 0x7d7a72, roughness: 0.9 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2e3236, roughness: 0.55, metalness: 0.6 });

  // ---- the land mass: an embankment box, grass on top. Its river
  // face is the seawall; its south face steps down to Storrow.
  const land = new THREE.Mesh(new THREE.BoxGeometry(380, LAND_Y, 145),
    new THREE.MeshStandardMaterial({ color: 0x5c4f38, roughness: 1 }));
  land.position.set(0, LAND_Y / 2, 31.5);
  land.receiveShadow = true;
  g.add(land);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(380, 145),
    new THREE.MeshStandardMaterial({ map: lawnTexture(30, 12), roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(0, LAND_Y + 0.005, 31.5);
  lawn.receiveShadow = true;
  g.add(lawn);
  // the audience oval in front of the shell: paler, worn, loved
  const oval = new THREE.Mesh(new THREE.CircleGeometry(1, 40),
    new THREE.MeshStandardMaterial({ map: lawnTexture(10, 6), roughness: 1, color: 0xcfd8a8 }));
  oval.rotation.x = -Math.PI / 2;
  oval.scale.set(36, 21, 1);
  oval.position.set(0, LAND_Y + 0.015, -12);
  oval.receiveShadow = true;
  g.add(oval);

  // ---- the shell's granite pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(52, 0.24, 40), granite);
  pad.position.set(SHELL.cx, LAND_Y, SHELL.cz);
  pad.castShadow = true; pad.receiveShadow = true;
  g.add(pad);

  // ---- the path: east-west along the river, plus the spur from
  // the tree bed down to it
  const gravelMat = new THREE.MeshStandardMaterial({ map: gravelTexture(46, 2), roughness: 1 });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(370, 5.5), gravelMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, LAND_Y + 0.02, -35.25);
  path.receiveShadow = true;
  g.add(path);
  const spur = new THREE.Mesh(new THREE.PlaneGeometry(4, 48),
    new THREE.MeshStandardMaterial({ map: gravelTexture(2, 20), roughness: 1 }));
  spur.rotation.x = -Math.PI / 2;
  spur.position.set(HOLE_L.x, LAND_Y + 0.02, -8);
  spur.receiveShadow = true;
  g.add(spur);

  // ---- the bank: riprap slope down to the bed, granite curb along
  // the verge (gaps where the stones invite you in), bed plane
  const slopeLen = Math.hypot(SLOPE.zTop - SLOPE.zBot, LAND_Y - BED_Y);
  const slope = new THREE.Mesh(new THREE.PlaneGeometry(380, slopeLen),
    new THREE.MeshStandardMaterial({ color: 0x5a564c, roughness: 1 }));
  slope.rotation.x = -Math.PI / 2 + Math.atan2(LAND_Y - BED_Y, SLOPE.zTop - SLOPE.zBot);
  slope.position.set(0, (LAND_Y + BED_Y) / 2, (SLOPE.zTop + SLOPE.zBot) / 2);
  slope.receiveShadow = true;
  g.add(slope);
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(700, 140),
    new THREE.MeshStandardMaterial({ color: 0x2e2b23, roughness: 1 }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, BED_Y - 0.02, -114);
  bed.receiveShadow = true;
  g.add(bed);
  // riprap: instanced stones scattered on the slope, seeded
  {
    let seed = 4711;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.32),
      new THREE.MeshStandardMaterial({ color: 0x6a675e, roughness: 1 }), 150);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
    for (let i = 0; i < 150; i++) {
      const lx = -185 + rnd() * 370;
      const lz = SLOPE.zBot + rnd() * (SLOPE.zTop - SLOPE.zBot);
      const s = (lz - SLOPE.zBot) / (SLOPE.zTop - SLOPE.zBot);
      const ly = BED_Y + (LAND_Y - BED_Y) * (s * s * (3 - 2 * s));
      e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
      const sc = 0.6 + rnd() * 1.1;
      m4.compose(v.set(lx, ly + 0.05, lz), q, new THREE.Vector3(sc, sc * 0.7, sc));
      rock.setMatrixAt(i, m4);
    }
    rock.castShadow = true; rock.receiveShadow = true;
    rock.computeBoundingSphere();
    g.add(rock);
  }
  // granite curb blocks along the verge, Fenway-pond register:
  // instanced, per-block seated, with two gaps (the stone entry at
  // x 21 and a quieter one west at x -57)
  {
    const spots = [];
    for (let x = -184; x <= 184; x += 2.3) {
      if (x > 15 && x < 27) continue;      // the wading entry
      if (x > -63 && x < -51) continue;    // the west gap
      spots.push(x);
    }
    const curb = new THREE.InstancedMesh(new THREE.BoxGeometry(2.1, 0.34, 0.5), granite, spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach((x, i) => {
      m4.makeTranslation(x, LAND_Y + 0.1, -40.4);
      curb.setMatrixAt(i, m4);
    });
    curb.castShadow = true; curb.receiveShadow = true;
    curb.computeBoundingSphere();
    g.add(curb);
  }

  // ---- the river itself: the park's own water material on a big
  // plane, and the submerge registry daycycle reads (v0.6.28's
  // murk, extended to the Charles)
  const waterMat = S.waterMat || new THREE.MeshStandardMaterial({
    color: 0x2a5a68, transparent: true, opacity: 0.93, roughness: 0.13,
    metalness: 0.05, side: THREE.DoubleSide,
  });
  const river = new THREE.Mesh(new THREE.PlaneGeometry(700, 150), waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, WATER_Y, -119);
  river.userData.isWater = true;
  g.add(river);
  if (!S.waterBodiesExtra) S.waterBodiesExtra = [];
  S.waterBodiesExtra.push([{ x: ESP.x, z: ESP.z - 119, rx: 345, rz: 75 }, WATER_Y]);

  // ---- stepping stones + the buoy line that marks the deep water
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a867c, roughness: 0.95 });
  for (const st of [STONE_A, STONE_B]) {
    const h = st.y - (BED_Y - 0.3);
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, h, 9), stoneMat);
    stone.position.set(st.x, BED_Y - 0.3 + h / 2, st.z);
    stone.castShadow = true; stone.receiveShadow = true;
    g.add(stone);
    S.platformBoxes.push({
      minX: ESP.x + st.x - 1.05, maxX: ESP.x + st.x + 1.05,
      minZ: ESP.z + st.z - 1.05, maxZ: ESP.z + st.z + 1.05, y: st.y,
    });
  }
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xb8452e, roughness: 0.7 });
  const buoyStripe = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.7 });
  for (let x = -180; x <= 180; x += 30) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 9, 7), buoyMat);
    hull.scale.set(1, 0.78, 1); b.add(hull);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 12), buoyStripe);
    band.rotation.x = Math.PI / 2; band.position.y = 0.05; b.add(band);
    b.position.set(x, WATER_Y + 0.02, -56);
    g.add(b);
  }

  // ---- the shell is scenery with a solid footprint: you stand in
  // front of it, not in it (the massing is a closed solid anyway)
  S.solidBoxes.push({
    minX: ESP.x + SHELL.cx - 17.6, maxX: ESP.x + SHELL.cx + 17.6,
    minZ: ESP.z + SHELL.cz - 13.2, maxZ: ESP.z + SHELL.cz + 13.2,
    minY: LAND_Y - 1, maxY: LAND_Y + 17,
  });

  // ---- elms: composed, climbable, registered like the park's own
  // (buildCanopy already ran inside buildTrees, so these get no
  // bridges - the path row stands alone, honestly)
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x4f3d28, roughness: 1 });
  const leafA = new THREE.MeshStandardMaterial({ color: 0x46682e, roughness: 1 });
  const leafB = new THREE.MeshStandardMaterial({ color: 0x39543a, roughness: 1 });
  let treeSeed = 3141;
  const trnd = () => { treeSeed = (treeSeed * 16807) % 2147483647; return (treeSeed - 1) / 2147483646; };
  function elm(lx, lz, h, canopyR) {
    const gy = espGround(lx, lz);
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.58, h, 8), barkMat);
    trunk.position.y = h / 2; trunk.castShadow = true; t.add(trunk);
    const blobs = 3 + Math.floor(trnd() * 2);
    for (let i = 0; i < blobs; i++) {
      const r = canopyR * (0.62 + trnd() * 0.3);
      const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), i % 2 ? leafA : leafB);
      const a = (i / blobs) * Math.PI * 2 + trnd() * 0.8;
      blob.position.set(Math.cos(a) * canopyR * 0.34, h + 0.7 + trnd() * 0.9, Math.sin(a) * canopyR * 0.34);
      blob.scale.set(1.15, 0.78, 1.15);
      blob.castShadow = true;
      t.add(blob);
    }
    t.position.set(lx, gy, lz);
    g.add(t);
    const wx = ESP.x + lx, wz = ESP.z + lz;
    const canopyY = gy + h + 0.6;
    S.trees.push({ x: wx, z: wz, r: 0.5, gy, trunkTop: gy + h, canopyY, canopyR });
    S.platforms.push({ x: wx, z: wz, r: canopyR * 0.92, y: canopyY - 0.55 });
    S.solids.push({ x: wx, z: wz, r: 0.62, minY: gy - 0.2, maxY: gy + h });
    TREE_SPOTS.push({ lx, lz, gy, canopyY });
  }
  for (const x of [-120, -84, -48, 48, 84, 120]) elm(x, -28, 5.6 + trnd() * 1.2, 4.4);
  elm(-40, 2, 6.2, 4.8); elm(40, 2, 5.8, 4.5);
  elm(-36, 36, 6.4, 4.6); elm(36, 36, 5.9, 4.4);
  elm(68, 26, 6.1, 4.7);

  // ---- the emergence: a mulched tree bed, dirt mound, black mouth,
  // sign on a post - the burrow's manners, kept above ground
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x4d3620, roughness: 1 });
  const bedRing = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.22, 14), granite);
  bedRing.position.set(HOLE_L.x, LAND_Y + 0.08, HOLE_L.z);
  bedRing.castShadow = true; bedRing.receiveShadow = true; g.add(bedRing);
  const mulch = new THREE.Mesh(new THREE.CircleGeometry(2.45, 14), dirtMat);
  mulch.rotation.x = -Math.PI / 2; mulch.position.set(HOLE_L.x, LAND_Y + 0.2, HOLE_L.z); g.add(mulch);
  const mound = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.26, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x5a4026, roughness: 1 }));
  mound.rotation.x = Math.PI / 2; mound.position.set(HOLE_L.x, LAND_Y + 0.26, HOLE_L.z);
  mound.scale.set(1, 1, 0.55); g.add(mound);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.56, 16),
    new THREE.MeshBasicMaterial({ color: 0x070403 }));
  mouth.rotation.x = -Math.PI / 2; mouth.position.set(HOLE_L.x, LAND_Y + 0.32, HOLE_L.z);
  g.add(mouth);
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1 }));
  signPost.position.set(HOLE_L.x + 3.4, LAND_Y + 0.5, HOLE_L.z + 2.2);
  g.add(signPost);
  const holeSign = makeSign('HATCH SHELL', 1.9);
  holeSign.position.set(HOLE_L.x + 3.4, LAND_Y + 1.12, HOLE_L.z + 2.2);
  holeSign.rotation.y = Math.PI; // face the arriving squirrel (north-facing read)
  g.add(holeSign);

  // ---- benches: City Hall's slatted pattern - four facing the
  // river along the path, two facing the shell across the oval
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 });
  function bench(cx, cz, ry) {
    const b = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.55), woodMat);
    seat.position.y = 0.45; seat.castShadow = true; b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.06), woodMat);
    back.position.set(0, 0.78, -0.27); back.rotation.x = -0.16; b.add(back);
    for (const sx of [-0.95, 0.95]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.45, 0.5), darkMetal);
      leg.position.set(sx, 0.225, 0); b.add(leg);
    }
    b.position.set(cx, espGround(cx, cz), cz); b.rotation.y = ry;
    g.add(b);
  }
  bench(-70, -28.5, Math.PI); bench(-25, -28.5, Math.PI);
  bench(35, -28.5, Math.PI); bench(80, -28.5, Math.PI);
  bench(-14, 10, 0); bench(14, 10, 0);

  // ---- lamps along the path: posts + warm bulbs in S.cityMats,
  // two real PointLights on the lamp factor (City Hall's pattern)
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x554a38, emissive: 0xffc37a, emissiveIntensity: 0.05, roughness: 0.4,
  });
  if (S.cityMats) S.cityMats.push(bulbMat);
  for (const lx of [-140, -100, -60, -20, 20, 60, 100, 140]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.4, 7), darkMetal);
    pole.position.set(lx, LAND_Y + 2.2, -30.5); pole.castShadow = true; g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), bulbMat);
    bulb.position.set(lx, LAND_Y + 4.5, -30.5); g.add(bulb);
  }
  for (const lx of [-60, 60]) {
    const L = new THREE.PointLight(0xffe2b0, 0, 130, 2);
    L.position.set(ESP.x + lx, LAND_Y + 5.2, ESP.z - 30.5);
    scene.add(L);
    espLights.push(L);
  }

  // ---- backdrop, both shores. SOUTH: Back Bay across Storrow
  // Drive (road ribbon + a brownstone-ish row). NORTH: Cambridge
  // across the river - flat skyline shells, fog does the distance.
  // Backdrop only, deliberately: the clamp keeps squirrels home.
  const { day, night } = facadeTextures();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(560, 13),
    new THREE.MeshStandardMaterial({ color: 0x333336, roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.03, 112);
  g.add(road);
  const shellTints = [0xd8d0c2, 0xcac2b2, 0xd2c8b8, 0xb9b2a4];
  let shellSeed = 60221;
  const srnd = () => { shellSeed = (shellSeed * 16807) % 2147483647; return (shellSeed - 1) / 2147483646; };
  function shell(cx, cz, w, h, d, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        map: day, emissive: 0xffb46b, emissiveMap: night, emissiveIntensity: 0.05,
        roughness: 0.95, color: shellTints[Math.floor(srnd() * shellTints.length)],
      }));
    if (S.cityMats) S.cityMats.push(m.material);
    m.position.set(cx, h / 2 - 0.1, cz);
    m.rotation.y = ry;
    g.add(m);
  }
  for (let i = 0; i < 9; i++) shell(-190 + i * 46 + srnd() * 8, 130, 34 + srnd() * 8, 17 + srnd() * 13, 22, 0); // Back Bay row
  for (let i = 0; i < 11; i++) shell(-300 + i * 58 + srnd() * 14, -212 - srnd() * 22, 36 + srnd() * 16, 16 + srnd() * 38, 26, 0); // Cambridge
  shell(-96, -206, 30, 58, 26, 0);   // one tall tower west (the MIT dome stays implied)
  shell(150, -220, 34, 46, 26, 0);   // one tall tower east

  scene.add(g);

  // the shell itself: async, best-effort, like every sourced model.
  // The zone works (lawn, hole, river, signs) even if it never lands.
  loadModel('assets/models/hatchshell.glb').then((tpl) => {
    if (!tpl) return;
    const shellMesh = tpl.scene;
    // measured massing (raycast + slice probe, this round): the
    // tall arch face is the model's +z side, the dome terraces down
    // toward -z. The real shell opens north, to the river - so the
    // model turns 180 degrees: +z (face) -> -z (river).
    shellMesh.rotation.y = Math.PI;
    shellMesh.position.set(ESP.x + SHELL.cx, PAD.y, ESP.z + SHELL.cz);
    shellMesh.traverse((o) => {
      if (o.isMesh) {
        // the source material is an untextured photogrammetry grey;
        // the real shell is warm stone - one warm tone is the
        // honest LOD read at lawn distance
        o.material = new THREE.MeshStandardMaterial({ color: 0xb3a189, roughness: 0.95 });
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(shellMesh);
    // a little life, in the established pattern. The trophy cap
    // sits on the outer stepping stone - wade out, hop up, the
    // whole river behind you. One more waits in a path elm's
    // canopy for climbers.
    spawnCapAt(ESP.x + STONE_B.x, ESP.z + STONE_B.z, STONE_B.y + 0.04, 50);
    const ct = TREE_SPOTS[3]; // the (48, -28) path elm
    if (ct) spawnCapAt(ESP.x + ct.lx, ESP.z + ct.lz, ct.canopyY - 0.55 + 0.04, 51);
    spawnCapAt(ESP.x + 0, ESP.z + 9, PAD.y + 0.04, 52);
    spawnCapAt(ESP.x - 150, ESP.z - 35, LAND_Y + 0.04, 53);
    spawnCapAt(ESP.x + 64, ESP.z + 22, LAND_Y + 0.04, 54);
    espFoods.push(spawnFood('pretzel', ESP.x + 33, ESP.z - 27, { y: LAND_Y + 0.05 }));
    espFoods.push(spawnFood('peanut', ESP.x - 23, ESP.z - 27, { y: LAND_Y + 0.05 }));
    espFoods.push(spawnFood('popcorn', ESP.x + 10, ESP.z - 4, { y: LAND_Y + 0.05 }));
  });

  // the burrow-side door: a dark mouth on the market's NORTH wall,
  // west of the Exchange stall (Fenway owns the east wall, TD
  // Garden the west, City Hall the south). TUN coords, added
  // straight to the scene, built here so burrows.js is untouched.
  const door = new THREE.Group();
  const mouthW = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16),
    new THREE.MeshBasicMaterial({ color: 0x050302 }));
  mouthW.position.set(TUN.x + 40.2, 0.62, TUN.z - 5.96);
  door.add(mouthW);
  const s1 = makeSign('RIVERBOUND', 1.9);
  s1.position.set(TUN.x + 40.2, 1.62, TUN.z - 5.94);
  door.add(s1);
  const s2 = makeSign('THE ESPLANADE', 2.3);
  s2.position.set(TUN.x + 42.9, 1.28, TUN.z - 5.94);
  door.add(s2);
  scene.add(door);
}

// ------------------------------------------------------------------ init
function enterEsplanade() {
  const P = S.player;
  P.pos.set(ESP.x + HOLE_L.x + 2.6, LAND_Y + 0.4, ESP.z + HOLE_L.z - 1.2);
  P.vel.set(0, 0, 0);
  // face the shell and the river beyond it
  P.yaw = Math.atan2(-(0 - (HOLE_L.x + 2.6)), -(-20 - (HOLE_L.z - 1.2)));
  P.pitch = 0.04;
  P.climbing = null; P.grounded = true;
  P.inHollow = false; P.inBurrow = false; P.inFenway = false; P.inGarden = false; P.inCityHall = false; P.inEsplanade = true;
  if (sfx.dig) sfx.dig();
  if (!discovered) {
    discovered = true;
    toast('THE ESPLANADE. the shell, the river, and nobody selling anything.', 4.5);
  } else {
    toast('the esplanade again. the river is still going the same way.', 2.6);
  }
}

function exitEsplanade() {
  const P = S.player;
  P.pos.set(TUN.x + 40.2, 0, TUN.z - 3.4);
  P.vel.set(0, 0, 0);
  P.yaw = Math.PI; P.pitch = 0; // facing into the market, stall ahead
  P.climbing = null; P.grounded = true;
  P.inEsplanade = false; P.inBurrow = true;
  if (sfx.dig) sfx.dig();
  toast('back underground. the rats have never seen the river. they mention this proudly.', 2.4);
}

export function initEsplanade() {
  if (typeof S.player.inEsplanade !== 'boolean') S.player.inEsplanade = false;
  // down the river run: the market's north wall, west of the stall
  S.interactables.push({
    x: TUN.x + 40.2, z: TUN.z - 4.4, y: 0, r: 2.3,
    label: () => S.player.inBurrow ? 'E - take the river run' : null,
    action: () => enterEsplanade(),
  });
  // and back: the hole in the tree bed
  S.interactables.push({
    x: ESP.x + HOLE_L.x, z: ESP.z + HOLE_L.z, y: LAND_Y, r: 1.9,
    label: () => S.player.inEsplanade ? 'E - dive back to the burrows' : null,
    action: () => exitEsplanade(),
  });
  // food.js re-pins every ground food to groundHeight() + 0.05 each
  // frame - right for the park, wrong on a 1.05 m embankment whose
  // heightfield answers 0. updateFood runs interactable ticks AFTER
  // its re-pin, so this tick (canopy.js's trick, same hook) keeps
  // the zone's food on the lawn where it was dropped.
  S.interactables.push({
    x: ESP.x, z: ESP.z, y: 0, r: 0,
    label: () => null,
    tick: () => {
      const now = performance.now() / 1000;
      for (const f of espFoods) {
        if (f.mesh.parent) f.mesh.position.y = LAND_Y + 0.1 + Math.sin(now * 2 + f.x) * 0.008;
      }
    },
  });
}

// ---------------------------------------------------------------- update
export function updateEsplanade(dt) {
  if (!espSkyBuilt) buildEspSky(S.scene);
  for (const c of espClouds) {
    c.sp.position.x += c.speed * dt;
    if (c.sp.position.x > ESP.x + 430) c.sp.position.x = ESP.x - 430;
  }
  const lamp = S.lampFactor || 0;
  for (const L of espLights) L.intensity = lamp * 700;

  const P = S.player;
  if (!P.inEsplanade) return;
  const lx = P.pos.x - ESP.x, lz = P.pos.z - ESP.z;
  if (Math.abs(lx) > 500 || Math.abs(lz) > 500) {
    // paranoia clamp, same spirit as the other realms' grounds crews
    P.pos.set(ESP.x + HOLE_L.x + 2.6, LAND_Y + 0.4, ESP.z + HOLE_L.z - 1.2);
    P.vel.set(0, 0, 0);
    toast('a goose with a badge deposits you back by the tree bed. jurisdiction unclear.', 3);
    return;
  }
  if (!insidePoly(lx, lz, CLAMP)) {
    const [bx, bz] = nearestOnPoly(lx, lz, CLAMP);
    // settle a whisker inside the line, not on it
    const dx = CLAMP_C.x - bx, dz = CLAMP_C.z - bz, dl = Math.hypot(dx, dz) || 1;
    P.pos.x = ESP.x + bx + dx / dl * 0.3;
    P.pos.z = ESP.z + bz + dz / dl * 0.3;
  }
  // the embankment table is the ground here (groundHeight() is the
  // Common's, and it says 0) - stand on the layout instead. Raise
  // only, like City Hall: jumps leave the ground freely, landings
  // settle when the fall crosses the table. The riverbed is 0,
  // which is exactly what surfaceAt already believes, so the wade
  // needs no help at all.
  const gy = espGround(P.pos.x - ESP.x, P.pos.z - ESP.z);
  if (P.pos.y < gy) {
    P.pos.y = gy;
    if (P.vel && P.vel.y < 0) P.vel.y = 0;
    P.grounded = true;
  }
}

// ------------------------------------------------------------ debug poses
// which: 'emerge' | 'shell' | 'river' | 'wade' | 'canopy' | 'door'
// ('door' poses in the market, facing the new north-wall door.)
export function debugEnterEsplanade(which) {
  const P = S.player;
  P.climbing = null; P.vel.set(0, 0, 0); P.grounded = true;
  discovered = true;
  if (which === 'door') {
    P.inHollow = false; P.inBurrow = true; P.inFenway = false; P.inGarden = false; P.inCityHall = false; P.inEsplanade = false;
    P.pos.set(TUN.x + 40.2, 0, TUN.z - 2.4);
    P.yaw = 0; // face north, straight at the RIVERBOUND door
    P.pitch = 0.02;
    return;
  }
  P.inHollow = false; P.inBurrow = false; P.inFenway = false; P.inGarden = false; P.inCityHall = false; P.inEsplanade = true;
  if (which === 'shell') {
    // on the oval, facing the shell across its pad
    P.pos.set(ESP.x + 0, LAND_Y + 0.4, ESP.z - 2);
    P.yaw = Math.PI; // due south, at the shell
    P.pitch = 0.1;
  } else if (which === 'river') {
    // on the path by the stone entry, facing the river + skyline
    P.pos.set(ESP.x + 21, LAND_Y + 0.4, ESP.z - 29);
    P.yaw = 0; // due north
    P.pitch = 0.0;
  } else if (which === 'wade') {
    // in the shallows between the stones, eye under the plane:
    // the v0.6.28 murk, on the Charles
    P.pos.set(ESP.x + 21, BED_Y, ESP.z - 51);
    P.yaw = 0;
    P.pitch = 0.02;
  } else if (which === 'canopy') {
    // up the (48, -28) path elm, river below, cap for company
    const ct = TREE_SPOTS[3];
    P.pos.set(ESP.x + 49.5, ct ? ct.canopyY - 0.55 : LAND_Y + 6, ESP.z - 26.5);
    P.yaw = 0;
    P.pitch = -0.05;
  } else { // 'emerge'
    P.pos.set(ESP.x + HOLE_L.x + 2.6, LAND_Y + 0.4, ESP.z + HOLE_L.z - 1.2);
    P.yaw = Math.atan2(-(0 - (HOLE_L.x + 2.6)), -(-20 - (HOLE_L.z - 1.2)));
    P.pitch = 0.04;
  }
}
