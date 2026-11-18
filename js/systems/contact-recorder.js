// Optional collision QA history. No browser globals or game dependencies.
// The last 180 diagnostic samples are available for a manually copied report.
// Normal game play never instantiates the recorder.
export function createContactRecorder(limit = 180) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000)
    throw new RangeError('invalid trace capacity');
  const samples = [];
  let total = 0, penetrations = 0, airborne = 0, minimumGap = Infinity;
  function record(value) {
    if (!value || ![value.x,value.y,value.z,value.ground].every(Number.isFinite))
      return false;
    const gap = value.y - value.ground;
    const entry = {
      t: Number.isFinite(value.t) ? Math.round(value.t) : null,
      x: Math.round(value.x * 1000) / 1000,
      y: Math.round(value.y * 1000) / 1000,
      z: Math.round(value.z * 1000) / 1000,
      ground: Math.round(value.ground * 1000) / 1000,
      gap: Math.round(gap * 1000) / 1000,
      grounded: !!value.grounded,
      climbing: !!value.climbing,
      realm: String(value.realm || 'park'),
      vy: Number.isFinite(value.vy) ? Math.round(value.vy * 100) / 100 : 0,
      fps: Number.isFinite(value.fps) ? Math.round(value.fps) : null,
    };
    samples.push(entry);
    if (samples.length > limit) samples.shift();
    total++;
    if (!entry.grounded && !entry.climbing) airborne++;
    if (gap < -.025) penetrations++;
    minimumGap = Math.min(minimumGap,gap);
    return true;
  }
  return Object.freeze({
    record,
    snapshot() {
      return {total,penetrations,airborne,minimumGap:
        Number.isFinite(minimumGap) ? Math.round(minimumGap*1000)/1000 : null,
        samples:samples.map(s=>({...s}))};
    },
  });
}
