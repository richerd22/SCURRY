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
