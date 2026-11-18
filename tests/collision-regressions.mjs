// SCURRY physics regressions. Run: node --test tests/collision-regressions.mjs
// Pure math; no build tool, WebGL context, Three.js or asset network required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
// Data URL works even in Node releases that assume .js is CommonJS without package.json.
const src = readFileSync(new URL('../js/systems/collision.js', import.meta.url), 'utf8');
const collision = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const { meshTerrainHeight, walkSurface, resolveHorizontal } = collision;

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

test('indexed walk surfaces match legacy full scan for 3000 seeded positions', () => {
  const discs = [], boxes = [], segments = [];
  let seed = 731;
  const rnd = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 75; i++) {
    const x = -90 + rnd() * 180, z = -90 + rnd() * 180;
    discs.push({ x, z, y: rnd() * 16, r: .2 + rnd() * 5 });
    boxes.push({ minX: x - rnd() * 2, maxX: x + rnd() * 3,
      minZ: z - rnd() * 3, maxZ: z + rnd() * 2, y: rnd() * 16 });
    segments.push({ x0: x, z0: z, x1: x + rnd() * 14 - 7,
      z1: z + rnd() * 14 - 7, r: .1 + rnd(), y: rnd() * 16, jumpOnly: i % 7 === 0 });
  }
  const idx = collision.createSurfaceIndex(discs, boxes, segments);
  for (let i = 0; i < 3000; i++) {
    const x = -110 + rnd() * 220, z = -110 + rnd() * 220;
    const y = rnd() * 18, tol = rnd() * 1.5;
    assert.equal(walkSurface(x, z, y, tol, -1, discs, boxes, segments, idx),
      walkSurface(x, z, y, tol, -1, discs, boxes, segments), 'sample ' + i);
  }
});

test('late registrations and removals rebuild the support index', () => {
  const discs = [], boxes = [], segments = [];
  const idx = collision.createSurfaceIndex(discs, boxes, segments);
  assert.equal(walkSurface(1, 1, 2, 0, 0, discs, boxes, segments, idx), 0);
  const generation = idx.generation;
  discs.push({ x: 1, z: 1, r: 2, y: 1 });
  assert.equal(walkSurface(1, 1, 2, 0, 0, discs, boxes, segments, idx), 1);
  assert.ok(idx.generation > generation);
  discs.pop();
  assert.equal(walkSurface(1, 1, 2, 0, 0, discs, boxes, segments, idx), 0);
});

test('index respects negative cell edges, rail jump gates and giant surfaces', () => {
  const discs = [{ x: -8, z: -8, r: .2, y: 9 }];
  const boxes = [{ minX: -500, maxX: 500, minZ: 500, maxZ: 550, y: 4 }];
  const segments = [{ x0: -8, z0: -16, x1: 8, z1: 0,
    r: .25, y: 10, jumpOnly: true }];
  const idx = collision.createSurfaceIndex(discs, boxes, segments);
  for (const [x, z, y] of [[-8, -8, 10], [-7.9, -8.1, 10], [0, 530, 6],
    [-8, -8, 0], [-500, 500, 5], [500, 550, 5], [8, 0, 10]]) {
    assert.equal(walkSurface(x, z, y, .1, 0, discs, boxes, segments, idx),
      walkSurface(x, z, y, .1, 0, discs, boxes, segments));
  }
});


test('dense but escapable four-trunk corner resolves actual overlap, not only index parity', () => {
  // Deterministic witness: the old two-pass solver left 7.5cm of trunk
  // penetration, while a valid collision-free position exists.
  const circles = [
    {x:-.4702143853,z:.4257036466,r:.8091047824,minY:-1,maxY:3},
    {x:-1.1306546454,z:.5693055805,r:.5275426327,minY:-1,maxY:3},
    {x:1.2561824143,z:-.5615105334,r:.8156325277,minY:-1,maxY:3},
    {x:.2878523179,z:-1.4238528925,r:.3025651448,minY:-1,maxY:3},
  ];
  const radius=.22;
  for(const indexed of [false,true]){
    const p={x:.0364760479,y:0,z:.1532662722};
    const index=indexed?collision.createObstacleIndex(circles,[],[],radius):null;
    resolveHorizontal(p,circles,[],[],radius,null,index);
    for(const c of circles){
      const clearance=Math.hypot(p.x-c.x,p.z-c.z)-(c.r+radius);
      assert.ok(clearance>=-.001,
        'solver must not leave squirrel buried inside tree: '+clearance+' indexed='+indexed);
    }
  }
});
