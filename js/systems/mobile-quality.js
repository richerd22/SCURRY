// Adaptive mobile graphics quality: pure, timer-free state machine.
// Uses *real* frame duration rather than the physics timestep (which is
// capped at 50ms). No WebGL/DOM imports, safe to test in Node.
export function createMobileQualityState() {
  return { tier: 0, fpsEma: 60, slowSeconds: 0, fastSeconds: 0 };
}
export function advanceMobileQuality(state, frameSeconds) {
  // A Safari resume gap is not a real sustained GPU benchmark.
  if (!Number.isFinite(frameSeconds) || frameSeconds <= 0 || frameSeconds > 1) return state.tier;
  const elapsed = Math.min(frameSeconds, 0.25);
  const sampleFps = Math.min(120, 1 / frameSeconds);
  const alpha = 1 - Math.exp(-elapsed / 1.4);
  state.fpsEma += (sampleFps - state.fpsEma) * alpha;
  if (state.fpsEma < 39) {
    state.slowSeconds += elapsed;
    state.fastSeconds = 0;
    if (state.slowSeconds >= 3 && state.tier < 3) {
      state.tier++;
      state.slowSeconds = 0;
    }
  } else if (state.fpsEma > 54) {
    state.fastSeconds += elapsed;
    state.slowSeconds = 0;
    if (state.fastSeconds >= 12 && state.tier > 0) {
      state.tier--;
      state.fastSeconds = 0;
    }
  } else {
    state.slowSeconds = 0;
    state.fastSeconds = 0;
  }
  return state.tier;
}
