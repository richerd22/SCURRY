import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const src=readFileSync(new URL('../js/systems/wildlife-rules.js',import.meta.url),'utf8');
const {WILDLIFE_SPAWNS,wildlifeResponse,nearestThreatDistance}=await import(
  'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('authored urban wildlife is bounded, diverse, and includes the burrow network',()=>{
  assert.equal(WILDLIFE_SPAWNS.length,21);
  const species=new Set(WILDLIFE_SPAWNS.map(a=>a[0]));
  assert.deepEqual([...species].sort(),['burrow-rat','burrow-squirrel','rabbit','rat','squirrel']);
  for(const [species,x,z] of WILDLIFE_SPAWNS){
    assert.ok(Number.isFinite(x)&&Number.isFinite(z));
    if(species.startsWith('burrow-'))assert.ok(Math.abs(x-3000)<55&&Math.abs(z-3000)<35);
    else assert.ok(x>-205&&x<205&&z>-98&&z<98);
    if(!species.startsWith('burrow-')) assert.ok(x<-60||x>-40,'no wildlife spawned on Charles Street');
  }
});
test('rabbit is skittish, squirrel takes interest in food, tunnel rats are peaceful',()=>{
  assert.equal(wildlifeResponse('rabbit',3,5,50,false),'flee');
  assert.equal(wildlifeResponse('rabbit',3,0,50,false),'idle');
  assert.equal(wildlifeResponse('squirrel',3,0,50,true),'curious');
  assert.equal(wildlifeResponse('squirrel',1,6,50,true),'flee');
  assert.equal(wildlifeResponse('squirrel',10,0,3,false),'flee');
  assert.equal(wildlifeResponse('rat',3,0,50,false),'flee');
  assert.equal(wildlifeResponse('burrow-rat',1,6,0,false),'idle');
  assert.equal(wildlifeResponse('rabbit',NaN,0,50,false),'idle');
});

test('wildlife reads live dog record positions (not missing top-level x/z)',()=>{
  const pack=[{pos:{x:4,z:5}},{pos:{x:50,z:50}}];
  assert.ok(Math.abs(nearestThreatDistance(4,6,pack)-1)<1e-9);
  assert.equal(wildlifeResponse('rabbit',12,0,nearestThreatDistance(4,6,pack),false),'flee');
  assert.equal(nearestThreatDistance(0,0,[{pos:{x:NaN,z:1}}]),Infinity);
  assert.equal(nearestThreatDistance(0,0,[{x:3,z:4}]),5);
});

test('hidden off-duty dogs do not frighten late-night rats',()=>{
 const sleeping=[{pos:{x:0,z:0},mesh:{visible:false}}];
 assert.equal(nearestThreatDistance(0,1,sleeping),Infinity);
 assert.equal(wildlifeResponse('rat',7,0,Infinity,false),'idle');
});
