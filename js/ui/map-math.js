// SCURRY park atlas math. Pure: testable in Node without browser/Three.js.
// Preserve real-world X/Z aspect ratio. In this game north is negative Z.
export function mapPoint(x, z, bounds, width, height, padding = 18) {
  const scale = Math.min((width - 2 * padding) / (bounds.maxX - bounds.minX),
    (height - 2 * padding) / (bounds.maxZ - bounds.minZ));
  const offX = (width - (bounds.maxX - bounds.minX) * scale) / 2;
  const offY = (height - (bounds.maxZ - bounds.minZ) * scale) / 2;
  return { x: offX + (x - bounds.minX) * scale,
    y: offY + (z - bounds.minZ) * scale };
}
export function mapHeading(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
export function mapRealm(player) {
  if (player.inHollow) return 'HOLLOW TREE';
  if (player.inBurrow) return 'RAT TUNNELS';
  if (player.inFenway) return 'FENWAY PARK';
  if (player.inGarden) return 'TD GARDEN';
  if (player.inCityHall) return 'CITY HALL PLAZA';
  if (player.inEsplanade) return 'CHARLES RIVER ESPLANADE';
  return null;
}
