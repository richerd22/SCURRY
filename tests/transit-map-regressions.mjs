import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const load=(file)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL(file,import.meta.url),'utf8')).toString('base64'));
const {mapRealm,mapPoint}=await load('../js/ui/map-math.js');
const {MBTA_STATIONS}=await load('../js/systems/mbta-rules.js');
test('the subway is a separate map realm, never a squirrel marker 8km away',()=>{
 assert.equal(mapRealm({inMBTA:true}),'THE T · SUBWAY STATIONS');
 assert.equal(mapRealm({inBurrow:true,inMBTA:true}),'RAT TUNNELS');
});
test('all three station entrances are in the actual atlas drawing bounds',()=>{
 const map={minX:-215,maxX:215,minZ:-125,maxZ:125};
 for(const s of MBTA_STATIONS){
  const p=mapPoint(s.surfaceX,s.surfaceZ,map,460,300,12);
  assert.ok(p.x>12&&p.x<448&&p.y>12&&p.y<288,
    s.name+' T map pin is off-map');
 }
});
test('transit marks are never persisted as 15th, 16th or 17th Field Notes',()=>{
 const src=readFileSync(new URL('../js/ui/park-map.js',import.meta.url),'utf8');
 assert.match(src,/entries\.push\(\{id:'station-'\+station\.id/);
 assert.match(src,/entry\.transit\?'':entry\.id/);
 assert.match(src,/if\(item\.dataset\.transit==='true'\)continue/);
});
