import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/world/swan-passengers.js',import.meta.url),'utf8');
const {SWAN_SEATS,SWAN_PEDAL_OMEGA,swanPedalPose}=await import(
 'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('real Swan Boats seat twenty on five open red benches, without visual overlap',()=>{
 assert.equal(SWAN_SEATS.length,20);
 for(let row=0;row<5;row++){
  const seats=SWAN_SEATS.filter(s=>Math.abs(s.z-(-2.4+row*1.1))<1e-8);
  assert.equal(seats.length,4);
 }
 for(const p of SWAN_SEATS){
  assert.ok(Math.abs(p.x)<=1.1&&p.z>=-2.5&&p.z<=2.1);
  assert.equal(SWAN_SEATS.filter(q=>Math.hypot(q.x-p.x,q.z-p.z)<.5).length,1);
 }
 assert.equal(new Set(SWAN_SEATS.map(x=>x.z)).size,5);
});
test('stern shoe cranks oppose at all phases and remain frame-rate independent',()=>{
 assert.ok(SWAN_PEDAL_OMEGA>2&&SWAN_PEDAL_OMEGA<4);
 const period=2*Math.PI/SWAN_PEDAL_OMEGA;
 for(let i=0;i<100;i++){
  const t=i/99*period;
  const l=swanPedalPose(t,0),r=swanPedalPose(t,1);
  assert.ok(Math.hypot(l.y-r.y,l.z-r.z)>.23);
  assert.ok(Math.abs(l.y+r.y-1.88)<1e-10);
  assert.ok(Math.min(l.y,r.y)-.065>.73,
   'actual pedal shoes must never clip through the visual Swan Boat deck');
  assert.ok(Math.abs(l.z+r.z+.44)<1e-10);
  const again=swanPedalPose(t+period,0);
  assert.ok(Math.hypot(again.y-l.y,again.z-l.z)<1e-10);
 }
 const output={x:.18,y:0,z:0};
 assert.equal(swanPedalPose(.5,0,output),output);
 assert.equal(output.x,.18,'pure pose preserves the passenger leg lateral offset');
 assert.throws(()=>swanPedalPose(NaN,0),RangeError);
 assert.throws(()=>swanPedalPose(0,2),RangeError);
});
test('actual game uses one instanced torso/head draw call per hull and live pedals',()=>{
 const art=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const day=readFileSync(new URL('../js/systems/daycycle.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 assert.match(art,/new THREE\.InstancedMesh\(shape/);
 assert.match(art,/passengers/);
 assert.match(art,/scurrySwanPassengerTorso=true/);
 assert.match(art,/operator\.userData\.pedalFeet=pedalFeet/);
 assert.match(day,/swanPedalPose\(seconds,0,feet\[0\]\.position\)/);
 assert.match(day,/swanPedalPose\(seconds,1,feet\[1\]\.position\)/);
 assert.match(main,/passengers:passengers\?\.count\?\?0/);
});
