import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const hood=readFileSync(new URL('../js/systems/fenwayhood.js',import.meta.url),'utf8');
const fen=readFileSync(new URL('../js/systems/fenway.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const browser=readFileSync(new URL('../harness/browser-smoke.mjs',import.meta.url),'utf8');
test('Common boot creates procedural hood but cannot download its heavyweight model',()=>{
 const build=hood.split('export function buildFenwayHood(scene) {')[1]
  .split('export function ensureFenwayHoodModel()')[0];
 assert.match(build,/buildStreets\(g\)/);
 assert.match(build,/buildCitgo\(g\)/);
 assert.match(build,/S\.ensureFenwayHoodModel=ensureFenwayHoodModel/);
 assert.doesNotMatch(build,/loadModel\s*\(/,'cold boot must never fetch GLB');
 assert.match(hood,/hoodLoad=loadModel\('assets\/models\/fenway-neighborhood\.glb'\)/);
 assert.match(hood,/if\(hoodLoad\)return hoodLoad/,'duplicate E requests share one promise');
 assert.match(hood,/S\.fenwayHoodAssetStatus='fallback'/);
 assert.match(hood,/hoodGroup\.add\(tpl\.scene\)/);
 assert.match(main,/buildFenwayHood\(scene\)/,'fallback still builds at boot');
});
test('real portal and debug hood photography both start model before ready barrier',()=>{
 assert.match(fen,/function enterFenway\(\)\s*\{\s*\/\/ Demand-load backdrop[\s\S]*S\.ensureFenwayHoodModel\?\.\(\)/);
 assert.match(fen,/export function debugEnterFenway\(which\)\s*\{\s*\/\/ Run before main[\s\S]*S\.ensureFenwayHoodModel\?\.\(\)/);
 assert.match(main,/whenModelsSettled\(\)/);
 assert.match(browser,/largeHoodRequests/);
 assert.match(browser,/checkScene\('fenwayhood'\)/);
});
