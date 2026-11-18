import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadGltf,inspectGltf,collectModelStats} from '../tools/model-stats.mjs';
const sample={asset:{version:'2.0'},accessors:[{count:9},{count:30},{count:12}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1},
    {attributes:{POSITION:2}}]}],nodes:[{mesh:0},{mesh:0}],
  materials:[{}],textures:[{}],images:[{}]};
function toGLB(doc=sample){
  const text=Buffer.from(JSON.stringify(doc)),n=(text.length+3)&~3;
  const b=Buffer.alloc(20+n,32);
  b.write('glTF',0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);
  b.writeUInt32LE(n,12);b.write('JSON',16);text.copy(b,20);return b;
}
function fixture(t){
  const root=mkdtempSync(path.join(tmpdir(),'scurry-model-test-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(path.join(root,'assets/models'),{recursive:true});return root;
}
test('indexed and nonindexed triangles counted separately',()=>{
  const s=inspectGltf(sample);
  assert.equal(s.estimatedTriangles,14);
  assert.equal(s.sourceVertices,21);assert.equal(s.primitives,2);
  assert.equal(s.meshNodeReferences,2);assert.equal(s.materials,1);
});
test('gltf JSON and GLB2 binary yield the same source stats',(t)=>{
  const root=fixture(t),a=path.join(root,'assets/models/a.glb'),
    b=path.join(root,'assets/models/b.gltf');
  writeFileSync(a,toGLB());writeFileSync(b,JSON.stringify(sample));
  assert.deepEqual(inspectGltf(loadGltf(a)),inspectGltf(loadGltf(b)));
});
test('triangle strips and fans counted, lines excluded',()=>{
  const s=inspectGltf({asset:{version:'2.0'},accessors:[{count:12}],
    meshes:[{primitives:[{attributes:{POSITION:0},mode:5},
      {attributes:{POSITION:0},mode:6},{attributes:{POSITION:0},mode:1}]}]});
  assert.equal(s.estimatedTriangles,20);assert.equal(s.nonTrianglePrimitives,1);
});
test('malformed GLB header, JSON chunk and POSITION fail',t=>{
  const root=fixture(t),file=path.join(root,'assets/models/test.glb');
  writeFileSync(file,'garbage');
  assert.throws(()=>loadGltf(file),/header/);
  const b=toGLB();b.write('BIN ',16);writeFileSync(file,b);
  assert.throws(()=>loadGltf(file),/JSON chunk/);
  assert.throws(()=>inspectGltf({asset:{version:'2.0'},
    meshes:[{primitives:[{attributes:{NORMAL:0}}]}]}),/POSITION/);
});
test('invalid source remains reported without hiding valid model stats',t=>{
  const root=fixture(t);
  writeFileSync(path.join(root,'assets/models/a.glb'),toGLB());
  writeFileSync(path.join(root,'assets/models/b.glb'),'garbage');
  const r=collectModelStats(root,{assets:[{id:'example',status:'verified',
    files:['assets/models/a.glb','assets/models/b.glb']}]});
  assert.equal(r.entries.length,1);assert.equal(r.errors.length,1);
  assert.equal(r.totals.sourceTriangles,14);
});
