import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const source=readFileSync(new URL('../js/systems/relocation.js',import.meta.url),'utf8');
const {relocationProtected,beginRelocation,completeRelocation,advanceRelocation} =
  await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('only one catch starts while a relocation fade is pending',()=>{
  const s={relocating:false,catchGrace:0};
  assert.equal(beginRelocation(s),true);
  for(let i=0;i<20;i++)assert.equal(beginRelocation(s),false);
  assert.equal(relocationProtected(s),true);
  advanceRelocation(s,10);assert.equal(s.relocating,true);
});
test('landing grace prevents immediate second catch and expires in game time',()=>{
  const s={relocating:false,catchGrace:0};
  beginRelocation(s);completeRelocation(s,1.5);
  assert.equal(s.relocating,false);
  assert.equal(beginRelocation(s),false);
  advanceRelocation(s,.6);assert.ok(s.catchGrace>.89);
  assert.equal(beginRelocation(s),false);
  advanceRelocation(s,.9);
  assert.ok(s.catchGrace<1e-8);
  assert.equal(beginRelocation(s),true);
});
test('paused/invalid time must not silently remove catch immunity',()=>{
  const s={relocating:false,catchGrace:1};
  for(const dt of [0,-1,NaN,Infinity])advanceRelocation(s,dt);
  assert.equal(s.catchGrace,1);
  completeRelocation(s,NaN);assert.equal(s.catchGrace,0);
});
