// SCURRY camera feel - pure, Node-testable. No THREE/DOM imports.
// A squirrel sprint should FEEL faster: the lens opens a few degrees while
// sprinting on the ground, and eases back for normal scurry, climbing,
// swimming and begging. Small numbers on purpose - this is seasoning, not
// a rollercoaster.
export const BASE_FOV = 74;
export const SPRINT_FOV = 79;
export function targetFov({ sprinting = false, grounded = false, moving = false, climbing = false } = {}) {
  return sprinting && grounded && moving && !climbing ? SPRINT_FOV : BASE_FOV;
}
// Frame-rate independent ease toward the target (time constant ~0.18s).
export function stepFov(current, target, dt) {
  if (!Number.isFinite(current)) return target;
  if (!Number.isFinite(dt) || dt <= 0) return current;
  const k = 1 - Math.exp(-Math.min(dt, 0.1) / 0.18);
  const next = current + (target - current) * k;
  return Math.abs(target - next) < 0.01 ? target : next;
}
