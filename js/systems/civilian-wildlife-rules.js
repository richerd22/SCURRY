// Small, readable reactions between park visitors and wild neighbors.
// Conservatively keep people on their existing walkable path; even a
// startled human should not flee across water or through other actors.
// These are game observations, not claims of species-specific field studies.
export function civilianWildlifeReaction(kind,distance) {
  if(!Number.isFinite(distance)||distance<0)return null;
  if(kind==='rat'&&distance<1.8)return 'avoid';
  if(kind==='rabbit'&&distance<2.5)return 'watch';
  if(kind==='squirrel'&&distance<1.9)return 'watch';
  return null;
}
export function civilianReactionSeconds(reaction,kind) {
  if(reaction==='avoid')return .9;
  if(reaction==='watch')return kind==='rabbit'?3.0:1.8;
  return 0;
}
