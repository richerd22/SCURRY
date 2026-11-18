// Production conservative broad-phase parity: no browser or Three.js.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/collision.js',import.meta.url),'utf8');
const {resolveHorizontal,createObstacleIndex} =
  await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const R=.22;
function compare(start,circles,boxes,walls,index,climbing=null){
  const a={...start},b={...start};
  resolveHorizontal(a,circles,boxes,walls,R,climbing);
  resolveHorizontal(b,circles,boxes,walls,R,climbing,index);
  assert.ok(Math.abs(a.x-b.x)<1e-10&&Math.abs(a.z-b.z)<1e-10,
    'full-scan vs index mismatch: '+JSON.stringify({start,a,b}));
}
test('3500 deterministic points match complete two-pass collision response',()=>{
  let seed=123456;
  const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  const circles=[],boxes=[],walls=[];
  for(let i=0;i<125;i++){
    const x=-70+rnd()*140,z=-70+rnd()*140,y=rnd()*6;
    circles.push({x,z,r:.1+rnd()*2,minY:y-1,maxY:y+3});
    boxes.push({minX:x-rnd()*2,maxX:x+rnd()*4,
      minZ:z-rnd()*3,maxZ:z+rnd()*3,minY:y-.5,maxY:y+4});
    walls.push({x0:x,z0:z,x1:x+(rnd()-.5)*14,z1:z+(rnd()-.5)*14,
      r:.02+rnd()*.12,minY:y-.5,maxY:y+3});
  }
  const index=createObstacleIndex(circles,boxes,walls,R);
  for(let i=0;i<3500;i++)
    compare({x:-90+rnd()*180,z:-90+rnd()*180,y:rnd()*12},circles,boxes,walls,index);
  assert.ok(index.query(0,0).circles.length<circles.length/2,'distant colliders excluded');
});
test('big boxes, exact grid edges, and walls retain collision response',()=>{
  const circles=[{x:8.2,z:8.1,r:1.5,minY:-2,maxY:4},{x:15,z:9,r:2,minY:-2,maxY:4}];
  const boxes=[{minX:0,maxX:50,minZ:0,maxZ:50,minY:-2,maxY:4}];
  const walls=[{x0:-5,z0:8,x1:22,z1:8,r:.2,minY:-2,maxY:4}];
  const index=createObstacleIndex(circles,boxes,walls,R);
  for(const [x,z] of [[8,8],[15,9],[25,25],[0,0],[7.99,8.01],[8.01,7.99],[-2,8],[3,3],[50,50]])
    compare({x,z,y:.1},circles,boxes,walls,index);
});
test('late obstacle registration/removal triggers index rebuild',()=>{
  const circles=[],boxes=[],walls=[];
  const index=createObstacleIndex(circles,boxes,walls,R);
  compare({x:1,z:1,y:0},circles,boxes,walls,index);
  const prev=index.generation;
  circles.push({x:1,z:1,r:2,minY:-1,maxY:1});
  compare({x:1,z:1,y:0},circles,boxes,walls,index);
  assert.ok(index.generation>prev);
  circles.pop();
  compare({x:1,z:1,y:0},circles,boxes,walls,index);
});
test('climbing own trunk exemption still works around adjacent solids',()=>{
  const circles=[{x:1,z:1,r:.6,minY:0,maxY:12},{x:2,z:1,r:.6,minY:0,maxY:12}];
  const boxes=[],walls=[];
  const index=createObstacleIndex(circles,boxes,walls,R);
  compare({x:1.1,z:1,y:4},circles,boxes,walls,index,{x:1,z:1});
});
