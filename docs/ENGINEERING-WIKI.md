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
