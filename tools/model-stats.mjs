#!/usr/bin/env node
// Zero-dependency glTF 2 / GLB source-complexity inspector.
// These are source-model counts, NOT GPU draw calls or measured FPS.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function loadGltf(file) {
  const b=fs.readFileSync(file);
  if(file.endsWith('.gltf'))return JSON.parse(b.toString('utf8'));
  if(!file.endsWith('.glb')||b.length<20||b.toString('ascii',0,4)!=='glTF'||
     b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)
    throw new Error('invalid GLB2 header');
  const n=b.readUInt32LE(12);
  if(n<2||n+20>b.length||b.toString('ascii',16,20)!=='JSON')
    throw new Error('invalid GLB JSON chunk');
  return JSON.parse(b.subarray(20,20+n).toString('utf8').trim());
}
export function inspectGltf(gltf) {
  if(!gltf?.asset?.version||!String(gltf.asset.version).startsWith('2.'))
    throw new Error('expected glTF2 asset');
  const accessors=gltf.accessors||[], meshes=gltf.meshes||[];
  let primitives=0,triangles=0,sourceVertices=0,nonTrianglePrimitives=0;
  for(const mesh of meshes)for(const p of mesh.primitives||[]){
    const pos=accessors[p.attributes?.POSITION];
    if(!pos||!Number.isFinite(pos.count)||pos.count<0)
      throw new Error('invalid POSITION accessor');
    const n=p.indices===undefined?pos.count:accessors[p.indices]?.count;
    if(!Number.isFinite(n)||n<0)throw new Error('invalid index accessor');
    primitives++;sourceVertices+=pos.count;
    const mode=p.mode??4;
    if(mode===4)triangles+=Math.floor(n/3);
    else if(mode===5||mode===6)triangles+=Math.max(0,n-2);
    else nonTrianglePrimitives++;
  }
  return {
    meshes:meshes.length,nodes:(gltf.nodes||[]).length,
    meshNodeReferences:(gltf.nodes||[]).filter(n=>Number.isInteger(n.mesh)).length,
    primitives,estimatedTriangles:triangles,sourceVertices,nonTrianglePrimitives,
    materials:(gltf.materials||[]).length,textures:(gltf.textures||[]).length,
    images:(gltf.images||[]).length,animations:(gltf.animations||[]).length,
    skins:(gltf.skins||[]).length,extensionsUsed:gltf.extensionsUsed||[]
  };
}
export function collectModelStats(root,manifest){
  const entries=[],errors=[],warnings=[];
  for(const a of manifest.assets||[])for(const p of a.files||[]){
    if(!/\.(glb|gltf)$/.test(p))continue;
    try{
      const stats=inspectGltf(loadGltf(path.join(root,p)));
      const bytes=fs.statSync(path.join(root,p)).size;
      entries.push({packageId:a.id,path:p,rightsStatus:a.status,bytes,...stats});
      if(stats.estimatedTriangles>250000)
        warnings.push(p+': >250k source triangles; mobile LOD review');
      if(stats.materials>48||stats.images>16)
        warnings.push(p+': high material/texture count; GPU memory review');
    }catch(e){errors.push(p+': '+(e.message||e));}
  }
  return {entries,errors,warnings,totals:{
    models:entries.length,
    sourceTriangles:entries.reduce((n,e)=>n+e.estimatedTriangles,0),
    sourceVertices:entries.reduce((n,e)=>n+e.sourceVertices,0),
    sourcePrimitives:entries.reduce((n,e)=>n+e.primitives,0)
  },caveat:'Source geometry is not runtime draw calls, shaded pixels, GPU memory or FPS.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/model-provenance.json'),'utf8'));
  const r=collectModelStats(root,manifest);
  fs.mkdirSync(path.join(root,'.ci'),{recursive:true});
  fs.writeFileSync(path.join(root,'.ci/model-stats.json'),JSON.stringify(r,null,2)+'\n');
  for(const e of [...r.entries].sort((a,b)=>b.estimatedTriangles-a.estimatedTriangles))
    console.log(String(e.estimatedTriangles).padStart(7)+' tris / '+
      String(e.primitives).padStart(4)+' primitives / '+
      (e.bytes/1048576).toFixed(2)+' MiB  '+e.path);
  for(const w of r.warnings)console.warn('MODEL REVIEW: '+w);
  for(const e of r.errors)console.error('MODEL ERROR: '+e);
  console.log('Model report: '+r.totals.models+' models, '+r.totals.sourceTriangles+
    ' source triangles, '+r.errors.length+' errors; .ci/model-stats.json');
  if(r.errors.length)process.exitCode=1;
}
