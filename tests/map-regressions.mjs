import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const raw = readFileSync(new URL('../js/ui/map-math.js', import.meta.url),'utf8');
const math = await import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
const {mapPoint,mapHeading,mapRealm} =
  math;
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

test('waypoint compass handles all cardinal directions at yaw zero',()=>{
  const arrows=[['N',0,-10,'↑'],['E',10,0,'→'],['S',0,10,'↓'],['W',-10,0,'←']];
  for(const [name,x,z,expected] of arrows){
    const nav=math.waypointBearing(0,0,0,x,z);
    assert.equal(nav.arrow,expected,name);
    assert.equal(nav.distance,10,name);
  }
});
test('rotating toward a target centers the navigation arrow',()=>{
  const nav=math.waypointBearing(0,0,-Math.PI/2,10,0);
  assert.equal(nav.arrow,'↑');
  const far=math.waypointBearing(-10,-10,0,-10,-20);
  assert.equal(far.arrow,'↑');
});
test('waypoint distance and diagonals are ground-plane, not altitude',()=>{
  const nav=math.waypointBearing(2,3,0,5,-1);
  assert.equal(nav.distance,5);
  assert.equal(nav.arrow,'↗');
});
