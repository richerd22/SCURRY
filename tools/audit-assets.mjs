#!/usr/bin/env node
// Reusable GLB/glTF provenance and mobile-size audit. Node built-ins only.
// For new projects, EMPTY the frozen legacy review set below.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const LEGACY_REVIEW_IDS=new Set(["bench","park-bench","dog","man","shiba","lantern","elm-pack","city-hall","fenway-surrounds","hatch-shell","fenway","td-garden"]);
const EXT=new Set(['.glb','.gltf','.bin','.png','.jpg','.jpeg','.webp']);
function pathsAt(dir,root,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())pathsAt(full,root,out);
    else if(entry.isFile())out.push(path.relative(root,full).split(path.sep).join('/'));
  }
  return out;
}
function safe(s){
  return typeof s==='string'&&s.startsWith('assets/models/')&&
    !/[\\%?:#]/.test(s)&&!s.includes('//')&&
    !s.split('/').some(p=>p==='..'||p==='.');
}
// Git blob identity, not a license signature. Prevent silent binary
// replacement of a previously reviewed package without a manifest diff.
export function gitBlobSha(data) {
  return createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
}
function glbIssue(file){
  const data=fs.readFileSync(file);
  if(data.length<20)return 'GLB header/chunk too small';
  if(data.toString('ascii',0,4)!=='glTF')return 'GLB magic invalid';
  if(data.readUInt32LE(4)!==2)return 'GLB version not 2';
  if(data.readUInt32LE(8)!==data.length)return 'GLB length header mismatch';
  if(data.readUInt32LE(12)+20>data.length)return 'GLB JSON chunk too long';
  if(data.toString('ascii',16,20)!=='JSON')return 'GLB first chunk not JSON';
  return null;
}
export function auditAssets(root,manifest,{legacyIds=LEGACY_REVIEW_IDS}={}){
  const errors=[],warnings=[],seen=new Map(),ids=new Set();
  if(manifest?.schemaVersion!==1||!Array.isArray(manifest.assets)){
    return {errors:['Expected schemaVersion=1 and assets array'],warnings,files:0,packages:0};
  }
  for(const a of manifest.assets){
    if(!a||typeof a.id!=='string'||!/^[a-z0-9-]+$/.test(a.id)){
      errors.push('invalid asset id '+String(a?.id));continue;
    }
    if(ids.has(a.id))errors.push('duplicate asset id '+a.id);
    ids.add(a.id);
    if(!a.kind||!a.author||!a.source||!a.license||!a.use)
      errors.push(a.id+': missing source/author/license/kind/use metadata');
    if(a.status==='verified'){
      if(!a.url||!a.licenseEvidenceUrl||a.author==='unknown'||
         /unknown|claimed|missing|unverified|review/i.test(a.license))
        errors.push(a.id+': verified requires exact source, author and license evidence');
    }else if(a.status==='review'||a.status==='unknown'){
      if(!legacyIds.has(a.id))
        errors.push(a.id+': NEW model cannot ship without verified rights');
      else warnings.push(a.id+': legacy rights review unresolved: '+a.license);
    }else errors.push(a.id+': invalid rights status');
    if(!Array.isArray(a.files)||!a.files.length)errors.push(a.id+': no files');
    for(const p of a.files||[]){
      if(!safe(p)||!EXT.has(path.extname(p).toLowerCase())){
        errors.push(a.id+': invalid path '+p);continue;
      }
      if(seen.has(p))errors.push(p+': duplicate asset owner');
      seen.set(p,a.id);
      const file=path.join(root,p);
      if(!fs.existsSync(file)){errors.push(p+': missing file');continue;}
      const stat=fs.lstatSync(file);
      if(stat.isSymbolicLink()){errors.push(p+': symlinks cannot be registered as model binaries');continue;}
      if(!stat.isFile()||stat.size===0){errors.push(p+': empty/nonfile');continue;}
      if(stat.size>8*1024*1024)errors.push(p+': exceeds per-file mobile 8MiB budget');
      const expected=a.gitBlobs?.[p];
      if(typeof expected!=='string'||!/^[a-f0-9]{40}$/.test(expected))
        errors.push(p+': missing exact gitBlob identity in provenance manifest');
      else if(gitBlobSha(fs.readFileSync(file))!==expected)
        errors.push(p+': model bytes differ from recorded gitBlob identity');
      if(p.endsWith('.glb')){
        const issue=glbIssue(file);
        if(issue)errors.push(p+': '+issue);
      }
      if(p.endsWith('.gltf')){
        try{
          const doc=JSON.parse(fs.readFileSync(file,'utf8'));
          if(!doc.asset||!String(doc.asset.version).startsWith('2'))
            errors.push(p+': unsupported glTF version');
          for(const ref of [...(doc.buffers||[]),...(doc.images||[])]){
            const uri=ref.uri;
            if(!uri||uri.startsWith('data:'))continue;
            if(/^(https?:)?\/\//i.test(uri)){errors.push(p+': remote dependency '+uri);continue;}
            const dep=path.posix.normalize(path.posix.join(path.posix.dirname(p),uri));
            if(!safe(dep)||!fs.existsSync(path.join(root,dep)))
              errors.push(p+': missing/unsafe dependency '+uri);
            else if(!(a.files||[]).includes(dep))
              errors.push(p+': unregistered glTF dependency '+dep);
          }
        }catch(e){errors.push(p+': bad glTF JSON '+e.message);}
      }
    }
  }
  const present=pathsAt(path.join(root,'assets/models'),root);
  for(const p of present)if(!seen.has(p))errors.push('UNREGISTERED file '+p);
  for(const p of seen.keys())if(!present.includes(p))errors.push('MANIFEST file not present '+p);
  return {errors,warnings,files:present.length,packages:manifest.assets.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/model-provenance.json'),'utf8'));
  const result=auditAssets(ROOT,manifest);
  for(const warning of result.warnings)console.warn('REVIEW: '+warning);
  for(const error of result.errors)console.error('ERROR: '+error);
  console.log('Asset audit: '+result.packages+' packages, '+result.files+' files, '+result.errors.length+' errors, '+result.warnings.length+' existing source reviews');
  if(result.errors.length)process.exitCode=1;
}
