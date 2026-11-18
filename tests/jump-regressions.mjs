// Run: node --test tests/jump-regressions.mjs (no build step).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const src = readFileSync(new URL('../js/systems/jump.js', import.meta.url), 'utf8');
const { advanceJumpIntent: tick, resetJumpIntent, JUMP_BUFFER_SECONDS, COYOTE_SECONDS } =
  await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const fresh = () => ({ held: false, buffer: 0, coyote: 0 });

test('holding jump launches once, not again on each landing', () => {
  const s = fresh();
  assert.equal(tick(s, true, true, false, .016), true);
  assert.equal(tick(s, true, false, false, .05), false);
  assert.equal(tick(s, true, true, false, .05), false);
  assert.equal(tick(s, false, true, false, .016), false);
  assert.equal(tick(s, true, true, false, .016), true);
});
test('coyote jump works shortly after leaving a platform', () => {
  const s = fresh();
  tick(s, false, true, false, .016);
  assert.equal(tick(s, true, false, false, COYOTE_SECONDS / 2), true);
});
test('coyote grace period expires', () => {
  const s = fresh();
  tick(s, false, true, false, .016);
  tick(s, false, false, false, COYOTE_SECONDS + .01);
  assert.equal(tick(s, true, false, false, .016), false);
});
test('jump slightly before landing is buffered', () => {
  const s = fresh();
  assert.equal(tick(s, true, false, false, .016), false);
  assert.equal(tick(s, true, false, false, JUMP_BUFFER_SECONDS / 2), false);
  assert.equal(tick(s, true, true, false, .016), true);
});
test('stale buffered presses expire', () => {
  const s = fresh();
  tick(s, true, false, false, .016);
  tick(s, true, false, false, JUMP_BUFFER_SECONDS + .01);
  assert.equal(tick(s, true, true, false, .016), false);
});
test('climbing accepts one intentional push-off', () => {
  const s = fresh();
  assert.equal(tick(s, true, false, true, .016), true);
  assert.equal(tick(s, true, false, true, .016), false);
});
test('focus loss clears stale inputs', () => {
  const s = fresh();
  tick(s, true, false, false, .016);
  resetJumpIntent(s);
  assert.deepEqual(s, fresh());
});
