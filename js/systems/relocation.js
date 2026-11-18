// One relocation at a time: no chained net penalties / competing teleports.
// Pure state transitions; game loop advances cooldown with simulation dt.
export function relocationProtected(state) {
  return !!state.relocating || (state.catchGrace || 0) > 0;
}
export function beginRelocation(state) {
  if (relocationProtected(state)) return false;
  state.relocating = true;
  return true;
}
export function completeRelocation(state, graceSeconds = 1.5) {
  state.relocating = false;
  state.catchGrace = Number.isFinite(graceSeconds) && graceSeconds > 0 ? graceSeconds : 0;
}
export function advanceRelocation(state, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || state.relocating) return;
  state.catchGrace = Math.max(0, (state.catchGrace || 0) - dt);
}
