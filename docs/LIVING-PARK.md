# SCURRY — Living Boston: Swan Boat vertical slice (v0.6.72)

This pass turns the already-existing docked Public Garden Swan Boat into a functional stowaway ride. The boat is the THIRD of three registered procedurally built Swan Boats. No asset, model, image or additional draw call is introduced.

- From the existing south-shore dock near (-140.5,22.9), press E to sneak aboard.
- You ride attached to the visual deck, not a fake walkSurface platform or an underwater physics teleport.
- You start hidden behind the benches. Press E to peek and E again to duck. The operator surveys for a visible 3.5s window every 12s. Two seconds seen during a scan sends you back to the dock without losing anything.
- The route is a 56-second west-lagoon play-scale loop and returns to the real boarding dock. E exits. The player can free-look while aboard, and movement input is cleared when boarding and leaving.
- Existing normal save schema is not changed; it never stored coordinates or mid-ride poses.
- The actual Boston Swan Boats take a ~15-minute trip that goes around Duck Island and under the bridge. The current SCURRY bridge deck is **too low** for the swan canopy, so an under-bridge route would visibly clip. This pass explicitly does NOT pretend the short west-lagoon ride is geographically complete. Bridge clearance and an authentic whole-lagoon passage remain a prioritized art/physics redesign, with raycast/visible clearance tests required before shipping.
- Tests: pure route determinism, dock closure, lagoon safety, clearance from central bridge and the existing western drifting vessel. Browser walkthrough + iPhone Safari still required before marking the interaction verified.

Next: actor population with response states, breeding silhouettes, interactive scavengers; preserve collision-first walktest gate. Core park geometry and all existing portals remain untouched in this pass.

Sources: https://swanboats.com/how-it-works/ , https://friendsofthepublicgarden.org/our-parks/the-garden/swan-boats/


## v0.6.73 — small fauna and interaction ecology

18 authored wildlife actors with no network assets: nine squirrels, four rabbits, one nocturnal surface rat, four separate tunnel rats. Small code-authored models with motion and proximity culling; tunnel creatures appear only in the burrows. Surface animals avoid water, streets and park bounds. They are NON-SOLID visual actors rather than adding a second collision system.
- Nearby squirrels chatter (E) and respond to offered carried food; friendship follows for up to 25s and consumes the one-item food carried by the existing inventory.
- Rabbits flee from loud nearby sprinting and dogs; approach slowly and E lets you watch them quietly.
- Rats provide location-grounded market/storage guidance rather than an unlimited currency generator.
- Bite near an unthreatened squirrel simply scares it briefly, never injures it.
- New Node tests validate spawn geography and reaction priority.

*Known limits*: These are authored plausible park encounters, not precise wildlife census data. NPCs currently pass through the other non-player actors; no new collision risk to the player. More varied dog types and human-wildlife interaction remain a follow-up.

Ground truth for species in Massachusetts: https://www.mass.gov/info-details/mammals-in-massachusetts ; for actual park behavior and respect for wildlife: https://friendsofthepublicgarden.org/our-parks/visit/park-policies/


## v0.6.74 — dog diversity and responsible Garden walkers

Five distinct dogs: golden curious dog, Shiba, small terrier, black lab, dachshund; each has authored scale, speed and play temperament. Two are leashed with their own real animated human walkers and visible leash geometry. Garden dog is leashed and does not chase; only three Common dogs can chase, with the curious golden dog reacting to sprints rather than casual walking. Dogs do not chase Swan Boat passengers or players in remote locations. Leashed walkers can be greeted by E without creating food or disrupting the economy. Existing Quaternius Dog/Shiba assets remain the only external dog models, with a code-built long dachshund silhouette. Dog positions are shared read-only with wildlife so rabbits and squirrels flee nearby dogs. Pure tests cover the chase policy and breed inventory. Performance caveat: two dynamic leashes add two line draw calls and are never colliders.


## v0.6.75 — responsive park visitors + shared dog threat

Nine moving passersby now provide actual proximity-validated E beg interactions; the existing food-toss pipeline and its 26s per-person cooldown are reused, with movement coordinates updated every frame. Passersby can pause briefly to observe nearby squirrels. An old one-frame path discontinuity on waypoint transitions is corrected by recalculating endpoints after changing the segment. Wildlife now queries the actual dog-record Vector3 positions (not nonexistent top-level x/z fields); pure tests prove dog-to-rabbit threat propagation.

**Acceptance**: these features are source-integrated and pure CI-tested, but new live interactivity remains a browser/phone walktest gate. Each interactive target must remain physically near its prompt and must not be reachable from a distant realm or an airborne rooftop. Keep the route traversals mandatory.


## v0.6.76 — geographic correction, no terrain reauthoring

Boston anchors corrected against Friends of the Public Garden and the City historic study: George Washington equestrian statue now near the west Arlington Street entrance opposite Commonwealth Avenue Mall (was incorrectly at the Garden south shore); Make Way for Ducklings now near the Beacon/Charles northeast corner (was incorrectly on the southeast lagoon side). Washington's atlas Field Note and one west-Garden promenade path were adjusted together. Collider and walkable pedestal positions are already generated from the same authored statue position, so there is no invisible previous sculpture at the old location.

Still essential and NOT silently changed: the model's suspension bridge runs north/south with insufficient deck-to-Swan-Boat clearance, while the historic real bridge is on the Garden east/west axis. Changing it also affects the goose-deck jurisdiction, dock, boat routes, path navigation and collision tests, so requires a measured geometry rebuild with independent raycast collision-parity acceptance, rather than moving props and hoping. Likewise the Common's basin/hill/path placements need a map survey before touching the shared terrain. Keep this as an explicit fidelity debt.

References: https://friendsofthepublicgarden.org/our-parks/the-garden/ ; https://www.boston.gov/sites/default/files/embed/b/boston-public-garden-study-report.pdf ; https://www.cityofboston.gov/images_documents/boston%20Common%20History%20%26%20Map_tcm3-30691.pdf


## v0.6.77 — browser integration gate for new systems

The existing headless Chromium suite now physically places a player on the already-collidable Swan Boat pier, presses the actual E handler to board, verifies that real player feet move with the boat above the water plane, peeks and hides via E, fast-forwards the boat clock using a **localhost-only** QA hook, and presses E to disembark at precisely the existing dock platform height. A second scenario places the player by a visible living squirrel and requires a real E prompt, then interacts through the same input path. No player-visible debug control or public QA API was added. These run alongside the preexisting 12 continuous terrain walk routes and elevated support probes; green CI will constitute desktop Chromium smoke evidence, not an iPhone acceptance.


## v0.6.78 — real passengers and visible Swan Boat operator

The boats were visually empty, despite the official Swan Boat operator guidance that passenger weight is necessary for the paddlewheel to sit properly. Each of the three already-authored Swan Boats now has ten small seated silhouettes instantiated into TWO mesh draws (body/head) plus a simple crew operator at the stern. The crew operator turns during the same existing sightline glance that powers the player hide/peek mechanic — detection has a visible actor instead of only text. No photo assets, third-party licensing or additional boat collider. Tests enforce all ten seats remain distinct and within the canopy interior. This is a stylized visual approximation rather than real-life boat operating physics. Source: https://swanboats.com/plan-your-visit/


## v0.6.79 — animal shoreline sanity

A grounded path audit revealed the former Garden dog loop explicitly entered the lagoon and the former Common loop approached Frog Pond at water level. Both patrols are authored around their *existing* real park water-body bounds; new pure tests sample every patrol leg and reject water/Charles Street intersections. Pursuit movement also sidesteps along a safe shoreline tangent rather than dragging a dog across water. These are visual NPCs, not extra player collisions. A live AI/chase path recording remains necessary to verify that every dog turns naturally at water edges.


## v0.6.80 — Ether Fountain and interactive historic landmark

Added missing 1868 Ether Monument near in-game northwest Garden (-186,-73), based on Friends of the Public Garden + Smithsonian photos. Code-authored square granite basin with water, relief/arched faces, four rose columns, tall granite crown and sculptural Good Samaritan silhouette. Actual four-part basin rim and finite-height central plinth register physical solidity, not an infinite blocker; approach from all four sides requires a live walktest. Real E history interaction and pure layout/collider regression, no Field Notes count or save migration. No model licenses or AI images. This is an architectural approximation, not a survey/photogrammetry claim. Refs: https://friendsofthepublicgarden.org/our-parks/the-garden/ and https://www.si.edu/object/ether-monument-good-samaritan-sculpture:siris_ari_14517.


## v0.6.81 — MBTA game vignette: three real stops, fictional rat passage

Three surface E entries in correct park sectors: Arlington (southwest Garden, Green), Boylston (southeast Common, Green), and Park Street (northeast Common, Green and Red). Existing Park Street headhouse geometry is untouched. A deliberately compressed, stylized off-map **transit vignette** at (8000,-8000) has tile platforms, station signboards, yellow safety edge, animated Green and Red train props, attendants, bounded passenger silhouettes and an upstairs Red connection. Only authored public-side platform/connector rectangles are walkable: the train ROW is a non-walkable visual space, and player movement clips to the safe union. E returns to the matching surface entrance. A fictional small-animal culvert links the *existing* rat market room to a separate Park Street station alcove and back; it does not represent any real station service passage or convey access instructions.

At close range to the staff NPC, the squirrel receives a warning and is gently shooed back to the park after 2.3 simulation seconds unless hidden beneath a bench. The scene uses the same E action, mobile touch and existing cartoon relocation conventions. Train animation is aesthetic only and independent of collision. The time-based ridership state is a stylized simulation, not the MBTA's real timetable (rush / regular / last trains / overnight maintenance). Pure tests enforce station line identity, portal placement on walkable geometry, rail exclusion and crowd shifts.

Still needed: true WebGL browser test for all four portals, nighttime state, dynamic train scenery, worker warning; user iPhone Safari test; authentic platform/architecture study. No AI imagery, new external models or actual track-level player access.

Sources: [MBTA Park Street](https://www.mbta.com/stops/place-pktrm), [MBTA Arlington](https://www.mbta.com/stops/place-armnl), [MBTA subway guide](https://www.mbta.com/guides/subway-guide), [Boston Common entrances](https://www.boston.gov/sites/default/files/file/2023/05/BCMP_Executive%2BSummary.pdf).


## v0.6.82 — night-shift civilians and proper picnic hours

The new deterministic parkShift(hour) policy controls real moving passerby visibility and their E prompts, seated people, the vendor, picnic blankets and owners, as well as the live stealable blanket snacks. One nearby Park Street night worker replaces the unconvincing crowd of tourists and picnickers at 3 AM. The parked pretzel cart remains physical when closed. Night-shift rules are a stylized city simulation, not real schedule data. Test cases cover midnight, day/rush/evening, and cyclic hours. Further update applies the shared policy to dogs and wildlife.


## v0.6.83 — wildlife knows when to sleep

Existing five dog profiles and their leash/walker visual groups now follow the common NPC shift policy: no roaming dogs at 3 AM, reduced numbers around dawn and evening. Off-duty hidden dogs cannot threaten rabbits or squirrels. Surface squirrels are daytime, cottontails are crepuscular, and surface rats active at night. Resident tunnel rats stay active independently of park shifts. Wildlife disables outside its own realm including MBTA. No new models or global collision shapes; pure threat-policy regression ensures hidden dog exclusion. Next: active network navigation for underground rats and companion squirrels.


## v0.6.84 — food inventory regression correction

The v0.6.82 visibility guard mistakenly interpreted mock item meshes without an explicit visible property as invisible. True Three.js meshes default visible=true; the correct predicate is visible !== false. Preserve invisible nighttime blankets while keeping ordinary collectible food and legacy test doubles pickable. Existing food pickup tests are the acceptance gate.


## v0.6.85 — true shared underground NPC topology

Extracted the previously embedded ROOMS/CORRIDORS geometry into one **pure burrow-layout.js** used unchanged by existing player support/clamps. The prior six entrance chambers, storage and market are identical. Four rat couriers now traverse authored multi-room routes: hub↔market, eastern storage, western storage and lagoon entrance. Three new squirrel residents also follow the same connected passage graph, including the Garden and Frog Pond approaches. All seven actual 3D actors keep their moving E interaction prompts and never require off-grid wall penetration. A pure test samples every **20cm of every edge including the return-to-start leg** to prove it stays inside the exact world collision-room union. No new surface entrances, infinite currency, save migration, third-party models or AI images.


## v0.6.86 — close a real disconnected burrow corridor

The new every-20cm NPC navigation gate correctly caught a **3-metre hole in the original player walkable topology**: ring_w ended at X=-17, but spoke_w began at X=-14, with no walkable rect connecting them. This was an actual map defect, not an invalid NPC test. Added a short 3.6×3m joining corridor with overlaps at both ends, automatically rendered by the existing world-wall/collision generator. Route regression is kept strict; no arbitrary skip or tolerance inflation.
