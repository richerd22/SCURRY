import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
// v0.7.14: every ground-following actor must use visibleGroundHeight (the
// rendered mesh + path/plaza tops), never the analytic groundHeight alone,
// or it sinks into visible surfaces the player walks on top of.
for (const f of ['dogs.js', 'ranger.js', 'humans.js', 'wildlife.js']) {
  const src = readFileSync(new URL('../js/systems/' + f, import.meta.url), 'utf8');
  test(f + ' follows the visible ground surface', () => {
    assert.match(src, /visibleGroundHeight\(/, f + ' must call visibleGroundHeight');
  });
}
test('dogs feet, walker and probe all use the visible surface', () => {
  const src = readFileSync(new URL('../js/systems/dogs.js', import.meta.url), 'utf8');
  assert.match(src, /d\.pos\.y = visibleGroundHeight/);
  assert.match(src, /const wy=visibleGroundHeight/);
  assert.match(src, /dogProbe\.y = visibleGroundHeight/);
  assert.doesNotMatch(src, /d\.pos\.y = groundHeight/);
});
test('ranger and human walkers use the visible surface', () => {
  const r = readFileSync(new URL('../js/systems/ranger.js', import.meta.url), 'utf8');
  const h = readFileSync(new URL('../js/systems/humans.js', import.meta.url), 'utf8');
  assert.match(r, /ranger\.pos\.y = visibleGroundHeight/);
  assert.match(h, /const gy = visibleGroundHeight/);
});
