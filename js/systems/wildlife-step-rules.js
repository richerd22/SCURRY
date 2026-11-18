// Deterministic obstacle-aware ground animal step, dependency-free.
// Only accepts a step when the runtime collision/terrain query says CLEAR.
// Side-step first to steer around tree trunks and picnic furniture; if
// every move is blocked, wait rather than visually clipping through it.
export function wildlifeStep(x,z,tx,tz,stride,isFree,preferredSide=1,out=null){
  const result=out||{x,z};result.x=x;result.z=z;
  if(![x,z,tx,tz,stride].every(Number.isFinite)||
    stride<=0||typeof isFree!=='function')return result;
  const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);
  if(d<.05)return result;
  const step=Math.min(d,stride),ux=dx/d,uz=dz/d;
  let nx=x+ux*step,nz=z+uz*step;
  if(isFree(nx,nz)){result.x=nx;result.z=nz;return result;}
  const side=preferredSide<0?-1:1;
  nx=x-side*uz*step;nz=z+side*ux*step;
  if(isFree(nx,nz)){result.x=nx;result.z=nz;return result;}
  nx=x+side*uz*step;nz=z-side*ux*step;
  if(isFree(nx,nz)){result.x=nx;result.z=nz;}
  return result;
}
