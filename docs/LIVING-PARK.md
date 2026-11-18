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
