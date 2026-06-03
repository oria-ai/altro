// Bot decision-making. Not world-class, but believable: it estimates hand
// strength, factors in pot odds and position, varies by "personality", and
// bluffs occasionally so it isn't predictable.

import { evaluate, CATEGORY } from './evaluator.js';

// Personalities tune aggression and how loose/tight the bot plays.
export const PERSONALITIES = {
  rock: { aggression: 0.6, looseness: 0.55, bluff: 0.04, name: 'tight' },
  calling_station: { aggression: 0.4, looseness: 1.05, bluff: 0.02, name: 'loose-passive' },
  shark: { aggression: 1.05, looseness: 0.8, bluff: 0.16, name: 'aggressive' },
  maniac: { aggression: 1.4, looseness: 1.15, bluff: 0.28, name: 'wild' },
  regular: { aggression: 0.9, looseness: 0.85, bluff: 0.1, name: 'balanced' },
};

export function randomPersonality(rng = Math.random) {
  const keys = Object.keys(PERSONALITIES);
  return keys[Math.floor(rng() * keys.length)];
}

// Rough preflop strength [0..1] from two hole cards (Chen-style heuristic, scaled).
function preflopStrength(hole) {
  const [a, b] = hole;
  const hi = Math.max(a.rank, b.rank);
  const lo = Math.min(a.rank, b.rank);
  const pair = a.rank === b.rank;
  const suited = a.suit === b.suit;
  const gap = hi - lo;

  let score = 0;
  // High card value.
  score += (hi - 2) / 12 * 0.5;
  if (pair) score += 0.35 + (hi - 2) / 12 * 0.25;
  if (suited) score += 0.1;
  // Connectedness (small gaps make straights).
  if (!pair) {
    if (gap === 1) score += 0.1;
    else if (gap === 2) score += 0.05;
    else if (gap >= 5) score -= 0.08;
  }
  if (lo >= 10) score += 0.08; // both broadway
  return Math.max(0, Math.min(1, score));
}

// Post-flop strength: map made-hand category to a [0..1] strength, with a small
// bump for the kicker/top-card so e.g. top pair beats bottom pair.
function postflopStrength(hole, board) {
  const ev = evaluate([...hole, ...board]);
  const base = {
    [CATEGORY.HIGH_CARD]: 0.15,
    [CATEGORY.ONE_PAIR]: 0.4,
    [CATEGORY.TWO_PAIR]: 0.62,
    [CATEGORY.THREE_KIND]: 0.75,
    [CATEGORY.STRAIGHT]: 0.85,
    [CATEGORY.FLUSH]: 0.9,
    [CATEGORY.FULL_HOUSE]: 0.95,
    [CATEGORY.FOUR_KIND]: 0.99,
    [CATEGORY.STRAIGHT_FLUSH]: 1.0,
  }[ev.category];
  const topcard = (ev.score[1] || 2) / 14 * 0.08;
  return Math.min(1, base + topcard);
}

// Decide an action. Returns { action, amount } where amount is a raise-to total.
// legal is the engine's legalActions() result for this player.
export function decide({ player, board, legal, pot, bigBlind, personality, rng = Math.random }) {
  const cfg = PERSONALITIES[personality] || PERSONALITIES.regular;
  const strength = board.length === 0
    ? preflopStrength(player.holeCards)
    : postflopStrength(player.holeCards, board);

  // Pot odds: cost to call relative to resulting pot.
  const toCall = legal.toCall;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  // Effective strength nudged by personality looseness and a little noise.
  let eff = strength * cfg.looseness + (rng() - 0.5) * 0.08;
  const bluffing = rng() < cfg.bluff;

  // Free to check: mostly check, sometimes bet for value/bluff if strong-ish.
  if (legal.canCheck) {
    const betChance = eff * cfg.aggression * 0.7 + (bluffing ? 0.5 : 0);
    if (rng() < betChance && legal.canRaise) {
      return raiseTo(legal, pot, bigBlind, eff, cfg, rng);
    }
    return { action: 'check' };
  }

  // Facing a bet. Decide fold / call / raise.
  // Strong hands raise; medium hands call if priced in; weak hands fold (or bluff-raise).
  const raiseThreshold = 0.72 - (cfg.aggression - 0.9) * 0.15;
  if ((eff > raiseThreshold || (bluffing && eff > 0.25)) && legal.canRaise) {
    return raiseTo(legal, pot, bigBlind, eff, cfg, rng);
  }

  // Call if hand strength justifies the pot odds (with a looseness cushion).
  const callThreshold = potOdds * (1.4 - (cfg.looseness - 0.85) * 0.5);
  if (eff >= callThreshold && legal.canCall) {
    return { action: 'call' };
  }

  // Cheap to call relative to a big pot — peel sometimes.
  if (legal.canCall && toCall <= bigBlind && eff > 0.2 && rng() < 0.6) {
    return { action: 'call' };
  }

  return { action: 'fold' };
}

function raiseTo(legal, pot, bigBlind, eff, cfg, rng) {
  // Size between ~half pot and pot, scaled by strength/aggression, clamped legal.
  const sizing = (0.5 + eff * 0.5) * (0.8 + cfg.aggression * 0.3);
  let target = legal.toCallBaseline != null ? 0 : 0;
  const raiseAmount = Math.round((pot * sizing) / bigBlind) * bigBlind;
  let raiseToTotal = legal.minRaiseTo + raiseAmount;
  raiseToTotal = Math.max(legal.minRaiseTo, raiseToTotal);
  raiseToTotal = Math.min(legal.maxRaiseTo, raiseToTotal);
  // Occasionally shove with very strong hands.
  if (eff > 0.93 && rng() < 0.5) raiseToTotal = legal.maxRaiseTo;
  return { action: 'raise', amount: raiseToTotal };
}
