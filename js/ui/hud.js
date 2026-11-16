// SCURRY - HUD: minimal monospace readouts, contextual prompts, toasts.
// All DOM lives in index.html; this module just writes text into it.

import { S } from '../state.js';
import { clockString, phaseName } from '../systems/daycycle.js';

const el = {};
export function initHUD() {
  for (const id of ['hud-stash', 'hud-carried', 'hud-clock', 'hud-prompt', 'hud-warn', 'hud-toast', 'hud-gossip', 'hud-bar']) {
    el[id] = document.getElementById(id);
  }
}

const FOOD_NAMES = { acorn: 'acorn', pretzel: 'pretzel bit', sandwich: 'sandwich scrap', peanut: 'peanut' };

export function updateHUD(promptText, warnText) {
  if (!el['hud-stash']) return;
  el['hud-stash'].textContent = 'STASH ' + S.stash;
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
