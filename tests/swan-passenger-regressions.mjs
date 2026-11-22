import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/world/swan-passengers.js',import.meta.url),'utf8');
const {SWAN_SEATS}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('each boat has 10 separated positions on five open bench rows',()=>{
  assert.equal(SWAN_SEATS.length,10);
  for(const p of SWAN_SEATS){
    assert.ok(Math.abs(p.x)<=1&&p.z>=-2.5&&p.z<=2.1);
    assert.ok(SWAN_SEATS.filter(q=>Math.hypot(q.x-p.x,q.z-p.z)<.5).length===1);
  }
});
