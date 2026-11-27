# SCURRY

A first-person squirrel game set on Boston Common + Public Garden.
You are a squirrel. Beg from humans, steal from picnics, bury everything,
mind the dogs, the ranger, the bridge geese, and the crows. Below the park,
the rats run a market. Winter is coming.

**Play it live: https://scurry.cold.fyi** (this repo is the site - GitHub
Pages serves `main` at the root). Or serve this folder statically and open
`index.html` (e.g. `python3 -m http.server`). No build step. Three.js loads
from CDN via the import map in `index.html` (pinned: three@0.160.0).

## Engineering & quality gates

- [Engineering wiki](docs/ENGINEERING-WIKI.md): architecture, simulation invariants, collision contracts, world expansion, assets and mobile performance.
- [Public 3D model pipeline](docs/MODEL-SOURCING.md): provenance and licensing, scale/LOD budgets, world quality and reusable intake process.
- [Screened public 3D model candidates](docs/MODEL-CANDIDATES.md): exact original CC0 item pages, art-fit verdicts and references; unimported until source/quality clearance.
- [Model provenance inventory](assets/model-provenance.json): all 24 3D model and dependency files, including honest open review status.
- [Playtest & troubleshooting](docs/QA-PLAYTEST.md): repeatable desktop/iPhone collision routes, telemetry (`?diag=1`), evidence template and limitations.
- [Engineering decisions](docs/DECISIONS.md): why the controller and mobile lifecycle work the way they do.
- [Agent guide](docs/AGENT-GUIDE.md): the long-form implementation history, asset decisions and honest known state.
- [CI](.github/workflows/ci.yml): syntax checks, pure Node physics/input regressions, and static no-build/mobile invariants on every push/PR.
- [Headless WebGL smoke](.github/workflows/browser-smoke.yml): Chromium/SwiftShader runtime boot, still screenshots, real desktop PLAY/WALK/JUMP/PORTAL round trips, simulated mobile dual-touch controls, optional map/notes checks, and screenshots/console artifacts on pushes to main.

**Current version: v0.7.14.** Dogs, the ranger and human walkers now tread the same rendered surface as the player (visibleGroundHeight: mesh triangles + path/plaza tops) instead of the analytic hill formula - they no longer sink up to ~6cm into paths, the Mall apron and plazas, or diverge from the lawn mesh on hills. (v0.7.13: nocturnal rat scavenging, below.) The nocturnal surface rat now has a real scavenging loop: it investigates only nearby, visible loose food at night, visibly takes it, and then pauses before hunting again. It never consumes carried food, hidden picnic food, or anything in the burrows. Existing dog UX, resident courtesy, mobile cold boot, real Garden geography, living schedules, MBTA, humans, wildlife and Swan Boats remain intact. Physical iPhone Safari FPS/thermals remain unverified.

## Controls

Desktop:

| Input | Action |
|---|---|
| WASD + mouse | scurry / look (pointer lock) |
| Shift | sprint |
| Space | big squirrel jump (strong air control - tail-steer) |
| Push into a trunk | climb it; canopy tops are walkable; leap tree to tree |
| E | beg / take food / snatch picnic food / raid trash / slip through knot-holes and burrow mouths |
| F | bury carried food on grass (stash +1) |
| Left click | BITE - a comic boop; escapes dogs and the ranger |
| M | mute |
| G / MAP | toggle the hand-drawn park atlas (landmarks, paths, direction) |
| FIELD NOTES inside MAP | view the 14 optional discoveries you've visited (saved locally) |
| Map landmark number | select/clear an optional compass waypoint with metre distance |

Mobile (touch devices get a full control layer - no pointer lock needed):

| Input | Action |
|---|---|
| Left stick | move (analog - tilt further to go faster) |
| Drag right side | look |
| SPRINT button | sprint toggle |
| JUMP / BITE / ACT / BURY buttons | jump / bite / interact / bury |
| MAP button | park map (home realm); remote destinations show their own title |
| FIELD NOTES inside MAP | open the exploration checklist; discoveries save separately from stash |

No fall damage. Squirrels do not take fall damage. This is science.
If the ranger nets you, you wake up on the bandstand roof and your stash
loses 25%. Relocated, never harmed.

## What's new in v0.6.46–v0.6.55

- **Doors that land properly.** Hollow and all four burrow destinations restore grounded player state on their real physics floors, not 40cm above them.
- **Desktop fallback that actually works.** When pointer lock is denied, drag the scene to look and click the scene to BITE. Map/HUD clicks cannot trigger attacks. Pausing, tab switching and resuming release stuck keys.
- **More dependable phone performance.** A reversible graphics-quality ladder uses real frame time, not capped physics time; the static 3D background renders less while paused, and procedural birdsong/crickets suspend with gameplay.
- **Field Notes.** Open MAP → FIELD NOTES for fourteen places and experiences to discover around the Common, Garden, canopy and hidden realms. Notes save locally and independently of your stash.
- **A compass, not a quest.** Select an atlas landmark to see a small optional direction and metre-distance guide. Tap it to clear. No permanent HUD clutter or pretend pathfinding through fences.
- **Real browser tests.** Permanent WebGL smoke now clicks PLAY, walks, jumps, exercises mouse fallback, visits every realm through real E prompts, and tests simulated simultaneous mobile stick + jump + ACT controls. The suite keeps screenshots and diagnostic evidence on failure. It's not a substitute for a physical iPhone.

## What's in v0.6.31

- **The fence line got its depth.** Every building face
  around the Common and the Garden now has real windows -
  recessed glass and stone trim standing proud of the
  paint, all the way around: the big ring blocks behind
  the park, the Boylston row across from the Garden, the
  Arlington Street wall. Stand at any fence at dusk and
  the city reads as buildings, not boxes.
- **The water is alive, quietly.** The Brewer Fountain's
  foam breathes where the falls land, and the lagoon and
  Frog Pond surfaces shift almost imperceptibly as you
  watch - the reflection breathes. Stare at the water by
  the bridge for ten seconds. It is doing something.
- **Swan boat details.** Open-air red-painted seats and green hulls, a
  dark waterline where the hulls meet the lagoon, real
  wood grain on the benches, and the moored boat's dock
  has picked up a coiled rope and a crate, like docks do.
- This is the home map's polish pass - the Common and
  the Garden themselves, made as right as they can be
  made. The burrows still run everywhere they ran.

## What's in v0.6.30

- **The burrows run north now.** The rat market has a
  fourth door - north wall, west of the Exchange stall,
  signed RIVERBOUND / THE ESPLANADE. It lets out in a
  mulched tree bed on the Charles River Esplanade: the
  Hatch Shell on its granite pad, the audience oval,
  the gravel path, elms you can climb, and the river
  itself, wading-depth at the bank with stepping stones
  out to a trophy cap. Cambridge is across the water,
  being a skyline about it.
- **The river is real water.** It runs on the park's
  own water system - duck your head under wading out
  and the world goes the same green murk as the lagoon.
  A line of buoys marks where it gets deep. It gets
  deep.
- The shell model is the City of Boston's own 3D data
  (BPDA, public domain) - the same open-data family as
  City Hall and the Fenway neighborhood shells. It is
  a massing model: the silhouette is the building, the
  inside is nobody's business.

## What's in v0.6.29

- **The burrows run east now.** The rat market has a
  third door - south wall, signed EASTBOUND / CITY HALL.
  It lets out through a planter on City Hall Plaza:
  eleven acres of brick, the ceremonial steps, a
  fountain you can wade in, the Government Center
  headhouse, and the building itself - nine floors of
  argument, poured in concrete, 56 metres of it,
  standing on its podium exactly like the real one.
- **The plaza is empty and it is all yours.** No dogs,
  no rangers, no geese with opinions. Five bottle caps
  are stashed around it, including one on the podium
  terrace at the facade's feet - the squirrel's-eye
  view the architects argued about. Pretzels by the
  headhouse. The T will not take you anywhere, but it
  looks great.
- The building model is the City of Boston's own 3D
  data (BPDA, public domain) - the same open-data
  family as the Fenway neighborhood shells.

## What's in v0.6.28

- **The holdouts + the water pass.** The home park's
  last details, finished:
- **The swan boats got their dock.** A third boat sits
  moored at a new dock on the lagoon's south shore -
  canopy up, scalloped skirt on the canvas, her swan's
  wings raised the way the real one's are. The dock is
  standable. Go stand on it. The other two still run
  their loops.
- **The Brewer Fountain flows.** The falls are animated
  water now, tier to tier. One texture, scrolled - the
  bronze didn't move, the water does.
- **Wading reads as wading.** Duck under the lagoon or
  the Frog Pond and the world goes properly murky -
  surface overhead, bed below, visibility about as
  good as a squirrel deserves. Before this it looked
  like a dry beach under a missing ceiling.
- **Park Street has stairs.** Inside the headhouse
  glass: a landing, treads, a handrail, and a light
  that burns after dark. Beside it, the open entrance
  stair got its granite cheeks and iron railing.
- **Golden hour, warmed a notch** on the ground for
  the 17:00-18:30 stretch.

## What's in v0.6.27

- **The priority pass: the home park, finished first.** Per
  Richard's call (Nov 17 2026) the Common + Garden's
  perfection outranks every destination - so:
- **Every elm is a hero now.** Hero GLB coverage went from
  55 of 123 trees to 121: every scatter elm on the Common
  and in the Garden wears a sourced canopy. The two
  holdouts are deliberate (a hand-tuned Mall waypoint elm
  and a bare snag). Draw calls at spawn FELL by a quarter
  (724 -> 546) - a hero is 2 meshes where a procedural elm
  was ~11 - for +96k triangles of real canopy.
- **Landmarks at squirrel height.** The Brewer Fountain
  RUNS: water spills tier to tier into foam rings, and the
  basin grew a stone lip. The Monument's four corner
  figures are composed statues now (robes, arms, the lot),
  and its summit figure has arms - one on the flag staff.
  The bandstand wears a dentil course. The lagoon bridge
  lands on granite posts with ball caps.
- **The State House front.** Three floors of windows (was
  two stretched tall), and a granite front stair you can
  actually climb to the arcade. (Its long side wings
  honestly don't fit this map - the Tremont row stands
  where the east wing would go.)
- **The ground layer.** Every path grew a packed-earth
  shoulder; the Mall is a true wide promenade now; the
  lagoon and Frog Pond wear low granite curb stones all
  the way around; the grass tufts went 5,200 -> 6,800.
  Two new camera poses for checking it all: `promenade`
  and `pondedge`.

## What's in v0.6.26

- **The other Garden is IN.** The TD Garden model held
  back in v0.6.24 is released (project owner's call,
  Nov 17 2026): the north run from the rat market now
  really does pop you up through the parquet into the
  full arena - bowl, banners, jumbotron and all. See the
  v0.6.24 notes for the tour.

## What's in v0.6.25

- **Fenway has a neighborhood now.** Emerge behind home
  plate and look over the walls: there is a city out there.
  174 buildings from the City of Boston's own 3D model
  (open data, public domain) stand around the park at
  their surveyed footprints and heights - the Lansdowne
  St frontage across from the Monster, the Brookline Ave
  corridor, Kenmore Square, the Boylston St blocks - with
  streets, sidewalks, crossings, streetlamps and parked
  cars to match, and windows that warm up after dark. And
  over the Monster, at its real bearing and distance, the
  CITGO sign: hand-built, red trimark and all, lit at
  night. Climb the Monster, walk to the back rim of the
  wall top, turn around. The field is still the squirrel's
  whole Fenway - the city is backdrop, no gate out - but
  the void is gone.

## What's in v0.6.24

- **The other Garden.** The rat market has a second door now -
  west wall, marked NORTHBOUND / THE OTHER GARDEN. Take the north
  run and you pop up through the parquet at centre court in an
  empty TD Garden: the full seating bowl, the banners, the big
  screen glowing over the court. The arena lights burn day and
  night - it's a game that isn't happening, lit like one that
  is. Run the parquet, climb the seats, hunt the caps (one is
  sitting on the centre-court logo, because it had to be).
  Spilled popcorn included. One honest note: the building is a
  sourced model whose paperwork is still being sorted out, so
  the door, the run and the lights ship now and the Garden
  itself fades in when its license clears - the game doesn't
  wait on it either way. (Update: it cleared - see v0.6.26.)

## What's in v0.6.23

- **Fenway after dark, and a squirrel on the Monster.** The
  light towers actually light now: the lamp banks burn with
  the day cycle, pools of light sit on the grass, and the
  Fenway sky got its own stars and clouds. The Green Monster
  is climbable - scramble straight up the face from the
  warning track and stand on top of the wall, where a bottle
  cap trophy is waiting. A few caps and spilled pretzels are
  scattered around the yard for the scamper home. Back in the
  park, the Beacon / Tremont / Charles windows are real glass
  now - recessed panes inside the stone frames, a few of them
  lit warm after dark.

## What's in v0.6.22

- **Fenway Park.** The burrows run further than the Common. On the
  rat market's east wall there's a door marked WESTBOUND - take the
  long west run and you pop out of a hole behind home plate into an
  empty Fenway: the Green Monster, the light towers, the whole yard,
  kept flat and green. The field is yours to scamper; the stands are
  scenery. Dive back through the hole when you're done. The park is
  the Garner / King / Thrall model (see credits) - the game's first
  expansion map, reached the way the tunnels always promised.

## What's in v0.6.13

- **Mrs. Mallard got her line in order.** The Ducklings were
  blobs with beak cones wandering in a zigzag. Now mother has a
  proper neck and a flat bill, the eight ducklings have chunky
  heads and tail nubs, and the whole family walks a single file
  on a gentle arc down the Garden path, each duckling angled
  along the line like it's actually following her.
- **More real trees.** The detailed sourced elms now stand at 55
  spots in the park, up from 39 - and the park still renders in
  fewer draw calls than it did with 39, because one good tree
  keeps replacing eleven pieces of a fake one.

## What's in v0.6.12

- **Brewer Fountain is the Brewer Fountain.** Three stacked
  cylinders became a two-tier bronze fountain: a lathe-turned
  pedestal, a wide lower bowl and a smaller upper one, a standing
  figure on top - and the four seated figures of the original
  (Neptune, Amphitrite, Acis and Galatea, if anyone's asking)
  rising out of the basin at the diagonals.
- **Park Street got its headhouse back.** The green metal box is
  gone. In its place: glass walls in an iron frame, an arched
  glazed gable, a shallow arched glass roof, and the T roundel
  mounted on the glass where you can actually read it from across
  Tremont. After dark the glass warms up like a lit station.

## What's in v0.6.11

- **The swan boats are swan boats.** They were a slab, three bench
  backs and a neck made of stacked cans. Now each one has a real
  hull with a raked bow, five slatted bench rows under an arched
  canvas canopy, and the full mute swan at the stern - S-curved
  neck, folded wings, black knob and mask, orange beak. And they
  move: each boat drifts a slow loop on its own half of the lagoon,
  the way the real ones circle all day. The geese have opinions
  about this but the bridge is still theirs.

## What's in v0.6.10

- **Washington got his horse back.** The Garden's equestrian statue
  was, charitably, abstract - a bronze torso on a stone slab, legs
  lost inside the pedestal. It is now an actual horse: barrel, chest
  and rump, an arched neck, a tapered muzzle, two-segment legs with
  one foreleg raised the way the General's stands, a flowing tail,
  and a rider with thighs, a reins arm and a tricorn. He reads from
  across the lawn now.

## What's in v0.6.9

- **The trees grew up.** The park's procedural elms wore perfect
  green spheres - lollipops at any height. Their crowns are now
  displaced, lobed geometry in four variants (no two trees share a
  profile), with the low interior lobes in darker greens so a canopy
  reads as a lit shell over a shadowed core. And the detailed
  sourced trees now stand at 39 spots instead of 17 - the whole
  Mall, more of the Garden, the Frog Pond grove, the pathside elms
  you actually walk under, and the spawn lawn. A side effect the
  squirrels approve of: the park renders in fewer draw calls than
  before, because one good tree replaces eleven pieces of a fake one.

## What's in v0.6.8

- **Hawk Dua is occasional now.** She used to be a metronome - stand
  in the open and she'd be on you inside half a minute, every time.
  Now a hunt needs her cooldown spent AND a long, unbroken watch of
  you standing careless in open sky (cover drains her interest twice
  as fast as exposure builds it). Getting caught buys minutes of
  peace; dodging buys a couple; booping her buys the longest memory
  of all. She is a rare event with a rust-red tail, not a tax.
- **Two more hawks moved in.** A pair of red-tails (one's a juvenile,
  brown tail, still figuring it out) soar wide circles over the
  Common and the Garden, glide low across the park so their shadows
  sweep the lawn, and perch on lamp tops to watch. They are weather.
  They will never dive at you. Only Dua does that, and now she
  mostly doesn't.

## What's in v0.6.7

- **The landmarks grew bones.** The lagoon bridge is a real
  suspension bridge now - sagging catenary cables, suspender rods,
  X-braced towers, baluster railings, stone abutments (the geese
  still hold the deck; some things are sacred). The State House got
  its pediment, a bell-profile dome, a windowed drum and a proper
  lantern with the gilded pinecone. The Soldiers and Sailors
  Monument has a fluted, tapered column, bronze relief panels and
  its four corner figures. The bandstand wears a shallow dome
  instead of a witch hat. And the skyline learned four silhouettes:
  a glass slab, a setback stack, a spired shaft with a beacon, and
  a clock tower.
- **Hawk Dua has her own warning line.** She used to borrow the
  dog's "HAS YOUR SCENT" alert, which was slander in both
  directions. Hers now reads HAWK DUA HAS YOU MARKED.
- **The hero trees lost 8 MB.** All five tree models embedded
  identical copies of the same three textures; they now share one
  external set. Same trees, lighter park.

## What's in v0.6.2

- **The western Mall is on the network now.** The two elms flanking
  the west end of the Mall stood 27.9 m apart - no bridge could span
  it, and the whole western row was a canopy dead end. A broad-crowned
  waypoint elm now stands at their midpoint (the Mall always had one
  more elm in it, honestly), and both legs bridge cleanly: the network
  is 51 routes and 554 m, every endpoint walk re-verified.

## What's in v0.6.1

- **Golden hour keeps its grass.** The instanced grass tufts used to
  crush to black silhouettes against the lawn at low sun - their unlit
  faces had nothing to live on. The tuft material now carries a
  horizon-keyed emissive floor (the blade texture doubles as the
  emissive map, and the day cycle warms it toward lamplight after
  dark), and the tuft colour range sits a touch lighter. Midday is
  unchanged to the eye; sunset keeps its blade detail.

## What's in v0.6

- **The canopy bridges are real limbs now.** Every one of the 49 branch
  routes (527 m of them, Charles Street snag crossing included) used to
  be drawn as a stack of straight cylinder segments. Each bridge is now
  a single swept, tapered tube that follows the same sag as the walk
  line: swollen where it leaves the trunk, thinner mid-span, with a
  slow radius ripple, a gentle sideways wander, ridged bark running
  with the grain, end caps, and twig stubs on the longer spans. No two
  bridges alike - the variation is seeded per bridge, so the park is
  the same park every load. The invisible stepping boxes you actually
  walk on never moved: all 98 endpoint walks re-verified, footfall
  for footfall identical.

## What's in v0.5.1

A small polish round on top of v0.5:

- **Caps are money now, not confetti.** Your bottle-cap balance saves with
  everything else - earn them, spend them at the Exchange, close the tab,
  come back: still there. The title screen shows the balance when you
  have one.
- **The crows got a rebuild.** Same three thieves, same behaviour, but the
  blobby sphere-and-planks look is gone: teardrop body, a neck, a beak
  with two parts, eyes, shaped wings, a proper tail fan. Get snatched at
  point-blank and you will notice. (A sourced model was auditioned first;
  the available corvids are unrigged statues, and these crows act. The
  procedural bird won.)

## What's in v0.5

Everything from v0.4 (canopy highways, Hawk Dua, save persistence), plus:

- **The Burrows + the rat black market.** A torch-lit tunnel network under
  the Common: six entrances (root holes at big trees, a drain by the Frog
  Pond, a monument-hill burrow, a lagoon drain), two storage chambers, and
  shortcut travel between all of them. Dogs, the ranger, the hawk, and the
  geese never go down - it is the one safe map. Deep in the network, the
  rats run THE EXCHANGE: bottle caps (a new shiny ground collectible) trade
  at 3 caps for a croissant - the good stuff, which buries for +3 stash.
  No credit. No dogs.
- **Public Garden geese.** Three geese hold the lagoon bridge. They
  honk-warn before they charge, and getting caught is a flapping
  relocation to the bridge end - stash intact, dignity pending. Three ways
  past: wait them out (stand still on the deck and they shuffle aside),
  pay the food toll (carry food close and they take it as a bribe), or go
  around entirely - canopy above, water below.
- **Food-stealing crows.** Three crows perch near the pretzel cart, the
  picnic blankets, and the Garden. Carry food in the open near one for too
  long and it swoops, snatches the item, and drops it at its perch -
  recoverable, if you race it or climb after it. Counterplay: bury the
  food, climb, or BITE the crow mid-snatch (feather puff; it remembers
  for a while).

## What's in v0.2

Everything from v0 (full Common + Garden map, ~120 climbable elms, the
Hollow, beg/steal/bury economy, dogs + ranger, day cycle, synthesized
audio), plus:

- **Camera/body fixed.** The v0 first-person body ("horrifying - giant
  feet", per the owner's playtest) is gone. The v1 paw rig is anatomically
  a squirrel: small forepaws with fingers and claws on short forelegs,
  visible only at the bottom rim of the frame while running / climbing /
  begging / biting; belly, hind feet and a tail curl appear only when you
  look sharply down, and even then only as a hint at the frame edge.
- **Visual pass toward (and past) the Saltline bar:** procedural canvas
  textures (grass detail, bark, leaves, granite, planks), textured State
  House facade with lit windows at night, city skyline facades with
  emissive windows, wet-sheen gravel paths that follow the terrain, a
  PMREM environment rebuilt per phase of day (that's what makes the
  paths and ponds shine), a sun disc in the sky shader, drifting clouds,
  layered fog ranges, player-following soft shadows, grass tufts and
  bushes at squirrel height, volumetric-feel lamp cones, and a lifted
  golden-hour grade.
- **Sourced CC0 models** (see credits): rigged animated dogs, humans with
  Walk / Sitting / Idle / Run animation, and period lamp posts - each
  swaps in when it loads, with the code-built version as fallback.
- **Mobile support:** touch controls, tap-to-start (no pointer lock),
  responsive HUD, safe-area insets, and a performance ladder that steps
  quality down if a phone GPU can't hold ~40fps (pixel ratio, shadow
  resolution, then shadows + grass density).

## Credits — third-party models and source evidence

The verified **model file inventory** is [model-provenance.json](assets/model-provenance.json); [public model sourcing / quality standards](docs/MODEL-SOURCING.md). Sources credited by the project include Quaternius (dogs/humans), Kay Lousberg/KayKit (lamps), Garner/King/Thrall (Fenway 3D Warehouse), and BPDA/City of Boston 3D data (City Hall/Hatch Shell/Fenway neighborhood).

These credits are **not blanket CC0 clearance**. Exact per-model evidence is incomplete in the public repo. The BPDA city-data *source family* is PDDL; individual Poly Pizza models may be CC0 or CC BY; 3D Warehouse has separate terms. The **TD Garden interior GLB is already publicly shipped** on the owner's documented decision despite its original author and rights being unknown. That is an open rights/provenance issue, not permission. Existing review warnings are preserved in the new asset gate; new models require item-level source and license evidence before entry.

Everything else is code-authored/procedural, including canvas textures and synthesized sound. No AI-generated imagery or models are introduced.


## Structure

```
index.html          title screen, HUD, touch UI, import map
js/main.js          wiring + game loop + interaction scan + perf ladder
js/state.js         shared state + world registries
js/world/           world.js (terrain/paths/water/sky) - trees.js -
                    landmarks.js - props.js - textures.js (canvas textures)
js/systems/         player.js - humans.js - food.js - dogs.js - ranger.js -
                    hollow.js - burrows.js (tunnels + rat market) -
                    geese.js - crows.js - hawk.js - canopy.js - save.js -
                    daycycle.js - audio.js - models.js (GLB loading) -
                    fenway.js (Fenway Park, via the burrows' long run) -
                    garden.js (TD Garden, via the burrows' north run;
                    model license-held, loads best-effort) -
                    cityhall.js (City Hall Plaza, via the east run) -
                    esplanade.js (Esplanade + Hatch Shell, via the
                    river run)
js/ui/              hud.js - touch.js (mobile controls)
assets/models/      sourced GLBs in use (originals + ledger in the library)
docs/               PLAYER-FAQ.md - AGENT-GUIDE.md
```

## Model sourcing rule

Sourced assets land in the workspace asset library FIRST, get a line in
its `ATTRIBUTION.md` ledger (source, author, license, date), and only then
are copied here. CC0 preferred, CC-BY fine with credit, no NC/ND.
