// SCURRY - touch controls (mobile requirement, Richard's iPhone playtest).
// Left virtual stick = move (analog, feeds S.touch), right-half drag = look,
// buttons: JUMP (hold), BITE, ACT (interact/beg), BURY, SPRINT (toggle).
// No pointer lock anywhere on this path; start is a plain tap (main.js).

import { S } from '../state.js';
import { pressBite, setTouchKey } from '../systems/player.js';

export function initTouch({ onInteract, onBury }) {
  const ui = document.getElementById('touchui');
  if (!ui) return;
  ui.style.display = 'block';
  document.body.classList.add('touch');

  // ---- movement stick ----
  const base = document.getElementById('stick-base');
  const nub = document.getElementById('stick-nub');
  const R = 52;
  let stickId = null, stickCx = 0, stickCy = 0;
  function stickTo(dx, dy) {
    const l = Math.hypot(dx, dy);
    const k = l > R ? R / l : 1;
    const nx = dx * k, ny = dy * k;
    nub.style.transform = 'translate(' + nx.toFixed(1) + 'px,' + ny.toFixed(1) + 'px)';
    S.touch.x = nx / R;
    S.touch.y = ny / R;
  }
  base.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return; // the first thumb owns this stick
    stickId = e.pointerId;
    const r = base.getBoundingClientRect();
    stickCx = r.left + r.width / 2; stickCy = r.top + r.height / 2;
    stickTo(e.clientX - stickCx, e.clientY - stickCy);
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickId) stickTo(e.clientX - stickCx, e.clientY - stickCy);
  });
  const stickEnd = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    nub.style.transform = 'translate(0px,0px)';
    S.touch.x = 0; S.touch.y = 0;
  };
  window.addEventListener('pointerup', stickEnd);
  window.addEventListener('pointercancel', stickEnd);
  const resetStick = () => {
    stickId = null;
    nub.style.transform = 'translate(0px,0px)';
    S.touch.x = 0; S.touch.y = 0;
  };
  window.addEventListener('blur', resetStick);
  window.addEventListener('pagehide', resetStick);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetStick(); });

  // ---- look drag (right side of the screen) ----
  const look = document.getElementById('lookzone');
  let lookId = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (e) => {
    if (lookId !== null) return; // a second finger cannot steal camera aim
    lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId || !S.started || S.paused) return;
    const P = S.player;
    P.yaw -= (e.clientX - lx) * 0.0046;
    P.pitch -= (e.clientY - ly) * 0.0046;
    P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch));
    lx = e.clientX; ly = e.clientY;
  });
  const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; };
  window.addEventListener('pointerup', lookEnd);
  window.addEventListener('pointercancel', lookEnd);
  window.addEventListener('blur', () => { lookId = null; });
  window.addEventListener('pagehide', () => { lookId = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) lookId = null; });

  // ---- buttons ----
  function holdButton(id, down, up) {
    const el = document.getElementById(id);
    if (!el) return;
    let activePointer = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (activePointer !== null) return;
      activePointer = e.pointerId;
      // iOS Safari supports pointer capture; keep a jump held even when a
      // thumb slides a little outside the button during a big leap.
      if (el.setPointerCapture) {
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* older iOS */ }
      }
      down(el);
    });
    const release = (e) => {
      if (activePointer === null || (e && e.pointerId !== activePointer)) return;
      activePointer = null;
      if (up) up(el);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('pointerleave', (e) => {
      if (!el.hasPointerCapture || !el.hasPointerCapture(e.pointerId)) release(e);
    });
    window.addEventListener('blur', () => release(null));
    window.addEventListener('pagehide', () => release(null));
    document.addEventListener('visibilitychange', () => { if (document.hidden) release(null); });
  }
  holdButton('btn-jump', () => setTouchKey('Space', true), () => setTouchKey('Space', false));
  holdButton('btn-bite', () => pressBite());
  holdButton('btn-act', () => { if (onInteract) onInteract(); });
  holdButton('btn-bury', () => { if (onBury) onBury(); });
  holdButton('btn-sprint', (el) => {
    S.touch.sprint = !S.touch.sprint;
    setTouchKey('ShiftLeft', S.touch.sprint);
    el.classList.toggle('on', S.touch.sprint);
  });
  // The shared keyboard state also clears on focus loss. Reset the toggle
  // badge with it or iOS can display SPRINT ON while actually walking.
  const resetSprint = () => {
    S.touch.sprint = false;
    setTouchKey('ShiftLeft', false);
    document.getElementById('btn-sprint')?.classList.remove('on');
  };
  window.addEventListener('blur', resetSprint);
  window.addEventListener('pagehide', resetSprint);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetSprint(); });
}
