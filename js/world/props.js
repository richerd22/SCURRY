// SCURRY - props: benches, lamps, trash cans, picnic blankets, the pretzel cart.
// Benches register sitter spots; blankets register stealable food + owner gaze;
// lamps register glow sprites the daycycle fades in at dusk.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight } from './world.js';
import { plankTex, glowTex } from './textures.js';
import { loadModel, fitHeight } from '../systems/models.js';

const iron = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.5 });
const slat = new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 1 });
const canMat = new THREE.MeshStandardMaterial({ color: 0x2c4632, roughness: 0.7, metalness: 0.3 });

export const BENCH_SPOTS = [];   // {x, z, rotY, gy} for humans.js to seat people

const BENCHES = [
  // [x, z, rotY] - facing paths / views
  [52, -22, 0.4], [70, -14, -0.5], [104, -22, 0.2], [120, 2, 2.6], [88, 26, -2.8],
  [30, 46, 0.9], [150, 30, -1.4], [176, -24, 1.8], [10, -50, 0.3], [-14, -44, -0.8],
  [196, 20, -1.57], [40, 88, 0.1], [150, 88, -0.2], [86, -50, 2.9],
  // Garden benches face the lagoon
  [-96, -20, 1.9], [-96, 22, 1.4], [-168, -22, -1.8], [-168, 20, -1.2],
  [-120, -62, 3.1], [-146, 59, 0.2], [-86, -52, 2.6], [-180, 44, -0.9],
];

export function buildProps(scene) {
  buildBenches(scene);
  buildLamps(scene);
  buildTrashCans(scene);
  buildBlankets(scene);
  buildPretzelCart(scene);
}

const benchGroups = [];
function buildBenches(scene) {
  const seatGeo = new THREE.BoxGeometry(2.1, 0.09, 0.5);
  const backGeo = new THREE.BoxGeometry(2.1, 0.5, 0.08);
  const legGeo = new THREE.BoxGeometry(0.12, 0.5, 0.55);
  for (const [x, z, rotY] of BENCHES) {
    const gy = groundHeight(x, z);
    const g = new THREE.Group();
    const parts = [];
    const seat = new THREE.Mesh(seatGeo, slat); seat.position.y = 0.5; seat.castShadow = true; g.add(seat); parts.push(seat);
    const back = new THREE.Mesh(backGeo, slat); back.position.set(0, 0.85, -0.26); back.rotation.x = -0.15; g.add(back); parts.push(back);
    for (const sx of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(legGeo, iron); leg.position.set(sx, 0.25, 0); g.add(leg); parts.push(leg);
    }
    g.position.set(x, gy, z);
    g.rotation.y = rotY;
    scene.add(g);
    benchGroups.push({ g, parts });
    BENCH_SPOTS.push({ x, z, rotY, gy });
    S.solids.push({ x, z, r: 0.8, minY: gy - 0.1, maxY: gy + 0.545 });
    // The CC0 seat is 2.49m long: three overlapping support discs cover
    // its actual orientation instead of only the centre of the bench.
    for (const along of [-0.69, 0, 0.69]) {
      S.platforms.push({
        x: x + Math.cos(rotY) * along, z: z - Math.sin(rotY) * along,
        r: 0.52, y: gy + 0.545,
      });
    }
  }
  swapBenches();
}

// CC0 Bench (Quaternius) replaces the procedural slat benches where it loads
// cleanly. The shipped Bench.glb is baked Y-up in metres, origin at ground
// centre, seat slats topping out at 0.1444/0.1468 local. A uniform scale of
// 0.545/0.1456 lands the seat plane on gy+0.545 - the height humans.js
// seatOnBench is built around - at the cost of footprint: 2.49 m long,
// 1.18 m tall, 0.91 m deep vs the procedural 2.1/1.10/~0.58 (a long park
// bench, not a distortion; proportions stay the model's own). The model's
// backrest stands on its local +Z while ours is on -Z, so the visual turns
// PI inside the group; group transforms, BENCH_SPOTS and solids are untouched.
const BENCH_MODEL_SCALE = 0.545 / 0.1456;
function swapBenches() {
  loadModel('assets/models/Bench.glb').then((tpl) => {
    if (!tpl) return;
    for (const { g, parts } of benchGroups) {
      const m = tpl.scene.clone(true);
      m.scale.setScalar(BENCH_MODEL_SCALE);
      m.rotation.y = Math.PI;
      m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      for (const p of parts) p.visible = false;
      g.add(m);
    }
  }).catch(() => { /* procedural benches stay */ });
}

function buildLamps(scene) {
  const postGeo = new THREE.CylinderGeometry(0.06, 0.09, 3.4, 6);
  const bulbGeo = new THREE.SphereGeometry(0.15, 8, 6);
  const lampSpots = [];
  // along the promenade + spines + garden loop
  for (let x = -28; x <= 192; x += 24) lampSpots.push([x, -24]);
  for (let x = -20; x <= 180; x += 26) lampSpots.push([x, 88]);
  for (let z = -80; z <= 80; z += 26) { lampSpots.push([106, z]); lampSpots.push([-96, z + 8]); lampSpots.push([-168, z]); }
  for (let z = -70; z <= 70; z += 24) lampSpots.push([54, z]);
  lampSpots.push([-132, -67], [-132, 67], [-44, -40], [-44, 40], [140, 28], [126, 54]);
  const glowTexture = glowTex();
  // volumetric-feel light cones: additive gradient cones under each bulb,
  // opacity driven by the daycycle lamp factor via S.lampConeMat
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0xffb45e) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;' +
      'void main(){ float a = pow(clamp(vUv.y, 0.0, 1.0), 1.7) * uOpacity; gl_FragColor = vec4(uColor, a); }',
  });
  S.lampConeMat = coneMat;
  const coneGeo = new THREE.ConeGeometry(1.7, 3.3, 12, 1, true);
  let lampIndex = 0;
  for (const [x, z] of lampSpots) {
    const gy = groundHeight(x, z);
    const g = new THREE.Group();
    const post = new THREE.Mesh(postGeo, iron); post.position.y = 1.7; post.castShadow = true; g.add(post);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c4, emissive: 0xffb45e, emissiveIntensity: 0 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat); bulb.position.y = 3.45; g.add(bulb);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffbe78, transparent: true, opacity: 0, depthWrite: false }));
    sprite.scale.set(4.5, 4.5, 1);
    sprite.position.y = 3.45;
    g.add(sprite);
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 1.78;
    g.add(cone);
    // a real PointLight only every 4th lamp (shader budget); glow sprites carry the rest
    let light = null;
    if (lampIndex++ % 4 === 0) {
      light = new THREE.PointLight(0xffb45e, 0, 17, 1.6);
      light.position.y = 3.4;
      g.add(light);
    }
    g.position.set(x, gy, z);
    scene.add(g);
    S.lamps.push({ sprite, bulbMat, light, x, z });
    S.solids.push({ x, z, r: 0.3, minY: gy - 0.1, maxY: gy + 3.45 });
    lampGroups.push({ g, post });
  }
  swapLampPosts();
}

// CC0 Post Lantern (Kay Lousberg) replaces the plain cylinder posts where it
// loads cleanly; the emissive bulb + sprite + cone stay ours for the glow.
const lampGroups = [];
function swapLampPosts() {
  loadModel('assets/models/PostLantern.glb').then((tpl) => {
    if (!tpl) return;
    for (const { g, post } of lampGroups) {
      const m = tpl.scene.clone(true);
      fitHeight(m, 3.42);
      m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      post.visible = false;
      g.add(m);
    }
  }).catch(() => { /* procedural posts stay */ });
}

function buildTrashCans(scene) {
  const canGeo = new THREE.CylinderGeometry(0.42, 0.38, 0.95, 10);
  const spots = [[46, -20], [108, -24], [156, -20], [64, 44], [116, 46], [-16, -52], [136, 36], [-92, -16], [-168, -43], [-172, 16], [24, -84], [184, 60]];
  for (const [x, z] of spots) {
    const gy = groundHeight(x, z);
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.set(x, gy + 0.48, z);
    can.castShadow = true;
    scene.add(can);
    S.solids.push({ x, z, r: 0.5, minY: gy - 0.1, maxY: gy + 0.955 });
    S.platforms.push({ x, z, r: 0.4, y: gy + 0.955 });
    (S.trashCans = S.trashCans || []).push(new THREE.Vector3(x, gy, z));
  }
}

const BLANKETS = [
  // [x, z, color] on the open lawns
  [22, 56, 0xb84a4a], [36, 30, 0x4a6eb8], [-2, 66, 0xd9c84a],
  [168, 8, 0x7ab84a], [188, -52, 0xb87ab8], [-108, 66, 0xd97f3b],
];
function buildBlankets(scene) {
  BLANKETS.forEach(([x, z, color], i) => {
    const gy = groundHeight(x, z);
    const g = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    cloth.rotation.x = -Math.PI / 2; cloth.rotation.z = i * 0.7;
    cloth.position.y = 0.04; cloth.receiveShadow = true;
    g.add(cloth);
    // a little picnic basket
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xa8843c, roughness: 1 }));
    basket.position.set(0.7, 0.2, 0.6); basket.castShadow = true;
    g.add(basket);
    g.position.set(x, gy, z);
    scene.add(g);
    S.blankets.push({
      x, z, gy, index: i, mesh:g,
      lookingAway: false, gazeTimer: 2 + Math.random() * 4,
      foodTaken: false,
    });
  });
}

function buildPretzelCart(scene) {
  const x = 128, z = 56, gy = groundHeight(x, z);
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xc8c2b2, roughness: 0.5, metalness: 0.4 }));
  body.position.y = 0.95; body.castShadow = true; g.add(body);
  for (const [wx, wz] of [[-0.8, 0.55], [0.8, 0.55], [-0.8, -0.55], [0.8, -0.55]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0x333333 }));
    wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.28, wz); g.add(wheel);
  }
  // glass case with pretzel twists (torus knots read as pretzels at this scale)
  const caseM = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xbfd4da, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 }));
  caseM.position.y = 1.85; g.add(caseM);
  const pretzelMat = new THREE.MeshStandardMaterial({ color: 0xa06a28, roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.TorusKnotGeometry(0.13, 0.05, 32, 6), pretzelMat);
    p.position.set(-0.5 + i * 0.5, 1.8, 0); p.castShadow = true; g.add(p);
  }
  // umbrella
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), iron);
  pole.position.y = 2.2; g.add(pole);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.6, 10),
    new THREE.MeshStandardMaterial({ color: 0xb84a3a, roughness: 0.9 }));
  umb.position.y = 3.3; umb.castShadow = true; g.add(umb);
  // sign
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#f2ead2'; c.fillRect(0, 0, 256, 64);
  c.fillStyle = '#8a3a28'; c.font = 'bold 30px monospace'; c.textAlign = 'center';
  c.fillText('PRETZELS', 128, 42);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(0, 1.35, 0.63); g.add(sign);
  g.position.set(x, gy, z);
  g.rotation.y = -0.5;
  scene.add(g);
  S.solidBoxes.push({ minX: x - 1.2, maxX: x + 1.2, minZ: z - 0.8, maxZ: z + 0.8, minY: gy - 0.1, maxY: gy + 1.55 });
  S.platformBoxes.push({ minX: x - 1.0, maxX: x + 1.0, minZ: z - 0.55, maxZ: z + 0.55, y: gy + 1.55 });
  S.pretzelCart = new THREE.Vector3(x, gy, z);
}
