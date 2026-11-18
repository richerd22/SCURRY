import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../js/systems/contact-recorder.js',import.meta.url),'utf8');
const {createContactRecorder}=
 await import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
const point=(x,y=0)=>({x,y,z:12,ground:0,grounded:true,realm:'park'});
test('bounded trace keeps recent coordinates but cumulative issue counts',()=>{
 const rec=createContactRecorder(3);
 for(let i=0;i<10;i++)rec.record(point(i));
 const out=rec.snapshot();
 assert.equal(out.samples.length,3);
 assert.equal(out.samples[0].x,7);
 assert.equal(out.total,10);
});
test('visible ground penetration and airborne samples remain distinct',()=>{
 const r=createContactRecorder();
 r.record(point(0,-.03));
 r.record({...point(1,.7),grounded:false,vy:-4});
 r.record({...point(2,.1),climbing:true,grounded:false});
 const out=r.snapshot();
 assert.equal(out.penetrations,1);
 assert.equal(out.airborne,1);
 assert.equal(out.minimumGap,-.03);
});
test('bad samples do not contaminate a report or produce NaN',()=>{
 const r=createContactRecorder();
 for(const bad of [null,{},point(NaN),point(Infinity),{...point(1),ground:NaN}])
  assert.equal(r.record(bad),false);
 assert.deepEqual(r.snapshot(),{total:0,penetrations:0,airborne:0,minimumGap:null,samples:[]});
});
test('snapshots cannot mutate internal ring buffer and bounds are validated',()=>{
 const r=createContactRecorder(1);r.record(point(2));
 const snap=r.snapshot();snap.samples[0].x=100;
 assert.equal(r.snapshot().samples[0].x,2);
 assert.throws(()=>createContactRecorder(0),RangeError);
});
