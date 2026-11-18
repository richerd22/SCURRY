import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../js/world/entrance-layout.js',import.meta.url),'utf8');
const {PARK_ENTRANCES,makeParkEntranceLayout}=
 await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('two Garden and two Common openings get pairs of stone piers',()=>{
  const {piers,signs}=makeParkEntranceLayout(()=>0);
  assert.equal(PARK_ENTRANCES.length,4);
  assert.equal(piers.length,8);
  assert.equal(signs.length,4);
  assert.equal(piers.filter(p=>p.park==='garden').length,4);
});
test('all existing gaps stay open with 3m or more between stone volumes',()=>{
  const {piers}=makeParkEntranceLayout(()=>0);
  for(const gate of PARK_ENTRANCES){
    const pair=piers.filter(p=>p.id===gate.id);
    assert.equal(pair.length,2);
    const clearance=gate.hi-gate.lo-(pair[0].size+pair[1].size)/2;
    assert.ok(clearance>=3);
    if(gate.axis==='z'){
      assert.equal(pair[0].z,gate.lo);assert.equal(pair[1].z,gate.hi);
      assert.equal(pair[0].x,gate.fixed);
    }else{
      assert.equal(pair[0].x,gate.lo);assert.equal(pair[1].x,gate.hi);
      assert.equal(pair[0].z,gate.fixed);
    }
  }
});
test('piers share the real sampled ground and produce finite collisions',()=>{
  const terrain=(x,z)=>.08*x + .05*z;
  const {piers,signs}=makeParkEntranceLayout(terrain);
  for(const p of piers){
    assert.equal(p.y,terrain(p.x,p.z));
    assert.equal(p.collision.maxY,p.y+2.14);
    assert.ok(p.collision.maxX>p.collision.minX);
    assert.ok(p.collision.maxZ>p.collision.minZ);
  }
  for(const sign of signs)assert.ok(Number.isFinite(sign.x+sign.y+sign.z));
});
test('broken heights or closed entrances fail instead of creating phantom walls',()=>{
  assert.throws(()=>makeParkEntranceLayout(()=>NaN),/nonfinite/);
  assert.throws(()=>makeParkEntranceLayout(()=>0,[{
    id:'bad',park:'garden',axis:'z',fixed:0,lo:0,hi:1
  }]),/invalid/);
  assert.throws(()=>makeParkEntranceLayout(null),/terrain/);
});
