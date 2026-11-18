// Authored route waypoints through the same burrow-layout room/corridor union.
// Each two consecutive points is checked at 20cm resolution by Node tests.
// Even curious squirrels do not cut through the underground dirt walls.
export const BURROW_PATROLS=Object.freeze([
 {species:'rat',speed:.74,points:[[0,0],[8,0],[20,0],[36,0],[45,0],[36,0],[20,0],[8,0]]},
 {species:'rat',speed:.72,points:[[33,10],[28,10],[20,10],[18.5,10],[18.5,0],[12,0],[0,0],[12,0],[18.5,0],[18.5,10],[28,10]]},
 {species:'rat',speed:.79,points:[[-32,-10],[-28,-10],[-18,-10],[-18,0],[-8,0],[0,0],[-8,0],[-18,0],[-18,-10],[-28,-10]]},
 {species:'rat',speed:.82,points:[[44,3],[44,0],[30,0],[18.5,0],[18.5,-12],[16,-12],[16,-20],[16,-23],[16,-20],[16,-12],[18.5,-12],[18.5,0],[30,0],[44,0]]},
 {species:'squirrel',speed:1.06,points:[[0,0],[0,8],[0,12],[0,20],[0,12],[0,8],[0,0],[-8,0],[-18,0],[-23,0],[-18,0],[-8,0]]},
 {species:'squirrel',speed:.92,points:[[0,20],[0,12],[-16,12],[-16,20],[-16,12],[0,12]]},
 {species:'squirrel',speed:1.01,points:[[-23,0],[-18,0],[-8,0],[0,0],[0,-8],[0,-12],[0,-23],[0,-12],[0,0],[-8,0],[-18,0]]},
].map(p=>Object.freeze({...p,points:Object.freeze(p.points.map(v=>Object.freeze(v)))})));
