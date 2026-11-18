import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const src=readFileSync(new URL('../js/systems/swan-ride-rules.js',import.meta.url),'utf8');
const {swanRidePose,SWAN_RIDE_SECONDS,SWAN_DOCK}=await import(
  'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('swan boat tour is finite and returns exactly to its real dock',()=>{
  const a=swanRidePose(0),b=swanRidePose(1);
  assert.equal(SWAN_RIDE_SECONDS,56);
  assert.ok(Math.hypot(a.x-SWAN_DOCK.x,a.z-SWAN_DOCK.z)<.00001);
  assert.ok(Math.hypot(b.x-SWAN_DOCK.x,b.z-SWAN_DOCK.z)<.00001);
  assert.ok(Number.isFinite(a.yaw)&&Number.isFinite(b.yaw));
  assert.throws(()=>swanRidePose(NaN),RangeError);
});
test('every boat centre stays in west lagoon, outside bridge and existing western boat lane',()=>{
  let length=0,prev=swanRidePose(0);
  for(let i=0;i<=2000;i++){
    const p=swanRidePose(i/2000);
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.yaw));
    const lagoon=((p.x+132)/50)**2+(p.z/27)**2;
    assert.ok(lagoon<.87,'hull near shallow shore '+JSON.stringify(p));
    assert.ok(p.x<-138.5,'tour may intersect centre bridge '+JSON.stringify(p));
    assert.ok(p.z>3.0,'west loop drifting boat occupies north lagoon '+JSON.stringify(p));
    length+=Math.hypot(p.x-prev.x,p.z-prev.z);
    prev=p;
  }
  assert.ok(length>50&&length<150,'credible water circuit: '+length);
});
