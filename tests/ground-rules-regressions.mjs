import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const source = readFileSync(new URL('../js/world/ground-rules.js', import.meta.url), 'utf8');
const { insideParkLawn } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const map = {
  common: { minX:-40,maxX:205,minZ:-102,maxZ:102 },
  garden: { minX:-205,maxX:-60,minZ:-98,maxZ:98 },
};
test('Common and Garden footprints are ground candidates; perimeter and outside streets are not', () => {
  for (const [x,z] of [[0,0],[190,40],[-160,20],[-60,-20],[-205,98],[205,-102]]) {
    assert.equal(insideParkLawn(x,z,map),true, x+','+z);
  }
  for (const [x,z] of [[209,0],[-209,0],[0,-110],[-130,105],[-49,0], [4000,4000]]) {
    assert.equal(insideParkLawn(x,z,map),false,x+','+z);
  }
});
test('invalid coordinates are never silently classified as park ground',()=>{
  for (const x of [NaN, Infinity,-Infinity]) assert.equal(insideParkLawn(x,0,map),false);
  for (const z of [NaN, Infinity,-Infinity]) assert.equal(insideParkLawn(0,z,map),false);
});
