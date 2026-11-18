// SCURRY physics regressions. Run: node --test tests/collision-regressions.mjs
// Pure math; no build tool, WebGL context, Three.js or asset network required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
// Data URL works even in Node releases that assume .js is CommonJS without package.json.
const src = readFileSync(new URL('../js/systems/collision.js', import.meta.url), 'utf8');
const { meshTerrainHeight, walkSurface, resolveHorizontal } =
  await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

test('the ground matches the two triangles of the rendered PlaneGeometry', () => {
  const g = new Float32Array([0, 0, 0, 2]);
  assert.equal(meshTerrainHeight(g, 0.25, 0.25, 0, 1, 0, 1, 1, 1), 0);
  assert.equal(meshTerrainHeight(g, 0.75, 0.75, 0, 1, 0, 1, 1, 1), 1);
  assert.equal(meshTerrainHeight(g, 2, 0.5, 0, 1, 0, 1, 1, 1), null);
});
test('platform queries never snap a grounded squirrel through a high canopy', () => {
  const trees = [{ x: 0, z: 0, r: 3, y: 10 }];
  assert.equal(walkSurface(0, 0, 0, 1.3, 0, trees, [], []), 0);
  assert.equal(walkSurface(0, 0, 9.9, 0.1, 0, trees, [], []), 10);
  assert.equal(walkSurface(3.5, 0, 10, 0.1, 0, trees, [], []), 0);
});
test('thin canopy highway boxes support feet at full height', () => {
  const b = [{ minX: 2, maxX: 2.55, minZ: -0.4, maxZ: 0.4, y: 8.6 }];
  assert.equal(walkSurface(2.22, 0, 8.7, 0.1, 0, [], b, []), 8.6);
  assert.equal(walkSurface(2.88, 0, 8.7, 0.1, 0, [], b, []), 0);
});
test('fences require a leap but the top rail is walkable', () => {
  const rails = [{ x0: 0, z0: 0, x1: 10, z1: 0, r: 0.19, y: 0.975, jumpOnly: true }];
  assert.equal(walkSurface(5, 0, 0, 1.3, 0, [], [], rails), 0);
  assert.equal(walkSurface(5, 0, 1.1, 0.1, 0, [], [], rails), 0.975);
});
test('tree trunks do not kick the squirrel off its canopy', () => {
  const c = [{ x: 0, z: 0, r: 0.62, minY: 0, maxY: 7.5 }];
  const high = { x: 0.1, y: 9, z: 0 };
  resolveHorizontal(high, c, [], [], 0.22);
  assert.equal(high.x, 0.1);
  const low = { x: 0.1, y: 0, z: 0 };
  resolveHorizontal(low, c, [], [], 0.22);
  assert.ok(Math.hypot(low.x, low.z) >= 0.84 - 1e-8);
});
test('building colliders stop at the roof, not at infinity', () => {
  const boxes = [{ minX: 3, maxX: 5, minZ: -1, maxZ: 1, minY: 0, maxY: 14 }];
  const roof = { x: 4, y: 14, z: 0 };
  resolveHorizontal(roof, [], boxes, [], 0.22);
  assert.equal(roof.x, 4);
  const wall = { x: 4, y: 1, z: 0 };
  resolveHorizontal(wall, [], boxes, [], 0.22);
  assert.ok(wall.x !== 4 || wall.z !== 0);
});
test('fence collision is continuous at its midpoint, not spaced circles', () => {
  const walls = [{ x0: 0, z0: 0, x1: 10, z1: 0, r: 0.05, minY: -2, maxY: 0.975 }];
  const p = { x: 5, y: 0, z: 0.03 };
  resolveHorizontal(p, [], [], walls, 0.22);
  assert.ok(p.z >= 0.27 - 1e-8);
  const airborne = { x: 5, y: 1.2, z: 0 };
  resolveHorizontal(airborne, [], [], walls, 0.22);
  assert.equal(airborne.z, 0);
});
test('spawn inside a trunk deterministically recovers, even at zero distance', () => {
  const p = { x: 0, y: 0, z: 0 };
  resolveHorizontal(p, [{ x: 0, z: 0, r: 0.5, minY: 0, maxY: 1 }], [], [], 0.22);
  assert.equal(p.x, 0.72);
});
test('remote realm surface tables are honored over the home park floor', () => {
  assert.equal(walkSurface(3000, 3000, 5.3, 0.1, 5.2, [], [], []), 5.2);
});
