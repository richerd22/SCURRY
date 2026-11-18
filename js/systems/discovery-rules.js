// SCURRY FIELD NOTES - pure park discovery rules and shared atlas pins.
// A tiny optional exploration record, not GPS, quests, or a tutorial.
export const LANDMARKS = Object.freeze([
  {id:'garden-bridge',x:-132,z:0,r:13,label:'Garden Bridge'},
  {id:'washington',x:-132,z:74,r:14,label:'Washington Statue'},
  {id:'fountain',x:-25,z:-58,r:12,label:'Brewer Fountain'},
  {id:'monument',x:60,z:-45,r:16,label:'Soldiers Monument'},
  {id:'frog-pond',x:95,z:12,r:23,label:'Frog Pond'},
  {id:'bandstand',x:140,z:42,r:16,label:'Parkman Bandstand'},
]);
export const FIELD_NOTES = Object.freeze([
  ...LANDMARKS.map(l=>({id:l.id,label:l.label})),
  {id:'hollow-tree',label:'The Hollow Tree'},
  {id:'canopy',label:'Above the Canopy'},
  {id:'hollow',label:'Inside the Hollow'},
  {id:'burrows',label:'The Rat Burrows'},
  {id:'fenway',label:'Fenway Park'},
  {id:'tdgarden',label:'TD Garden'},
  {id:'cityhall',label:'City Hall Plaza'},
  {id:'esplanade',label:'Charles River Esplanade'},
]);
const REMOTE_FLAGS=['inHollow','inBurrow','inFenway','inGarden','inCityHall','inEsplanade'];
export function discoverAt(player, groundY, hollowTree) {
  if(!player?.pos)return [];
  const found=[];
  const realm=[
    ['inHollow','hollow'],['inBurrow','burrows'],
    ['inFenway','fenway'],['inGarden','tdgarden'],
    ['inCityHall','cityhall'],['inEsplanade','esplanade'],
  ].find(([flag])=>player[flag]);
  if(realm) return [realm[1]];
  const {x,y,z}=player.pos;
  if(![x,y,z].every(Number.isFinite))return [];
  for(const l of LANDMARKS)if(Math.hypot(x-l.x,z-l.z)<=l.r)
    found.push(l.id);
  if(hollowTree && Math.hypot(x-hollowTree.x,z-hollowTree.z)<5)
    found.push('hollow-tree');
  if(Number.isFinite(groundY)&&y-groundY>4.5)
    found.push('canopy');
  return found;
}
export const FIELD_NOTE_KEYS = new Set(FIELD_NOTES.map(n=>n.id));
