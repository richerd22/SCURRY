// Portable deterministic visual-decoration PRNG.
// Do not use for physics/nondeterministic multiplayer/security.
// Dedicated seed per layer keeps screenshots stable across reloads while
// allowing a designer to alter one layer without re-rolling all others.
export function seededRandom(seed) {
  if (!Number.isInteger(seed) || !Number.isFinite(seed))
    throw new TypeError('seed must be a finite integer');
  let state=seed>>>0;
  return () => {
    state=(Math.imul(1664525,state)+1013904223)>>>0;
    return state/4294967296;
  };
}
