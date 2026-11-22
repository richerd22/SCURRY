import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const src=readFileSync(new URL('../js/systems/swan-ride-rules.js',import.meta.url),'utf8');
const layoutSrc=readFileSync(new URL('../js/world/garden-lagoon-layout.js',import.meta.url),'utf8');
const {lagoonWaterClearance}=await import('data:text/javascript;base64,'+Buffer.from(layoutSrc).toString('base64'));
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
