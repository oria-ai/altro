// 7-card Texas Hold'em hand evaluator.
// Strategy: evaluate the best 5-card hand out of the 7 available by checking
// all C(7,5)=21 combinations and keeping the strongest. Each 5-card hand is
// scored into a comparable array [category, ...tiebreakers] where a higher
// category wins, and ties are broken by comparing tiebreakers left-to-right.
// This is simple and bug-resistant (no clever bit tricks to get wrong).

export const CATEGORY = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_KIND: 7,
  STRAIGHT_FLUSH: 8,
};

export const CATEGORY_NAMES = {
  0: 'High Card',
  1: 'Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
};

// Returns the straight's high card rank if the 5 ranks form a straight, else 0.
// Handles the wheel (A-2-3-4-5) where the ace plays low and the high card is 5.
function straightHigh(sortedDescRanks) {
  const u = [...new Set(sortedDescRanks)];
  if (u.length !== 5) return 0;
  if (u[0] - u[4] === 4) return u[0];
  // Wheel: A,5,4,3,2
  if (u[0] === 14 && u[1] === 5 && u[2] === 4 && u[3] === 3 && u[4] === 2) {
    return 5;
  }
  return 0;
}

// Score exactly 5 cards into a comparable array.
function score5(cards) {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const sHigh = straightHigh(ranks);

  // Count occurrences of each rank.
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  // Groups sorted by (count desc, rank desc).
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ rank: +r, count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const countsPattern = groups.map((g) => g.count); // e.g. [3,2]

  if (sHigh && isFlush) return [CATEGORY.STRAIGHT_FLUSH, sHigh];
  if (countsPattern[0] === 4) {
    return [CATEGORY.FOUR_KIND, groups[0].rank, groups[1].rank];
  }
  if (countsPattern[0] === 3 && countsPattern[1] === 2) {
    return [CATEGORY.FULL_HOUSE, groups[0].rank, groups[1].rank];
  }
  if (isFlush) return [CATEGORY.FLUSH, ...ranks];
  if (sHigh) return [CATEGORY.STRAIGHT, sHigh];
  if (countsPattern[0] === 3) {
    const kickers = groups.slice(1).map((g) => g.rank);
    return [CATEGORY.THREE_KIND, groups[0].rank, ...kickers];
  }
  if (countsPattern[0] === 2 && countsPattern[1] === 2) {
    return [CATEGORY.TWO_PAIR, groups[0].rank, groups[1].rank, groups[2].rank];
  }
  if (countsPattern[0] === 2) {
    const kickers = groups.slice(1).map((g) => g.rank);
    return [CATEGORY.ONE_PAIR, groups[0].rank, ...kickers];
  }
  return [CATEGORY.HIGH_CARD, ...ranks];
}

// Lexicographic compare of two score arrays. >0 if a wins, <0 if b wins, 0 tie.
export function compareScores(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function* combinations(arr, k) {
  const n = arr.length;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.map((i) => arr[i]);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

// Evaluate the best 5-card hand from 5..7 cards.
// Returns { score, category, name, cards } where `cards` are the best 5.
export function evaluate(cards) {
  let best = null;
  let bestCards = null;
  for (const combo of combinations(cards, 5)) {
    const s = score5(combo);
    if (best === null || compareScores(s, best) > 0) {
      best = s;
      bestCards = combo;
    }
  }
  return {
    score: best,
    category: best[0],
    name: CATEGORY_NAMES[best[0]],
    cards: bestCards,
  };
}
