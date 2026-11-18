# SCURRY ground clipping — focused acceptance journal

The squirrel position Y is FEET; its eye is 0.25m above. The lawn terrain is triangulated, while visible wet paths, plazas and canopy/roof/rail surfaces sit above it. This is about actual feet vs rendered geometry during continuous motion, not more features.

## v0.6.63 graded fence collision

The v0.6.60 visual fence follows the hill in short panels, but its physical wall height and walkable support used one flat midpoint per panel. That caused invisible barriers above low ends and metal penetration at high ends. Wall and rail collision now interpolate actual endpoint Y at the closest contact position for both indexed and unindexed queries. Legacy constant-height colliders are preserved; five pure tests cover this and 2000 parity samples.

## Still open

A repeatable sustained real-player walk/jump route across the Common hill, Park Street gates, wet paths, Garden paths, fence ends, bridge and canopy. Report maximum feet penetration relative to the actual rendered surface during motion, including after horizontal collision pushes; do not substitute portal or screenshot tests. Native iPhone Safari and a user walktest remain required. Keep changes concentrated here instead of rewriting all wiki files.
