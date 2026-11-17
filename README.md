# SCURRY

A first-person squirrel game set on Boston Common + Public Garden.
You are a squirrel. Beg from humans, steal from picnics, bury everything,
mind the dogs, the ranger, the bridge geese, and the crows. Below the park,
the rats run a market. Winter is coming.

**Play it live: https://scurry.cold.fyi** (this repo is the site - GitHub
Pages serves `main` at the root). Or serve this folder statically and open
`index.html` (e.g. `python3 -m http.server`). No build step. Three.js loads
from CDN via the import map in `index.html` (pinned: three@0.160.0).

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

Mobile (touch devices get a full control layer - no pointer lock needed):

| Input | Action |
|---|---|
| Left stick | move (analog - tilt further to go faster) |
| Drag right side | look |
| SPRINT button | sprint toggle |
| JUMP / BITE / ACT / BURY buttons | jump / bite / interact / bury |

No fall damage. Squirrels do not take fall damage. This is science.
If the ranger nets you, you wake up on the bandstand roof and your stash
loses 25%. Relocated, never harmed.

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

## Credits - sourced models

All CC0 1.0 (no credit legally required; credit given anyway). Originals
and the full ledger live in the project asset library
(`assets-library/ATTRIBUTION.md` in the workspace; source pages on
poly.pizza):

- Dogs + Shiba Inu, Man (all humans) - **Quaternius**
- Post Lantern (lamp posts) - **Kay Lousberg (KayKit)**

Everything else is procedural: canvas textures, code-built landmarks, and
synthesized WebAudio. No AI-generated imagery anywhere, ever.

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
                    daycycle.js - audio.js - models.js (GLB loading)
js/ui/              hud.js - touch.js (mobile controls)
assets/models/      sourced GLBs in use (originals + ledger in the library)
docs/               PLAYER-FAQ.md - AGENT-GUIDE.md
```

## Model sourcing rule

Sourced assets land in the workspace asset library FIRST, get a line in
its `ATTRIBUTION.md` ledger (source, author, license, date), and only then
are copied here. CC0 preferred, CC-BY fine with credit, no NC/ND.
