// Charles Street raised pavements: one source for visible wedges and
// collision support. Two 0.75m shoulders grade to the central 1.20m walk,
// so 25cm-eye squirrel camera doesn't jump a 13cm vertical slab.
export const CURB_PROFILE=Object.freeze({
  halfWidth:1.35, shoulder:.75, raised:.13, edge:.015,
  centerY:.06, slabThickness:.14, length:16.4
});
export function makeCharlesSidewalkLayout(groundAt){
  if(typeof groundAt!=='function')throw new TypeError('ground function required');
  const cores=[],ramps=[];
  const {halfWidth,shoulder,raised,edge,centerY,slabThickness,length}=CURB_PROFILE;
  const flatWidth=2*(halfWidth-shoulder);
  for(let z=-96;z<96;z+=16){
    const centerZ=z+8,minZ=z-.2,maxZ=z+16.2;
    for(const cx of [-59.9,-40.1]){
      const floor=groundAt(cx,centerZ);
      if(!Number.isFinite(floor))throw new TypeError('non-finite sidewalk terrain');
      const top=floor+raised,lip=floor+edge;
      const common={minZ,maxZ};
      cores.push({
        p:[cx,floor+centerY,centerZ],s:[flatWidth,slabThickness,length],
        collision:{minX:cx-halfWidth+shoulder,maxX:cx+halfWidth-shoulder,
          ...common,y:top,isCharlesSidewalk:true}
      });
      ramps.push({
        highAtRight:true,
        p:[cx-halfWidth+shoulder/2,floor+centerY,centerZ],
        s:[shoulder,1,length],
        collision:{minX:cx-halfWidth,maxX:cx-halfWidth+shoulder,
          ...common,y:top,y0:lip,y1:top,isCharlesSidewalk:true}
      });
      ramps.push({
        highAtRight:false,
        p:[cx+halfWidth-shoulder/2,floor+centerY,centerZ],
        s:[shoulder,1,length],
        collision:{minX:cx+halfWidth-shoulder,maxX:cx+halfWidth,
          ...common,y:top,y0:top,y1:lip,isCharlesSidewalk:true}
      });
    }
  }
  return {cores,ramps};
}
