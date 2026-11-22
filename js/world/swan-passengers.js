// Five open benches, four visible riders each. The real Paget-family
// Swan Boats are described by their operator as 5 benches / ~20 riders.
// Preserve shared instance geometry and avoid any per-frame rerandomizing.
const COLUMNS=Object.freeze([-1.05,-.35,.35,1.05]);
export const SWAN_SEATS=Object.freeze(
 Array.from({length:5},(_,row)=>
   COLUMNS.map(x=>Object.freeze({x,z:-2.4+row*1.1}))).flat()
);
// Pedal poses in the stern operator's LOCAL coordinates. Two opposite
// crank phases guarantee a visibly moving ride even at low frame rates.
// Passing the preallocated THREE.Vector3 is allocation-free per frame.
export const SWAN_PEDAL_OMEGA=2.6;
export function swanPedalPose(seconds,side,out=null){
 if(!Number.isFinite(seconds)||(side!==0&&side!==1))
  throw new RangeError('finite time and pedal side 0 or 1');
 const a=seconds*SWAN_PEDAL_OMEGA+side*Math.PI;
 // The pedal shoe geometry is 13cm tall over the 73cm deck plane.
 // A minimum foot centre of 82cm keeps the entire shoe ABOVE planks.
 const y=.94+.12*Math.cos(a),z=-.22+.18*Math.sin(a);
 if(out){out.y=y;out.z=z;return out;}
 return {y,z};
}
