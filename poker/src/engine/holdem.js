// Texas Hold'em game state machine for a single table.
// Drives one hand at a time: post blinds -> deal -> betting streets -> showdown.
// The engine is synchronous and queryable; the UI calls act() for the human and
// for bots, and reads state to render. An onEvent callback lets the UI animate
// and log what happened.

import { makeDeck, shuffle } from './cards.js';
import { evaluate, compareScores } from './evaluator.js';

export const STREETS = ['preflop', 'flop', 'turn', 'river', 'showdown'];

export class Holdem {
  constructor({ players, smallBlind = 50, bigBlind = 100, rng = Math.random, onEvent = () => {} }) {
    // players: [{ id, name, isHuman, chips, avatar }]
    this.players = players.map((p) => ({
      ...p,
      holeCards: [],
      bet: 0, // committed this street
      committed: 0, // committed this whole hand
      folded: false,
      allIn: false,
      hasActed: false,
      lastAction: null,
      busted: p.chips <= 0,
    }));
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.rng = rng;
    this.onEvent = onEvent;
    this.button = 0;
    this.handNumber = 0;
    this.street = null;
    this.board = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaiseIncrement = bigBlind;
    this.current = null; // index of player to act
    this.deck = [];
    this.handOver = true;
    this.results = null; // populated at showdown/win
  }

  emit(type, data = {}) {
    this.onEvent({ type, ...data });
  }

  activePlayers() {
    return this.players.filter((p) => !p.busted);
  }

  // Players still in the hand (not folded, not busted).
  inHand() {
    return this.players.filter((p) => !p.folded && !p.busted);
  }

  // Players who can still take an action (in hand and not all-in).
  canAct() {
    return this.inHand().filter((p) => !p.allIn);
  }

  startHand() {
    const live = this.activePlayers();
    if (live.length < 2) {
      this.emit('gameOver', { players: this.players });
      return false;
    }
    this.handNumber++;
    this.handOver = false;
    this.results = null;
    this.board = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaiseIncrement = this.bigBlind;
    this.street = 'preflop';
    this.deck = shuffle(makeDeck(), this.rng);

    for (const p of this.players) {
      p.holeCards = [];
      p.bet = 0;
      p.committed = 0;
      p.folded = p.busted;
      p.allIn = false;
      p.hasActed = false;
      p.lastAction = null;
    }

    // Move button to next live player.
    this.button = this.nextLiveIndex(this.button);
    this.emit('handStart', { handNumber: this.handNumber, button: this.button });

    this.postBlinds();
    this.dealHole();

    // First to act preflop is the player after the big blind.
    this.current = this.nextActiveIndex(this.bbIndex);
    this.emit('street', { street: 'preflop', board: this.board });
    this.maybeAutoRun();
    return true;
  }

  nextLiveIndex(from) {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (from + i) % n;
      if (!this.players[idx].busted) return idx;
    }
    return from;
  }

  // Next index that can still act (in hand, not all-in), searching forward.
  nextActiveIndex(from) {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (from + i) % n;
      const p = this.players[idx];
      if (!p.folded && !p.busted && !p.allIn) return idx;
    }
    return -1;
  }

  postBlinds() {
    const live = this.activePlayers();
    if (live.length === 2) {
      // Heads-up: button posts small blind and acts first preflop.
      this.sbIndex = this.button;
      this.bbIndex = this.nextLiveIndex(this.button);
    } else {
      this.sbIndex = this.nextLiveIndex(this.button);
      this.bbIndex = this.nextLiveIndex(this.sbIndex);
    }
    this.postBlind(this.sbIndex, this.smallBlind, 'small blind');
    this.postBlind(this.bbIndex, this.bigBlind, 'big blind');
    this.currentBet = this.bigBlind;
    this.minRaiseIncrement = this.bigBlind;
  }

  postBlind(idx, amount, label) {
    const p = this.players[idx];
    const pay = Math.min(amount, p.chips);
    p.chips -= pay;
    p.bet += pay;
    p.committed += pay;
    if (p.chips === 0) p.allIn = true;
    this.emit('blind', { player: idx, amount: pay, label });
  }

  dealHole() {
    // Two cards each, dealt one at a time starting left of the button.
    for (let round = 0; round < 2; round++) {
      let idx = this.button;
      for (let i = 0; i < this.players.length; i++) {
        idx = this.nextLiveIndex(idx);
        this.players[idx].holeCards.push(this.deck.pop());
      }
    }
    this.emit('dealt', {});
  }

  // What the current player is legally allowed to do.
  legalActions(idx = this.current) {
    const p = this.players[idx];
    if (!p || p.folded || p.busted || p.allIn) return null;
    const toCall = this.currentBet - p.bet;
    const canCheck = toCall === 0;
    const canCall = toCall > 0 && p.chips > 0;
    const callAmount = Math.min(toCall, p.chips);
    // Minimum legal raise: match the bet, then add at least the min increment.
    const minRaiseTo = this.currentBet + this.minRaiseIncrement;
    const maxRaiseTo = p.bet + p.chips; // going all-in
    const canRaise = p.chips > toCall; // has chips beyond the call
    return {
      toCall,
      canCheck,
      canCall,
      callAmount,
      canRaise,
      minRaiseTo: Math.min(minRaiseTo, maxRaiseTo),
      maxRaiseTo,
      canFold: true,
    };
  }

  // action: 'fold' | 'check' | 'call' | 'raise' | 'allin'
  // amount: for 'raise', the total amount to raise TO (not the increment).
  act(action, amount) {
    if (this.handOver) return;
    const idx = this.current;
    const p = this.players[idx];
    const legal = this.legalActions(idx);
    if (!legal) return;

    if (action === 'fold') {
      p.folded = true;
      p.lastAction = 'Fold';
      this.emit('action', { player: idx, action: 'fold' });
    } else if (action === 'check') {
      if (!legal.canCheck) return this.act('call', 0); // safety
      p.lastAction = 'Check';
      this.emit('action', { player: idx, action: 'check' });
    } else if (action === 'call') {
      this.putIn(p, legal.callAmount);
      p.lastAction = p.allIn ? 'All-In' : 'Call';
      this.emit('action', { player: idx, action: 'call', amount: legal.callAmount });
    } else if (action === 'raise' || action === 'allin') {
      let raiseTo = action === 'allin' ? legal.maxRaiseTo : amount;
      raiseTo = Math.max(raiseTo, legal.minRaiseTo);
      raiseTo = Math.min(raiseTo, legal.maxRaiseTo);
      const added = raiseTo - p.bet;
      const raiseIncrement = raiseTo - this.currentBet;
      this.putIn(p, added);
      // A full-sized raise reopens betting for everyone who already acted.
      if (raiseIncrement >= this.minRaiseIncrement) {
        this.minRaiseIncrement = raiseIncrement;
        for (const op of this.players) {
          if (op !== p && !op.folded && !op.busted && !op.allIn) op.hasActed = false;
        }
      }
      this.currentBet = Math.max(this.currentBet, p.bet);
      p.lastAction = p.allIn ? 'All-In' : 'Raise';
      this.emit('action', { player: idx, action: 'raise', amount: raiseTo, allIn: p.allIn });
    }

    p.hasActed = true;
    this.afterAction();
  }

  putIn(p, amount) {
    const pay = Math.min(amount, p.chips);
    p.chips -= pay;
    p.bet += pay;
    p.committed += pay;
    if (p.chips === 0) p.allIn = true;
  }

  afterAction() {
    // If only one player remains in the hand, they win immediately.
    if (this.inHand().length === 1) {
      this.collectBets();
      this.awardUncontested();
      return;
    }
    if (this.bettingRoundComplete()) {
      this.endBettingRound();
    } else {
      this.current = this.nextActiveIndex(this.current);
      if (this.current === -1) {
        this.endBettingRound();
      } else {
        this.emit('turn', { player: this.current });
      }
    }
  }

  bettingRoundComplete() {
    const actors = this.canAct();
    if (actors.length === 0) return true;
    return actors.every((p) => p.hasActed && p.bet === this.currentBet);
  }

  collectBets() {
    for (const p of this.players) {
      this.pot += p.bet;
      p.bet = 0;
    }
  }

  endBettingRound() {
    this.collectBets();
    if (this.street === 'river') {
      this.showdown();
      return;
    }
    this.dealNextStreet();
    // Reset for new street.
    this.currentBet = 0;
    this.minRaiseIncrement = this.bigBlind;
    for (const p of this.players) p.hasActed = false;
    this.current = this.nextActiveIndex(this.button);
    this.maybeAutoRun();
  }

  dealNextStreet() {
    if (this.street === 'preflop') {
      this.deck.pop(); // burn
      this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.street = 'flop';
    } else if (this.street === 'flop') {
      this.deck.pop();
      this.board.push(this.deck.pop());
      this.street = 'turn';
    } else if (this.street === 'turn') {
      this.deck.pop();
      this.board.push(this.deck.pop());
      this.street = 'river';
    }
    this.emit('street', { street: this.street, board: this.board });
  }

  // If at most one player can still act, no betting is possible: run the board
  // out to the river and go to showdown automatically.
  maybeAutoRun() {
    if (this.handOver) return;
    if (this.canAct().length <= 1 && this.inHand().length >= 2) {
      // Are bets settled? Everyone who can act has matched (or there's nobody).
      const settled = this.canAct().every((p) => p.bet === this.currentBet);
      if (settled) {
        this.collectBets();
        while (this.street !== 'river') {
          this.dealNextStreet();
        }
        this.showdown();
      }
    }
  }

  awardUncontested() {
    const winner = this.inHand()[0];
    winner.chips += this.pot;
    this.results = {
      uncontested: true,
      pots: [{ amount: this.pot, winners: [winner.id] }],
      winnersById: { [winner.id]: this.pot },
      revealed: false,
    };
    this.emit('handResult', { results: this.results, pot: this.pot, winner: winner.id });
    this.finishHand();
  }

  showdown() {
    const contenders = this.inHand();
    // Evaluate everyone's best hand.
    const evals = {};
    for (const p of contenders) {
      evals[p.id] = evaluate([...p.holeCards, ...this.board]);
    }
    // Build (side) pots from each player's total commitment this hand.
    const pots = this.buildPots();
    const winnersById = {};
    const potResults = [];
    for (const pot of pots) {
      const eligible = pot.eligible.filter((id) => contenders.some((p) => p.id === id));
      let best = null;
      let winners = [];
      for (const id of eligible) {
        const sc = evals[id].score;
        if (best === null || compareScores(sc, best) > 0) {
          best = sc;
          winners = [id];
        } else if (compareScores(sc, best) === 0) {
          winners.push(id);
        }
      }
      // Split the pot; distribute odd chips one at a time from first seat left of button.
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount - share * winners.length;
      const ordered = this.orderFromButton(winners);
      for (const id of ordered) {
        let take = share;
        if (remainder > 0) { take += 1; remainder -= 1; }
        winnersById[id] = (winnersById[id] || 0) + take;
      }
      potResults.push({ amount: pot.amount, winners });
    }
    for (const p of contenders) {
      if (winnersById[p.id]) p.chips += winnersById[p.id];
    }
    this.results = {
      uncontested: false,
      pots: potResults,
      winnersById,
      revealed: true,
      evals,
    };
    this.emit('showdown', { results: this.results, board: this.board, evals });
    this.finishHand();
  }

  // Construct main + side pots from players' committed amounts.
  buildPots() {
    const contributors = this.players.filter((p) => p.committed > 0);
    const levels = [...new Set(contributors.map((p) => p.committed))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const level of levels) {
      let amount = 0;
      const eligible = [];
      for (const p of contributors) {
        if (p.committed >= level) {
          amount += level - prev;
          if (!p.folded) eligible.push(p.id);
        } else if (p.committed > prev) {
          amount += p.committed - prev;
        }
      }
      if (amount > 0) pots.push({ amount, eligible });
      prev = level;
    }
    // Merge adjacent pots with identical eligibility for cleaner display.
    const merged = [];
    for (const pot of pots) {
      const last = merged[merged.length - 1];
      if (last && JSON.stringify(last.eligible) === JSON.stringify(pot.eligible)) {
        last.amount += pot.amount;
      } else {
        merged.push({ ...pot });
      }
    }
    return merged;
  }

  orderFromButton(ids) {
    const order = [];
    let idx = this.button;
    for (let i = 0; i < this.players.length; i++) {
      idx = (idx + 1) % this.players.length;
      const p = this.players[idx];
      if (ids.includes(p.id)) order.push(p.id);
    }
    return order;
  }

  finishHand() {
    this.handOver = true;
    // Mark newly busted players.
    for (const p of this.players) {
      if (p.chips <= 0) p.busted = true;
    }
    this.emit('handComplete', { results: this.results });
  }
}
