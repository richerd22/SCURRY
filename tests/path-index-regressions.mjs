// Indexed path-contact parity against the unchanged brute-force segment math.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/world/path-index.js',import.meta.url),'utf8');
const {createPathProximityIndex}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
function brute(x,z,paths){
  let best=Infinity;
  for(const line of paths)for(let i=1;i<line.length;i++){
    const [ax,az]=line[i-1],[bx,bz]=line[i];
    const dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
    const ex=x-(ax+t*dx),ez=z-(az+t*dz);
    best=Math.min(best,ex*ex+ez*ez);
  }
  return best;
}
const paths=[
  [[-34,-94],[196,-94],[196,94],[-34,94],[-34,-94]],
  [[-36,-18],[40,-18],[110,-18],[196,-18]],
  [[60,-94],[60,-52],[60,-18],[60,30],[60,94]],
  [[140,42],[112,42],[60,42]],
  [[-182,-34],[-132,-40],[-82,-34],[-76,0],[-82,34],[-132,40],[-182,34],[-188,0],[-182,-34]],
  [[-132,-38],[-132,38]],
  [[-36,30],[-44,30],[-76,30]],
  [[-196,-70],[-100,-70],[-60,-70]]
];
test('5000 seeded map/destination samples match full path scan',()=>{
  const idx=createPathProximityIndex(paths);
  let seed=101193;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  for(let i=0;i<5000;i++){
    const x=-310+rnd()*620,z=-175+rnd()*350,r=i%2?2.15:2.4;
    const raw=brute(x,z,paths),expected=raw<=r*r?raw:Infinity;
    const result=idx.nearestSquaredWithin(x,z,r);
    assert.equal(Number.isFinite(result),Number.isFinite(expected),'sample '+i);
    if(Number.isFinite(result))assert.ok(Math.abs(result-expected)<1e-10,'sample '+i);
  }
});
test('negative boundaries, segment endpoint, degenerate and wide fallback',()=>{
  const lines=[[[-12,-12],[-5,-12]],[[0,0],[0,0]]];
  const idx=createPathProximityIndex(lines,8,2.5);
  for(const [x,z,r] of [[-12,-12,2.4],[-12,-14.4,2.4],[-4.5,-12,2.4],
    [-9,-9.6,2.4],[-9,-9.61,2.4],[0,0,2.4],[4,0,5]]){
    const expected=brute(x,z,lines);
    const result=idx.nearestSquaredWithin(x,z,r);
    assert.equal(Number.isFinite(result),expected<=r*r);
  }
});
test('NaN and infinite positions must never count as a path',()=>{
  const idx=createPathProximityIndex(paths);
  for(const n of [NaN,Infinity,-Infinity]){
    assert.equal(idx.nearestSquaredWithin(n,0,2.4),Infinity);
    assert.equal(idx.nearestSquaredWithin(0,n,2.4),Infinity);
  }
});
test('nearby candidate set is smaller than the whole path network',()=>{
  const idx=createPathProximityIndex(paths);
  assert.ok(idx.totalSegments>20);
  assert.ok(idx.candidateCount(50,42)<idx.totalSegments/3);
  assert.equal(idx.candidateCount(3000,3000),0);
});
