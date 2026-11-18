// SCURRY save regression suite. No browser, npm, bundler or Three.js needed.
// Imports the production source with only S/audio dependencies stubbed, so
// dawn tracking, dirty-checking, storage exceptions and schema guards run real.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const source = readFileSync(new URL('../js/systems/save.js', import.meta.url), 'utf8');
async function harness(storage, initial = {}) {
  const S = { stash: 0, caps: 0, muted: false, timeHours: 17.6, ...initial };
  let muted = false;
  globalThis.__scurryTestS = S;
  globalThis.__scurryTestAudio = { get: () => muted, set: m => { muted = !!m; } };
  if (storage === undefined) delete globalThis.localStorage;
  else Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => storage });
  const body = source
    .replace("import { S } from '../state.js';", 'const S = globalThis.__scurryTestS;')
    .replace("import { isMuted, setMuted } from './audio.js';",
      'const isMuted = () => globalThis.__scurryTestAudio.get();\nconst setMuted = m => globalThis.__scurryTestAudio.set(m);');
  assert.ok(!body.includes("import {"), 'dependency stubs must match source imports');
  const mod = await import('data:text/javascript;base64,' + Buffer.from(body + '\n// ' + Math.random()).toString('base64'));
  return { S, ...mod, getMuted: () => muted, setMuted: m => { muted = !!m; } };
}
function memoryStore(initial = null) {
  let raw = initial, writes = 0;
  return { getItem: () => raw, setItem: (k, v) => { raw = v; writes++; },
    get raw() { return raw; }, get writes() { return writes; } };
}
test('first session with no save does not emit writes until something changes', async () => {
  const s = memoryStore();
  const h = await harness(s);
  assert.equal(h.loadSave().exists, false);
  h.observeSave();
  assert.equal(s.writes, 0);
  h.S.stash = 3; h.S.caps = 2; h.observeSave();
  assert.equal(s.writes, 1);
  assert.deepEqual([JSON.parse(s.raw).stash, JSON.parse(s.raw).caps], [3, 2]);
  h.observeSave();
  assert.equal(s.writes, 1);
});
test('persisted values load, sanitize and update audio without rewrite', async () => {
  const s = memoryStore(JSON.stringify({ v: 1, stash: 5.9, caps: 7.2, bestDays: 3,
    daysPlayed: 8, muted: true, savedAt: 12345 }));
  const h = await harness(s);
  const save = h.loadSave();
  assert.equal(save.exists, true);
  assert.deepEqual([h.S.stash, h.S.caps, save.bestDays, save.daysPlayed], [5, 7, 3, 8]);
  assert.equal(h.getMuted(), true);
  h.observeSave();
  assert.equal(s.writes, 0);
  h.S.caps = 4;
  h.observeSave();
  assert.equal(s.writes, 1);
  assert.deepEqual([JSON.parse(s.raw).stash, JSON.parse(s.raw).caps], [5, 4]);
});
test('corrupted JSON and blocked localStorage do not throw', async () => {
  const bad = await harness(memoryStore('{nope'));
  assert.equal(bad.loadSave().exists, false);
  bad.S.stash = 2;
  assert.doesNotThrow(() => bad.observeSave());
  const denied = { getItem() { throw Error('private'); },
    setItem() { throw Error('quota'); } };
  const h = await harness(denied);
  assert.equal(h.loadSave().exists, false);
  h.S.stash = 3;
  assert.doesNotThrow(() => h.observeSave());
});
test('unsupported future save stays byte-for-byte intact', async () => {
  const raw = JSON.stringify({ v: 99, stash: 100, futurePerks: ['rainbow tail'] });
  const s = memoryStore(raw);
  const h = await harness(s);
  assert.equal(h.loadSave().exists, false);
  h.S.stash = 10; h.S.caps = 30; h.observeSave();
  assert.equal(s.raw, raw);
  assert.equal(s.writes, 0);
});
test('write payload sanitizes invalid live stash and bottle caps', async () => {
  const s = memoryStore(), h = await harness(s);
  h.loadSave(); h.observeSave();
  h.S.stash = -5; h.S.caps = Infinity; h.setMuted(true); h.observeSave();
  const data = JSON.parse(s.raw);
  assert.deepEqual([data.stash, data.caps, data.muted], [0, 0, true]);
});
test('midnight wrap counts no day; next dawn increments exactly once', async () => {
  const s = memoryStore(), h = await harness(s, { timeHours: 23.95 });
  h.loadSave();
  h.observeSave(); // first observation seeds, not a day
  h.S.timeHours = 0.04; h.observeSave();
  assert.equal(h.S.save.daysPlayed, 0);
  h.S.timeHours = 5.99; h.observeSave();
  h.S.timeHours = 6.01; h.observeSave();
  assert.deepEqual([h.S.save.daysPlayed, h.S.save.bestDays, h.S.save.currentRunDays], [1, 1, 1]);
  h.S.timeHours = 6.20; h.observeSave();
  assert.equal(h.S.save.daysPlayed, 1);
});
