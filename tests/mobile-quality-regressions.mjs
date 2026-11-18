import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const src=readFileSync(new URL('../js/systems/mobile-quality.js',import.meta.url),'utf8');
const {createMobileQualityState,advanceMobileQuality:step} =
  await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
function simulate(state,fps,seconds) {
  for(let i=0;i<fps*seconds;i++) step(state,1/fps);
}
test('smooth sustained 60fps keeps full quality',()=>{
  const s=createMobileQualityState();simulate(s,60,35);
  assert.equal(s.tier,0);assert.ok(s.fpsEma>59);
});
test('real 20fps slow frames step graphics quality down progressively',()=>{
  const s=createMobileQualityState();
  simulate(s,20,5);assert.ok(s.tier>=1 && s.tier<=2);
  simulate(s,20,12);assert.equal(s.tier,3);
  assert.ok(s.fpsEma>=19 && s.fpsEma<=21);
});
test('quality returns slowly after sustained 60fps; no immediate oscillation',()=>{
  const s=createMobileQualityState();
  simulate(s,20,20);assert.equal(s.tier,3);
  simulate(s,60,8);assert.equal(s.tier,3,'8 seconds is intentionally too short for upgrade');
  simulate(s,60,40);assert.equal(s.tier,0,'recover all tiers after sustained fast frames');
});
test('performance dead band between thresholds prevents tier thrashing',()=>{
  const s=createMobileQualityState();
  simulate(s,45,20);assert.equal(s.tier,0);
  assert.ok(s.fpsEma>40 && s.fpsEma<50);
});
test('invalid/zero and background-resume frames are ignored',()=>{
  const s=createMobileQualityState();
  for(const t of [0,NaN,Infinity,-1,20])assert.equal(step(s,t),0);
  assert.equal(s.fpsEma,60);
});
test('slow-frame accumulator uses elapsed wall time rather than the 50ms physics cap',()=>{
  const s=createMobileQualityState();
  simulate(s,4,6);
  assert.ok(s.tier>=1,'a 4fps phone must downgrade within wall-time 6 seconds');
});
