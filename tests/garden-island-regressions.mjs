import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const load=(p)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL(p,import.meta.url),'utf8')).toString('base64'));
const {GARDEN_LAGOON_SHORE,GARDEN_ISLAND_SHORE,
 lagoonContains,lagoonBasin,lagoonWaterClearance,isGardenIsland,
 insideShoreRing,shoreDistance,gardenBridgeLanding}=await load('../js/world/garden-lagoon-layout.js');
const {swanRidePose}=await load('../js/systems/swan-ride-rules.js');
test('one contiguous, irregular water ring and its actual dry terrain island',()=>{
 assert.equal(GARDEN_LAGOON_SHORE.length,96);
 assert.equal(GARDEN_ISLAND_SHORE.length,32);
 assert.ok(isGardenIsland(-134,-31));
 assert.ok(lagoonBasin(-134,-31)<0,'island must rise above waterline');
 assert.equal(lagoonContains(-134,-31),false);
 assert.equal(lagoonContains(-134,-11),true);
 assert.equal(lagoonContains(-134,18),true);
 assert.equal(lagoonContains(-185,0),false);
 for(const [x,z] of GARDEN_ISLAND_SHORE){
  assert.ok(insideShoreRing(x,z,GARDEN_LAGOON_SHORE));
  assert.ok(shoreDistance(x,z,GARDEN_LAGOON_SHORE)>9);
 }
 for(const side of [-1,1]){
  const p=gardenBridgeLanding(side);
  assert.equal(lagoonContains(p.x,p.z),false,'bridge landing must be dry');
 }
});
test('signed shoreline with margins has no dry/wet mismatches at dense probes',()=>{
 for(let x=-170;x<=-90;x+=.5)for(let z=-62;z<=62;z+=.5){
  const c=lagoonWaterClearance(x,z);
  assert.equal(lagoonContains(x,z),c>0,'water edge '+x+','+z);
  assert.equal(lagoonContains(x,z,3),c>3,'three-metre envelope '+x+','+z);
 }
});
test('full 56-second tour hull and BOTH drifting craft stay away from island and banks',()=>{
 for(let i=0;i<=2000;i++){
  const p=swanRidePose(i/2000);
  assert.ok(lagoonWaterClearance(p.x,p.z)>5,
    'swan tour clips organic shore '+JSON.stringify(p));
 }
 for(const d of [{cx:-150,cz:15,rx:1,rz:2,ph:.6},
  {cx:-114,cz:14,rx:1,rz:2,ph:3.4}]){
  for(let i=0;i<=720;i++){
   const a=d.ph+i/720*Math.PI*2,x=d.cx+d.rx*Math.cos(a),z=d.cz+d.rz*Math.sin(a);
   assert.ok(lagoonWaterClearance(x,z)>5,'ambient full hull in bank '+x+','+z);
  }
 }
});
test('one physical shoreline drives terrain, water, fog, curb blocks, map and 3D survey',()=>{
 const sources=['../js/world/world.js','../js/systems/daycycle.js',
  '../js/ui/park-map.js','../js/main.js'].map(p=>readFileSync(new URL(p,import.meta.url),'utf8'));
 assert.match(sources[0],/new THREE\.ShapeGeometry\(waterShape\)/);
 assert.match(sources[0],/GARDEN_ISLAND_SHORE\.map/);
 assert.match(sources[0],/lagoonBasin\(x,z\)/);
 assert.match(sources[0],/lagoonContains\(x,z\)/);
 assert.match(sources[1],/e===MAP\.lagoon\?lagoonContains/);
 assert.match(sources[2],/GARDEN_ISLAND_SHORE\.forEach/);
 assert.match(sources[3],/surveyGardenLagoon/);
});

test('rocky island tree and boulders are physically registered and separated from shore network',()=>{
 const tree=readFileSync(new URL('../js/world/trees.js',import.meta.url),'utf8');
 assert.match(tree,/buildCanopy\(scene\);\s*\/\/ Planted AFTER the network/);
 assert.match(tree,/buildGardenIslandTree\(scene\)/);
 assert.match(tree,/S\.solids\.push\(\{x,z,r:\.48,minY:gy-\.12,maxY:gy\+h\}\)/);
 assert.match(tree,/S\.platforms\.push\(\{x,z,r:canopyR\*\.92,y:canopyY-\.55\}\)/);
 assert.match(tree,/S\.solids\.push\(\{x:rx,z:rz,r:sx\*\.88/);
 for(const [x,z] of [[-137,-31.5],[-131,-33],[-134,-27.8]])
  assert.ok(isGardenIsland(x,z),'boulder is planted in water');
});

test('island shores grade to waterline continuously and are physically climbable',()=>{
 let prev=null,highestStep=0,min=Infinity,max=-Infinity;
 // Cross the island on an east-west path; this traverses both shores.
 for(let x=-145;x<=-123;x+=.1){
  const y=-lagoonBasin(x,-31);
  if(prev!==null)highestStep=Math.max(highestStep,Math.abs(y-prev));
  prev=y;min=Math.min(min,y);max=Math.max(max,y);
 }
 assert.ok(highestStep<.055,'unclimbable invisible island height cliff: '+highestStep);
 assert.ok(max>.3&&min<-.4,'real island rise and submerged shallows');
});

test('shore-side under-water shelf preserves island floor across 2.9m terrain-grid triangles',()=>{
 // Analytic basin must stay 0m deep for 2.8m outside the island ring,
 // so interpolated vertices do not drag a dry island into deep water.
 const c=[-134,-31];
 for(const [x,z] of GARDEN_ISLAND_SHORE.slice(0).filter((p,i)=>i%4===0)){
  const vx=x-c[0],vz=z-c[1],d=Math.hypot(vx,vz);
  const outsideX=x+vx/d*.5,outsideZ=z+vz/d*.5;
  assert.ok(lagoonBasin(outsideX,outsideZ)<.005,
   'shelf nearest the island should be shallow, never a cliff');
 }
});
