// SCURRY - main: wires the world, the systems, the loop, and the keys.
// You are a squirrel. Boston Common + Public Garden is the whole world.

import * as THREE from 'three';
import { S } from './state.js';
import { buildWorld } from './world/world.js';
import { buildTrees } from './world/trees.js';
import { buildLandmarks } from './world/landmarks.js';
import { buildProps } from './world/props.js';
import { initDaycycle, updateDaycycle } from './systems/daycycle.js';
import { initPlayer, updatePlayer } from './systems/player.js';
import { buildHumans, updateHumans } from './systems/humans.js';
import { initFood, updateFood, nearestFoodAction, buryAction } from './systems/food.js';
import { buildDogs, updateDogs, biteDogs, nearestDogDist } from './systems/dogs.js';
import { buildRanger, updateRanger, biteRanger } from './systems/ranger.js';
import { buildHollow, initHollowInteractables, updateHollow } from './systems/hollow.js';
import { initAudio, setMuted, isMuted } from './systems/audio.js';
import { initHUD, updateHUD, toast } from './ui/hud.js';

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 2000);
scene.add(camera);
S.scene = scene; S.camera = camera; S.renderer = renderer;

// ---------- build the park ----------
buildWorld(scene);
buildTrees(scene);
buildLandmarks(scene);
buildProps(scene);
buildHumans(scene);
buildDogs(scene);
buildRanger(scene);
buildHollow(scene);
initFood();
initHollowInteractables();
initDaycycle(scene);
initPlayer(scene, camera);
initHUD();

// ---------- interaction plumbing ----------
let currentE = null;   // {label, action}
let currentF = null;
function scanInteractions() {
  const P = S.player.pos;
  let bestLabel = null, bestAction = null, bd = 1e9;
  for (const it of S.interactables) {
    const label = it.label();
    if (!label) continue;
    const d = Math.hypot(P.x - it.x, P.z - it.z);
    if (d < it.r && d < bd) { bd = d; bestLabel = label; bestAction = it.action; }
  }
  const fa = nearestFoodAction();
  if (fa) {
    const d = 0.5; // food at your feet beats distant prompts
    if (d < bd) { bestLabel = fa.label; bestAction = fa.action; }
  }
  currentE = bestAction ? { label: bestLabel, action: bestAction } : null;
  currentF = buryAction();
}

document.addEventListener('keydown', (e) => {
  if (!S.started || S.paused) return;
  if (e.code === 'KeyE' && currentE) currentE.action();
  if (e.code === 'KeyF' && currentF) currentF.action();
  if (e.code === 'KeyM') { setMuted(!isMuted()); toast(isMuted() ? 'sound off' : 'sound on', 1.2); }
});

// bite: boop whatever is in range
S.onBite = () => { biteDogs() || biteRanger(); };

// ranger net catch: fade, relocate to the bandstand roof, stash raided
S.fadeCatch = (lost) => {
  const fade = document.getElementById('fade');
  fade.style.opacity = 1;
  setTimeout(() => {
    const P = S.player;
    P.pos.copy(S.respawnPoint);
    P.vel.set(0, 0, 0);
    P.climbing = null;
    P.grounded = false;
    fade.style.opacity = 0;
    toast(lost > 0
      ? 'NETTED. relocated to the bandstand roof. the ranger took ' + lost + ' from your stash.'
      : 'NETTED. relocated to the bandstand roof. undignified, but free.', 4.5);
  }, 650);
};

// ---------- title / pause ----------
const titleEl = document.getElementById('title');
const pauseEl = document.getElementById('pause');
function startGame() {
  initAudio();
  S.started = true;
  S.paused = false;
  titleEl.style.display = 'none';
  pauseEl.style.display = 'none';
  renderer.domElement.requestPointerLock();
}
titleEl.addEventListener('click', startGame);
pauseEl.addEventListener('click', startGame);
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && S.started) {
    S.paused = true;
    pauseEl.style.display = 'flex';
  } else if (locked) {
    S.paused = false;
    pauseEl.style.display = 'none';
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- the loop ----------
const clock = new THREE.Clock();
function warnings() {
  if (S.player.inHollow) return '';
  if (S.ranger && S.ranger.state === 'chase') return '! THE RANGER IS AFTER YOU - CLIMB SOMETHING !';
  if (S.spottedFlash > 0) return '! A DOG HAS YOUR SCENT !';
  if (nearestDogDist() < 7 && S.player.grounded && !S.player.climbing) return 'a dog is eyeing you...';
  return '';
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (S.started && !S.paused) {
    if (S.spottedFlash > 0) S.spottedFlash -= dt;
    updateDaycycle(dt);
    updatePlayer(dt, camera);
    updateHumans(dt);
    updateFood(dt);
    updateDogs(dt);
    updateRanger(dt);
    updateHollow(dt);
    scanInteractions();
    const prompt = currentE ? currentE.label : (currentF ? currentF.label : '');
    updateHUD(prompt, warnings());
  }
  renderer.render(scene, camera);
}
loop();
