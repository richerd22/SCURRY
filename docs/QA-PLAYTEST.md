# SCURRY — playtest and release QA

Target: **solid collision and delightful control on desktop and iPhone**. Owner verdict is the acceptance bar; pure tests are a baseline, not a substitute.

## Reproduce efficiently

1. Open a fresh tab to `https://scurry.cold.fyi/?diag=1` (or append `&diag=1` to a shot/route URL). Verify the deployed `scurry-version` is **0.6.36** before attributing behavior to this sprint.
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
- [ ] Node regressions green (collision + jumps + save)
- [ ] No CNAME/import map/mobile HTML regressions
- [ ] Live version/changed JS confirmed after deployment
- [ ] Headless visual and console smoke pass (if harness accessible)
- [ ] Physical iOS Safari + multitouch/visibility playtest
- [ ] Real-GPU quality/performance signoff; no assertion beyond observed evidence
- [ ] Agent guide, wiki, decisions and Notion hub updated with **honest** pass/fail status


## Repeatable human-reference image check (v0.6.36)

For any named screenshot pose, add `&eye=1.7` to inspect the same scene from a human's viewpoint without changing the squirrel's position, collisions, jumps, or camera during normal gameplay. Leave `eye` out for the canonical squirrel perspective (0.25 m). Example comparison: `?shot=beaconclose&t=17.6&eye=0.25` versus `?shot=beaconclose&t=17.6&eye=1.7`; test `garden`, `tremontclose`, `parkchurch`, `canopy` separately. Arbitrary values are allowed only from 0.15 to 2.0 m and only in shot mode. Screenshot poses now seat their feet on `visibleGroundHeight`, the rendered terrain sampling used by actual physics, instead of the analytic source function. The root paw rig hides above 1m for inspection only so it does not appear to float in the human-height frame. A reference shot is not a claim that geometry is to-scale at both heights: record where it fails.

The opt-in `?diag=1` FPS line now uses the **uncapped frame interval** instead of the physics-clamped 50 ms interval, so phones running below 20 FPS do not misleadingly report exactly 20. Treat it as instantaneous and noisy, not a benchmark.


## Food and stash integrity routes (v0.6.37)

- Collect two nearby foods, then hit E/ACT twice before the next movement frame; the second item must remain, and the squirrel must carry exactly one item.
- Trade for a croissant in the rat burrow market; try BURY inside the burrow and on remote concrete at Fenway, TD Garden and City Hall. BURY must not activate; return to grass in the Common and bury for +3 stash exactly once.
- Check raised placed food at the Esplanade embankment and future licensed TD Garden seating. The food must remain on its authored floor before and after many `updateFood` ticks, rather than popping to y=0.
- Walk away immediately after a food prompt appears and press E; a stale prompt must not grant a distant food item. Check touch ACT too.


## Ambient forage and memory regression (v0.6.38)

- Bury or collect most Common scattered snacks, then visit a realm/market and return. Over 9–18 game seconds the Common's freely scattered food should begin restocking even when cache/realm foods still exist elsewhere.
- Repeat collecting/burying acorns for several minutes on an iPhone while monitoring memory and responsiveness; the materials for identical snack types now reuse the same GPU objects. A leak-free long session is still a physical-device observation, not proved by Node tests.


## Rapid interaction / long session (v0.6.39)

- Rapidly pick up/swap acorn, croissant and popcorn using keyboard E or touch ACT. The carried prop should change color immediately without briefly disappearing or spawning a new detached mesh.
- On an iPhone run a long forage session (20+ pickups). Inspect WebGL resources with available device tools when possible; carried food should no longer increase geometry/material allocations per pickup.
- Walk to the edge of a burrow or food prompt, then quickly leave range and press ACT: the action must be recalculated from the current position.
- Background Safari while holding jump on an attached keyboard; return and verify Space does not remain stuck. Touch BITE must not activate during the pause overlay.


## Park atlas usability (v0.6.40)

- While walking between Common and Garden, open MAP / press G. The player arrow must track position and point along camera forward (-sin yaw, -cos yaw). NORTH is top (negative Z), Charles Street separates the two parks.
- Check crossing the bridge, bandstand, Monument, Fountain, Frog Pond, Washington and runtime Hollow Tree marker. Markers are schematic but should align in the right neighborhoods.
- On iPhone, MAP button should be reachable with the right thumb but should not steal joystick/look pointers; opening/closing it should not alter movement state. Rotate the phone and check canvas fit / labels / safe areas.
- Travel into the rat tunnels and a remote destination. The map must show the destination title instead of plotting thousands-of-metres-away coordinates onto the Common. Background Safari with map open; it should reset closed on return.


## Soil boundary / thrown food (v0.6.41)

- Collect food, stand on grassy ground inside each of the Common and Public Garden, and verify BURY is available when away from a wet path, Charles Street, water and objects.
- Approach a sidewalk just beyond the park footprint; BURY must not appear even if the underlay texture is green. Try corners and Charles Street crossings.
- Accept a tossed snack from a human or trash can. The arc should stay in view, settle without diving through the lawn near touchdown, and create exactly one pickup.


## Mobile quality and battery (v0.6.42)

- On iPhone Safari open `?diag=1`, observe instantaneous FPS and EMA while walking around the dense canopy and Charles Street. A sustained slow GPU should degrade quality gradually; returning to lighter scenes at fast FPS should restore it slowly, not bounce between levels.
- Open PAUSE / background Safari for 30s. The view should not degrade further on return due to the hidden-time gap. Paused/title scenes render the static park at about 4fps to save battery, not full-rate WebGL.
- If performance or visual quality regresses, report hardware model, iOS version, time-of-day, quality tier, observed EMA, shadow state and whether the app was warm or throttled.


## Trunk jump/regrab, action priority (v0.6.44)

- Stand close to a climbable tree, face trunk and jump while moving. The jump must actually launch, not immediately attach to the same trunk. A new climb should be possible after about a third of a second.
- While climbing, leap backward/sideways, then hold toward the trunk; no instant re-grab should cancel the leap. After the short grace expires, normal midair grabs should still work.
- Find a burrow mouth/rat market stall with food nearby. A physically closer door/interactable should outrank a more distant snack; the opposite when food is genuinely nearer. Keyboard E and touch ACT must agree.
- In Esplanade, food on the grass embankment must remain at LAND_Y across many game frames without the old artificial tick; no dummy interactable should be needed.


## Automated browser smoke evidence

New [browser-smoke workflow](../.github/workflows/browser-smoke.yml) launches the real static site in headless Chromium + SwiftShader. Review the run's uploaded `scurry-webgl-smoke` artifact containing PNGs and `report.json` for spawn, Public Garden and mobile-touch spawn; verify no page/console error, live WebGL, screenshot readiness, G key and touch MAP. This is a basic runtime gate, **not** a replacement for longer playable physics checks or real-GPU/iPhone image and performance reviews.


## Browser screenshot review — 18 November 2026, v0.6.44 → 0.6.45

[Green WebGL smoke run](https://github.com/richerd22/SCURRY/actions/runs/44254317541) generated desktop spawn, Garden, mobile spawn, and mobile map PNGs, plus a clean JSON console/error report. Manual review of `mobile-spawn-atlas.png` at 390×844 found the *map labels* clamped into the left edge and overlapping nearby water/points; v0.6.45 fixes this using a static numbered legend. The software-lowq screenshots also showed dark flat foreground grass, but `lowq=1` intentionally suppresses grass/shadows, so **do not treat that as a measured real GPU lighting regression**. The map UI change needs rerun of headless smoke and a real iPhone readability check before closure.


## Live browser route check (v0.6.46)

The headless WebGL workflow now runs `?qa=1&lowq=1` on a local HTTP server, clicks PLAY, holds W to establish movement, executes an actual Space jump, tests that a held W is cleared by pause/resume, and interacts using E through the surface burrow to Fenway/TD Garden/City Hall/Esplanade and back. CI's QA hook is absent on the public hostname. Inspect `desktop-live-play.png` and `report.json` after the run. A red browser workflow is a real release blocker until the failing phase is diagnosed, though a CDNs/SwiftShader outage may be an environment-only issue. Physical iPhone/controller and multi-minute route playtests remain separately necessary.


## Path-ground parity (v0.6.47)

- Traverse the wet ribbons and Mall apron at multiple headings; look at 0.25m eye height to make sure foot contact matches the rendered pathway without sudden 2–6cm drops.
- Check BURY on lawn immediately adjacent to the Garden and Common path network; crossing a path edge should toggle bury eligibility at the same distance as earlier builds.
- Seeded canopy/tree placements must remain identical: this optimization affects bounded path contact queries only, not the placement distance function.


## Desktop pointer-lock denial / fallback (v0.6.48)

- Deny pointer-lock permissions or use a privacy-restricted desktop browser; clicking PLAY must NOT instantly put the game back into PAUSE.
- Drag with primary mouse on the scene: camera should turn; a stationary click still BITE, but drag-start should not fire a BITE.
- In normal pointer-lock mode, mouse aim works and pressing Escape (genuine lock loss) pauses; RESUME should re-lock or remain playable in fallback.
- On either path, holding W and losing focus or pausing must not leave movement stuck after resuming. CI's `?qa=1&nolock=1` test reproduces the locked-denied path only on localhost.


## Map landmark waypoint (v0.6.49)

- On desktop G and mobile MAP, select Garden Bridge, Frog Pond or Hollow Tree from the numbered legend. The atlas should close and show a compact waypoint cue under MAP with direction and metre distance.
- Face north then rotate 90 degrees; a target east of the squirrel should point right before turning and straight ahead afterward. Walk toward the target and verify distance falls; at 4m it shows ARRIVED.
- Tap the cue to clear it; the normal HUD returns uncluttered. Re-select a different landmark and enter the burrows or a destination: the Common waypoint cue should hide, reappearing on return.
- Verify mobile buttons, legend touch targets, safe areas and suspended browser state; do not interpret the direct arrow as a safe obstacle-aware route.


## Audio pause/resume (v0.6.50)

- Pause/background SCURRY during daytime chirps or night crickets. Audio should become silent and resume only after an intentional PLAY/RESUME gesture.
- Mute before pause, then resume: mute should remain on and survive reload. Repeated resume must reuse one AudioContext, not allocate another.
- An iOS Safari WebAudio permission rejection must never trap the player. Browser CI asserts internal audio pause state; real audible output requires physical-device QA.
