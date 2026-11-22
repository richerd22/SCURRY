import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/discovery-rules.js',import.meta.url),'utf8');
const {LANDMARKS,FIELD_NOTES,FIELD_NOTE_KEYS,discoverAt} =
  await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const at=(x,y,z,more={})=>({pos:{x,y,z},...more});
test('every atlas pin has a unique persistent discovery and exactly 15 field notes',()=>{
  assert.equal(FIELD_NOTES.length,15);
  assert.equal(new Set(FIELD_NOTES.map(x=>x.id)).size,15);
  assert.equal(FIELD_NOTE_KEYS.size,15);
  for(const pin of LANDMARKS)assert.ok(FIELD_NOTE_KEYS.has(pin.id));
});
test('visiting each park landmark within its authored radius records it',()=>{
  for(const m of LANDMARKS)
    assert.ok(discoverAt(at(m.x,0,m.z,{grounded:true}),0,null,()=>true).includes(m.id));
});
test('distant park landmarks do not register through remote off-map realms',()=>{
  for(const [flag,key] of [
    ['inBurrow','burrows'],['inHollow','hollow'],
    ['inFenway','fenway'],['inGarden','tdgarden'],
    ['inCityHall','cityhall'],['inEsplanade','esplanade']]){
    assert.deepEqual(discoverAt(at(95,0,12,{[flag]:true}),0,null),[key]);
  }
});
test('Hollow Tree exterior and climbing canopy heights have real spatial rules',()=>{
  const hollow={x:100,z:25};
  assert.ok(discoverAt(at(102,0,26),0,hollow).includes('hollow-tree'));
  assert.ok(!discoverAt(at(106,0,25),0,hollow).includes('hollow-tree'));
  assert.ok(!discoverAt(at(0,4,0),0,null).includes('canopy'));
  assert.ok(discoverAt(at(0,5,0),0,null).includes('canopy'));
});
test('invalid or absent player positions are rejected without exceptions',()=>{
  assert.deepEqual(discoverAt(null,0,null),[]);
  assert.deepEqual(discoverAt({},0,null),[]);
  assert.deepEqual(discoverAt(at(NaN,0,0),0,null),[]);
});

test('Washington marker is near Arlington entrance, not the Garden south shore',()=>{
  const w=LANDMARKS.find(x=>x.id==='washington');
  assert.ok(w.x < -180 && Math.abs(w.z)<15,
    'Washington is in the west-entrance sector of Public Garden');
});


test('Duck Island note requires physical landfall, not just a nearby Swan Boat or water',()=>{
 const island=LANDMARKS.find(m=>m.id==='duck-island');
 assert.deepEqual([island.x,island.z,island.r],[-134,-31,5]);
 const land=(x,z)=>Math.abs(x+134)<4&&Math.abs(z+31)<4;
 const p=(opts={})=>at(-134,.3,-31,{grounded:true,...opts});
 assert.ok(discoverAt(p(),.3,null,land).includes('duck-island'));
 for(const opts of [{onSwanBoat:true},{grounded:false}]){
  assert.ok(!discoverAt(p(opts),.3,null,land).includes('duck-island'));
 }
 assert.ok(!discoverAt(p(),.3,null,()=>false).includes('duck-island'));
 assert.ok(!discoverAt(p(),.3,null).includes('duck-island'));
 assert.ok(!discoverAt(at(-134,1.5,-31,{grounded:true}),.3,null,land).includes('duck-island'));
 assert.ok(!discoverAt(p({inBurrow:true}),.3,null,land).includes('duck-island'));
});
