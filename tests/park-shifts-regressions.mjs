import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/park-shifts.js',import.meta.url),'utf8');
const {parkShift,actorVisible}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('3 AM has staff/rat life but no picnic crowds or dogs',()=>{
 const p=parkShift(3);
 assert.equal(p.walkers,0);assert.equal(p.sitters,0);assert.equal(p.dogs,0);
 assert.equal(p.vendor,false);assert.equal(p.picnics,false);
 assert.equal(p.squirrels,false);assert.equal(p.rats,true);assert.equal(p.nightWorker,true);
});
test('daytime, rush, evening and late are all distinct',()=>{
 assert.ok(parkShift(8).walkers>.5);
 assert.ok(parkShift(12).walkers>.9);
 assert.ok(parkShift(20).walkers<parkShift(12).walkers);
 assert.ok(parkShift(22).walkers<parkShift(20).walkers);
 assert.equal(parkShift(19.5).vendor,true);
 assert.equal(parkShift(21).vendor,false);
 assert.equal(parkShift(6).picnics,false);
 assert.equal(parkShift(16).picnics,true);
});
test('clock wraps and visibility masks stay deterministic',()=>{
 assert.deepEqual(parkShift(26),parkShift(2));
 assert.equal(actorVisible(8,9,0),false);
 assert.equal(actorVisible(0,9,1),true);
});
