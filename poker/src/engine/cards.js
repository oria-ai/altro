// Card representation and deck utilities.
// A card is { rank, suit } where rank is 2..14 (11=J,12=Q,13=K,14=A)
// and suit is 0..3 -> ['c','d','h','s'].

export const SUITS = ['c', 'd', 'h', 's'];
export const SUIT_SYMBOLS = { c: '♣', d: '♦', h: '♥', s: '♠' };
export const RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export function makeDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ rank: r, suit: s });
    }
  }
  return deck;
}

// Fisher-Yates shuffle. Accepts an optional rng (defaults to Math.random)
// so tests can be made deterministic.
export function shuffle(deck, rng = Math.random) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardLabel(card) {
  return RANK_LABELS[card.rank] + SUIT_SYMBOLS[SUITS[card.suit]];
}

export function cardColor(card) {
  const s = SUITS[card.suit];
  return s === 'd' || s === 'h' ? 'red' : 'black';
}
