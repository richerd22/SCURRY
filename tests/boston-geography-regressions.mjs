import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const from=(path)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL(path,import.meta.url),'utf8')).toString('base64'));
const {BREWER_FOUNTAIN,PARK_ST_HEADHOUSE,PARK_ST_ENTRY,BOYLSTON_ENTRY,ARLINGTON_ENTRY}=
  await from('../js/world/boston-landmark-layout.js');
const {MBTA_STATIONS}=await from('../js/systems/mbta-rules.js');
const {LANDMARKS}=await from('../js/systems/discovery-rules.js');
test('Brewer and Park Street are at the EAST/northeast Common entrance, not Charles Street',()=>{
 assert.ok(PARK_ST_HEADHOUSE.x>135 && PARK_ST_HEADHOUSE.z< -65);
 assert.ok(BREWER_FOUNTAIN.x>130 && BREWER_FOUNTAIN.z< -50);
 assert.ok(BREWER_FOUNTAIN.x<PARK_ST_HEADHOUSE.x);
 assert.ok(BREWER_FOUNTAIN.z>PARK_ST_HEADHOUSE.z,
   'Brewer Fountain lies southwest of the T entrance');
 assert.ok(Math.hypot(BREWER_FOUNTAIN.x-PARK_ST_HEADHOUSE.x,
  BREWER_FOUNTAIN.z-PARK_ST_HEADHOUSE.z)>12);
});
test('all three surface station E spots match actual neighborhoods',()=>{
 const by=Object.fromEntries(MBTA_STATIONS.map(s=>[s.id,s]));
 const matching=(s,p)=>assert.deepEqual([s.surfaceX,s.surfaceZ],[p.x,p.z]);
 matching(by.park,PARK_ST_ENTRY);
 matching(by.boylston,BOYLSTON_ENTRY);
 matching(by.arlington,ARLINGTON_ENTRY);
 assert.ok(BOYLSTON_ENTRY.x>170&&BOYLSTON_ENTRY.z>75,
   'Boylston Green Line is at Tremont/Boylston, not Charles/Boylston');
 assert.ok(ARLINGTON_ENTRY.x<-170&&ARLINGTON_ENTRY.z>70);
 assert.ok(Math.abs(PARK_ST_HEADHOUSE.x+PARK_ST_HEADHOUSE.openStairDX-
  PARK_ST_ENTRY.x)<.01,'real open staircase is the actual E trigger');
});
test('Brewer atlas discovery follows the moved physical fountain',()=>{
 const b=LANDMARKS.find(l=>l.id==='fountain');
 assert.deepEqual([b.x,b.z],[BREWER_FOUNTAIN.x,BREWER_FOUNTAIN.z]);
});

test('rendered plaza paint, wet paving, terrain contact and fountain props never diverge',()=>{
 const world=readFileSync(new URL('../js/world/world.js',import.meta.url),'utf8');
 const art=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 assert.doesNotMatch(world,/-25\s*,\s*-58/,
   'old west-Common Brewer ghost must not remain in any paint layer');
 assert.match(world,/terrainDisc\(BREWER_FOUNTAIN\.x,BREWER_FOUNTAIN\.z,10,wetPathMat\)/);
 assert.match(world,/terrainDisc\(BREWER_FOUNTAIN\.x,BREWER_FOUNTAIN\.z,BREWER_FOUNTAIN\.plazaRadius,pathBorderMat/);
 assert.match(world,/\[BREWER_FOUNTAIN\.x,BREWER_FOUNTAIN\.z,10\]/);
 assert.match(world,/PLAZA_TOPS = .*BREWER_FOUNTAIN\.x/);
 assert.match(art,/const \{ x,z \} = BREWER_FOUNTAIN, gy = groundHeight/);
});
