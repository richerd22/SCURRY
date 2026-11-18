# SCURRY — engineering wiki

**Project:** [Play](https://scurry.cold.fyi/) · [GitHub](https://github.com/richerd22/SCURRY) · [QA](QA-PLAYTEST.md) · [Decisions](DECISIONS.md) · [Full historical agent guide](AGENT-GUIDE.md)

**Status:** v0.6.33 (18 Nov 2026). Source of truth is the deployed code plus automated and device test evidence, not screenshots alone.

## Product contract

SCURRY is a friendly first-person squirrel game whose primary playground is Boston Common and Public Garden, sampled at **0.25 m camera height**. Running, climbing, jumping, tree-to-tree travel, food theft, burying, animal antagonists and rat burrows form its core loop. There is no fall damage. The visual ambition is *beyond Saltline*—at both squirrel and human viewing heights—but that quality goal is not a verified current claim.

**Non-negotiable:** no build tools; pure browser ES modules via Three.js 0.160 import map; playable touch controls and iOS Safari; dynamic quality degradation on slower phones; no generative imagery. Only source assets whose permission/attribution can be verified.

## Source map and boot order

| Area | File(s) | Responsibility |
|---|---|---|
| HTML shell + import map | `index.html` | CDN dependency, HUD, overlays, input UI, version |
| Composition + frame loop | `js/main.js` | Build order, interaction scanning, state updates, WebGL render, touch perf |
| Registries | `js/state.js` | Singleton `S`, collision tables, player and realm flags |
| Ground | `js/world/world.js` | Heightfield mesh, paths, water, painted texture, street edge |
| Trees / canopy | `js/world/trees.js`, `js/systems/canopy.js` | Tree records, trunks, canopy discs, bridge stepping boxes |
| Landmark solids | `js/world/landmarks.js`, `js/world/props.js`, `js/world/streetwalls.js` | Visible geometry and matching physical surfaces |
| Physics | `js/systems/player.js`, `js/systems/collision.js` | Feet motion, support queries, height-aware horizontal collision |
| Input intent | `js/systems/jump.js`, `js/ui/touch.js` | One-shot buffered leaps, simultaneous thumb controls |
| Realms | `js/systems/{burrows,hollow,fenway,garden,cityhall,esplanade}.js` | Their own ground and containment, entrances/portals |
| Living park | `js/systems/{food,humans,dogs,ranger,geese,crows,hawk}.js` | Interactions and creature state machines |
| Persistence + UI | `js/systems/save.js`, `js/ui/hud.js` | Storage and prompts |

Initialization in `main.js` builds world, trees, landmarks and props before placing the player. Updates run in the loop after start, then world/portal systems may move the feet and the camera is resynchronized before rendering.

## Collision contract: the important bit

- `S.player.pos.y` is **feet**, not camera/eye/body center. Camera follows at `pos.y + 0.25`, plus tiny walk bob. Every new physics interaction must follow the same convention.
- Base floor on the home map is `visibleGroundHeight(x,z)`, which samples the *rendered triangle height mesh* and overlays wet path ribbons and plazas. `groundHeight()` is the analytic source used when building terrain; don't use it as a physical ground query without considering the visible mesh.
- Other destinations define `S.realmGround.*`; their containment/clamp rules live in each realm module. Do not blindly clamp an expansion's coordinates to the home park (or sample the Common's terrain at coordinates thousands of metres away).
- `S.platforms`: discs with `{x,z,r,y}`; `S.platformBoxes`: walkable top rectangles; `S.platformSegments`: slender rail/branch surfaces, optionally `jumpOnly` to prohibit ground-to-top teleportation.
- `S.solids`: circles; `S.solidBoxes`: AABBs; `S.walls`: line segments. Wall shapes should have **finite minY and maxY** whenever geometry is finite. A top walk surface at roof height must stop being a wall when the squirrel's feet get there.
- Horizontal collision iterates to settle corners. The player moves in 1/90-second-or-smaller steps, resolves support from the previous height, then resolves horizontal penetration and samples support again after the wall push. This preserves narrow branch landings and avoids pushing a rooftop rider from its lower wall.
- Grounded step-up: 1.3 m; normal step-down snap: 0.25 m; canopy descent snap: 0.9 m. *These are gameplay choices*, not physically realistic squirrel leg lengths. A 0.25 m high viewpoint amplifies every mismatch.
- Tree climbing is its own movement mode; it positions feet relative to trunk radius. An intentional jump press leaps out; reaching the canopy snaps to its registered disc.

### Adding new visible geometry without a collision bug

1. Identify whether the object blocks traversal, can be stood on, can be climbed, or is **only scenery**. Record that decision.
2. Position visual geometry and collision records in the **same coordinate frame**, including any object parent offset, rotation and ground offset. For rotated shapes choose line segments or suitable bounds rather than silently misaligned AABBs.
3. Register proper height-bounded solids; create walk surfaces for roofs, benches, steps, bridge decks, rails and branches. Provide a landing approach that doesn't require snapping through a ceiling.
4. Verify from **below, at the edge, on top, while jumping, while descending, and after colliding sideways**. On canopy routes, walk both directions and use the bridge endpoints listed in the agent guide.
5. Check that new colliders are relevant only to their realm, that portal return positions are valid, and that the camera is resynced after teleporting.
6. Record collision evidence and any tradeoff in the QA page, agent guide and decision log; add pure math tests for every new distinct shape.

## Input and feel

`js/systems/jump.js` stores `held`, `buffer` and `coyote`, not a second physics engine. Fresh keyboard or touch press → 140 ms buffered intent; standing on a surface or leaving one within 100 ms validates the jump. Climbing also accepts a fresh press to push off. Holding the button does not auto-hop. The velocity and airtime remain owned by `player.js`.

Touch uses a left virtual stick, right lookzone, jump and action buttons; **pointer IDs are independent**, so simultaneous fingers work. Safari's hidden/pagehide events reset active touches and suspend play, preventing stuck movement on return. Avoid pointer lock, desktop hover or tiny tap targets in the mobile path.

## Browser/device performance

- Normal render pixel ratio is capped at **1.75 desktop / 1.5 touch**. Touch perf ladder (main.js) degrades below an EMA of 40 FPS: lower pixel ratio → smaller shadow map → disable shadows and lower grass density. Background/paused frames must not trigger this ladder.
- Instancing, texture reuse, seeded placement and small lighting budgets matter more than total static object counts. See the detailed perf and asset audit in AGENT-GUIDE.md.
- Mobile iOS Safari, iOS in-app browser, Android Chrome, desktop keyboard/mouse, and a real GPU all require separate acceptance; desktop SwiftShader/headless screenshots do not prove real-device quality.
- Current opt-in field overlay: `https://scurry.cold.fyi/?diag=1`. It displays feet, floor, gap, contact state, velocity, approximate instantaneous FPS and quality tier at 6 Hz. The FPS line is not a formal benchmark; device measurements should record sustained performance.

## Testing, release and truthfulness

- Serve the root with `python3 -m http.server 8000` and open `http://localhost:8000/` (opening via file:// is unreliable for modules).
- Run `node --test tests/*.mjs`. These are pure Node tests of rendered triangle sampling, platforms and collision response, plus buffered jump semantics.
- Run `find js tests -type f \\( -name '*.js' -o -name '*.mjs' \\) -print0 | xargs -0 -n1 node --check` for parse regressions. GitHub Actions repeats both on push and PR.
- Check `CNAME` remains exactly `scurry.cold.fyi` and the pinned import map, touch controls and safe-area viewport remain. A source commit is not necessarily a fully deployed site; verify the Pages deployment before calling it LIVE.
- For WebGL visual proof, preserve before/after image poses and console errors; the old headless harness is documented in AGENT-GUIDE.md and may not exist outside its original workspace. Do not claim it was run if absent.
- For real playtest, use [QA-PLAYTEST.md](QA-PLAYTEST.md) and log device, browser, reproduction steps, location/coordinates and video where possible.

## Known limits and active risks

- Collision covers **registered** geometry, not every triangle of every GLB. A highly detailed model can have visible edges not represented in the navigation ledger. Need site-specific checks for roof ledges, ramps, rail joins and mesh-derived destination floors.
- The TD Garden interior model remains permission-gated in the game code; do not flip its release flag without provenance. Its absence is intentional, not a missing-file defect.
- Visual comparison against Saltline has not established parity or superiority; real-device golden-hour grading, foliage readability, collision feel, water quality and high/low-end phone FPS still need manual acceptance.
- No AI-generated imagery: authored code-rendered graphics and cleared CC0/CC-BY or explicitly licensed source models are the design pipeline. Attribution and reuse rules in the agent guide remain binding.


## v0.6.34: support query optimization

`js/systems/collision.js` now provides `createSurfaceIndex(platforms, boxes, segments, cellSize=8)`. The cache creates an 8m spatial lookup for walkable platforms, bridge stepping boxes, and narrow rail segments. A surface is indexed in each cell touched by its XZ bounds; footprints over 256 cells go into a small global test list. Every player support query sees only local candidates and the oversized list. When any registry array length changes, the index rebuilds on the next query; after *in-place* position edits call `index.invalidate()`. The optional index leaves the legacy full-scan function callable for other modules and exact-equivalence regression tests (3,000 seeded queries). This is a CPU optimization and does not imply any visual geometry change or physical mobile benchmark.


## v0.6.35: save behavior and upgrade safety

`js/systems/save.js` persists the *live* stash, caps, personal best day count, cumulative dawn crossings and mute state at `scurry-save-v1`. Saves are dirty-checked and guarded against private-browser storage exceptions. The new permanent Node suite uses the actual production source and tests nine operational invariants: no write unless changed, live balances, audio settings, corrupted storage recovery, quota/private-mode safety, integer count sanitization, forward schema safety, and the dawn-crossing day rule. A blob with numeric schema `v > 1` is intentionally left untouched by this older client; missing `v` remains legacy-compatible. No backend/cloud sync is provided; clearing browser storage loses local progress.


## v0.6.36: two-scale scene fidelity inspection

The source gameplay camera stays 0.25 m above squirrel feet. Only `?shot=<pose>&eye=<metres>` enables a camera reference height from 0.15–2.0m, so the same authored pose can be judged at human height (1.7m) and squirrel height (0.25m). Paw meshes are hidden for human-height inspection; physics, interactions and actual player posture remain squirrel-sized. Screenshot pose feet now use the visible triangle/path terrain surface. Live diagnostic FPS uses real elapsed frame time rather than the simulation's 50ms timestep cap; this does not itself boost performance.


## v0.6.37 — food, remote floors and interaction integrity

The food system is shared by the home park, canopy caches, burrows and destination realms. A caller-supplied `spawnFood(..., {y})` is **the floor height**. Previously food with an explicit floor could spawn on the correct Esplanade/TD Garden surface and then be teleported to the analytic home park ground on the very next `updateFood` tick. We now retain `item.floorY` (explicit or initially sampled ground) and bob food above that consistent base. Dynamic canopy cache scripts may still reposition their own food after the food update.

Food and burial prompts may be cached for one frame: stale double activation after another pickup, crow snatch or portal move must never remove the wrong array element or award stash twice. Food actions now revalidate proximity and membership, and `removeFood` returns false for already-consumed items rather than splicing index -1. Bury callbacks also revalidate their eligibility and carried item.

The common's `isGrass()` must **not** authorize burying in far destination maps or the underground tunnels, where every unrelated coordinate previously looked like grass. Burying is limited to *actual Common/Public Garden grass* until other realms implement explicit grass masks. Six new permanent Node tests import the production food module with lightweight geometry/state mocks, and cover floor fidelity, duplicated/stale pickup and burial, and realm restrictions. No food geometry, textures or balance values are changed.


## v0.6.38 — park food population and GPU resource hygiene

The food registry mixes Common ambient snacks with dozens of canopy-cache, market and expansion items. The old restock check counted **every** non-stealable food worldwide, so enough persistent canopy/realm items could prevent the original park ambient spawns from replenishing at all. Every `initFood`/ambient-respawn item now has `source:'ambient'`; the 20-item budget counts only that category and leaves authored cache/destination food alone. This preserves the core forage/stash loop as the game gains new realms.

`makeFoodMesh` used to allocate an identical new `MeshStandardMaterial` for every acorn, peanut, popcorn, etc., and a new cap mesh geometry/material for every acorn. It now shares **one material per type**, the base sphere and a cached acorn cap geometry/material. Mesh transforms stay unique and per-item animation still works. Shared resources must never be disposed when a single food item is removed; removing the mesh lets the JS object collect, while shared material/geometry live for the game session. Two new tests cover independent ambient budgets and GPU material/geometry reuse.


## v0.6.39: one reusable hand-held food mesh + fresh interaction snapshots

The right-paw carried food visual is one shared mesh/material created in `buildPawRig` and recolored on pickup/swap. Unlike the world food materials, this single transparent material's opacity must remain under `animatePaws()` control; do not create a new material for every pickup. Croissant/popcorn carry colors are defined explicitly. The E/F keys and touch ACT/BURY actions call the same `interactNow`/`buryNow` functions, which rescan the actual current scene/prompt before dispatch. This ensures portal/food/position changes between frames do not execute a stale action. Keyboard pagehide resets held Space and jump intent; biting is disabled while paused. CI validates syntax, while the physical iPhone long-session memory and touch experience are still open QA.


## v0.6.40: map, orientation and discoverability (code-drawn, mobile-safe)

Added `js/ui/park-map.js` with its pure coordinate helper `js/ui/map-math.js`. G (desktop) or a small top-right MAP touch button toggles a canvas atlas; it redraws only while open (~5 Hz, device pixel ratio capped at 2). No Three/WebGL draw pass, model, shader, texture download, npm package or AI-generated artwork is involved. The atlas uses `MAP` extents from `state.js`, the actual `PATHS` from `world.js`, water ellipses, hand-registered landmarks, the runtime Hollow Tree position and a live arrow from `S.player.pos` and `P.yaw`. Negative Z points north; the map projection scales X/Z equally and centers the whole area, including Charles St between the two parks.

The atlas is **not** an invented geographic map for separate destination spaces: when the player is in hollow, burrows, Fenway, TD Garden, City Hall or Esplanade, it shows that realm's title and instructions to return via burrow doors instead of falsely plotting the remote coordinate on the Common. It closes on Safari backgrounding and requires explicit input to reopen. Tests verify map aspect/orientation, yaw direction and realm labels. In-game landmarks are schematic, not survey-grade coordinates; keep physical map navigation honest and grounded.


## v0.6.41: true park-only soil and food toss trajectories

The ground texture is a continuous painted surface, but `isGrass` previously returned true even on the surrounding city apron because it only excluded water, Charles Street and trails. New pure `world/ground-rules.js` checks the union of actual Common and Public Garden bounds **before** the existing water/road/path exclusions. Consequently the squirrel cannot bury stash on sidewalk outside the fence just because the texture is green. The map still keeps existing artist-authorable park bounds and does not pretend every square metre inside them is grass.

Food tosses previously interpolated a `to.y=0` target and *also* subtracted a separate ground correction on every frame, causing the arc to dip down into the terrain near touchdown. A tossed item now gets a precomputed ground endpoint (`groundHeight + 0.05`) and follows a single linear interpolation plus a sine hop, ending where the spawned collectible sits. Ground bounds and toss-arc tests are permanent Node tests. No additional runtime texture, build step or asset.


## v0.6.42 — mobile battery and reversible quality ladder

Before this pass, mobile dynamic quality used the *simulation* `dt` capped at 50ms. Phones truly running at 4fps looked as though they rendered at 20fps, and accumulated only 0.05 seconds per 0.25-second wall frame—delaying quality changes when they were most needed. The quality ladder also went down but never recovered. The new pure `systems/mobile-quality.js` state machine uses raw renderer-frame elapsed time, time-normalized FPS EMA (1.4s characteristic), gradual downgrade after 3s below 39fps and slow upgrade after 12s above 54fps, and ignores >1s Safari resume spikes. Deadband between thresholds prevents oscillation. When recovering, restore original touch pixel ratio, shadows and grass. The debug overlay reports both instantaneous FPS and smoothed EMA.

The frame loop still requests animation frames to detect user input and resume, but when the game is on its title/pause overlay the expensive `renderer.render` runs only at about 4fps because the underlying simulation is frozen. This reduces battery/GPU load while paused; live/shot gameplay continues at full browser rate. No new build step or graphics dependency. Six Node tests cover downgrade, gradual recovery, deadband, invalid/resume intervals and ultra-low-FPS behavior. Real iPhone power/FPS benefit remains a manual measurement.


## v0.6.43 — indexed horizontal collision

`createObstacleIndex` caches nearby circle solids, boxes and fence/wall segments in 8m XZ buckets. Bounds are conservatively expanded by the squirrel radius, and oversized obstacles are always checked. Candidate sets retain the original registry order and vertical collision predicates. If **any collision push** leaves the initial bucket, the partial result is discarded and the original full two-pass solver is replayed from the initial coordinates. This preserves difficult corner handling rather than sacrificing correctness to a fast path. Tests compare 3,500 deterministic samples to the original exact response, plus large penetrations, boundary conditions, climbing exemptions and late registrations. A passing Node suite is not proof of physical Safari FPS.

## v0.6.44 — clean launch from trunks and honest prompt priority

A jump beside a tree could start a new climb during the same movement update if there was enough trunk contact, canceling the launch. A small `climbRegrab` cooldown of 300ms follows ordinary jumps and 380ms follows a deliberate trunk leap. The pure `climb-gate.js` helper encodes the same grounded/airborne approach and canopy-top eligibility as before, plus cooldown. Four tests cover approaching, dismounting, weak/too-low approaches and top-of-trunk constraints.

`nearestFoodAction()` now reports its actual horizontal distance and main interaction scanning uses it, instead of treating every reachable food item as exactly 0.5m away. A closer burrow door or other action correctly wins. Esplanade food no longer needs a fake interactable whose tick re-pins food: v0.6.37's stored floorY solved that underlying problem permanently, reducing one per-frame workaround. New tests cover food distance reporting. No new artwork, build process, dependency or world geometry.


## CI browser-smoke harness (post-v0.6.44)

Added `harness/browser-smoke.mjs` and its dedicated `.github/workflows/browser-smoke.yml`. The main pure Node CI does **not** install any browser or change the game's no-build deployment. The new separate GitHub Actions job installs Playwright + Chromium **only in CI**, serves the repository root through a temporary Python HTTP server, launches actual headless WebGL via SwiftShader, verifies `?shot=spawn` and `?shot=garden` plus a mobile touch `?shot=spawn&touch=1`, and checks `window.__scurryReady`, page/console errors, a real WebGL context, HUD/map availability, canvas dimensions and G/map-toggle interactions. It preserves screenshots and a JSON error report as a seven-day workflow artifact. A failure is inspectable by agents; do not call a test passing before the run finishes.

**What this does not prove:** the actual public site's deployment, native iOS Safari, mobile battery/thermal FPS, visual art quality at squirrel/human heights, or all complex climbing/portal gameplay. Software-rendered screenshots can look different from a real GPU. Browser tests guard the app boot and major UI wiring, not a full playthrough.


## v0.6.45 — readable, accessible compact park atlas

Reviewed the first permanent browser-smoke screenshots (v0.6.44): the map initialized correctly but long landmark labels overlapped and visibly clipped at 390px phone width. Replaced those inline names with six **numbered high-contrast map pins** plus the runtime Hollow Tree H pin and a DOM-based two-column legend beneath the canvas. Legend entries have readable text and accessible label attributes; the markers and legend are generated once in `initParkMap`, rather than reallocating DOM entries at 5Hz. Destination-map title mode hides the irrelevant park legend; returning to home shows it again. Boston Common's subtle park name moved toward the south side to avoid clutter around Frog Pond. The button is labeled just MAP on touch devices and the help note gives the relevant mobile/desktop close action. Browser smoke now asserts at least six legend items while map is open on a simulated mobile device. Pure map geometry/projection was deliberately left unchanged.


## v0.6.46 — actual playable browser routes, pause safety and grounded portal exits

SCURRY now has **two different evidence levels**: the pure Node physics suites, and the GitHub Actions Chromium/WebGL workflow. The browser harness adds a real *non-screenshot-mode* play session: it clicks PLAY, holds W until the squirrel actually walks, jumps with Space, simulates a missed keyup across PAUSE/RESUME, and activates a real burrow entrance and all four remote destination doors via E. It verifies realm flags, grounded arrivals and the return trip, then archives screenshot/report evidence. It is a browser-level input-and-portal test, not a full art or physical-device certification.

To make the test repeatable without adding debug buttons to production, `?qa=1` installs a minimal read-only snapshot/interactable-list plus a feet-placement and pause test helper **only when hostname is 127.0.0.1 or localhost**. It is completely absent on scurry.cold.fyi. Actions still use the same keyboard E, gameplay callbacks, world physics and UI dispatch as a human player. `?qa=1&lowq=1` reduces headless software-render workload without mutating normal game settings. Tests MUST use the real UI/input for the action being verified; direct QA placement just shortens walking across a whole map.

Movement keys are no longer latched while the title or pause overlay is up. `clearPlayerInput()` resets queued jump and held W/Shift on game start, pointer-lock loss and browser backgrounding; the touch key setter rejects new held presses while paused. The Hollow entry/exit explicitly clears climb mode, zeroes velocity and sets grounded; burrow exit uses `visibleGroundHeight` (rendered triangles + path/plaza overlay), not the lower analytic source height. No physics constants or destination geometry changed.


## v0.6.47 — indexed path contact without visual terrain changes

`visibleGroundHeight` used to scan the entire PATHS polyline network for each physics ground probe; `isGrass` did likewise for burial checks. Both only need exact nearest-segment distances inside small known bounds (2.15m for path ribbons, 2.4m for grass exclusions). A new pure `world/path-index.js` indexes all static segments in 12m XZ cells, conservatively extended by 2.5m. Foot probes test only local candidates using unchanged clamped segment projection math. Queries outside the index radius fall back to the original full scan; broader `distToPaths` callers (including tree placement) remain untouched. Four Node regressions compare 5,000 seeded bounded cases to brute-force, negative/endpoint/degenerate boundaries, wide fallback and candidate reduction. No geometry, textures, seeds or physics constants changed.


## v0.6.48 — actual browser failure uncovered pointer-lock fallback flaw

The first **real play** browser smoke passed all three still poses and walked/jumped, but failed when clicking RESUME after a pause: `S.paused` became true again. The previous `pointerlockchange` handler treated *any* unlocked change as lost gameplay, even if the browser had denied pointer lock and **never acquired it**. Meanwhile its comment promised a mouse-drag fallback that player.js did not actually implement.

Now the game tracks whether it **previously held** a real desktop pointer lock. Only an actual loss of that lock pauses play; a denied request leaves the game running in fallback mode. When unlocked, dragging the game canvas with primary mouse button rotates the squirrel's view, and a short click triggers BITE on release, not on drag-start. Pointer-locked controls retain their existing mouse-delta aim and instant click-bite. Drag state clears on blur/pagehide/hidden.

Browser CI uses `?qa=1&nolock=1` (still strictly localhost) to deliberately exercise this permission-denied scenario: click PLAY, walk, mouse-drag aim, jump, pause/resume, burrow and destination routes. QA suspend releases any held lock just as a real hidden tab would. The original failure and subsequent fix are now a permanent regression test, not a screenshot assumption.


## v0.6.49 — optional landmark wayfinding from the park map

The map now lets players **choose a landmark** rather than just read its label. Numbered legend entries are semantic accessible buttons; selecting one closes the atlas and shows a small waypoint cue near MAP with a relative direction arrow and live horizontal distance in metres. The arrow is derived from the squirrel's real yaw and the selected world X/Z using a pure `waypointBearing` helper in `map-math.js`, not invented geolocation or an artificial GPS. Within 4m it reads ARRIVED. Tapping the cue clears the marker, and tapping the same marker again also toggles it off. The route cue hides while the map is open, in any off-park realm, or on pause; returning to the Common restores the active destination. No destination is selected by default—normal HUD remains uncluttered.

Unlike a full pathfinding GPS, this is a simple heading/ground-distance beacon and does not promise a safe physical route around fences, water or buildings. Only visible while activated, updated at the existing ~5Hz map tick; no new network assets, image generation, build tools or WebGL draw pass. Node tests assert cardinal/directional math and distance, and mobile browser smoke checks tap-to-select and tap-to-clear.


## v0.6.50 — paused game now pauses WebAudio too

The visual and physics loops stopped while paused, but WebAudio could still generate birdsong and crickets. `audio.js` now exposes `setGameAudioPaused` and `isGameAudioPaused`: on pointer-lock loss, hidden/pagehide and QA pause, sound generation is gated immediately and the shared AudioContext is suspended when possible. Resuming from PLAY/RESUME restores the existing context with guarded promises, keeping the separately persisted MUTE preference unchanged. Two production-module Node tests verify suspend/resume, one context across repeated starts, mute retention and pre-gesture safety; browser live-play CI checks the audio pause flag around resume. Real iOS sound/battery still requires hardware acceptance.


## v0.6.51 — portal arrivals obey actual remote floor heights

The new live WebGL/keyboard E browser route test passed the Common/burrow loop and reached Fenway, then failed because `grounded` was false upon arrival. Root cause: four destination portals had hard-coded `y=0.4` (Esplanade `LAND_Y+0.4`) while simultaneously setting `grounded=true`. On the next 90Hz substep, the 0.4m gap exceeds the 0.25m snap-down tolerance, so the player is immediately put into airborne state and falls into the venue floor despite a supposedly grounded portal. This is a gameplay bug, not a screenshot-mode discrepancy.

**Fix:** Fenway portal and paranoia reset now use `fenGround` at the exact entrance XZ; TD Garden uses `gridGround`; City Hall uses `cityGround`; Esplanade uses `espGround`. The portal still clears velocity, climbing state and now stale regrab delay, and has feet exactly on the realm's physics height at spawn. The localhost-only QA snapshot exposes the *same* per-realm sampler as `floor`, so the browser route test requires both `grounded=true` and |feet-floor|<0.1m for **all four** destination transitions. No changes to decorative meshes or camera eye height. The live browser workflow is the acceptance gate; passing static Node checks alone does not prove the route fixed.


## v0.6.52 — game canvas is the only desktop bite/drag input surface

The new unlocked-mouse fallback originally listened for all document mousedown events; clicking MAP, a numbered waypoint, or another HUD control while playing would silently trigger `tryBite` on release even though the user had not interacted with the scene. Only `S.renderer.domElement` now opens a desktop aim-drag or bite gesture. UI controls remain separate; pointer-locked scene input remains unchanged. The live browser QA now opens and closes MAP with a mouse while the game is active in no-lock mode and asserts `biteCooldown` stays inactive, in addition to the drag-yaw assertion. This is a direct follow-on safety fix to the v0.6.48 pointer-lock fallback.


## v0.6.53 — live simulated multi-touch game integration test

The existing screenshot-mode mobile smoke only established that touch controls were *visible* and MAP could open. A new `mobile-live-play` test actually taps PLAY in a live (non-shot) 390×844 Chrome mobile emulation and dispatches independent touch pointer IDs through the production handlers: hold virtual joystick to walk, press/hold JUMP with a second pointer while still moving, release both and verify neutral analog values, drag the right look zone to rotate camera, toggle SPRINT on and off, then use a real ACT button tap to enter a rat burrow. The test asserts world position changes, jump altitude, camera yaw, sprint state and the burrow realm flag. It archives its own screenshot/report evidence.

This expands reproducible browser functional coverage without adding build dependencies to the game. Synthetic PointerEvents exercise actual event handlers, but **do not certify native iOS Safari multi-touch APIs, touch-action behavior, page-gesture prevention or device thermals**; those remain physical iPhone QA. On the production site `?qa=1` does not install any test controls outside localhost. No game rendering/physics features were changed in v0.6.53; this is regression infrastructure.


## v0.6.54 — optional persistent Field Notes within the atlas

Added a small *discovery record* that rewards actual exploration without a tutorial, floating quest markers or a new heavy UI. `discovery-rules.js` defines fourteen named observations: the same six authored atlas landmarks, the Hollow Tree, a real canopy-height excursion, and visits to the Hollow, rat tunnels, Fenway, TD Garden, City Hall and Esplanade. The pure `discoverAt(player,ground,hollowTree)` never awards park landmarks when the player is in another coordinate realm. Its `LANDMARKS` list is also now the atlas's **single source of truth** for pin placement, eliminating duplicate map/discovery coordinates.

`discoveries.js` samples player location at ~0.45s intervals only during live play (not screenshot mode) and persists newly discovered IDs once to `scurry-field-notes-v1` in localStorage. This separate, sanitized, versioned key cannot corrupt/migrate the existing saved stash/caps/days schema. Disabled private storage is tolerated without stopping progress for the session. No background work, polling timer or WebGL object is added.

The existing optional map panel now has a FIELD NOTES button with count/14, switching between the hand-drawn map and a readable two-column discoverable checklist. Recorded discoveries are checked and retained across reloads; undiscovered places are listed as an exploration invitation. The on-screen waypoint remains independent. Browser simulated touch smoke asserts the Notes tab opens/returns and live ACT entry into the burrow creates a persisted 'burrows' observation. Pure Node tests cover all 14 unique keys, exact atlas positions, off-map realm boundaries and canopy elevation rules.
