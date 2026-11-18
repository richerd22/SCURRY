import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const load=async p=>{
 const src=readFileSync(new URL('../js/systems/'+p,import.meta.url),'utf8');
 return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
};
const {ROOMS,CORRIDORS,RECTS,burrowLocalWalkable}=await load('burrow-layout.js');
const {BURROW_PATROLS}=await load('burrow-patrols.js');
test('the same root network supports the player and all patrolling creatures',()=>{
 assert.equal(RECTS.length,ROOMS.length+CORRIDORS.length);
 assert.equal(BURROW_PATROLS.length,7);
 assert.equal(BURROW_PATROLS.filter(x=>x.species==='rat').length,4);
 assert.equal(BURROW_PATROLS.filter(x=>x.species==='squirrel').length,3);
});
test('every entire rat/squirrel path including the return segment is inside walkable earth',()=>{
 for(let k=0;k<BURROW_PATROLS.length;k++){
  const route=BURROW_PATROLS[k];
  assert.ok(route.points.length>=6);
  for(let i=0;i<route.points.length;i++){
   const a=route.points[i],b=route.points[(i+1)%route.points.length];
   const distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const n=Math.max(1,Math.ceil(distance/.2));
   for(let j=0;j<=n;j++){
    const t=j/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
    assert.ok(burrowLocalWalkable(x,z,.001),
     'route '+k+' segment '+i+' t='+t+' burrows solid dirt '+x+','+z);
   }
  }
 }
});
test('walkable test rejects remote space and cannot escape at bad coordinates',()=>{
 assert.equal(burrowLocalWalkable(0,0),true);
 assert.equal(burrowLocalWalkable(45,0),true);
 assert.equal(burrowLocalWalkable(0,80),false);
 assert.equal(burrowLocalWalkable(NaN,0),false);
 assert.equal(burrowLocalWalkable(Infinity,0),false);
});
