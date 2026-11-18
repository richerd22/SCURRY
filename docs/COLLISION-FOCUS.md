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
