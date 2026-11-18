# SCURRY — engineering decision record

Date: 18 Nov 2026 · Version: v0.6.33 · See [full wiki](ENGINEERING-WIKI.md).

## ADR-001 — explicit collision surfaces, not visual mesh = collision mesh

**Context:** In a squirrel-height camera, missed contact between rendered geometry and controller produces catastrophic clipping. Visual geometry is a mixture of authored primitives, model GLBs, distant scenery and animated props.

**Decision:** Keep a separate explicit physical registry (`S.solids`, `S.solidBoxes`, `S.walls`, `S.platforms`, `S.platformBoxes`, `S.platformSegments`) and take base-floor contact from the rendered terrain triangles. Use finite vertical extents and small physics substeps. Resolve support again after wall push-out.

**Alternatives:** Raycast all visible scene objects every frame (too costly, false collisions on visual foliage/crowds), infinite-height 2D solids (roofs/branches break), or only a ground function (render geometry and floor diverge).

**Consequence:** Fast and explainable, but any new climbable object requires a registered contact representation and manual QA. This is *not* a complete triangle-mesh collision engine.

## ADR-002 — edge-triggered jump with short grace windows

**Context:** Held Space/JUMP previously auto-jumped on every landing, and a 0.25 m squirrel traversing narrow branch boxes demands forgiving timing.

**Decision:** Create a pure module `js/systems/jump.js`; 140 ms input buffer, 100 ms coyote time, consume on valid contact or climb. Reset on visibility/focus loss. Leave launch physics in player controller.

**Consequence:** Predictable mobile/desktop jumps with tests, no repeated hold-to-bounce. Tune durations only with comparative playtests; tests encode semantics, not perfect feel.

## ADR-003 — iOS backgrounding is a gameplay lifecycle event

**Context:** Safari and in-app browsers do not reliably emit only `blur` or `pointerlockchange` on tab/app switches; stale thumb ID or held sprint/jump can move the squirrel when the tab returns.

**Decision:** Listen to `pagehide` and hidden `visibilitychange`; release thumb controls and queued jumps, and pause non-debug gameplay behind a resume overlay. Each touch surface keeps its first pointer ID until release/cancel. Skip paused frames in the touch quality ladder.

**Consequence:** Better app-switch recovery and fewer false performance downgrades, at the cost of an extra explicit resume tap.

## ADR-004 — testable code and honest evidence

**Context:** Pixel-perfect screenshots and pure math unit tests catch different bugs. A software renderer cannot certify a physical iPhone's controls or full-quality lighting.

**Decision:** Add CI for JS syntax, pure physics/input regressions, and static mobile/no-build contracts. Keep `?diag=1` as opt-in field telemetry. Track unverified device acceptance explicitly in `QA-PLAYTEST.md` and GitHub issues. No AI-generated imagery or uncited source model redistribution.

**Consequence:** Safer future rounds, auditable statements, and no false implication that CI equals real device playtesting.


## ADR-005 — support-query spatial index, with original collision semantics

**Context:** The player runs ~90 substeps/s and may query support twice per step, but the canopy highway is composed of many small registered stepping boxes.

**Decision:** Keep the original unindexed `walkSurface` for reference and tests. Use an optional lazy 8m spatial bucket cache for player support, indexed by surface bounds with a fallback for huge footprints. Rebuild on append/remove, explicitly invalidate for in-place mutation. Keep all exact narrow-phase math and height gates; regression-compare 3,000 seeded queries.

**Consequences:** Fewer unrelated canopy shapes are tested on each move. The cache uses modest memory and adds a cheap query-result allocation; this does not optimize the separate horizontal resolver. Do not claim a numeric FPS gain without measuring the actual phone.


## ADR-006 — never overwrite future-format saves

**Context:** An old static-game tab may be reopened after a later build has written an extended localStorage schema. An old client silently treating unknown fields as invalid zeroes could corrupt the player's progress.

**Decision:** A numeric save version above 1 prevents writes in that session; use safe gameplay defaults instead of mutating an unknown document. Keep old/no-version blobs compatible. Persist sanitized nonnegative integer stash/caps counts; retain the same storage key and schema v1.

**Consequence:** Forward format blobs stay intact until a compatible version runs; an older browser session will play without persistence for that incompatible slot. A permanent Node suite guards current semantics.


## ADR-007 — human-height QA camera must not become a gameplay mode

**Context:** SCURRY needs reference-level Boston world detail at squirrel and adult human heights, but body collision, climbing and interaction reach are all designed around 0.25m squirrel eyes.

**Decision:** Add an optional eye-height parameter only to deterministic screenshot/shot-mode poses (0.15–2m); keep physical feet and collision behavior untouched. Compare the same pose at 0.25m and 1.7m; hide camera-attached paws in human-reference shots and place debug feet on the same visible-ground sampler as gameplay.

**Consequence:** Repeatable two-scale visual evidence without the false implication that humans are playable or that full human-sized physics exists. Real-device light/perf still requires independent testing.


## ADR-008 — explicit food floor and local burial policy

**Context:** Every food item is in the global list regardless of realm, but the home park height/grass helpers are not meaningful thousands of metres away. The previous update loop overwrote destination food placement, and replaying cached actions could delete a different item or mint free stash.

**Decision:** Store the food's original floor height (including a caller-specified realm height) and preserve it during bob animation; revalidate each consumable action at execution time. A food item can be removed only while it still belongs to the registry. Bury only on home park grass until a destination has an explicitly modeled vegetation/bury mask.

**Alternative:** Treat all destination floors as home grass (unintended progression exploit); sample `groundHeight` on every frame (destroys authored height); accept stale interaction actions (inventory corruption).

**Consequence:** Stable visible food across expansion levels, predictable stash economy and no false grass in concrete/underground areas. Adding Esplanade-specific buriable soil now requires an explicit physical mask and tests; it must not be inferred from a far-away coordinate.


## ADR-009 — ambient food is a source category, not the whole global registry

**Context:** The global food list holds cache loot and remote-map snacks as well as Common forage. A cap based on all non-stealable items can deadlock the Common restock loop after more locations are introduced.

**Decision:** Tag true ambient park food at spawn and count that category for the existing 20-item restock target. Leave every authored cache or arena spawn untagged as world food. Also share immutable per-type food materials and base/cap geometry rather than creating GPU resource clones for identical food.

**Consequence:** The Common can replenish independently from expansion content. A new system that wants the *same* ambient budget must explicitly use source:'ambient'; otherwise its items cannot affect the home refill logic. Mesh ownership remains per food item, but its material and geometry are shared, so callers must never dispose shared assets on individual removal.


## ADR-010 — avoid per-pickup camera materials; validate interactions on demand

**Context:** World food reused materials after v0.6.38, but the visible paw prop still created and discarded new geometry/material per pickup; touch/keyboard ACT could act on stale proximity prompts computed a frame earlier.

**Decision:** Keep one recolorable carried-food mesh for the entire session and one shared action path for keyboard/touch that recomputes the nearby interaction immediately before dispatch. Reset held keyboard state on pagehide and deny bite actions while paused.

**Consequence:** No fresh GPU allocation per carry swap and fewer stale world actions; a small O(number-of-interactables) scan happens on user input in addition to each frame, negligible relative to rendering. Recoloring must use `color.setHex`, not reassign a per-item material.


## ADR-011 — optional 2D atlas, never a second WebGL scene

**Context:** A squirrel sees only 0.25m above ground. The Common and Garden are large, dense open spaces; new players need orientation without a conventional quest marker obscuring the world. iPhone performance is already a core constraint.

**Decision:** Add a lightweight, user-opened Canvas 2D atlas using the game's actual `MAP` and `PATHS`, with one directional player marker. Render at 5 Hz only while visible, cap pixel density, and label other realms explicitly rather than rendering misleading out-of-bounds markers. Desktop G and a touch MAP button toggle it. No image generation, network assets, or build step.

**Consequence:** More navigable park without ongoing GPU cost or changing gameplay physics. It is an authored schematic: individual building footprints and far-destination floor plans remain outside scope, and a future discovery system can extend the markers without modifying terrain.


## ADR-012 — a painted landscape is not a gameplay soil mask

**Context:** `isGrass()` was a negative test (not water, road or path), which classified the city apron outside the Common and Garden as grass. That let carried food be buried on paved ground. Food tosses also applied the ground adjustment twice.

**Decision:** Classify positive membership in the existing `MAP.garden` or `MAP.common` bounds before applying water/road/path exclusions. Move toss destination Y to its real floor once at launch, then interpolate and add a single vertical arc.

**Consequence:** No side-of-park burial exploit, and friendlier visible food landings. This is still a schematic lawn mask, not a botanical survey of every plaza; more exact soil masks can be added when proved by geometry.
