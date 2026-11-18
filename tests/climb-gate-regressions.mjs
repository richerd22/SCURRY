import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/climb-gate.js',import.meta.url),'utf8');
const {mayAttachToTrunk, mayTransferToCanopy} =
  await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const tree={gy:0,trunkTop:8};
const player=()=>({pos:{y:0},grounded:true,climbing:null,climbRegrab:0});
test('grounded squirrel may scramble when running directly at trunk',()=>{
  const p=player();assert.equal(mayAttachToTrunk(p,tree,.5),true);
  assert.equal(mayAttachToTrunk(p,tree,.45),false);
});
test('jump-off cannot instantly reattach to same trunk',()=>{
  const p=player();p.grounded=false;p.pos.y=4;p.climbRegrab=.35;
  assert.equal(mayAttachToTrunk(p,tree,1),false);
  p.climbRegrab=0;assert.equal(mayAttachToTrunk(p,tree,.5),true);
});
test('airborne approach too low or too weak does not snap to trunk',()=>{
  const p=player();p.grounded=false;
  p.pos.y=.2;assert.equal(mayAttachToTrunk(p,tree,1),false);
  p.pos.y=2;assert.equal(mayAttachToTrunk(p,tree,.3),false);
  assert.equal(mayAttachToTrunk(p,tree,.31),true);
});
test('tree canopy height limit and already-climbing status remain respected',()=>{
  const p=player();p.pos.y=7.6;assert.equal(mayAttachToTrunk(p,tree,1),false);
  p.pos.y=2;p.climbing=tree;assert.equal(mayAttachToTrunk(p,tree,1),false);
});


test('canopy exit requires actual support close to the tree top',()=>{
  assert.equal(mayTransferToCanopy(7.4,8,8),true);
  assert.equal(mayTransferToCanopy(7.4,0,8),false,
    'lawn fallback is not a valid platform at the top of a tree');
  assert.equal(mayTransferToCanopy(7.4,6.8,8),false,
    'unrelated low branch must not force a tree-top dismount');
  assert.equal(mayTransferToCanopy(7.4,9.5,8),false,
    'support above the reachable step cannot be auto-snapped');
  assert.equal(mayTransferToCanopy(NaN,8,8),false);
});
