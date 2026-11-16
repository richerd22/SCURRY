// SCURRY - day cycle: golden hour -> dusk -> night -> dawn, on a slow loop.
// Drives the sun (shadow camera follows the squirrel), sky gradient + sun
// disc, layered fog ranges, a PMREM environment rebuilt per phase (that's
// what makes the wet paths and ponds shine), lamp glow + light cones,
// city windows, the State House windows, clouds, and water shimmer.

import * as THREE from 'three';
import { S } from '../state.js';

const DAY_LENGTH = 780; // seconds per full day (13 min) - a long golden evening

const KEYS = [
  // hour, sunColor, sunI, sky top/mid/bot, fogColor, amb, lamp 0..1, fogNear, fogFar
  [0.0,  0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.22, 1,    26, 230],
  [5.0,  0x8fa8d8, 0.25, 0x0a1428, 0x1c2440, 0x2a2438, 0x161c30, 0.22, 1,    26, 230],
  [6.5,  0xffb37a, 0.9,  0x3a5a8c, 0xe8906a, 0xf7cf9a, 0x8a7a72, 0.5, 0.25,  55, 380],
  [9.0,  0xfff2d8, 1.65, 0x3a6ea8, 0x9fc4e8, 0xd8ecf7, 0xaec6d8, 0.75, 0,   95, 560],
  [16.0, 0xffeec9, 1.55, 0x3a6ea8, 0xa8c8e8, 0xe4eef2, 0xb2c4d2, 0.78, 0,   90, 540],
  [17.6, 0xffc98a, 1.5,  0x38649e, 0xf2b879, 0xf7d9a8, 0xc2a88e, 0.95, 0,   70, 440],
  [18.7, 0xff9a56, 1.1,  0x2c4a78, 0xe87f52, 0xf2b879, 0x9a7a6e, 0.8, 0.55, 48, 320],
  [19.6, 0x7a86c8, 0.45, 0x141f42, 0x4a4470, 0x8a5a68, 0x3c3448, 0.44, 1,   32, 250],
  [21.0, 0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.22, 1,   26, 230],
  [24.0, 0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.22, 1,   26, 230],
];

const cA = new THREE.Color(), cB = new THREE.Color();
function lerpKeyColor(out, a, b, t, idx) {
  cA.setHex(a[idx]); cB.setHex(b[idx]);
  out.copy(cA).lerp(cB, t);
}
function lerpKeyNum(a, b, t, idx) { return a[idx] + (b[idx] - a[idx]) * t; }

let sun, hemi;
let pmrem = null, envScene = null, envSkyMat = null, envSun = null, envRT = null, lastEnvBucket = -99;

export function initDaycycle(scene) {
  sun = new THREE.DirectionalLight(0xffc98a, 1.3);
  sun.castShadow = true;
  const shadowPx = S.isTouch ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowPx, shadowPx);
  // tight shadow box that follows the player = crisp shadows at squirrel scale
  const SB = S.isTouch ? 62 : 78;
  sun.shadow.camera.left = -SB; sun.shadow.camera.right = SB;
  sun.shadow.camera.top = SB; sun.shadow.camera.bottom = -SB;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);
  hemi = new THREE.HemisphereLight(0xbdd3e8, 0x66744c, 0.6);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0xc2a88e, 70, 440);

  // PMREM environment: a miniature sky-only scene, rebaked when the phase
  // segment changes. scene.environment is what reflects in water/wet paths.
  if (S.renderer) {
    pmrem = new THREE.PMREMGenerator(S.renderer);
    envScene = new THREE.Scene();
    envSkyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x38649e) }, mid: { value: new THREE.Color(0xf2b879) }, bot: { value: new THREE.Color(0x584a38) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;' +
        'void main(){ float h = normalize(vP).y; vec3 c = h > 0.05 ? mix(mid, top, smoothstep(0.05, 0.6, h)) : mix(bot, mid, smoothstep(-0.4, 0.05, h)); gl_FragColor = vec4(c, 1.0); }',
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(100, 16, 12), envSkyMat);
    envScene.add(dome);
    envSun = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc98a }));
    envScene.add(envSun);
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(95, 24),
      new THREE.MeshBasicMaterial({ color: 0x44543a }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = -4;
    envScene.add(gnd);
  }
}

function rebakeEnv(bucket, a, b, t, sunDirV) {
  if (!pmrem || S.lowQ || bucket === lastEnvBucket) return;
  lastEnvBucket = bucket;
  lerpKeyColor(envSkyMat.uniforms.top.value, a, b, t, 3);
  lerpKeyColor(envSkyMat.uniforms.mid.value, a, b, t, 4);
  envSkyMat.uniforms.bot.value.setHex(0x584a38).lerp(envSkyMat.uniforms.mid.value, 0.25);
  lerpKeyColor(envSun.material.color, a, b, t, 1);
  envSun.material.color.multiplyScalar(2.2);
  envSun.position.copy(sunDirV).multiplyScalar(82);
  const rt = pmrem.fromScene(envScene, 0.035);
  if (envRT) envRT.dispose();
  envRT = rt;
  if (S.scene) S.scene.environment = rt.texture;
}

const sunDirV = new THREE.Vector3();

// perf ladder hooks (mobile auto-drop + shot-mode lowq)
export function setSunShadows(on) { if (sun) sun.castShadow = !!on; }
export function setShadowSize(px) {
  if (!sun) return;
  sun.shadow.mapSize.set(px, px);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
}
export function updateDaycycle(dt) {
  S.timeHours = (S.timeHours + dt * 24 / DAY_LENGTH) % 24;
  const h = S.timeHours;
  window.__scurryHour = () => S.timeHours;

  let a = KEYS[0], b = KEYS[KEYS.length - 1], seg = 0;
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (h >= KEYS[i][0] && h <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; seg = i; break; }
  }
  const t = (h - a[0]) / Math.max(0.001, b[0] - a[0]);

  // sun path: rises east (+X), sets west; at night it's the moon, high and dim
  const dayFrac = ((h - 6) / 12 + 1) % 1;
  const ang = dayFrac * Math.PI;
  const isNight = h < 5.5 || h > 19.8;
  if (!isNight) sunDirV.set(Math.cos(ang), Math.max(0.25, Math.sin(ang)), 0.42).normalize();
  else sunDirV.set(-0.45, 0.85, -0.3).normalize();

  // the shadow camera rides with the squirrel (snapped to a 4m grid)
  const P = S.player && S.player.pos;
  const cx = P ? Math.round(P.x / 4) * 4 : 0, cz = P ? Math.round(P.z / 4) * 4 : 0;
  sun.position.set(cx + sunDirV.x * 300, sunDirV.y * 300, cz + sunDirV.z * 300);
  sun.target.position.set(cx, 0, cz);
  lerpKeyColor(sun.color, a, b, t, 1);
  sun.intensity = lerpKeyNum(a, b, t, 2);
  hemi.intensity = lerpKeyNum(a, b, t, 7);
  lerpKeyColor(hemi.color, a, b, t, 3);

  if (S.skyMat) {
    lerpKeyColor(S.skyMat.uniforms.top.value, a, b, t, 3);
    lerpKeyColor(S.skyMat.uniforms.mid.value, a, b, t, 4);
    lerpKeyColor(S.skyMat.uniforms.bot.value, a, b, t, 5);
    S.skyMat.uniforms.sunDir.value.copy(sunDirV);
    lerpKeyColor(S.skyMat.uniforms.sunTint.value, a, b, t, 1);
    S.skyMat.uniforms.sunAmt.value = isNight ? 0.35 : 1.0;
  }
  rebakeEnv(seg, a, b, t, sunDirV);

  if (S.scene && S.scene.fog) {
    lerpKeyColor(S.scene.fog.color, a, b, t, 6);
    S.scene.fog.near = lerpKeyNum(a, b, t, 9);
    S.scene.fog.far = lerpKeyNum(a, b, t, 10);
  }
  const lamp = lerpKeyNum(a, b, t, 8);
  for (const L of S.lamps) {
    L.sprite.material.opacity = lamp * 0.85;
    L.bulbMat.emissiveIntensity = lamp * 2.2;
    if (L.light) L.light.intensity = lamp * 16;
  }
  if (S.lampConeMat) S.lampConeMat.uniforms.uOpacity.value = lamp * 0.42;
  if (S.starMat) S.starMat.opacity = isNight ? 0.9 : Math.max(0, lamp - 0.55) * 1.4;
  if (S.cityMats) for (const m of S.cityMats) m.emissiveIntensity = 0.05 + lamp * 1.25;
  if (S.stateHouseMat) S.stateHouseMat.emissiveIntensity = lamp * 1.5;
  // clouds: tint with the sky, darken at night, drift
  if (S.cloudMat && S.skyMat) {
    S.cloudMat.color.copy(S.skyMat.uniforms.mid.value).lerp(new THREE.Color(0xffffff), 0.45);
    if (isNight) S.cloudMat.color.multiplyScalar(0.32);
    S.cloudMat.opacity = isNight ? 0.3 : 0.5;
  }
  if (S.clouds) for (const c of S.clouds) {
    c.sp.position.x += c.speed * dt;
    if (c.sp.position.x > 820) c.sp.position.x = -820;
  }
  // boats bob, water shimmers
  const now = performance.now() / 1000;
  if (S.boats) for (const boat of S.boats) {
    boat.position.y = 0.05 + Math.sin(now * 0.7 + boat.userData.bobPhase) * 0.05;
    boat.rotation.z = Math.sin(now * 0.5 + boat.userData.bobPhase) * 0.012;
  }
  return lamp;
}

export function phaseName(h) {
  if (h < 5) return 'deep night';
  if (h < 6.5) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 17) return 'afternoon';
  if (h < 18.8) return 'golden hour';
  if (h < 19.8) return 'dusk';
  return 'night';
}
export function clockString(h) {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
