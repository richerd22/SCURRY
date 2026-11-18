// Pure, deterministic, squirrel-scale Swan Boat tour.
// The west-lagoon loop avoids the bridge's still-unverified overhead clearance.
// Duration is intentionally game-scaled; the real ride is ~15 minutes.
export const SWAN_RIDE_SECONDS = 56;
export const SWAN_DOCK = Object.freeze({x:-143,z:43,boardX:-140.5,boardZ:47.9,deckY:.45});
const POINTS = Object.freeze([
  [-143,43],[-145,37],[-146,27],[-139,19],
  [-128,19],[-120,27],[-121,37],[-133,42],
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
