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
- v0.6.25 (Nov 17 2026): FENWAY GETS ITS NEIGHBORHOOD
  (js/systems/fenwayhood.js, new; fenway.js apron + two debug
  poses; main.js wiring). Fenway sat on a plain grey apron -
  outside the walls was void. Now: 174 BPDA massing buildings
  (City of Boston open data, tile BOS_F_5, PDDL - clean to
  ship), converted from the city's OBJ models with surveyed
  footprints + heights, banked as
  assets/models/fenway-neighborhood.glb (2.73 MB, 38,297 tris:
  hood-walls with box-projected facade UVs + per-building
  vertex tints, hood-roofs plain). Transform: home plate =
  the park shell's catalog centroid + (-90.1, +164.9) ft in
  the OBJ frame, rotate -7.2 deg, seat at (Z_ft - Gnd_El_Ft);
  validated against the tile catalog and a raster fit to the
  Warehouse park model. 341 extracted -> 174 kept, every drop
  logged (version dupes, >20% overlap with the park model,
  >55% street-ribbon overlap, all Approved Demo status,
  sub-3 m fragments, centroids >460 m). Converter + method:
  assets-library/models/fenway-neighborhood-bpda/. Streets in
  the park's street treatment: Lansdowne St along the
  Monster, Brookline Ave, Boylston St - asphalt, raised
  walks, zebras, 21 iron lamps, 16 parked cars, NO collision
  (backdrop; the clamp keeps the player off them). Jersey St
  gets NO ribbon: the Warehouse model's own photo slabs fill
  that corridor and a ribbon would bury/poke through them.
  THE CITGO SIGN: hand-built (code geometry + canvas
  trimark/wordmark - the haul's CITGO SKP is terms-unknown
  and stays out) standing on its BPDA host shell
  (BOS-J3ZCV-XBDQO-P85WZ - the city catalog literally names
  it "CITGO Sign"): panel 18.3 x 18.3 m at local
  (116.6, -278.5), top at the shell's surveyed 27.4 m,
  facing home plate. Sightlines raycast twice (converted
  geometry pre-build, live scene post-build): CLEAR from
  the Monster top's back rim (z -57.2) and the grandstand
  line; blocked from field level by the park's own wall -
  also true of the real sign; from the ledge's middle the
  wall's own cap sits at a squirrel's eye height and hides
  it, so the fenwaycitgo pose stands on the rim. Two
  blockers removed with cause: 595-603 Newbury St (status
  Approved Demo - demolition-approved, not standing
  streetscape) and 498-528 Commonwealth Ave (a History
  model claiming 31.4 m over a 4-5 storey streetscape).
  Night discipline: the walls material + lamp bulbs ride
  S.cityMats (deterministic ~18% lit windows, warm); the
  sign burns off S.lampFactor and its material is fog:false
  - the scene's night fog far is 230 m (a Common-scale mood
  grade) and would swallow the 257 m sightline whole; a
  floodlit landmark punching through haze is the honest
  read, and the unlit massing keeps the fog. CLAMP
  DECISION: the field clamp STAYS - the neighborhood is
  backdrop, deliberately. No honest gate exists (the
  grandstand + Jersey slabs wall the south, the Monster
  walls the north) and a teleport hop would break the
  burrow fiction worse than the fence does; the Monster
  climb and the burrow door flow are untouched. Apron
  enlarged 760x560 -> 1150x1000 (offset z +27) to carry
  buildings spanning x -542..381, z -434..488; the hood's
  instanced streets carry real bounding spheres so they
  cull out of Common-side frames. New shot poses:
  fenwaycitgo, fenwayhood (aerial at (150, 30, -150) over
  the Pike corridor; fenway.js parks the clamp for it via
  debugFree && S.debugShot only - gameplay never sees it).
  Verified: walktest 102/102, zero console errors on every
  shot; citgo day (trimark reads over the Kenmore
  rooftops), citgo night (sign lit, windows warm), hood
  aerial, fenwaytop day + fenway plate (interior
  unregressed - rooftops now show over the outfield walls),
  spawn. Gaps, plainly: the shells are flat-shaded LOD -
  right at backdrop distance, soft up close, and nobody
  can get close; the Warehouse park model is
  anisotropically distorted (the Monster reads ~0.65x real
  height) while the BPDA city is true-scale, so cross-wall
  sightlines are approximate by a few metres; registration
  is +/-10 m at 300 m, so a few fitted buildings sit a
  street-width off their real frontage; the sign's letters
  are sub-pixel at game distance - the trimark carries it,
  same as the real sign at 300 m.
- v0.6.26 (Nov 17 2026): TD GARDEN RELEASED (garden.js
  RELEASED flag; assets/models/garden.glb, new in repo).
  The v0.6.24 licensing hold is lifted on the project
  owner's explicit decision (Nov 17 2026): RELEASED flipped
  false -> true, the banked TDGarden.glb (6,988,596 bytes)
  copied to play/assets/models/garden.glb and pushed, the
  ATTRIBUTION.md row and garden.js header rewritten to
  released status (terms remain unrecorded - the release is
  the owner's call, documented like the 3D Warehouse Fenway
  row). Nothing else changed: the gate's design meant the
  flip + the file drop is the whole release. The harness
  window-flag path still exists but is no longer needed -
  the local build now loads the real file exactly as
  production does. Verified: tdgarden / tdgardenbowl /
  tdgardenjumbo poses against the live production site
  with the real model (court, bowl, jumbotron), the live
  GLB URL serving 200 at the banked byte size, walktest
  102/102, zero console errors.
- v0.6.27 (Nov 17 2026): THE PRIORITY PASS - the home park
  first, per the owner's explicit direction (the Common +
  Garden's perfection outranks every destination).
  (1) HERO TREES TO FULL COVERAGE: swapHeroTrees gained a
  final everyone-else pass - heroes 55 -> 121 of 123 tree
  records. Every elmVisuals elm is now a hero GLB at its
  seeded position/scale; the existing 55 priority picks
  keep their exact models. The two non-heroes are
  deliberate: the Mall waypoint elm (hand-tuned crown, its
  blobs are placed against the bridge admission numbers)
  and the Charles St snag (bare by design). Spawn view
  (lowq): draw calls 724 -> 546 (-25%, a hero is 2 meshes
  vs ~11 procedural), triangles 233,906 -> 329,512 (+41% -
  real canopy geometry; the perf ladder still guards weak
  devices, and the owner's real-device check remains the
  gate for anything further). Garden view 602 calls /
  283k tris; statehouse view 308 / 192k.
  (2) LANDMARK DETAIL: monument corner figures rebuilt as
  composed statues (monumentFigure: robe/hips/torso/head/
  two arms, facing their corners; same plinths, same
  solids); the summit figure gained arms + a shoulder
  drape; Brewer Fountain runs water - translucent fall
  shells tier to tier with foam rings + a granite basin
  lip (static shells, env sheen animates them; no finial
  drip - the finial stands IN the upper bowl); bandstand
  gained a 64-block dentil course under the entablature;
  lagoon bridge gained granite end posts with ball caps;
  State House facade texture now draws THREE window rows
  (was two stretched over 13 m) and a 4-tread granite
  front stair (each tread a platformBox - climbable to
  the arcade face). State House WINGS were assessed and
  NOT built: the block's east end already reaches x=214
  and the Tremont row stands at 215.8 - there is no map
  room; noted here so nobody re-litigates it.
  (3) GROUND FIDELITY: every wet path ribbon got a wider,
  darker packed-earth shoulder under it (+0.022 vs +0.04);
  the Mall got a true promenade - a 9.4 m apron ribbon
  over its standard ribbon with a 10.8 m shoulder (heights
  stack 0 / 0.03 / 0.04 / 0.058, no shared planes); plaza
  discs got shoulder rings; lagoon + Frog Pond ringed
  with low granite curb blocks (265 instances, one
  InstancedMesh, per-block groundHeight seating, ~0.14 m
  proud, visual only); grass tufts 5200 -> 6800 (tufts
  are the last rnd() consumers in trees.js, so the new
  1600 append - no existing tuft moved). New shot poses:
  promenade (on the Mall looking east), pondedge (Frog
  Pond SW shore). Bench/lamp consistency was audited, not
  changed: all 22 benches are the Quaternius swap, all
  park lamps the Post Lantern swap - already uniform.
  Verified: node --check all JS, herocount (123 trees,
  121 heroes, 51 bridges, 554.4 m canopy), walktest
  102/102, 11 after-shots vs 6 before-shots (spawn,
  garden, statehouse, fountain, monument, bridge,
  promenade, pondedge, canopy, down), zero console errors
  everywhere. STILL ABSTRACT / KNOWN GAPS after this
  round: the fountain falls are static translucent shells
  (no animated water shader); wading puts the camera
  under the single-sided water plane, so the lagoon bed
  reads dry from inside (pre-existing; a water-volume
  pass is its own round); bronze in shadowless lowq reads
  near-black (production env light carries it); the black
  spiky tuft silhouettes at distance in lowq shots are a
  pre-existing SwiftShader artifact, present identically
  in v0.6.26 before-shots; State House wings impossible
  (above); swan boats + Park St headhouse remain the
  composed-procedural versions from v0.6.10.
- v0.6.28 (Nov 17 2026): THE HOLDOUTS + WATER PASS.
  (1) SWAN BOATS (landmarks.js buildSwanBoats): the swan's
  wings are carried RAISED and arched now (the mute-swan
  display pose the real figure copies - swept up off the
  back, not folded flat), the canopy grew its scalloped
  valance (one canvas-alpha texture, both long edges), and
  the fleet gained a third boat MOORED at a new dock on
  the lagoon's south shore west of the bridge (plank deck
  on posts, bollards, SWAN BOATS board; a drift with zero
  radii + a fixed yaw - daycycle honours d.yaw instead of
  deriving heading from velocity, and the bob/roll still
  apply). The dock deck is a platformBox (y 0.45) -
  standable; surfaceAt's step tolerance keeps waders from
  snapping up through it. Hull/dock clearances checked
  against both drift loops and the bridge deck box.
  (2) PARK ST HEADHOUSE (buildParkStStation): the dark
  stair-mass inside the glass is now a real stairwell -
  landing, 4 granite treads, sloped iron handrails, and a
  warm ceiling light bar that joins S.cityMats (burns
  after dark). The open stair beside it was a flat black
  slab; now granite cheek curbs, 4 treads descending into
  the pit, and an iron railing on the open sides.
  (3) WATER: Brewer Fountain falls are ANIMATED - one
  canvas streak texture (fountainFlowTex, seeded LCG) on
  the existing fall shells, scrolled by daycycle
  (offset.y = (now*0.85)%1; on the fall cylinders uv.y
  runs 0 at the bottom to 1 at the rim, so a growing
  offset walks every streak DOWN). One material, offset
  only, zero geometry churn; foam rings stay static.
  Proven by harness/flowtest.js (offset reads 2.2 s
  apart + a differing screenshot pair). WADING FIXED:
  waterMat is DoubleSide (world.js), so the surface has
  an underside, and daycycle eases a submerge factor
  (eye under the lagoon/Frog Pond plane, ellipse test
  against MAP) that pulls the fog in to 1.2/30 tealed
  0x14424e and fades a flat tint div (z 2, under the
  HUD) to 0.3 - applied AFTER the keyframe fog lerp so
  it wins submerged and vanishes dry. The `wade` shot
  pose (in the lagoon at bed level, under the bridge)
  went from dry-bed-and-blue-sky to full murk.
  (4) GOLDEN HOUR: the 17.6 / 18.7 keys' amb lifted
  1.12 -> 1.24 / 1.02 -> 1.10 (the v0.3 philosophy -
  ground readable at squirrel height); before/after
  spawn + garden shots at 17.5 show a modest mid-ground
  lift, nothing blown. Long shadows remain unverifiable
  headlessly (lowq is shadowless, no PMREM) - the
  production golden grade still wants the owner's
  real-GPU eyeball, same caveat as v0.6.1.
  Perf (lowq spawn): 546 -> ~565-570 calls (run variance
  +-6; the increase is the headhouse stairwell + railing
  in the spawn frustum), 329.5k -> ~331k tris. The
  v0.6.27 win stands (724 before the priority pass).
  Verified: node --check all JS, walktest 102/102
  (re-run after the dock platformBox landed), herocount
  121 heroes / 51 bridges / 554.4 m, flowtest, 10
  after-shots vs 8 before-shots (swanboats, swanclose
  [new pose: ON the dock], headhouse, fountain x2,
  wade, spawn, down, spawn + garden at golden hour),
  zero console errors everywhere.
  STILL ABSTRACT / KNOWN GAPS - the honest final census
  of the home map: NOTHING on the Common + Garden is
  placeholder-grade anymore. What remains stylized,
  plainly: the swan boats + headhouse are composed-
  procedural (no licensed GLB exists for either - they
  are built, not sourced); the ducklings are stylized
  bronze (they are statues of book characters - that IS
  the reference); 2 of 123 trees stay procedural on
  purpose (the hand-tuned Mall waypoint elm, the bare
  Charles St snag); ring-block + skyline facades are
  texture-on-box (right at park distance, flat at the
  fence); bronze reads near-black in shadowless lowq
  (production env light carries it); the fountain's
  foam rings are static (only the falls move); the
  submerged read is murk + underside, not refraction
  or caustics; State House wings still don't fit the
  map (v0.6.27). Everything else is the owner's
  real-device pass: mobile perf at 121 hero trees,
  the golden-hour grade on a real GPU.
- v0.6.29 (Nov 17 2026): CITY HALL PLAZA - THE EAST
  DESTINATION (js/systems/cityhall.js, new). The rat
  market's SOUTH wall gets the third door (the stall owns
  the north wall, Fenway the east, TD Garden the west):
  dark mouth + EASTBOUND / CITY HALL signs at TUN.x+45,
  TUN.z+5.96, built from cityhall.js so burrows.js is
  untouched. "E - take the east run" -> emergence through
  a planter bed just south of the ceremonial steps; the
  same mouth returns ("E - dive back to the burrows").
  Anchor CH = (6000, 0, 3000), due east - NOT (6000, 0,
  -6000): groundHeight()'s State House terrace term
  (8.0 * smooth01((x-146)/26) * smooth01((-z-50)/22))
  extends infinitely over the x>172, z<-72 quadrant, so
  a -6000 plaza stands on an 8 m phantom plateau (found
  the hard way: the player "grounded" at y=8 over the
  plaza). At z +3000 the heightfield answers a clean
  flat 0. Future far anchors: keep z > -72 or x < 172.
  The building is the BANKED BPDA shell (BOS-6JW0O-0UKVU,
  tile BOS_H_4, PDDL - City of Boston open data;
  ATTRIBUTION.md row added): 338 tris, already in
  game-local metres (90 x 128 m footprint, 55.9 m tall),
  rotated 90 deg (long axis east-west), seated on a code
  podium (156 x 102 m, top y 1.5) with the facade 13 m
  back from the podium edge, re-skinned warm concrete
  (source material is untextured grey). The shell's
  measured shape (raycast grid, harness/chprobe4.js):
  a stepped wedding-cake massing - low wing edge at the
  southern extreme, the tall face ~8 m behind it
  stepping 24 m -> 43.5 m, the 55.86 m crown mid-roof.
  It ships UNDRESSED on purpose: three fin attempts
  (flat, vertex-sampled, raycast) all fought the
  envelope, and the profile is already the building's
  signature - what reads flat in lowq stills is the
  single material, which production light carries.
  The plaza composition around it is the dressing. The haul's
  detailed City Hall SKP/DAE files are terms-unknown:
  REFERENCE ONLY, never shipped - CITGO discipline.
  The plaza is all code: brick slab (seeded canvas
  brick texture) x -95..95, z -2..97; full-width
  ceremonial steps (analytic bands 1.0 / 0.5); terraced
  fountain at (28, 45) - rim 0.5, wading water 0.12,
  small pulsing jet; Government Center headhouse (glass
  box, T roundel, stair pit) at (62, 10); planters,
  benches, six lamps (two real PointLights on
  S.lampFactor); 20 backdrop streetwall shells wearing
  a window-grid canvas (day map + sparse lit emissiveMap,
  in S.cityMats) ringing the plaza a street away -
  backdrop only, Fenway-hood rules. Ground is analytic
  (cityGround()); containment is a polygon clamp (plaza
  rect + podium terrace strip to z -12.4; the facade
  line is scenery - the building is not a floor). Caps
  40-44 ride the GLB-load callback like Fenway's (the
  trophy cap sits on the podium terrace at the facade's
  feet), plus a pretzel by the headhouse and two
  peanuts. Plaza life is deliberately still: no dogs,
  no ranger, no geese - an empty plaza is the fiction,
  and the systems do not extend out here cheaply.
  Debug poses: cityhall, cityhallplaza, cityhallfacade,
  cityhallreturn, cityhalldoor. Proof harness:
  harness/chtravel.js - FRAME-based waits (SwiftShader
  runs ~0.5-1 fps at these views; wall-clock sleeps
  prove NOTHING, a 900 ms sleep can contain zero
  frames), firing the REAL interactables both ways,
  stepping the analytic ground table, and teleporting
  outside the clamp to watch it pull back.
  Verified: chtravel PASS (both directions through the
  REAL interactables, all 7 analytic ground steps exact,
  clamp recovery to (94.7, 49.9)), walktest 102/102
  local + live, node --check all JS, zero console
  errors everywhere. Perf: spawn view 565 calls /
  335,108 tris - calls identical to v0.6.28 (the
  destination is frustum-culled 8.5 km away; the tri
  delta is animated-scene variance); the plaza's own
  wide view is 168 calls / 52,972 tris. Evidence:
  v0.6-shots/cityhall-{before,after}/ (market south
  wall before/after, emergence, plaza wide, facade
  elevation, return door).
- v0.6.30 (Nov 17 2026): THE ESPLANADE + HATCH SHELL -
  THE NORTH DESTINATION (js/systems/esplanade.js, new).
  The rat market's NORTH wall gets the fourth door:
  dark mouth + RIVERBOUND / THE ESPLANADE signs at
  TUN.x+40.2, TUN.z-5.96, on the wall's west stretch
  (the Exchange stall owns x ~43.3..46.7, the lounge
  crate sits at 48.6 - both east of the mouth), built
  from esplanade.js so burrows.js is untouched.
  "E - take the river run" -> emergence in a mulched
  tree bed on the Esplanade; the same bed's mouth
  returns ("E - dive back to the burrows"). Neighbour
  note: the TD Garden door interactable sits at
  (TUN.x+39.7, TUN.z+3.8) r 2.3 despite its "west wall"
  comment - 8.2 m south of this door, radii never
  overlap, but a debug pose standing between them shows
  the Garden prompt; the esplanadedoor pose stands at
  TUN.z-2.4 for that reason.
  Anchor ESP = (-3000, 0, -6000), due north-west and
  CLEAR of the phantom: probed before committing
  (harness/espprobe.js, groundHeight grid +/-320 m at
  16 m steps, 1681 points - ALL zero at ESP). The
  (0,0,-6000) due-north anchor is CONTAMINATED (451
  nonzero, max 8: its east columns catch the same
  State House terrace term as City Hall's - the term
  reaches any x > 172 at z < -72, clear out to
  (6000,-6000), which reads a uniform 8). Rule stands:
  far anchors keep x < 172 or z > -72; ESP's x -3000
  is west of the term's reach entirely.
  The zone is an EMBANKMENT, and the height discipline
  is the round's load-bearing choice: land at LAND_Y
  1.05, granite pad top 1.17, riverbed at BED_Y 0,
  water plane 0.5. The bed MUST be 0 - player.js's
  surfaceAt() starts from groundHeight(), which answers
  0 out here, so any floor below 0 is unwalkable (the
  player falls through it to 0 and the destination's
  raise-to-ground then fights physics). Ground is
  analytic (espGround(): pad / lawn / slope smoothstep
  z -44..-41 / bed); containment is a polygon clamp
  (x +/-185, z -56..100 - the buoy line is the north
  edge, so deep water is a wade, never a swim).
  The river runs on the park's own water: the plane
  wears S.waterMat, and the zone registers its ellipse
  in S.waterBodiesExtra, which daycycle's submerge loop
  now concatenates with WATER_BODIES - duck under
  wading out and the v0.6.28 murk (fog 1.2/30, tint
  #0d3742 at 0.3) engages on the Charles exactly as in
  the lagoon. Honest limit: player.js's inWater()
  slowdown knows only the lagoon/Frog Pond ellipses,
  so wading here does not slow the squirrel - the read
  is visual only. Two stepping stones (platformBoxes)
  climb out of the shallows: A top 0.48, B top 0.98.
  The shell is the BANKED BPDA massing GLB
  (BOS-E8BPX-5IKAI-U40PV, tile BOS_H_4, PDDL;
  ATTRIBUTION.md row added): 21,166 bytes, 305 tris,
  game-local metres (x +/-16.9, y 0..20.0, z +/-12.55),
  seated on the granite pad at (0, 26), re-skinned warm
  stone. Orientation was MEASURED, not eyeballed
  (numpy raycast + z-slice profile over the raw GLB):
  the tall arch face is the model's +z side, the dome
  terraces down toward -z - so rotation.y = PI puts
  the face to the river and the dome to Storrow,
  confirmed in controlled yaw shots
  (v0.6-shots/esplanade-after/shell-face-from-oval.png).
  It is a CLOSED massing solid - no hollow conch, no
  stage, no interior; it ships as scenery with a
  solidBox footprint, City Hall discipline.
  Composition, all code: seeded lawn + audience oval,
  gravel path (z -38..-32.5) with a spur to the stone
  entry at x 21, riprap slope (150 instanced rocks),
  instanced granite curb with two gaps, buoy line
  every 30 m at z -56, 11 composed climbable elms in
  the park register (registered in S.trees/platforms/
  solids AFTER buildCanopy ran, so no bridges form and
  the park walktest is untouched), 6 slatted benches,
  8 path lamps (2 real PointLights on S.lampFactor),
  own sky dome + lazy stars/clouds (cityhall pattern).
  Backdrops, labelled as such: Back Bay streetwall row
  + Storrow ribbon to the south, Cambridge skyline
  shells across the river (z -206..-242, two tall
  towers) - flat backdrop only, Fenway-hood rules.
  Caps 50-54 ride the GLB-load callback like City
  Hall's: 50 is the TROPHY, on stepping stone B (the
  reach beat is the two-stone climb out of the
  shallows); 51 on the (48,-28) path elm's canopy
  platform; 52 on the pad; 53 at the west path end;
  54 by the return hole. Food: pretzel + peanut on the
  path, popcorn by the oval - with a catch worth
  remembering: food.js re-pins every ground food to
  groundHeight()+0.05 each frame, which on a 1.05 m
  embankment whose heightfield answers 0 would bury
  the food inside the land box. The zone's items are
  re-pinned to LAND_Y by an interactable tick
  (updateFood runs ticks after its re-pin - canopy.js's
  hook, same trick). Zone life is deliberately still:
  no dogs, no ranger, no geese, no crows - the systems
  do not extend out here cheaply, and a quiet river
  lawn is the fiction. Debug poses: esplanade,
  esplanadeshell, esplanaderiver, esplanadewade,
  esplanadecanopy, esplanadedoor. Proof harnesses:
  harness/esptravel.js (real interactables both ways,
  9 ground steps incl. both stones + a canopy platform,
  clamp recovery from deep water and far west, food at
  embankment height) + harness/espwade.js (the murk
  probe - esptravel's first tint check searched
  style.background for a hex string the browser
  serializes as rgb(13, 55, 66); the fog numbers had
  already proven the engagement). Verified: esptravel
  + espwade PASS (25 checks), walktest 102/102 local,
  node --check all JS, zero console errors everywhere.
  Perf: spawn view 553 calls / 331,404 tris - calls
  AND tris identical to the pre-round baseline (the
  destination is frustum-culled 6.7 km away; S.trees
  123 -> 134 is registry only). Live-byte gate run
  against the pushed build (commit 09af3865): version
  meta polled to 0.6.30, hatchshell.glb serves 200 at
  exactly 21,166 bytes, espwalktestlive 102/102,
  esplivetravel round trip through the REAL door both
  ways on production bytes + live shots in
  esplanade-after-live/. One sampling note:
  esplivetravel's emergence check read grounded=false
  on its single sampled frame while y sat at exactly
  1.05 - espgroundlive.js shows the designed spawn
  drop (spawn +0.4, monotone fall 1.411 -> 1.05, no
  oscillation, grounded through the settled tail);
  the local esptravel reads grounded=true outright.
  Evidence:
  v0.6-shots/esplanade-{before,after}/ (market north
  wall before/after, emergence, shell wide, shell face,
  river, wade murk, canopy, door) +
  esplanade-after-live/ after the push.
- v0.6.31 - THE HOME MAP PERFECTION PASS (owner-directed
  convergence round: the Common + Garden are the main focus;
  no destination work). Worked the v0.6.28 closing census in
  order. (1) FENCE-LINE FACADE DEPTH COMPLETE. The cityFacade
  relief program (Beacon v0.6.18, Tremont/Charles v0.6.21,
  Fenway panes v0.6.23) now covers every face wearing the
  generic facade: cityRelief() in streetwalls.js derives
  instanced panes from the texture's own 7x16 grid (NO rng -
  the seeded layouts are byte-stable). Ring blocks: recessed
  panes on the park face of all 38 main tiers (4,256 panes -
  dark glass + a deterministic ~20% lit set registered in
  S.cityMats); setback tiers keep the paint (they step back
  and up, out of the fence read) and the roofs already had
  caps/tanks. Boylston + Arlington rows - the closest
  unreleved faces in the game, 8-9 m off the fences: full
  treatment, stone frame (23x25px cell, ~0.13 m trim at
  Beacon's weight) + recessed pane on all 5,040 windows.
  Skyline towers ASSESSED, NOT CHURNED, with reasons: the
  Hancock slab is a flush glass curtain wall by design (the
  real building's panes ARE flush; geometric panes add no
  read at 55 m+ behind two rows); the setback stack's park
  faces are occluded below ~46 m by the ring NW blocks and
  read at 60-110 m slant; the Pru shaft is occluded below
  its crown (crown band + antenna + beacon already
  geometry); the clock tower's lower tiers sit behind the
  ring south row and its read (clock band + pyramid cap)
  is already geometry. Proof: harness/perfprobe.js asserts
  the exact instance multiset (ring 3404 dark / 852 lit,
  SW 4032 dark / 1008 lit / 5040 frames); the boylston-night
  shot shows the lit grid in register with the facades.
  (2) FOAM + WATER LIFE. The Brewer foam rings breathe:
  landmarks registers S.fountainFoamMat and daycycle pulses
  its opacity 0.33-0.48 on two incommensurate sines - churn,
  not a blink (perfprobe samples it moving, in band). The
  pond surface gets value-only life: S.waterMat roughness
  breathes 0.13 +- 0.018 on a ~9 s beat, so the sky
  reflection's lobe widens and tightens - a live surface
  instead of a fixed mirror. Deliberately NOT a texture
  scroll: the water discs' UVs are radial (an offset would
  swirl like a drain) and the shared material rides into
  every destination's water too. (3) SWAN BOATS +
  HEADHOUSE. Boats: the canopy wears a drawn canvas
  texture (sewn-panel seams running fore-aft + grain)
  instead of the flat slab; a dark waterline band (a
  squashed hull copy - the rail-cap trick at the bottom)
  grounds each hull at the water; benches + stern deck
  wear the plank texture instead of flat colour; the
  moored boat's dock gains a coiled mooring line + a
  crate. Headhouse ASSESSED, NOT CHURNED: the v0.6.12
  glass/iron build + v0.6.28 stairwell (landing, treads,
  handrails, warm light bar, lit via S.cityMats) already
  carry everything visible through 0.38-opacity glass at
  0.25 m eye height, and the pit floors are black BY
  DESIGN (depth illusion) - nothing honest was left to
  add without inventing an interior nobody can see.
  (4) CLOSING CENSUS, refreshed. DONE on the home map:
  hero trees 121/123; every park-facing facade now has
  geometric relief (Beacon, Tremont, Charles, Ring,
  Boylston, Arlington); animated fountain falls + breathing
  foam; breathing water; wading murk on all four water
  bodies; golden-hour grade keys. STILL STYLISED, plainly:
  swan boats + Park St headhouse remain composed-procedural
  (no licensed GLB exists for either - settled, do not
  re-litigate); the skyline towers stay textured backdrop
  above/behind the relieved rows; the Mall waypoint elm +
  Charles St snag are procedural BY DESIGN; the ducklings
  are stylised bronze (they ARE statues of book
  characters); State House wings unbuilt (no map room -
  v0.6.27, settled). STILL THE OWNER'S CALLS (cannot be
  closed headlessly): real-device mobile perf at 121 hero
  trees; the golden-hour grade + long shadows on a real
  GPU; bronze near-black in shadowless lowq; submerged
  refraction/caustics (the murk is the read). With this
  the home map stands TEST-READY - the grind stops here
  per the owner's convergence direction, pending his
  playtest. Perf: spawn 552 calls / 358,224 tris (before
  559 / 333,256 - calls flat, tris +7.5% for 14,336
  instanced relief planes). Walktest 102/102 local + live,
  zero console errors. Before/after:
  v0.6-shots/perfection-{before,after}/ (boylston day +
  night, arlington, swanclose, swanboats, fountain;
  headhouse before only - assessed, untouched).
- Roadmap (owner's direction): City Hall shipped as the
  east teleport-reached expansion map in v0.6.29, the
  Esplanade as the north one in v0.6.30 (Fenway
  shipped in v0.6.22, TD Garden in v0.6.24/26;
  Sketchfab models are WANTED in the ledger - account-gated,
  need a human grab).
- **Multiplayer is roadmap-only - no netcode yet.** Design note: a
  WebSocket relay on a Cloudflare Worker + Durable Object fits the
  existing stack; sync transforms + anim state at 10-15 Hz with
  interpolation, no physics sync; the Hollow is the social hub; keep it
  friendly-only (no PvP - bite stays a boop). Build the single-player
  world to reference level first.


## v0.6.32 — playtest solidity pass (Nov 18, 2026)

Owner report: "clipping through the world most of the time" — stability outranks
art additions. This is a cross-system controller/geometry update, not more
visual dressing. The no-build ESM structure, Three.js 0.160.0, iOS Safari
touch UI, and performance ladder remain in place. No imagery was added.

### What changed
- `js/systems/collision.js` is dependency-free ESM math: actual triangle
  interpolation from the 150x86 rendered terrain grid, height-aware finite
  cylinders/boxes, continuous line-segment fence walls, narrow walkable
  rail tops. No per-frame Three.js Raycaster allocation.
- `world.js` stores the rendered ground vertices and exposes
  `visibleGroundHeight()`. This also accounts for wet gravel ribbons
  (+0.04 m), their shoulders (+0.022 m), the Mall apron (+0.058 m),
  and raised plaza discs. The analytic `groundHeight()` remains the
  AUTHORING equation; do not confuse it with the player's mesh support.
- `player.js` moves in ≤1/90 s physics substeps; walks step up at most
  1.3 m, snap DOWN 0.25 m on the lawn (0.9 m on elevated canopy links), and uses the previous foot Y to catch
  falling crossings of branch/roof/bridge top. Walls resolve AFTER a
  provisional landing and the controller resamples its final support.
  Trunk climbing and jump controls remain intact.
- World colliders stop at the physical top: park trunks, hollow/snags,
  lamps, benches, trash cans, carts, monument, statue, fountain, parked
  cars, headhouse and State House. Canopy movement no longer collides
  with infinitely tall trunks or boxes below.
- Park perimeter fence now uses continuous thin segments rather than
  giant widely spaced push-out circles. Its rail, lagoon suspension
  bridge side rails and selected prop tops are walkable when jumped on.
  Additional roof support: State House main-block roof, Park St
  headhouse curved roof strips, Charles St storefront roofs, Washington
  pedestal, raised Tremont and Charles Street sidewalks.
- Fenway, TD Garden, City Hall and Esplanade register height samplers
  with the player controller BEFORE it runs; no more conflicting park
  ground and destination ground within the same frame. The destination
  zone clamps are still authoritative. Camera transforms are synced
  again AFTER zone/canopy systems move the player.
- Interactables check vertical as well as horizontal distance (no talking
  through the canopy floor); key states clear on window blur; park-threat
  HUD no longer warns from the City Hall/Esplanade remote realms.
- Mobile: the JUMP button captures its active pointer so drifting thumbs
  do not silently cancel a held jump; stick/look/button pointers reset on
  window blur (iOS app switch, focus loss). Existing gesture layouts and
  pointer-lock-free Safari startup are unchanged.
- `tests/collision-regressions.mjs` tests pure contact math on Node with
  `node --test tests/collision-regressions.mjs`.

### Must-test gameplay sequence / remaining caveats
1. Spawn and sprint over Mall and plaza; walk across real bridge, its
   ramps and side rails. Move against a fence at walking height; leap
   onto it and step off.
2. Climb a hollow trunk, transition onto canopy, run the 51 canopy
   bridges, leap between heights, fall without damage; stand on a bench,
   trash can, Park St headhouse, State House roof.
3. Use all four rat-market exits: walk the Fenway Monster route, TD
   Garden tiered bowl, City Hall plaza, Esplanade shore/stepping stones;
   enter and exit the original burrow and Hollow.
4. Test real iPhone Safari touch start, drag look, analog movement,
   jump/climb, route transitions and adaptive perf ladder. This coding
   pass does NOT constitute real-device sign-off. The existing
   headless /tmp/shottools paths are not in this repository.

Regression warning: avoid allocating new arrays in `visibleGroundHeight`,
which is called multiple times per substep. The floor can be accurate
without raycasting the entire scene each frame.


## v0.6.33 (Nov 18 2026): input reliability, telemetry and permanent QA gates

This pass follows the v0.6.32 collision overhaul (height-aware solids, mesh-terrain-aligned support, substep physics, continuous fences, branches/roofs). It deliberately *does not* change world geometry or seeded placement.

- `js/systems/jump.js`: testable one-shot jump intent, 140 ms early-press buffer, 100 ms coyote grace. The player owns jump *velocity*; the helper decides whether a NEW press is valid. Holding Space/JUMP never auto-relaunches on landing or leaps off a trunk repeatedly. The same logic applies to keyboard and touch.
- `js/systems/player.js`: consumes jump intent, resets it with keyboard state on blur/hidden, and uses one intentional press to leap from climbing.
- `js/ui/touch.js`: joystick and lookzone each retain their first active pointer; added `pagehide`/`visibilitychange` control release in addition to blur. Existing iOS pointer capture for held buttons stays intact.
- `js/main.js`: native keyboard interaction actions ignore key repeat; pointer lock loss never pauses touch players; backgrounding pauses a running non-debug game; touch perf ladder ignores paused frames. `?diag=1` provides a 6 Hz, pointer-ignoring local telemetry overlay: realm, squirrel feet coordinates, current terrain floor + gap, grounded/climbing/airborne, vertical velocity, instantaneous FPS and touch quality tier. The overlay is absent without the query parameter.
- `js/state.js`: explicitly lists the Esplanade realm flag which earlier world modules already set dynamically.
- `tests/jump-regressions.mjs`: seven portable Node tests (data-URL module import, no npm or WebGL).
- `.github/workflows/ci.yml`: automatic Node 22 syntax checks for all JS/MJS, pure physics and jump regressions, plus static checks for the custom domain, import map, safe-area viewport and touch overlay. This is not a replacement for interactive/WebGL or physical-device checks; the CI bar must remain green before a quality claim.
- Added `docs/ENGINEERING-WIKI.md`, `docs/QA-PLAYTEST.md`, and `docs/DECISIONS.md`. Notion SCURRY hub should link them rather than copy and fork the architecture.

**Known limits still open:** The continuous world is visually detailed but colliders are still a *purpose-built registry*, not an automatically generated mesh collider. Roof facades, complex branch joins and realm-specific geometry need targeted playtesting. The lowq software harness can't establish frame-rate or color grading on a physical iPhone or real GPU. The unreleased TD Garden licensed interior is still gated. A passing unit test proves pure math, not 3D gameplay feel. Do not claim full 3D collision, device verification, or that the quality bar is met.


## v0.6.34 (Nov 18 2026): cached 8m walk-surface broad phase

Support queries used to scan every canopy disc, stepping box and rail *multiple times per 1/90s physics step*. `createSurfaceIndex` in collision.js now maps physical surfaces to 8m XZ cells at first use, with oversized shapes in an always-test list. The player passes the optional index into `walkSurface`. The old full-scan implementation remains as the reference; narrow-phase eligibility (height, jumpOnly rail, exact circle/box/segment math) is unchanged. The index rebuilds when registry array lengths change and exposes invalidate() for same-length/in-place edits. Added 3,000 deterministic indexed-versus-full-scan samples plus dynamic-add/removal and negative/large footprint checks. This improves CPU scaling; physical iOS FPS must be measured separately.


## v0.6.35 (Nov 18 2026) — durable save regression gate

The original save tests were in a temporary harness and were not part of the repo's CI. Added `tests/save-regressions.mjs`, which runs the actual `save.js` source with only state/audio imports stubbed and verifies no-write when clean, live stash/caps persistence, audio sync, sanitization, corrupt/private storage recovery, forward schema safety, and midnight-vs-dawn day rules. Fixes in `save.js`: count sanitization on writes and dirty checks; future-version `v > 1` blobs remain byte-identical instead of being overwritten by an older client. This changes no save key or current schema version. Distinguish this from complete browser localStorage testing; CI covers these pure behaviors.


## v0.6.36 (Nov 18 2026): two-scale visual evidence + truthful diagnostics

Shot mode accepts `&eye=1.7` for an eye-height-only reference camera, alongside canonical `&eye=0.25`. Only `S.debugShot` reads this, not live play. A 1m+ shot hides the paws root so a squirrel paw doesn't levitate at human eye. Shot pose feet use `visibleGroundHeight`, matching rendered lawn/paths/plazas. Diagnostics FPS now divides by raw frame time (the simulation still clamps to <=50ms), avoiding the artificial 20fps floor under bad performance. Docs/QA-PLAYTEST.md includes paired example poses. No change to real physics or material quality; it only makes comparison evidence more reliable.


## v0.6.37 (Nov 18 2026) — food world-height + action safety

Audit found a real destination-placement fault: `spawnFood(opts.y)` initially placed items correctly on raised floors, but `updateFood` immediately reset all non-steal food to the home map's `groundHeight()`. Preserve `item.floorY` at spawn and bob relative to that stored base; canopy caches can still repin their own meshes. `removeFood` now safely checks registry membership before splicing, and pickup/bury actions revalidate reach/state on activation to defeat cached prompts and double taps. Home `isGrass` is invalid as a universal world classifier: burrows, hollow, Fenway, TD Garden, City Hall and Esplanade are explicitly not buriable pending authored soil masks. New `tests/food-regressions.mjs` imports the real food module with simple Three/state stubs; six tests cover raised placement, repeat/stale interactions, and burial policy. No build, extra assets or runtime dependency.


## v0.6.38 (Nov 18 2026) — ambient economy + resource reuse

Discovered a scaling bug: `updateFood` capped home-park ambient respawns by the total non-stealable `S.foods` count, which also includes canopy cache, rat market, Fenway, City Hall, TD Garden and Esplanade. Those offscreen food items could block all home replenishment. Fixed by tagging true park ambient items with `source:'ambient'` and counting only those toward the legacy cap of 20. `makeFoodMesh` now shares material per type and a cached acorn-cap material/geometry, avoiding repeated identical GPU allocations while keeping per-food meshes animated and individually removable. Two added production-module tests ensure ambient economy and material reuse. Model source/visual look unchanged.


## v0.6.39 (Nov 18 2026) — retained carried visual and live action dispatch

The squirrel's camera-attached carried food visual used to allocate a fresh `SphereGeometry` and `MeshStandardMaterial` **on every pickup or swap**, without disposal, eventually leaking small GPU resources in long mobile sessions. `buildPawRig` now constructs a single hidden mesh once; `setCarriedVisual(type)` only recolors it. Supported colors now explicitly include croissant and popcorn, not a fallback grey. `main.js` E/F/ACT/BURY handlers now re-scan nearby interactions immediately on input, rather than blindly executing a last-frame prompt. `player.js` clears held keyboard/jump state on `pagehide` as well as blur/hidden; touch bite is correctly ignored while paused. No player speed, jump velocity, map geometry or UI layout changed.


## v0.6.40 (Nov 18 2026) — schematic park atlas

Added an optional map to improve wayfinding from squirrel height. `js/ui/park-map.js` paints a Canvas 2D atlas only while open (~5Hz, capped DPR2). It reads the same `MAP` footprints and `PATHS` geometry as world.js, water ellipses, major landmarks, runtime hollow-tree and squirrel XY/Z/yaw. Buttons: G desktop, MAP fixed button on touch. Separate coordinate realms display destination title and return instructions rather than a false dot over the Common; backgrounding closes it. `js/ui/map-math.js` provides pure projection, orientation and realm naming; three Node tests cover it. No extra Three scene, build step or generated imagery. Playtest mobile overlay touch targets, readable labels and pointer-lock interaction before calling UI acceptance.


## v0.6.41 (Nov 18 2026): soil membership and toss-arc correction

`isGrass()` incorrectly accepted sidewalk/city apron outside the park because its only logic was exclusion of water, paths and Charles Street. New pure `world/ground-rules.js` limits candidate burial to the actual Common/Garden footprints before those exclusions, with two Node tests for boundary and invalid coordinates. `food.js` tosses previously interpolated to a target Y of zero and then applied the ground elevation correction again on each tick, visibly sinking into terrain near touchdown; now a launch-time ground endpoint is used with one sine arc. An additional regression checks the trajectory and spawned landing collectible. No changes to spawn probabilities, world geometry or material art.


## v0.6.42 (Nov 18 2026) — mobile performance lifecycle

Replaced the one-way mobile quality ladder in `main.js` with `systems/mobile-quality.js`: uses raw frame duration rather than the physics-clamped dt; time-weighted FPS EMA, 3s under 39fps downgrade and 12s over 54fps recovery, ignoring >1s Safari resume gaps; shadows/grass/pixel ratio restore when tiers improve. `?diag=1` reports real instantaneous FPS and EMA. Title/pause GPU render throttled to ~4fps while CSS remains responsive, instead of burning full GPU every browser frame. Six unit tests cover slow/fast frames, hysteresis and resume. Test on real iOS hardware before claiming a specific battery or FPS gain.


## v0.6.43–v0.6.44 (Nov 18 2026) — indexed horizontal contacts and jump/interaction polish

v0.6.43 introduced `createObstacleIndex` in collision.js, grouping nearby trunks, boxes and fences into radius-expanded 8m buckets. Candidate arrays preserve original solver order; a collision push leaving its initial cell cancels the indexed attempt, rewinds XZ and executes the original complete solver. Tests: 3,500 deterministic samples plus corner, realm, climbing and dynamic registration parity. v0.6.44 adds `climbRegrab` grace (300ms regular jump, 380ms climb-off), enforced through a pure `climb-gate.js` function, to prevent launch-canceling trunk snap. Food prompts now report actual distance instead of defaulting to 0.5m, and the obsolete Esplanade ground-food re-pin interactable was removed now that food retains explicit floorY. Both remain free of additional assets or dependencies. QA: test actual canopy launch/grab behavior and close-together food/door priorities on desktop and physical iOS.


## Browser CI smoke harness (Nov 18 2026)

A permanent `harness/browser-smoke.mjs` plus `.github/workflows/browser-smoke.yml` now verifies the real static site in headless Chromium with software WebGL (SwiftShader), not just pure JS syntax. Checks: spawn and Garden shot poses, mobile spawn + touch map, screenshot readiness, WebGL canvas, page/console errors, keyboard G atlas and mobile atlas toggling. GitHub Actions uploads PNGs + report.json even on test failure. CI alone installs Playwright; the game retains plain browser ES modules, pinned Three.js and no build step. Runtime validation depends on Playwright CDN install, Three CDN and network asset loads, so distinguish environmental/network CI failures from code errors; investigate with logs and screenshots. This is **not** a physical iPhone/perf benchmark.


## v0.6.45 (Nov 18 2026) — map label readability corrected from screenshot evidence

The first green permanent WebGL smoke (run 44254317541) rendered spawn, Public Garden and mobile spawn with no page/console errors. The captured mobile map image showed very obvious clipped text: long direct labels crowded the Garden's left edge and Frog Pond. Map pins are now numbered and paired with a static two-column HTML legend with accessible names; the Hollow Tree is H. Realm titles suppress the park legend. Common label moved south, mobile MAP toggle shortened, close note adaptive. No change in coordinate projection, gameplay, Three.js or build step. Follow-up browser smoke must verify legend DOM and updated screenshot, then physical iPhone usability remains open.


## v0.6.46 — playable browser smoke and portal grounding (Nov 18 2026)

Browser CI now runs a **real gameplay session** as well as still screenshot poses. `harness/browser-smoke.mjs` clicks PLAY in a local non-shot page, drives W movement/Space jump, pauses while holding W and verifies no ghost movement on resume, then E-interacts through a surface burrow, all four destination runs (Fenway, TD Garden, City Hall, Esplanade), and the return path. A `?qa=1` helper is available *only on localhost or 127.0.0.1* and reports state/interactions or places feet at a known interactable so the test can skip lengthy cross-map travel. It is absent from the public domain; no in-game control or production feature depends on it. The underlying interactions remain the real E handler.

Additional gameplay corrections: `clearPlayerInput()` on pause/resume, pointerlock loss and hidden events prevents missed keyboard keyup causing runaway squirrels; keyboard downs are ignored while not playing; touch downs are ignored while paused. Hollow enter/exit consistently set grounded and clear climbing. Burrow exit uses `visibleGroundHeight` to match the visible terrain. Browser smoke remains software WebGL, not physical iOS.
