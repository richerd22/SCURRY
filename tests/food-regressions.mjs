// Production food-system regression tests with a minimal geometry/DOM stub.
// Pure Node: no external dependencies, WebGL, network or build step.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../js/systems/food.js', import.meta.url), 'utf8');
const gardenLayout = readFileSync(new URL('../js/world/garden-lagoon-layout.js', import.meta.url),'utf8');
class Vector3 {
  constructor(x=0,y=0,z=0) { Object.assign(this,{x,y,z}); }
  set(x,y,z) { Object.assign(this,{x,y,z}); return this; }
  clone() { return new Vector3(this.x,this.y,this.z); }
  copy(v) { return this.set(v.x,v.y,v.z); }
  lerpVectors(a,b,t) { return this.set(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t); }
}
class Mesh {
  constructor(geometry, material) {
    this.geometry = geometry; this.material = material;
    this.position = new Vector3(); this.scale = new Vector3(1,1,1);
    this.rotation = {x:0,y:0,z:0}; this.children = [];
  }
  add(x) { this.children.push(x); }
}
const THREE = { SphereGeometry: class {}, MeshStandardMaterial: class {}, Mesh, Vector3 };
let moduleCounter = 0;
async function harness() {
  const S = {
    scene: { meshes:new Set(), add(m){this.meshes.add(m);},remove(m){this.meshes.delete(m);} },
    foods:[], interactables:[], blankets:[], stash:0, caps:0, carried:null,
    player: { pos:new Vector3(1,0,1), grounded:true, climbing:null,
      inHollow:false,inBurrow:false,inFenway:false,inGarden:false,
      inCityHall:false,inEsplanade:false }
  };
  const audio = { dig(){},chomp(){},yelp(){} };
  // This is the REAL pure shared bridge predicate, not a permissive
  // fake that could let dropped food pass without deck collision truth.
  const lagoon=await import('data:text/javascript;base64,'+
    Buffer.from(gardenLayout).toString('base64'));
  globalThis.__foodTest = { THREE, S, audio, toast(){}, setGossip(){},
    setCarriedVisual(){}, groundHeight(){ return 0; },
    isGrass(x,z){ return x>=0 && z>=0; },
    gardenBridgeDeck:lagoon.gardenBridgeDeck,gardenBridgeHeight:lagoon.gardenBridgeHeight };
  const body = source.replace("import * as THREE from 'three';", 'const THREE = globalThis.__foodTest.THREE;')
    .replace("import { S } from '../state.js';", 'const S = globalThis.__foodTest.S;')
    .replace("import { groundHeight, isGrass } from '../world/world.js';",
      'const {groundHeight,isGrass} = globalThis.__foodTest;')
    .replace("import { gardenBridgeDeck,gardenBridgeHeight } from '../world/garden-lagoon-layout.js';",
      'const {gardenBridgeDeck,gardenBridgeHeight} = globalThis.__foodTest;')
    .replace("import { sfx } from './audio.js';", 'const sfx = globalThis.__foodTest.audio;')
    .replace("import { toast, setGossip } from '../ui/hud.js';",
      'const {toast,setGossip} = globalThis.__foodTest;')
    .replace("import { setCarriedVisual } from './player.js';",
      'const {setCarriedVisual} = globalThis.__foodTest;');
  assert.ok(!body.includes('import '), 'all dependency imports must be replaced');
  const mod = await import('data:text/javascript;base64,' +
    Buffer.from(body+'\n// test-harness-'+(++moduleCounter)).toString('base64'));
  return { S, lagoon, ...mod };
}

test('explicit raised floor survives updateFood while home food stays on ground', async () => {
  const h=await harness();
  const raised=h.spawnFood('popcorn', 10,10,{y:5.2});
  const ground=h.spawnFood('acorn',1,1);
  h.updateFood(.016);
  assert.ok(Math.abs(raised.mesh.position.y-5.25)<.009,'TD Garden popcorn should stay above parquet');
  assert.ok(Math.abs(ground.mesh.position.y-.05)<.009,'Common acorn should stay on lawn');
  assert.equal(raised.floorY,5.2);
});
test('double-activating a food pickup cannot delete another food', async () => {
  const h=await harness();
  const target=h.spawnFood('acorn',1,1);
  const other=h.spawnFood('peanut',20,20);
  const choice=h.nearestFoodAction();
  assert.ok(choice);
  choice.action(); choice.action();
  assert.equal(h.S.carried,'acorn');
  assert.deepEqual(h.S.foods,[other]);
  assert.ok(h.S.scene.meshes.has(other.mesh));
  assert.ok(!h.S.scene.meshes.has(target.mesh));
});
test('a food prompt that is no longer within reach does nothing', async () => {
  const h=await harness();
  const target=h.spawnFood('acorn',1,1);
  const choice=h.nearestFoodAction();
  h.S.player.pos.x=100;
  choice.action();
  assert.equal(h.S.carried,null);
  assert.deepEqual(h.S.foods,[target]);
});
test('geese/crows can remove the same food safely more than once', async () => {
  const h=await harness();
  const target=h.spawnFood('acorn',1,1);
  const other=h.spawnFood('peanut',20,20);
  h.removeFoodItem(target);h.removeFoodItem(target);
  assert.deepEqual(h.S.foods,[other]);
});
test('burrows, indoor hollow, arenas, concrete plazas and Esplanade cannot fake grass', async () => {
  const h=await harness();
  h.S.carried='croissant';
  for (const flag of ['inHollow','inBurrow','inFenway','inGarden','inCityHall','inEsplanade']) {
    h.S.player[flag]=true;
    assert.equal(h.buryAction(),null,flag+' must not be burial ground');
    h.S.player[flag]=false;
  }
  assert.ok(h.buryAction(),'actual park grass should allow burial');
});
test('stale bury actions cannot increment stash twice or after leaving grass', async () => {
  const h=await harness();
  h.S.carried='croissant';
  const action=h.buryAction(); assert.ok(action);
  action.action();action.action();
  assert.equal(h.S.stash,3);
  h.S.carried='acorn';
  const stale=h.buryAction();
  h.S.player.pos.x=-100;
  stale.action();
  assert.equal(h.S.stash,3);
  assert.equal(h.S.carried,'acorn');
});

test('home park ambient food restocks even when many realm/cache items exist', async () => {
  const h = await harness();
  h.initFood();
  assert.equal(h.S.foods.filter(f => f.source === 'ambient').length, 16);
  for (let i = 0; i < 30; i++) h.spawnFood('peanut', 3000 + i, 3000 + i, { y: 0.05 });
  h.updateFood(9);
  assert.equal(h.S.foods.filter(f => f.source === 'ambient').length, 17,
    'non-home snacks must not suppress the Common ambient spawn loop');
});
test('repeat food spawns share material and acorn cap geometry', async () => {
  const h = await harness();
  const a = h.spawnFood('acorn', 1, 1), b = h.spawnFood('acorn', 2, 1);
  const c = h.spawnFood('pretzel', 3, 1);
  assert.equal(a.mesh.material, b.mesh.material);
  assert.notEqual(a.mesh.material, c.mesh.material);
  assert.equal(a.mesh.geometry, b.mesh.geometry);
  assert.equal(a.mesh.children[0].geometry, b.mesh.children[0].geometry);
  assert.equal(a.mesh.children[0].material, b.mesh.children[0].material);
});

test('toss trajectory stays on the correct arc above terrain instead of sinking below the target', async () => {
  const h = await harness();
  const source = new Vector3(0,1.1,0), end = new Vector3(1,0,1);
  h.tossFood('pretzel', source, end);
  const mesh = [...h.S.scene.meshes][0];
  h.updateFood(.55 * .90);
  const expectY = 1.1*.1 + .05*.9 + Math.sin(.9*Math.PI)*1.1;
  assert.ok(Math.abs(mesh.position.y-expectY)<1e-9,
    'near landing the tossed food should have a single, smooth arc');
  h.updateFood(.55*.1);
  assert.equal(h.S.foods.length,1,'landing creates one collectible food item');
  assert.equal(h.S.foods[0].floorY,0,'landed food rests on terrain');
});

test('nearest food reports actual distance for prompt priority', async () => {
  const h=await harness();
  h.spawnFood('acorn',1.8,1);
  let choice=h.nearestFoodAction();
  assert.ok(choice);
  assert.ok(Math.abs(choice.distance-.8)<1e-9);
  h.spawnFood('pretzel',1.1,1);
  choice=h.nearestFoodAction();
  assert.ok(Math.abs(choice.distance-.1)<1e-9);
});


test('actual bridge plank drops stay raised but food over a rail lands below',async()=>{
 const h=await harness();
 const b=h.S.player.pos;
 const crest=h.lagoon.gardenBridgeHeight(-132);
 b.set(-132,crest,0);h.S.carried='acorn';
 const deck=h.dropCarried();
 assert.ok(Math.abs(deck.floorY-crest)<.01,
   'food released on actual curved planks, including forward hand offset');
 assert.ok(Math.abs(deck.mesh.position.y-deck.floorY-.05)<.001);
 h.updateFood(.016);
 // updateFood intentionally applies a ±8mm pickup-glint bob to ALL
 // non-stolen food. Preserve that visible motion while never losing
 // the real raised support sampled at spawn.
 assert.ok(Math.abs(deck.mesh.position.y-(deck.floorY+.05))<=.008001,
   'raised bridge food must only move within intentional 8mm visual glint');
 assert.ok(Math.abs(deck.floorY-crest)<.01,'food floor never changes with bob');
 b.set(-132,crest,2.9);h.S.carried='peanut';
 const outside=h.dropCarried();
 assert.equal(outside.floorY,0,'over-rail food falls to ground, never floats');
 b.set(-132,0,0);h.S.carried='peanut';
 const underwater=h.dropCarried();
 assert.equal(underwater.floorY,0,'a swimmer below bridge cannot spawn deck offerings');
});
