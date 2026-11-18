// Sculpture geometry and collision share this ONE pure local-space pose.
// Squirrel feet encounter the actual cast bronze figures instead of
// a single invisible 1.6-metre circle around the entire parade.
export const DUCKLING_COUNT=8;
export const DUCKLING_YAW=.8;
export const MOTHER_RADIUS=.73;
export const DUCKLING_RADIUS=.245;
export function ducklingPose(i,baseX=-78,baseZ=-80) {
  if(!Number.isInteger(i)||i<0||i>=DUCKLING_COUNT)
    throw new RangeError('duckling index 0..7');
  const localX=Math.sin(i*.55)*.22,localZ=-.95-i*.6;
  const c=Math.cos(DUCKLING_YAW),s=Math.sin(DUCKLING_YAW);
  return {localX,localZ,
    x:baseX+c*localX+s*localZ,
    z:baseZ-s*localX+c*localZ,
    yaw:-.2*Math.cos(i*.55)};
}
