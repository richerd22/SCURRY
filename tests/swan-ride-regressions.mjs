import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const src=readFileSync(new URL('../js/systems/swan-ride-rules.js',import.meta.url),'utf8');
const layoutSrc=readFileSync(new URL('../js/world/garden-lagoon-layout.js',import.meta.url),'utf8');
const {lagoonWaterClearance}=await import('data:text/javascript;base64,'+Buffer.from(layoutSrc).toString('base64'));
const {swanRidePose,SWAN_RIDE_SECONDS,SWAN_DOCK,SWAN_ROUTE_LENGTH}=await import(
  'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('swan boat tour is finite and returns exactly to its real dock',()=>{
  const a=swanRidePose(0),b=swanRidePose(1);
  assert.equal(SWAN_RIDE_SECONDS,56);
  assert.ok(Math.hypot(a.x-SWAN_DOCK.x,a.z-SWAN_DOCK.z)<.00001);
  assert.ok(Math.hypot(b.x-SWAN_DOCK.x,b.z-SWAN_DOCK.z)<.00001);
  assert.ok(Number.isFinite(a.yaw)&&Number.isFinite(b.yaw));
  assert.throws(()=>swanRidePose(NaN),RangeError);
});
test('entire route goes south to north, UNDER bridge and circles island at 5m clearance',()=>{
  let length=0,prev=swanRidePose(0),north=0,under=0,east=0,west=0;
  for(let i=0;i<=2000;i++){
    const p=swanRidePose(i/2000);
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.yaw));
    assert.ok(lagoonWaterClearance(p.x,p.z)>5,
      'full boat hull hits actual irregular shore or island: '+JSON.stringify(p));
    if(p.z<-40)north++;
    if(Math.abs(p.z)<2.7&&Math.abs(p.x+132)<2.5)under++;
    if(p.z<-20&&p.x>-125)east++;
    if(p.z<-20&&p.x<-143)west++;
    length+=Math.hypot(p.x-prev.x,p.z-prev.z);prev=p;
  }
  assert.ok(north>10&&under>10&&east>10&&west>10,
    'tour must pass under bridge both ways and circle ALL sides of dry island');
  assert.ok(length>180&&length<230,'full two-lobe circuit: '+length);
});

test('the entire moving swan hull remains inside rendered water, not only its centre',()=>{
 for(let i=0;i<=2000;i++){
   const p=swanRidePose(i/2000);
   assert.ok(lagoonWaterClearance(p.x,p.z)>5,
     'actual boat swan head or stern intersects shoreline: '+JSON.stringify(p));
 }
});

test('independent moving ambient boats cannot strike passenger route at ANY phase',()=>{
 let min=Infinity;
 const locals=[{cx:-150,cz:15,rx:1,rz:2},{cx:-114,cz:14,rx:1,rz:2}];
 for(let i=0;i<=2000;i++){
  const p=swanRidePose(i/2000);
  for(const d of locals)for(let k=0;k<72;k++){
   const a=k/72*Math.PI*2;
   const x=d.cx+d.rx*Math.cos(a),z=d.cz+d.rz*Math.sin(a);
   min=Math.min(min,Math.hypot(p.x-x,p.z-z));
  }
 }
 assert.ok(min>10,'two 5m full-hull envelopes can overlap: '+min);
});

test('full physical bridge passage has an actual real-mesh and full-hull QA gate',()=>{
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../harness/browser-smoke.mjs',import.meta.url),'utf8');
 assert.match(main,/surveySwanBridgePassage:\(\)=>/);
 assert.match(main,/boat\.traverse\(mesh=>/);
 assert.match(main,/getMatrixAt\(inst,instance\)/);
 assert.match(main,/scurryGardenBridgeUnderside/);
 assert.match(main,/actualHullMinBank:minHullBank/);
 assert.match(browser,/underpass\.minMargin>=\.15/);
 assert.match(browser,/underpass\.actualHullMinBank>\.35/);
 assert.match(browser,/checkScene\('swanunderpass'\)/);
});

test('14 real swan dock solid obstacles protect the visible fixtures',()=>{
 const art=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const harness=readFileSync(new URL('../harness/browser-smoke.mjs',import.meta.url),'utf8');
 assert.match(art,/isSwanDockSolid:true/);
 assert.match(main,/surveySwanDock:\(\)=>/);
 assert.match(harness,/solids:14,posts:8,bollards:2,crate:1,signposts:2/);
 assert.match(main,/pose\(-143\.3,46\.8,-140,44/);
 assert.match(main,/pose\(-118,-7,-132,1/);
});

test('pedal boat advances with near-constant arc length, not per-control-point speed',()=>{
 assert.ok(SWAN_ROUTE_LENGTH>180&&SWAN_ROUTE_LENGTH<230);
 assert.equal(SWAN_RIDE_SECONDS,56);
 const deltas=[];
 for(let i=0;i<1000;i++){
  const a=swanRidePose(i/1000),b=swanRidePose((i+1)/1000);
  deltas.push(Math.hypot(a.x-b.x,a.z-b.z));
 }
 const ideal=SWAN_ROUTE_LENGTH/1000;
 assert.ok(deltas.every(d=>Math.abs(d-ideal)<ideal*.035),
  'boat accelerated at a control-point boundary');
 const a=swanRidePose(0),b=swanRidePose(1);
 assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.000001,'tour must close at exact dock');
 const yawDelta=Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw));
 assert.ok(Math.abs(yawDelta)<.02,'avoid yaw snap at end of tour');
});

test('full loop crosses real bridge centre exactly twice in opposite directions',()=>{
 let previous=Math.sign(swanRidePose(0).z);
 const crossings=[];
 for(let i=1;i<=2000;i++){
  const p=swanRidePose(i/2000),sign=Math.sign(p.z);
  if(sign&&previous&&sign!==previous)
   crossings.push({from:previous,to:sign,x:p.x});
  if(sign)previous=sign;
 }
 assert.deepEqual(crossings.map(c=>[c.from,c.to]),[[1,-1],[-1,1]]);
 assert.ok(crossings.every(c=>Math.abs(c.x+132)<2));
});
