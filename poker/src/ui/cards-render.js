// Helpers to render card { rank, suit } objects as DOM elements.
// Full-size cards get a realistic layout (corner index + large center pip);
// small cards (hole cards at seats) stay compact for space.
import { RANK_LABELS, SUITS, SUIT_SYMBOLS, cardColor } from '../engine/cards.js';

export function cardEl(card, { small = false, anim = '' } = {}) {
  const el = document.createElement('div');
  const red = cardColor(card) === 'red';
  el.className = 'card' + (small ? ' small' : '') + (red ? ' red' : '') + (anim ? ' ' + anim : '');
  const rank = RANK_LABELS[card.rank];
  const suit = SUIT_SYMBOLS[SUITS[card.suit]];

  if (small) {
    // Compact: rank over suit, centered.
    const r = document.createElement('span');
    r.className = 'r';
    r.textContent = rank;
    const s = document.createElement('span');
    s.className = 's';
    s.textContent = suit;
    el.append(r, s);
  } else {
    // Realistic: corner index top-left + bottom-right, big center pip.
    el.appendChild(corner(rank, suit, 'tl'));
    const pip = document.createElement('span');
    pip.className = 'pip';
    pip.textContent = suit;
    el.appendChild(pip);
    el.appendChild(corner(rank, suit, 'br'));
  }
  return el;
}

function corner(rank, suit, where) {
  const c = document.createElement('span');
  c.className = 'corner ' + where;
  const r = document.createElement('span');
  r.className = 'cr';
  r.textContent = rank;
  const s = document.createElement('span');
  s.className = 'cs';
  s.textContent = suit;
  c.append(r, s);
  return c;
}

export function cardBackEl({ small = false } = {}) {
  const el = document.createElement('div');
  el.className = 'card back' + (small ? ' small' : '');
  return el;
}
