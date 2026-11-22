// A single authored, island-cut shoreline shared by Garden water, shore art,
// map, terrain basin, wet feet, wildlife and boat navigation. X east+, Z south+.
// Stylized local metres, NOT engineering/survey dimensions.
export const GARDEN_LAGOON=Object.freeze({x:-132,z:0,rx:26,rz:54});
export const GARDEN_ISLAND=Object.freeze({x:-134,z:-31,rx:4.4,rz:4.6});
function ring(x,z,rx,rz,n,island=false){
 const points=[];
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2;
  const k=island?1+.08*Math.sin(3*a+.3)+.035*Math.cos(5*a-.5)
   :1+.052*Math.sin(3*a+.4)+.032*Math.cos(5*a-.8)+
      .025*Math.sin(9*a+.25)+.06*Math.max(0,Math.sin(a));
  points.push(Object.freeze([x+rx*Math.cos(a)*k,z+rz*Math.sin(a)*k]));
 }
 return Object.freeze(points);
}
export const GARDEN_LAGOON_SHORE=ring(-132,0,26,54,96);
export const GARDEN_ISLAND_SHORE=ring(-134,-31,4.4,4.6,32,true);
export function insideShoreRing(x,z,points){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])
   inside=!inside;
 }
 return inside;
}
export function shoreDistance(x,z,points){
 if(!Number.isFinite(x)||!Number.isFinite(z))return Infinity;
 let best=Infinity;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
 }
 return best;
}
export function isGardenIsland(x,z){return insideShoreRing(x,z,GARDEN_ISLAND_SHORE);}
// Signed distance to nearest shore: positive for water, negative for dry
// land or island. Every water-related system must use this exact polygon.
export function lagoonWaterClearance(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return -Infinity;
 if(!insideShoreRing(x,z,GARDEN_LAGOON_SHORE))
  return -shoreDistance(x,z,GARDEN_LAGOON_SHORE);
 if(isGardenIsland(x,z))return -shoreDistance(x,z,GARDEN_ISLAND_SHORE);
 return Math.min(shoreDistance(x,z,GARDEN_LAGOON_SHORE),
   shoreDistance(x,z,GARDEN_ISLAND_SHORE));
}
export function lagoonContains(x,z,margin=0){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(margin)||margin<0)return false;
 // Reject nearly the entire city BEFORE walking a 96-edge polygon.
 if(Math.abs(x+132)>31||Math.abs(z)>61)return false;
 if(margin===0)return insideShoreRing(x,z,GARDEN_LAGOON_SHORE)&&
   !isGardenIsland(x,z);
 return lagoonWaterClearance(x,z)>margin;
}
export function lagoonBasin(x,z){
 if(Math.abs(x+132)>31||Math.abs(z)>61)return 0;
 if(isGardenIsland(x,z))
  return -.34*Math.min(1,shoreDistance(x,z,GARDEN_ISLAND_SHORE)/3.4);
 if(!insideShoreRing(x,z,GARDEN_LAGOON_SHORE))return 0;
 // Both banks grade to the same 0m waterline: a squirrel can step
 // out of the shallow side onto a 34cm-high island without a cliff.
 // The terrain mesh has ~2.9m triangle spacing. A near-shore
 // underwater shelf prevents any island-facing triangle from being
 // pulled below the waterline by an adjacent deep-water vertex.
 const islandClear=shoreDistance(x,z,GARDEN_ISLAND_SHORE);
 return .6*Math.min(1,shoreDistance(x,z,GARDEN_LAGOON_SHORE)/8,
   Math.max(0,(islandClear-2.8)/4));
}
// Legacy approximation for old compatibility probes. Never use this
// ellipsoid for water, collision, props, shore, map, or navigation.
export function lagoonEllipse(x,z,marginX=0,marginZ=0){
 const a=GARDEN_LAGOON,rx=a.rx-marginX,rz=a.rz-marginZ;
 if(![x,z,marginX,marginZ].every(Number.isFinite)||rx<=0||rz<=0)return Infinity;
 return ((x-a.x)/rx)**2+((z-a.z)/rz)**2;
}
export const GARDEN_BRIDGE=Object.freeze({
 x:GARDEN_LAGOON.x,z:0,axis:'east-west',
 halfLength:24,halfWidth:2.7,scaleLength:24/18,
 deckY:1.15,railY:2.07,shoreX:31,
 rampLength:6,shoreY:.28,archRise:2.05,deckThickness:.35,
});
// Source photographs show stone pylons near human scale, rather than the
// former five-metre cast-iron fantasy towers. These are photo-informed
// ARTISTIC relative sizes, not surveyed engineering dimensions.
export const GARDEN_BRIDGE_PIER=Object.freeze({
 offset:18,z:2.6,width:.86,submergedBase:-.95,
 topAboveDeck:3.3,lampAboveDeck:3.53,
 cableAboveCrest:1.06,cableAbovePierDeck:3.08,
});
export const GARDEN_DOCK=Object.freeze({
 x:-140.5,z:47.9,boatX:-140,boatZ:44,deckY:.45,
});
// Arch has level 1.15m end deck (unchanged six-metre landings) and
// a 3.20m crest. Solid deck, railings and actual goose feet MUST use
// the identical analytic curve. Quartic crest is smooth at centre and
// at the endpoints, unlike a stair-step or fake visual arch.
export function gardenBridgeHeight(x){
 const b=GARDEN_BRIDGE;
 if(!Number.isFinite(x))return NaN;
 const u=Math.min(1,Math.abs(x-b.x)/b.halfLength);
 return b.deckY+b.archRise*(1-u*u)**2;
}
export function gardenBridgeUnderClearance(x){
 return gardenBridgeHeight(x)-GARDEN_BRIDGE.deckThickness;
}
export function gardenBridgeDeck(x,z,y=null){
 const b=GARDEN_BRIDGE;
 if(!Number.isFinite(x)||!Number.isFinite(z)||
   Math.abs(x-b.x)>b.halfLength||Math.abs(z-b.z)>b.halfWidth)
   return false;
 const h=gardenBridgeHeight(x);
 return y===null||Number.isFinite(y)&&y>=h-.12&&y<=h+.65;
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
