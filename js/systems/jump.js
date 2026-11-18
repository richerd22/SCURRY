// SCURRY jump intent: platform-independent, testable without Three.js.
// Feet contact comes from player.js; this only chooses WHEN to launch.
export const JUMP_BUFFER_SECONDS = 0.14;
export const COYOTE_SECONDS = 0.10;

export function advanceJumpIntent(state, held, grounded, climbing, dt) {
  const freshPress = held && !state.held;
  state.held = held;
  if (freshPress) state.buffer = JUMP_BUFFER_SECONDS;
  else state.buffer = Math.max(0, state.buffer - Math.max(0, dt));
  state.coyote = grounded ? COYOTE_SECONDS : Math.max(0, state.coyote - Math.max(0, dt));
  if (state.buffer > 0 && (grounded || climbing || state.coyote > 0)) {
    state.buffer = 0;
    state.coyote = 0;
    return true;
  }
  return false;
}

export function resetJumpIntent(state) {
  state.held = false;
  state.buffer = 0;
  state.coyote = 0;
}
