// Local-space passenger seats on the historic bench-row Swan Boat layout.
// Ten silhouettes satisfy the operating load visual story without faking
// a fleet of empty boats powered by a squirrel.
export const SWAN_SEATS=Object.freeze(
  Array.from({length:5},(_,row)=>[-2.4+row*1.1]).flatMap(([z])=>[
    Object.freeze({x:-.7,z}),Object.freeze({x:.7,z})
  ])
);
