// Public Garden's central axis connects Commonwealth Avenue Mall (west)
// with Boston Common (east). SCURRY local X east+, Z south+.
// A north-south lagoon and an east-west bridge match the historic topology,
// but remain stylized metres, not a real engineering survey.
export const GARDEN_LAGOON=Object.freeze({x:-132,z:0,rx:26,rz:54});
export const GARDEN_BRIDGE=Object.freeze({
 x:GARDEN_LAGOON.x,z:0,axis:'east-west',
 halfLength:24,halfWidth:2.7,scaleLength:24/18,
 deckY:1.15,railY:2.07,shoreX:31,
 rampLength:6,shoreY:.28,
});
export const GARDEN_DOCK=Object.freeze({
 x:-140.5,z:47.9,boatX:-140,boatZ:44,deckY:.45,
});
export function lagoonEllipse(x,z,marginX=0,marginZ=0){
 const a=GARDEN_LAGOON;
 const rx=a.rx-marginX,rz=a.rz-marginZ;
 if(![x,z,marginX,marginZ].every(Number.isFinite)||rx<=0||rz<=0)return Infinity;
 return ((x-a.x)/rx)**2+((z-a.z)/rz)**2;
}
export function gardenBridgeDeck(x,z,y=null){
 const b=GARDEN_BRIDGE;
 return Number.isFinite(x)&&Number.isFinite(z)&&
   Math.abs(x-b.x)<=b.halfLength&&Math.abs(z-b.z)<=b.halfWidth&&
   // Feet below the deck or more than one squirrel-hop above it are
   // outside the goose jurisdiction, even directly beneath the bridge.
   (y===null||Number.isFinite(y)&&
     y>=b.deckY-.12&&y<=b.deckY+.65);
}
export function gardenBridgeLanding(side){
 const b=GARDEN_BRIDGE;
 return {x:b.x+(side<0?-b.shoreX:b.shoreX),z:b.z};
}


export function gardenBridgeRamp(side) {
 if(side!==-1&&side!==1)throw new RangeError('side ±1');
 const b=GARDEN_BRIDGE,inner=b.x+side*b.halfLength;
 const outer=inner+side*b.rampLength;
 return {
   minX:Math.min(inner,outer),maxX:Math.max(inner,outer),
   minZ:b.z-b.halfWidth,maxZ:b.z+b.halfWidth,
   y0:side<0?b.shoreY:b.deckY,y1:side<0?b.deckY:b.shoreY,
 };
}
