import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const load=(path)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL(path,import.meta.url),'utf8')).toString('base64'));
const {GARDEN_LAGOON,GARDEN_BRIDGE,GARDEN_DOCK,lagoonEllipse,
 GARDEN_BRIDGE_PIER,gardenBridgeDeck,gardenBridgeLanding,gardenBridgeRamp,gardenBridgeHeight,gardenBridgeUnderClearance}=await load('../js/world/garden-lagoon-layout.js');
const {SWAN_DOCK,swanRidePose}=await load('../js/systems/swan-ride-rules.js');
test('Garden water lobes run north-south; actual Mall↔Common bridge east-west',()=>{
 assert.ok(GARDEN_LAGOON.rz>GARDEN_LAGOON.rx*1.9);
 assert.equal(GARDEN_BRIDGE.axis,'east-west');
 assert.ok(GARDEN_BRIDGE.halfLength>GARDEN_BRIDGE.halfWidth*6);
 assert.ok(gardenBridgeDeck(GARDEN_BRIDGE.x,0,gardenBridgeHeight(GARDEN_BRIDGE.x)));
 assert.ok(gardenBridgeDeck(GARDEN_BRIDGE.x+20,1,gardenBridgeHeight(GARDEN_BRIDGE.x+20)));
 assert.equal(gardenBridgeDeck(GARDEN_BRIDGE.x,15),false);
 const e=gardenBridgeLanding(1),w=gardenBridgeLanding(-1);
 assert.ok(e.x>GARDEN_BRIDGE.x&&w.x<GARDEN_BRIDGE.x);
 assert.ok(lagoonEllipse(e.x,0)>1&&lagoonEllipse(w.x,0)>1,
   'bridge landings reach actual dry east/west shore');
});
test('statics and Swan Boat mooring agree with same physical south-lagoon dock',()=>{
 assert.deepEqual([SWAN_DOCK.boardX,SWAN_DOCK.boardZ,SWAN_DOCK.deckY],
  [GARDEN_DOCK.x,GARDEN_DOCK.z,GARDEN_DOCK.deckY]);
 assert.deepEqual([SWAN_DOCK.x,SWAN_DOCK.z],
  [GARDEN_DOCK.boatX,GARDEN_DOCK.boatZ]);
 assert.ok(lagoonEllipse(SWAN_DOCK.x,SWAN_DOCK.z)<.9);
});
test('full boat CatmullRom course stays inside south lobe and clear of bridge',()=>{
 let length=0,prev=swanRidePose(0);
 for(let i=0;i<=2000;i++){
  const p=swanRidePose(i/2000);
  // 5m in every direction covers the swan-decorated hull, not merely
  // the centreline. Never fake an in-bounds route with a clipped stern.
  assert.ok(lagoonEllipse(p.x,p.z,5,5)<1,
   'full 5m hull envelope clips shoreline '+JSON.stringify(p));
  assert.ok(p.z>-52,'boat drove beyond northern bank '+JSON.stringify(p));
  length+=Math.hypot(p.x-prev.x,p.z-prev.z);prev=p;
 }
 assert.ok(length>180&&length<230);
 assert.ok(swanRidePose(.42).z<0,'full circuit must pass north of the bridge');
});
test('actual source explicitly rotates visible deck, rail solids and goose actions',()=>{
 const landmarks=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const geese=readFileSync(new URL('../js/systems/geese.js',import.meta.url),'utf8');
 const state=readFileSync(new URL('../js/state.js',import.meta.url),'utf8');
 assert.match(landmarks,/sheet\(0,deckMat,'scurryGardenBridgeSurface'\)/);
 assert.match(landmarks,/sheet\(-b\.deckThickness,deckMat,'scurryGardenBridgeUnderside'\)/);
 assert.match(landmarks,/S\.platformBoxes\.push\(\{minX:x0,maxX:x1,minZ:-w,maxZ:w/);
 assert.match(geese,/gardenBridgeDeck\(P\.pos\.x,P\.pos\.z,P\.pos\.y\)/);
 assert.match(geese,/gardenBridgeLanding/);
 assert.match(state,/lagoon:\s*\{\s*x:\s*-132,\s*z:\s*0,\s*rx:\s*26,\s*rz:\s*54\s*\}/);
});


test('bridge approach slopes form continuous visible walkable elevations',()=>{
 const b=GARDEN_BRIDGE,left=gardenBridgeRamp(-1),right=gardenBridgeRamp(1);
 assert.equal(left.maxX,b.x-b.halfLength);
 assert.equal(right.minX,b.x+b.halfLength);
 assert.equal(left.minX,b.x-b.halfLength-b.rampLength);
 assert.equal(right.maxX,b.x+b.halfLength+b.rampLength);
 assert.ok(left.y0>0&&right.y1>0);
 assert.equal(left.y1,b.deckY);
 assert.equal(right.y0,b.deckY);
 assert.equal(left.minZ,-b.halfWidth);
 assert.equal(right.maxZ,b.halfWidth);
 assert.throws(()=>gardenBridgeRamp(0),RangeError);
 const height=(r,x)=>r.y0+(r.y1-r.y0)*(x-r.minX)/(r.maxX-r.minX);
 for(const r of [left,right])for(let i=0;i<=60;i++){
  const x=r.minX+(r.maxX-r.minX)*i/60,h=height(r,x);
  assert.ok(h>=b.shoreY-1e-8&&h<=b.deckY+1e-8);
 }
});
test('source registers exactly tagged collision boxes and visible triangle ramps',()=>{
 const src=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 assert.match(src,/gardenBridgeRamp\(side\)/);
 assert.match(src,/geo\.setIndex\(\[0,1,2,1,3,2\]\)/);
 assert.match(src,/S\.platformBoxes\.push\(\{\.\.\.ramp,isGardenBridgeSurface:true\}\)/);
 assert.match(main,/surveyGardenBridge:\(\)=>/);
 assert.match(main,/ray\.intersectObjects\(meshes,false\)/);
 assert.match(main,/walkSurface\(x,z,declared,1\.5/);
});
test('old land-based park props and burrow entrances no longer spawn inside reshaped lagoon',()=>{
 const props=readFileSync(new URL('../js/world/props.js',import.meta.url),'utf8');
 const burrow=readFileSync(new URL('../js/systems/burrows.js',import.meta.url),'utf8');
 const art=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const positions=[
  [-120,-62],[-146,59],[-132,-67],[-132,67],[-168,-43],
  [-168,46],[-95,45],[-163,0],[-101,0],
 ];
 for(const [x,z] of positions){
  assert.ok(lagoonEllipse(x,z,1.5,1)>1.01,
    'prop inside visible water: '+x+','+z);
 }
 for(const text of [
  '[-120, -62, 3.1]','[-146, 59, 0.2]',
  '[-132, -67]','[-132, 67]','[-168, -43]'])
    assert.ok(props.includes(text),'missing dry prop '+text);
 assert.match(art,/\[-168, 46\]/);
 assert.match(burrow,/sx: -95, sz: 45, drain: true/);
 assert.match(burrow,/\[-163, 0\]/);
 assert.match(burrow,/\[-101, 0\]/);
});


test('geese guard only the actual deck, not water below or canopy above',()=>{
 const b=GARDEN_BRIDGE,x=b.x,z=b.z;
 assert.equal(gardenBridgeDeck(x,z),true);
 assert.equal(gardenBridgeDeck(x,z,gardenBridgeHeight(x)),true);
 assert.ok(gardenBridgeHeight(x)>3.1,'solid crest clears the rescaled white swan head');
 assert.ok(gardenBridgeUnderClearance(x)>2.8,'2.85m bridge underside at boat lane');
 assert.equal(gardenBridgeDeck(x,z,gardenBridgeHeight(x)-.08),true);
 assert.equal(gardenBridgeDeck(x,z,gardenBridgeHeight(x)+.5),true);
 for(const y of [-2,-.2,0,.3,gardenBridgeHeight(x)-.13,gardenBridgeHeight(x)+.8,gardenBridgeHeight(x)+2]){
  assert.equal(gardenBridgeDeck(x,z,y),false,'wrong goose target at Y='+y);
 }
 assert.equal(gardenBridgeDeck(x,z,NaN),false);
 const source=readFileSync(new URL('../js/systems/geese.js',import.meta.url),'utf8');
 assert.match(source,/gardenBridgeDeck\(P\.pos\.x,P\.pos\.z,P\.pos\.y\)/);
 assert.match(source,/gardenBridgeDeck\(fp\.x,fp\.z,fp\.y\)/);
});
test('dropped bridge snacks land on real raised planks, not submerged soil',()=>{
 const food=readFileSync(new URL('../js/systems/food.js',import.meta.url),'utf8');
 assert.match(food,/gardenBridgeDeck\(P\.x,P\.z,P\.y\)&&gardenBridgeDeck\(x,z\)/);
 assert.match(food,/onDeck\?\{y:gardenBridgeHeight\(x\)\}:\{\}/);
});

test('elevated physics smoke selects actual registered 3.20m arch strip, not old flat bridge',()=>{
 const src=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 assert.match(src,/s\.isGardenBridgeSurface&&/);
 assert.match(src,/s\.y0>3\.1&&s\.y1>3\.1/);
 assert.match(src,/y:boxSurfaceHeight\(bridge,/);
 assert.doesNotMatch(src,/Math\.abs\(s\.y-1\.15\)/);
});


test('photo-calibrated bridge pylons and sculpture have real geometry and collision',()=>{
 assert.equal(GARDEN_BRIDGE.archRise,2.05);
 assert.equal(GARDEN_BRIDGE.deckThickness,.35);
 assert.ok(Math.abs(gardenBridgeHeight(GARDEN_BRIDGE.x)-3.2)<1e-10);
 assert.ok(Math.abs(gardenBridgeUnderClearance(GARDEN_BRIDGE.x)-2.85)<1e-10);
 assert.ok(GARDEN_BRIDGE_PIER.topAboveDeck<3.5);
 assert.ok(GARDEN_BRIDGE_PIER.lampAboveDeck<3.7);
 const src=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 assert.match(src,/pier.userData.scurryGardenBridgePier=true/);
 assert.match(src,/isGardenBridgePier:true/);
 assert.match(src,/s.scale.y=.55/);
 assert.match(main,/surveyGardenBridgePiers:\(\)=>/);
});

test('granite bridge pylon bases are sunk into rendered lakebed, not just water plane',()=>{
 assert.equal(GARDEN_BRIDGE_PIER.submergedBase,-.95);
 const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const harness=readFileSync(new URL('../harness/browser-smoke.mjs',import.meta.url),'utf8');
 assert.match(main,/pier has no lakebed to be rooted in/);
 assert.match(main,/minLakebedEmbed/);
 assert.match(harness,/piers\.minLakebedEmbed>\.12/);
});

test('Victorian iron X-pattern is one instanced mesh fully backed by real rail walls',()=>{
 const src=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const qa=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../harness/browser-smoke.mjs',import.meta.url),'utf8');
 assert.match(src,/new THREE\.BoxGeometry\(\.046,1,\.046\),railMat,4\*n/);
 assert.match(src,/lattice.userData.scurryGardenBridgeLattice=true/);
 assert.match(src,/isGardenBridgeRail:true/);
 assert.doesNotMatch(src,/box\(\.2,\.18,5\.6,white,x,base\+2\.98/);
 assert.match(qa,/surveyGardenBridgeLattice:\(\)=>/);
 assert.match(qa,/const rail=walls.find\(w=>/);
 assert.match(browser,/lattice\.unsupported,0/);
});
test('granite lamp-post cap has a separate real narrow iron stem with physical collision',()=>{
 assert.ok(GARDEN_BRIDGE_PIER.topAboveDeck<2.75);
 assert.ok(GARDEN_BRIDGE_PIER.lampAboveDeck-GARDEN_BRIDGE_PIER.topAboveDeck>.8);
 const src=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const qa=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 assert.match(src,/stem.userData.scurryGardenBridgeLampStem=true/);
 assert.match(src,/isGardenBridgeLampStem:true/);
 assert.match(qa,/minStemLength/);
});
