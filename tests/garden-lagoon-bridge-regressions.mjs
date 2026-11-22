import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const load=(path)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL(path,import.meta.url),'utf8')).toString('base64'));
const {GARDEN_LAGOON,GARDEN_BRIDGE,GARDEN_DOCK,lagoonEllipse,
 gardenBridgeDeck,gardenBridgeLanding,gardenBridgeRamp,gardenBridgeHeight,gardenBridgeUnderClearance}=await load('../js/world/garden-lagoon-layout.js');
const {SWAN_DOCK,swanRidePose}=await load('../js/systems/swan-ride-rules.js');
test('Garden water lobes run north-south; actual Mall↔Common bridge east-west',()=>{
 assert.ok(GARDEN_LAGOON.rz>GARDEN_LAGOON.rx*1.9);
 assert.equal(GARDEN_BRIDGE.axis,'east-west');
 assert.ok(GARDEN_BRIDGE.halfLength>GARDEN_BRIDGE.halfWidth*6);
 assert.ok(gardenBridgeDeck(GARDEN_BRIDGE.x,0,GARDEN_BRIDGE.deckY));
 assert.ok(gardenBridgeDeck(GARDEN_BRIDGE.x+20,1,GARDEN_BRIDGE.deckY));
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
 assert.match(main,/walkSurface\(x,z,b\.deckY,1\.5/);
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
 assert.ok(gardenBridgeHeight(x)>4.5,'solid crest clears the full white swan head');
 assert.ok(gardenBridgeUnderClearance(x)>4,'4m bridge underside at boat lane');
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
