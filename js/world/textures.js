// SCURRY - procedural canvas textures. Everything here is generated in code
// at load: no image assets, no AI imagery. Shared by world/trees/landmarks/props.

import * as THREE from 'three';

function canvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return [cv, cv.getContext('2d')];
}
function toTex(cv, srgb = true) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// deterministic rng for textures (same park every load)
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// --- tiling micro-detail for the ground (blended by world pos in world.js) ---
export function groundDetailTex() {
  const [cv, g] = canvas(256, 256);
  const R = rng(4242);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const v = 96 + (R() * 64) | 0;
    g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    g.fillRect(R() * 256, R() * 256, 1.6, 1.6 + R() * 2.4);
  }
  for (let i = 0; i < 260; i++) { // blade strokes
    const v = 120 + (R() * 70) | 0;
    g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.7)';
    const x = R() * 256, y = R() * 256;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - 3 - R() * 4); g.stroke();
  }
  const t = toTex(cv, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- bark: vertical streaky plates ---
export function barkTex() {
  const [cv, g] = canvas(256, 256);
  const R = rng(777);
  g.fillStyle = '#5d4630'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 3) {
    const v = R();
    g.fillStyle = v < 0.5 ? 'rgba(30,20,12,0.35)' : 'rgba(140,115,84,0.28)';
    const w = 2 + R() * 7;
    g.fillRect(x, 0, w, 256);
  }
  for (let i = 0; i < 380; i++) { // cracks + knots
    g.fillStyle = 'rgba(22,14,8,' + (0.25 + R() * 0.4) + ')';
    const x = R() * 256, y = R() * 256;
    g.fillRect(x, y, 1.4 + R() * 2, 6 + R() * 26);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(150,128,96,0.5)';
    g.fillRect(R() * 256, R() * 256, 2, 3 + R() * 8);
  }
  const t = toTex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- leaf-cluster texture for canopy blobs (light sage base, tinted by material color) ---
export function leafTex() {
  const [cv, g] = canvas(256, 256);
  const R = rng(2024);
  g.fillStyle = '#b9c4a4'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    const l = R();
    const grn = 120 + (R() * 90) | 0;
    g.fillStyle = 'rgba(' + (grn * 0.62) | 0 + ',' + grn + ',' + (grn * 0.45) | 0 + ',0.85)';
    const x = R() * 256, y = R() * 256, r = 3 + R() * 6.5;
    g.beginPath(); g.ellipse(x, y, r, r * 0.62, R() * 3, 0, 7); g.fill();
    if (l < 0.24) { // sunlit tips
      g.fillStyle = 'rgba(226,236,180,0.5)';
      g.beginPath(); g.ellipse(x, y - 1.5, r * 0.6, r * 0.36, 0, 0, 7); g.fill();
    }
  }
  const t = toTex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- granite speckle ---
export function graniteTex() {
  const [cv, g] = canvas(256, 256);
  const R = rng(99);
  g.fillStyle = '#a09a8e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    const v = R();
    g.fillStyle = v < 0.4 ? 'rgba(52,50,46,0.5)' : (v < 0.75 ? 'rgba(210,204,192,0.5)' : 'rgba(140,134,122,0.55)');
    g.fillRect(R() * 256, R() * 256, 1.5, 1.5);
  }
  const t = toTex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- wood planks (bench slats) ---
export function plankTex() {
  const [cv, g] = canvas(256, 128);
  const R = rng(55);
  g.fillStyle = '#6b4e33'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 340; i++) {
    g.strokeStyle = 'rgba(' + (30 + R() * 40) + ',20,10,' + (0.12 + R() * 0.22) + ')';
    const y = R() * 128;
    g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(80, y + (R() - 0.5) * 4, 170, y + (R() - 0.5) * 4, 256, y);
    g.stroke();
  }
  for (let i = 0; i < 12; i++) {
    g.fillStyle = 'rgba(46,30,16,0.6)';
    g.beginPath(); g.ellipse(R() * 256, R() * 128, 3.5, 2, 0, 0, 7); g.fill();
  }
  const t = toTex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- State House facade: brick courses + window grid (front face reads correctly) ---
// Returns { map, emissiveMap } sharing window positions; windows glow at dusk.
export function stateHouseFacade() {
  const W = 1024, H = 256;
  const [cv, g] = canvas(W, H);
  const [ev, e] = canvas(W, H);
  const R = rng(31);
  g.fillStyle = '#8a4a38'; g.fillRect(0, 0, W, H);
  // brick courses
  for (let y = 0; y < H; y += 7) {
    g.fillStyle = 'rgba(40,16,10,0.35)'; g.fillRect(0, y, W, 1.4);
    for (let x = ((y / 7) % 2) * 14; x < W; x += 28) {
      g.fillStyle = 'rgba(255,190,150,0.07)'; g.fillRect(x, y, 26, 5.4);
      g.fillStyle = 'rgba(40,16,10,0.3)'; g.fillRect(x, y, 1.2, 7);
    }
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = 'rgba(' + (60 + R() * 60) + ',26,16,' + (R() * 0.16) + ')';
    g.fillRect(R() * W, R() * H, 5, 3);
  }
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  // two rows of tall windows with white trim
  for (const wy of [52, 152]) {
    for (let i = 0; i < 13; i++) {
      const x = 36 + i * 76;
      g.fillStyle = '#e9e6dd'; g.fillRect(x - 4, wy - 5, 40, 76);
      g.fillStyle = '#232c38'; g.fillRect(x, wy, 32, 66);
      g.fillStyle = 'rgba(190,214,235,0.5)'; g.fillRect(x + 3, wy + 4, 12, 26);
      g.fillStyle = '#e9e6dd'; g.fillRect(x + 14, wy, 3, 66); g.fillRect(x, wy + 31, 32, 3);
      if (R() < 0.55) { e.fillStyle = 'rgba(255,190,110,0.95)'; e.fillRect(x + 2, wy + 2, 28, 62); }
    }
  }
  return { map: toTex(cv), emissiveMap: toTex(ev, false) };
}

// --- generic city facade + lit-windows emissive pair ---
export function cityFacade(seed, base) {
  const W = 256, H = 512;
  const [cv, g] = canvas(W, H);
  const [ev, e] = canvas(W, H);
  const R = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = 'rgba(0,0,0,' + R() * 0.14 + ')';
    g.fillRect(R() * W, R() * H, 4, 4);
  }
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const cols = 7, rows = 16;
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      const x = 14 + cx * 34, y = 16 + ry * 30;
      g.fillStyle = '#20242c'; g.fillRect(x, y, 18, 20);
      g.fillStyle = 'rgba(170,200,225,0.28)'; g.fillRect(x + 2, y + 2, 7, 8);
      if (R() < 0.34) {
        e.fillStyle = R() < 0.8 ? 'rgba(255,196,110,1)' : 'rgba(190,214,255,1)';
        e.fillRect(x + 1, y + 1, 16, 18);
      }
    }
  }
  const map = toTex(cv), emissiveMap = toTex(ev, false);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
  return { map, emissiveMap };
}

// --- grass blades alpha texture for instanced tufts ---
export function grassBladeTex() {
  const [cv, g] = canvas(128, 128);
  const R = rng(808);
  g.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 30; i++) {
    const x = 8 + R() * 112, bend = (R() - 0.5) * 26, h = 74 + R() * 52;
    const grn = 96 + (R() * 70) | 0;
    g.fillStyle = 'rgb(' + (grn * 0.55) | 0 + ',' + grn + ',' + (grn * 0.4) | 0 + ')';
    g.beginPath();
    g.moveTo(x - 3.2, 128);
    g.quadraticCurveTo(x - 1 + bend * 0.4, 128 - h * 0.6, x + bend, 128 - h);
    g.quadraticCurveTo(x + 1 + bend * 0.4, 128 - h * 0.6, x + 3.2, 128);
    g.closePath(); g.fill();
  }
  const t = toTex(cv);
  return t;
}

// --- soft cloud puff sprite ---
export function cloudTex() {
  const [cv, g] = canvas(256, 128);
  const R = rng(606);
  for (let i = 0; i < 46; i++) {
    const x = 30 + R() * 196, y = 44 + R() * 44, r = 16 + R() * 30;
    const grad = g.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.16)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return toTex(cv);
}

// --- lamp halo sprite (shared with props) ---
export function glowTex() {
  const [cv, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,214,150,0.9)');
  grad.addColorStop(0.32, 'rgba(255,182,92,0.30)');
  grad.addColorStop(1, 'rgba(255,170,80,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return toTex(cv);
}
