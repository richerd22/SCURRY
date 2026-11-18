// SCURRY - pure park land classification helper. No graphics imports.
// Green terrain paint extends under streets; only these two authored park
// footprints may ever count as burial ground for gameplay.
export function insideParkLawn(x, z, map) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const inside = b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  return inside(map.common) || inside(map.garden);
}
