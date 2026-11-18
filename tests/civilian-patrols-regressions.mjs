import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const src=read('../js/systems/civilian-patrol-rules.js');
const {CIVILIAN_PATH_INDICES,RANGER_PATROL}=await import(
 'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
// Load *the canonical game paths* as a data expression. vm evaluates only
// the path array (never executes imported THREE or world rendering code).
const world=read('../js/world/world.js');
const state=read('../js/state.js');
const pathExpr=world.match(/export const PATHS = (\[[\s\S]*?\n\]);/);
const boundsExpr=state.match(/export const MAP = (\{[\s\S]*?\n\});/);
assert.ok(pathExpr&&boundsExpr,'canonical path/map extraction must remain available');
const PATHS=runInNewContext(pathExpr[1],{PARK_ST_HEADHOUSE:{x:160,z:-85}});
const MAP=runInNewContext('('+boundsExpr[1]+')');
function safe(x,z){
 const L=MAP.lagoon,F=MAP.frogPond;
 const pond=((x-L.x)/(L.rx-3))**2+((z-L.z)/(L.rz-2))**2<1;
 const frog=((x-F.x)/(F.rx-2))**2+((z-F.z)/(F.rz-1.5))**2<1;
 const road=x>MAP.charlesMinX-1&&x<MAP.charlesMaxX+1;
 return !pond&&!frog&&!road;
}
function sampleRoute(name,route){
 assert.ok(route.length>=2);
 for(let i=0;i<route.length;i++){
  const a=route[i],b=route[(i+1)%route.length];
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.35)||1;
  for(let k=0;k<=n;k++){
   const t=k/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
   assert.ok(safe(x,z),
     name+' underwater/Charles St on leg '+i+' at '+x+','+z);
  }
 }
}
test('all civilian patrols follow dry, actual world PATHS',()=>{
 assert.equal(CIVILIAN_PATH_INDICES.length,6);
 assert.equal(new Set(CIVILIAN_PATH_INDICES).size,6);
 for(const id of CIVILIAN_PATH_INDICES){
  assert.ok(id>=0&&id<PATHS.length);
  sampleRoute('civilian path '+id,PATHS[id]);
 }
});
test('ranger stays out of Frog Pond and Charles Street through every leg',()=>{
 sampleRoute('ranger',RANGER_PATROL);
 assert.ok(RANGER_PATROL.some(p=>p[0]>=140&&p[1]>=40),
   'ranger still visits actual bandstand neighborhood');
});
test('the dry-path selector excludes the original underwater feeder',()=>{
 assert.ok(!CIVILIAN_PATH_INDICES.includes(6));
 assert.ok(CIVILIAN_PATH_INDICES.includes(7));
});
