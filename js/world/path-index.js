// Pure math broad phase for repeated park path/terrain-contact queries.
// Full scans remain available to callers requesting radii above the indexed
// radius. The source polylines are immutable for a game session.
function distanceSquared(x,z,s){
  const dx=s.bx-s.ax,dz=s.bz-s.az;
  const t=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz||1)));
  const ex=x-(s.ax+t*dx),ez=z-(s.az+t*dz);
  return ex*ex+ez*ez;
}
export function createPathProximityIndex(lines,cellSize=12,indexedRadius=2.5){
  if(!Number.isFinite(cellSize)||cellSize<=0||
     !Number.isFinite(indexedRadius)||indexedRadius<0)
    throw new RangeError('invalid path index bounds');
  const segments=[], rows=new Map();
  const cell=n=>Math.floor(n/cellSize);
  for(const line of lines)for(let i=1;i<line.length;i++){
    const [ax,az]=line[i-1],[bx,bz]=line[i];
    const s={ax,az,bx,bz};segments.push(s);
    const x0=cell(Math.min(ax,bx)-indexedRadius),x1=cell(Math.max(ax,bx)+indexedRadius);
    const z0=cell(Math.min(az,bz)-indexedRadius),z1=cell(Math.max(az,bz)+indexedRadius);
    for(let x=x0;x<=x1;x++){
      let row=rows.get(x);if(!row){row=new Map();rows.set(x,row);}
      for(let z=z0;z<=z1;z++){
        let items=row.get(z);if(!items){items=[];row.set(z,items);}
        items.push(s);
      }
    }
  }
  function nearestSquaredWithin(x,z,radius){
    if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<0)
      return Infinity;
    const candidates=radius>indexedRadius?segments:rows.get(cell(x))?.get(cell(z));
    if(!candidates)return Infinity;
    let best=radius*radius,found=false;
    for(const segment of candidates){
      const d=distanceSquared(x,z,segment);
      if(d<=best){best=d;found=true;}
    }
    return found?best:Infinity;
  }
  return Object.freeze({
    nearestSquaredWithin,
    candidateCount:(x,z)=>rows.get(cell(x))?.get(cell(z))?.length || 0,
    totalSegments:segments.length
  });
}
