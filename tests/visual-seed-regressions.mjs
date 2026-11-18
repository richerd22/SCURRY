import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../js/world/seeded-random.js',import.meta.url),'utf8');
const {seededRandom}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('identical seed produces identical park decoration independent of refresh',()=>{
  const a=seededRandom(0x5c0ee),b=seededRandom(0x5c0ee);
  for(let i=0;i<20000;i++)assert.equal(a(),b());
});
test('separate grass and stars streams do not share sequence or phase',()=>{
  const grass=seededRandom(1009),stars=seededRandom(2009);
  assert.notEqual(grass(),stars());
  for(let i=0;i<100;i++)grass();
  const starsAgain=seededRandom(2009);starsAgain();
  assert.equal(stars(),starsAgain());
});
test('numbers are finite unit interval and zero seed is allowed',()=>{
  for(const seed of [0,1,-5,0xffffffff]){
    const rng=seededRandom(seed);
    for(let i=0;i<1000;i++){
      const v=rng();assert.ok(v>=0&&v<1&&Number.isFinite(v));
    }
  }
});
test('nonfinite or noninteger seeds cannot make silent visual drift',()=>{
  for(const seed of [NaN,Infinity,1.1,'1',null])
    assert.throws(()=>seededRandom(seed),/seed/);
});
