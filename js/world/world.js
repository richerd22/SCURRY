// SCURRY - world core: terrain height field, painted ground, water, sky dome.
// The map is one continuous park: Public Garden (west), Charles St, Boston Common (east).

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { meshTerrainHeight } from '../systems/collision.js';
import { createPathProximityIndex } from './path-index.js';
import { seededRandom } from './seeded-random.js';
import { makeParkFenceLayout } from './fence-layout.js';
import { buildParkEntrances } from './gate-art.js';
import { insideParkLawn } from './ground-rules.js';
import { BREWER_FOUNTAIN, PARK_ST_HEADHOUSE } from './boston-landmark-layout.js';
import { groundDetailTex, cityFacade, glassFacade, clockTex, cloudTex, graniteTex } from './textures.js';
import { buildBeaconRow, buildCharlesStreet, buildRingBlocks, buildSouthWestRows, buildTremontRow } from './streetwalls.js';

// ---------- terrain height ----------
function gauss(x, z, cx, cz, r) {
  const dx = x - cx, dz = z - cz;
  return Math.exp(-(dx * dx + dz * dz) / (r * r));
}
function smooth01(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
function ellipseDip(x, z, e) {
  const dx = (x - e.x) / e.rx, dz = (z - e.z) / e.rz;
  const d = dx * dx + dz * dz;
  return d >= 1 ? 0 : Math.cos(Math.min(1, Math.sqrt(d)) * Math.PI * 0.5);
}

const TERRAIN_X = 150, TERRAIN_Z = 86;
let terrainGrid = null;
// Static plaza footprint cache: never allocate in the per-substep height query.
const PLAZA_TOPS = [[140,42,13.6],[BREWER_FOUNTAIN.x,BREWER_FOUNTAIN.z,BREWER_FOUNTAIN.plazaRadius],[60,-45,13.1]];
// Match actual rendered triangle faces, rather than the interpolated math hill.
export function visibleGroundHeight(x, z) {
  const h = meshTerrainHeight(terrainGrid, x, z, MAP.minX, MAP.maxX, MAP.minZ, MAP.maxZ, TERRAIN_X, TERRAIN_Z);
  if (h === null) return groundHeight(x, z);
  // The rendered wet path / plaza ribbons sit 2-6cm ABOVE the lawn mesh.
  // Feet must follow those visible surfaces at a 25cm squirrel viewpoint.
  const analytic = groundHeight(x, z);
  // Path ribbons are relevant only within 2.15m of a path; the cache
  // preserves exact segment projection without an entire park scan.
  const d2 = pathProximity.nearestSquaredWithin(x,z,2.15);
  let top = h;
  if (d2 <= 2.15*2.15) top = Math.max(top, analytic + (d2 <= 1.8*1.8 ? 0.04 : 0.022));
  // The Mall's broad gravel apron overlays the ordinary path ribbon.
  if (x >= -36 && x <= 196 && Math.abs(z + 18) <= 5.4) {
    top = Math.max(top, analytic + (Math.abs(z + 18) <= 4.7 ? 0.058 : 0.03));
  }
  for (const [px, pz, r] of PLAZA_TOPS) {
    const dist = Math.hypot(x - px, z - pz);
    if (dist <= r) top = Math.max(top, analytic + (dist <= r - 0.6 ? 0.045 : 0.028));
  }
  return top;
}

export function groundHeight(x, z) {
  let h = 0;
  h += 6.5 * gauss(x, z, 60, -45, 36);            // Soldiers & Sailors Monument hill
  h += 1.3 * gauss(x, z, 140, 42, 17);            // bandstand knoll
  h += 0.9 * gauss(x, z, BREWER_FOUNTAIN.x, BREWER_FOUNTAIN.z, 14); // Brewer Fountain rise
  // State House terrace, NE corner plateau
  const tx = smooth01((x - 146) / 26), tz = smooth01((-z - 50) / 22);
  h += 8.0 * tx * tz;
  // Beacon St edge rises slightly along the north fence of the Common
  h += 1.1 * gauss(z, 0, -104, 0, 10) * smooth01((x + 30) / 60) * (1 - tx * tz);
  h -= 0.6 * ellipseDip(x, z, MAP.lagoon);         // lagoon basin
  h -= 0.38 * ellipseDip(x, z, MAP.frogPond);      // frog pond basin
  return h;
}

// ---------- path network (also drives ground painting + human waypoints) ----------
// Each path is a polyline of [x, z] points.
export const PATHS = [
  // Common perimeter
  [[-34, -94], [196, -94], [196, 94], [-34, 94], [-34, -94]],
  // Central promenade (the Mall)
  [[-36, -18], [40, -18], [110, -18], [196, -18]],
  // North-south spines
  [[60, -94], [60, -52], [60, -18], [60, 30], [60, 94]],
  [[112, -60], [112, -18], [112, 8], [112, 60], [112, 94]],
  [[158, -94], [158, -40], [158, -18], [158, 42], [158, 94]],
  // Historic west Common connector (retained for continuous traversal)
  [[-34, -80], [30, -40], [80, 0], [140, 42]],
  // Real east-Common Park Street headhouse route toward the Bandstand.
  // Curves around, rather than through, the Brewer Fountain basin.
  [[PARK_ST_HEADHOUSE.x+5.6,PARK_ST_HEADHOUSE.z],[163,-76],[158,-58],[148,-41],[143,-12],[140,42]],
  // Frog pond loop feeders
  [[60, 12], [80, 12], [112, 12]],
  [[140, 42], [112, 42], [60, 42]],
  // Garden: walk AROUND the north-south lagoon, outside the dry shore
  [[-184,-53],[-166,-64],[-132,-64],[-96,-62],[-78,-45],[-79,0],
   [-78,45],[-96,62],[-132,65],[-166,62],[-184,46],[-189,0],[-184,-53]],
  // Garden: actual east-west historic central footbridge crossing
  [[-161,0],[-103,0]],
  // Garden: western perimeter promenade to Washington at Arlington St
  [[-182, -34], [-193, 0], [-182, 34]],
  // Garden north path + Charles St crossings
  [[-196, -70], [-100, -70], [-60, -70]],
  [[-36, -70], [-44, -70], [-60, -70]],
  [[-36, 30], [-44, 30], [-76, 30]],
  [[-36, -18], [-44, -18], [-76, -14]],
];

// Immutable PATHS data also drives terrain painting, tree placement and
// NPC movement. This index is for bounded *contact* queries only.
const pathProximity = createPathProximityIndex(PATHS,12,2.5);

export function distToPaths(x, z) {
  let best = 1e9;
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1];
      const abx = bx - ax, abz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz || 1)));
      const dx = x - (ax + abx * t), dz = z - (az + abz * t);
      const d = Math.hypot(dx, dz);
      if (d < best) best = d;
    }
  }
  return best;
}

export function inWater(x, z) {
  const L = MAP.lagoon, F = MAP.frogPond;
  const dl = ((x - L.x) / (L.rx - 3)) ** 2 + ((z - L.z) / (L.rz - 2)) ** 2;
  const df = ((x - F.x) / (F.rx - 2)) ** 2 + ((z - F.z) / (F.rz - 1.5)) ** 2;
  return dl < 1 || df < 1;
}
export function onRoad(x, z) { return x > MAP.charlesMinX - 1 && x < MAP.charlesMaxX + 1; }
export function isGrass(x, z) {
  // The texture canvas paints grass beneath paved city apron too. That is
  // visual fill, not permission to bury food on the sidewalk or outside the
  // park: the authored two-park footprint is the only eligible region.
  if (!insideParkLawn(x, z, MAP)) return false;
  if (inWater(x, z) || onRoad(x, z)) return false;
  if (pathProximity.nearestSquaredWithin(x,z,2.4) < 2.4*2.4) return false;
  return true;
}

// ---------- ground texture painting ----------
function paintGround() {
  // Stable independent layer seed: screenshots should differ for real art
  // revisions, not because ground grass/flowers reroll every page load.
  const rnd=seededRandom(0x5c0ee);
  const W = 2048, H = 1170;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const px = (x) => (x - MAP.minX) / (MAP.maxX - MAP.minX) * W;
  const pz = (z) => (z - MAP.minZ) / (MAP.maxZ - MAP.minZ) * H;
  const m = W / (MAP.maxX - MAP.minX); // px per metre

  // grass base with mow stripes
  g.fillStyle = '#4d7c3a'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,200,0.045)' : 'rgba(0,40,0,0.05)';
    g.fillRect(0, i * H / 26, W, H / 26);
  }
  // grass noise
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(20,60,15,0.16)' : 'rgba(140,190,90,0.13)';
    g.fillRect(rnd() * W, rnd() * H, 2.4, 2.4);
  }
  // Garden lawns slightly richer
  g.fillStyle = 'rgba(30,90,40,0.18)';
  g.fillRect(px(MAP.garden.minX), pz(MAP.garden.minZ), (MAP.garden.maxX - MAP.garden.minX) * m, (MAP.garden.maxZ - MAP.garden.minZ) * m);
  // flower beds in the Garden (colour blobs)
  const bedCols = ['#b8546e', '#d9a441', '#e8e4da', '#a04a7a', '#c96f3b'];
  for (let i = 0; i < 26; i++) {
    const bx = MAP.garden.minX + 12 + rnd() * 120, bz = -88 + rnd() * 176;
    if (ellipseDip(bx, bz, MAP.lagoon) > 0) continue;
    g.fillStyle = bedCols[i % bedCols.length];
    g.globalAlpha = 0.55;
    g.beginPath(); g.ellipse(px(bx), pz(bz), (3 + rnd() * 5) * m, (1.6 + rnd() * 2) * m, rnd(), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  // Charles Street asphalt
  g.fillStyle = '#33343a';
  g.fillRect(px(MAP.charlesMinX), 0, (MAP.charlesMaxX - MAP.charlesMinX) * m, H);
  g.fillStyle = '#c9a227';
  for (let z = MAP.minZ; z < MAP.maxZ; z += 8) g.fillRect(px(-50.4), pz(z), 0.8 * m, 3.4 * m);
  // surrounding city apron (sidewalk grey outside the parks)
  g.fillStyle = 'rgba(120,118,110,0.85)';
  g.fillRect(0, 0, W, pz(-104)); g.fillRect(0, pz(104), W, H - pz(104));
  g.fillRect(0, 0, px(-208), H); g.fillRect(px(208), 0, W - px(208), H);
  // paths
  g.strokeStyle = '#c8b490'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const line of PATHS) {
    g.lineWidth = 3.4 * m;
    g.beginPath();
    line.forEach(([x, z], i) => i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z)));
    g.stroke();
    g.strokeStyle = '#d6c49c'; g.lineWidth = 2.9 * m; g.stroke();
    g.strokeStyle = '#c8b490';
  }
  // plaza discs
  for (const [cx, cz, r] of [[140,42,13], [BREWER_FOUNTAIN.x,BREWER_FOUNTAIN.z,10], [60,-45,12]]) {
    if (!r) continue;
    g.fillStyle = '#cdbb96';
    g.beginPath(); g.ellipse(px(cx), pz(cz), r * m, r * m * (H / W) * (MAP.maxX - MAP.minX) / (MAP.maxZ - MAP.minZ), 0, 0, 7); g.fill();
  }
  // pond/lagoon beds (sandy bottom under the water meshes)
  for (const e of [MAP.lagoon, MAP.frogPond]) {
    g.fillStyle = '#978a64';
    g.beginPath(); g.ellipse(px(e.x), pz(e.z), e.rx * m, e.rz * m * 0.983, 0, 0, 7); g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------- build ----------
export function buildWorld(scene) {
  // terrain mesh
  const geo = new THREE.PlaneGeometry(MAP.maxX - MAP.minX, MAP.maxZ - MAP.minZ, TERRAIN_X, TERRAIN_Z);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  terrainGrid = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (MAP.minX + MAP.maxX) / 2;
    const z = pos.getZ(i) + (MAP.minZ + MAP.maxZ) / 2;
    const h = groundHeight(x, z);
    pos.setY(i, h);
    terrainGrid[i] = Math.fround(h);
  }
  geo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ map: paintGround(), roughness: 1, envMapIntensity: 0.75 });
  // micro-detail: blend a tiling grass-noise texture by world position so the
  // lawn has grain at squirrel height instead of one blurry paint layer
  const detail = groundDetailTex();
  groundMat.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nuniform sampler2D uDetail;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat dtl = texture2D(uDetail, vWp.xz * 0.5).g;\ndiffuseColor.rgb *= 0.8 + dtl * 0.4;');
  };
  const ground = new THREE.Mesh(geo, groundMat);
  // Independent triangle raycast target for localhost-only continuous walk QA.
  ground.userData.scurryTerrainMesh = true;
  ground.position.set((MAP.minX + MAP.maxX) / 2, 0, (MAP.minZ + MAP.maxZ) / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  buildWetPaths(scene);

  // water: lagoon + frog pond. Low roughness + scene.environment = sky sheen;
  // reads wet and reflective at dusk (the Saltline trick, pond-sized).
  // Grade (v0.3): lighter base colour, slightly broader reflection lobe and
  // a hotter env response so the sky actually lands on the surface; the
  // emissive sheen is driven per-phase by daycycle (see S.waterMat there),
  // which is what keeps it from going black at dusk/night.
  // DoubleSide (v0.6.28): wading puts the eye UNDER this plane, and a
  // front-only surface vanishes from below - the bed read as dry land.
  // The underside now renders, and daycycle lays murk fog + a tint over
  // submerged frames so the volume reads as water from inside too.
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a5a68, transparent: true, opacity: 0.93, roughness: 0.13, metalness: 0.05, envMapIntensity: 2.3, emissive: 0x1a2440, emissiveIntensity: 0.22, side: THREE.DoubleSide });
  S.waterMat = waterMat;
  for (const [e, y] of [[MAP.lagoon, 0.02], [MAP.frogPond, 0.06]]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 40), waterMat);
    w.rotation.x = -Math.PI / 2;
    w.scale.set(e.rx - 1.5, e.rz - 1, 1);
    w.position.set(e.x, y, e.z);
    w.userData.isWater = true;
    scene.add(w);
    S.waterMeshes = S.waterMeshes || [];
    S.waterMeshes.push(w);
    // stone rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.03, 6, 48),
      new THREE.MeshStandardMaterial({ color: 0x9a958a, roughness: 0.9 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(e.rx, e.rz, 6);
    rim.position.set(e.x, 0.1, e.z);
    scene.add(rim);
  }

  buildPondCurbs(scene);

  // sky dome (gradient shader + sun disc, colors driven by daycycle)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x3a6ea8) }, mid: { value: new THREE.Color(0xf2b879) }, bot: { value: new THREE.Color(0xf7d9a8) },
      sunDir: { value: new THREE.Vector3(0.5, 0.3, 0.2) }, sunTint: { value: new THREE.Color(0xffc98a) }, sunAmt: { value: 1 },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunTint; uniform float sunAmt; varying vec3 vP;' +
      'void main(){ vec3 d = normalize(vP); float h = d.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.65, h)) : mix(bot, mid, smoothstep(-0.08, 0.12, h));' +
      ' float sd = max(dot(d, normalize(sunDir)), 0.0);' +
      ' c += sunTint * (pow(sd, 600.0) * 1.6 + pow(sd, 18.0) * 0.22) * sunAmt;' +
      ' gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  sky.userData.isSky = true;
  scene.add(sky);
  S.skyMat = skyMat;

  // stars (fade in at night via daycycle)
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  const starRnd=seededRandom(0x5ca123);
  for (let i = 0; i < 700; i++) {
    const a = starRnd() * Math.PI * 2, e = starRnd() * Math.PI * 0.48 + 0.05, r = 850;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  S.starMat = starMat;

  // clouds: big soft billboards drifting slowly, tinted by the daycycle
  const cTex = cloudTex();
  S.clouds = [];
  S.cloudMat = new THREE.SpriteMaterial({ map: cTex, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  let cseed = 4711;
  const crnd = () => { cseed = (cseed * 16807) % 2147483647; return (cseed - 1) / 2147483646; };
  for (let i = 0; i < 16; i++) {
    const sp = new THREE.Sprite(S.cloudMat);
    const a = crnd() * Math.PI * 2, r = 260 + crnd() * 420;
    sp.position.set(Math.cos(a) * r, 110 + crnd() * 90, Math.sin(a) * r);
    const sc = 150 + crnd() * 190;
    sp.scale.set(sc, sc * 0.36, 1);
    scene.add(sp);
    S.clouds.push({ sp, speed: 0.7 + crnd() * 0.9 });
  }

  buildPerimeter(scene);
  buildBeaconRow(scene, groundHeight);
  buildCharlesStreet(scene, groundHeight);
  buildRingBlocks(scene);
  buildSouthWestRows(scene, groundHeight);
  buildTremontRow(scene, groundHeight);
}

// ---------- wet path ribbons ----------
// Flat gravel ribbons that follow the terrain over every painted path, with a
// low-roughness finish: the scene.environment sky sheen makes them read WET,
// which is the whole Saltline look. Plaza discs get the same treatment.
const wetPathMat = new THREE.MeshStandardMaterial({
  color: 0xc9b28a, roughness: 0.16, metalness: 0.06, envMapIntensity: 1.5,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
});
// path shoulder (v0.6.27): a slightly wider, darker packed-earth ribbon
// under every wet ribbon, seated lower. At squirrel height the wet
// ribbons used to end in a floating 4 cm lip against the lawn; now the
// path has an edge - gravel, then shoulder, then grass.
const pathBorderMat = new THREE.MeshStandardMaterial({
  color: 0x9a8256, roughness: 1,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
});
export function terrainDisc(cx, cz, r, mat, yOff = 0.045) {
  const geo = new THREE.CircleGeometry(r, 36);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, groundHeight(cx + pos.getX(i), cz + pos.getZ(i)) + yOff);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.position.set(cx, 0, cz);
  m.receiveShadow = true;
  return m;
}
function buildWetPaths(scene) {
  // one ribbon geometry over a set of polylines at a given half width
  // and seating height; resampled every ~2 m so it hugs the terrain
  function ribbonGeo(lines, W2, yOff) {
    const verts = [], norms = [], idx = [];
    let vi = 0;
    function ribbon(line) {
      const pts = [];
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, az] = line[i], [bx, bz] = line[i + 1];
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2));
        for (let j = (i === 0 ? 0 : 1); j <= n; j++) pts.push([ax + (bx - ax) * j / n, az + (bz - az) * j / n]);
      }
      const start = vi;
      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i];
        const [px, pz] = pts[Math.max(0, i - 1)], [nx, nz] = pts[Math.min(pts.length - 1, i + 1)];
        let dx = nx - px, dz = nz - pz;
        const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
        const ox = -dz * W2, oz = dx * W2;
        verts.push(x + ox, groundHeight(x + ox, z + oz) + yOff, z + oz, x - ox, groundHeight(x - ox, z - oz) + yOff, z - oz);
        norms.push(0, 1, 0, 0, 1, 0);
        vi += 2;
        if (i > 0) {
          const a = start + (i - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
    }
    for (const line of lines) ribbon(line);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
    geo.setIndex(idx);
    return geo;
  }
  const mesh = new THREE.Mesh(ribbonGeo(PATHS, 1.8, 0.04), wetPathMat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  // shoulders under every path (v0.6.27)
  const border = new THREE.Mesh(ribbonGeo(PATHS, 2.15, 0.022), pathBorderMat);
  border.receiveShadow = true;
  scene.add(border);
  // The Mall (v0.6.27): the Common's central promenade is a broad
  // gravel walk in reality, not a 3.6 m ribbon - it gets its own wide
  // apron over the standard ribbon, with its own shoulder peeking out.
  // Heights stack ground 0 < shoulder 0.03 < ribbon 0.04 < apron 0.058
  // so no two surfaces ever share a plane.
  const mallLine = [PATHS[1]];
  const mallBorder = new THREE.Mesh(ribbonGeo(mallLine, 5.4, 0.03), pathBorderMat);
  mallBorder.receiveShadow = true;
  scene.add(mallBorder);
  const mallApron = new THREE.Mesh(ribbonGeo(mallLine, 4.7, 0.058), wetPathMat);
  mallApron.receiveShadow = true;
  scene.add(mallApron);
  // plazas
  scene.add(terrainDisc(140, 42, 13, wetPathMat));
  scene.add(terrainDisc(BREWER_FOUNTAIN.x,BREWER_FOUNTAIN.z,10,wetPathMat));
  scene.add(terrainDisc(60, -45, 12.5, wetPathMat));
  // plaza shoulders (v0.6.27): a darker ring peeking past each disc
  scene.add(terrainDisc(140, 42, 13.6, pathBorderMat, 0.028));
  scene.add(terrainDisc(BREWER_FOUNTAIN.x,BREWER_FOUNTAIN.z,BREWER_FOUNTAIN.plazaRadius,pathBorderMat,0.028));
  scene.add(terrainDisc(60, -45, 13.1, pathBorderMat, 0.028));
}

// ---------- pond edging (v0.6.27) ----------
// Low granite blocks ringing the lagoon + Frog Pond at the water's
// edge: the painted sand bed used to just fade into the lawn, and at
// 25 cm eye height the shore had no line at all. One InstancedMesh,
// each block seated on its own sampled ground height, kept low
// (~0.14 m proud) so wading squirrels step over the seam instead of
// clipping a wall. Visual only - no solids, same as the rim torus.
function buildPondCurbs(scene) {
  const curbMat = new THREE.MeshStandardMaterial({ map: graniteTex(), color: 0xbdb6a6, roughness: 0.95 });
  const blockGeo = new THREE.BoxGeometry(1.3, 0.24, 0.34);
  const spots = [];
  for (const e of [MAP.lagoon, MAP.frogPond]) {
    const n = Math.floor(Math.PI * (e.rx + e.rz) / 1.32);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const x = e.x + Math.cos(t) * e.rx, z = e.z + Math.sin(t) * e.rz;
      const tx = -e.rx * Math.sin(t), tz = e.rz * Math.cos(t); // ellipse tangent
      spots.push([x, z, Math.atan2(-tz, tx)]);
    }
  }
  const mesh = new THREE.InstancedMesh(blockGeo, curbMat, spots.length);
  const d = new THREE.Object3D();
  spots.forEach(([x, z, ry], i) => {
    d.position.set(x, groundHeight(x, z) + 0.03, z);
    d.rotation.set(0, ry, 0);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// Park perimeter: high-detail black iron pickets with a continuous
// traversable top rail. Only five shared instanced draw calls, not hundreds
// of independent fence objects. Panels follow the *actual* hill gradient.
function buildPerimeter(scene) {
  const iron = new THREE.MeshStandardMaterial({color:0x22252a,roughness:0.54,metalness:0.75});
  const {posts,pickets,panels}=makeParkFenceLayout(groundHeight);
  const dummy=new THREE.Object3D();
  const xAxis=new THREE.Vector3(1,0,0);
  const heading=new THREE.Vector3();

  function placeVertical(items,geo,height,offset) {
    const mesh=new THREE.InstancedMesh(geo,iron,items.length);
    mesh.frustumCulled=false; // long perimeter set, no inaccurate partial cull
    for(let i=0;i<items.length;i++){
      const p=items[i];
      dummy.position.set(p.x,p.y+offset,p.z);
      dummy.rotation.set(0,0,0);
      dummy.quaternion.identity();dummy.scale.set(1,1,1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    scene.add(mesh);
    return mesh;
  }
  // Turn-of-century park fence vocabulary: thicker regular uprights,
  // close slender pickets, and spear-tip silhouettes readable at 25cm.
  placeVertical(posts,new THREE.CylinderGeometry(.055,.07,1.09,7),1.09,.545);
  placeVertical(posts,new THREE.ConeGeometry(.078,.16,5),.16,1.17);
  placeVertical(pickets,new THREE.CylinderGeometry(.018,.021,1.05,5),1.05,.525);
  placeVertical(pickets,new THREE.ConeGeometry(.042,.115,5),.115,1.1075);

  // Two locally graded horizontal rails, top one matched exactly to the
  // physical jump-on platform at ground + .975m at each panel midpoint.
  const rail=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.05,.065),iron,panels.length*2);
  rail.frustumCulled=false;
  for(let i=0;i<panels.length;i++){
    const p=panels[i],dx=p.x1-p.x0,dz=p.z1-p.z0,dy=p.y1-p.y0;
    const fullLength=Math.hypot(dx,dy,dz);
    heading.set(dx,dy,dz).normalize();
    for(let level=0;level<2;level++){
      dummy.position.set((p.x0+p.x1)/2,(p.y0+p.y1)/2+(level?.95:.35),
        (p.z0+p.z1)/2);
      dummy.quaternion.setFromUnitVectors(xAxis,heading);
      dummy.scale.set(fullLength,1,1);dummy.updateMatrix();
      rail.setMatrixAt(i*2+level,dummy.matrix);
    }
    const top=(p.y0+p.y1)/2+.975;
    S.walls.push({x0:p.x0,z0:p.z0,x1:p.x1,z1:p.z1,
      r:.055,minY:-2,maxY:top,maxY0:p.y0+.975,maxY1:p.y1+.975});
    S.platformSegments.push({x0:p.x0,z0:p.z0,x1:p.x1,z1:p.z1,
      r:.19,y:top,y0:p.y0+.975,y1:p.y1+.975,jumpOnly:true});
  }
  rail.instanceMatrix.needsUpdate=true;
  scene.add(rail);
  // Landmarks at the *existing* breaks in the ironwork; entrance passages
  // remain unobstructed and stone piers register real solid colliders.
  buildParkEntrances(scene,groundHeight);

  // city backdrop: textured facade blocks with lit-window emissive maps
  // (windows come alive at dusk via daycycle), plus a few taller towers
  const facadeSets = [
    cityFacade(101, '#5d5a55'), cityFacade(202, '#4c4a4e'), cityFacade(303, '#65584a'),
  ];
  S.cityMats = facadeSets.map(({ map, emissiveMap }) => {
    const m = new THREE.MeshStandardMaterial({
      map, emissiveMap, emissive: 0xffc37a, emissiveIntensity: 0.12, roughness: 0.92,
    });
    return m;
  });
  // (the ring blocks themselves moved to streetwalls.js buildRingBlocks:
  // instanced, setback tiers, seeded - this function keeps the fence,
  // the shared city materials, and the landmark towers)
  buildSkylineTowers(scene);
}

// landmark towers with actual silhouettes: a glass slab, a setback stack,
// a spired shaft, and a clock tower - Boston's greatest hits, abstracted
function buildSkylineTowers(scene) {
  const stoneMat = S.cityMats[2];
  const darkMat = S.cityMats[1];
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 1 });
  function towerBox(w, h, d, mat, x, yBase, z, ry = 0) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, yBase + h / 2, z);
    b.rotation.y = ry;
    scene.add(b);
    return b;
  }
  // the glass slab (Hancock): thin, tall, rotated to present a knife edge
  {
    const gf = glassFacade(909);
    const glassMat = new THREE.MeshStandardMaterial({
      map: gf.map, emissiveMap: gf.emissiveMap, emissive: 0xffc37a, emissiveIntensity: 0.12,
      roughness: 0.32, metalness: 0.15, envMapIntensity: 1.5,
    });
    S.cityMats.push(glassMat);
    towerBox(30, 66, 11, glassMat, -96, -1, 146, 0.45);
  }
  // the setback stack: three shrinking tiers
  towerBox(30, 38, 30, stoneMat, -168, -1, -142);
  towerBox(24, 30, 24, stoneMat, -168, 37, -142);
  towerBox(17, 24, 17, darkMat, -168, 67, -142);
  towerBox(18.5, 1.4, 18.5, roofMat, -168, 91, -142);
  // the spired shaft (Prudential): crown band + antenna + beacon
  towerBox(24, 62, 24, darkMat, 64, -1, -146);
  towerBox(26, 4, 26, stoneMat, 64, 61, -146);
  towerBox(15, 9, 15, darkMat, 64, 65, -146);
  {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 13, 6), roofMat);
    ant.position.set(64, 74 + 6.5, -146);
    scene.add(ant);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2a1a, emissiveIntensity: 0.9 }));
    beacon.position.set(64, 87.5, -146);
    scene.add(beacon);
  }
  // the clock tower (Custom House): slim shaft, clock band, pyramid cap
  {
    towerBox(28, 38, 28, stoneMat, 196, -1, 142);
    towerBox(16, 30, 16, stoneMat, 196, 37, 142);
    const clockMat = new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.8 });
    towerBox(17.5, 6, 17.5, clockMat, 196, 67, 142);
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(12.4, 10, 4),
      new THREE.MeshStandardMaterial({ color: 0x3a4149, roughness: 0.6, metalness: 0.3 }));
    pyr.position.set(196, 73 + 5, 142);
    pyr.rotation.y = Math.PI / 4;
    scene.add(pyr);
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8a921, roughness: 0.3, metalness: 0.85 }));
    fin.position.set(196, 84.2, 142);
    scene.add(fin);
  }
}
