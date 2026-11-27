// Lightweight, failure-tolerant local Field Notes (separate from stash
// save schema; no migrations or change to scurry-save-v1 required).
import { S } from '../state.js';
import { visibleGroundHeight } from '../world/world.js';
import { isGardenIsland } from '../world/garden-lagoon-layout.js';
import { discoverAt, FIELD_NOTES, FIELD_NOTE_KEYS } from './discovery-rules.js';
import { toast } from '../ui/hud.js';

export const NOTES_KEY='scurry-field-notes-v1';
const unlocked=new Set();
let tick=0;

export function initDiscoveries() {
  unlocked.clear(); tick=0;
  try {
    const doc=JSON.parse(localStorage.getItem(NOTES_KEY) || 'null');
    if(doc?.v===1 && Array.isArray(doc.ids)) {
      for(const id of doc.ids)if(FIELD_NOTE_KEYS.has(id))unlocked.add(id);
    }
  }catch(_){ /* disabled/corrupt localStorage never breaks gameplay */ }
}
export function updateDiscoveries(dt) {
  if(!S.started||S.paused||S.debugShot)return;
  tick+=Math.max(0,dt);
  if(tick<.45)return;
  tick=0;
  const p=S.player;
  const remote=p.inHollow||p.inBurrow||p.inFenway||p.inGarden||p.inCityHall||p.inEsplanade;
  const floor=remote?null:visibleGroundHeight(p.pos.x,p.pos.z);
  let changed=false; const fresh=[];
  for(const id of discoverAt(p,floor,S.hollowTreePos,isGardenIsland)) {
    if(unlocked.has(id))continue;
    unlocked.add(id);
    changed=true; fresh.push(id);
  }
  if(fresh.length){
    const label=(FIELD_NOTES.find(n=>n.id===fresh[0])||{}).label||fresh[0];
    // Discovering a place should feel discovered (v0.7.15): name it, count it.
    if(unlocked.size>=FIELD_NOTES.length) toast('FIELD NOTES complete - every corner of the park, known. '+unlocked.size+'/'+FIELD_NOTES.length, 4.5);
    else toast('field note: '+label+' - '+unlocked.size+'/'+FIELD_NOTES.length+' (map > field notes)', 3.4);
  }
  if(changed){
    try{localStorage.setItem(NOTES_KEY,JSON.stringify({v:1,ids:[...unlocked]}));}
    catch(_){ /* private mode: still retain notes for this session */ }
  }
}
export function discoveryProgress() {
  return {count:unlocked.size,total:FIELD_NOTES.length,
    unlocked:new Set(unlocked)};
}
