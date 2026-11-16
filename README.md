# SCURRY

A first-person squirrel game set on Boston Common + Public Garden.
You are a squirrel. Beg from humans, steal from picnics, bury everything,
mind the dogs, and the ranger has a net. Winter is coming.

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
| E | beg / take food / snatch picnic food / raid trash / slip through knot-holes |
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
                    hollow.js - daycycle.js - audio.js - models.js (GLB loading)
js/ui/              hud.js - touch.js (mobile controls)
assets/models/      sourced GLBs in use (originals + ledger in the library)
docs/               PLAYER-FAQ.md - AGENT-GUIDE.md
```

## Model sourcing rule

Sourced assets land in the workspace asset library FIRST, get a line in
its `ATTRIBUTION.md` ledger (source, author, license, date), and only then
are copied here. CC0 preferred, CC-BY fine with credit, no NC/ND.
