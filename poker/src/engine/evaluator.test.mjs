// Quick smoke test for the evaluator. Run: node src/engine/evaluator.test.mjs
import { evaluate, compareScores, CATEGORY } from './evaluator.js';

const S = { c: 0, d: 1, h: 2, s: 3 };
const C = (rank, suit) => ({ rank, suit: S[suit] });

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('  FAIL:', name); }
}

// Category detection on 7-card hands.
const royal = evaluate([C(14, 's'), C(13, 's'), C(12, 's'), C(11, 's'), C(10, 's'), C(2, 'c'), C(3, 'd')]);
check('royal flush -> straight flush', royal.category === CATEGORY.STRAIGHT_FLUSH && royal.score[1] === 14);

const wheelSF = evaluate([C(14, 'h'), C(2, 'h'), C(3, 'h'), C(4, 'h'), C(5, 'h'), C(9, 'c'), C(13, 'd')]);
check('5-high straight flush (wheel)', wheelSF.category === CATEGORY.STRAIGHT_FLUSH && wheelSF.score[1] === 5);

const quads = evaluate([C(9, 'c'), C(9, 'd'), C(9, 'h'), C(9, 's'), C(5, 'c'), C(2, 'd'), C(3, 'h')]);
check('four of a kind', quads.category === CATEGORY.FOUR_KIND && quads.score[1] === 9 && quads.score[2] === 5);

const boat = evaluate([C(8, 'c'), C(8, 'd'), C(8, 'h'), C(4, 's'), C(4, 'c'), C(2, 'd'), C(3, 'h')]);
check('full house', boat.category === CATEGORY.FULL_HOUSE && boat.score[1] === 8 && boat.score[2] === 4);

const flush = evaluate([C(2, 'c'), C(5, 'c'), C(9, 'c'), C(11, 'c'), C(13, 'c'), C(14, 'd'), C(3, 'h')]);
check('flush', flush.category === CATEGORY.FLUSH);

const straight = evaluate([C(5, 'c'), C(6, 'd'), C(7, 'h'), C(8, 's'), C(9, 'c'), C(14, 'd'), C(2, 'h')]);
check('straight 9-high', straight.category === CATEGORY.STRAIGHT && straight.score[1] === 9);

const wheel = evaluate([C(14, 'c'), C(2, 'd'), C(3, 'h'), C(4, 's'), C(5, 'c'), C(13, 'd'), C(9, 'h')]);
check('wheel straight (A-5)', wheel.category === CATEGORY.STRAIGHT && wheel.score[1] === 5);

const trips = evaluate([C(7, 'c'), C(7, 'd'), C(7, 'h'), C(2, 's'), C(5, 'c'), C(13, 'd'), C(9, 'h')]);
check('three of a kind', trips.category === CATEGORY.THREE_KIND && trips.score[1] === 7);

const twoPair = evaluate([C(7, 'c'), C(7, 'd'), C(5, 'h'), C(5, 's'), C(2, 'c'), C(13, 'd'), C(9, 'h')]);
check('two pair (7s & 5s, K kicker)', twoPair.category === CATEGORY.TWO_PAIR && twoPair.score[1] === 7 && twoPair.score[2] === 5 && twoPair.score[3] === 13);

const pair = evaluate([C(7, 'c'), C(7, 'd'), C(5, 'h'), C(3, 's'), C(2, 'c'), C(13, 'd'), C(9, 'h')]);
check('one pair', pair.category === CATEGORY.ONE_PAIR && pair.score[1] === 7);

const high = evaluate([C(7, 'c'), C(4, 'd'), C(5, 'h'), C(3, 's'), C(2, 'c'), C(13, 'd'), C(9, 'h')]);
check('high card', high.category === CATEGORY.HIGH_CARD && high.score[1] === 13);

// Comparisons.
check('flush beats straight', compareScores(flush.score, straight.score) > 0);
check('quads beat full house', compareScores(quads.score, boat.score) > 0);

// Kicker decides between two identical pairs.
const pairA = evaluate([C(10, 'c'), C(10, 'd'), C(14, 'h'), C(3, 's'), C(2, 'c'), C(7, 'd'), C(4, 'h')]);
const pairB = evaluate([C(10, 's'), C(10, 'h'), C(13, 'h'), C(3, 'd'), C(2, 'h'), C(7, 'c'), C(4, 's')]);
check('pair of 10s with A kicker beats K kicker', compareScores(pairA.score, pairB.score) > 0);

// Split pot: identical best hands using the board.
const tieA = evaluate([C(14, 'c'), C(13, 'd'), C(12, 'h'), C(11, 's'), C(10, 'c'), C(2, 'd'), C(3, 'h')]);
const tieB = evaluate([C(14, 'c'), C(13, 'd'), C(12, 'h'), C(11, 's'), C(10, 'c'), C(4, 'd'), C(5, 'h')]);
check('both play the board -> tie', compareScores(tieA.score, tieB.score) === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
