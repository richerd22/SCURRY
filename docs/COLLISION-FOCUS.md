# SCURRY ground clipping — focused acceptance journal

The squirrel position Y is FEET; its eye is 0.25m above. The lawn terrain is triangulated, while visible wet paths, plazas and canopy/roof/rail surfaces sit above it. This is about actual feet vs rendered geometry during continuous motion, not more features.

## v0.6.63 graded fence collision

The v0.6.60 visual fence follows the hill in short panels, but its physical wall height and walkable support used one flat midpoint per panel. That caused invisible barriers above low ends and metal penetration at high ends. Wall and rail collision now interpolate actual endpoint Y at the closest contact position for both indexed and unindexed queries. Legacy constant-height colliders are preserved; five pure tests cover this and 2000 parity samples.

## Still open

A repeatable sustained real-player walk/jump route across the Common hill, Park Street gates, wet paths, Garden paths, fence ends, bridge and canopy. Report maximum feet penetration relative to the actual rendered surface during motion, including after horizontal collision pushes; do not substitute portal or screenshot tests. Native iPhone Safari and a user walktest remain required. Keep changes concentrated here instead of rewriting all wiki files.

## v0.6.64 actual terrain walk evidence

The localhost-only QA runner now starts five real park routes, holds browser keyboard W and steps the actual player.js substep solver 470–680 times per route. At each physics step it checks feet relative to visibleGroundHeight, state/airborne count and vertical displacement; every 20th step it independently raycasts the **rendered Three.js lawn triangles**, recording exact mesh Y and foot clearance. A JSON trace with position, floor, mesh and grounded flags is uploaded in the browser-smoke artifact, so a failed route has reproducible coordinates. The routes include the Common Mall, Garden north path, Frog Pond southern path, Charles St gate, and State House slope. These are physics-contact tests (synthetic clock, real held movement input), not physical iPhone performance. All route checks must pass on matching browser CI before using them as evidence; anything that fails is a defect to investigate, not a reason to weaken constraints.

## v0.6.65 elevated real-support traversal

The browser integration test now discovers an actual canopy platform, the Garden bridge deck, and a graded perimeter rail from the in-game collision registries. It positions the squirrel at each real support then drives W across that geometry with actual player movement substeps. It asserts continuous grounded state, height continuity, no involuntary climbing, no mesh penetration, and records the exact positions in the same JSON artifact. These are short carefully bounded traversal probes, not a declaration that all roofs/branches were manually accepted. The previous five continuous Common/Garden walking paths remain mandatory.

## v0.6.66 user-facing clipping reproduction

Open https://scurry.cold.fyi/?diag=1 in a normal browser and play through a suspicious contact. The optional diagnostics panel now holds a bounded recent 180-sample movement trace (roughly 30 seconds at 6Hz), including feet X/Y/Z, actual floor, contact state, vertical velocity, frame FPS and realm. Tap COPY WALK TRACE to copy JSON for a GitHub issue/ChatGPT. The copy is **manual, on-device only**: no upload, analytics, background recording or trace allocation during normal non-diag play. It tracks minimum grounded-floor gap and negative penetration samples without pretending that a clean trace proves the whole world collision is fixed. Four pure Node tests validate bounded storage, event counts, bad data and snapshot immutability.

## v0.6.66+ whole-map triangle parity gate

The same live Chromium browser now raycasts 651 evenly spaced sample points across the full Common/Garden mesh, comparing each actual rendered-triangle height to visibleGroundHeight. Any sampled floor below the triangle by over 1.5cm is a failure; a floor more than 20cm above the mesh is flagged as a likely hovering/misregistered surface. Metrics and worst XZ coordinates are archived as terrain-triangle-survey.json independently from the movement-route traces. This does not replace dense walk/jump exploration, but broadens coverage beyond the five chosen open-world routes.

## Charles Street: physically graded sidewalk curb (v0.6.67)

Detailed browser traces from the first five successful route tests exposed a defect hidden by the no-penetration checks: while crossing from asphalt to the Public Garden at z=-66, the squirrel's feet changed a full **0.12982m in one 90Hz physics step**, twice (up and down). The culprit was the *real* 13cm-high Charles Street raised sidewalk box; this is not an underground fall or a fake ground sampler. At a 25cm eye, however, it appears as an abrupt camera pop. The sidewalk now has a 1.2m flat paved centre and 0.75m graded shoulders on BOTH grass and street edges, all drawn as instanced sloped concrete wedges with exact matching interpolated collision Y. The street-side lip is 1.5cm, ramp grade 11.5cm/75cm, less than 6mm per normal 90Hz walking stride. Both indexed and full platform queries support graded boxes; old flat geometry remains unchanged. Four new Node regressions include 2,500 seeded parity points and an actual 90Hz synthetic curb-crossing that rejects jumps above 2.5cm. The real-world Chromium Charles Street route also now fails on maxStepY >= 5cm. No unrelated gameplay features.

## v0.6.68 independent concrete-mesh checks

A second browser visual parity gate samples 168 points along the two real Charles Street sidewalk strips. It raycasts the three actual **instanced concrete meshes** (flat centre + both sloped wedges) from above and compares measured visible top against `boxSurfaceHeight` from the same registered physics platform boxes used by the squirrel. Maximum difference must be under 5mm; every visual and physical surface must exist. The artifact `sidewalk-visual-collision.json` stores exact worst-case x/z and both heights. This detects a renderer/geometry bug even when the pure curb formula and physics math agree with one another. No player-facing feature was added.
