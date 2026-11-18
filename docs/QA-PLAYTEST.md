# SCURRY — playtest and release QA

Target: **solid collision and delightful control on desktop and iPhone**. Owner verdict is the acceptance bar; pure tests are a baseline, not a substitute.

## Reproduce efficiently

1. Open a fresh tab to `https://scurry.cold.fyi/?diag=1` (or append `&diag=1` to a shot/route URL). Verify the deployed `scurry-version` is **0.6.33** before attributing behavior to this sprint.
2. Reproduce the behavior twice, in both directions when applicable. Record the overlay's `feet x/y/z`, `ground/gap`, `GROUNDED/AIRBORNE/CLIMBING`, the visible object and any input held.
3. Record platform/browser/OS, horizontal vs vertical orientation, touch vs keyboard, time-of-day in game, and whether the game was backgrounded before the glitch.
4. Report **expected vs actual**, 3–6 steps, device and URL; attach a short screen recording when possible. Do not substitute subjective "looks good" for a reproducible acceptance.

## Core collision acceptance matrix

| Place | Action | Pass condition |
|---|---|---|
| Spawn lawn and Mall | Walk, sprint, stop on slopes, leave paths | Feet remain on visible lawn/path, not below mesh or floating |
| Common perimeter / Charles Street | Run parallel and perpendicular to fences | No tunneling; cannot teleport from ground to top rail |
| Fences | Leap onto top, balance, descend both sides | Rail is walkable once jumped onto; wall below remains solid |
| Tree trunks | Walk into trunk, climb, circle, release | Climb engages without clipping; no involuntary launch |
| Every canopy highway | Sprint and walk both directions, cross joins | Landing boxes support feet, small slopes traverse, no fall-through |
| Canopy edge | Press jump just AFTER slipping off, then just BEFORE landing | 100 ms coyote and 140 ms buffer feel natural; held button never auto-bounces |
| Benches, tables, lamps | Jump, approach underside and from sides | Collision corresponds to drawn structure; no aggressive unwanted pushout |
| Lagoon suspension bridge | Enter from both ends, run rail, jump from bank | Deck/top rail heights match visuals; no false underwater ground contact |
| Water / pond bank | Wade in and out while looking down | Eyes submerge as expected; no invisible collider wall or phantom path |
| Bandstand / monument / State House | Climb steps and platforms, jump from elevated edge | No roof/column clipping; correct landing after free fall |
| Burrows and hollow | Enter, run through doors, exit | No walls through player, floor y consistent, return outside is safe |
| Fenway / TD Garden / City Hall / Esplanade | Portal in/out, walk floors, exercise clamps | No home-map clamp; destination floors remain reliable (TD Garden model may be absent by license) |

## Mobile and browser-specific acceptance

- Test on **physical iPhone Safari** and at least one in-app browser. Left thumb on stick, right thumb on look, third touch on Jump: neither control changes pointer owner.
- Begin a held jump, background Safari, return: no stuck movement or sprint badge; the game should display the resume overlay and resume from an intentional tap.
- Rotate portrait ↔ landscape and check HUD, buttons, safe-area insets, lookzone, canvas resolution and interact prompts.
- Run 2–3 sustained sessions around 2 minutes with shadows/grass loaded; note model, battery condition, thermal throttling and observed FPS/tier. The diagnostics FPS is instantaneous and can be noisy; report sustained behavior rather than a single number.
- Test desktop Chrome/Safari and keyboard/mouse; verify pointer lock + Escape/pause, Space tap vs hold, action keys not repeating, game resume after tab hidden.

## Automated gates

```sh
node --test tests/*.mjs
find js tests -type f \\( -name '*.js' -o -name '*.mjs' \\) -print0 | xargs -0 -n1 node --check
python3 -m http.server 8000
```

On each GitHub push, the [CI workflow](../.github/workflows/ci.yml) runs pure tests and syntax checks. Manual acceptance remains a distinct, required status. Do not claim browser verification based on CI alone.

## Issue report template

```text
Device / OS / browser:
Version (index scurry-version):
Scene / location + feet x/y/z:
Starting state (grounded / airborne / climbing / realm):
Actions (repro steps):
Expected:
Actual:
Reproduces on desktop and mobile?:
Video / screenshot / console error:
```

## Release checklist

- [ ] Syntax checks green on all JS/MJS
- [ ] Node regressions green (collision + jumps)
- [ ] No CNAME/import map/mobile HTML regressions
- [ ] Live version/changed JS confirmed after deployment
- [ ] Headless visual and console smoke pass (if harness accessible)
- [ ] Physical iOS Safari + multitouch/visibility playtest
- [ ] Real-GPU quality/performance signoff; no assertion beyond observed evidence
- [ ] Agent guide, wiki, decisions and Notion hub updated with **honest** pass/fail status
