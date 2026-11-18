import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {auditAssets} from '../tools/audit-assets.mjs';
function root(t){
  const dir=mkdtempSync(path.join(tmpdir(),'scurry-asset-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  mkdirSync(path.join(dir,'assets/models'),{recursive:true});
  return dir;
}
function glb(){
  const json=Buffer.from('{"asset":{"version":"2.0"}}   ');
  const bytes=Buffer.alloc(20+json.length);
  bytes.write('glTF',0);bytes.writeUInt32LE(2,4);
  bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);
  bytes.write('JSON',16);json.copy(bytes,20);return bytes;
}
function manifest(status='verified'){
  return {schemaVersion:1,assets:[{
    id:'new-test',files:['assets/models/test.glb'],kind:'prop',author:'Artist',
    source:'Artist site',url:'https://example.org/model',license:'CC0-1.0',
    licenseEvidenceUrl:'https://example.org/model/license',status,use:'test'
  }]};
}
test('valid verified model checks out',(t)=>{
  const dir=root(t);writeFileSync(path.join(dir,'assets/models/test.glb'),glb());
  const out=auditAssets(dir,manifest(),{legacyIds:new Set()});
  assert.deepEqual(out.errors,[]);assert.equal(out.files,1);
});
test('new unknown-rights model fails closed',(t)=>{
  const dir=root(t);writeFileSync(path.join(dir,'assets/models/test.glb'),glb());
  assert.match(auditAssets(dir,manifest('unknown'),{legacyIds:new Set()})
    .errors.join(','),/NEW model cannot ship/);
});
test('unlisted binary fails',(t)=>{
  const dir=root(t);writeFileSync(path.join(dir,'assets/models/test.glb'),glb());
  writeFileSync(path.join(dir,'assets/models/unlisted.glb'),glb());
  assert.match(auditAssets(dir,manifest()).errors.join(','),/UNREGISTERED file/);
});
test('invalid GLB header fails',(t)=>{
  const dir=root(t);writeFileSync(path.join(dir,'assets/models/test.glb'),Buffer.from('fake'));
  assert.match(auditAssets(dir,manifest()).errors.join(','),/GLB header/);
});
test('glTF external files require recorded and existing dependencies',(t)=>{
  const dir=root(t);writeFileSync(path.join(dir,'assets/models/test.gltf'),
    JSON.stringify({asset:{version:'2.0'},buffers:[{uri:'missing.bin',byteLength:4}]}));
  const m=manifest();m.assets[0].files=['assets/models/test.gltf'];
  assert.match(auditAssets(dir,m).errors.join(','),/missing\/unsafe dependency/);
});
test('asset path traversal cannot escape repository',(t)=>{
  const dir=root(t);const m=manifest();
  m.assets[0].files=['assets/models/../../private.glb'];
  assert.match(auditAssets(dir,m).errors.join(','),/invalid path/);
});
