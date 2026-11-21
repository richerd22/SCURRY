import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const load=(path)=>import('data:text/javascript;base64,'+
 Buffer.from(readFileSync(new URL(path,import.meta.url),'utf8')).toString('base64'));
const {GARDEN_LAGOON,GARDEN_BRIDGE,GARDEN_DOCK,lagoonEllipse,
 gardenBridgeDeck,gardenBridgeLanding,gardenBridgeRamp}=await load('../js/world/garden-lagoon-layout.js');
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
  assert.ok(lagoonEllipse(p.x,p.z)<.87,
   'shore clip at boat centre '+JSON.stringify(p));
  assert.ok(p.z>12,'boat route through real bridge '+JSON.stringify(p));
  length+=Math.hypot(p.x-prev.x,p.z-prev.z);prev=p;
 }
 assert.ok(length>50&&length<140);
});
test('actual source explicitly rotates visible deck, rail solids and goose actions',()=>{
 const landmarks=readFileSync(new URL('../js/world/landmarks.js',import.meta.url),'utf8');
 const geese=readFileSync(new URL('../js/systems/geese.js',import.meta.url),'utf8');
 const state=readFileSync(new URL('../js/state.js',import.meta.url),'utf8');
 assert.match(landmarks,/g\.rotation\.y=Math\.PI\/2/);
 assert.match(landmarks,/GARDEN_BRIDGE\.scaleLength/);
 assert.match(landmarks,/minX:x-h,maxX:x\+h,minZ:-B\.halfWidth/);
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
