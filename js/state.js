// SCURRY - shared game state and registries.
// Every module imports this singleton. No logic here, just the world ledger.

export const S = {
  // three.js core (filled by main.js)
  scene: null,
  camera: null,
  renderer: null,

  // world registries
  solids: [],        // {x, z, r} horizontal push-out circles
  solidBoxes: [],    // {minX, maxX, minZ, maxZ} horizontal push-out boxes
  platforms: [],     // {x, z, r, y} walkable discs (canopies, bandstand roof)
  platformBoxes: [], // {minX, maxX, minZ, maxZ, y} walkable box tops (bridge deck, monument steps)
  trees: [],         // {x, z, r, trunkTop, canopyY, canopyR, hollow?}
  lamps: [],         // {sprite, bulbMat, x, z} for dusk glow
  foods: [],         // live food items (systems/food.js manages)
  interactables: [], // {x, y, z, r, label: fn()->string|null, action: fn()}
  blankets: [],      // picnic blankets (props.js fills, food.js reads)
  benchSitters: [],  // humans who can be begged (humans.js fills)

  // player state (systems/player.js owns the body, everyone reads)
  player: {
    pos: null,          // THREE.Vector3 feet position
    vel: null,          // THREE.Vector3
    yaw: 0, pitch: 0,
    grounded: false,
    climbing: null,     // tree object being climbed, or null
    climbAngle: 0,
    begging: 0,         // seconds remaining in beg pose
    biteCooldown: 0,
    biteAnim: 0,
    scramble: 0,        // post-dog-hit wobble timer
    inHollow: false,
    moving: false,
    sprinting: false,
  },

  // game state
  stash: 0,
  carried: null,       // food type string or null
  timeHours: 17.6,     // starts at golden hour
  rangerAlert: 0,      // seconds the ranger stays mad
  spottedFlash: 0,     // HUD warning timer
  paused: false,
  started: false,
  muted: false,
  message: null,       // {text, until} big center toast
  gossipIndex: 0,

  respawnPoint: null,  // bandstand roof (landmarks.js sets)
  hollowTreePos: null, // (trees.js sets)
};

// World layout constants (metres). X: east +, Z: south + (north is -Z).
export const MAP = {
  minX: -215, maxX: 215, minZ: -125, maxZ: 125,
  charlesMinX: -58, charlesMaxX: -42,          // Charles Street asphalt band
  garden:  { minX: -205, maxX: -60, minZ: -98, maxZ: 98 },
  common:  { minX: -40,  maxX: 205, minZ: -102, maxZ: 102 },
  lagoon:  { x: -132, z: 0, rx: 50, rz: 27 },
  frogPond:{ x: 95, z: 12, rx: 21, rz: 13.5 },
};
