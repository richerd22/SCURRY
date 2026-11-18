// Code-built park entrance architecture: granite piers and simple
// engraved-looking plaques. No external model/texture/photo is downloaded.
// Existing traversable gate clearances and physics remain authoritative.
import * as THREE from 'three';
import { S } from '../state.js';
import { makeParkEntranceLayout } from './entrance-layout.js';
export function buildParkEntrances(scene, groundAt){
  const {piers,signs}=makeParkEntranceLayout(groundAt);
  const granite=new THREE.MeshStandardMaterial({color:0xb7afa3,roughness:.94});
  const crown=new THREE.MeshStandardMaterial({color:0xcac1b3,roughness:.91});
  const bronzed=new THREE.MeshStandardMaterial({color:0x2c4035,metalness:.53,roughness:.64});
  const d=new THREE.Object3D();
  function batch(geo,mat,count,transform){
    const mesh=new THREE.InstancedMesh(geo,mat,count);
    mesh.frustumCulled=false;
    for(let i=0;i<count;i++){
      d.position.set(0,0,0);d.quaternion.identity();d.scale.set(1,1,1);
      transform(d,i);
      d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    scene.add(mesh);
  }
  batch(new THREE.BoxGeometry(1,1,1),granite,piers.length,(d,i)=>{
    const p=piers[i];d.position.set(p.x,p.y+.89,p.z);
    d.scale.set(p.size,1.78,p.size);
  });
  batch(new THREE.BoxGeometry(1,1,1),crown,piers.length,(d,i)=>{
    const p=piers[i];d.position.set(p.x,p.y+1.83,p.z);
    d.scale.set(p.size+ .22,.17,p.size+.22);
  });
  batch(new THREE.BoxGeometry(1,1,1),crown,piers.length,(d,i)=>{
    const p=piers[i];d.position.set(p.x,p.y+.10,p.z);
    d.scale.set(p.size+.17,.20,p.size+.17);
  });
  batch(new THREE.SphereGeometry(.18,8,6),crown,piers.length,(d,i)=>{
    const p=piers[i];d.position.set(p.x,p.y+2.03,p.z);
  });
  // Explicit collision volumes stop the squirrel walking through the stone
  // piers but do NOT span an entrance or add invisible iron gates.
  for(const p of piers)S.solidBoxes.push(p.collision);
  // Small plaques are code-rendered canvas text. Garden reference uses
  // PUBLIC GARDEN 1837, while Common reads BOSTON COMMON.
  function plaqueTexture(park){
    const cv=document.createElement('canvas');cv.width=384;cv.height=192;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#253b2d';ctx.fillRect(0,0,384,192);
    ctx.strokeStyle='#c6aa65';ctx.lineWidth=8;ctx.strokeRect(12,12,360,168);
    ctx.textAlign='center';ctx.fillStyle='#e0c98e';
    ctx.font='bold 39px Georgia, serif';
    ctx.fillText(park==='garden'?'PUBLIC':'BOSTON',192,74);
    ctx.fillText(park==='garden'?'GARDEN':'COMMON',192,119);
    if(park==='garden'){
      ctx.font='bold 24px Georgia, serif';ctx.fillText('1837',192,155);
    }
    const tex=new THREE.CanvasTexture(cv);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=2;
    return tex;
  }
  const materials={
    garden:new THREE.MeshStandardMaterial({
      map:plaqueTexture('garden'),roughness:.69,metalness:.13,side:THREE.DoubleSide
    }),
    common:new THREE.MeshStandardMaterial({
      map:plaqueTexture('common'),roughness:.69,metalness:.13,side:THREE.DoubleSide
    })
  };
  const panel=new THREE.PlaneGeometry(.71,.38);
  for(const sign of signs){
    const mesh=new THREE.Mesh(panel,materials[sign.park]);
    mesh.position.set(sign.x,sign.y,sign.z);
    if(sign.facing==='x')mesh.rotation.y=Math.PI/2;
    scene.add(mesh);
  }
  // Small iron collar at each pier: architectural detail at low eye height.
  batch(new THREE.BoxGeometry(1,.07,1),bronzed,piers.length,(d,i)=>{
    const p=piers[i];d.position.set(p.x,p.y+.46,p.z);
    d.scale.set(p.size+.035,1,p.size+.035);
  });
}
