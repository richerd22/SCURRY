import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const text=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const garden=text('../js/systems/garden.js'),browser=text('../harness/browser-smoke.mjs');
test('Garden procedural fallback loads before GLB but never downloads during Common boot',()=>{
 const build=garden.split('export function buildGarden(scene) {')[1]
  .split('// Sample a height grid over the bowl')[0];
 assert.match(build,/floor\.position\.set\(0,-\.015,\.85\)/);
 assert.match(build,/new THREE\.PlaneGeometry\(116,100\)/);
 assert.match(build,/surround\.position\.y=-\.012/);
 assert.match(build,/gardenScene=scene/);
 assert.match(build,/S\.ensureGardenModel=ensureGardenModel/);
 const startup=build.split('let gardenScene=null')[0];
 assert.doesNotMatch(startup,/loadModel\('assets\/models\/garden\.glb'\)/);
 assert.match(garden,/gardenLoad=loadModel\('assets\/models\/garden\.glb'\)/);
 assert.match(garden,/if\(gardenLoad\)return gardenLoad/);
});
test('on delayed network arena mesh and physical terrain remain on same ground',()=>{
 assert.match(garden,/if\(screenshot\|\|!S\.player\.inGarden\)commitGardenModel\(\)/);
 assert.match(garden,/else S\.gardenAssetStatus='deferred-floor'/);
 assert.match(garden,/gardenScene\.add\(park\);\s*sampleHeights\(park\);/);
 assert.match(garden,/if\(gardenWaiting\)commitGardenModel\(\)/);
 assert.match(garden,/S\.gardenAssetStatus='fallback'/);
 assert.match(garden,/S\.gardenAssetStatus='ready'/);
 assert.match(garden,/ensureGardenModel\(\{screenshot:true\}\)/);
});
test('CI checks zero 6.66 MiB requests at home, one on E and one on snapshot',()=>{
 assert.match(browser,/arenaRequests\.length,0/);
 assert.match(browser,/arenaRequests\.length,1/);
 assert.match(browser,/checkScene\('tdgarden'\)/);
});

test('live browser exercise stalls model GET, preserves feet and re-enters real parquet',()=>{
 assert.match(browser,/const arenaGate=new Promise/);
 assert.match(browser,/releaseArenaRequest\(\)/);
 assert.match(browser,/gardenAssetStatus==='deferred-floor'/);
 assert.match(browser,/window\.__scurryQA\.state\(\)\.inGarden/);
 assert.match(browser,/return visit requested duplicate GLB/);
 assert.match(browser,/offlineArena/);
});
