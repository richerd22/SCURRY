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
// Body yaw 0 faces north (-Z), -PI/2 faces east (+X). A rightward
// destination therefore has a negative relative bearing.
export function waypointBearing(x,z,yaw,tx,tz) {
  const dx=tx-x,dz=tz-z;
  const distance=Math.hypot(dx,dz);
  const targetYaw=Math.atan2(-dx,-dz);
  const relative=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw));
  const arrows=['↑','↖','←','↙','↓','↘','→','↗'];
  const arrow=arrows[(Math.round(relative/(Math.PI/4))+8)%8];
  return {distance,relative,arrow};
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
