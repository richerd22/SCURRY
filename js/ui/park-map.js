// Hand-drawn 2D Boston Common / Public Garden map. Zero network assets.
// Optional G-key / MAP button, ~5 redraws/sec only while open.
// Uses the SAME map dimensions, paths and landmark positions as the world.
import { S, MAP } from '../state.js';
import { PATHS } from '../world/world.js';
import { mapPoint, mapHeading, mapRealm, waypointBearing } from './map-math.js';

let panel, canvas, note, legend, route, toggle, selected = null,
  open = false, elapsed = 0;
const MARKERS = [
  { x:-132, z:0, label:'GARDEN BRIDGE' },
  { x:-132, z:74, label:'WASHINGTON' },
  { x:-25, z:-58, label:'FOUNTAIN' },
  { x:60, z:-45, label:'MONUMENT' },
  { x:95, z:12, label:'FROG POND' },
  { x:140, z:42, label:'BANDSTAND' },
];
const PADD = 12;

export function initParkMap() {
  panel = document.getElementById('map-panel');
  canvas = document.getElementById('map-canvas');
  note = document.getElementById('map-note');
  legend = document.getElementById('map-legend');
  route = document.getElementById('map-route');
  toggle = document.getElementById('map-toggle');
  const close = document.getElementById('map-close');
  if (!panel || !canvas || !toggle || !close || !legend || !route) return;
  // Build an accessible, stable legend once—not new DOM objects every 5Hz.
  // Numbered pins replace the long inline labels that clipped on phones.
  const entries = MARKERS.map((marker, i) => ({ ...marker, number: String(i + 1) }));
  if (S.hollowTreePos) entries.push({
    x:S.hollowTreePos.x, z:S.hollowTreePos.z,
    number:'H',label:'HOLLOW TREE'
  });
  for (const entry of entries) {
    const item = document.createElement('button');
    item.type='button';
    item.className='map-destination';
    item.textContent = entry.number + '  ' + entry.label;
    item.setAttribute('aria-label', 'Track ' + entry.label);
    item.setAttribute('aria-pressed', 'false');
    item.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation();
      selected = selected === entry ? null : entry;
      for (const button of legend.querySelectorAll('button'))
        button.setAttribute('aria-pressed', String(button === item && !!selected));
      hide();
      updateRoute();
      toggle.focus();
    });
    legend.appendChild(item);
  }
  route.addEventListener('click', () => {
    selected=null;
    for(const button of legend.querySelectorAll('button'))
      button.setAttribute('aria-pressed','false');
    updateRoute();
  });
  if (S.isTouch) toggle.textContent = 'MAP';

  const toggleMap = () => {
    if (!S.started || S.paused) return;
    open = !open;
    panel.style.display = open ? 'block' : 'none';
    panel.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    if (open) draw();
    updateRoute();
  };
  toggle.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation(); toggleMap();
  });
  close.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation(); toggleMap();
  });
  document.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyG' || event.repeat || !S.started || S.paused) return;
    event.preventDefault();
    toggleMap();
  });
  window.addEventListener('resize', () => { if (open) draw(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  window.addEventListener('pagehide', hide);
}
function hide() {
  open = false;
  if (panel) { panel.style.display = 'none'; panel.setAttribute('aria-hidden','true'); }
  toggle?.setAttribute('aria-expanded','false');
  updateRoute();
}
export function updateParkMap(dt) {
  if (!open && !selected) return;
  elapsed += dt;
  if (elapsed < 0.2) return;
  elapsed = 0;
  if (open) draw();
  updateRoute();
}
function updateRoute() {
  if (!route) return;
  const p=S.player;
  const eligible=selected && p.pos && !mapRealm(p) && S.started && !S.paused && !open;
  route.style.display=eligible?'block':'none';
  route.setAttribute('aria-hidden',String(!eligible));
  if (!eligible) return;
  const nav=waypointBearing(p.pos.x,p.pos.z,p.yaw,selected.x,selected.z);
  const nearby=nav.distance<4;
  route.textContent=(nearby?'✓':nav.arrow)+'  '+selected.label+'  ·  '+
    (nearby?'ARRIVED':Math.ceil(nav.distance)+'m')+'  ×';
  route.setAttribute('aria-label','Clear waypoint to '+selected.label);
}
function draw() {
  if (!canvas || !open || !S.player.pos) return;
  const w = Math.max(240, Math.round(canvas.clientWidth || 460));
  const h = Math.max(220, Math.round(w * 0.62));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pxW = Math.round(w * dpr), pxH = Math.round(h * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW; canvas.height = pxH;
    canvas.style.height = h + 'px';
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#101b17'; ctx.fillRect(0, 0, w, h);

  const realm = mapRealm(S.player);
  if (realm) {
    if (legend) legend.style.display = 'none';
    ctx.fillStyle = '#c6dbbd'; ctx.textAlign = 'center';
    ctx.font = '700 17px ui-monospace, monospace';
    ctx.fillText(realm, w / 2, h / 2 - 28);
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillStyle = '#94ae96';
    ctx.fillText('THIS ATLAS COVERS THE COMMON + GARDEN', w/2, h/2 + 5);
    ctx.fillText('FIND A BURROW EXIT TO RETURN TO THE PARK', w/2, h/2 + 27);
    note.textContent = 'You are beyond the park map. Follow the burrow doors to return.';
    return;
  }

  if (legend) legend.style.display = 'grid';
  const p = (x, z) => mapPoint(x, z, MAP, w, h, PADD);
  function rect(x0, z0, x1, z1, color, border = null) {
    const a = p(x0,z0), b = p(x1,z1);
    ctx.fillStyle = color; ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);
    if (border) {
      ctx.strokeStyle = border; ctx.lineWidth = 1;
      ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
    }
  }
  // Actual map bounds: Public Garden at west, Common at east, Charles St.
  rect(MAP.garden.minX, MAP.garden.minZ, MAP.garden.maxX, MAP.garden.maxZ, '#305542', '#7a936e');
  rect(MAP.common.minX, MAP.common.minZ, MAP.common.maxX, MAP.common.maxZ, '#365b3d', '#9daf74');
  rect(MAP.charlesMinX, MAP.minZ, MAP.charlesMaxX, MAP.maxZ, '#414843');
  // Painted path network comes directly from world.js: no independently
  // maintained guesses about where the Mall and crossing paths run.
  ctx.strokeStyle = '#b3ab88'; ctx.lineWidth = Math.max(1.5, w/210);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const path of PATHS) {
    ctx.beginPath();
    for (let i=0;i<path.length;i++) {
      const q = p(path[i][0],path[i][1]);
      if (i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y);
    }
    ctx.stroke();
  }
  function pond(e, fill) {
    const c = p(e.x,e.z), edge = p(e.x+e.rx,e.z+e.rz);
    ctx.beginPath(); ctx.ellipse(c.x,c.y,edge.x-c.x,edge.y-c.y,0,0,Math.PI*2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = '#a6bbc0'; ctx.lineWidth = 1; ctx.stroke();
  }
  pond(MAP.lagoon,'#39717a'); pond(MAP.frogPond,'#457782');
  ctx.textAlign = 'center'; ctx.fillStyle = '#9fbe9b';
  ctx.font = '700 '+Math.max(9,Math.min(13,w/48))+'px ui-monospace, monospace';
  const garden = p(-138,-56), common = p(70,85);
  ctx.fillText('PUBLIC GARDEN',garden.x,garden.y);
  ctx.fillText('BOSTON COMMON',common.x,common.y);
  // Compact numbered pins, read via the two-column legend below the map.
  // This avoids unreadable overlapping or clipped landmark names on iPhone.
  function pin(x, z, text, fill = '#e7cc87') {
    const q = p(x,z);
    ctx.beginPath();ctx.arc(q.x,q.y,7.5,0,Math.PI*2);
    ctx.fillStyle = fill;ctx.fill();
    ctx.strokeStyle = '#17231c';ctx.lineWidth = 1.5;ctx.stroke();
    ctx.textAlign='center';ctx.fillStyle='#1a251b';
    ctx.font='700 9px ui-monospace,monospace';
    ctx.fillText(text,q.x,q.y+3);
  }
  MARKERS.forEach((marker,i) => pin(marker.x,marker.z,String(i+1),
    selected?.number===String(i+1)?'#fff8b2':'#e7cc87'));
  if (S.hollowTreePos) pin(S.hollowTreePos.x,S.hollowTreePos.z,'H',
    selected?.number==='H'?'#fff8b2':'#edb57d');
  // Squirrel marker: camera forward is (-sin(yaw), -cos(yaw)).
  const q=p(S.player.pos.x,S.player.pos.z), dir=mapHeading(S.player.yaw);
  const side={x:-dir.z,z:dir.x}, r=8;
  ctx.fillStyle='#f5dfab'; ctx.strokeStyle='#152419'; ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(q.x+dir.x*r,q.y+dir.z*r);
  ctx.lineTo(q.x-dir.x*r*.58+side.x*r*.55,q.y-dir.z*r*.58+side.z*r*.55);
  ctx.lineTo(q.x-dir.x*r*.58-side.x*r*.55,q.y-dir.z*r*.58-side.z*r*.55);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle='#c8dab0';ctx.font='700 12px ui-monospace,monospace';
  ctx.fillText('N ↑', 14, 22);
  note.textContent = S.isTouch
    ? 'YOU ARE THE GOLD ARROW · North up · tap MAP to close'
    : 'YOU ARE THE GOLD ARROW · North up · press G to close';
}
