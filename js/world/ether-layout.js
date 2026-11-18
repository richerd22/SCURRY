// Ether Fountain: authored northwest Garden placement, not survey-grade GPS.
export const ETHER=Object.freeze({x:-186,z:-73,side:7.8,basinHeight:.36,pedestalHeight:3.8});
export function etherColliders(y) {
 const {x,z,side,basinHeight,pedestalHeight}=ETHER,h=side/2,t=.48;
 const walls=[
  {minX:x-h,maxX:x-h+t,minZ:z-h,maxZ:z+h},
  {minX:x+h-t,maxX:x+h,minZ:z-h,maxZ:z+h},
  {minX:x-h+t,maxX:x+h-t,minZ:z-h,maxZ:z-h+t},
  {minX:x-h+t,maxX:x+h-t,minZ:z+h-t,maxZ:z+h},
 ].map(v=>({...v,minY:y-.18,maxY:y+basinHeight}));
 return {walls,center:{minX:x-1.65,maxX:x+1.65,minZ:z-1.65,maxZ:z+1.65,minY:y-.18,maxY:y+pedestalHeight}};
}
