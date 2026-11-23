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


## v0.6.87 — end-to-end park shifts and underground transit portal gate

The browser gameplay smoke now uses only actual E key actions, while localhost-only QA positions the player and sets game hour. It asserts zero picnic/benched/dog actors at 03:00 with one night-shift worker, the same actors restored at noon, Park Street station ground support, E hide/unhide, a full staff shoo back to park, a functioning burrow→MBTA rat passage, and reciprocal return to market/park. NPC population is accessed through a localhost-only read-only QA snapshot; no public/debug API is exposed in production. This is an additive acceptance gate alongside the original 12 real traversal routes and canopy/bridge/fence contact parity. Node pure unit tests alone are insufficient evidence of gameplay.


## v0.6.88 — actual subway entries and commuter agency

The preexisting Park Street headhouse remains. Arlington and Boylston now each have a code-authored exterior staircase/rail marker instead of invisible lawn-only E portals, with finite low physical colliders set aside from the E spot. The market-to-MBTA culvert now has an actual iron grating in the Red concourse and a sign inside the rat market. Eight simple commuter figures follow individual corridor-safe short paths, face nearby squirrels, and accept E interactions that occasionally leave food on a real station floor with 24-second cooldown. Continuous pure route tests forbid passengers from walking into the train area. Art remains stylized and the compressed station level is explicitly schematic, not MBTA architecture survey data.


## v0.6.89 — night danger and roost consistency

The dog-distance HUD was reading all dogs including off-duty invisible ones, warning of a nonexistent 3 AM dog. The query now ignores hidden/park-shifted dogs. Corvids are now daylight active: at night they roost, stop stalk attacks, abort in-progress swoops, but safely finish returning any food they already stole before settling. Existing crow photographic shot-mode tableau explicitly overrides this, so screenshot verification stays deterministic. Every night/day crow rule has pure tests; collision and food ownership remain untouched.


## v0.6.90 — actual browser failure resolved and the Park Street/Boylston map moved east

The 0.6.89 WebGL browser run proved desktop park scenes, desktop live movement up to the 3AM check, and actual mobile joystick/dual-touch/ACT tests, then failed exactly at "3 AM must not have six unattended picnics". The test used an arbitrary 300ms timeout while GitHub software WebGL was rendering below real-time; no real rendered frame need have processed the time jump. The new test waits up to 30s for the whole actual evening/midnight/day population state transition. Rather than skipping encounter checks, localhost-only QA can now advance the **real** MBTA update loop in bounded 50ms steps for staff warning/cooldown; E still boards, hides, returns, and exits. No public in-game debug hook.

Source comparison with Friends of the Public Garden and MBTA found a larger geographic error: the formerly authored Park Street glass headhouse and Brewer Fountain were near Charles Street at the *west* Common, and Boylston station wrongly sat at Charles/Boylston. They actually belong at the northeast/east Common near Tremont, while Boylston is at Tremont/Boylston. Moved the full physical Park Street headhouse with its roof support, Brewer water model and fountain solid collision to the northeast Common through shared pure anchors, updated the river of paved plaza contact, the fountain atlas pin and the actual MBTA E stair entry; moved Boylston's visual entrance/trigger to southeast Common. Added a real connecting north-east Common path around, not through, Brewer's existing 5m collision radius; kept old diagonal as an independent traversable Common connector. Screenshot poses for Park Street, Brewer, Washington at Arlington and Ducklings at Beacon/Charles now point at the monuments' updated homes. Brewer Fountain gains a proximity-checked E historical inspection.

New pure tests enforce those spatial and model-to-portal constraints. This is a real geography correction within still-stylized park coordinates, not survey-accurate terrain. The Garden bridge remains to be rebuilt as one coupled water/deck/goose/Swan Boat physics project, not a reckless prop rotation.

Sources: https://friendsofthepublicgarden.org/our-parks/the-common/brewer-fountain-plaza/ ; https://friendsofthepublicgarden.org/our-parks/visit/hours-and-directions/ ; https://www.mbta.com/guides/subway-guide ; https://www.boston.gov/sites/default/files/file/2023/05/BCMP_Executive%2BSummary.pdf


## v0.6.91 — no phantom fountain plaza; deterministic boat motion and correct boat skin colors

Follow-up on v0.6.90: a source audit located **three remaining visual ground paint layers at (-25,-58)** even though the actual Brewer Fountain, its collider and the walkable plaza top moved east. Both rendered wet/path-border discs AND the painted canvas path-plaza oval now read the same BREWER_FOUNTAIN position. An independent pure regression prevents the old footprint returning. This preserves physical/display parity instead of leaving a ghost plaza.

Software WebGL can render less than 1fps in the CI environment, so the boarding movement acceptance test now advances the real boat update clock in fixed ≤50ms steps through a localhost-only QA helper, just as the existing final-tour QA clock does. E boarding, E peek/hide, and actual dock exit remain real browser events. Also removed an ambiguous bitwise skin-tone index in instanced Swan Boat passenger coloring: it now uses a simple explicitly bounded modulo, producing valid indices for all three boats.


## v0.6.92 — parallel browser acceptance, no screen-first delays

The Playwright smoke used to spend several slow SwiftShader minutes rendering five scenes before testing desktop physics or touch. It now accepts SCURRY_TEST_MODE=gameplay, visuals or all; default all is backward-compatible. GitHub Actions launches two separate jobs in parallel with separate reports and artifacts: one runs full real-E, physics and mobile touch gameplay; the other verifies desktop/human-eye and mobile map screenshots. Existing QA routes and model/source tests remain intact; this is scheduling, never weakening a collision gate.


## v0.6.93 — browser evidence: actual burrow population, not pre-frame snapshots

The v0.6.90 browser run passed all requested 3AM/night ecology and MBTA staff shoo checks but failed after entering the underground because its QA snapshot read wildlife before a real frame had set realm visibility (headless SwiftShader often renders slower than real time). The E2E now explicitly waits for >2 visible UNDERGROUND actors after entering the burrow and, later, moves near a distinct SURFACE squirrel and waits for that realm to render before pressing E. The QA actor readout includes an underground boolean; no public hooks or simulated animal actions. A missing real resident will still fail after 30s rather than passing on stale actors. This closes a timing/data-isolation gap in test reliability, not a physics rule bypass.


## v0.6.94 — surface wildlife respects real colliders

The old surface wildlife AI guarded water and streets but not park benches, trees, solid monument plinths or fence rails. Surface squirrels, rabbits and the nighttime rat now validate each proposed movement step against the SAME indexed player circles, solid boxes and terrain-following perimeter walls, at species-sized radii. If blocked they try one legal sideways path, then the other; if both fail they wait rather than clipping. Simple local wildlife-to-wildlife separation avoids visible interpenetration, without adding NPC meshes to player collision. All hidden/remote wildlife is skipped. Uses one lazily initialized obstacle index after build and one reusable probe + movement object rather than per-frame large allocations. Pure tests cover movement caps, obstacle tangents, invalid inputs, reuse, and 1000 iterations against a circular trunk. Physical iPhone FPS is still a separate acceptance gate.


## v0.6.95 — park residents have social reactions, no rat invisibility

Before this pass, civilian wanderers occasionally stopped only for squirrels while ignoring cottontails and visible surface rats. Passersby now use one pure distance/reaction policy: pause and look at squirrels, stop longer for quiet rabbit-watching, and turn away along their EXISTING safe footpath from a nearby rat. Pauses have a 17-21s cooldown per walker; inactive night crowd, remote or underground actors are not eligible. The model clip switches to idle briefly, then resumes walking. No new WebGL meshes, extra interactions, currency, or geometry. Pure tests enforce distances and no reaction to invalid/out-of-realm animals.


## v0.6.96 — public T entrances on the park atlas, preserved 14 Field Notes

The park map previously had no indication where the newly playable subway stations were. It now draws three small T pins at the exact same Arlington, Boylston and Park Street surface E triggers used by gameplay. Their buttons join existing waypoint navigation, preserving all six original numbered landmarks plus Hollow Tree, and are **not** discoveries: no save key, Field Notes item, or schema migration. Opening the map while in the subway now reports THE T SUBWAY STATIONS and routes you back to public station stairs or the fictional rat tunnel rather than drawing a squirrel marker 8,000m off-map. Pure tests check station pin map bounds, isolation from Field Notes, and correct realm label. Existing mobile browser map smoke requires all three T controls.


## v0.6.97 — remove impossible Frog Pond pedestrian and ranger shortcuts

The old civilian wanderer selector included PATHS[6], the literal Frog Pond straight-line feeder at Z=12 from X=60 to X=112, right through the water ellipse (center X=95,Z=12). The ranger's route likewise connected (112,12) to (60,12), wading straight through the pond. Both now follow nearby actual dry paths: civilians use the bandstand-side PATHS[7]; ranger takes the southern dry approach via X=112,Z=42 and X=60,Z=42. A new Node regression extracts the **actual shared world PATHS and MAP data**, samples every segment INCLUDING loop closure every ≤35cm, and rejects actual world water/Charles Street intersections. This is a source-verified map/AI correction, not a new feature or weaker check. Player terrain/colliders untouched.


## v0.6.98 — CI caught an NPC waypoint misindex before release acceptance

The v0.6.97 pure 35cm path sampler failed (154/155 tests passed): our index change had mistakenly replaced the safe northeast Park Street entry route at PATHS[6] with the actual underwater Frog Pond feeder at PATHS[7]. The canonical world.js PATHS list includes an extra Park Street connector added in v0.6.90, shifting later entries. Restored CIVILIAN_PATH_INDICES to [0,1,4,6,8,11], precisely the safe original selection; retained the new ranger dry shoreline route and KEEP the strict sampling test. The regression now explicitly asserts index 7 is excluded. Lesson: array-index assumptions must be proven against the current world map, not stale comments. No reduction in collision or walkable requirements.


## v0.6.99 — two real Garden sculptures become actionable

Both **Make Way for Ducklings** (Nancy Schön, 1987, eight children of Mrs. Mallard) and **George Washington equestrian monument** (Thomas Ball, unveiled July 3, 1869) now expose E inspections at the actual authored sculptures near Beacon/Charles and Arlington entrance. One pure sculpture facts layout sets both geometry coordinates and interaction anchors, and existing 14 Field Notes remain unaltered. Interactions verify same realm and real feet height, never allow an arbitrary remote or elevated trigger, reuse HUD toast and E touch. No new geometry/images/colliders, no changed game save or art licenses. Sources: https://publicartboston.com/content/make-way-ducklings , https://friendsofthepublicgarden.org/our-parks/the-garden/ .


## v0.7.0 — bronze Ducklings are actual eight obstacles, not one ghost circle

The old Make Way for Ducklings scene had a 1.6m invisible cylinder blocking a large section while eight separate duckling meshes were completely non-solid. Replaced it with a 0.73m mother collider and **eight 24.5cm finite-height duckling circles**, each positioned by the EXACT pure local-to-world transform that builds the corresponding bronze mesh. Matching cobblestone pad follows the parade. No scene artwork or saved discovery migration. Pure regression tests verify eight unique poses, no extreme overlaps and world-space parity; live browser gameplay now requires actual E prompts at the Ducklings and Washington without bypassing the interaction handler. This is a source-geometry and physics fix, not a new unnecessary feature. Boston sculptures remain code-authored approximation.


## Experimental v0.7.1 — east-west Garden bridge and north-south lagoon (isolated feature branch)

The City historic Garden study identifies the bridge on the Commonwealth Mall↔Boston Common central east/west axis. The existing world instead drew a long east/west lagoon ellipse with a north/south bridge; swapping only the bridge would strand it in open water. This isolated feature branch **co-updates** the Garden lagoon to a stylized north/south ellipse, east/west bridge visual transform, registered walkable deck/landing/rail colliders, paths/terrain/water mesh/curbs, goose patrols and landing justice, two north-lobe drifting boats, south-lobe Swan Boat dock/stowaway loop, camera poses, and browser bridge support selector. A pure geometry suite checks deck width/span, dry endpoints, physical dock parity, complete CatmullRom route and source registration. No AI imagery or third-party models.

**Limitations**: even with the axis corrected, this is still an elliptical approximation rather than the real Garden's irregular lobes. More importantly the existing bridge remains too low for the current exaggerated Swan Boat canopy; there is NO under-bridge cruise promise. A dedicated water/visible mesh/deck clearance rewrite and iPhone/desktop collision walktest is mandatory before considering production. This branch must stay isolated and NOT be merged to main if CI, playtest or visual parity fails.


## v0.7.1 PR — bridge ramp parity and dry shoreline cleanup

The initial draft PR passed desktop and mobile WebGL gameplay/visuals, but its quality gate caught an invalid semantic version suffix. The version is now numeric 0.7.1; prerelease status is represented by the draft PR. The bridge formerly had two flat invisible support slabs 0.65m below the visible deck. Now it has six-metre visual sloped triangular ramps registered as identical graded surface boxes, with stone edge cheeks and lowered end abutments. Playwright will independently raycast the visible ramps against player support heights.

The reshaped north–south lagoon left some old-coordinates props submerged. Garden benches, lamps, a trash can, one Gamewell box, two bottle caps and a lagoon burrow entry are repositioned onto dry nearby paths and shore. The visual and collider registrations share the same position definitions. New pure tests validate dry surface props and physical ramps without overriding gameplay.


## Branch acceptance: real bridge/approach triangle survey

The localhost browser now traverses **225 separate world positions** across the physical bridge and two six-metre approaches (75 X coordinates, three Z offsets). A real Three.js raycast against the tagged visible deck and ramp meshes independently compares their rendered Y with (1) registered physical support and (2) the player walkSurface() solver. Either a missing triangle, a missing support, or a gap greater than 1.5 cm fails full WebGL. The visual suite also adds independent bridge-alignment, swan-dock and on-deck geese screenshot poses. Additional pure tests verify exact ramp end continuity, slopes, old submerged prop relocation and source coupling. The feature remains isolated from main until verified.


## Bridge route acceptance and hull envelope

The full north/south lagoon forced an extra physical boat check: the original moored Swan Boat (-143,43) was inside the ellipse at its center but grazed the waterline with its 10m-long hull. The moored craft is now (-140,44), 35cm from the dock's near plank edge; stowaway Catmull-Rom waypoints are eased to avoid the shallow southern turn. 2,001 independent route samples enforce a whole-boat five-metre margin inside water, not just the center point. The branch's localhost browser also performs two complete real-player W+Shift crossings from both dry banks (1,000 physics steps apiece), requiring 57m travel, dry opposite shore, feet above rendered ground, a continuous deck top and at most brief ramp-air transitions. This is in addition to the 225 registered-support/visual raycasts. Goose actions stay independently checked by the normal update loop.


## v0.7.1 PR — goose territory is the walkable deck, not the water beneath

The old broad bridge-height tolerance accepted feet up to 1.3m below the raised platform, so near-surface swimmers could trigger goose threats and submerged snacks could be mistaken for deck offerings. The shared deck predicate now accepts feet 12cm below through 65cm above the actual deck top. A grounded squirrel, small hop and plank food qualify; water below or canopy above do not. Both warning and food collection use that same 3D predicate. The dropCarried flow now places dropped food on the exact bridge deck if squirrel and snack are inside the rails, while off-bridge snacks retain normal ground-fall behavior. Pure tests enforce height and source coupling. Existing ramps, moving boat, dry landings and Atlas are unchanged.


## Real food regression harness updated for the shared Garden layout

The first goose-height tightening commit failed fast CI (not browser) because tests/food-regressions.mjs embeds production food.js as an in-memory module and did not stub the new pure Garden layout import. Rather than weakening/removing that regression, the harness now loads the true garden-lagoon-layout.js module into its existing test fixture and replaces the food import with exact pure functions. Added a runtime production-food test for released snacks on the planks, over the rail, and from the water below: deck food Y1.15, off-deck food groundY0; also asserts floorY survives updateFood. The previous food/market/bury tests remain.


## One exact food-bob regression adjustment

The additional runtime food-on-planks test initially failed 1 of 171 checks because the assertion required rendered food to remain *exactly* 1.200 metres after updateFood. Production intentionally adds a sinusoidal ±8 mm pickup-glint bob; the dedicated mesh-visual test now asserts the actual tight ≤8.001 mm envelope while separately keeping floorY fixed at exactly 1.15m. This fixes a wrong expected rendered pose without changing gameplay, lowering floor accuracy or deleting a test.


### Garden Phase II — living island + unified shoreline (feature branch)

- Authored a 96-edge organic lagoon polygon and a 32-edge island hole,
  explicitly situated north of the east/west bridge. Historic Garden aerial
  and TCLF support a real island (former northern peninsula); the proportions
  remain artistic local metres, not a survey.
- One shoreline controls water mesh triangles, exposed terrain, substrate
  paint, the map, underwater fog, wildlife wet feet, curbstone locations,
  and boat full-hull safety margins. Island is physically raised terrain
  with no water plane over it; not a transparent decal.
- Adjusted BOTH drifting north-lobe Swan Boats to stay more than 5m clear
  of the island and shoreline. South-lobe passenger tour remains confined
  below the bridge because the drawn swan head/canopy cannot clear the
  current underside; under-bridge routing is a separately gated Phase II
  milestone (issue #11). Do not enable it without real mesh-to-mesh proof.
- Runtime QA independently raycasts more than 1,600 actual THREE water
  mesh samples against the water/island hit predicate and includes the
  new Garden island camera in visual CI. These checks are not a substitute
  for physical iOS Safari testing.

- An isolated island tree and three natural boulders now sit on the
  actual raised soil. Trunk/boulders use real height-bounded colliders;
  its canopy is a walkable platform. It spawns after the canopy-route
  planner so no impossible branch bridge gets invented across water.

- Island shore grades are coupled on BOTH sides of the waterline
  (3.4m shallows outside, 3.4m terrestrial rise inside). This
  avoids a 94cm vertical terrain discontinuity that prevented
  squirrel-scale water-to-island access. Regression samples at 10cm
  increments, requiring under 5.5cm between samples.

- Release target v0.7.2: the existing 56-second tour, dock E,
  bridge geese three routes and real two-direction foot crossing are
  explicitly preserved, not redefined to claim an untested underpass.
  Quality: Node assertions, game WebGL, visual WebGL, mobile touch and
  GitHub Pages must all be green before production merge; actual iOS
  Safari hardware still remains a separate field test.

- Final island mesh-parity fix: the 2.9m terrain-grid triangles used to
  interpolate shore vertices that dipped below the water's y=0.02
  surface, even though the analytic bank rose above it. A 2.8m
  zero-depth underwater shelf around the island now decouples those
  triangles from the 60cm deeper lagoon bottom. The actual browser
  terrain mesh is independently sampled across the dry island to prove
  there is no below-zero patch at squirrel foot height.


## v0.7.3 — real Swan Boats have no passenger canopy

The earlier code-built craft used a full white arched canopy with scalloped
skirt over its passengers. Actual Boston Swan Boat reference photographs
show five open-air red bench rows, a long green hull with black trim,
ten exposed riders and a white mute swan sculpted at the operator's aft.
Removed both procedural canvas textures, roof pieces, valances, four
false roof posts and roof rails from all three actual Three.js craft.
The fleet retains its physically boardable dock, seat rows, two instanced
passenger layers, working crew glance, swan face and full swan head height.
New explicit seat/back/hull mesh tags permit actual runtime WebGL
geometry/color and world-bounds inspection, including five red bench
seat + five back meshes per boat.

Accepted only with Node + Chromium gameplay and visual (including
mobile touch) tests. No under-bridge passage is claimed: the real swan
head still cannot clear the current too-low bridge slab (issue #11).
Do not change the 56-second route until coupled bridge and moving
boat geometry clear every position including bob and roll extremes.
Historic reference photographs:
https://cdn.jewishboston.com/uploads/2018/06/swan-boat-1.jpg
https://images.trvl-media.com/place/507376/415181d0-41d5-45fa-a573-e8b82edb739b.jpg


## v0.7.4 — ACTUAL full-lagoon Swan Boat underpass (draft gated)

The historical route should go SOUTH-to-NORTH under the Garden bridge,
round the northern rocky island, and BACK under the bridge to the dock.
v0.7.2/v0.7.3 deliberately withheld this until source geometry agreed.

- Shared Garden layout curve: end deck Y=1.15m at both dry shore
  approaches, top crest Y=4.55m, 50cm deck slab, 4.05m underside at
  centre. Smooth symmetric quartic elevation. This is a game-scale
  artistic approximation, not a measured Boston engineering dimension.
- The former 48m flat slab and decorative false arch are fully
  REPLACED by a triangulated real arched walking deck, separate
  triangulated visible underside, stone fascia and 48 adjacent 1m
  collision slabs y0/y1. TWO old six-metre shore ramps remain continuous.
  The real registered rail walls/jump-only collision tops, 4 cast-iron
  towers, suspension cables, rods, balusters and glowing lamps all
  follow the SAME foot elevation (no invisible flat collider).
- Geese spawn/charge/waddle at their exact world-x height on the deck;
  they only pursue an actual player ON that deck, never a boat below.
  Dropped food rests on the curved height sampled at its ACTUAL
  released world x, not an assumed flat plank.
- Passenger route 22 CatmullRom control points and 56 sec
  2,001-sample pass, long ~206m; full south+island circumnavigation,
  with >5m safety to the true irregular shoreline ring at centreline.
  Two ambient boats are separated on safe outer southern alcove loops,
  and all 72 phase offsets at 2,001 route samples are checked to keep
  BOTH independent full 5m hull envelopes from overlapping.
- Real independent browser QA walks the moving boat full model: uses
  every Three.js vertex transformed from actual seat, passenger,
  hull, stern operator and decorated swan meshes. Scans 1,801 points
  across the entire trip in three bob/roll extremes; clips vertices
  to the bridge width and compares to the ACTUAL 48-segment underside
  mesh triangles (not just the authored quartic oracle). 97 raycasts
  independently verify the exact rendered underside interpolation.
  Requires >=15cm vertical clearance at all bridge crossings.
- Another browser QA projects the complete boat geometry into a
  conservative 2D convex hull and samples every hull edge three
  times against the real organic outer bank and island shore; insists
  on >35cm horizontal clearance despite +/-0.025rad physical bob/roll.
  No fake boat path through banks.
- Reuses the 225-point rendered bridge-vs-registered support survey,
  real foot solver registered crest and TWO 57m+ physical shore-to-shore
  crossings; player stands above 4.4m on the bridge. Desktop, mobile
  touch, all route boarding/return and iOS-emulated Chromium visual
  diagnostics remain mandatory. New dedicated underpass camera shot.
- Physical iPhone Safari, actual Boston exact bridge measurements,
  licensing of third-party assets and outdoor GPS-level dimensions
  remain out of scope. Site only merges after full branch CI.
- Source references: official Swan Boats history and Friends of the
  Public Garden on real island circumnavigation/bridge underpass;
  HistoricBridges.org and Historic New England on the bridge.

### Dock collision and squirrel-eye visual corrections

The prior close-up visual QA accidentally placed its virtual squirrel
INSIDE the real dock's back-corner crate, creating the appearance of a
giant brown obstruction. The new camera stands on an open aisle and
faces the five open red seats, green hull and real swan without the sign
or wood crate between them. The underpass screenshot now views from a
quiet north-eastern waterline, avoiding the drifting western Swan Boat
that previously monopolized the shot.

The actual dock now has FOURTEEN registered, height-bounded collision
solids: eight underdeck mooring piles, two low bollards, one coiled
mooring rope, one corner wooden crate, and two SWAN BOATS signposts.
Each shares the corresponding physical artwork X/Z/Y extents; the old
real standable dock deck remains at Y0.45m and is unchanged. A runtime
QA survey independently checks all 14 live colliders and deck height,
with the original full 56-second ride/boarding/exit suite still required.

### Swan Boat pacing — continuous arc-length traversal

The original CatmullRom route parameter divided 56 seconds evenly among
22 unevenly spaced control points; that inadvertently accelerated the
pedal boat through long stretches and decelerated it around the island.
The redesigned pure swan-ride-rules.js calculates a 1,409-entry
cumulative arc-length lookup once at module initialization, binary
searches target travelled distance per update, and interpolates the
original spline parameter. This changes neither the water route geometry
nor the timing, dock, physical hull corridor or camera action. It
keeps world-space speed approximately 3.68m/s (intentionally
game-compressed versus the real 15-minute public ride), and a pure
Node regression enforces under 3.5% step-to-step chord speed variance
across 1,000 time samples, with a closed positional/heading seam.

- Two separate safety checkers now require EXACTLY two passage
  events at x within 2m of the actual bridge centre, first
  south-to-north and then north-to-south. The pure spline test
  validates the deterministic route and the Chromium checker
  independently samples 1,801 real gameplay poses; this prevents
  accidentally regressing to a single bridge crossing.


### v0.7.4 further hardening: exact visible triangle-to-bridge underpass intersection

A previous browser sweep examined every transformed Swan Boat mesh *vertex*
at three bob/roll extrema and separately raycast the actual bridge underside.
That proves the corners, but a large triangular face can still cross the bridge
boundary or the 48-piece arch between its original corners.

The QA now enumerates actual mesh triangle indices (including instanced
passengers), transforms them with the actual moving boat group, clips each
triangle first to the real bridge X/Z footprint and then to individual
one-metre underside strips. Over each resulting polygon, both the face and
the underside are linear; evaluating the generated vertices finds the exact
minimum face clearance at that sampled pose. Conservative interval bounding
can skip low triangles that have more than 2m certified clearance.

Acceptance is at least 0.15m face-to-undercarriage clearance including
0.05m bob and doubled conservative roll/pitch, with explicit counts of
triangle faces, intersection probes and new bridge-boundary vertices.
This is not a physical iOS Safari hardware test or a licensed real-world
engineering clearance claim.


## Photo-parity Garden Pylons + Swan silhouette, v0.7.5 isolated

Relative photo sources: JewishBoston's Swan Boat passing the actual
bridge, Meet Boston's dock aerial, Fairmont Copley Plaza's side-on scene.
This deliberately retains the island and two physically proven boat
passes while addressing the v0.7.4 visual exaggeration. The photographed
bridge walkway has a gentler crest and shorter stone lamp pylons; the
carved swan's neck is closer to the passenger-head scale. No single
photo provides a dependable engineering measurement.

- Coupled reference geometry: bridge remains 48m in game world and
  uses exact TWO end ramps, but quartic arch rise is 2.05m (crest
  Y3.20m) instead of 3.40m; deck thickness 0.35m, underside centre
  2.85m. 48 true walkable indexed deck strips, raycast underside
  and the goose and food-height calculations continue to share it.
- Carved swan figurehead retains its full body width, body, wings,
  beak, crest and the five red passenger rows, but its actual group Y
  scale changes to 0.55 (historically more believable proportions).
  This *also* scales the real visible vertices checked by QA.
- Four photo-proportion granite bridge piers now extend continuously
  from below water Y-0.42m to 3.30m over the local walkable deck at
  the suspension tower positions, with a matching full-height
  collision solid per pier. Lamp centres are 3.53m over local deck
  rather than 5.55m. Cable hangers follow the physically revised
  bridge profile and attach to the shortened pylons; a central
  cable droop is preserved, not just a cosmetic post shrink.
- New real Three.js Box3 audit measures all four visible pier
  boxes vs the exact minimum/maximum heights and plan footprints
  in S.solids; applies before accepting any visual screenshot.
- Crucially, the entire actual clipped boat-mesh-to-rendered
  underside sweep, 225 raycast deck/physics samples, two 57m
  player crossings, geese and food height, dock and island QA
  are NOT weakened. The branch remains gated until all pass.
- Photo calibration is qualitative and game-scale. Do not claim
  exact historical height, measured clearance, or native iPhone
  Safari hardware acceptance.

- Pier grounding strengthened: water Y0.02m is NOT the actual lakebed.
  All four stone columns now extend to Y−0.95m, and the browser
  independently casts a downward Three.js ray against the ACTUAL
  triangulated park terrain at each column. Acceptance requires the
  physical/visual box heights match within 1mm and each stone base is
  embedded at least 12cm into rendered soil, not only below water.


## v0.7.6 — operator-powered Swan Boats / Victorian physical bridge infill

Official source https://swanboats.com/history/ confirms the real
five-bench hull can accommodate about 20 riders, not SCURRY's prior
two-per-row ten silhouettes. Authored 4 separated rider positions
per bench, 20 live color/skin instances per craft. **Still exactly
two InstancedMesh draws for heads/torso per hull**; no new model assets.
The game deliberately retains three safe independent Swan Boats; the
real six-craft fleet cannot simply be pasted into this smaller lagoon
without six independently cleared full-hull paths.

The real driver pedals the wheel concealed inside the iconic swan.
Two actual dark shoe meshes and small visible axle are attached to the
human operator, cycling in exactly opposite phase. A tiny exported
pure swanPedalPose(seconds,side,out) moves existing THREE.Vector3
positions by absolute time and is completely frame-rate independent
and allocation-free on the live tick. Tests validate opposite phases,
closed 2π periods, seat distances, and the actual rendered instance
counts. This does not claim an accurate internal paddle-wheel mechanism.

Bridge photo detail: the prior four stone pylon tops had globes
almost directly glued onto their caps; actual archival and modern
photographs show narrow iron stems atop stone. The granite caps are
reduced from 3.30m to 2.62m above each actual arched deck support,
and four newly rendered ~0.71m cylindrical iron stems are registered
as *four additional height-bounded solids* matching real mesh bounds.
Every pylon still embeds ≥12cm into the independently raycast lakebed.

One new instanced draw of 192 real angled iron X-lattice members
fills the 48 historical bridge-side panels twice each on both sides.
Each diagonal follows real graded local y and stays entirely within
the 96 continuously registered S.walls physical rail panels; WebGL
surveys the actual instance matrices against the actual wall endpoints
to disallow any decorative ghost bars. Removed the previous three
unphysical cross-beams spanning the squirrel walking corridor at
each pylon. The 225 independently raycast bridge deck points, fully
clipped boat triangle clearance through both underpasses, geese,
shoreline, dock and mobile gameplay acceptance remain unchanged.

No exact historical dimensions claimed, no uncertain-license art,
no game build step, and physical iOS Safari testing is still required.

- Operator pedal-arc safety: a 13cm-high visible shoe is centered
  at 0.94±0.12m, keeping its bottom ≥0.755m over a real visual deck
  at Y0.73m through all phases. Previous preliminary 0.86±0.12m
  would have penetrated the wooden deck 5.5cm at the low crank
  extreme; corrected before release and covered by 100-step
  deterministic phase regression.

- First full Chromium gameplay run caught a production boot blocker:
  the operator crank axle accidentally referenced cableMat, a material
  scoped only inside buildBridge(), from buildSwanBoats(). Node had
  not executed scene construction, so its 195 static/pure regressions
  missed the ReferenceError. This was corrected to module-scope
  greenMetal (same scene color language), and a new cross-scope
  source regression locks the fix. No merge while the latest real
  browser scene boot/interaction suite is unverified.

- A **production v0.7.5 main** Chromium visual rerun reported
  two PLAYWRIGHT screenshot timeouts at the default 30s, while the
  other seven visuals, the full live gameplay suite, Pages deploy
  and source/physics gates passed. It reported NO JS or WebGL errors.
  The exact failed visual job was retried independently; this PR's
  visual harness keeps every screenshot mandatory but grants 60s
  for the first SwiftShader software-rendering capture per scene.
  This is a CI capture deadline adjustment, not physics tolerance,
  screenshot omission, or game frame-rate reduction.


## v0.7.7 — Earned Duck Island landfall Field Note

Duck Island is now a navigable atlas pin and 15th persistent discovery.
The squirrel must be grounded with feet within 38cm of physical island
terrain, and inside the real shared island polygon, to earn the note.
The Swan Boat tour, swimming nearby, canopy jumping and remote realms
cannot credit island landfall. Existing scurry-field-notes-v1 save data
is retained without migrations or changed ID meanings; players who
previously completed all 14 notes will find one new discoverable entry.
No new 3D draw calls, models, imagery, geometry or tutorial overlays.


## Mobile cold boot — Fenway neighborhood demand-loading (isolated quality PR)

The 2.60 MiB BPDA Fenway neighborhood GLB (38,297 source triangles)
no longer downloads when an ordinary player starts in Boston Common.
Procedural Fenway neighborhood roads and the CITGO sign are still built
immediately, but the heavier backdrop loads once when the player actually
enters Fenway via E or asks for a ?shot=fenwayhood screenshot.

- The background load is idempotent and creates no teleport, no player
  ground mutation and no change to the field's independent height grid.
- It preserves the existing best-effort offline fallback, city lights
  registration and existing shot-mode whenModelsSettled readiness.
- Browser regression listens for actual HTTP requests: Common-only
  = zero neighborhood GLBs; Fenway E arrival = exactly one request;
  fenwayhood photo pose = one request and a full visual screenshot.
- This is network-byte avoidance, not an unmeasured claim about iPhone
  frame rates. Physical Safari real-device acceptance is still open.
- The larger TD Garden 6.66 MiB GLB remains eagerly loaded, and
  need separate safe portal/ground support handling (#8). No new
  licensing rights are created by deferring the Fenway asset.


## v0.7.9 — demand-load 6.66 MiB TD Garden without moving player feet

- Existing v0.7.8 Fenway demand-load behavior and 0.7.7 Garden lagoon/bridge gameplay retained.
- Ordinary Boston Common boot no longer requests assets/models/garden.glb. The arena GLB (~159,329 source triangles, 6.66 MiB) requests only when the player explicitly presses E on the market NORTHBOUND portal or selects a TD Garden QA photo.
- A procedural 28.7m × 15.2m court and centre ring supply a y=0 visible floor and existing return door during slow/offline loads. No model content, save-file or licensing changes.
- The loaded arena's triangle-derived height grid is **committed together with its visible mesh** when the player is outside the Garden; if the network resolves during a live visit, installation is deferred until the player exits. The next E calculates spawn feet against the now-active model grid. This avoids asynchronous floor-height jump/clipping. An explicit screenshot mode can install immediately, before its frame-settled barrier.
- One memoized request; explicit idle/loading/deferred-floor/ready/fallback state; browser counts requests at cold boot and actual portal and screenshot entry; regression protects model ownership and absence of surprise realm movement.
- Follow-up: real iPhone Safari waterfalls, blocked-asset simulation, actual mobile FPS/thermal measurements; do NOT claim performance beyond skipped network/decode at cold boot.

- When the arena GLB never arrives, a dark procedural 116 × 100m
  interior surrounds the basketball court at y=-.012. This is
  aligned beneath the fallback terrain's y=0 support, not an
  invisible collision platform under a black void. The entire
  fallback group is hidden atomically when the source model and
  sampled real seating terrain are safely installed.

- A live Playwright E test now holds the actual Garden GLB HTTP request
  until the squirrel has entered the procedural court. After releasing
  the download, verifies zero change in floor or foot position when the
  model finishes loading; a **real E return** activates the full
  model+sampler, and a second **real E visit** begins at the sampled
  height with no duplicate HTTP request. Separate blocked GLB screenshot
  proves the fallback's y=0 physical floor and an actual WebGL frame.


## v0.7.10 — dogs respect the actual park collision world

All five scheduled dogs now evaluate each patrol, chase and flee step against
the same indexed circles, boxes and graded rail segments that stop the player.
The old water and Charles Street guard remains in force. A blocked forward
step tries one deterministic shoulder and then the other; if neither is clear,
the dog waits rather than clipping through a tree trunk, bench, fence or other
registered park solid.

Dogs deliberately stay non-solid to the squirrel and other gameplay actors:
this avoids a pack pinning the player in a corner or creating a second
dynamic-collision feedback system. The existing breed behaviours, leashed
walkers, day/night visibility, food-loss boop and nose-bite escape all remain
unchanged. Pure regression coverage proves both shoulder selection and
no-legal-step waiting, and locks the runtime to the live obstacle registry.
