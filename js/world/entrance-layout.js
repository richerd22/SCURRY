// Authored entrance anchors connected to the existing fence run gaps.
// Source of reference: City of Boston Boston Common Master Plan, chapter 2
// (park entrance architectural family, piers and ornamental ironwork).
// Positions are SCURRY's local stylized world metres, not surveyed GIS.
export const PARK_ENTRANCES = Object.freeze([
  {id:'garden-charles-north',park:'garden',axis:'z',fixed:-62,lo:-76,hi:-56},
  {id:'garden-charles-south',park:'garden',axis:'z',fixed:-62,lo:20,hi:44},
  {id:'common-charles',park:'common',axis:'z',fixed:-38,lo:-84,hi:-60},
  {id:'common-beacon',park:'common',axis:'x',fixed:-100,lo:120,hi:150},
]);

export function makeParkEntranceLayout(groundAt,entrances=PARK_ENTRANCES) {
  if(typeof groundAt!=='function')throw new TypeError('entrances require a terrain sampler');
  const piers=[],signs=[];
  for(const gate of entrances){
    const {axis,fixed,lo,hi,id,park}=gate;
    if(!['x','z'].includes(axis)||![fixed,lo,hi].every(Number.isFinite)||hi-lo<4)
      throw new RangeError('invalid gate anchors/clearance');
    const local=[];
    for(const position of [lo,hi]){
      const x=axis==='x'?position:fixed,z=axis==='z'?position:fixed;
      const y=groundAt(x,z);
      if(!Number.isFinite(y))throw new TypeError('nonfinite gate ground');
      // Physical box is matched to the stone shaft footprint.
      const size=park==='garden'?.84:.92,half=size/2;
      const pier={id,park,x,y,z,size,height:1.78,
        collision:{minX:x-half,maxX:x+half,minZ:z-half,maxZ:z+half,
          minY:y-.04,maxY:y+2.14}};
      piers.push(pier);local.push(pier);
    }
    const clear=hi-lo-(local[0].size+local[1].size)/2;
    if(clear<3)throw new RangeError('gate cannot allow safe pedestrian passage');
    // A small authored plaque faces Charles Street for garden entries,
    // or the outside street for Common entries; no geometry bridges gap.
    const p=local[0];
    signs.push({id,park,x:p.x+(axis==='z'?.44:0),y:p.y+1.19,
      z:p.z+(axis==='x'?-.49:0),facing:axis==='z'?'x':'z'});
  }
  return {piers,signs};
}
