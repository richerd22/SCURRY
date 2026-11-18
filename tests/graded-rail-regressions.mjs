import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../js/systems/collision.js',import.meta.url),'utf8');
const c=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const {walkSurface,resolveHorizontal,createSurfaceIndex,createObstacleIndex,segmentHeight}=c;
const rail={x0:0,z0:0,x1:10,z1:0,r:.19,y:1.975,y0:.975,y1:2.975,jumpOnly:true};
const wall={x0:0,z0:0,x1:10,z1:0,r:.055,minY:-2,maxY:1.975,maxY0:.975,maxY1:2.975};
test('sloped rail support matches both endpoints and midpoints',()=>{
  for(const [x,y] of [[0,.975],[2,1.375],[5,1.975],[8,2.575],[10,2.975]])
    for(const idx of [null,createSurfaceIndex([],[],[rail])])
      assert.ok(Math.abs(walkSurface(x,0,y+.1,.2,0,[],[],[rail],idx)-y)<1e-9);
  assert.equal(segmentHeight(rail,.5),1.975);
});
test('jump gate is evaluated at local rail height, not midpoint',()=>{
 for(const idx of [null,createSurfaceIndex([],[],[rail])]){
  assert.equal(walkSurface(10,0,0,4,0,[],[],[rail],idx),0);
  assert.equal(walkSurface(0,0,1.1,.2,0,[],[],[rail],idx),.975);
  assert.equal(walkSurface(10,0,3.1,.2,0,[],[],[rail],idx),2.975);
 }
});
test('a locally low fence allows passage above metal, high end blocks',()=>{
 for(const idx of [null,createObstacleIndex([],[],[wall],.22)]){
  const low={x:.2,z:.03,y:1.2};
  resolveHorizontal(low,[],[],[wall],.22,null,idx);
  assert.ok(Math.abs(low.z-.03)<1e-9);
  const high={x:9.8,z:.03,y:1.2};
  resolveHorizontal(high,[],[],[wall],.22,null,idx);
  assert.ok(high.z>.26);
  const above={x:9.8,z:.03,y:3.05};
  resolveHorizontal(above,[],[],[wall],.22,null,idx);
  assert.ok(Math.abs(above.z-.03)<1e-9);
 }
});
test('legacy flat-height colliders retain behavior',()=>{
  assert.equal(walkSurface(5,0,1.25,.2,0,[],[],[{x0:0,z0:0,x1:10,z1:0,r:.19,y:1.2}]),1.2);
  const p={x:5,z:.01,y:0};
  resolveHorizontal(p,[],[],[{x0:0,z0:0,x1:10,z1:0,r:.055,maxY:1.2}],.22);
  assert.ok(p.z>.26);
});
test('indexed and full queries agree across 2000 seeded graded contacts',()=>{
 const si=createSurfaceIndex([],[],[rail]), wi=createObstacleIndex([],[],[wall],.22);
 let seed=8001;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let i=0;i<2000;i++){
  const x=-1+rnd()*12,z=-.4+rnd()*.8,y=-.2+rnd()*4;
  assert.equal(walkSurface(x,z,y,.35,0,[],[],[rail],si),
     walkSurface(x,z,y,.35,0,[],[],[rail]),'support '+i);
  const a={x,z,y},b={x,z,y};
  resolveHorizontal(a,[],[],[wall],.22,null,wi);
  resolveHorizontal(b,[],[],[wall],.22);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-9,'wall '+i);
 }
});
