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
  // three rows of tall windows with white trim (v0.6.27: was two rows
  // stretched over the block's 13 m - the Bulfinch front has three
  // floors, and at Common distance the extra floor line is what makes
  // the front read as a state house instead of a warehouse)
  for (const wy of [16, 94, 172]) {
    for (let i = 0; i < 13; i++) {
      const x = 36 + i * 76;
      g.fillStyle = '#e9e6dd'; g.fillRect(x - 4, wy - 5, 40, 70);
      g.fillStyle = '#232c38'; g.fillRect(x, wy, 32, 60);
      g.fillStyle = 'rgba(190,214,235,0.5)'; g.fillRect(x + 3, wy + 4, 12, 24);
      g.fillStyle = '#e9e6dd'; g.fillRect(x + 14, wy, 3, 60); g.fillRect(x, wy + 28, 32, 3);
      if (R() < 0.55) { e.fillStyle = 'rgba(255,190,110,0.95)'; e.fillRect(x + 2, wy + 2, 28, 56); }
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

// --- State House dome drum: white drum, arched windows all around ---
export function drumTex() {
  const [cv, g] = canvas(512, 128);
  const R = rng(77);
  g.fillStyle = '#e6e2d8'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = 'rgba(120,112,96,' + R() * 0.12 + ')';
    g.fillRect(R() * 512, R() * 128, 3, 3);
  }
  for (let i = 0; i < 8; i++) {
    const x = 16 + i * 64;
    g.fillStyle = '#f7f4ec';
    g.beginPath();
    g.moveTo(x - 4, 112); g.lineTo(x - 4, 34); g.arc(x + 16, 34, 20, Math.PI, 0); g.lineTo(x + 36, 112); g.closePath(); g.fill();
    g.fillStyle = '#26303c';
    g.beginPath();
    g.moveTo(x, 108); g.lineTo(x, 36); g.arc(x + 16, 36, 16, Math.PI, 0); g.lineTo(x + 32, 108); g.closePath(); g.fill();
    g.fillStyle = 'rgba(190,214,235,0.45)'; g.fillRect(x + 4, 44, 10, 30);
    g.fillStyle = '#f7f4ec'; g.fillRect(x + 14, 36, 3, 72);
  }
  const t = toTex(cv);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// --- State House ground-floor arcade: dark arched openings on the plinth ---
export function arcadeTex() {
  const [cv, g] = canvas(1024, 64);
  const R = rng(41);
  g.fillStyle = '#e9e6dd'; g.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = 'rgba(120,112,96,' + R() * 0.1 + ')';
    g.fillRect(R() * 1024, R() * 64, 3, 2);
  }
  for (let i = 0; i < 11; i++) {
    const x = 26 + i * 92, w = 42;
    g.fillStyle = '#221a15';
    g.beginPath();
    g.moveTo(x, 64); g.lineTo(x, 28); g.arc(x + w / 2, 28, w / 2, Math.PI, 0); g.lineTo(x + w, 64); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 6, 42, w - 12, 22);
    g.fillStyle = 'rgba(214,190,150,0.25)'; g.fillRect(x + 4, 30, 3, 30);
    g.fillStyle = '#f4f1e8'; g.fillRect(x + w / 2 - 4, 1, 8, 11); // keystone
  }
  return toTex(cv);
}

// --- fluted column shading: soft vertical light/shadow bands over granite ---
export function fluteTex() {
  const [cv, g] = canvas(256, 256);
  const R = rng(63);
  g.fillStyle = '#a8a294'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x++) {
    const s = Math.sin((x / 256) * 20 * Math.PI * 2);
    g.fillStyle = s > 0 ? 'rgba(255,252,240,' + (s * 0.16) + ')' : 'rgba(30,28,24,' + (-s * 0.22) + ')';
    g.fillRect(x, 0, 1, 256);
  }
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = 'rgba(60,56,48,' + R() * 0.16 + ')';
    g.fillRect(R() * 256, R() * 256, 1.6, 1.6);
  }
  const t = toTex(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- bronze relief panel: dark bronze with raised shield + laurel hints ---
export function reliefTex() {
  const [cv, g] = canvas(256, 128);
  const R = rng(18);
  g.fillStyle = '#4c3a20'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = 'rgba(' + (140 + R() * 60) + ',' + (105 + R() * 40) + ',50,' + R() * 0.13 + ')';
    g.fillRect(R() * 256, R() * 128, 2.4, 2.4);
  }
  g.strokeStyle = 'rgba(226,196,130,0.85)'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(128, 62, 30, 38, 0, 0, 7); g.stroke();
  g.beginPath(); g.ellipse(128, 62, 20, 28, 0, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(128, 34); g.lineTo(128, 92); g.stroke();
  for (const s of [-1, 1]) { // laurel sprays
    g.lineWidth = 2;
    g.beginPath();
    g.arc(128 + s * 58, 66, 30, s > 0 ? 2.2 : -0.9, s > 0 ? 4.1 : 0.95);
    g.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (s > 0 ? 2.4 : -0.7) + i * 0.28 * s;
      g.beginPath();
      g.ellipse(128 + s * 58 + Math.cos(a) * 30, 66 + Math.sin(a) * 30, 5, 2.4, a, 0, 7);
      g.fillStyle = 'rgba(226,196,130,0.7)'; g.fill();
    }
  }
  g.strokeStyle = 'rgba(226,196,130,0.6)'; g.lineWidth = 2.4;
  g.strokeRect(7, 7, 242, 114);
  return toTex(cv);
}

// --- Hancock-style glass facade: tight uniform mirror grid, blue-grey ---
export function glassFacade(seed) {
  const W = 256, H = 512;
  const [cv, g] = canvas(W, H);
  const [ev, e] = canvas(W, H);
  const R = rng(seed);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#54687c'); grad.addColorStop(0.5, '#3d4f63'); grad.addColorStop(1, '#4a5e73');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const cols = 9, rows = 26;
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      const x = 8 + cx * 27, y = 8 + ry * 19;
      g.fillStyle = 'rgba(190,216,238,' + (0.12 + R() * 0.3) + ')';
      g.fillRect(x, y, 22, 14);
      if (R() < 0.16) {
        e.fillStyle = R() < 0.75 ? 'rgba(255,196,110,1)' : 'rgba(190,214,255,1)';
        e.fillRect(x + 1, y + 1, 20, 12);
      }
    }
  }
  const map = toTex(cv), emissiveMap = toTex(ev, false);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
  return { map, emissiveMap };
}

// --- clock face for the Custom House-style tower ---
export function clockTex() {
  const [cv, g] = canvas(128, 128);
  g.fillStyle = '#20242a'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ece7da';
  g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill();
  g.strokeStyle = '#20242a'; g.lineWidth = 4;
  g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.lineWidth = i % 3 === 0 ? 5 : 2.4;
    g.beginPath();
    g.moveTo(64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42);
    g.lineTo(64 + Math.cos(a) * 49, 64 + Math.sin(a) * 49);
    g.stroke();
  }
  g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 26, 64 + 18); g.stroke(); // hour ~4:35
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 8, 64 - 38); g.stroke();
  g.fillStyle = '#20242a';
  g.beginPath(); g.arc(64, 64, 5, 0, 7); g.fill();
  return toTex(cv);
}

// --- Beacon St brownstone: 8 m wide x 13 m tall unit, 3 bays x 4 floors ---
// Parlor floor is the tall one at the bottom (raised over a basement strip);
// flat fronts wear this texture, bow fronts wear plain stone + glass boxes.
export function brownstoneFacade(seed, base) {
  const W = 256, H = 512;
  const [cv, g] = canvas(W, H);
  const [ev, e] = canvas(W, H);
  const R = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2400; i++) { // stone grain + weathering streaks
    g.fillStyle = 'rgba(0,0,0,' + R() * 0.13 + ')';
    g.fillRect(R() * W, R() * H, 3.4, 3.4);
    if (R() < 0.3) { g.fillStyle = 'rgba(255,235,205,' + R() * 0.06 + ')'; g.fillRect(R() * W, R() * H, 2.4, 9 + R() * 22); }
  }
  // ashlar course lines
  g.fillStyle = 'rgba(30,18,10,0.28)';
  for (let y = 24; y < H; y += 26) g.fillRect(0, y, W, 1.6);
  // floor band courses (stone stringers, kept close to the base tone -
  // bright bands made the whole row read cream instead of brownstone)
  g.fillStyle = 'rgba(226,210,182,0.5)';
  for (const y of [118, 228, 338]) g.fillRect(0, y, W, 5);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 123, W, 2.4);
  // basement strip at the very bottom (darker, small square windows)
  g.fillStyle = 'rgba(20,12,8,0.4)'; g.fillRect(0, 486, W, 26);
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const cols = [26, 102, 178], winW = 52;
  const rows = [[30, 76], [140, 76], [250, 76], [360, 108]]; // [y, h], parlor last
  for (const [wy, wh] of rows) {
    for (const x of cols) {
      // lintel + sill in trim stone (thin - brownstone trim is a frame,
      // not a panel; a fat near-white frame washed the row out)
      g.fillStyle = '#cbbc9e'; g.fillRect(x - 4, wy - 8, winW + 8, 7);
      g.fillRect(x - 3, wy + wh + 1, winW + 6, 5);
      g.fillStyle = '#d8cfb8'; g.fillRect(x - 1.5, wy - 1.5, winW + 3, wh + 3);
      g.fillStyle = '#222a34'; g.fillRect(x, wy, winW, wh);
      g.fillStyle = 'rgba(178,206,230,0.4)'; g.fillRect(x + 4, wy + 5, 15, wh * 0.42);
      g.fillStyle = '#efe9da'; g.fillRect(x + winW / 2 - 1.6, wy, 3.2, wh); // mullion
      g.fillRect(x, wy + wh * 0.46, winW, 3); // sash bar
      if (R() < 0.38) {
        e.fillStyle = R() < 0.82 ? 'rgba(255,196,110,1)' : 'rgba(190,214,255,1)';
        e.fillRect(x + 2, wy + 2, winW - 4, wh - 4);
      }
    }
  }
  const map = toTex(cv), emissiveMap = toTex(ev, false);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
  return { map, emissiveMap };
}

// --- Charles St storefront: 6.2 m wide x 7.8 m tall shop unit ---
// One brick floor over a sign band over a glass shopfront. The shopfront
// emissive is near-always lit: shops glow onto the street at dusk.
export function storefrontFacade(seed, base, band) {
  const W = 256, H = 320;
  const [cv, g] = canvas(W, H);
  const [ev, e] = canvas(W, H);
  const R = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = 'rgba(0,0,0,' + R() * 0.13 + ')';
    g.fillRect(R() * W, R() * H, 3, 3);
  }
  g.fillStyle = 'rgba(30,16,10,0.3)';
  for (let y = 14; y < 128; y += 15) g.fillRect(0, y, W, 1.3); // brick courses, upper floor
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  // upper windows: 4 double-hung with trim
  for (let i = 0; i < 4; i++) {
    const x = 14 + i * 60, wy = 26, ww = 42, wh = 82;
    g.fillStyle = '#ddd3bf'; g.fillRect(x - 3, wy - 6, ww + 6, 6);
    g.fillStyle = '#e8e2d2'; g.fillRect(x - 2, wy - 2, ww + 4, wh + 4);
    g.fillStyle = '#232b36'; g.fillRect(x, wy, ww, wh);
    g.fillStyle = 'rgba(178,206,230,0.38)'; g.fillRect(x + 3, wy + 4, 12, 34);
    g.fillStyle = '#e8e2d2'; g.fillRect(x + ww / 2 - 1.5, wy, 3, wh); g.fillRect(x, wy + wh * 0.48, ww, 3);
    if (R() < 0.32) { e.fillStyle = 'rgba(255,196,110,1)'; e.fillRect(x + 2, wy + 2, ww - 4, wh - 4); }
  }
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 120, W, 3);
  // sign band: deep colour + pale blocks suggesting lettering (no words)
  g.fillStyle = band; g.fillRect(0, 126, W, 38);
  g.fillStyle = 'rgba(240,230,205,0.9)';
  let lx = 18 + R() * 10;
  while (lx < W - 26) { const lw = 7 + R() * 13; g.fillRect(lx, 138, lw, 13); lx += lw + 6 + R() * 7; }
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 164, W, 3);
  // shopfront: three glass panes + a door, dark iron framing
  g.fillStyle = '#191c20'; g.fillRect(6, 170, W - 12, 128);
  for (let i = 0; i < 3; i++) {
    const x = 12 + i * 56;
    g.fillStyle = '#2c3844'; g.fillRect(x, 176, 48, 104);
    g.fillStyle = 'rgba(190,216,235,0.3)'; g.fillRect(x + 4, 182, 14, 44);
    if (R() < 0.88) { e.fillStyle = R() < 0.85 ? 'rgba(255,198,118,1)' : 'rgba(205,225,255,1)'; e.fillRect(x + 2, 178, 44, 100); }
  }
  const dx = 186;
  g.fillStyle = '#23262b'; g.fillRect(dx, 176, 52, 122);
  g.fillStyle = '#33404c'; g.fillRect(dx + 7, 184, 38, 62);
  if (R() < 0.8) { e.fillStyle = 'rgba(255,198,118,0.9)'; e.fillRect(dx + 9, 186, 34, 58); }
  g.fillStyle = '#c8b490'; g.fillRect(dx + 42, 240, 5, 5); // knob
  g.fillStyle = '#101216'; g.fillRect(0, 298, W, 22); // bulkhead
  const map = toTex(cv), emissiveMap = toTex(ev, false);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
  return { map, emissiveMap };
}

// --- Tremont St downtown unit: 11 m wide x ~19 m tall ---
// Storefront at street level (tall glass under a sign band), five office
// floors of stone-pier grid above, dentil cornice at the top. One texture
// per whole unit - the downtown edge reads at park distance, so the
// storefront glow + pier rhythm do the work.
export function tremontFacade(seed, base) {
  const W = 256, H = 512;
  const [cv, g] = canvas(W, H);
  const [ev, e] = canvas(W, H);
  const R = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = 'rgba(0,0,0,' + R() * 0.13 + ')';
    g.fillRect(R() * W, R() * H, 3.2, 3.2);
    if (R() < 0.22) { g.fillStyle = 'rgba(255,238,210,' + R() * 0.05 + ')'; g.fillRect(R() * W, R() * H, 2.2, 8 + R() * 18); }
  }
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  // cornice band + dentils
  g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(0, 0, W, 27);
  g.fillStyle = 'rgba(232,220,192,0.5)';
  for (let x = 6; x < W - 8; x += 16) g.fillRect(x, 19, 8, 7);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 27, W, 3);
  // office floors: stone piers between the window columns
  g.fillStyle = 'rgba(255,240,215,0.08)';
  for (const px of [61, 122, 183]) g.fillRect(px, 34, 7, 296);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  for (let i = 0; i < 5; i++) g.fillRect(0, 40 + i * 57, W, 2.2); // floor lines
  for (let i = 0; i < 5; i++) {
    const wy = 46 + i * 57, wh = 38;
    for (let cx = 0; cx < 4; cx++) {
      const x = 15 + cx * 61, ww = 38;
      g.fillStyle = '#d8cfb8'; g.fillRect(x - 2, wy - 2, ww + 4, wh + 4);
      g.fillStyle = '#20242c'; g.fillRect(x, wy, ww, wh);
      g.fillStyle = 'rgba(178,206,230,0.35)'; g.fillRect(x + 3, wy + 4, 11, 18);
      g.fillStyle = '#d8cfb8'; g.fillRect(x, wy + wh * 0.5, ww, 2.4);
      if (R() < 0.3) {
        e.fillStyle = R() < 0.8 ? 'rgba(255,196,110,1)' : 'rgba(190,214,255,1)';
        e.fillRect(x + 1, wy + 1, ww - 2, wh - 2);
      }
    }
  }
  // stone frieze between offices and storefront
  g.fillStyle = 'rgba(226,210,182,0.4)'; g.fillRect(0, 332, W, 26);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 358, W, 3);
  // sign band: dark + pale blocks suggesting lettering (no words)
  g.fillStyle = 'rgba(12,12,14,0.88)'; g.fillRect(0, 366, W, 32);
  g.fillStyle = 'rgba(240,230,205,0.85)';
  let lx = 16 + R() * 10;
  while (lx < W - 24) { const lw = 7 + R() * 12; g.fillRect(lx, 376, lw, 12); lx += lw + 6 + R() * 7; }
  // storefront glass: four tall panes, iron mullions, mostly lit
  g.fillStyle = '#191c20'; g.fillRect(5, 402, W - 10, 86);
  for (let i = 0; i < 4; i++) {
    const x = 11 + i * 59;
    g.fillStyle = '#2c3844'; g.fillRect(x, 407, 50, 76);
    g.fillStyle = 'rgba(190,216,235,0.3)'; g.fillRect(x + 4, 412, 13, 34);
    if (R() < 0.85) { e.fillStyle = R() < 0.85 ? 'rgba(255,198,118,1)' : 'rgba(205,225,255,1)'; e.fillRect(x + 2, 409, 46, 72); }
  }
  g.fillStyle = '#101216'; g.fillRect(0, 488, W, 24); // bulkhead
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
