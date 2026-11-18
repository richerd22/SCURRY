// Breeds here describe deliberately different play silhouettes/behaviours;
// no claim that the imported generic Dog.glb becomes a purebred retriever.
export const DOG_PROFILES=Object.freeze([
  {name:'golden dog',coat:0xcda46b,scale:1.09,alert:11,chase:4.4,cruise:1.8,curious:true,leashed:false},
  {name:'Shiba Inu',coat:0x9e6333,scale:.82,alert:13,chase:5.4,cruise:2.3,leashed:false},
  {name:'small terrier',coat:0x8b796d,scale:.63,alert:0,chase:0,cruise:1.25,leashed:true},
  {name:'black lab',coat:0x292b2c,scale:1.06,alert:12,chase:5.1,cruise:2.0,leashed:false},
  {name:'dachshund',coat:0x8d5236,scale:.71,alert:0,chase:0,cruise:1.25,leashed:true,procOnly:true,long:true},
]);
export function dogMayChase(profile,{grounded,onSwanBoat,remote,sprinting}) {
  return !profile.leashed&&!onSwanBoat&&!remote&&grounded&&
    (!profile.curious||sprinting);
}


// All patrol legs have been sampled against the actually authored lagoon
// and Frog Pond footprints. Garden walker stays on the lagoon perimeter,
// Common pack loops around rather than straight through the Frog Pond.
export const DOG_PATROLS=Object.freeze([
  [[20,20],[70,60],[126,55],[150,20],[145,-10],[60,-10]],
  [[150,-30],[185,20],[150,70],[120,10]],
  [[-182,-34],[-132,-40],[-82,-34],[-76,0],[-82,34],
    [-132,40],[-182,34],[-188,0]],
  [[90,30],[45,60],[80,85],[124,48]],
  [[-20,-70],[25,-90],[70,-80],[90,-45]],
]);
