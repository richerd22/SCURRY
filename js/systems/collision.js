// SCURRY collision math. Pure functions, shared by browser + Node tests.
// Player.position.y is the squirrel's FEET (not its eye height).
const BODY_HEIGHT = 0.25;

export function meshTerrainHeight(grid, x, z, minX, maxX, minZ, maxZ, nx, nz) {
  if (!grid || x < minX || x > maxX || z < minZ || z > maxZ) return null;
  const fx = (x - minX) * nx / (maxX - minX);
  const fz = (z - minZ) * nz / (maxZ - minZ);
  const ix = Math.min(nx - 1, Math.floor(fx));
  const iz = Math.min(nz - 1, Math.floor(fz));
  const u = fx - ix, v = fz - iz;
  const a = grid[iz * (nx + 1) + ix];
  const b = grid[(iz + 1) * (nx + 1) + ix];
  const c = grid[(iz + 1) * (nx + 1) + ix + 1];
  const d = grid[iz * (nx + 1) + ix + 1];
  // PlaneGeometry indices: a,b,d and b,c,d, not bilinear interpolation.
  return u + v <= 1
    ? a + (d - a) * u + (b - a) * v
    : c + (b - c) * (1 - u) + (d - c) * (1 - v);
}

export function walkSurface(x, z, refY, stepTol, base, platforms, boxes, segments) {
  let best = base;
  const ceiling = refY + stepTol;
  for (const p of platforms) {
    const dx = x - p.x, dz = z - p.z;
    if (dx * dx + dz * dz <= p.r * p.r && p.y <= ceiling && p.y > best) best = p.y;
  }
  for (const b of boxes) {
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ
        && b.y <= ceiling && b.y > best) best = b.y;
  }
  for (const s of segments) {
    if (s.jumpOnly && refY < s.y - 0.38) continue;
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
    const t = Math.max(0, Math.min(1, ((x - s.x0) * dx + (z - s.z0) * dz) / (dx * dx + dz * dz || 1)));
    const px = s.x0 + t * dx, pz = s.z0 + t * dz;
    const ex = x - px, ez = z - pz;
    if (ex * ex + ez * ez <= s.r * s.r && s.y <= ceiling && s.y > best) best = s.y;
  }
  return best;
}

function overlapsY(pos, shape) {
  return pos.y + BODY_HEIGHT > (shape.minY ?? -Infinity)
    && pos.y < (shape.maxY ?? Infinity) - 0.005;
}

export function resolveHorizontal(pos, circles, boxes, walls, radius, climbing = null) {
  // Iterative corner settling; zero vector allocations per frame.
  for (let pass = 0; pass < 2; pass++) {
    for (const s of circles) {
      if (!overlapsY(pos, s)) continue;
      if (climbing && Math.abs(s.x - climbing.x) < 0.01 && Math.abs(s.z - climbing.z) < 0.01) continue;
      const dx = pos.x - s.x, dz = pos.z - s.z, rr = s.r + radius, d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) continue;
      if (d2 < 1e-12) { pos.x = s.x + rr; continue; }
      const k = rr / Math.sqrt(d2);
      pos.x = s.x + dx * k; pos.z = s.z + dz * k;
    }
    for (const b of boxes) {
      if (!overlapsY(pos, b)) continue;
      const loX = b.minX - radius, hiX = b.maxX + radius;
      const loZ = b.minZ - radius, hiZ = b.maxZ + radius;
      if (pos.x <= loX || pos.x >= hiX || pos.z <= loZ || pos.z >= hiZ) continue;
      const l = pos.x - loX, r = hiX - pos.x, n = pos.z - loZ, f = hiZ - pos.z;
      const m = Math.min(l, r, n, f);
      if (m === l) pos.x = loX; else if (m === r) pos.x = hiX;
      else if (m === n) pos.z = loZ; else pos.z = hiZ;
    }
    for (const w of walls) {
      if (!overlapsY(pos, w)) continue;
      const dx = w.x1 - w.x0, dz = w.z1 - w.z0;
      const length2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((pos.x - w.x0) * dx + (pos.z - w.z0) * dz) / (length2 || 1)));
      const cx = w.x0 + dx * t, cz = w.z0 + dz * t;
      const ex = pos.x - cx, ez = pos.z - cz, rr = (w.r || 0.05) + radius;
      const d2 = ex * ex + ez * ez;
      if (d2 >= rr * rr) continue;
      if (d2 < 1e-12) {
        const inv = 1 / (Math.sqrt(length2) || 1);
        pos.x = cx - dz * inv * rr; pos.z = cz + dx * inv * rr;
      } else {
        const k = rr / Math.sqrt(d2);
        pos.x = cx + ex * k; pos.z = cz + ez * k;
      }
    }
  }
}
