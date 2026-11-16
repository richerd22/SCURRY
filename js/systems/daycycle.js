// SCURRY - day cycle: golden hour -> dusk -> night -> dawn, on a slow loop.
// Drives the sun, sky gradient, fog, lamp glow, city windows, water shimmer.

import * as THREE from 'three';
import { S } from '../state.js';

const DAY_LENGTH = 780; // seconds per full day (13 min) - a long golden evening

const KEYS = [
  // hour, sunColor, sunI, sky top/mid/bot, fog, amb (hemisphere) intensity, lamp 0..1
  [0.0,  0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.22, 1],
  [5.0,  0x8fa8d8, 0.25, 0x0a1428, 0x1c2440, 0x2a2438, 0x161c30, 0.22, 1],
  [6.5,  0xffb37a, 0.9,  0x3a5a8c, 0xe8906a, 0xf7cf9a, 0x8a7a72, 0.5, 0.25],
  [9.0,  0xfff2d8, 1.65, 0x3a6ea8, 0x9fc4e8, 0xd8ecf7, 0xaec6d8, 0.75, 0],
  [16.0, 0xffeec9, 1.55, 0x3a6ea8, 0xa8c8e8, 0xe4eef2, 0xb2c4d2, 0.72, 0],
  [17.6, 0xffc98a, 1.35, 0x38649e, 0xf2b879, 0xf7d9a8, 0xc2a88e, 0.62, 0],
  [18.7, 0xff9a56, 0.95, 0x2c4a78, 0xe87f52, 0xf2b879, 0x9a7a6e, 0.48, 0.55],
  [19.6, 0x7a86c8, 0.4,  0x141f42, 0x4a4470, 0x8a5a68, 0x3c3448, 0.3, 1],
  [21.0, 0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.22, 1],
  [24.0, 0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.22, 1],
];

const cA = new THREE.Color(), cB = new THREE.Color();
function lerpKeyColor(out, a, b, t, idx) {
  cA.setHex(a[idx]); cB.setHex(b[idx]);
  out.copy(cA).lerp(cB, t);
}

let sun, hemi;
export function initDaycycle(scene) {
  sun = new THREE.DirectionalLight(0xffc98a, 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);
  hemi = new THREE.HemisphereLight(0xbdd3e8, 0x4a5a38, 0.6);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0xc2a88e, 60, 420);
}

export function updateDaycycle(dt) {
  S.timeHours = (S.timeHours + dt * 24 / DAY_LENGTH) % 24;
  const h = S.timeHours;
  window.__scurryHour = () => S.timeHours;

  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (h >= KEYS[i][0] && h <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const t = (h - a[0]) / Math.max(0.001, b[0] - a[0]);

  // sun position: rises east (+X), sets west; at night it's the moon, high and dim
  const dayFrac = ((h - 6) / 12 + 1) % 1; // 0 at 6am, 0.5 at noon... wraps
  const ang = dayFrac * Math.PI;
  const isNight = h < 5.5 || h > 19.8;
  if (!isNight) {
    sun.position.set(Math.cos(ang) * 260, Math.max(18, Math.sin(ang) * 240), 120);
  } else {
    sun.position.set(-140, 260, -90);
  }
  sun.target.position.set(0, 0, 0);
  lerpKeyColor(sun.color, a, b, t, 1);
  sun.intensity = a[2] + (b[2] - a[2]) * t;
  hemi.intensity = a[7] + (b[7] - a[7]) * t;

  if (S.skyMat) {
    lerpKeyColor(S.skyMat.uniforms.top.value, a, b, t, 3);
    lerpKeyColor(S.skyMat.uniforms.mid.value, a, b, t, 4);
    lerpKeyColor(S.skyMat.uniforms.bot.value, a, b, t, 5);
  }
  if (S.scene && S.scene.fog) lerpKeyColor(S.scene.fog.color, a, b, t, 6);
  const lamp = a[8] + (b[8] - a[8]) * t;
  for (const L of S.lamps) {
    L.sprite.material.opacity = lamp * 0.85;
    L.bulbMat.emissiveIntensity = lamp * 2.2;
    if (L.light) L.light.intensity = lamp * 16;
  }
  if (S.starMat) S.starMat.opacity = isNight ? 0.9 : Math.max(0, lamp - 0.55) * 1.4;
  if (S.cityWinMat) S.cityWinMat.emissiveIntensity = lamp * 0.75;
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
