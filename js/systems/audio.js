// SCURRY - tiny procedural WebAudio. Everything synthesized, nothing loaded.
// All calls are fire-and-forget and wrapped so audio can never break the game.

let ctx = null;
let master = null;
let muted = false;
let gameAudioPaused = false;

function changeContextState(action) {
  if (!ctx || typeof ctx[action] !== 'function') return;
  try {
    const operation = ctx[action]();
    if (operation && operation.catch) operation.catch(() => {});
  } catch (_) { /* browser audio policy cannot break movement */ }
}
export function isGameAudioPaused() { return gameAudioPaused; }
export function setGameAudioPaused(paused) {
  gameAudioPaused = !!paused;
  if (gameAudioPaused) stopAmbience();
  if (!ctx) return;
  if (gameAudioPaused && ctx.state === 'running') changeContextState('suspend');
  if (!gameAudioPaused && ctx.state === 'suspended') changeContextState('resume');
  if (!gameAudioPaused && !muted) startAmbience();
}

export function initAudio() {
  if (ctx) {
    if (!gameAudioPaused && ctx.state === 'suspended') changeContextState('resume');
    if (!gameAudioPaused && !muted) startAmbience();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    if (!gameAudioPaused && !muted) startAmbience();
    if (gameAudioPaused) changeContextState('suspend');
  } catch (e) { ctx = null; }
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : 0.5;
  if (muted) stopAmbience();
  else if (ctx && !gameAudioPaused) startAmbience();
}
export function isMuted() { return muted; }

function env(gainNode, t0, a, peak, d) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
  g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function tone(freqA, freqB, dur, type, peak, when = 0) {
  if (!ctx || muted || gameAudioPaused) return;
  try {
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freqA, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(freqB, 1), t0 + dur);
    env(g, t0, 0.012, peak || 0.2, dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.1);
  } catch (e) {}
}

function noiseBurst(dur, filterFreq, peak, when = 0, type = 'bandpass') {
  if (!ctx || muted || gameAudioPaused) return;
  try {
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, (dur * ctx.sampleRate) | 0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq; f.Q.value = 0.9;
    const g = ctx.createGain();
    env(g, t0, 0.01, peak || 0.15, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  } catch (e) {}
}

// --- game sounds ---
export const sfx = {
  squeak() { tone(1400, 2100, 0.09, 'sine', 0.22); tone(1800, 2400, 0.07, 'sine', 0.12, 0.05); },
  chomp() { noiseBurst(0.06, 900, 0.25); noiseBurst(0.05, 700, 0.2, 0.09); },
  dig() { for (let i = 0; i < 4; i++) noiseBurst(0.07, 500 + Math.random() * 300, 0.16, i * 0.09); },
  boop() { tone(500, 180, 0.12, 'square', 0.16); },
  yelp() { tone(900, 1500, 0.1, 'sawtooth', 0.14); tone(1200, 800, 0.12, 'sawtooth', 0.12, 0.09); },
  bark() { noiseBurst(0.09, 800, 0.3); tone(300, 160, 0.09, 'square', 0.18); noiseBurst(0.09, 750, 0.28, 0.16); tone(280, 150, 0.09, 'square', 0.16, 0.16); },
  toss() { tone(600, 900, 0.15, 'sine', 0.06); },
  splash() { noiseBurst(0.25, 1200, 0.12, 0, 'lowpass'); },
  caught() { tone(800, 200, 0.5, 'triangle', 0.25); },
  screech() {
    // Hawk Dua: harsh descending FM cry - a carrier screamed down from
    // ~2.6kHz with a rasping modulator, plus a noise layer for the rasp.
    if (!ctx || muted || gameAudioPaused) return;
    try {
      const t0 = ctx.currentTime;
      const dur = 0.7;
      const carrier = ctx.createOscillator(); carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(2600, t0);
      carrier.frequency.exponentialRampToValueAtTime(620, t0 + dur);
      const mod = ctx.createOscillator(); mod.type = 'square';
      mod.frequency.setValueAtTime(880, t0);
      mod.frequency.exponentialRampToValueAtTime(280, t0 + dur);
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(750, t0);
      modGain.gain.exponentialRampToValueAtTime(90, t0 + dur);
      mod.connect(modGain); modGain.connect(carrier.frequency);
      const g = ctx.createGain();
      env(g, t0, 0.015, 0.2, dur);
      carrier.connect(g); g.connect(master);
      carrier.start(t0); carrier.stop(t0 + dur + 0.1);
      mod.start(t0); mod.stop(t0 + dur + 0.1);
    } catch (e) {}
    noiseBurst(0.5, 2100, 0.13);
    tone(3100, 750, 0.55, 'sawtooth', 0.07, 0.02);
  },
  gossip() { tone(1100, 1300, 0.06, 'sine', 0.08); tone(1300, 1500, 0.06, 'sine', 0.08, 0.08); },
  clink() { tone(3400, 2900, 0.05, 'square', 0.07); tone(4300, 3800, 0.07, 'square', 0.05, 0.045); },
  honk() { tone(340, 260, 0.16, 'sawtooth', 0.2); tone(330, 250, 0.14, 'sawtooth', 0.14, 0.05); },
  caw() { tone(1150, 700, 0.13, 'sawtooth', 0.13); noiseBurst(0.1, 1800, 0.08); tone(1050, 650, 0.11, 'sawtooth', 0.1, 0.16); },
};

// --- ambience: sparse synthesized soundscape, keyed to the park clock ---
// This deliberately stays a small, infrequent foreground detail rather than
// a looping bed. It keeps the Common quiet enough for footsteps, dogs, geese
// and people to read, while dawn and night feel meaningfully different.
export function ambienceProfile(hour) {
  const h = ((Number.isFinite(hour) ? hour : 17.6) % 24 + 24) % 24;
  if (h >= 5.25 && h < 7.25) return 'dawn';
  if (h >= 7.25 && h < 16.5) return 'day';
  if (h >= 16.5 && h < 19.5) return 'golden';
  if (h >= 19.5 && h < 22.5) return 'evening';
  return 'night';
}

export function ambienceDelay(profile, random = Math.random) {
  const draw = random();
  const r = Math.max(0, Math.min(1, Number.isFinite(draw) ? draw : 0.5));
  // In milliseconds. Dawn gets a little more activity; deep night breathes.
  const range = profile === 'dawn' ? [2300, 3300] :
    profile === 'day' ? [3800, 5200] :
      profile === 'golden' ? [4800, 6200] :
        profile === 'evening' ? [3900, 5300] : [5200, 7000];
  return range[0] + (range[1] - range[0]) * r;
}

function playAmbience(profile) {
  if (profile === 'dawn') {
    // A few high, tentative calls before the busy park wakes up.
    const base = 2500 + Math.random() * 850;
    for (let i = 0; i < 2; i++) tone(base * (1 + i * 0.07), base * (0.92 + i * 0.08), 0.09, 'sine', 0.028, i * 0.18);
  } else if (profile === 'day') {
    // Daytime song is present but deliberately not constant.
    const base = 2200 + Math.random() * 1400;
    const n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) tone(base, base * (0.8 + Math.random() * 0.5), 0.07, 'sine', 0.035, i * 0.11);
  } else if (profile === 'golden') {
    // Fewer, lower calls as the daytime flock settles down.
    const base = 1700 + Math.random() * 900;
    for (let i = 0; i < 2; i++) tone(base * (1 + i * 0.1), base * (0.76 + i * 0.05), 0.11, 'triangle', 0.024, i * 0.2);
  } else if (profile === 'evening') {
    // The first crickets arrive under the last small bird calls.
    tone(3550, 3550, 0.035, 'sine', 0.012);
    tone(3720, 3720, 0.035, 'sine', 0.012, 0.09);
    if (Math.random() < 0.45) tone(1850, 1510, 0.1, 'triangle', 0.018, 0.22);
  } else {
    // Night is intentionally the quietest profile: a sparse insect trio,
    // not an exhausting wall of crickets.
    const base = 3950 + Math.random() * 500;
    for (let i = 0; i < 3; i++) tone(base * (1 + i * 0.025), base, 0.03, 'sine', 0.014, i * 0.075);
  }
}

let ambienceTimer = null;
function stopAmbience() {
  if (ambienceTimer !== null) {
    clearTimeout(ambienceTimer);
    ambienceTimer = null;
  }
}
function startAmbience() {
  if (ambienceTimer !== null || !ctx || muted || gameAudioPaused) return;
  const tick = () => {
    ambienceTimer = null;
    let profile = 'golden';
    if (ctx && !muted && !gameAudioPaused) {
      try {
        const hour = window.__scurryHour ? window.__scurryHour() : 17.6;
        profile = ambienceProfile(hour);
        playAmbience(profile);
      } catch (e) {}
    }
    // Never leave a recurring timer armed behind a pause/mute. Scheduling is
    // intentionally outside the synthesis try block: one failed oscillator
    // must not silence the rest of the session.
    if (ctx && !muted && !gameAudioPaused)
      ambienceTimer = setTimeout(tick, ambienceDelay(profile));
  };
  ambienceTimer = setTimeout(tick, 1500);
}
