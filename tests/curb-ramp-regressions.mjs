import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
async function load(path){
 const src=readFileSync(new URL(path,import.meta.url),'utf8');
 return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
}
const {makeCharlesSidewalkLayout,CURB_PROFILE}=await load('../js/world/sidewalk-layout.js');
const {walkSurface,createSurfaceIndex,boxSurfaceHeight}=await load('../js/systems/collision.js');
test('24 pavement sections have continuous shoulders on BOTH edges',()=>{
 const {cores,ramps}=makeCharlesSidewalkLayout(()=>0);
 assert.equal(cores.length,24);assert.equal(ramps.length,48);
 assert.equal(CURB_PROFILE.halfWidth,1.35);
 for(let i=0;i<cores.length;i++){
  const c=cores[i].collision,l=ramps[i*2].collision,r=ramps[i*2+1].collision;
  assert.ok(Math.abs(c.minX-l.maxX)<1e-9);
  assert.ok(Math.abs(c.maxX-r.minX)<1e-9);
  assert.equal(boxSurfaceHeight(l,l.maxX),c.y);
  assert.equal(boxSurfaceHeight(r,r.minX),c.y);
  assert.ok(Math.abs(boxSurfaceHeight(l,l.minX)-.015)<1e-9);
  assert.ok(Math.abs(boxSurfaceHeight(r,r.maxX)-.015)<1e-9);
 }
});
test('Charles Street walking across raised pavements has no 13cm one-step teleport',()=>{
 const {cores,ramps}=makeCharlesSidewalkLayout(()=>0);
 const boxes=[...cores,...ramps].map(x=>x.collision);
 const index=createSurfaceIndex([],boxes,[]);
 let old=0,maxStep=0,high=0;
 for(let x=-57;x>=-63;x-=3.3/90){
  const y=walkSurface(x,-66,old,1.3,0,[],boxes,[],index);
  const full=walkSurface(x,-66,old,1.3,0,[],boxes,[]);
  assert.ok(Math.abs(y-full)<1e-9);
  maxStep=Math.max(maxStep,Math.abs(y-old));
  high=Math.max(high,y);old=y;
 }
 assert.ok(high>.125,'walk still reaches the sidewalk top');
 assert.ok(maxStep<.025,'one-step curb snap is '+maxStep);
 assert.ok(old<.02,'feet descend gently back to Garden lawn');
});
test('graded box support matches unindexed solver at 2500 deterministic samples',()=>{
 const {cores,ramps}=makeCharlesSidewalkLayout((x,z)=>.5+Math.sin(z*.04)*.06);
 const boxes=[...cores,...ramps].map(x=>x.collision),idx=createSurfaceIndex([],boxes,[]);
 let seed=1791;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<2500;i++){
  const x=-65+rnd()*30,z=-110+rnd()*220,y=rnd()*2,tol=.2+rnd();
  assert.equal(walkSurface(x,z,y,tol,0,[],boxes,[],idx),
    walkSurface(x,z,y,tol,0,[],boxes,[]),'sample '+i);
 }
});
test('new ramp heights do not change legacy flat boxes or false floor checks',()=>{
 const old={minX:-2,maxX:2,minZ:-4,maxZ:4,y:3};
 assert.equal(boxSurfaceHeight(old,0),3);
 assert.equal(walkSurface(0,0,0,.4,0,[],[old],[]),0);
 assert.equal(walkSurface(0,0,2.9,.4,0,[],[old],[]),3);
 assert.throws(()=>makeCharlesSidewalkLayout(null),TypeError);
 assert.throws(()=>makeCharlesSidewalkLayout(()=>NaN),/non-finite/);
});
