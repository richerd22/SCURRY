// SCURRY - main: wires the world, the systems, the loop, and the keys.
// You are a squirrel. Boston Common + Public Garden is the whole world.

import * as THREE from 'three';
import { S } from './state.js';
import { buildWorld } from './world/world.js';
import { buildTrees } from './world/trees.js';
import { buildLandmarks } from './world/landmarks.js';
import { buildProps } from './world/props.js';
import { initDaycycle, updateDaycycle, setSunShadows, setShadowSize } from './systems/daycycle.js';
import { initPlayer, updatePlayer, syncPlayerCamera, clearPlayerInput } from './systems/player.js';
import { buildHumans, updateHumans } from './systems/humans.js';
import { initFood, updateFood, nearestFoodAction, buryAction } from './systems/food.js';
import { buildDogs, updateDogs, biteDogs, nearestDogDist } from './systems/dogs.js';
import { buildRanger, updateRanger, biteRanger } from './systems/ranger.js';
import { buildHawk, updateHawk, biteHawk } from './systems/hawk.js';
import { buildHollow, initHollowInteractables, updateHollow } from './systems/hollow.js';
import { buildBurrows, initBurrows, updateBurrows, debugEnterBurrow } from './systems/burrows.js';
import { buildFenway, initFenway, updateFenway, debugEnterFenway } from './systems/fenway.js';
import { buildFenwayHood, updateFenwayHood } from './systems/fenwayhood.js';
import { buildGarden, initGarden, updateGarden, debugEnterGarden } from './systems/garden.js';
import { buildCityHall, initCityHall, updateCityHall, debugEnterCityHall } from './systems/cityhall.js';
import { buildEsplanade, initEsplanade, updateEsplanade, debugEnterEsplanade } from './systems/esplanade.js';
import { buildGeese, updateGeese } from './systems/geese.js';
import { buildCrows, updateCrows, biteCrow } from './systems/crows.js';
import { updateCanopy } from './systems/canopy.js';
import { initSwanRide, updateSwanRide, qaFinishSwanRide, swanRideStatus } from './systems/swan-ride.js';
import { buildWildlife, updateWildlife, biteWildlife } from './systems/wildlife.js';
import { buildMBTA, initMBTA, updateMBTA, mbtaDebugState } from './systems/mbta.js';
import { initAudio, setMuted, isMuted, setGameAudioPaused, isGameAudioPaused } from './systems/audio.js';
import { initHUD, updateHUD, toast } from './ui/hud.js';
import { initTouch } from './ui/touch.js';
import { initParkMap, updateParkMap } from './ui/park-map.js';
import { initDiscoveries, updateDiscoveries } from './systems/discoveries.js';
import { createContactRecorder } from './systems/contact-recorder.js';
import { boxSurfaceHeight } from './systems/collision.js';
import { beginRelocation, completeRelocation, advanceRelocation } from './systems/relocation.js';
import { createMobileQualityState, advanceMobileQuality } from './systems/mobile-quality.js';
import { whenModelsSettled } from './systems/models.js';
import { groundHeight, visibleGroundHeight } from './world/world.js';

// ---------- device class ----------
// Touch = coarse pointer, a touch screen, or ?touch=1 (verification hook).
const Q = new URLSearchParams(location.search);
// Diagnostic placement controls must never appear on the public site.
const qaLocal = Q.has('qa') && /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
S.isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches)
  || 'ontouchstart' in window || Q.has('touch');

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, S.isTouch ? 1.5 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
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
buildHawk(scene);
buildHollow(scene);
buildGeese(scene);
buildCrows(scene);
buildWildlife(scene);
buildBurrows(scene);
buildFenway(scene);
buildFenwayHood(scene);
buildGarden(scene);
buildCityHall(scene);
buildEsplanade(scene);
buildMBTA(scene);
initFood();
initHollowInteractables();
initBurrows();
initSwanRide();
initFenway();
initGarden();
initCityHall();
initEsplanade();
initMBTA();
initDaycycle(scene);
initPlayer(scene, camera);
initHUD();
initDiscoveries();
initParkMap();

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
    // Can't beg a tourist / interact with a burrow door from a roof 10m up.
    if (d < it.r && d < bd && (!Number.isFinite(it.y) || Math.abs(P.y - it.y) < (it.heightRange || 1.8))) {
      bd = d; bestLabel = label; bestAction = it.action;
    }
  }
  const fa = nearestFoodAction();
  if (fa) {
    // Use actual food distance. A snack 1m away must not steal a closer
    // door, sitter or perch interaction by pretending to be at 0.5m.
    if (fa.distance < bd) { bestLabel = fa.label; bestAction = fa.action; }
  }
  currentE = bestAction ? { label: bestLabel, action: bestAction } : null;
  currentF = buryAction();
}

// Rebuild the prompt on the actual input event, not a frame-old snapshot.
// Portals, flying food, and rapid multitouch can change world state between
// the last requestAnimationFrame and the next E/F/ACT/BURY action.
function interactNow() {
  if (!S.started || S.paused) return;
  scanInteractions();
  if (currentE) currentE.action();
}
function buryNow() {
  if (!S.started || S.paused) return;
  scanInteractions();
  if (currentF) currentF.action();
}
document.addEventListener('keydown', (e) => {
  if (!S.started || S.paused || e.repeat) return; // actions should not auto-repeat
  if (e.code === 'KeyE') interactNow();
  if (e.code === 'KeyF') buryNow();
  if (e.code === 'KeyM') { setMuted(!isMuted()); toast(isMuted() ? 'sound off' : 'sound on', 1.2); }
});

// bite: boop whatever is in range
S.onBite = () => { biteDogs() || biteRanger() || biteHawk() || biteCrow() || biteWildlife(); };

// ranger net catch: fade, relocate to the bandstand roof, stash raided.
// Hawk Dua reuses the same fade with opts {pos, message, grounded}: a
// canopy relocation with its own toast and the stash intact (lost = 0).
// The ranger call passes no opts and keeps the original behaviour exactly.
S.fadeCatch = (lost, opts) => {
  if (!beginRelocation(S)) return false;
  // Input and physics are frozen while the fade is pending; no second
  // attacker can deduct more stash or queue another relocation.
  clearPlayerInput();
  const fade = document.getElementById('fade');
  fade.style.opacity = 1;
  const dest = (opts && opts.pos) ? opts.pos : S.respawnPoint;
  setTimeout(() => {
    const P = S.player;
    P.pos.copy(dest);
    P.vel.set(0, 0, 0);
    P.climbing = null; P.climbRegrab = 0;
    P.begging = 0; P.moving = false; P.sprinting = false;
    P.grounded = (opts && typeof opts.grounded === 'boolean') ? opts.grounded : false;
    completeRelocation(S, 1.5);
    syncPlayerCamera(camera);
    fade.style.opacity = 0;
    toast((opts && opts.message) ? opts.message : (lost > 0
      ? 'NETTED. relocated to the bandstand roof. the ranger took ' + lost + ' from your stash.'
      : 'NETTED. relocated to the bandstand roof. undignified, but free.'), 4.5);
  }, 650);
  return true;
};

// ---------- title / pause ----------
const titleEl = document.getElementById('title');
const pauseEl = document.getElementById('pause');
function startGame() {
  // Starting/resuming is a new input session: no keys held behind overlays.
  clearPlayerInput();
  initAudio();
  setGameAudioPaused(false);
  S.started = true;
  S.paused = false;
  titleEl.style.display = 'none';
  pauseEl.style.display = 'none';
  // pointer lock is desktop-only; touch devices play without it (and iOS
  // Safari / in-app browsers would throw or silently fail the request)
  if (!S.isTouch && !(qaLocal && Q.has('nolock')) && renderer.domElement.requestPointerLock) {
    try {
      const p = renderer.domElement.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* no lock, no problem - mouse still works via click-drag fallback */ }
  }
}
titleEl.addEventListener('click', startGame);
pauseEl.addEventListener('click', startGame);
// Only *losing a lock we actually held* pauses desktop play. Browsers
// can deny requestPointerLock (privacy, embedded tabs, automation). An
// unsuccessful request must keep play alive with mouse-drag camera fallback.
let previouslyLocked = false;
document.addEventListener('pointerlockchange', () => {
  if (S.debugShot || S.isTouch) return;
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked) {
    previouslyLocked = true;
    S.paused = false;
    setGameAudioPaused(false);
    pauseEl.style.display = 'none';
  } else if (previouslyLocked) {
    previouslyLocked = false;
    if (S.started) {
      clearPlayerInput();
      S.paused = true;
      setGameAudioPaused(true);
      pauseEl.style.display = 'flex';
    }
  }
});

// Safari sometimes background-suspends without a blur or pointer-lock event.
// Pause physics; each input module separately releases its held controls.
const suspendGame = () => {
  if (!S.started || S.debugShot) return;
  clearPlayerInput();
  S.paused = true;
  setGameAudioPaused(true);
  pauseEl.style.display = 'flex';
};
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendGame(); });
window.addEventListener('pagehide', suspendGame);

// ---------- touch controls (mobile requirement) ----------
if (S.isTouch) {
  initTouch({
    onInteract: interactNow,
    onBury: buryNow,
  });
  titleEl.querySelector('.go').textContent = 'TAP TO PLAY';
  pauseEl.querySelector('.go').textContent = 'TAP TO RESUME';
  const ctl = titleEl.querySelector('.controls');
  if (ctl) ctl.innerHTML = '<b>LEFT STICK</b> scurry &nbsp; <b>DRAG</b> right side to look &nbsp; <b>SPRINT</b> toggle to run<br>' +
    '<b>push into a trunk</b> to climb - canopy tops are walkable, leap tree to tree<br>' +
    '<b>ACT</b> beg / take / snatch / slip through knot-holes &nbsp; <b>BURY</b> stash food (+1)<br>' +
    '<b>BITE</b> - a comic boop for dog noses and ranger ankles<br>' +
    'no fall damage. squirrels do not take fall damage. this is science.';
  const help = document.getElementById('hud-help');
  if (help) help.innerHTML = 'left stick: move - drag right side: look<br>jump / bite / act / bury buttons - sprint toggles';
}

// ---------- debug screenshot mode: ?shot=<pose>&t=<hour> ----------
// Auto-starts without pointer lock so agents can verify visuals headlessly.
// Poses: spawn, down (look at your own feet - the v0 horror check), garden,
// statehouse, canopy, bench, cart, lamps. Sets window.__scurryReady when
// models have settled and enough frames have rendered to capture.
if (Q.has('shot')) {
  S.debugShot = true;
  S.shotPose = Q.get('shot');
  // Visual QA only: compare a 0.25m squirrel frame to a 1.7m human
  // reference from EXACTLY the same XZ pose; physics remains squirrel-sized.
  const eye = Number(Q.get('eye'));
  if (Q.has('eye') && Number.isFinite(eye) && eye >= 0.15 && eye <= 2) S.debugEye = eye;
  S.started = true;
  titleEl.style.display = 'none';
  pauseEl.style.display = 'none';
  if (Q.get('t')) S.timeHours = parseFloat(Q.get('t'));
  const P = S.player;
  const pose = (x, z, tx, tz, pitch = 0) => {
    P.pos.set(x, visibleGroundHeight(x, z), z);
    P.yaw = Math.atan2(-(tx - x), -(tz - z));
    P.pitch = pitch;
    P.grounded = true;
  };
  switch (Q.get('shot')) {
    case 'down': pose(24, 30, 24, 20); P.pitch = -1.45; break;
    case 'garden': pose(-96, -27, -132, 0); break;
    case 'statehouse': pose(116, -36, 186, -92); break;
    case 'bridge': pose(-110, 3, -132, 0); break; // lagoon bridge elevation from across the water
    case 'washington': pose(-125, 83.5, -132, 76); break; // the General, Garden south mall, front three-quarter
    case 'swanboats': // south shore of the lagoon, close on the west boat's drift loop
      pose(-141, -25, -154, -11);
      break;
    case 'parkst': // Brewer Fountain in front, Park St headhouse behind it
      pose(-10, -42, -29, -69);
      break;
    case 'fountain': pose(-16.5, -49.5, -25, -58, 0.24); break; // Brewer Fountain close, figures + tiers
    case 'headhouse': pose(-23.5, -67, -33, -80); break; // Park St headhouse front three-quarter
    case 'ducklings': pose(-73.5, 28.5, -78, 34, 0.1); break; // Mrs. Mallard's line, Garden path
    case 'promenade': pose(2, -18, 150, -18); break; // ON the Mall apron (v0.6.27), east down the promenade
    case 'pondedge': pose(74.5, 21.5, 95, 12, -0.1); break; // Frog Pond SW shore (v0.6.27): curb stones + water at eye height
    case 'wade': pose(-132, 10, -132, -2); break; // IN the lagoon (v0.6.28): bed level, eye under the water plane, looking at the bridge
    case 'swanclose': pose(-144.8, 23.2, -147.5, 18.8); P.pos.y = 0.45; break; // ON the swan-boat dock (v0.6.28): the moored boat's swan + canopy close
    case 'beacon': pose(40, -38, 40, -112); break; // the Mall looking north at the Beacon St row
    case 'beaconwest': pose(-120, -40, -140, -108); break; // Garden north edge, Beacon row west segment
    case 'beaconclose': pose(36, -93, 43, -111); break; // one Beacon unit at stoop distance
    case 'charles': pose(-44, 52, -64, -4); break; // Charles St: shopfronts, awnings, parked cars
    case 'charlesnorth': pose(-50, -34, -52, -78); break; // up Charles St toward the Beacon end
    case 'tremont': pose(66, 10, 214, 4); break; // Frog Pond looking east at the Tremont row
    case 'tremontclose': pose(194, -30, 216, -33); break; // Tremont fronts at fence distance
    case 'parkchurch': pose(197, -97, 208, -110, 0.3); break; // Park Street Church tower from the Common's NE corner
    case 'parkspire': pose(197, -97, 208, -110, 0.95); break; // the steeple stack: belfry, spire, gold ball
    case 'parkchurchfar': pose(60, -18, 208, -110); break; // the steeple over the State House roofline, from the Mall
    case 'boylston': pose(60, 58, 62, 114); break; // Common south edge: the Boylston row
    case 'arlington': pose(-158, 16, -214, 18); break; // Garden west edge: the Arlington row
    case 'bandstand': pose(127, 29, 140, 42); break;
    case 'monument': pose(47, -32, 60, -45); break;
    case 'bench': pose(48.6, -18.6, 52, -22); break;
    case 'cart': pose(122.5, 50.5, 128, 56); break;
    case 'lamps': pose(58, -8, 150, 44); break;
    case 'canopy': {
      const t = S.trees.find((tr) => tr.hollow) || S.trees[0];
      P.pos.set(t.x + 2.2, t.canopyY - 0.55, t.z + 1.2);
      P.yaw = Math.atan2(-(95 - P.pos.x), -(12 - P.pos.z));
      P.pitch = -0.12;
      P.grounded = true;
      break;
    }
    case 'burrow': debugEnterBurrow('entry'); break;   // inside an entry chamber, torch-lit
    case 'market': debugEnterBurrow('market'); break;  // the rat exchange, deep end
    case 'fenway': debugEnterFenway('plate'); break;        // behind home plate, the whole yard
    case 'fenwaymonster': debugEnterFenway('monster'); break; // centre field, facing the wall
    case 'fenwaywall': debugEnterFenway('wall'); break;       // at the Monster's feet, looking up
    case 'fenwaytop': debugEnterFenway('top'); break;         // ON the Monster, looking back at the yard
    case 'fenwaycitgo': debugEnterFenway('citgo'); break;     // ON the Monster, turned around: the CITGO sign over left field
    case 'fenwayhood': debugEnterFenway('hood'); break;       // outside the park, aerial over the Pike: the neighborhood around the yard
    case 'tdgarden': debugEnterGarden('court'); break;        // centre court, the parquet + the screen ('garden' was taken - the Public Garden)
    case 'tdgardenbowl': debugEnterGarden('bowl'); break;     // lower bowl seats, across the court
    case 'tdgardenjumbo': debugEnterGarden('jumbo'); break;   // centre court, nose up at the jumbotron
    case 'cityhall': debugEnterCityHall('emerge'); break;        // out of the planter, the plaza + the hall ahead
    case 'cityhallplaza': debugEnterCityHall('plaza'); break;    // the wide: whole plaza, building behind the podium
    case 'cityhallfacade': debugEnterCityHall('facade'); break;  // on the podium terrace at the facade's feet, nose up
    case 'cityhallreturn': debugEnterCityHall('return'); break;  // on the plaza facing the burrow mouth you'd dive back down
    case 'cityhalldoor': debugEnterCityHall('door'); break;      // in the rat market, facing the new EASTBOUND door
    case 'esplanade': debugEnterEsplanade('emerge'); break;      // out of the tree bed, shell + river ahead
    case 'esplanadeshell': debugEnterEsplanade('shell'); break;  // on the oval, facing the shell across its pad
    case 'esplanaderiver': debugEnterEsplanade('river'); break;  // on the path at the stone entry, river + skyline beyond
    case 'esplanadewade': debugEnterEsplanade('wade'); break;    // in the shallows between the stones, eye under the plane
    case 'esplanadecanopy': debugEnterEsplanade('canopy'); break; // up the path elm, river below
    case 'esplanadedoor': debugEnterEsplanade('door'); break;    // in the rat market, facing the new RIVERBOUND door
    case 'charlesclose': pose(-59.5, 8, -62, 10, 0.18); break; // Charles St shopfront glass at fence distance
    case 'geese': // on the deck, in warn range of the flock but outside charge range
      pose(-132, 12, -132, 0); P.pos.y = 1.15; P.grounded = true;
      break;
    case 'crow': // by the pretzel cart; crows.js freezes crow #0 mid-swoop in front
      pose(124.5, 52.5, 128, 56);
      break;
    case 'crowperch': { // crow #1 on its lamp, seen from below-side: the profile check
      let lx = 52, lz = -22, bd = Infinity;
      for (const lamp of (S.lamps || [])) {
        const d = Math.hypot(lamp.x - 52, lamp.z + 22);
        if (d < bd) { bd = d; lx = lamp.x; lz = lamp.z; }
      }
      pose(lx + 1.9, lz + 1.9, lx, lz, 0.84); // perch is ground + 3.3
      break;
    }
    default: break; // 'spawn' = the regular spawn pose
  }
  Promise.race([whenModelsSettled(), new Promise((r) => setTimeout(r, 7000))]).then(() => {
    let frames = 0;
    const tick = () => { if (++frames > 6) window.__scurryReady = true; else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  if (Q.has('lowq')) {
    // software-renderer verification: same scene, cheaper pixels - no
    // shadows, quarter grass, no PMREM rebakes (S.lowQ), 0.55 pixel ratio
    S.lowQ = true;
    renderer.setPixelRatio(0.55);
    setSunShadows(false);
    if (S.grassTufts) for (const t of S.grassTufts) t.count = Math.floor(S.grassTuftCount * 0.25);
  }
}

// Browser E2E observability lives ONLY on a local host with ?qa=1.
// The deployed public game cannot call these helpers; the tests still use
// actual keyboard/touch inputs and real interaction callbacks for actions.
if (qaLocal) {
  window.__scurryQA = Object.freeze({
    state: () => {
      const p = S.player;
      return {
        started: S.started, paused: S.paused,
        relocating: S.relocating, catchGrace: S.catchGrace,
        pos: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
        floor: p.inFenway ? S.realmGround.fenway?.(p.pos.x,p.pos.z) :
          p.inGarden ? S.realmGround.garden?.(p.pos.x,p.pos.z) :
          p.inCityHall ? S.realmGround.cityhall?.(p.pos.x,p.pos.z) :
          p.inEsplanade ? S.realmGround.esplanade?.(p.pos.x,p.pos.z) :
          p.inHollow || p.inBurrow || p.inMBTA ? 0 : visibleGroundHeight(p.pos.x,p.pos.z),
        velY: p.vel.y, yaw: p.yaw, biteCooldown:p.biteCooldown,
        grounded: p.grounded, climbing: !!p.climbing, onSwanBoat:!!p.onSwanBoat,
        swan: swanRideStatus(),
        inHollow: p.inHollow, inBurrow: p.inBurrow, inFenway: p.inFenway,
        inGarden: p.inGarden, inCityHall: p.inCityHall, inEsplanade: p.inEsplanade, inMBTA:p.inMBTA,
        prompt: currentE?.label || null, bury: currentF?.label || null,
        touch: { ...S.touch }, audioPaused: isGameAudioPaused(),
      };
    },
    // Deterministic *actual movement* traversal: W/Shift are still driven
    // through browser key events. Each real player.js physics substep is
    // sampled against both its support function and the independently
    // raycast rendered Three.js terrain triangles. Localhost only.
    placeOnTerrain: (x,z,yaw) => {
      if (![x,z,yaw].every(Number.isFinite)) throw new TypeError('finite route');
      const p=S.player;
      if (p.inHollow||p.inBurrow||p.inFenway||p.inGarden||p.inCityHall||p.inEsplanade)
        throw new Error('terrain walk must start in home park');
      clearPlayerInput();
      p.pos.set(x,visibleGroundHeight(x,z),z);p.vel.set(0,0,0);
      p.grounded=true;p.climbing=null;p.climbRegrab=0;
      p.yaw=yaw;p.pitch=0;syncPlayerCamera(camera);
    },
    traceTerrainWalk: (steps = 540) => {
      if (!S.started||S.paused||S.relocating) throw new Error('not playing');
      if (!Number.isInteger(steps)||steps<1||steps>1200)throw new RangeError('steps');
      const terrain=scene.children.find(o=>o.userData.scurryTerrainMesh);
      if (!terrain) throw new Error('missing rendered terrain mesh');
      const ray=new THREE.Raycaster();
      const down=new THREE.Vector3(0,-1,0);
      const rayOrigin=new THREE.Vector3();
      const p=S.player, start={x:p.pos.x,y:p.pos.y,z:p.pos.z};
      let minClear=Infinity,minMeshClear=Infinity,maxStepY=0;
      let nonGround=0,climbs=0,penetrations=0,meshSamples=0;
      const samples=[];
      let prevY=p.pos.y;
      for(let i=0;i<steps;i++){
        updatePlayer(1/90,camera); // the real collision solver + held input
        const floor=visibleGroundHeight(p.pos.x,p.pos.z);
        const gap=p.pos.y-floor;
        minClear=Math.min(minClear,gap);
        maxStepY=Math.max(maxStepY,Math.abs(p.pos.y-prevY));prevY=p.pos.y;
        if(gap<-.03)penetrations++;
        if(!p.grounded)nonGround++;
        if(p.climbing)climbs++;
        if(i%20===0||i===steps-1){
          rayOrigin.set(p.pos.x,60,p.pos.z);ray.set(rayOrigin,down);
          const hit=ray.intersectObject(terrain,false)[0];
          if(!hit)throw new Error('walk beyond rendered terrain');
          minMeshClear=Math.min(minMeshClear,p.pos.y-hit.point.y);
          meshSamples++;
          samples.push({i,x:+p.pos.x.toFixed(2),z:+p.pos.z.toFixed(2),
            feet:+p.pos.y.toFixed(3),mesh:+hit.point.y.toFixed(3),
            floor:+floor.toFixed(3),grounded:p.grounded});
        }
      }
      return {steps,start,end:{x:p.pos.x,y:p.pos.y,z:p.pos.z},
        horizontalDistance:Math.hypot(p.pos.x-start.x,p.pos.z-start.z),
        minClear,minMeshClear,maxStepY,nonGround,climbs,penetrations,meshSamples,samples};
    },
    // Second independent visual/physics parity: 168 points across both
    // Charles Street sidewalks, including both ramp shoulders. Raycast the
    // actually *rendered* instanced concrete and compare with the ramp Y
    // used by the indexed player support solver.
    surveySidewalkSurfaces: () => {
      const meshes=scene.children.filter(o=>o.userData.scurrySidewalkSurface);
      const boxes=S.platformBoxes.filter(b=>b.isCharlesSidewalk);
      if(meshes.length!==3||boxes.length!==72)
        throw new Error('sidewalk mesh or collider registrations missing');
      const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);
      let count=0,maxAbsDiff=0,worst=null,minSurface=Infinity,maxSurface=-Infinity;
      for(let zz=-96;zz<96;zz+=16)for(const cx of [-59.9,-40.1]){
        const z=zz+8;
        for(const dx of [-1.2,-.82,-.45,0,.45,.82,1.2]){
          const x=cx+dx;
          const matching=boxes.filter(b=>x>=b.minX-1e-8&&x<=b.maxX+1e-8&&
            z>=b.minZ&&z<=b.maxZ);
          if(!matching.length)throw new Error('missing physical curb '+x+','+z);
          const support=Math.max(...matching.map(b=>boxSurfaceHeight(b,x)));
          origin.set(x,30,z);ray.set(origin,down);
          const hit=ray.intersectObjects(meshes,false)[0];
          if(!hit)throw new Error('missing visual curb at '+x+','+z);
          const diff=support-hit.point.y,absolute=Math.abs(diff);
          if(absolute>maxAbsDiff){maxAbsDiff=absolute;worst={x,z,support,visual:hit.point.y,diff};}
          minSurface=Math.min(minSurface,hit.point.y);
          maxSurface=Math.max(maxSurface,hit.point.y);
          count++;
        }
      }
      return {count,maxAbsDiff,worst,minSurface,maxSurface};
    },
    // Global survey: an independent Three.js triangle raycast at hundreds
    // of park coordinates. Detect mismatches between visible-ground
    // physics and the actual mesh that could put feet inside polygons.
    surveyGroundTriangles: () => {
      const terrain=scene.children.find(o=>o.userData.scurryTerrainMesh);
      if(!terrain)throw new Error('missing park terrain mesh');
      const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
      const origin=new THREE.Vector3();
      let count=0,negative=0,min=Infinity,max=-Infinity;
      let worstLow=null,worstHigh=null;
      for(let iz=0;iz<=20;iz++)for(let ix=0;ix<=30;ix++){
        const x=-204+ix*408/30,z=-110+iz*220/20;
        origin.set(x,60,z);ray.set(origin,down);
        const hit=ray.intersectObject(terrain,false)[0];
        if(!hit)throw new Error('terrain triangle ray missed at '+x+','+z);
        const sampled=visibleGroundHeight(x,z);
        const gap=sampled-hit.point.y;
        if(gap<min){min=gap;worstLow={x,z,sampled,mesh:hit.point.y};}
        if(gap>max){max=gap;worstHigh={x,z,sampled,mesh:hit.point.y};}
        if(gap<-.015)negative++;
        count++;
      }
      return {count,negative,min,max,worstLow,worstHigh};
    },
    // Representative *actual registered* supports, not synthetic boxes.
    // Used to walk along canopy, Garden bridge and sloped fence rail tops.
    supportTargets: () => {
      const canopy=S.platforms.find(s=>s.y>5 && s.r>2 && S.trees.some(t=>
        Math.abs(t.x-s.x)<.001 && Math.abs(t.z-s.z)<.001));
      const bridge=S.platformBoxes.find(s=>Math.abs(s.y-1.15)<.001 &&
        s.maxZ-s.minZ>25 && s.maxX-s.minX>4);
      const fence=S.platformSegments.find(s=>Number.isFinite(s.y0) &&
        Number.isFinite(s.y1) && Math.hypot(s.x1-s.x0,s.z1-s.z0)>1.4);
      if (!canopy || !bridge || !fence)throw new Error('missing real support registries');
      const dx=fence.x1-fence.x0,dz=fence.z1-fence.z0;
      return [
        {name:'registered canopy',x:canopy.x,y:canopy.y,z:canopy.z,yaw:0,steps:30},
        {name:'Garden bridge',x:(bridge.minX+bridge.maxX)/2,y:bridge.y,
          z:(bridge.minZ+bridge.maxZ)/2,yaw:0,steps:55},
        {name:'graded iron top',x:(fence.x0+fence.x1)/2,
          z:(fence.z0+fence.z1)/2,y:(fence.y0+fence.y1)/2,
          yaw:Math.atan2(-dx,-dz),steps:15},
      ];
    },
    // Probe the *real* player controller at a synthetic isolated trunk:
    // an empty support registry here used to drop climbers to lawn level.
    // State is restored before releasing the JavaScript event loop.
    probeMissingCanopy: () => {
      const p=S.player;
      const saved={pos:p.pos.clone(),vel:p.vel.clone(),climbing:p.climbing,
        grounded:p.grounded,yaw:p.yaw,pitch:p.pitch,climbAngle:p.climbAngle,
        climbRegrab:p.climbRegrab,moving:p.moving,sprinting:p.sprinting};
      clearPlayerInput();
      const tree={x:3000,z:3000,r:.4,gy:0,canopyY:8,trunkTop:8.3};
      try {
        p.pos.set(tree.x,7.4,tree.z+.7);
        p.vel.set(0,0,0);
        p.climbing=tree;p.climbAngle=0;p.grounded=false;
        updatePlayer(1/90,camera);
        return {feetY:p.pos.y,climbing:!!p.climbing,grounded:p.grounded};
      } finally {
        p.pos.copy(saved.pos);p.vel.copy(saved.vel);
        p.climbing=saved.climbing;p.grounded=saved.grounded;
        p.yaw=saved.yaw;p.pitch=saved.pitch;p.climbAngle=saved.climbAngle;
        p.climbRegrab=saved.climbRegrab;p.moving=saved.moving;
        p.sprinting=saved.sprinting;syncPlayerCamera(camera);
      }
    },
    // Diagnostic control is localhost-only. No public QA API is exposed.
    tryRelocation: () => S.fadeCatch(0, {
      pos: new THREE.Vector3(0, visibleGroundHeight(0, 0), 0),
      grounded:true, message:'QA relocation complete'
    }),
    finishSwanRide: qaFinishSwanRide,
    wildlife: () => (S.wildlifeActors||[]).map(a=>({kind:a.kind,x:a.x,y:a.y,z:a.z,visible:a.mesh.visible})),
    mbta: mbtaDebugState,
    // Simulation time only, local-only test hook. Never present on live URL.
    setTime: (hour) => {
      if(!Number.isFinite(hour)||hour<0||hour>=24)throw new RangeError('0..24 hour');
      S.timeHours=hour;return hour;
    },
    population: () => ({
      bench: S.benchSitters.filter(x=>x.mesh?.visible).length,
      picnics: S.blankets.filter(x=>x.mesh?.visible).length,
      dogs: (S.dogPositions||[]).filter(x=>x.mesh?.visible).length,
      nightWorker: !!S.nightWorker?.visible,
      burrowResidents:(S.wildlifeActors||[]).filter(x=>x.underground&&x.mesh.visible).length,
    }),
    interactions: () => S.interactables.map(it => ({
      x: it.x, y: it.y, z: it.z, r: it.r, label: it.label(),
    })).filter(it => typeof it.label === 'string'),
    place: (x, y, z, yaw = undefined) => {
      if (![x,y,z].every(Number.isFinite) ||
          (yaw !== undefined && !Number.isFinite(yaw)))
        throw new TypeError('finite feet coordinates required');
      const p = S.player;
      clearPlayerInput();
      p.pos.set(x,y,z); p.vel.set(0,0,0);
      if (yaw !== undefined) p.yaw=yaw;
      p.climbing = null; p.grounded = true; p.climbRegrab = 0;
      syncPlayerCamera(camera);
      scanInteractions();
    },
    suspend: () => {
      // A real background/visibility transition also exits pointer lock.
      if (document.pointerLockElement && document.exitPointerLock)
        document.exitPointerLock();
      clearPlayerInput();
      S.paused = true;
      setGameAudioPaused(true);
      pauseEl.style.display = 'flex';
    },
  });
  // Low-cost software WebGL for the real play loop, not just screenshot mode.
  if (Q.has('lowq') && !S.debugShot) {
    S.lowQ = true;
    renderer.setPixelRatio(0.55);
    setSunShadows(false);
    if (S.grassTufts) for (const t of S.grassTufts) t.count = Math.floor(S.grassTuftCount * 0.25);
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Opt-in field telemetry: ?diag=1. Ordinary play pays no history cost.
const diagHud = Q.has('diag') ? document.createElement('pre') : null;
const diagRecorder = diagHud ? createContactRecorder(180) : null;
if (diagHud) {
  diagHud.id = 'scurry-diag';
  diagHud.style.cssText = 'position:fixed;z-index:9;left:calc(8px + env(safe-area-inset-left));top:calc(95px + env(safe-area-inset-top));margin:0;padding:8px 10px;border:1px solid #ffffff60;border-radius:6px;background:#09100ce8;color:#eaffca;font:11px/1.4 ui-monospace,monospace;pointer-events:none;white-space:pre;max-width:80vw';
  document.body.appendChild(diagHud);
  const copy=document.createElement('button');
  copy.type='button'; copy.id='scurry-diag-copy';
  copy.textContent='COPY WALK TRACE';
  copy.setAttribute('aria-label','Copy recent squirrel collision coordinates');
  copy.style.cssText='position:fixed;z-index:10;left:calc(8px + env(safe-area-inset-left));top:calc(225px + env(safe-area-inset-top));border:1px solid #a4c790;background:#183022;color:#eaffca;border-radius:5px;padding:8px 10px;font:700 11px ui-monospace,monospace;cursor:pointer;touch-action:manipulation';
  copy.addEventListener('click',async()=>{
    const report={game:'SCURRY',build:document.querySelector('meta[name="scurry-version"]')?.content,
      captured:new Date().toISOString(),device:navigator.userAgent,...diagRecorder.snapshot()};
    const content=JSON.stringify(report,null,2);
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard not permitted');
      await navigator.clipboard.writeText(content);
      copy.textContent='COPIED ✓';
    }catch(_){
      window.prompt('Copy your recent SCURRY collision trace:',content);
      copy.textContent='COPY WALK TRACE';
    }
  });
  document.body.appendChild(copy);
}
let diagElapsed = 0;
function updateDiagnostics(dt, rawFrameDt) {
  if (!diagHud || !S.started) return;
  diagElapsed += dt;
  if (diagElapsed < 0.16) return; // 6 updates/sec, not per render frame
  diagElapsed = 0;
  const P = S.player, v = P.vel, pos = P.pos;
  const realm = P.inHollow ? 'hollow' : P.inBurrow ? 'burrow' : P.inFenway ? 'fenway' :
    P.inGarden ? 'garden' : P.inCityHall ? 'cityhall' : P.inEsplanade ? 'esplanade' : 'park';
  const sample = S.realmGround[realm];
  const ground = realm === 'park' ? visibleGroundHeight(pos.x, pos.z) :
    (sample ? sample(pos.x, pos.z) : 0);
  diagRecorder.record({t:performance.now(),x:pos.x,y:pos.y,z:pos.z,
    ground,grounded:P.grounded,climbing:!!P.climbing,realm,vy:v.y,
    fps:1/Math.max(rawFrameDt,.001)});
  const summary=diagRecorder.snapshot();
  diagHud.textContent = `SCURRY DIAG | ${realm}\nfeet: ${pos.x.toFixed(2)} / ${pos.y.toFixed(2)} / ${pos.z.toFixed(2)}\nground: ${ground.toFixed(2)} | gap: ${(pos.y-ground).toFixed(2)}\n${P.climbing ? 'CLIMBING' : P.grounded ? 'GROUNDED' : 'AIRBORNE'} | vy: ${v.y.toFixed(2)}\nFPS: ${Math.round(1/Math.max(rawFrameDt,.001))} | EMA: ${Math.round(mobileQuality.fpsEma)} | quality: ${mobileQuality.tier} | touch: ${S.isTouch}\nTRACE ${summary.total} | min gap ${summary.minimumGap ?? '—'}m | penetration samples ${summary.penetrations}`;
}

// ---------- the loop ----------
const clock = new THREE.Clock();
// Sustained real-device FPS determines quality, not the physics-capped dt.
// Independent downgrade/recovery windows avoid permanent visual degradation.
const mobileQuality = createMobileQualityState();
let appliedQualityTier = 0;
function perfLadder(rawFrameDt) {
  if (!S.isTouch || S.debugShot || !S.started || S.paused) return;
  const tier = advanceMobileQuality(mobileQuality, rawFrameDt);
  if (tier === appliedQualityTier) return;
  appliedQualityTier = tier;
  const pixelRatio = tier === 0 ? Math.min(window.devicePixelRatio, 1.5)
    : tier === 1 ? Math.min(window.devicePixelRatio, 1.25) : 1.1;
  renderer.setPixelRatio(pixelRatio);
  // Restore shadows and foliage as sustained performance recovers.
  setSunShadows(tier < 3);
  setShadowSize(1024); // native touch shadow resolution is 1024
  if (S.grassTufts) for (const t of S.grassTufts)
    t.count = tier === 3 ? Math.floor(S.grassTuftCount * 0.45) : S.grassTuftCount;
}
function warnings() {
  if (S.player.inHollow || S.player.inBurrow || S.player.inFenway || S.player.inGarden || S.player.inCityHall || S.player.inEsplanade || S.player.inMBTA) return '';
  if (S.ranger && S.ranger.state === 'chase') return '! THE RANGER IS AFTER YOU - CLIMB SOMETHING !';
  if (S.gooseWarn > 0) return '! THE GEESE ARE OBJECTING - WAIT, BRIBE THEM, OR GO AROUND !';
  if (S.hawkFlash > 0) return '! HAWK DUA HAS YOU MARKED - GET UNDER COVER !';
  if (S.spottedFlash > 0) return '! A DOG HAS YOUR SCENT !';
  if (nearestDogDist() < 7 && S.player.grounded && !S.player.climbing) return 'a dog is eyeing you...';
  return '';
}

let lastIdleRender = -Infinity;
function loop() {
  requestAnimationFrame(loop);
  const rawFrameDt = clock.getDelta();
  const dt = Math.min(0.05, rawFrameDt); // cap simulation step, NOT diagnostic FPS
  perfLadder(rawFrameDt);
  if (S.started && !S.paused) {
    advanceRelocation(S,dt);
    if (S.spottedFlash > 0) S.spottedFlash -= dt;
    if (S.hawkFlash > 0) S.hawkFlash -= dt;
    updateDaycycle(dt);
    if (!S.relocating) updatePlayer(dt, camera);
    updateHumans(dt);
    updateFood(dt);
    if (!S.debugShot && !S.relocating) {
      updateDogs(dt); updateRanger(dt); updateHawk(dt);
    } // no second catch during fade; frozen in screenshot mode
    updateHollow(dt);
    updateBurrows(dt);
    updateSwanRide(dt);
    updateFenway(dt);
    updateFenwayHood(dt);
    updateGarden(dt);
    updateCityHall(dt);
    updateEsplanade(dt);
    updateMBTA(dt);
    updateGeese(dt);   // not frozen in shot mode: the bridge tableau is the warn pose
    updateCrows(dt);   // not frozen either: the crow tableau poses itself (see crows.js)
    updateWildlife(dt);
    updateCanopy(dt);
    updateDiscoveries(dt);
    // Realm clamps, catches, and portals may move the feet after physics.
    syncPlayerCamera(camera);
    scanInteractions();
    const prompt = currentE ? currentE.label : (currentF ? currentF.label : '');
    updateHUD(prompt, warnings());
    updateParkMap(dt);
    updateDiagnostics(dt, rawFrameDt);
  }
  // Title/pause overlays are CSS, while the underlying 3D world is static.
  // Keep a modest 4fps backdrop refresh instead of burning full GPU power
  // behind a pause screen on iOS. Resume returns to full-rate instantly.
  if (S.started && !S.paused) renderer.render(scene, camera);
  else if (performance.now() - lastIdleRender >= 250) {
    renderer.render(scene, camera);
    lastIdleRender = performance.now();
  }
}
loop();
