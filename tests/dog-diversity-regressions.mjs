import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/dog-rules.js',import.meta.url),'utf8');
const {DOG_PROFILES,DOG_PATROLS,dogMayChase}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
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
  assert.equal(dogMayChase(DOG_PROFILES[0],{...player,sprinting:false}),false);
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
