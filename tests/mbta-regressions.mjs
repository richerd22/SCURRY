import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/mbta-rules.js',import.meta.url),'utf8');
const {MBTA_STATIONS,MBTA_ROOMS,MBTA_RAT_GATE,MBTA_STAFF,MBTA_HIDE,
  withinTransit,clampTransit,trainAt,transitCrowdLevel}=await import(
  'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('the real line identities remain correct, only Park Street is a Red transfer',()=>{
 assert.deepEqual(MBTA_STATIONS.map(s=>s.id),['arlington','boylston','park']);
 assert.equal(MBTA_STATIONS.filter(s=>s.line.includes('RED')).length,1);
 assert.equal(MBTA_STATIONS[2].name,'PARK STREET');
 assert.ok(MBTA_STATIONS[0].surfaceX<-150);
 assert.ok(MBTA_STATIONS[2].surfaceX>-50&&MBTA_STATIONS[2].surfaceZ<-65);
});
test('every station, staff shelter and rat outlet lies on an actual walk surface',()=>{
 for(const s of MBTA_STATIONS)assert.ok(withinTransit(s.x,s.z),s.id);
 assert.ok(withinTransit(MBTA_RAT_GATE.x,MBTA_RAT_GATE.z));
 assert.ok(withinTransit(MBTA_STAFF.x,MBTA_STAFF.z));
 assert.ok(withinTransit(MBTA_HIDE.x,MBTA_HIDE.z));
 assert.ok(MBTA_ROOMS.length>=5);
});
test('tracks are never walking surfaces and hostile overflow clamps back',()=>{
 for(let x=-95;x<96;x+=7){
  assert.equal(withinTransit(x,-9.5),false);
  assert.ok(withinTransit(...Object.values(clampTransit(x,-9.5))));
 }
 for(let z=43;z<=67;z+=5){
  assert.equal(withinTransit(91,z),false);
  assert.ok(withinTransit(...Object.values(clampTransit(91,z))));
 }
 assert.deepEqual(clampTransit(NaN,NaN),{x:76,z:10});
});
test('crowds follow shifts rather than filling parks and stations at 3 AM',()=>{
 assert.equal(transitCrowdLevel(3),'maintenance');
 assert.equal(transitCrowdLevel(8),'rush');
 assert.equal(transitCrowdLevel(17),'rush');
 assert.equal(transitCrowdLevel(22),'regular');
 assert.equal(transitCrowdLevel(0.5),'last-trains');
});
test('trains are finite animations, without moving collision surfaces',()=>{
 for(let t=0;t<1000;t+=.25){
  const p=trainAt(t);
  assert.ok(Number.isFinite(p));
  assert.ok(p>=-118&&p<=128);
 }
 assert.equal(trainAt(0),-118);
 assert.equal(trainAt(42),-118);
});
