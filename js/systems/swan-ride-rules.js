// Pure, deterministic, squirrel-scale Swan Boat tour.
// Full two-lobe circuit under the physically arched bridge and around the dry island.
// Duration is intentionally game-scaled; the real ride is ~15 minutes.
export const SWAN_RIDE_SECONDS = 56;
export const SWAN_DOCK = Object.freeze({x:-140,z:44,boardX:-140.5,boardZ:47.9,deckY:.45});
// Safety authored against the SAME organic lagoon ring used for water
// rendering, not a schematic ellipse. Maintains >5m centre-to-bank
// clearance after CatmullRom curvature (2,001 route samples).
const POINTS = Object.freeze([
  [-140,44],[-144,38],[-140,29],[-133,20],[-132,11],
  [-132,1],[-132,-11],[-129,-17],[-123,-22],[-119,-30],
  [-123,-37],[-130,-41],[-138,-41],[-145,-34],[-146,-25],
  [-144,-18],[-135,-12],[-132,-4],[-132,9],[-130,23],
  [-132,33],[-138,41],
]);
const wrap = (i) => POINTS[(i + POINTS.length) % POINTS.length];
function curve(a,b,c,d,t) {
  const t2=t*t,t3=t2*t;
  return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
}
function xy(progress) {
  const u=Math.max(0,Math.min(1,progress))*POINTS.length;
  const i=Math.min(POINTS.length-1,Math.floor(u));
  const t=u-i,p0=wrap(i-1),p1=wrap(i),p2=wrap(i+1),p3=wrap(i+2);
  return {x:curve(p0[0],p1[0],p2[0],p3[0],t),
    z:curve(p0[1],p1[1],p2[1],p3[1],t)};
}
// The previous ride covered one spline span per equal unit of time.
// That made the pedal boat lurch between ~2m/s and >5m/s depending on
// control-point spacing. Arc-length scheduling preserves its 56-second
// gameplay duration while making world-space speed almost constant.
const ARC_STEPS=POINTS.length*64;
const ARC_LENGTHS=new Float64Array(ARC_STEPS+1);
let prev=xy(0);
for(let i=1;i<=ARC_STEPS;i++){
 const p=xy(i/ARC_STEPS);
 ARC_LENGTHS[i]=ARC_LENGTHS[i-1]+Math.hypot(p.x-prev.x,p.z-prev.z);
 prev=p;
}
export const SWAN_ROUTE_LENGTH=ARC_LENGTHS[ARC_STEPS];
function arcParameter(progress){
 const target=progress*SWAN_ROUTE_LENGTH;
 let lo=0,hi=ARC_STEPS;
 while(hi-lo>1){
  const mid=(hi+lo)>>1;
  if(ARC_LENGTHS[mid]<target)lo=mid;else hi=mid;
 }
 const a=ARC_LENGTHS[lo],b=ARC_LENGTHS[hi];
 const t=b>a?(target-a)/(b-a):0;
 return (lo+t)/ARC_STEPS;
}
export function swanRidePose(progress) {
 if(!Number.isFinite(progress))throw new RangeError('finite ride progress required');
 const u=arcParameter(Math.max(0,Math.min(1,progress)));
 const p=xy(u),before=xy(Math.max(0,u-.00005)),after=xy(Math.min(1,u+.00005));
 const dx=after.x-before.x,dz=after.z-before.z;
 return {...p,yaw:Math.atan2(-dx,-dz)};
}
