import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const raw = readFileSync(new URL('../js/ui/map-math.js', import.meta.url),'utf8');
const {mapPoint,mapHeading,mapRealm} =
  await import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
const bounds={minX:-215,maxX:215,minZ:-125,maxZ:125};
test('atlas preserves geometry aspect ratio and north-up orientation',()=>{
  const NW=mapPoint(-215,-125,bounds,700,500);
  const SE=mapPoint(215,125,bounds,700,500);
  assert.ok(NW.x<SE.x && NW.y<SE.y);
  const zero=mapPoint(0,0,bounds,700,500);
  const east=mapPoint(10,0,bounds,700,500);
  const south=mapPoint(0,10,bounds,700,500);
  assert.ok(Math.abs((east.x-zero.x)-(south.y-zero.y))<1e-10);
  assert.equal(zero.y,250);
});
test('heading marker matches the first-person camera direction',()=>{
  const north=mapHeading(0), east=mapHeading(-Math.PI/2);
  assert.ok(Math.abs(north.x)<1e-12 && north.z < -0.999);
  assert.ok(east.x>0.999 && Math.abs(east.z)<1e-12);
});
test('other realms use an honest destination title, never a false park marker',()=>{
  assert.equal(mapRealm({}),null);
  assert.equal(mapRealm({inBurrow:true}),'RAT TUNNELS');
  assert.equal(mapRealm({inEsplanade:true}),'CHARLES RIVER ESPLANADE');
  assert.equal(mapRealm({inFenway:true}),'FENWAY PARK');
  assert.equal(mapRealm({inCityHall:true}),'CITY HALL PLAZA');
  assert.equal(mapRealm({inGarden:true}),'TD GARDEN');
  assert.equal(mapRealm({inHollow:true}),'HOLLOW TREE');
});
