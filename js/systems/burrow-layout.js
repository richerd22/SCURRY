/** Shared source of truth for traversable Burrows. All coordinates local to TUN. */
// Rooms: { id, minX, maxX, minZ, maxZ } in local coords (x east, z south).
export const ROOMS = [
  { id: 'hub',       minX: -6,  maxX: 6,  minZ: -6,  maxZ: 6  },   // central chamber
  { id: 'entry_hollow',   minX: -3,  maxX: 3,  minZ: -26, maxZ: -20 }, // N
  { id: 'entry_frog',     minX: -26, maxX: -20, minZ: -3,  maxZ: 3  }, // W
  { id: 'entry_monument', minX: -19, maxX: -13, minZ: 17,  maxZ: 23 }, // SW
  { id: 'entry_garden',   minX: -3,  maxX: 3,  minZ: 20,  maxZ: 26  }, // S
  { id: 'entry_mall',     minX: 13,  maxX: 19, minZ: 17,  maxZ: 23  }, // SE
  { id: 'entry_lagoon',   minX: 13,  maxX: 19, minZ: -26, maxZ: -20 }, // NE
  { id: 'storage_a', minX: -36, maxX: -28, minZ: -14, maxZ: -6 },  // west, off the ring
  { id: 'storage_b', minX: 28,  maxX: 36, minZ: 6,   maxZ: 14 },   // east, off the ring
  { id: 'market',    minX: 38,  maxX: 52, minZ: -6,  maxZ: 6  },   // deep east end
];
// Corridors: same rect shape. The ring + four spokes join everything to
// the hub; the market run is the longest corridor in the network.
export const CORRIDORS = [
  { id: 'spoke_n',    minX: -1.5, maxX: 1.5,  minZ: -14, maxZ: -6 },
  { id: 'spoke_s',    minX: -1.5, maxX: 1.5,  minZ: 6,   maxZ: 14 },
  { id: 'spoke_w',    minX: -14,  maxX: -6,   minZ: -1.5, maxZ: 1.5 },
  { id: 'market_run', minX: 6,    maxX: 38,   minZ: -1.5, maxZ: 1.5 }, // the long one
  { id: 'ring_n',     minX: -20,  maxX: 20,   minZ: -14, maxZ: -11 },
  { id: 'ring_s',     minX: -20,  maxX: 20,   minZ: 11,  maxZ: 14 },
  { id: 'ring_w',     minX: -20,  maxX: -17,  minZ: -14, maxZ: 14 },
  { id: 'ring_e',     minX: 17,   maxX: 20,   minZ: -14, maxZ: 14 },
  { id: 'br_hollow',   minX: -1.5,  maxX: 1.5,  minZ: -20, maxZ: -11 },
  { id: 'br_frog',     minX: -26,   maxX: -17,  minZ: -1.5, maxZ: 1.5 },
  // Physical missing link between spoke_w and ring_w: this gap was solid dirt.
  { id: 'join_w', minX: -17.3, maxX: -13.7, minZ: -1.5, maxZ: 1.5 },
  { id: 'br_monument', minX: -17.5, maxX: -14.5, minZ: 11, maxZ: 20 },
  { id: 'br_garden',   minX: -1.5,  maxX: 1.5,  minZ: 11,  maxZ: 20 },
  { id: 'br_mall',     minX: 14.5,  maxX: 17.5, minZ: 11,  maxZ: 20 },
  { id: 'br_lagoon',   minX: 14.5,  maxX: 17.5, minZ: -20, maxZ: -11 },
  { id: 'br_storage_a', minX: -28,  maxX: -17,  minZ: -11.5, maxZ: -8.5 },
  { id: 'br_storage_b', minX: 17,   maxX: 28,   minZ: 8.5,  maxZ: 11.5 },
];
export const RECTS = ROOMS.concat(CORRIDORS);

export function burrowLocalWalkable(x,z,pad=0){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 return RECTS.some(r=>x>=r.minX-pad&&x<=r.maxX+pad&&z>=r.minZ-pad&&z<=r.maxZ+pad);
}
