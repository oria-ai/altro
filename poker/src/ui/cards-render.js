// Helpers to render card { rank, suit } objects as DOM elements.
import { RANK_LABELS, SUITS, SUIT_SYMBOLS, cardColor } from '../engine/cards.js';

export function cardEl(card, { small = false, anim = '' } = {}) {
  const el = document.createElement('div');
  el.className = 'card' + (small ? ' small' : '') + (cardColor(card) === 'red' ? ' red' : '') + (anim ? ' ' + anim : '');
  const r = document.createElement('span');
  r.className = 'r';
  r.textContent = RANK_LABELS[card.rank];
  const s = document.createElement('span');
  s.className = 's';
  s.textContent = SUIT_SYMBOLS[SUITS[card.suit]];
  el.appendChild(r);
  el.appendChild(s);
  return el;
}

export function cardBackEl({ small = false } = {}) {
  const el = document.createElement('div');
  el.className = 'card back' + (small ? ' small' : '');
  return el;
}
