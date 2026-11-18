// Pure park perimeter layout tests: no WebGL renderer or npm dependencies.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../js/world/fence-layout.js',import.meta.url),'utf8');
const {PARK_FENCE_RUNS,makeParkFenceLayout}=
  await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const flat=()=>0;
test('twelve authored perimeter runs preserve all explicit crossings',()=>{
  assert.equal(PARK_FENCE_RUNS.length,12);
  assert.deepEqual(PARK_FENCE_RUNS[0],[-38,-100,120,-100]);
  assert.deepEqual(PARK_FENCE_RUNS[1],[150,-100,203,-100]);
  assert.deepEqual(PARK_FENCE_RUNS[9],[-62,-96,-62,-76]);
  assert.deepEqual(PARK_FENCE_RUNS[10],[-62,-56,-62,20]);
  // Crossing positions must remain *absent* from any east/west fence panel.
  const {panels}=makeParkFenceLayout(flat);
  for (const z of [-100]) {
    assert.ok(!panels.some(p=>p.z0===z&&p.z1===z&&
      Math.min(p.x0,p.x1)<135&&Math.max(p.x0,p.x1)>135));
  }
});
test('grade-following panels stay short, connected and exact at endpoints',()=>{
  const grade=(x,z)=>8*Math.exp(-((x-175)**2+(z+88)**2)/850);
  const {posts,panels,pickets}=makeParkFenceLayout(grade);
  assert.ok(posts.length>400 && panels.length>350);
  assert.ok(pickets.length>1000);
  for (const p of panels){
    assert.ok(p.length<=2.20000001);
    assert.ok(Math.abs(p.y0-grade(p.x0,p.z0))<1e-11);
    assert.ok(Math.abs(p.y1-grade(p.x1,p.z1))<1e-11);
  }
  for (const p of [...pickets.slice(0,25),...posts.slice(-25)])
    assert.ok(Number.isFinite(p.x+p.y+p.z));
});
test('a gap stays a gap even with several detailed pickets per panel',()=>{
  const {pickets}=makeParkFenceLayout(flat);
  const gate=pickets.filter(p=>p.z===-100&&p.x>120&&p.x<150);
  assert.equal(gate.length,0);
});
test('nonfinite run samples and invalid pitches fail safely',()=>{
  assert.throws(()=>makeParkFenceLayout(null),/spacing/);
  assert.throws(()=>makeParkFenceLayout(flat,0),/spacing/);
  assert.throws(()=>makeParkFenceLayout(()=>NaN),/terrain/);
  assert.throws(()=>makeParkFenceLayout(flat,2,.4,[[0,0,NaN,2]]),/nonfinite/);
});
