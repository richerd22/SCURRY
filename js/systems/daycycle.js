// SCURRY - day cycle: golden hour -> dusk -> night -> dawn, on a slow loop.
// Drives the sun (shadow camera follows the squirrel), sky gradient + sun
// disc, layered fog ranges, a PMREM environment rebuilt per phase (that's
// what makes the wet paths and ponds shine), lamp glow + light cones,
// city windows, the State House windows, clouds, and water shimmer.

import * as THREE from 'three';
import { S, MAP } from '../state.js';

const DAY_LENGTH = 780; // seconds per full day (13 min) - a long golden evening

const KEYS = [
  // hour, sunColor, sunI, sky top/mid/bot, fogColor, amb, lamp 0..1, fogNear, fogFar
  // grade pass (v0.3): amb is lifted at dawn/golden/dusk/night so the ground
  // stays readable at squirrel height; midday sun is trimmed a touch so the
  // exposure lift elsewhere does not blow the highlights out.
  // v0.6.28: golden keys' amb lifted a step further (1.12->1.24, 1.02->1.10) -
  // the sky read amber but the lawn stayed murk in the 17:00-18:30 checks.
  [0.0,  0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.3, 1,    26, 230],
  [5.0,  0x8fa8d8, 0.25, 0x0a1428, 0x1c2440, 0x2a2438, 0x161c30, 0.3, 1,    26, 230],
  [6.5,  0xffb37a, 0.9,  0x3a5a8c, 0xe8906a, 0xf7cf9a, 0x8a7a72, 0.62, 0.25,  55, 380],
  [9.0,  0xfff2d8, 1.55, 0x3a6ea8, 0x9fc4e8, 0xd8ecf7, 0xaec6d8, 0.75, 0,   95, 560],
  [16.0, 0xffeec9, 1.48, 0x3a6ea8, 0xa8c8e8, 0xe4eef2, 0xb2c4d2, 0.78, 0,   90, 540],
  [17.6, 0xffc98a, 1.5,  0x38649e, 0xf2b879, 0xf7d9a8, 0xc2a88e, 1.24, 0,   70, 440],
  [18.7, 0xff9a56, 1.3,  0x2c4a78, 0xe87f52, 0xf2b879, 0xa88472, 1.10, 0.55, 48, 320],
  [19.6, 0x7a86c8, 0.5,  0x141f42, 0x4a4470, 0x8a5a68, 0x4a4054, 0.68, 1,   32, 250],
  [21.0, 0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.3, 1,   26, 230],
  [24.0, 0x8fa8d8, 0.25, 0x0a1428, 0x1a2440, 0x232030, 0x141a2c, 0.3, 1,   26, 230],
];

const cA = new THREE.Color(), cB = new THREE.Color();
function lerpKeyColor(out, a, b, t, idx) {
  cA.setHex(a[idx]); cB.setHex(b[idx]);
  out.copy(cA).lerp(cB, t);
}
function lerpKeyNum(a, b, t, idx) { return a[idx] + (b[idx] - a[idx]) * t; }

let sun, hemi;
let pmrem = null, envScene = null, envSkyMat = null, envSun = null, envRT = null, lastEnvBucket = -99;
let envGndMat = null;
// grade temps (module-scope, reused - no per-frame allocation)
const hemiMid = new THREE.Color();
// water-volume temps (v0.6.28): the two wadeable bodies + their plane
// heights (world.js builds the meshes at these y), the murk colour,
// the eased submersion factor, and the tint element (built lazily).
const WATER_BODIES = [[MAP.lagoon, 0.02], [MAP.frogPond, 0.06]];
const SUBMERGE_FOG = new THREE.Color(0x14424e);
let submergeK = 0;
let waterTintEl = null;
const grassBounce = new THREE.Color(0x66744c);
const envGrass = new THREE.Color(0x4d7c3a);
const lampWarm = new THREE.Color(0xff9a4d);

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
    envGndMat = new THREE.MeshBasicMaterial({ color: 0x4d7c3a });
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(95, 24), envGndMat);
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = -4;
    envScene.add(gnd);
  }
}

function rebakeEnv(bucket, a, b, t, sunDirV) {
  if (!pmrem || S.lowQ || bucket === lastEnvBucket) return;
  lastEnvBucket = bucket;
  lerpKeyColor(envSkyMat.uniforms.top.value, a, b, t, 3);
  envSkyMat.uniforms.top.value.multiplyScalar(1.1);
  lerpKeyColor(envSkyMat.uniforms.mid.value, a, b, t, 4);
  // horizon band carries the reflections (water, wet paths graze it), so it
  // bakes hot - this is what stops the ponds reading black at dusk
  envSkyMat.uniforms.mid.value.multiplyScalar(1.35);
  // below-horizon band follows the keyed horizon colour instead of a fixed
  // dark brown, so steep-angle reflections stay warm too
  lerpKeyColor(envSkyMat.uniforms.bot.value, a, b, t, 5);
  envSkyMat.uniforms.bot.value.multiplyScalar(0.85);
  // env ground disc: grass warmed by the horizon, scaled by sun strength -
  // the bounce half of the envmap, previously a fixed dark green
  if (envGndMat) {
    envGndMat.color.copy(envGrass).lerp(envSkyMat.uniforms.mid.value, 0.35)
      .multiplyScalar(0.75 + lerpKeyNum(a, b, t, 2) * 0.4);
  }
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
  // grade: blend the hemisphere sky colour halfway toward the horizon (mid)
  // colour - at golden hour the ambient stops being deep blue and turns
  // amber, which is what lifts the ground out of the murk; at midday the
  // horizon is pale blue so the blend is near-neutral there.
  lerpKeyColor(hemiMid, a, b, t, 4);
  hemi.color.lerp(hemiMid, 0.5);
  // ground bounce follows the sun tint instead of a fixed grey-green
  hemi.groundColor.copy(grassBounce).lerp(sun.color, 0.3);

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
  S.lampFactor = lamp; // shared so far-flung places (Fenway) can burn their own lamps
  // water grade: a faint emissive sheen keyed to the horizon colour, warmed
  // toward lamp-orange as the lamps come up. The PMREM reflection does the
  // sky; this guarantees the pond/lagoon never reads as a black mirror at
  // dusk/night and picks up a lamp glint after dark.
  if (S.waterMat) {
    S.waterMat.emissive.copy(hemiMid).lerp(lampWarm, lamp * 0.45);
    S.waterMat.emissiveIntensity = 0.22 + lamp * 0.2;
  }
  // grass tuft floor (v0.6.1): at low sun the tuft cards' unlit faces went
  // black against the lawn. Their emissive (textured by the blade map, set
  // in trees.js) rides the same horizon colour as the water sheen, warmed
  // by the lamps after dark - a floor, not a glow: 0.3 keeps midday
  // unchanged to the eye while golden hour keeps its blade detail.
  if (S.tuftMat) {
    S.tuftMat.emissive.copy(hemiMid).lerp(lampWarm, lamp * 0.35);
    S.tuftMat.emissiveIntensity = 0.3;
  }
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
  // boats bob, water shimmers; swan boats also drift their lagoon loops
  const now = performance.now() / 1000;
  if (S.boats) for (const boat of S.boats) {
    const d = boat.userData.drift;
    if (d) {
      const th = d.ph + now * d.w;
      boat.position.x = d.cx + d.rx * Math.cos(th);
      boat.position.z = d.cz + d.rz * Math.sin(th);
      const vx = -d.rx * Math.sin(th) * d.w, vz = d.rz * Math.cos(th) * d.w;
      boat.rotation.y = (d.yaw !== undefined) ? d.yaw : Math.atan2(-vx, -vz);
    }
    boat.position.y = 0.05 + Math.sin(now * 0.7 + boat.userData.bobPhase) * 0.05;
    boat.rotation.z = Math.sin(now * 0.5 + boat.userData.bobPhase) * 0.012;
  }
  // fountain falls (v0.6.28): scroll the ONE flow texture. On the fall
  // cylinders uv.y runs 0 at the bottom to 1 at the rim, so a growing
  // offset walks every streak DOWN the fall. Offset only - the geometry
  // never moves.
  if (S.fountainFlowTex) S.fountainFlowTex.offset.y = (now * 0.85) % 1;
  // fountain foam (v0.6.31): the rings where the falls land breathe.
  // Two slow incommensurate sines on the ONE foam material's opacity
  // (registered in landmarks.js) - the foam brightens and settles
  // like churn under the animated falls instead of sitting as a
  // static decal. Amplitude kept small: a pulse, not a blink.
  if (S.fountainFoamMat) {
    const fp = 0.5 + 0.5 * Math.sin(now * 2.3) * Math.sin(now * 0.77 + 1.3);
    S.fountainFoamMat.opacity = 0.33 + 0.15 * fp;
  }
  // pond surface (v0.6.31): the water's roughness breathes a hair
  // (0.13 +- 0.018 on a ~9 s beat) - the sky reflection's lobe
  // widens and tightens almost imperceptibly, which in motion
  // reads as a live surface instead of a fixed mirror. Deliberately
  // NOT a texture scroll: the water discs' UVs are radial, so an
  // offset would swirl the surface like a drain, and a world-space
  // detail map would have to ride the shared material into every
  // destination's water too. Value-only, like the foam.
  if (S.waterMat) S.waterMat.roughness = 0.13 + 0.018 * Math.sin(now * 0.7) * Math.sin(now * 0.23 + 0.8);
  // water volume (v0.6.28): when the eye dips under a pond/lagoon plane,
  // lay the murk on - fog pulled in and re-tealed, plus a flat tint
  // (z 2: over the canvas, under the HUD). Eased both ways so wading
  // the shoreline doesn't strobe. The surface itself is double-sided
  // (world.js), so from inside you see its underside, not through it.
  {
    const P = S.player;
    const eyeY = P.pos.y + 0.25;
    let under = 0;
    // destination zones (v0.6.30: the Esplanade's Charles River)
    // register their own water bodies in S.waterBodiesExtra -
    // same [ellipse, planeY] shape as WATER_BODIES.
    const bodies = S.waterBodiesExtra && S.waterBodiesExtra.length
      ? WATER_BODIES.concat(S.waterBodiesExtra) : WATER_BODIES;
    for (const [e, wy] of bodies) {
      const dx = (P.pos.x - e.x) / e.rx, dz = (P.pos.z - e.z) / e.rz;
      if (dx * dx + dz * dz < 1 && eyeY < wy) { under = 1; break; }
    }
    submergeK += ((under ? 1 : 0) - submergeK) * Math.min(1, dt * 6);
    if (submergeK < 0.004) submergeK = under ? submergeK : 0;
    if (S.scene && S.scene.fog) {
      if (submergeK > 0) {
        S.scene.fog.color.lerp(SUBMERGE_FOG, submergeK);
        S.scene.fog.near += (1.2 - S.scene.fog.near) * submergeK;
        S.scene.fog.far += (30 - S.scene.fog.far) * submergeK;
      }
      if (!waterTintEl) {
        waterTintEl = document.createElement('div');
        waterTintEl.style.cssText = 'position:fixed;inset:0;background:#0d3742;opacity:0;pointer-events:none;z-index:2;';
        document.body.appendChild(waterTintEl);
      }
      waterTintEl.style.opacity = (submergeK * 0.3).toFixed(3);
    }
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
