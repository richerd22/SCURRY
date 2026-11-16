// SCURRY - tiny procedural WebAudio. Everything synthesized, nothing loaded.
// All calls are fire-and-forget and wrapped so audio can never break the game.

let ctx = null;
let master = null;
let muted = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    startAmbience();
  } catch (e) { ctx = null; }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() { return muted; }

function env(gainNode, t0, a, peak, d) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
  g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function tone(freqA, freqB, dur, type, peak, when = 0) {
  if (!ctx || muted) return;
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
  if (!ctx || muted) return;
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
    if (!ctx || muted) return;
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
};

// --- ambience: sparse synthesized birdsong by day, crickets by night ---
let ambienceTimer = null;
function startAmbience() {
  if (ambienceTimer) return;
  const tick = () => {
    if (ctx && !muted) {
      try {
        const hour = window.__scurryHour ? window.__scurryHour() : 17.6;
        if (hour > 5.5 && hour < 19.5) {
          // bird chirp cluster
          const base = 2200 + Math.random() * 1400;
          const n = 2 + (Math.random() * 3 | 0);
          for (let i = 0; i < n; i++) tone(base, base * (0.8 + Math.random() * 0.5), 0.07, 'sine', 0.035, i * 0.11);
        } else {
          // crickets
          for (let i = 0; i < 3; i++) tone(4200, 4200, 0.03, 'sine', 0.015, i * 0.06);
        }
      } catch (e) {}
    }
    ambienceTimer = setTimeout(tick, 2500 + Math.random() * 5000);
  };
  ambienceTimer = setTimeout(tick, 1500);
}
