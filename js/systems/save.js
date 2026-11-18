// SCURRY - save persistence: localStorage, one key, no drama.
// Persists the LIVE stash, the best day count, and the mute setting across
// sessions. Everything is guarded: private mode, disabled storage, a full
// quota, or a corrupt blob must never throw into the game loop - the game
// just runs unsaved, like it's 1997.
//
// Storage key: "scurry-save-v1"
// Schema (JSON):
//   {
//     v: 1,            // schema version, for future migrations
//     stash: number,   // the LIVE stash, mirrored as-is (see below)
//     caps: number,    // bottle caps: the rat-market balance (burrows.js)
//     bestDays: number,// longest run, in days survived (dawn rule below)
//     daysPlayed: number, // cumulative days survived across ALL sessions
//     muted: boolean,  // the audio.js mute flag (mirrored onto S.muted)
//     savedAt: number, // Date.now() of the last successful write
//   }
//
// Caps semantics: S.caps is the live balance. burrows.js earns (+1 per
// cap collected) and spends (-3 per Exchange trade). The save mirrors it
// exactly like the stash: whatever the balance is right now is what gets
// written, on the same dirty-check - so a spend at the stall persists on
// the next frame's observe, no explicit save call at the trade site.
//
// Stash semantics: S.stash is the live stash. Burying adds +1 (food.js),
// a ranger catch raids 25% (ranger.js). The save mirrors whatever S.stash
// is right now - it is NOT a best/high-water stash. bestDays is the only
// "best" record kept.
//
// Day-count rule (the dawn-crossing rule, exactly):
//   - A "day survived" is counted when S.timeHours crosses DAWN_HOUR
//     (06:00) going forward. Crossing midnight (24 -> 0) counts NOTHING
//     by itself; the day lands at the next dawn.
//   - The game starts at 17.6 (golden hour), so the first dawn crossing
//     (~11.4 game-hours in, through the night) is day 1 survived, the
//     next dawn is day 2, and so on.
//   - Each dawn crossing: currentRunDays += 1 (this session, in-memory
//     only, on S.save), daysPlayed += 1 (cumulative, persisted), and
//     bestDays = max(bestDays, currentRunDays) (persisted).
//   - The first observeSave() call only seeds the previous-hour tracker,
//     so a ?t=<hour> shot-mode jump (or any load-time time set) before
//     the first frame can never fake a dawn crossing.
//
// Wiring (no main.js): hud.js calls loadSave() from initHUD() at boot and
// observeSave() from updateHUD() every frame. observeSave() is cheap:
// scalar comparisons only, no allocations, and JSON.stringify + setItem
// happen ONLY when a persisted value actually changed (dirty-check
// against the last successfully written snapshot). A failed write backs
// off for a few seconds instead of retrying every frame.

import { S } from '../state.js';
import { isMuted, setMuted } from './audio.js';

export const SAVE_KEY = 'scurry-save-v1';
const DAWN_HOUR = 6; // 06:00 - inside daycycle's 05:00-06:30 dawn phase
const WRITE_RETRY_MS = 5000;

// --- module state (no per-frame allocation; all scalars / one object) ---
let prevHours = null;      // last S.timeHours seen; null until first observe
let currentRunDays = 0;    // dawn crossings this session
let daysPlayed = 0;        // cumulative dawn crossings, persisted
let bestDays = 0;          // longest currentRunDays ever, persisted
// last successfully persisted snapshot (the dirty-check baseline)
let snapStash = null, snapCaps = null, snapBestDays = null, snapDaysPlayed = null, snapMuted = null;
let retryAfter = 0;        // Date.now() before which a failed write is not retried
let futureSchema = false; // don't overwrite a save created by a newer build

function getStore() {
  try {
    return (typeof globalThis !== 'undefined' && globalThis.localStorage) || null;
  } catch (e) {
    return null; // even *reading* localStorage can throw (blocked cookies etc.)
  }
}

function cleanCount(n) {
  return (typeof n === 'number' && Number.isFinite(n) && n > 0) ? Math.floor(n) : 0;
}

// Read + sanitize the stored blob. Returns null for absent/corrupt storage.
function readStored() {
  const store = getStore();
  if (!store) return null;
  let raw;
  try { raw = store.getItem(SAVE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  let data;
  try { data = JSON.parse(raw); } catch (e) { return null; } // corrupt: no save
  if (!data || typeof data !== 'object') return null;
  // Forward compatibility: an older game must not overwrite a newer
  // save it doesn't know how to interpret. Leave it untouched until an
  // updated game can read that version. Missing v is legacy-compatible.
  if (typeof data.v === 'number' && Number.isFinite(data.v) && data.v > 1) {
    futureSchema = true;
    return null;
  }
  return {
    stash: cleanCount(data.stash),
    caps: cleanCount(data.caps),
    bestDays: cleanCount(data.bestDays),
    daysPlayed: cleanCount(data.daysPlayed),
    muted: data.muted === true,
    savedAt: (typeof data.savedAt === 'number' && Number.isFinite(data.savedAt)) ? data.savedAt : null,
  };
}

function writeStored() {
  const store = getStore();
  if (!store) return false;
  const payload = {
    v: 1,
    stash: cleanCount(S.stash),
    caps: cleanCount(S.caps),
    bestDays,
    daysPlayed,
    muted: isMuted(),
    savedAt: Date.now(),
  };
  try {
    store.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (e) {
    retryAfter = Date.now() + WRITE_RETRY_MS; // quota / private mode: back off
    return false;
  }
  snapStash = payload.stash;
  snapCaps = payload.caps;
  snapBestDays = payload.bestDays;
  snapDaysPlayed = payload.daysPlayed;
  snapMuted = payload.muted;
  if (S.save) {
    S.save.stash = payload.stash;
    S.save.caps = payload.caps;
    S.save.bestDays = payload.bestDays;
    S.save.daysPlayed = payload.daysPlayed;
    S.save.muted = payload.muted;
    S.save.savedAt = payload.savedAt;
  }
  return true;
}

// Load the save (if any) and apply it: live stash, caps balance, bests,
// and mute. Safe to call before any user gesture - audio is gesture-gated,
// and setMuted() before initAudio() just sets the flag the sfx checks read.
// Returns S.save: { exists, stash, caps, bestDays, daysPlayed, muted,
// currentRunDays, savedAt }. Absent/corrupt storage -> exists:false and
// the game's defaults are left untouched.
export function loadSave() {
  futureSchema = false;
  const stored = readStored();
  currentRunDays = 0;
  prevHours = null;
  if (stored) {
    S.stash = stored.stash;
    S.caps = stored.caps;
    bestDays = stored.bestDays;
    daysPlayed = stored.daysPlayed;
    setMuted(stored.muted); // apply both ways - the stored setting wins
    S.muted = isMuted();
    // Baseline = what we just loaded, so observeSave() writes nothing
    // until something actually changes this session.
    snapStash = stored.stash;
    snapCaps = stored.caps;
    snapBestDays = stored.bestDays;
    snapDaysPlayed = stored.daysPlayed;
    snapMuted = stored.muted;
  } else {
    bestDays = 0;
    daysPlayed = 0;
    S.muted = isMuted();
    snapStash = S.stash;
    snapCaps = cleanCount(S.caps);
    snapBestDays = 0;
    snapDaysPlayed = 0;
    snapMuted = S.muted;
  }
  S.save = {
    exists: !!stored,
    stash: S.stash,
    caps: cleanCount(S.caps),
    bestDays,
    daysPlayed,
    muted: isMuted(),
    currentRunDays,
    savedAt: stored ? stored.savedAt : null,
  };
  return S.save;
}

// Per-frame observer, called from updateHUD(). Watches the dawn crossing,
// the live stash, and the mute flag; writes only on an actual change.
export function observeSave() {
  // --- dawn-crossing day count (see the rule in the header) ---
  const h = S.timeHours;
  if (typeof h === 'number' && Number.isFinite(h)) {
    if (prevHours === null) {
      prevHours = h; // seed only - a load-time time set is not a crossing
    } else {
      // Forward crossing of 06:00. A wrap (h < prevHours, 24 -> 0) is not
      // a dawn; the h - prevHours < 12 guard keeps any one-step jump from
      // counting more than the single crossing it actually spans.
      if (prevHours < DAWN_HOUR && h >= DAWN_HOUR && h - prevHours < 12) {
        currentRunDays++;
        daysPlayed++;
        if (currentRunDays > bestDays) bestDays = currentRunDays;
        if (S.save) S.save.currentRunDays = currentRunDays;
      }
      prevHours = h;
    }
  }

  // --- keep the runtime mirrors honest ---
  const m = isMuted();
  if (S.muted !== m) S.muted = m;
  if (S.save) {
    S.save.currentRunDays = currentRunDays;
    S.save.stash = S.stash;
    S.save.caps = cleanCount(S.caps);
    S.save.bestDays = bestDays;
    S.save.daysPlayed = daysPlayed;
    S.save.muted = m;
  }

  // --- dirty-check: write only when a persisted value changed ---
  if (cleanCount(S.stash) === snapStash && cleanCount(S.caps) === snapCaps &&
      bestDays === snapBestDays &&
      daysPlayed === snapDaysPlayed && m === snapMuted) return;
  if (futureSchema) return; // preserve unknown newer save verbatim
  if (Date.now() < retryAfter) return; // last write failed; don't hammer it
  writeStored();
}
