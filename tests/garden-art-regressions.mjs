import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const load=(p)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL(p,import.meta.url),'utf8')).toString('base64'));
const {GARDEN_ART}=await load('../js/world/garden-art-facts.js');
const {LANDMARKS}=await load('../js/systems/discovery-rules.js');
test('Garden history E prompts match sculpture locations and Field Notes pins',()=>{
 const d=GARDEN_ART.ducklings,w=GARDEN_ART.washington;
 assert.ok(d.x<-60&&d.x>-100&&d.z<-60);
 const washington=LANDMARKS.find(x=>x.id==='washington');
 assert.deepEqual([w.x,w.z],[washington.x,washington.z]);
 assert.ok(w.x<-180&&Math.abs(w.z)<10);
});
test('Nancy Schön 1987 sculpture correctly features Mrs Mallard and eight',()=>{
 assert.match(GARDEN_ART.ducklings.message,/eight ducklings/);
 assert.match(GARDEN_ART.ducklings.message,/Nancy Schön, 1987/);
 assert.ok(GARDEN_ART.ducklings.r>3&&GARDEN_ART.ducklings.r<6);
});
test('Thomas Ball 1869 equestrian monument can be inspected from exterior',()=>{
 assert.match(GARDEN_ART.washington.message,/Thomas Ball/);
 assert.match(GARDEN_ART.washington.message,/July 3, 1869/);
 assert.ok(GARDEN_ART.washington.r>5&&GARDEN_ART.washington.r<7);
});
