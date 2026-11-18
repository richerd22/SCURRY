// Pure authored Boston Common/Public Garden perimeter runs.
// This is the single geometry/collision source of truth, testable in Node.
// Do not close the gate openings: the squirrel must reach Charles St,
// Park Street and adjoining sidewalk exits.
export const PARK_FENCE_RUNS = Object.freeze([
  [-38,-100,120,-100], [150,-100,203,-100],
  [-38,100,203,100], [203,-100,203,100],
  [-38,-100,-38,-84], [-38,-60,-38,100],
  [-203,-96,-62,-96], [-203,96,-62,96],
  [-203,-96,-203,96],
  [-62,-96,-62,-76], [-62,-56,-62,20], [-62,44,-62,96]
]);

// Sample every panel independently and walk the actual terrain height
// function at every post and picket, rather than placing a full-length
// straight fence at one inaccurate midpoint height.
export function makeParkFenceLayout(groundAt, panelMax=2.2, picketMax=0.43, runs=PARK_FENCE_RUNS) {
  if(typeof groundAt!=='function'||!Number.isFinite(panelMax)||panelMax<=0||
     !Number.isFinite(picketMax)||picketMax<=0)throw new RangeError('invalid fence spacing');
  const posts=[],pickets=[],panels=[];
  for (const run of runs) {
    if(!Array.isArray(run)||run.length!==4||!run.every(Number.isFinite))
      throw new TypeError('nonfinite park fence run');
    const [x0,z0,x1,z1]=run;
    const length=Math.hypot(x1-x0,z1-z0);
    if(length<.001)continue;
    const count=Math.max(1,Math.ceil(length/panelMax));
    let previous=null;
    for(let i=0;i<=count;i++){
      const t=i/count,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;
      const y=groundAt(x,z);
      if(!Number.isFinite(y))throw new TypeError('nonfinite terrain under fence');
      const post={x,y,z};
      posts.push(post);
      if(previous){
        const dx=post.x-previous.x,dz=post.z-previous.z;
        const horizontal=Math.hypot(dx,dz);
        const span={x0:previous.x,z0:previous.z,y0:previous.y,
          x1:post.x,z1:post.z,y1:post.y,length:horizontal};
        panels.push(span);
        const divisions=Math.max(1,Math.ceil(horizontal/picketMax));
        for(let k=1;k<divisions;k++){
          const u=k/divisions,px=previous.x+dx*u,pz=previous.z+dz*u;
          const py=groundAt(px,pz);
          if(!Number.isFinite(py))throw new TypeError('nonfinite picket support');
          pickets.push({x:px,y:py,z:pz});
        }
      }
      previous=post;
    }
  }
  return {posts,pickets,panels};
}
