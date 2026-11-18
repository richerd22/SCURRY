// SCURRY MBTA: intentionally compressed subterranean game schematic.
// Real station identities: Arlington (Green), Boylston (Green),
// Park Street (Green + Red). NOT a diagram of service passages or tunnels.
// Local X is a navigational game axis; real Boston distances are not 1:1.
export const MBTA_ORIGIN = Object.freeze({x:8000,z:-8000});
export const MBTA_STATIONS = Object.freeze([
  Object.freeze({id:'arlington',name:'ARLINGTON',line:'GREEN LINE',x:-80,z:10,
    surfaceX:-193,surfaceZ:88}),
  Object.freeze({id:'boylston',name:'BOYLSTON',line:'GREEN LINE',x:0,z:10,
    surfaceX:-29,surfaceZ:90}),
  Object.freeze({id:'park',name:'PARK STREET',line:'GREEN / RED',x:76,z:10,
    surfaceX:-29,surfaceZ:-86}),
]);
export const MBTA_ROOMS = Object.freeze([
  Object.freeze({id:'green-walk',minX:-104,maxX:103,minZ:-2,maxZ:9}),
  Object.freeze({id:'arlington',minX:-99,maxX:-62,minZ:-2,maxZ:14}),
  Object.freeze({id:'boylston',minX:-17,maxX:17,minZ:-2,maxZ:14}),
  Object.freeze({id:'park-green',minX:59,maxX:99,minZ:-2,maxZ:14}),
  Object.freeze({id:'red-connection',minX:70,maxX:81,minZ:9,maxZ:43}),
  Object.freeze({id:'park-red',minX:60,maxX:82,minZ:40,maxZ:70}),
]);
export const MBTA_RAT_GATE=Object.freeze({x:75,z:62,ratX:49,ratZ:4});
export const MBTA_STAFF=Object.freeze({x:76,z:0});
export const MBTA_HIDE=Object.freeze({x:73,z:5});
export function withinTransit(x,z){
  return Number.isFinite(x)&&Number.isFinite(z)&&MBTA_ROOMS.some(r=>
    x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);
}
// Nearest rectangle boundary projects back into genuine walkable public-space
// corridors. Tracks are NEVER part of the walk union.
export function clampTransit(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return {x:76,z:10};
  if(withinTransit(x,z))return {x,z};
  let best=Infinity,point={x:76,z:10};
  for(const r of MBTA_ROOMS){
    const px=Math.max(r.minX,Math.min(r.maxX,x));
    const pz=Math.max(r.minZ,Math.min(r.maxZ,z));
    const d=(px-x)**2+(pz-z)**2;
    if(d<best){best=d;point={x:px,z:pz};}
  }
  return point;
}
// Simulation hour, NOT a promise about real-world MBTA operating hours.
export function transitCrowdLevel(hour){
  const h=((hour%24)+24)%24;
  if(h>=1.5&&h<5)return 'maintenance';
  if(h>=7&&h<9.5||h>=16&&h<19.5)return 'rush';
  if(h>=23.5||h<1.5)return 'last-trains';
  return 'regular';
}
export function trainAt(elapsed,phase=0){
  const t=((elapsed+phase)%42+42)%42;
  return t<28 ? -118+236*(t/28) : 128; // disappear beyond tunnel
}


// Short walk patterns: riders circulate only within station platforms.
export const MBTA_RIDER_ROUTES=Object.freeze([
 [[-90,4],[-73,4]],[[-73,8],[-88,8]],
 [[-12,4],[7,4]],[[5,8],[-6,8]],
 [[64,6],[88,6]],[[85,5],[65,5]],
 [[69,51],[74,51]],[[73,64],[66,64]],
].map(p=>Object.freeze(p.map(v=>Object.freeze(v)))));
