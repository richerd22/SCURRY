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
`canopy`. Add `&lowq=1` for software renderers (0.55 pixel ratio, no
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

## Known state / next rounds (as of v0.2, Nov 15 2026)

- Golden-hour ground is still moodier than midday; full-quality (PMREM)
  lifts it, lowq shots exaggerate the darkness. Next: a dedicated
  grade pass with full-quality captures at 640x360.
- The tail in the down-view reads oddly in stills (fine in motion);
  watch it if the rig is touched.
- Quaternius `Trees.glb` (CC0, in the library) is a 5-tree blob - split
  and instance it for hero trees; procedural elms carry the canopy
  gameplay. Benches are still procedural (Sammy Park Bench, CC-BY, is in
  the library if wanted - 17 meshes, merge first).
- Roadmap (owner's direction): canopy branch highways + cache hollows,
  burrow tunnels + rat black market, Hawk Dua (the hawk), Public Garden
  geese (lagoon bridge bosses), food-stealing crows, Fenway + City Hall
  as teleport-reached expansion maps (Sketchfab models are WANTED in the
  ledger - account-gated, need a human grab), save persistence.
- **Multiplayer is roadmap-only - no netcode yet.** Design note: a
  WebSocket relay on a Cloudflare Worker + Durable Object fits the
  existing stack; sync transforms + anim state at 10-15 Hz with
  interpolation, no physics sync; the Hollow is the social hub; keep it
  friendly-only (no PvP - bite stays a boop). Build the single-player
  world to reference level first.
