import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/dog-rules.js',import.meta.url),'utf8');
const dogSystem=readFileSync(new URL('../js/systems/dogs.js',import.meta.url),'utf8');
const {DOG_PROFILES,DOG_PATROLS,dogMayChase}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const stepSrc=readFileSync(new URL('../js/systems/wildlife-step-rules.js',import.meta.url),'utf8');
const {wildlifeStep}=await import('data:text/javascript;base64,'+Buffer.from(stepSrc).toString('base64'));
test('dog pack has distinct sizes, safe leashed walkers and a non-chasing curious dog',()=>{
  assert.equal(DOG_PROFILES.length,5);
  assert.equal(new Set(DOG_PROFILES.map(x=>x.name)).size,5);
  assert.ok(DOG_PROFILES.some(x=>x.scale<.7));
  assert.ok(DOG_PROFILES.some(x=>x.scale>1));
  assert.equal(DOG_PROFILES.filter(x=>x.leashed).length,2);
  for(const profile of DOG_PROFILES){
    assert.ok(profile.scale>0&&profile.cruise>0);
    assert.ok(!profile.leashed||profile.alert===0);
  }
});
test('leashed dogs and Swan Boat riders cannot enter an off-leash chase',()=>{
  const player={grounded:true,onSwanBoat:false,remote:false,sprinting:true};
  assert.ok(dogMayChase(DOG_PROFILES[1],player));
  assert.equal(dogMayChase(DOG_PROFILES[2],player),false);
  assert.equal(dogMayChase(DOG_PROFILES[4],player),false);
  assert.equal(dogMayChase(DOG_PROFILES[1],{...player,onSwanBoat:true}),false);
  assert.equal(dogMayChase(DOG_PROFILES[1],{...player,remote:true}),false);
  assert.equal(dogMayChase(DOG_PROFILES[1],{...player,grounded:false}),false);
  assert.equal(dogMayChase(DOG_PROFILES[0],{...player,sprinting:false}),false,
    'the curious golden must not cause a threat warning while walking');
});


test('every patrol leg remains dry and does not enter Charles Street',()=>{
  assert.equal(DOG_PATROLS.length,DOG_PROFILES.length);
  const water=(x,z)=>{
    const lagoon=((x+132)/47)**2+(z/25)**2;
    const frog=((x-95)/19)**2+((z-12)/12)**2;
    return lagoon<1||frog<1;
  };
  for(let dog=0;dog<DOG_PATROLS.length;dog++){
    const path=DOG_PATROLS[dog];
    for(let i=0;i<path.length;i++){
      const a=path[i],b=path[(i+1)%path.length];
      for(let s=0;s<=100;s++){
        const t=s/100,x=a[0]*(1-t)+b[0]*t,z=a[1]*(1-t)+b[1]*t;
        assert.ok(!water(x,z),'dog '+dog+' walks in pond on leg '+i+' at '+x+','+z);
        assert.ok(!(x>-59&&x<-41),'dog '+dog+' crosses Charles Street');
      }
    }
  }
});

test('dog-sized NPC steers around a solid rather than entering it',()=>{
  // Runtime dogs use this same deterministic step: reject the blocked
  // forward point, choose a legal shoulder, or wait if both are closed.
  const blocked=(x,z)=>!(x>.7&&x<1.3&&Math.abs(z)<.45);
  const next=wildlifeStep(0,0,2,0,.8,blocked,1);
  assert.ok(Math.abs(next.x)<.001,'dog should not pass through the box');
  assert.ok(next.z>.7,'dog should take the preferred clear shoulder');
  const held=wildlifeStep(0,0,2,0,.8,()=>false,1);
  assert.deepEqual(held,{x:0,z:0},'no legal shoulder means wait, never clip');
  assert.match(dogSystem,/createObstacleIndex\(S\.solids, S\.solidBoxes, S\.walls/);
  assert.match(dogSystem,/resolveHorizontal\(dogProbe, S\.solids, S\.solidBoxes, S\.walls/);
  assert.match(dogSystem,/wildlifeStep\(d\.pos\.x, d\.pos\.z/);
  assert.match(dogSystem,/for \(const h of S\.humanActors \|\| \[\]\)/);
  assert.match(dogSystem,/for \(const a of S\.wildlifeActors \|\| \[\]\)/);
  assert.match(dogSystem,/export function nearestDogThreatDist\(\)/);
  assert.match(dogSystem,/dogMayChase\(d\.profile,chaseState\)/);
});
