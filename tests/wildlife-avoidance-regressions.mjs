import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/wildlife-step-rules.js',import.meta.url),'utf8');
const {wildlifeStep}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('free pursuit moves toward target at capped speed',()=>{
 const p=wildlifeStep(0,0,10,0,.4,()=>true);
 assert.deepEqual(p,{x:.4,z:0});
 assert.deepEqual(wildlifeStep(0,0,10,0,100,()=>true),{x:10,z:0});
});
test('blocked direct step chooses a legal perpendicular detour',()=>{
 const good=(x,z)=>z>.25&&x<.1;
 const p=wildlifeStep(0,0,5,0,.35,good,1);
 assert.ok(Math.abs(p.x)<1e-9&&Math.abs(p.z-.35)<1e-9);
});
test('both blocked alternatives hold the original position, never clip',()=>{
 assert.deepEqual(wildlifeStep(0,0,4,0,.4,()=>false),{x:0,z:0});
});
test('invalid numerical physics inputs produce a stable no-op',()=>{
 assert.deepEqual(wildlifeStep(0,0,NaN,1,.5,()=>true),{x:0,z:0});
 assert.deepEqual(wildlifeStep(0,0,1,0,-1,()=>true),{x:0,z:0});
});
test('reuse one output vector rather than allocating for every visible animal',()=>{
 const target={x:5,z:5};
 const p=wildlifeStep(1,2,1,5,.4,()=>true,1,target);
 assert.equal(p,target);
 assert.equal(p.x,1);
 assert.equal(p.z,2.4);
});
test('1000 attempted steps cannot enter a simulated circular trunk',()=>{
 let x=0,z=0;
 const pass=(nx,nz)=>Math.hypot(nx-2,nz)>=.9;
 for(let i=0;i<1000;i++){
  const p=wildlifeStep(x,z,4,0,.1,pass,i%2?1:-1);
  x=p.x;z=p.z;
  assert.ok(Math.hypot(x-2,z)>=.9,
    'step '+i+' entered solid trunk at '+x+','+z);
 }
});
