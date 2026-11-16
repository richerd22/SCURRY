// SCURRY - HUD: minimal monospace readouts, contextual prompts, toasts.
// All DOM lives in index.html; this module just writes text into it.

import { S } from '../state.js';
import { clockString, phaseName } from '../systems/daycycle.js';
import { loadSave, observeSave } from '../systems/save.js';

const el = {};
export function initHUD() {
  for (const id of ['hud-stash', 'hud-carried', 'hud-clock', 'hud-prompt', 'hud-warn', 'hud-toast', 'hud-gossip', 'hud-bar']) {
    el[id] = document.getElementById(id);
  }
  // Save persistence (systems/save.js): load at boot - applies the saved
  // stash + mute + bests into S / S.save before the first frame.
  const save = loadSave();
  // Title screen: one dry line for returning squirrels, nothing if no save.
  if (save && save.exists) {
    const title = document.getElementById('title');
    if (title && !document.getElementById('hud-save-line')) {
      const line = document.createElement('div');
      line.id = 'hud-save-line';
      line.className = 'tag'; // the title overlay's existing small-print style
      line.style.marginTop = '18px';
      line.style.marginBottom = '0';
      line.textContent = 'saved stash: ' + save.stash +
        (save.caps > 0 ? ' - caps: ' + save.caps : '') +
        ' - longest run: ' + save.bestDays + (save.bestDays === 1 ? ' day' : ' days');
      title.appendChild(line);
    }
  }
}

const FOOD_NAMES = { acorn: 'acorn', pretzel: 'pretzel bit', sandwich: 'sandwich scrap', peanut: 'peanut', croissant: 'croissant (the good stuff)' };

export function updateHUD(promptText, warnText) {
  observeSave(); // save persistence: dirty-checked, writes only on change
  if (!el['hud-stash']) return;
  el['hud-stash'].textContent = 'STASH ' + S.stash + (S.caps > 0 ? ' · CAPS ' + S.caps : '');
  const barLen = 24;
  const filled = Math.min(barLen, Math.round(S.stash / 60 * barLen));
  el['hud-bar'].textContent = 'winter [' + '#'.repeat(filled) + '-'.repeat(barLen - filled) + ']';
  el['hud-carried'].textContent = S.carried ? 'carrying: ' + (FOOD_NAMES[S.carried] || S.carried) : 'paws empty';
  el['hud-clock'].textContent = clockString(S.timeHours) + ' ' + phaseName(S.timeHours);
  el['hud-prompt'].textContent = promptText || '';
  el['hud-warn'].textContent = warnText || '';
  if (S.message && performance.now() < S.message.until) {
    el['hud-toast'].textContent = S.message.text;
    el['hud-toast'].style.opacity = 1;
  } else {
    el['hud-toast'].style.opacity = 0;
  }
}

export function toast(text, seconds = 3.2) {
  S.message = { text, until: performance.now() + seconds * 1000 };
}

export function setGossip(text) {
  if (el['hud-gossip']) {
    el['hud-gossip'].textContent = text || '';
    el['hud-gossip'].style.opacity = text ? 1 : 0;
  }
}
