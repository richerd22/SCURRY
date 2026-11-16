# SCURRY

A first-person squirrel game set on Boston Common + Public Garden.
You are a squirrel. Beg from humans, steal from picnics, bury everything,
mind the dogs, and the ranger has a net. Winter is coming.

**Play:** serve this folder statically and open `index.html`
(e.g. `python3 -m http.server` in this directory), or deploy the folder
as-is to GitHub Pages / Cloudflare Pages. No build step. Three.js loads
from CDN via the import map in `index.html` (pinned: three@0.160.0).

Planned home: **scurry.cold.fyi**

## Controls

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

No fall damage. Squirrels do not take fall damage. This is science.
If the ranger nets you, you wake up on the bandstand roof and your stash
loses 25%. Relocated, never harmed.

## What's in v0

- The whole Common + Public Garden in one map: State House (gold dome),
  Soldiers & Sailors Monument hill, Frog Pond, Parkman Bandstand, Brewer
  Fountain, Park St station, Charles Street, the lagoon bridge, docked swan
  boats, Make Way for Ducklings, the Washington statue, Gamewell alarm boxes.
- ~120 climbable elms with walkable canopies.
- Begging, food economy (acorns / pretzels / sandwiches / peanuts), picnic
  stealing with an owner-gaze system, trash-can jackpots, bury/stash loop.
- 3 off-leash dogs, 1 ranger with a net, bite-to-escape.
- The Hollow: a knot-hole in the great tree by the Frog Pond leads to an
  interior room with Elder Bramble (rotating park gossip) and a vault pile
  that grows with your stash.
- Golden hour -> dusk -> night day cycle, lamps glow at dusk, synthesized
  WebAudio (squeaks, barks, birdsong, crickets), zero audio/image assets.

## Structure

```
index.html          title screen, HUD, import map
js/main.js          wiring + game loop + interaction scan
js/state.js         shared state + world registries
js/world/           world.js (terrain/paths/water/sky) - trees.js - landmarks.js - props.js
js/systems/         player.js - humans.js - food.js - dogs.js - ranger.js -
                    hollow.js - daycycle.js - audio.js
js/ui/hud.js        HUD text
```

## Models note (v0.5)

v0 is 100% code-built stylized geometry on purpose, so it is playable
tonight. A CC0 model-sourcing pass is planned for v0.5: sourced assets land
in `~/workspace/gamewell/assets-library/` FIRST, get a line in that
folder's `ATTRIBUTION.md` ledger (source, author, license, date), and only
then are copied/referenced here. No AI-generated imagery anywhere, ever.
