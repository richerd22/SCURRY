// Park people stay on authored walkways; a wildlife encounter does not
// justify taking a shortcut across Frog Pond or Charles Street.
// IDs reference the canonical PATHS exported by world.js.
export const CIVILIAN_PATH_INDICES=Object.freeze([0,1,4,7,8,11]);
export const RANGER_PATROL=Object.freeze([
  [-30,-18],[60,-18],[112,-18],[160,20],[140,42],
  [112,42],[60,42],[10,30],[-20,40],
].map(p=>Object.freeze(p)));
