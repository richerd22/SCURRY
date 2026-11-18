import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const src=readFileSync(new URL('../js/world/ducklings-layout.js',import.meta.url),'utf8');
const {DUCKLING_COUNT,DUCKLING_YAW,MOTHER_RADIUS,DUCKLING_RADIUS,ducklingPose}=
 await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('exactly eight unique bronzes have real physical bounds',()=>{
 assert.equal(DUCKLING_COUNT,8);
 assert.ok(MOTHER_RADIUS<1&&MOTHER_RADIUS>.5);
 assert.ok(DUCKLING_RADIUS>.19&&DUCKLING_RADIUS<.3);
 assert.ok(DUCKLING_YAW>.6&&DUCKLING_YAW<1);
 const poses=Array.from({length:DUCKLING_COUNT},(_,i)=>ducklingPose(i));
 for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++){
  const d=Math.hypot(poses[i].x-poses[j].x,poses[i].z-poses[j].z);
  assert.ok(d>2*DUCKLING_RADIUS-.08,'bronze collision overlaps excessively');
 }
});
test('local parade transforms match world collider positions and stay on cobbles',()=>{
 for(let i=0;i<DUCKLING_COUNT;i++){
  const p=ducklingPose(i),c=Math.cos(DUCKLING_YAW),s=Math.sin(DUCKLING_YAW);
  assert.ok(Math.abs(p.x-(-78+c*p.localX+s*p.localZ))<1e-9);
  assert.ok(Math.abs(p.z-(-80-s*p.localX+c*p.localZ))<1e-9);
  assert.ok(Math.hypot(p.x+78,p.z+80)<6);
 }
 assert.throws(()=>ducklingPose(8),RangeError);
 assert.throws(()=>ducklingPose(-1),RangeError);
});
