// SCURRY - crows. Three of them. Glossy, patient, and entirely too
// interested in whatever you are carrying.
//
// A crow owns one lamp-post perch and watches its patch of park. Carry
// food across open ground in front of one and it starts a slow stalk:
// head down, lean in, wings cracking open at the end. Give it 3.5
// seconds of that and it swoops, snatches the food clean out of your
// paws, and hauls it home - then drops it at the base of its own perch,
// because crows are thieves, not monsters. The food is recoverable.
// Go and recover it. Or don't. It will wait. So will the crow.
//
// Counterplay, in order of dignity:
//   - BURY IT. A buried lunch is a safe lunch; a crow that arrives to
//     find empty paws veers off and sulks about it.
//   - CLIMB. Off the low ground, up a trunk, onto anything - the stalk
//     starves and a swoop in progress aborts.
//   - DUCK INSIDE. Hollow or burrow breaks the whole thing instantly.
//   - BOOP THE CROW. Bite it mid-stalk or mid-swoop and it aborts to
//     its perch and sulks for a full minute. It remembers. (Feathers
//     are paid as tax.)
//
// Visuals are procedural only: a glossy near-black body, a fanned tail,
// shoulder-pivoted wings. No imagery, generated or otherwise.

import * as THREE from 'three';
import { S } from '../state.js';
import { groundHeight } from '../world/world.js';
import { sfx } from './audio.js';
import { toast } from '../ui/hud.js';
import { spawnFood } from './food.js';
import { isOnGroundLow, setCarriedVisual } from './player.js';

// ---------------------------------------------------------------- tuning
const ANCHORS = [
  [128, 56],   // the pretzel cart - a professional posting
  [52, -22],   // the Common blankets - amateur hour, easy pickings
  [-118, 26],  // the Garden, east end of the bridge - the fancy one
];
const PERCH_LIFT = 3.3;      // lamp height: perch y = ground + this
const STALK_TIME = 3.5;      // seconds of qualifying to earn a swoop
const STALK_RANGE = 13;      // horizontal metres, crow to player
const WARN_REMAINING = 1.5;  // caw + toast when this much stalk is left
const WARN_THROTTLE = 20;    // per crow: at most one warning per 20 s
const SWOOP_SPEED = 9.5;     // m/s
const SWOOP_MAX = 3.5;       // seconds, then it gives up and goes home
const SNATCH_DIST = 0.65;    // crow to player-chest distance that lands it
const CARRY_SPEED = 7;       // m/s, homeward, with the prize
const RETURN_SPEED = 8;      // m/s, homeward, empty-beaked
const BITE_RANGE = 1.7;      // biteCrow reach (player.js gates the bite)
const GLOAT_TIME = 10;       // post-drop perch cooldown before re-stalking
const SULK_BITTEN = 60;      // a booped crow holds a grudge this long
const SULK_EMPTY = 8;        // ...and a crow that found no lunch, this long

const FOOD_COLORS = { acorn: 0x7a4a22, pretzel: 0xa06a28, sandwich: 0xe3d3a2, peanut: 0xc8a86a };

// ----------------------------------------------------------------- state
const crows = [];
const feathers = [];         // live bite-tax particles, updated below
let _scene = null;
let _time = 0;               // seconds since build (warning throttle clock)
let _shotDone = false;       // screenshot tableau has been posed

// Reused temps - the update loop allocates nothing per frame.
const _target = new THREE.Vector3();
const _chest = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _featherGeo = new THREE.PlaneGeometry(0.09, 0.05);

// ------------------------------------------------------------------ mesh
// One procedural crow, ~45 cm of glossy bad intentions. Forward is +Z
// (head/beak at +Z, tail at -Z), same convention as the dogs and Hawk Dua.
function makeCrowMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x191c22, roughness: 0.55, metalness: 0.2, // the sheen is the point
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.1 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x35322c, roughness: 0.9 });

  // body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bodyMat);
  body.scale.set(1, 0.9, 1.4);
  body.castShadow = true;
  g.add(body);

  // head + cone beak (dark grey), on a group so idle tilts read
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), bodyMat);
  skull.scale.set(0.95, 0.92, 1.05);
  skull.castShadow = true;
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.13, 6), darkMat);
  beak.rotation.x = Math.PI / 2; // cone tip forward, +Z
  beak.position.set(0, -0.01, 0.13);
  head.add(beak);
  head.position.set(0, 0.07, 0.2);
  g.add(head);

  // tail: three flattened boxes fanned at the back, angled down
  const tail = new THREE.Group();
  const tailGeo = new THREE.BoxGeometry(0.085, 0.016, 0.24);
  for (const a of [-0.28, 0, 0.28]) {
    const f = new THREE.Mesh(tailGeo, bodyMat);
    f.rotation.y = a;
    f.position.set(Math.sin(a) * 0.05, 0, -Math.cos(a) * 0.05);
    tail.add(f);
  }
  tail.rotation.x = -0.4; // angled down
  tail.position.set(0, 0.02, -0.24);
  g.add(tail);

  // wings: flattened boxes on shoulder pivots. rotation.z is the flap -
  // left wing up is negative, right wing up is positive (hawk convention).
  function makeWing(side) {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.018, 0.2), bodyMat);
    wing.position.set(side * 0.19, 0, -0.02);
    wing.rotation.y = side * -0.15; // swept slightly back
    wing.castShadow = true;
    pivot.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.15), darkMat);
    tip.position.set(side * 0.42, 0, -0.06);
    tip.rotation.y = side * -0.3;
    pivot.add(tip);
    pivot.position.set(side * 0.08, 0.07, 0.03);
    g.add(pivot);
    return pivot;
  }
  const wingL = makeWing(-1);
  const wingR = makeWing(1);

  // little legs, visible when perched, tucked away in flight
  const legs = new THREE.Group();
  for (const sx of [-0.05, 0.05]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 5), legMat);
    leg.position.set(sx, -0.15, 0.02);
    legs.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.07), legMat);
    foot.position.set(sx, -0.22, 0.04);
    legs.add(foot);
  }
  g.add(legs);

  // the prize: a small tinted sphere standing in for stolen food, carried
  // under the body. Hidden until a snatch fills it.
  const proxyMat = new THREE.MeshStandardMaterial({ color: 0xa06a28, roughness: 0.9 });
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), proxyMat);
  proxy.scale.set(1, 0.75, 1.25);
  proxy.position.set(0, -0.16, 0.1);
  proxy.visible = false;
  g.add(proxy);

  g.userData = { wingL, wingR, head, tail, legs, proxy, proxyMat };
  return g;
}

// ----------------------------------------------------------------- build
export function buildCrows(scene) {
  _scene = scene;
  const lamps = S.lamps || [];
  for (let i = 0; i < ANCHORS.length; i++) {
    const [ax, az] = ANCHORS[i];
    // perch = the lamp nearest this crow's anchor (fixed point if the
    // park somehow has no lamps), 3.3 m up - lamp-top height.
    let px = ax, pz = az, bd = Infinity;
    for (const lamp of lamps) {
      const d = Math.hypot(lamp.x - ax, lamp.z - az);
      if (d < bd) { bd = d; px = lamp.x; pz = lamp.z; }
    }
    const perch = new THREE.Vector3(px, groundHeight(px, pz) + PERCH_LIFT, pz);
    const mesh = makeCrowMesh();
    mesh.position.copy(perch);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    crows.push({
      mesh,
      pos: perch.clone(),       // live position (mesh.position mirrors it)
      perch,                    // home. everything returns here eventually.
      state: 'PERCH',
      phase: Math.random() * 9, // idle-animation offset, per crow
      flapPhase: Math.random() * 9,
      animT: Math.random() * 10,
      hopT: 2 + Math.random() * 4, // seconds to the next idle hop-turn
      targetYaw: mesh.rotation.y,
      stalkT: 0,                // stalk build-up, 0..STALK_TIME
      warnedStalk: false,       // the caw for THIS stalk has been spent
      lastWarnT: -Infinity,     // _time of the last warning (throttle)
      gloatT: 0,                // post-drop cooldown before it can stalk
      sulkT: 0,                 // SULK timer
      returnSulk: 0,            // sulk owed once a RETURN lands (0 = none)
      timer: 0,                 // generic state timer (DROP)
      swoopFrom: new THREE.Vector3(),
      swoopT: 0, swoopDur: 1,
      stolenType: null,         // food type in the proxy, when carrying
      shotFrozen: false,        // screenshot tableau: skip the state machine
    });
  }
  return crows;
}

// --------------------------------------------------------------- helpers
function lerpAngle(cur, target, t) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * Math.min(1, t);
}

// Wing pose from a single flap value: positive = wings up.
function setWings(c, flap) {
  const u = c.mesh.userData;
  u.wingL.rotation.z = -flap;
  u.wingR.rotation.z = flap;
}
function flapWings(c, dt, rate, amp, base = 0) {
  c.flapPhase += dt * rate;
  setWings(c, base + Math.sin(c.flapPhase) * amp);
}
function setLegs(c, visible) {
  c.mesh.userData.legs.visible = visible;
}

// The one qualification rule, in one place (dogs use isOnGroundLow for
// the same "exposed on the ground" idea): carrying food, down low, out
// in the open, and close enough for the crow to care.
function qualifies(c) {
  const P = S.player;
  if (!P || !P.pos || !S.carried) return false;
  if (P.inHollow || P.inBurrow) return false;
  if (!isOnGroundLow()) return false;
  return Math.hypot(P.pos.x - c.pos.x, P.pos.z - c.pos.z) < STALK_RANGE;
}

function startReturn(c, sulkAfter) {
  c.state = 'RETURN';
  c.returnSulk = sulkAfter || 0;
  c.stalkT = 0;
  c.warnedStalk = false;
}

// Fly c.pos toward a target at speed; face the travel direction.
// Returns true on arrival (position snapped to the target).
function flyToward(c, target, speed, dt) {
  _dir.subVectors(target, c.pos);
  const dist = _dir.length();
  if (dist <= Math.max(0.05, speed * dt)) {
    c.pos.copy(target);
    return true;
  }
  _dir.divideScalar(dist);
  c.pos.addScaledVector(_dir, speed * dt);
  c.mesh.rotation.y = Math.atan2(_dir.x, _dir.z);
  // nose up when climbing, down when dropping (forward is +Z, so a
  // negative rotation.x tips the beak up)
  c.mesh.rotation.x = -Math.asin(Math.max(-1, Math.min(1, _dir.y))) * 0.7;
  c.mesh.position.copy(c.pos);
  return false;
}

// --------------------------------------------------------- feather tax
function spawnFeatherPuff(at) {
  if (!_scene) return;
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0x2a2d33 : 0x191c22,
      transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false,
    });
    const f = new THREE.Mesh(_featherGeo, mat);
    f.position.set(
      at.x + (Math.random() - 0.5) * 0.3,
      at.y + (Math.random() - 0.5) * 0.25,
      at.z + (Math.random() - 0.5) * 0.3
    );
    f.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    _scene.add(f);
    feathers.push({
      mesh: f, life: 0.7,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 0.6 + Math.random() * 1.1,
      vz: (Math.random() - 0.5) * 1.6,
      spin: 4 + Math.random() * 7,
    });
  }
}

function updateFeathers(dt) {
  for (let i = feathers.length - 1; i >= 0; i--) {
    const f = feathers[i];
    f.life -= dt;
    if (f.life <= 0) {
      if (_scene) _scene.remove(f.mesh);
      if (f.mesh.material) f.mesh.material.dispose();
      feathers.splice(i, 1);
      continue;
    }
    f.vy -= 5.5 * dt; // gravity, feather-discounted
    f.mesh.position.x += f.vx * dt;
    f.mesh.position.y += f.vy * dt;
    f.mesh.position.z += f.vz * dt;
    f.mesh.rotation.x += f.spin * dt;
    f.mesh.rotation.z += f.spin * 0.7 * dt;
    f.mesh.material.opacity = 0.95 * (f.life / 0.7);
  }
}

// --------------------------------------------------- screenshot tableau
// ?shot=crow: the player visibly holds a pretzel and crow #0 hangs frozen
// mid-swoop in front of them, wings mid-flap. The other crows stay on
// their perches and mind their business.
function setupShotTableau() {
  const P = S.player;
  const c = crows[0];
  if (!P || !P.pos || !c) return;
  S.carried = 'pretzel';
  setCarriedVisual('pretzel');
  // player forward on the ground plane, from yaw (player.js convention)
  _fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  c.pos.copy(P.pos).addScaledVector(_fwd, 1.3);
  c.pos.y = P.pos.y + 0.18 + 0.35; // chest height, plus a dramatic margin
  c.state = 'SWOOP';
  c.shotFrozen = true;
  c.mesh.position.copy(c.pos);
  _chest.copy(P.pos); _chest.y += 0.18;
  c.mesh.lookAt(_chest.x, _chest.y, _chest.z); // aimed at the player
  setWings(c, 0.45);                           // mid-flap, held
  c.mesh.userData.head.rotation.x = 0.25;
  setLegs(c, false);
  _shotDone = true;
}

// Perched idle, shared by PERCH and the tableau's bystander crows:
// occasional head tilts, a tail flick, a hop-turn every few seconds,
// wings folded, in no hurry whatsoever.
function idlePerched(c, dt) {
  const u = c.mesh.userData;
  c.animT += dt;
  c.mesh.rotation.x = 0;
  u.head.rotation.z = Math.sin(c.animT * 0.8 + c.phase) * 0.2;
  u.head.rotation.y = Math.sin(c.animT * 0.53 + c.phase * 2.1) * 0.45;
  u.head.rotation.x = Math.sin(c.animT * 0.61 + c.phase) * 0.08;
  // tail flick: a sharp little pulse every few seconds, not a wag
  const flick = Math.sin(c.animT * 0.9 + c.phase * 3.0) > 0.96 ? 0.3 : 0;
  u.tail.rotation.x = -0.4 + flick;
  // hop-turn: pick a new facing now and then, turn to it briskly
  c.hopT -= dt;
  if (c.hopT <= 0) {
    c.hopT = 3 + Math.random() * 4;
    c.targetYaw = Math.random() * Math.PI * 2;
  }
  c.mesh.rotation.y = lerpAngle(c.mesh.rotation.y, c.targetYaw, dt * 7);
  setWings(c, -0.62); // folded
  setLegs(c, true);
  c.mesh.position.copy(c.pos);
}

// ---------------------------------------------------------------- update
export function updateCrows(dt) {
  if (!crows.length) return;
  if (!(dt > 0)) dt = 0;
  _time += dt;
  updateFeathers(dt);
  const P = S.player;
  if (!P || !P.pos) return;

  const shotMode = !!(S.debugShot && S.shotPose === 'crow');
  if (shotMode && !_shotDone) setupShotTableau();

  for (const c of crows) {
    if (c.shotFrozen) continue;              // tableau crow #0: held pose
    if (shotMode) { idlePerched(c, dt); continue; } // bystanders stay put
    if (c.gloatT > 0) c.gloatT -= dt;
    const u = c.mesh.userData;

    switch (c.state) {
      case 'PERCH': {
        idlePerched(c, dt);
        if (c.gloatT <= 0 && qualifies(c)) {
          c.state = 'STALK';
          c.stalkT = 0;
          c.warnedStalk = false;
        }
        break;
      }

      case 'STALK': {
        // Indoors / underground ends it outright - no build-up survives.
        if (P.inHollow || P.inBurrow) {
          c.stalkT = 0;
          c.warnedStalk = false;
          c.state = 'PERCH';
          idlePerched(c, dt);
          break;
        }
        // Continuous qualification builds; a lapse decays at half rate.
        if (qualifies(c)) c.stalkT += dt;
        else c.stalkT = Math.max(0, c.stalkT - dt * 0.5);
        if (c.stalkT <= 0 && !qualifies(c)) { c.state = 'PERCH'; break; }

        const progress = Math.min(1, c.stalkT / STALK_TIME);
        // face the player, lean in as it commits, head down, watching
        c.targetYaw = Math.atan2(P.pos.x - c.pos.x, P.pos.z - c.pos.z);
        c.mesh.rotation.y = lerpAngle(c.mesh.rotation.y, c.targetYaw, dt * 6);
        c.mesh.rotation.x = 0.1 + 0.3 * progress;
        u.head.rotation.x = 0.3 * progress;
        u.head.rotation.z = Math.sin(_time * 2.2 + c.phase) * 0.06;
        u.head.rotation.y = 0;
        u.tail.rotation.x = -0.4 + progress * 0.15;
        // wings folded early, cracking half-open at the end
        setWings(c, -0.62 + Math.max(0, (progress - 0.45) / 0.55) * 0.77);
        setLegs(c, true);
        c.mesh.position.copy(c.pos);

        // the warning: one caw + one toast per stalk, throttled per crow
        if (!c.warnedStalk && STALK_TIME - c.stalkT <= WARN_REMAINING) {
          c.warnedStalk = true;
          if (_time - c.lastWarnT >= WARN_THROTTLE) {
            c.lastWarnT = _time;
            if (sfx.caw) sfx.caw();
            toast('a crow has noticed your lunch.', 2.6);
          }
        }
        if (c.stalkT >= STALK_TIME) {
          // SWOOP: leave the perch, target snapshot for the flight time
          c.state = 'SWOOP';
          c.swoopFrom.copy(c.pos);
          c.swoopT = 0;
          const d0 = Math.hypot(P.pos.x - c.pos.x, P.pos.y - c.pos.y, P.pos.z - c.pos.z);
          c.swoopDur = Math.max(0.35, Math.min(SWOOP_MAX, d0 / SWOOP_SPEED));
          c.warnedStalk = false;
          setLegs(c, false);
        }
        break;
      }

      case 'SWOOP': {
        // Counterplay landing mid-flight ends it: climbed, hollowed,
        // burrowed - the crow does not follow you up a tree. It has
        // standards and also wings it would rather use elsewhere.
        if (P.inHollow || P.inBurrow || !isOnGroundLow()) {
          startReturn(c, 0);
          break;
        }
        c.swoopT += dt;
        if (c.swoopT >= SWOOP_MAX) { startReturn(c, 0); break; }

        // lead the player a little - crows have done this before
        _target.copy(P.pos);
        if (P.vel) _target.addScaledVector(P.vel, 0.25);
        _target.y = P.pos.y + 0.18; // chest height
        const t = Math.min(1, c.swoopT / c.swoopDur);
        c.pos.lerpVectors(c.swoopFrom, _target, t);
        c.pos.y -= Math.sin(t * Math.PI) * 0.5; // shallow dive arc: dip, rise
        c.mesh.position.copy(c.pos);
        c.mesh.lookAt(_target.x, _target.y, _target.z);
        flapWings(c, dt, 26, 0.8);
        u.tail.rotation.x = -0.1;

        // snatch check, against the actual chest, not the lead point
        _chest.copy(P.pos); _chest.y += 0.18;
        if (c.pos.distanceTo(_chest) < SNATCH_DIST) {
          if (S.carried) {
            // SUCCESS. the lunch changes management.
            const type = S.carried;
            S.carried = null;
            setCarriedVisual(null);
            c.stolenType = type;
            u.proxyMat.color.setHex(FOOD_COLORS[type] || 0x999999);
            u.proxy.visible = true;
            if (sfx.caw) sfx.caw();
            toast('SNATCHED. the crow is taking your ' + type + ' home. rude. recoverable, though.', 3.6);
            c.state = 'CARRY';
          } else {
            // Arrived to empty paws (buried is the counterplay, and it
            // worked). Veer off, go home, sulk briefly about the insult.
            startReturn(c, SULK_EMPTY);
          }
        } else if (t >= 1) {
          // reached the spot and missed the moment - home, no prize
          startReturn(c, S.carried ? 0 : SULK_EMPTY);
        }
        break;
      }

      case 'CARRY': {
        // homeward at a laden pace, climbing back to the perch
        flapWings(c, dt, 17, 0.6);
        setLegs(c, false);
        if (flyToward(c, c.perch, CARRY_SPEED, dt)) {
          c.mesh.rotation.set(0, c.mesh.rotation.y, 0);
          c.state = 'DROP';
          c.timer = 0.35;
        }
        break;
      }

      case 'DROP': {
        // the prize goes over the side at the perch base - on the
        // ground, in the open, entirely recoverable. that's the deal.
        if (c.stolenType) {
          spawnFood(c.stolenType, c.perch.x, c.perch.z);
          c.stolenType = null;
          u.proxy.visible = false;
        }
        flapWings(c, dt, 8, 0.3, -0.2);
        setLegs(c, true);
        c.mesh.position.copy(c.pos);
        c.timer -= dt;
        if (c.timer <= 0) {
          c.state = 'PERCH';
          c.gloatT = GLOAT_TIME; // a professional savours the win
          c.stalkT = 0;
        }
        break;
      }

      case 'RETURN': {
        flapWings(c, dt, 20, 0.7);
        setLegs(c, false);
        if (flyToward(c, c.perch, RETURN_SPEED, dt)) {
          c.mesh.rotation.set(0, c.mesh.rotation.y, 0);
          if (c.returnSulk > 0) {
            c.state = 'SULK';
            c.sulkT = c.returnSulk;
            c.returnSulk = 0;
          } else {
            c.state = 'PERCH';
          }
          c.stalkT = 0;
        }
        break;
      }

      case 'SULK': {
        // hunched on the perch, no stalking, dignity under repair
        c.mesh.position.set(c.perch.x, c.perch.y - 0.05, c.perch.z);
        c.mesh.rotation.x = 0.32;
        u.head.rotation.x = 0.45;
        u.head.rotation.z = 0.15;
        u.head.rotation.y = 0;
        u.tail.rotation.x = -0.55;
        setWings(c, -0.78); // folded tight
        setLegs(c, true);
        c.sulkT -= dt;
        if (c.sulkT <= 0) {
          c.state = 'PERCH';
          c.mesh.rotation.x = 0;
          u.head.rotation.x = 0;
        }
        break;
      }

      default: c.state = 'PERCH'; break;
    }
  }
}

// ------------------------------------------------------------------ bite
// Called through S.onBite in main.js, in the same chain as biteDogs /
// biteRanger / biteHawk. The bite itself is gated by player.js tryBite()
// (cooldown and all) before S.onBite ever fires - this just answers the
// question "was a crow in range and in a boopable mood?"
export function biteCrow() {
  const P = S.player;
  if (!P || !P.pos) return false;
  for (const c of crows) {
    if (c.state !== 'SWOOP' && c.state !== 'STALK') continue;
    if (c.pos.distanceTo(P.pos) >= BITE_RANGE) continue;
    // booped. feathers are paid, the crow goes home to remember this.
    spawnFeatherPuff(c.pos);
    sfx.boop();
    if (sfx.caw) sfx.caw();
    toast('crow booped. it remembers.', 2.4);
    if (c.state === 'SWOOP') {
      startReturn(c, SULK_BITTEN); // sulk starts when it lands
    } else {
      c.state = 'SULK';
      c.sulkT = SULK_BITTEN;
      c.stalkT = 0;
      c.warnedStalk = false;
    }
    return true;
  }
  return false;
}
