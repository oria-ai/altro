// Simulation test: play many full hands of bot-vs-bot poker and assert the
// engine never crashes, never produces negative chips, and conserves the total
// chip count exactly (the key invariant that catches pot/side-pot bugs).
import { Holdem } from './holdem.js';
import { decide, randomPersonality } from './ai.js';

// Tiny seeded PRNG (mulberry32) so failures are reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runOneTable(seed, numPlayers, handsToPlay) {
  const rng = mulberry32(seed);
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({ id: `p${i}`, name: `Bot${i}`, isHuman: false, chips: 10000 });
  }
  const personalities = players.map(() => randomPersonality(rng));
  const startTotal = players.reduce((s, p) => s + p.chips, 0);

  const game = new Holdem({ players, smallBlind: 50, bigBlind: 100, rng });

  let hands = 0;
  let safety = 0;
  while (hands < handsToPlay) {
    if (game.activePlayers().length < 2) break;
    if (!game.startHand()) break;
    // Drive bot actions until the hand is over.
    while (!game.handOver) {
      if (++safety > 100000) throw new Error('infinite loop guard tripped');
      const idx = game.current;
      if (idx == null || idx < 0) {
        throw new Error(`no current player but hand not over (street=${game.street})`);
      }
      const p = game.players[idx];
      const legal = game.legalActions(idx);
      if (!legal) throw new Error('current player has no legal actions');
      const d = decide({
        player: p, board: game.board, legal, pot: game.pot,
        bigBlind: game.bigBlind, personality: personalities[idx], rng,
      });
      game.act(d.action, d.amount);
    }
    hands++;

    // Invariants after each hand.
    const total = game.players.reduce((s, p) => s + p.chips, 0);
    if (total !== startTotal) {
      throw new Error(`chip leak: started ${startTotal}, now ${total} (hand ${hands}, seed ${seed})`);
    }
    for (const p of game.players) {
      if (p.chips < 0) throw new Error(`negative chips for ${p.id}: ${p.chips}`);
    }
  }
  return { hands };
}

let pass = 0;
let fail = 0;
const configs = [
  { players: 2, hands: 300 },
  { players: 3, hands: 300 },
  { players: 6, hands: 400 },
  { players: 9, hands: 400 },
];
for (const cfg of configs) {
  for (let seed = 1; seed <= 25; seed++) {
    try {
      runOneTable(seed * 7919, cfg.players, cfg.hands);
      pass++;
    } catch (e) {
      fail++;
      console.error(`  FAIL ${cfg.players}p seed ${seed}:`, e.message);
    }
  }
}
console.log(`\n${pass} table-runs passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
