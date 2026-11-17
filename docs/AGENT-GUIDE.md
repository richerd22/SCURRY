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
  golden hour; western Mall row has no canopy bridge (crowns 27.9 m
  apart - needs a planted tree/snag if wanted); split tree GLBs are
  ~2.3 MB each (shared textures duplicated per file); during a hawk
  screech the HUD warning reuses the dog-scent line (shared
  spottedFlash).
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
- Roadmap (owner's direction): Fenway + City Hall as teleport-reached
  expansion maps (Sketchfab models are WANTED in the ledger -
  account-gated, need a human grab).
- **Multiplayer is roadmap-only - no netcode yet.** Design note: a
  WebSocket relay on a Cloudflare Worker + Durable Object fits the
  existing stack; sync transforms + anim state at 10-15 Hz with
  interpolation, no physics sync; the Hollow is the social hub; keep it
  friendly-only (no PvP - bite stays a boop). Build the single-player
  world to reference level first.
