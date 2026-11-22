import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const art=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
test('real Boston boats: green hull and red open bench rows with no fabricated canopy',()=>{
 assert.match(art,/boatMat = new THREE.MeshStandardMaterial\(\{color:0x275a40/);
 assert.match(art,/benchRed = new THREE.MeshStandardMaterial\(\{color:0xa93529/);
 assert.doesNotMatch(art,/function valanceTex\(/);
 assert.doesNotMatch(art,/function canopyTex\(/);
 assert.doesNotMatch(art,/const canvasMat =/);
 assert.match(art,/seat.userData.scurrySwanSeat=true/);
 assert.match(art,/back.userData.scurrySwanSeatBack=true/);
 assert.match(art,/hull.userData.scurrySwanHull=true/);
 assert.match(art,/g.userData.operator=operator/);
 assert.match(art,/swan\(g\)/);
});
test('real rendered mesh and bounding-box validation runs in headless Chromium',()=>{
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const harness=readFileSync(new URL('../harness/browser-smoke.mjs',import.meta.url),'utf8');
 assert.match(main,/surveySwanFleet:\(\)=>/);
 assert.match(main,/new THREE.Box3\(\).setFromObject\(boat\)/);
 assert.match(harness,/window.__scurryQA.surveySwanFleet\(\)/);
 assert.match(harness,/b.seats,5/);
});
