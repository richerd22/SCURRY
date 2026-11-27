import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const source = readFileSync(new URL('../js/systems/camera-feel.js', import.meta.url), 'utf8');
const { BASE_FOV, SPRINT_FOV, targetFov, stepFov } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('sprint FOV only opens for grounded, moving, non-climbing sprint', () => {
  assert.equal(targetFov({ sprinting: true, grounded: true, moving: true }), SPRINT_FOV);
  assert.equal(targetFov({ sprinting: true, grounded: false, moving: true }), BASE_FOV);
  assert.equal(targetFov({ sprinting: true, grounded: true, moving: false }), BASE_FOV);
  assert.equal(targetFov({ sprinting: true, grounded: true, moving: true, climbing: true }), BASE_FOV);
  assert.equal(targetFov({}), BASE_FOV);
  assert.ok(SPRINT_FOV > BASE_FOV && SPRINT_FOV - BASE_FOV <= 6, 'kick stays subtle');
});
test('stepFov eases frame-rate independently and snaps at the end', () => {
  let a = BASE_FOV; for (let i = 0; i < 120; i++) a = stepFov(a, SPRINT_FOV, 1 / 60);
  assert.equal(a, SPRINT_FOV);
  assert.equal(stepFov(BASE_FOV, SPRINT_FOV, 0), BASE_FOV);
  assert.equal(stepFov(NaN, SPRINT_FOV, 0.016), SPRINT_FOV);
  const mid = stepFov(BASE_FOV, SPRINT_FOV, 0.05);
  assert.ok(mid > BASE_FOV && mid < SPRINT_FOV);
});
test('player camera uses the feel module outside debug shots; discoveries toast on unlock', () => {
  const p = readFileSync(new URL('../js/systems/player.js', import.meta.url), 'utf8');
  assert.match(p, /stepFov\(camera\.fov, targetFov\(P\), dt\)/);
  assert.match(p, /!S\.debugShot/);
  const d = readFileSync(new URL('../js/systems/discoveries.js', import.meta.url), 'utf8');
  assert.match(d, /field note: /);
  assert.match(d, /FIELD NOTES complete/);
});
