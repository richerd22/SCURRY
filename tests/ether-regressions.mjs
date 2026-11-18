import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const src=readFileSync(new URL('../js/world/ether-layout.js',import.meta.url),'utf8');
const {ETHER,etherColliders}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('Ether Monument is in northwest Garden and has four finite rim colliders',()=>{
 assert.ok(ETHER.x < -165 && ETHER.x > -202);
 assert.ok(ETHER.z < -50 && ETHER.z > -98);
 const c=etherColliders(1.25);assert.equal(c.walls.length,4);
 for(const b of [...c.walls,c.center]){
  assert.ok([b.minX,b.maxX,b.minZ,b.maxZ,b.minY,b.maxY].every(Number.isFinite));
  assert.ok(b.maxX>b.minX&&b.maxZ>b.minZ&&b.maxY>b.minY);
 }
 assert.equal(c.center.maxY,1.25+ETHER.pedestalHeight);
});
