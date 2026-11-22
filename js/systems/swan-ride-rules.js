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
export function swanRidePose(progress) {
  if(!Number.isFinite(progress)) throw new RangeError('finite ride progress required');
  const t=Math.max(0,Math.min(1,progress));
  const p=xy(t);
  const before=xy(Math.max(0,t-.0001)),after=xy(Math.min(1,t+.0001));
  const dx=after.x-before.x,dz=after.z-before.z;
  return { ...p, yaw: Math.atan2(-dx,-dz) };
}
