# SCURRY - Agent Guide (cold start)

You are picking up SCURRY, a first-person squirrel game (Three.js, static
site, no build step) on a full model of Boston Common + Public Garden.
Live at https://scurry.cold.fyi - this repo (`richerd22/SCURRY`, public)
IS the site: GitHub Pages serves `main` at the root.

## Standing orders (from the owner, Richard - do not re-litigate)

- **Quality bar: BEYOND Saltline** (saltlinegame.pro), permanently. His
  words: "Reference level. Models of Common. Garden. Everything." -
  world fidelity is a deliverable in itself, not polish. The models are
  also a reusable asset library for future projects; they must read well
  at squirrel height (0.25 m) AND at human/reference height.
- **Build autonomy:** "dont wait for my approval. you have the full
  direction." Build, verify, push to `main`, report. No approval stops.
- **No AI-generated imagery. Ever.** Procedural canvas textures, code
  geometry, and licensed sourced models only.
- **Source models first** where a licensed model beats procedural:
  CC0 preferred, CC-BY with credit, never NC/ND. Every asset lands in the
  workspace asset library (`~/workspace/gamewell/assets-library/`) with a
  row in its `ATTRIBUTION.md` BEFORE use in the game.
- **Mobile is a requirement,** not a stretch goal: touch controls, no
  pointer-lock dependency, tap-to-start in iOS Safari / in-app browsers,
  perf scaling. Owner playtests on his iPhone.
- Tone in player-facing copy: dry, a little funny, no earnest fluff.

## Architecture

Plain ES modules, import map pins `three@0.160.0` (+ `three/addons/`).
State lives in one singleton `S` (`js/state.js`) - registries (solids,
platforms, trees, lamps, interactables...), player state, game state.
Modules never import each other in circles; systems read/write `S`.

- `js/main.js` - boot order, interaction scan (E-key prompt resolution),
  title/pause, touch boot, perf ladder, the loop. Bite resolves via
  `S.onBite`; the ranger catch via `S.fadeCatch`.
- `js/world/` - `world.js` terrain (heightfield via gaussian hills),
  painted ground, terrain-following wet paths, water, sky shader, clouds,
  city backdrop. `trees.js` elms + climbable canopies + understory
  (instanced bushes, ~10k grass tufts). `landmarks.js` State House,
  monument, bandstand, bridge, ducklings, etc. `props.js` benches, lamps
  (Post Lantern swap), trash cans, blankets, pretzel cart, fences.
  `textures.js` procedural canvas texture factory (seeded RNG).
- `js/systems/` - `player.js` movement/climb/paw rig (READ ITS HEADER
  before touching the body rig - the anatomy notes are hard-won),
  `daycycle.js` keyframed sun/sky/fog + PMREM env rebake per phase +
  player-following shadow camera, `models.js` GLB loader with cache +
  `fitHeight` + clip lookup (tolerates `Armature|...|Walk` names),
  `humans.js` actor registry (role -> animation clip; ranger included,
  green-tinted), `dogs.js`, `ranger.js`, `food.js`, `hollow.js`,
  `audio.js` (all synthesized; every call guarded).
- `js/systems/` round v0.5 - `burrows.js` tunnel network + rat market
  (interior at (3000, 0, 3000), rect-union walkable clamp, 6 entrances,
  caps economy lives here; `S.caps` persists via save.js since v0.5.1), `geese.js` bridge flock (deck found via
  `S.platformBoxes`, `S.fadeCatch` relocation, `S.gooseWarn` drives the
  HUD line), `crows.js` food thieves (perch on lamps, `S.shotPose` crow
  tableau). Shared wiring they depend on: `player.js` `collideWalls`
  exempts BOTH `inHollow` and `inBurrow` from the park-bounds clamp;
  `food.js` exports `removeFoodItem` and values the market croissant at
  3 stash in `BURY_VALUES`; `audio.js` has `clink`/`honk`/`caw`.
- `js/ui/` - `hud.js`, `touch.js` (stick feeds `S.touch`, buttons write
  the same key table the keyboard uses via `setTouchKey`).

**Sourced-model pattern:** build the procedural version first, then swap
the GLB in async when it loads (see dogs/humans/props). If a model fails,
the game must still work. Never block first paint on a GLB.

## Verify before you push (the shot-mode system)

`?shot=<pose>&t=<hour>` auto-starts without pointer lock, poses the
squirrel, freezes dogs/ranger, and sets `window.__scurryReady` once
models settle + a few frames render. Poses: `spawn`, `down` (THE body
check - looking straight down must show at most a hint of belly/tail at
the frame rim), `garden`, `statehouse`, `bench`, `cart`, `lamps`,
`canopy`, plus v0.5: `burrow` (inside an entry chamber), `market` (the
rat Exchange), `geese` (on the deck in warn range - geese are NOT frozen
in shot mode, the warn tableau is the point), `crow` (crows.js freezes
crow #0 mid-swoop in front of the player, who is posed carrying a
pretzel by the cart; crows are not frozen either), `crowperch` (crow #1
on its lamp by the blankets, seen from below-side - the profile check
for the v0.5.1 crow rebuild). `S.shotPose` carries
the pose name to systems that self-stage. Add `&lowq=1` for software renderers (0.55 pixel ratio, no
shadows, quarter grass, no PMREM) and `&touch=1` to force the touch UI.
In a real browser you can also just open these URLs and look.

Headless note for this sandbox: Chromium can't reach unpkg through the
egress proxy - vendor `three@0.160.0` files locally and fulfill via
Playwright request interception (context-level RegExp route; the glob
form silently doesn't fire in headless shell). Harness lives at
`/tmp/shottools/` (shot.js / mobile-shot.js) with a Chrome-for-Testing
headless shell. SwiftShader renders this scene at ~1-3 fps: lowq is
mandatory, 6 ready-frames, ~30 s per pose.

Also: `node --check` every JS file before pushing. Zero console errors
is the bar - the harness prints them.

## Push flow

Git protocol is blocked in the sandbox. Use the Git Data API:
`PYTHONPATH=/opt/muse/skills/custom-connector-setup/bin python3 ~/workspace/gamewell/scurry-push.py "<commit message>"`
(incremental blob diff, full-tree commit). Rules:
- `play/CNAME` (contents: `scurry.cold.fyi`) MUST exist locally - the
  push builds the tree from local files; dropping CNAME kills the
  custom domain.
- The token cannot create repos or enable Pages (403) - both already
  exist; content pushes only.
- After pushing, poll `https://scurry.cold.fyi/` until the
  `scurry-version` meta in index.html matches what you shipped, and
  spot-fetch one changed JS file.

## Performance rules

- Cap pixel ratio (1.75 desktop / 1.5 touch). Instancing for repeated
  nature (tufts, bushes). One PointLight per 4 lamps; sprites + cones
  carry the rest. Shadow camera is a tight box (±78 desktop / ±62 touch)
  following the player, snapped to a 4 m grid.
- The touch perf ladder (main.js) steps down at <40 fps EMA: pixel
  ratio -> shadow size -> shadows off + grass 45%. Don't add per-frame
  allocations in the loop; reuse vectors.
- PMREM rebakes happen only when the day-phase segment changes.

## Known state / next rounds (as of v0.6, Nov 16 2026)

- v0.3 (commit 35a13a6): full-quality grade pass (warm golden-hour hemi
  blend, PMREM horizon lift, water emissive sheen - pond/lagoon reflect
  sky + lamps, never black; exposure 1.22, midday trimmed). Hero trees:
  Quaternius `Trees.glb` split into Tree1-5.glb (raw re-slicer, geometry
  byte-identical, 32,220 tris total) and swapped in at 17 hero spots
  (Hollow tree, Mall elms, Garden specimens) over the procedural
  fallback; registries are never modified by the swap. Benches: the
  CC0 Quaternius bench (baked, seat-height-exact scale x3.7431) swapped
  in for all 22. WARNING: the Sammy "Park Bench" in the library is a
  PICNIC TABLE (merged derivative banked as a future picnic prop) - do
  not use it as a bench.
- v0.4: canopy highways (`systems/canopy.js` - 49 bridges / 527 m of
  stepping-box routes computed from the tree registry, Common-Garden
  crossing via a planted snag at (-47.13,-37.58), 6 cache hollows with
  150 s restock, stream-cam lookout perch at (-33.9,-1.9) with a "sit
  in frame" interactable). Hawk Dua (`systems/hawk.js` - roost/circle/
  screech/dive state machine; canopy cover = safety; catch relocates
  to a random canopy, stash intact; bite escape window is tight by
  design, ~last 0.2 s of the dive - tune after playtests). Save
  persistence (`systems/save.js` via hud.js hooks: `scurry-save-v1` -
  live stash, caps balance (v0.5.1), bestDays by dawn-crossing, daysPlayed, muted). food.js
  has a 1.5 m height gate on pickup AND bury (canopy food/bury exploits
  closed). fadeCatch in main.js now takes optional {pos, message,
  grounded} - ranger behaviour unchanged.
- Known warts: foreground grass tufts read as dark silhouettes at
  golden hour (floored in v0.6.1, still wants a real-GPU eyeball).
  (Split-tree texture duplication and the hawk/dog shared HUD line
  were fixed in v0.6.7 - see the round notes below.)
- v0.5 (Nov 16 2026): burrow tunnels + rat black market
  (`systems/burrows.js` - 6 entrances, hub-and-ring rect network at
  (3000,0,3000), 2 storage chambers, caps collectible + the Exchange:
  3 caps -> a croissant that buries for 3), Public Garden geese
  (`systems/geese.js` - 3 on the lagoon bridge; honk-warn, charge,
  wait-out / food-toll / altitude counterplay; catch = bridge-end
  relocation, stash intact), food-stealing crows (`systems/crows.js` -
  3 perchers, stalk/swoop/snatch to perch, bite swats them into a 60 s
  sulk). All verified zero-console-error in shot mode (burrow, market,
  geese, crow poses). Known limits: caps are session-only (not in the
  save yet); the crow reads blobby at point-blank range (fine at swoop
  distance); goose deck height is read from the landmarks platformBox
  (y=1.15) with a 0.55 fallback.
- v0.5.1 (Nov 16 2026): caps persistence (save.js schema gains `caps`,
  sanitized like every other count; earns and Exchange spends ride the
  same dirty-checked observeSave writes - no save call at the trade
  site; title line shows caps when > 0; headless save tests now 24/24
  in /tmp/test-save.mjs) and the crow rebuild. Crow sourcing was
  evaluated first: every corvid on Poly Pizza (Poly by Google "Crow"
  /m/1MIvWQ5Q3R9, "Raven" /m/7eQ51arTYDj, /m/bnpgn6o5qNs, /m/5oae0lwh9fF,
  all CC-BY 3.0) is a single STATIC mesh - no rig, no separable
  wings/head/tail, 550-930 tris - and this crow is animated part by
  part, so a swap would have deleted its animation vocabulary. Do not
  re-run that hunt. Instead makeCrowMesh was rebuilt: lathe teardrop
  body, neck, two-part flattened beak, glossy eyes, throat ruff,
  extruded wing outlines with stepped primaries (+ a whisper of
  airfoil pitch so wings don't vanish edge-on), extruded tail fan,
  toed feet. Same userData contract. Verified via `crow` (swoop
  tableau: head/body separation, wing surfaces) + new `crowperch`
  pose (profile: beak + tapered body), spawn/down clean, zero console
  errors. Note: head-on at golden hour the crow is still mostly
  silhouette - it's a black bird at sunset; judge it in profile.
- v0.6 (Nov 16 2026): canopy bridge organic pass (`systems/canopy.js`
  `buildBridgeLimb` - the visible limb under each stepping-box route is
  now one swept BufferGeometry tube: seeded per-bridge taper (end swell
  0.74-1.24x), radius ripple, lateral wander <= ~0.23 m, ridged
  out-of-round sections, bark UVs with the grain, end caps, twig stubs
  on spans > 9 m. Crown pinned ~0.185 below the walk line, matching the
  old cylinders' clearance. Purely visual - platformBoxes untouched;
  walktest re-verified 98/98 endpoints, zero console errors. The old
  `limbGeo` cylinder is still used for cache/perch stub limbs.)
- v0.6.1 (Nov 16 2026): golden-hour tuft floor (`trees.js` tuftMat gains
  `emissiveMap: bladeTex` + `S.tuftMat` registration; `daycycle.js`
  drives its emissive from hemiMid/lampWarm at 0.3, same pattern as
  waterMat; instance lightness floor 0.32 -> 0.37). Verified: down/spawn
  shots at t=18 show blade texture where the frame was uniform black;
  t=11 midday unchanged; zero console errors. Caveat: shot mode is
  lowq (no PMREM env), so the full golden-hour lawn grade still wants
  a real-GPU eyeball.
- v0.6.2 (Nov 16 2026): western Mall waypoint elm (`trees.js`
  `buildMallWaypoint` - one fixed-constant elm at (-20.8,-12.8),
  canopyR 4.5, canopyY 9.6, appended after the scatter so the seeded
  park layout is untouched). The 27.9 m Mall gap now bridges as two
  legs (13.9 m / gap 6.4 and 14.0 m / gap 6.9): network is 51 bridges /
  554.4 m, walktest 102/102, zero console errors. The old "western
  Mall row has no canopy bridge" wart is CLOSED.
- v0.6.3-0.6.7 (Nov 16-17 2026): the landmark fidelity round.
  Bridge rebuilt as a true suspension bridge (CatmullRom catenary
  cable tubes, suspender rods, X-braced towers, instanced balusters,
  abutments; deck platformBoxes + goose deck height UNCHANGED).
  State House: extruded triangular pediment, lathe bell-profile
  dome, drumTex windowed drum, columned lantern + pinecone finial,
  arcadeTex ground-floor arcade, cornice balustrade. Monument:
  LatheGeometry column with entasis + fluteTex, capital, reliefTex
  bronze panels, 4 corner figures (with their own small solids),
  flag staff on the summit figure. Bandstand: shallow sphere-cap
  dome (apex kept at the old 9.1 platform line - S.platforms and
  respawnPoint untouched), entablature ring, 28-seg round deck.
  Skyline: buildSkylineTowers in world.js (glass slab via
  glassFacade + envMapIntensity, setback stack, spired shaft +
  beacon, clock tower via clockTex + pyramid cap); glass mat joins
  S.cityMats so daycycle drives its dusk glow. New shot poses:
  bridge, bandstand, monument. Hawk wart FIXED: S.hawkFlash is her
  own timer now (hawk.js writes it, main.js warnings() gives her
  her own line, loop decays it); dogs keep S.spottedFlash. Tree
  wart FIXED: Tree1-5 ship as .gltf + .bin with the 3 shared
  textures externalized once into assets/models/tex/ (md5-verified
  identical across the old GLBs; geometry byte-preserved; original
  GLBs remain canonical in the asset library). Tree payload
  11.5 MB -> ~3.4 MB. Walktest 102/102, all shot poses zero-error.
  STILL placeholder-grade, plainly: procedural elm canopies at
  human height, the Washington statue + swan boats (abstract
  low-poly), ducklings (stylized), generic ring-block facades
  between the four skyline towers, Park St headhouse (box + sign).
- v0.6.8 (Nov 17 2026): hawk realism pass (owner tuning: "Hawk Dua
  should be occasional"). Two layers now. AMBIENT HAWKS: 2 red-tails
  (adult + juvenile variant with brown tail) in hawk.js - soar wide
  circles (Common centre (55,-5) r68 h46; Garden centre (-135,5)
  r52 h40), excursions every 50-110 s of soaring: a low glide across
  the park at 12-17 m (shadow disc sweeps at <20 m) or a lamp-top
  perch (perches picked from S.lamps, y = gy+3.62, snag fallback)
  for 18-40 s; at night they sit their perches. No screech/dive/HUD
  - S.ambientHawks exposes them for tests. HAWK DUA rarity: a hunt
  needs cooldown spent AND interest >= patience (interest builds
  only during continuous exposure, drains 2x under cover; patience
  re-rolls 20-45 s after every resolution). Cooldown bands:
  catch 110-170, miss 80-130, bite 150-210, screech-abort 30-45;
  FIRST_DIVE_AFTER 20 -> 45. hawkState() gains dives/catches/
  interest/patience counters. Verified by /tmp/shottools/hawktest.js
  (drives updateHawk manually - shot mode freezes her): 25 min of
  worst-case continuous exposure = 8 dives (all catches, player
  stationary), ambients airborne 90% of sampled time with fly +
  perch states and low passes seen, abort cd 34.6, bite cd 174.4,
  night parks all three hawks, zero console errors.
- v0.6.9 (Nov 17 2026): trees frontier. (1) Procedural canopies are
  no longer spheres: `canopyGeos` in trees.js are 4 SphereGeometry
  variants displaced by a position-only sine field (seam-safe), each
  blob picks a variant + random rotation via `canopyBlob()`, and
  low/interior blobs wear new `leafDarkMats` for a lit-shell /
  shadowed-core read. CRITICAL: canopyBlob runs on its own `vrnd()`
  stream - the shared rnd() stream deals tree positions/heights/
  canopy radii, and the first cut of this change shifted that stream
  and silently cost a canopy bridge (51 -> 50). With vrnd the seeded
  park is byte-identical: walktest 51 bridges / 554.4 m / 102/102.
  (2) Hero coverage 17 -> 39 trees: swapHeroTrees now takes deduped
  sets in priority order (Mall cap 16, Garden 10, Frog Pond grove 6,
  hand-placed groves 6, pathside <7.5 m from a path 10, spawn lawn
  4; the Hollow swap is separate). A hero clone is 2 primitives
  replacing a ~11-mesh procedural tree, so spawn-view draw calls
  FELL 712 -> 664 (lowq) while tris rose 112k -> 161k. Remaining
  procedural trees are the far scatter fill.
- v0.6.10 (Nov 17 2026): Washington statue rebuilt (landmarks.js
  buildWashington). The old horse was boxes with its legs sunk inside
  the pedestal (verified by a before-shot: a slab with bronze lumps).
  Now composed spheres (barrel/chest/rump), tapered neck + mane,
  skull + tapered muzzle + ear cones, two-segment legs (front-left
  raised, hoof off the stone), two-segment tail, saddle + blanket,
  rider with thighs / reins arm / coat / tricorn. Pedestal and
  solidBox unchanged. New `washington` shot pose (front three-
  quarter from (-125, 83.5)). Before/after shots verified, zero
  console errors.
- v0.6.13 (Nov 17 2026): ducklings polished + hero coverage
  widened. Ducklings (landmarks.js duck()): necks (mother taller),
  flattened scaled-cone bills, tail wedges, duckling headScale
  1.3; the file is now a gentle single-file arc (sin(i*0.55)*0.22,
  yaw -0.2cos(i*0.55)) instead of the old zigzag wander. Hero caps
  (trees.js swapHeroTrees): Mall 22, Garden 16, pond 8, groves 8,
  pathside 16, spawn 6 -> measured 55 of 123 elms are heroes,
  spawn-view draw calls 662 (down from 664 at 39 heroes), tris
  182k. New shot pose: ducklings. NOTE: the /tmp/shottools harness
  was wiped by a VM restart mid-round and rebuilt (copies now in
  ~/workspace/gamewell/harness/); the rebuilt walktest replicates
  player.js surfaceAt with the game's 1.6 landing tolerance and
  passes 102/102 / 554.4 m. Two bridges (Common SE pair + Garden
  pair) have steep ramps with ~0.75 m drops onto stepping boxes -
  fine under no-fall-damage, noted in case a future test tightens.
- v0.6.12 (Nov 17 2026): Brewer Fountain + Park St headhouse
  rebuilt (landmarks.js). Fountain: lathe pedestal + two lathe
  bowls (bronzeDS = DoubleSide bronze clone) with water discs,
  four composed seated figures (fountainFigure: plinth/seat/hips/
  torso/head/lap/shins/arm) at the diagonals r1.5 facing out,
  standing finial figure; basin + S.solids r5.1 unchanged.
  Headhouse: stone base, stair-mass block inside, glazed walls
  (headhouseGlass - transparent, emissive warm, pushed into
  S.cityMats so daycycle lights it at night), iron mullions +
  corner posts, arched gable = ShapeGeometry glass + holed
  ShapeGeometry iron frame (greenMetalDS), arched glass roof
  (cylinder segment r6.6, half-angle 0.558) + 3 torus ribs, canvas
  T roundel (roundelTex) on both street faces, smaller PARK ST
  sign kept; solidBox + stair hole unchanged. New shot poses:
  parkst, fountain, headhouse. Walktest 102/102, zero errors.
- v0.6.11 (Nov 17 2026): swan boats rebuilt (landmarks.js
  buildSwanBoats). Extruded plan-view hull (raked bow, rail cap,
  plank deck), 5 slatted bench rows, arched canvas canopy (open
  cylinder segment) on slim posts, and a composed mute swan at the
  stern: lathe-free sphere body/breast/folded wings/tail, ONE
  CatmullRom tube S-neck, head + black mask + knob + orange beak.
  The boats DRIFT: userData.drift ellipses on each lagoon lobe
  (west cx lagoon.x-22 rx8/rz4.5, 170 s; east cx lagoon.x+22 rx7/
  rz4, 190 s reversed) - daycycle's boat loop integrates drift +
  bob + roll and yaws to the tangent. Loops verified clear of the
  bridge deck box (x -134.7..-129.3) and inside the lagoon ellipse
  with hull margin; goose deck logic untouched (boats never touch
  platformBoxes). New `swanboats` shot pose (south shore, close on
  the west loop). Hollow gossip line updated (they no longer
  "sleep at the dock"). Walktest 102/102, zero console errors.
- v0.6.14-0.6.16 (Nov 17 2026): the street-edges round
  (`world/streetwalls.js`, groundHeight passed in - no import cycle).
  Everything instanced via the local `instanced()` helper
  (frustumCulled=false, instanceColor tones); new facade materials
  join S.cityMats so daycycle drives their dusk glow.
  v0.6.14 BEACON ST: 47 townhouse units (30 Common north front
  z=-110.5, 17 Garden north front z=-107) - 4 brownstoneFacade
  palettes, bow fronts (half-cylinder bays + separate dark/lit glass
  boxes), stoops, doors, iron area rails, stone cornices; bases ride
  groundHeight so the east end steps up the State House terrace.
  v0.6.15 CHARLES ST: shopfront row behind the Garden fence (fronts
  x=-63.8 facing the street; segments z -58..-26 and -8..22, gaps at
  the -70/-18/30 path crossings; solidBoxes registered), storefront-
  Facade textures with sign bands + near-always-lit shop glass,
  awnings, sidewalks, crosswalk zebras, 8 street lamps (emissive
  bulbs only - no PointLights), 13 parked cars (3 instanced meshes,
  solidBox each, curbs clear near crossings). v0.6.16 RING BLOCKS:
  the old ~38 unseeded individual boxes + caps in buildPerimeter
  were replaced by buildRingBlocks (seeded, instanced by material,
  45% setback tier 2 / tier 3, roof caps on the top tier, ~16%
  rooftop water towers; north row pushed to z=-138 so Beacon owns
  its edge) + buildSouthWestRows (Boylston front z=109, Arlington
  front x=-211; 13 m units, cornices). New shot poses: beacon,
  beaconwest, beaconclose, charles, charlesnorth, boylston,
  arlington. Perf (lowq spawn, herocount): calls 645 -> 656 and
  tris 181.5k -> 196.1k across the whole round - the streets cost
  ~15k tris total; walktest 102/102, zero console errors throughout.
  Two traps banked: (1) parapet/cornice heights must be computed
  from the SAME base as the bodies they cap (an absolute-H parapet
  floated 0.4 m over the Charles shops); (2) brownstone trim reads
  cream if the texture frames are fat - thin trim, muted bands.
  STILL generic, plainly: Tremont St east edge has ring blocks only
  (no streetwall row), and all facades are texture-on-box (no
  geometry window depth) - fine at park distance, not at the fence.
- v0.6.17-0.6.19 (Nov 17 2026): the east-edge round. v0.6.17
  TREMONT ST (`streetwalls.js buildTremontRow`): the Common's east
  fence finally has its street - asphalt + sidewalk slabs, zebras at
  the Park St / Frog Pond crossings, 8 sidewalk lamps (emissive
  only), 8 parked cars, and an 18-unit streetwall row across the
  street (fronts x=215.8, 11 m units, 15-24 m tall) wearing the new
  `tremontFacade` texture (storefront glass + sign band below, five
  office floors of stone-pier grid, dentil cornice), stone cornices,
  roof caps, tilted awnings; all instanced, facades join S.cityMats.
  Ring blocks' east row pushed 228 -> 237 to sit behind it. The
  row's north units ride the State House terrace (groundHeight
  plateau) and step down the hill like the real street. v0.6.18
  BEACON RELIEF: every flat-front brownstone window got a real stone
  lintel + sill (2 instanced meshes, positions derived from the
  brownstoneFacade grid; skipped where the bow front covers the
  window, parlor sill skipped beside the door). NO new R() calls in
  the relief pass - the seeded row layout is byte-stable. v0.6.19
  PARK STREET CHURCH (`landmarks.js buildParkStreetChurch`): brick
  nave + extruded gable (brick caps / slate slopes), tall framed
  windows, brick tower at the corner end with door + rose window,
  white belfry with arched openings, 13 m white spire, gold ball +
  vane (~30 m stack). Stands at the NE corner (219,-110) across
  Tremont, tower facing the corner; the in-game Park St headhouse
  stays with the Brewer Fountain cluster at the west end - the two
  never meet. New shot poses: tremont, tremontclose, parkchurch,
  parkspire, parkchurchfar. Perf (lowq spawn, herocount): round
  baseline 650 calls / 194.3k tris -> 695 / 211.5k (+45 calls,
  +17.3k tris for a streetscape + relief + a landmark). Walktest
  102/102, zero console errors throughout. Two warts banked:
  (1) the State House block floats over the terrace slope on its
  west edge - visible from below at the north fence, pre-existing,
  NOT fixed this round; (2) from the central Mall the church spire
  hides behind the State House + ring blocks - it reads from the
  NE corner and north edge, which matches the real sightlines.
  Harness note: /tmp/sl-tools (vendored three + playwright-core)
  was wiped by a service restart mid-round; rebuilt as symlinks
  into ~/workspace/nolimits-revival/harness/node_modules (three
  0.160.0 - the right version) and NODE_PATH pointed there.
- v0.6.20 (Nov 17 2026): State House foundation (landmarks.js
  buildStateHouse). The terrace plateau (groundHeight's tx falloff
  west of x=172) left the block floating up to 5.35 m at its SW
  corner - confirmed by a before-shot from the SW. Fix: per-10 m-band
  granite plinths, each sampled from groundHeight over its band and
  run from 0.7 m under the band's lowest ground up into the base
  trim (top y=1.0, 18 deep vs the trim's 19, so they read as a base
  course). Only the two west bands trigger. Footprint, position and
  solidBox unchanged; after-shot shows the west end seated into the
  slope. Walktest 102/102, zero errors.
- v0.6.21 (Nov 17 2026): fence-line relief extended from Beacon to
  Tremont + Charles (streetwalls.js). Tremont: lintel + sill on
  every tremontFacade office window - 360 + 360 instances, offsets
  from the texture grid (cols px 15+i*61 ww 38 -> z offs -4.04 /
  -1.42 / +1.20 / +3.82 on the -x face where u runs +z; rows wy
  46+i*57 wh 38 over the unit's own h). Charles: same treatment on
  the storefrontFacade upper windows - 36 + 36 (cols px 14+i*60
  ww 42 -> z offs +2.25 / +0.80 / -0.65 / -2.11 on the +x face where
  u runs -z; wy 26 wh 82 of 320 over H=7.8). NO R() calls in either
  relief pass - seeded layouts byte-stable, verified by exact
  instance counts + first-instance positions in-page, plus the
  tremontclose shot. Cost: +4 draw calls, +9.5k tris (spawn view
  685 -> 676 calls run-variance, 209.0k -> 218.5k tris). Storefront
  glass on both streets keeps awnings instead of relief, by design.
- Fenway conversion spike (Nov 17 2026, report-only, NO game
  change): the BPDA cluster converts cleanly - merged + banked as
  game-local OBJ/GLB at assets-library/bpda/fenway-spike/
  (1,795 v / 3,057 tris; numpy pipeline in the spike README).
  Richard's detailed Fenway SKPs do NOT convert in-sandbox: the
  geometry is model.dat (proprietary SketchUp binary), no reader
  exists here (assimp has no SKP, Blender needs the SDK bridge, the
  SDK is license-gated/absent), and no DAE twin of Fenway is in the
  haul. Unlock = a human SketchUp export (SKP -> DAE/OBJ), after
  which the same pipeline applies. The whole-city USDZ is both
  unreadable here (no pxr) and too coarse at Fenway. Full verdict:
  assets-library/bpda/fenway-spike/README.md. (Superseded the same
  day by v0.6.22 below: the Warehouse served its own GLB conversion
  of the detailed model - no human export needed after all.)
- v0.6.22 (Nov 17 2026): FENWAY PARK IS IN THE GAME
  (js/systems/fenway.js, new). The detailed route landed: Richard's
  Fenway SKP is the Garner / King / Thrall 3D Warehouse model, and
  the Warehouse entity page embeds a server-generated GLB (SimLab
  exporter) served publicly - fetched directly, no SketchUp, no
  account. Banked at assets-library/models/fenway-park-warehouse/
  FenwayPark.glb with attribution (3D Warehouse Terms of Use - free
  use with attribution, NOT a CC license; do not redistribute the
  raw file outside the game); game copy play/assets/models/
  fenway.glb (649 KB, 58 meshes / ~4.7k tris / 28 photo textures).
  Integration: FEN anchor (6000, 0, 6000), second sky dome sharing
  S.skyMat, grey apron. Reachable the way the design wants -
  burrow-side door on the market room's east wall (dark mouth +
  WESTBOUND / GREEN AT THE END OF IT signs, built from fenway.js
  so burrows.js is untouched), "E - take the long west run" ->
  emergence hole behind home plate (THE LONG RUN sign), "E - dive
  back to the burrows" returns to the market. Calibration: model
  units are yards -> uniform scale 0.9144; home at model (-54, 6)
  lands at Fenway-local (-35, 10). The player is clamped to the
  field polygon and grounded on a raycast height grid sampled off
  the loaded model; the field itself is painted as a canvas
  overlay (mow stripes on the home->centre axis, dirt warning
  track, skin infield, chalk foul lines) because the model's field
  is a draped photo. THE HARD LESSON: the model's Google Earth
  ground sheet is REMOVED at load - it is lumpy by a metre-plus,
  and at a 0.25 m eye height those lumps walled off the entire
  park (bisect-verified in-page: the sheet alone filled the sky
  from behind home plate). The architecture - bowl, Monster,
  towers, facades, scoreboard - is all real geometry and stays;
  the field is flat, like a ballfield. Honest gaps: the stands
  are scenery (field-clamped, no climbing the bowl); the tower
  lamp banks are unlit texture - no night lighting at Fenway yet;
  no caps, food or NPCs out there yet; no clouds/stars in the
  Fenway sky (the dome shares the park shader, the star/cloud
  layers still live over the Common); the streets around the
  park are the plain grey apron now (the photo slab went out
  with the sheet); the centre-field bleacher deck overhangs the
  deep-centre track - duck. Verified: shots fenway (midday +
  golden hour), fenwaywall (Monster face at its feet, scoreboard
  ads readable), fenwaymonster (centre field), the market door;
  walktest 102/102, heroes 55, zero console errors.
- v0.6.23 (Nov 17 2026): FENWAY AT NIGHT + THE MONSTER IS
  CLIMBABLE + streetwall glass (fenway.js, streetwalls.js,
  burrows.js, daycycle.js). Night: daycycle now publishes
  S.lampFactor; fenway's buildNightRig finds the GLB's
  Fenway_Lights materials (7 meshes) and burns them with
  emissiveMap = the lamp-bank texture (cells glow, housing
  stays dark - a bank, not a slab), plus a shared additive
  glow sprite per lamp head, 3 PointLights (two front towers
  + one behind home plate, intensity lamp*1100, decay 2) and
  3 additive radial light-pool planes on the field. Fenway
  sky: its own 380-star Points sharing S.starMat + 7 cloud
  sprites sharing S.cloudMat, drifted locally in updateFenway
  (NOT in S.clouds - the daycycle wrap would teleport them
  12 km). Monster climb: fenGround() layers a STRIP zone (the
  wall face read as a scramble: smoothstep ramp 0 -> 7.3 over
  the 4 m in front of the face plane, face z=-53.3) and a TOP
  zone (the ledge, y lerping 7.3 -> 8.9 toward the seat backs
  at z=-57.6) over the height grid; the clamp now accepts all
  three zones and settles toward the nearest zone centroid,
  so the back edge holds the ledge instead of ejecting. The
  rest of the bowl is still scenery and still clamped out.
  One-time toast on first reaching the top. Verified by
  harness/fenclimb3.js: 7/7 route steps (field, ramp foot,
  mid-face, lip, ledge, back, past-the-edge) settle at the
  designed heights; a keyboard-driven walk test is NOT the
  proof (SwiftShader runs ~0.1x game time - the step test is).
  Life: burrows.js exports spawnCapAt (surface-realm caps);
  Fenway gets 4 (right-field corner, Monster base, deep
  centre, and a trophy cap ON the Monster top) + spilled
  pretzels/peanuts via food.js spawnFood. Streetwall glass:
  the painted panes on Beacon/Tremont/Charles are now covered
  by real recessed panes inside the lintel relief (thin
  instanced boxes, glossy dark + a deterministic ~20% warm
  lit variant registered in S.cityMats so they glow at night;
  pane offsets reuse the relief loops, NO new R() calls -
  seeded layouts byte-stable). Cost: +6 draw calls, +9.2k
  tris. New shot poses: fenwaytop, charlesclose. Verified:
  fenway golden + night (plate view), fenwaytop day (paws on
  the ledge, trophy cap auto-collected) + night (the money
  shot: lit yard from the top), fenwaywall night, beaconclose
  day + night, tremontclose, charlesclose (the owed pose),
  spawn regression; walktest 102/102, heroes 55, zero console
  errors. Gaps that remain: only the Monster route climbs -
  the rest of the bowl is scenery; Fenway's streets are still
  the grey apron; glass panes sit over the painted texture
  (texture-first behind them), and Beacon's curved bay
  turrets keep their painted windows (flat panes cannot
  follow the curve).
- v0.6.24 (Nov 17 2026): TD GARDEN - integrated in code,
  ASSET HELD on licensing (js/systems/garden.js, new; food.js
  gains 'popcorn'). The second burrow destination: a door on
  the rat market's WEST wall (NORTHBOUND / THE OTHER GARDEN -
  the stall owns the north wall, Fenway owns the east), "E -
  take the north run" -> emergence through the parquet just
  east of the centre-court logo; GDN anchor (-6000, 0, 6000).
  The building is the celtics+arena INTERIOR from Richard's
  haul (parquet, bowl, jumbotron), converted in-sandbox from
  its DAE twin by the banked numpy converter
  (assets-library/models/td-garden-interior/convert_dae_to_glb.py):
  159,329 tris rendered (134,161 unique declared; component
  instancing makes up the rest), 83 materials, 38 textures,
  6.99 MB. Calibration: the DAE (inches, Z-up) measures ~2x
  the real arena, so in game at uniform 0.5, placement puts
  the parquet centre on the GDN origin, floor y=0; the court
  runs local x -15.1..15.1, the jumbotron screens hang at
  y 9.8..14.7 over centre court. LICENSING (the point of the
  round): the haul recorded NO author/license for this file,
  so the GLB is banked in the asset library ONLY - it is NOT
  in play/assets/models/ and was NOT pushed. garden.js gates
  the load behind a RELEASED flag (false) so the live site
  never even requests it (an un-gated load 404s on every boot
  and logs a console resource error for every player - the
  bar is a clean console); the harness sets
  window.__scurryGardenAsset and route-fulfills the GLB from
  the library for local proof. Release = Richard's licensing
  call, then flip RELEASED + drop the file in; no other code
  change. Ground: Fenway's Raycaster grid does not scale to
  159k tris, so sampleHeights buckets the model's triangles
  on a 4 m XZ grid and answers columns with 2D barycentric
  tests; highest surface under a 19 m cap wins (top rows
  ~17.5 m, roof ~26 m), the hanging jumbotron rig (RIG_MATS,
  surveyed material names) excluded so centre court samples
  the parquet. Clamp = 24-gon ellipse inside the bowl
  footprint. Court + lower bowl are traversable (the bowl
  pose settles at 5.22 m on a tier). Lighting is arena
  lighting: 5 constant PointLights + emissive Jumbotron/logo
  screens - the 23:01 shot is as lit as the 11:01 one,
  independent of the day cycle. Life: 5 caps (trophy on the
  centre-court logo, one under each basket, two in the bowl)
  + popcorn x2 / peanut via spawnFood. New shot poses:
  tdgarden, tdgardenbowl, tdgardenjumbo ('garden' was
  already the Public Garden pose - the first cut collided
  and silently posed in the park; check new pose names
  against the switch). Verified LOCALLY with the asset
  route-fulfilled: court (player y 0.00 on the parquet),
  bowl (settles 5.22 m), jumbo (TD GARDEN signage + Celtics
  screens legible overhead), night court, the market door;
  without the asset: clean console, the zone is apron + hole
  + lights and works. Walktest 102/102, zero console errors
  everywhere. Gaps, plainly: the live Garden has no building
  until the license clears (by design); the model's own
  palette runs pale/warm under SwiftShader (lowq, no PMREM -
  wants a real-GPU eyeball like everything else); one
  jumbotron face's texture reads mirrored (the source
  model's own back-face painting, not the converter); the
  scorer's-table strip samples as a ~2.2 m walkable ledge -
  a feature, probably.
- Roadmap (owner's direction): City Hall as the next
  teleport-reached expansion map (Fenway shipped in v0.6.22;
  Sketchfab models are WANTED in the ledger - account-gated,
  need a human grab).
- **Multiplayer is roadmap-only - no netcode yet.** Design note: a
  WebSocket relay on a Cloudflare Worker + Durable Object fits the
  existing stack; sync transforms + anim state at 10-15 Hz with
  interpolation, no physics sync; the Hollow is the social hub; keep it
  friendly-only (no PvP - bite stays a boop). Build the single-player
  world to reference level first.
