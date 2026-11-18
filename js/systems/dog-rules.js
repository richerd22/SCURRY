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
