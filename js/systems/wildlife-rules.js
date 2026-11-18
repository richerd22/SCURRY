// Pure wildlife registry and reactions. Species are observations, not claims
// that rabbits/rats are always visible at these exact GPS locations.
export const WILDLIFE_SPAWNS=Object.freeze([
  ['squirrel',12,-32],['squirrel',56,-76],['squirrel',105,-42],
  ['squirrel',170,58],['squirrel',24,72],['squirrel',-98,-54],
  ['squirrel',-185,52],['squirrel',-93,46],['squirrel',-155,-86],
  ['rabbit',184,72],['rabbit',-187,68],['rabbit',-95,76],['rabbit',40,60],
  ['rat',110,-28],
  ['burrow-rat',3000,3000],['burrow-rat',3033,3010],
  ['burrow-rat',2968,2990],['burrow-rat',3044,3003],
  ['burrow-squirrel',3000,3000],['burrow-squirrel',3000,3020],
  ['burrow-squirrel',2977,3000],
]);
// Dogs expose either {pos:Vector3} records or bare position vectors.
export function nearestThreatDistance(x,z,dogs=[]) {
  let best=Infinity;
  for(const d of dogs) {
    if(d?.mesh?.visible===false)continue;
    const p=d?.pos||d;
    if(Number.isFinite(p?.x)&&Number.isFinite(p?.z))
      best=Math.min(best,Math.hypot(p.x-x,p.z-z));
  }
  return best;
}
export function wildlifeResponse(kind, distance, pace, dogDistance, carryingFood) {
  if(![distance,pace].every(Number.isFinite)||distance<0||
    !(Number.isFinite(dogDistance)||dogDistance===Infinity))return 'idle';
  if(kind==='burrow-rat')return 'idle';
  if(dogDistance<4.5)return 'flee';
  if(kind==='rabbit'&&(distance<2.3||(distance<5&&pace>2)))return 'flee';
  if(kind==='squirrel'&&distance<1.35&&pace>4)return 'flee';
  if(kind==='rat'&&distance<4)return 'flee';
  if(kind==='squirrel'&&carryingFood&&distance<5)return 'curious';
  return 'idle';
}
