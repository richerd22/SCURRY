// SCURRY - world core: terrain height field, painted ground, water, sky dome.
// The map is one continuous park: Public Garden (west), Charles St, Boston Common (east).

import * as THREE from 'three';
import { S, MAP } from '../state.js';
import { groundDetailTex, cityFacade, glassFacade, clockTex, cloudTex } from './textures.js';
import { buildBeaconRow, buildCharlesStreet, buildRingBlocks, buildSouthWestRows } from './streetwalls.js';

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

export function groundHeight(x, z) {
  let h = 0;
  h += 6.5 * gauss(x, z, 60, -45, 36);            // Soldiers & Sailors Monument hill
  h += 1.3 * gauss(x, z, 140, 42, 17);            // bandstand knoll
  h += 0.9 * gauss(x, z, -25, -58, 14);           // Brewer Fountain rise
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
  // Diagonal: Park St corner to bandstand
  [[-34, -80], [30, -40], [80, 0], [140, 42]],
  // Frog pond loop feeders
  [[60, 12], [80, 12], [112, 12]],
  [[140, 42], [112, 42], [60, 42]],
  // Garden: lagoon loop
  [[-182, -34], [-132, -40], [-82, -34], [-76, 0], [-82, 34], [-132, 40], [-182, 34], [-188, 0], [-182, -34]],
  // Garden: bridge crossing (over the deck, endpoints on the loop)
  [[-132, -38], [-132, 38]],
  // Garden: south mall to Washington statue
  [[-132, 40], [-132, 74]],
  // Garden north path + Charles St crossings
  [[-196, -70], [-100, -70], [-60, -70]],
  [[-36, -70], [-44, -70], [-60, -70]],
  [[-36, 30], [-44, 30], [-76, 30]],
  [[-36, -18], [-44, -18], [-76, -14]],
];

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
  if (inWater(x, z) || onRoad(x, z)) return false;
  if (distToPaths(x, z) < 2.4) return false;
  return true;
}

// ---------- ground texture painting ----------
function paintGround() {
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
    g.fillStyle = Math.random() < 0.5 ? 'rgba(20,60,15,0.16)' : 'rgba(140,190,90,0.13)';
    g.fillRect(Math.random() * W, Math.random() * H, 2.4, 2.4);
  }
  // Garden lawns slightly richer
  g.fillStyle = 'rgba(30,90,40,0.18)';
  g.fillRect(px(MAP.garden.minX), pz(MAP.garden.minZ), (MAP.garden.maxX - MAP.garden.minX) * m, (MAP.garden.maxZ - MAP.garden.minZ) * m);
  // flower beds in the Garden (colour blobs)
  const bedCols = ['#b8546e', '#d9a441', '#e8e4da', '#a04a7a', '#c96f3b'];
  for (let i = 0; i < 26; i++) {
    const bx = MAP.garden.minX + 12 + Math.random() * 120, bz = -88 + Math.random() * 176;
    if (ellipseDip(bx, bz, MAP.lagoon) > 0) continue;
    g.fillStyle = bedCols[i % bedCols.length];
    g.globalAlpha = 0.55;
    g.beginPath(); g.ellipse(px(bx), pz(bz), (3 + Math.random() * 5) * m, (1.6 + Math.random() * 2) * m, Math.random(), 0, 7); g.fill();
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
  for (const [cx, cz, r] of [[140, 42, 13], [-25, -58, 10], [60, -45, 12], [-132, 0, 0]]) {
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
  const geo = new THREE.PlaneGeometry(MAP.maxX - MAP.minX, MAP.maxZ - MAP.minZ, 150, 86);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (MAP.minX + MAP.maxX) / 2;
    const z = pos.getZ(i) + (MAP.minZ + MAP.maxZ) / 2;
    pos.setY(i, groundHeight(x, z));
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
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a5a68, transparent: true, opacity: 0.93, roughness: 0.13, metalness: 0.05, envMapIntensity: 2.3, emissive: 0x1a2440, emissiveIntensity: 0.22 });
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
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.48 + 0.05, r = 850;
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
}

// ---------- wet path ribbons ----------
// Flat gravel ribbons that follow the terrain over every painted path, with a
// low-roughness finish: the scene.environment sky sheen makes them read WET,
// which is the whole Saltline look. Plaza discs get the same treatment.
const wetPathMat = new THREE.MeshStandardMaterial({
  color: 0xc9b28a, roughness: 0.16, metalness: 0.06, envMapIntensity: 1.5,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
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
  const verts = [], norms = [], idx = [];
  let vi = 0;
  const W2 = 1.8; // half width (paths are painted 3.4m wide)
  function ribbon(line) {
    // resample the polyline every ~2m so the ribbon hugs the terrain
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
      verts.push(x + ox, groundHeight(x + ox, z + oz) + 0.04, z + oz, x - ox, groundHeight(x - ox, z - oz) + 0.04, z - oz);
      norms.push(0, 1, 0, 0, 1, 0);
      vi += 2;
      if (i > 0) {
        const a = start + (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  for (const line of PATHS) ribbon(line);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, wetPathMat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  // plazas
  scene.add(terrainDisc(140, 42, 13, wetPathMat));
  scene.add(terrainDisc(-25, -58, 10, wetPathMat));
  scene.add(terrainDisc(60, -45, 12.5, wetPathMat));
}

// park perimeter: low iron fence + gates, city backdrop blocks beyond
function buildPerimeter(scene) {
  const iron = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.6, metalness: 0.6 });
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 5);
  const railGeo = new THREE.BoxGeometry(1, 0.05, 0.05);
  const group = new THREE.Group();
  function fenceRun(x0, z0, x1, z1) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.floor(len / 2.2);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const p = new THREE.Mesh(postGeo, iron);
      p.position.set(x, groundHeight(x, z) + 0.55, z);
      group.add(p);
    }
    for (const ry of [0.35, 0.95]) {
      const r = new THREE.Mesh(railGeo, iron);
      r.scale.x = len;
      r.position.set((x0 + x1) / 2, groundHeight((x0 + x1) / 2, (z0 + z1) / 2) + ry, (z0 + z1) / 2);
      r.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      group.add(r);
    }
    // collision approx: a few circles along the run
    for (let i = 0; i <= n; i += 2) {
      const t = i / n;
      S.solids.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, r: 1.15 });
    }
  }
  // Common fence (gaps at Park St corner + Charles St crossings are implied by short runs)
  fenceRun(-38, -100, 120, -100); fenceRun(150, -100, 203, -100);
  fenceRun(-38, 100, 203, 100);
  fenceRun(203, -100, 203, 100);
  fenceRun(-38, -100, -38, -84); fenceRun(-38, -60, -38, 100);
  // Garden fence
  fenceRun(-203, -96, -62, -96); fenceRun(-203, 96, -62, 96);
  fenceRun(-203, -96, -203, 96);
  fenceRun(-62, -96, -62, -76); fenceRun(-62, -56, -62, 20); fenceRun(-62, 44, -62, 96);
  scene.add(group);

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
