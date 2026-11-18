import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/civilian-wildlife-rules.js',import.meta.url),'utf8');
const {civilianWildlifeReaction,civilianReactionSeconds}=
  await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
test('humans notice all three surface species at species-specific distances',()=>{
 assert.equal(civilianWildlifeReaction('squirrel',1.2),'watch');
 assert.equal(civilianWildlifeReaction('rabbit',2.1),'watch');
 assert.equal(civilianWildlifeReaction('rat',1.1),'avoid');
 assert.equal(civilianWildlifeReaction('rat',3),null);
 assert.equal(civilianWildlifeReaction('squirrel',3),null);
});
test('never treat bad or remote proximity as an animal reaction',()=>{
 assert.equal(civilianWildlifeReaction('squirrel',Infinity),null);
 assert.equal(civilianWildlifeReaction('rabbit',NaN),null);
 assert.equal(civilianWildlifeReaction('rat',-1),null);
 assert.equal(civilianWildlifeReaction('burrow-rat',1),null);
});
test('quietly watch cottontails longer than squirrels, sidestep rats briefly',()=>{
 assert.ok(civilianReactionSeconds('watch','rabbit')>
  civilianReactionSeconds('watch','squirrel'));
 assert.ok(civilianReactionSeconds('avoid','rat')>0);
 assert.equal(civilianReactionSeconds(null,'squirrel'),0);
});
