// Table screen: renders the felt, runs the hand loop, drives bots on timers,
// and handles the human's turn (action bar + countdown). Uses a buy-in model —
// the human sits with a stack drawn from their bankroll, auto-rebuys between
// hands, and when both stack and bank are empty the store is offered.

import { Holdem } from '../engine/holdem.js';
import { decide, randomPersonality, PERSONALITIES } from '../engine/ai.js';
import { cardEl, cardBackEl } from './cards-render.js';
import { fmt } from './storage.js';

const AVATARS = ['🦁', '🐺', '🦊', '🐯', '🐸', '🐙', '🦉', '🐲', '🦅'];
const BOT_NAMES = ['Vegas Vic', 'Lucky', 'Diesel', 'Mama Cash', 'Tank', 'Ghost', 'Ruby', 'Slick', 'Bishop'];
const HUMAN_TURN_SECONDS = 22;

export class Table {
  constructor(app, state, persist, { numSeats = 6, onExit, onNeedChips }) {
    this.app = app;
    this.state = state; // shared player state (bankroll = state.chips)
    this.persist = persist; // save fn
    this.numSeats = numSeats;
    this.onExit = onExit;
    this.onNeedChips = onNeedChips;
    this.stakes = { sb: 50, bb: 100, minBuy: 2000, maxBuy: 10000 };
    this.timers = [];
    this.timerHandle = null;
  }

  // ---- lifecycle ----
  mount() {
    this.root = document.createElement('div');
    this.root.className = 'table-screen';
    this.root.innerHTML = `
      <div class="topbar">
        <div class="chip-pill"><span class="coin" style="width:24px;height:24px"></span>
          <span id="bankroll">0</span>
          <span class="plus" id="addchips">+</span>
        </div>
        <div class="spacer"></div>
        <div class="chip-pill" style="border-color:#ffffff33"><span style="font-size:12px;opacity:.8">Blinds</span>
          <b id="blinds">50/100</b></div>
      </div>
      <button class="back-btn" id="leave">⏏</button>
      <div class="felt" id="felt">
        <div class="table-brand">ROYAL POKER</div>
        <div class="board-area">
          <div class="community" id="community"></div>
          <div class="pot-badge"><span class="coin" style="width:16px;height:16px"></span>Pot: <span id="pot">0</span></div>
        </div>
      </div>
      <div class="actionbar" id="actionbar"></div>`;
    this.app.appendChild(this.root);
    this.felt = this.root.querySelector('#felt');
    this.community = this.root.querySelector('#community');
    this.actionbar = this.root.querySelector('#actionbar');
    this.root.querySelector('#blinds').textContent = `${this.stakes.sb}/${this.stakes.bb}`;
    this.root.querySelector('#leave').addEventListener('click', () => this.leave());
    this.root.querySelector('#addchips').addEventListener('click', () => this.onNeedChips && this.onNeedChips());
    this.buildSeats();
    this.start();
  }

  destroy() {
    this.clearTimers();
    if (this.root) this.root.remove();
  }

  leave() {
    // Return the human's table stack to the bankroll, then exit.
    if (this.game) {
      const hum = this.game.players[this.humanIndex];
      if (hum) this.state.chips = this.bank + hum.chips;
    }
    this.persist();
    this.destroy();
    this.onExit && this.onExit();
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.timerHandle) { cancelAnimationFrame(this.timerHandle); this.timerHandle = null; }
  }
  after(ms, fn) { const t = setTimeout(fn, ms); this.timers.push(t); return t; }

  // ---- seat geometry ----
  seatPositions(n) {
    // Human at bottom center; others spread around the oval (in % of felt box).
    const layouts = {
      2: [[50, 92], [50, 8]],
      3: [[50, 92], [12, 30], [88, 30]],
      4: [[50, 92], [8, 45], [50, 8], [92, 45]],
      6: [[50, 93], [8, 60], [12, 22], [50, 8], [88, 22], [92, 60]],
      9: [[50, 93], [12, 75], [6, 45], [16, 16], [40, 7], [60, 7], [84, 16], [94, 45], [88, 75]],
    };
    return layouts[n] || layouts[6];
  }

  buildSeats() {
    const pos = this.seatPositions(this.numSeats);
    this.seatEls = [];
    for (let i = 0; i < this.numSeats; i++) {
      const seat = document.createElement('div');
      seat.className = 'seat';
      seat.style.left = pos[i][0] + '%';
      seat.style.top = pos[i][1] + '%';
      seat.innerHTML = `
        <div class="holecards"></div>
        <div class="avatar-wrap">
          <div class="timer-ring"></div>
          <div class="avatar"></div>
        </div>
        <div class="nameplate">
          <div class="nm"></div>
          <div class="ch"><span class="coin" style="width:12px;height:12px"></span><span class="amt"></span></div>
        </div>`;
      this.felt.appendChild(seat);
      this.seatEls.push(seat);
    }
  }

  // ---- game setup ----
  start() {
    // Buy-in: human takes a stack from the bankroll; remainder stays in bank.
    const buyIn = Math.min(this.state.chips, this.stakes.maxBuy);
    this.bank = this.state.chips - buyIn;
    this.humanIndex = 0;

    const players = [];
    const botSeats = this.numSeats - 1;
    const pool = this.shuffleArr([...BOT_NAMES]);
    players.push({ id: 'human', name: 'You', isHuman: true, chips: buyIn, avatar: '😎' });
    for (let i = 0; i < botSeats; i++) {
      players.push({
        id: 'bot' + i,
        name: pool[i % pool.length],
        isHuman: false,
        chips: this.randInt(this.stakes.maxBuy * 0.6, this.stakes.maxBuy * 1.3),
        avatar: AVATARS[i % AVATARS.length],
        personality: randomPersonality(),
      });
    }
    this.players = players;

    this.game = new Holdem({
      players,
      smallBlind: this.stakes.sb,
      bigBlind: this.stakes.bb,
      onEvent: (e) => this.onEvent(e),
    });

    this.renderStatic();
    this.after(400, () => this.startHand());
  }

  randInt(a, b) { return Math.round(a + Math.random() * (b - a)); }
  shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  renderStatic() {
    this.game.players.forEach((p, i) => {
      const seat = this.seatEls[i];
      seat.querySelector('.avatar').textContent = p.avatar || '🙂';
      seat.querySelector('.nm').textContent = p.name;
    });
  }

  startHand() {
    // Auto-rebuy the human from the bank if their stack is short.
    this.autoRebuy();
    // Reseat any busted bots with a fresh stack ("new player sits down").
    for (let i = 1; i < this.game.players.length; i++) {
      const p = this.game.players[i];
      if (p.busted || p.chips <= 0) {
        p.chips = this.randInt(this.stakes.maxBuy * 0.6, this.stakes.maxBuy * 1.3);
        p.busted = false;
        p.name = this.shuffleArr([...BOT_NAMES])[0];
        p.personality = randomPersonality();
      }
    }
    const human = this.game.players[this.humanIndex];
    if (human.chips <= 0 && this.bank <= 0) {
      this.showBrokeAndStore();
      return;
    }

    this.lastActionBubbles = {};
    this.community.innerHTML = '';
    const started = this.game.startHand();
    if (!started) { this.leave(); return; }
    this.render();
    this.toast(this.streetLabel('preflop'), '', 700);
    this.after(500, () => this.scheduleNext());
  }

  autoRebuy() {
    const human = this.game.players[this.humanIndex];
    if (human.chips < this.stakes.minBuy && this.bank > 0) {
      const want = this.stakes.maxBuy - human.chips;
      const topUp = Math.min(want, this.bank);
      human.chips += topUp;
      this.bank -= topUp;
      human.busted = human.chips <= 0;
    }
  }

  // ---- engine events ----
  onEvent(e) {
    if (e.type === 'action') {
      const labelMap = { fold: 'FOLD', check: 'CHECK', call: 'CALL', raise: 'RAISE' };
      let txt = labelMap[e.action] || '';
      const p = this.game.players[e.player];
      if (e.action === 'raise' && p.allIn) txt = 'ALL-IN';
      this.lastActionBubbles[e.player] = { txt, kind: e.action === 'fold' ? 'fold' : '' };
    } else if (e.type === 'blind') {
      // shown via bet chips in render
    }
  }

  // ---- main loop ----
  scheduleNext() {
    if (this.game.handOver) { this.handEnd(); return; }
    this.render();
    const idx = this.game.current;
    if (idx === this.humanIndex) {
      this.promptHuman();
    } else {
      this.hideActionBar();
      const p = this.game.players[idx];
      const delay = 650 + Math.random() * 900;
      this.after(delay, () => this.botMove(idx));
    }
  }

  botMove(idx) {
    if (this.game.handOver || this.game.current !== idx) return;
    const p = this.game.players[idx];
    const legal = this.game.legalActions(idx);
    if (!legal) { this.scheduleNext(); return; }
    const d = decide({
      player: p, board: this.game.board, legal, pot: this.game.pot,
      bigBlind: this.game.bigBlind, personality: p.personality,
    });
    this.game.act(d.action, d.amount);
    this.scheduleNext();
  }

  // ---- human turn ----
  promptHuman() {
    const legal = this.game.legalActions(this.humanIndex);
    if (!legal) { this.scheduleNext(); return; }
    this.render();
    this.showActionBar(legal);
    this.startTurnTimer(legal);
  }

  startTurnTimer(legal) {
    const start = performance.now();
    const ring = this.seatEls[this.humanIndex].querySelector('.timer-ring');
    const tick = (now) => {
      const elapsed = (now - start) / 1000;
      const frac = Math.min(1, elapsed / HUMAN_TURN_SECONDS);
      ring.style.setProperty('--deg', (360 * (1 - frac)) + 'deg');
      if (frac >= 1) {
        // Time's up: check if possible, otherwise fold.
        this.humanAct(legal.canCheck ? 'check' : 'fold');
        return;
      }
      this.timerHandle = requestAnimationFrame(tick);
    };
    this.timerHandle = requestAnimationFrame(tick);
  }

  showActionBar(legal) {
    const g = this.game;
    const human = g.players[this.humanIndex];
    const bb = g.bigBlind;
    const minTo = legal.minRaiseTo;
    const maxTo = legal.maxRaiseTo;
    const canSlide = legal.canRaise && maxTo > minTo;
    this.actionbar.classList.remove('hidden');
    this.actionbar.innerHTML = `
      ${legal.canRaise ? `
      <div class="raise-row">
        <input type="range" id="raise" min="${minTo}" max="${maxTo}" step="${bb}" value="${minTo}" ${canSlide ? '' : 'disabled'} />
        <div class="raise-amt" id="raiseamt">${fmt(minTo)}</div>
      </div>
      <div class="quick">
        <button class="btn ghost" data-q="min">Min</button>
        <button class="btn ghost" data-q="half">½ Pot</button>
        <button class="btn ghost" data-q="pot">Pot</button>
        <button class="btn ghost" data-q="max">All-In</button>
      </div>` : ''}
      <div class="btns-row">
        <button class="btn red" id="foldbtn">Fold</button>
        ${legal.canCheck
          ? `<button class="btn blue" id="checkbtn">Check</button>`
          : `<button class="btn blue" id="callbtn">Call ${fmt(legal.callAmount)}</button>`}
        ${legal.canRaise
          ? `<button class="btn green" id="raisebtn">${legal.toCall > 0 ? 'Raise' : 'Bet'}</button>`
          : ''}
      </div>`;

    const slider = this.actionbar.querySelector('#raise');
    const amt = this.actionbar.querySelector('#raiseamt');
    const setRaise = (v) => {
      v = Math.max(minTo, Math.min(maxTo, Math.round(v / bb) * bb));
      if (slider) slider.value = v;
      if (amt) amt.textContent = v >= maxTo ? 'All-In' : fmt(v);
    };
    if (slider) slider.addEventListener('input', () => setRaise(+slider.value));

    this.actionbar.querySelectorAll('[data-q]').forEach((b) => {
      b.addEventListener('click', () => {
        const pot = g.pot + g.players.reduce((s, p) => s + p.bet, 0);
        const q = b.dataset.q;
        let v = minTo;
        if (q === 'min') v = minTo;
        else if (q === 'half') v = g.currentBet + Math.round(pot * 0.5);
        else if (q === 'pot') v = g.currentBet + pot;
        else if (q === 'max') v = maxTo;
        setRaise(v);
      });
    });

    const fold = this.actionbar.querySelector('#foldbtn');
    fold && fold.addEventListener('click', () => this.humanAct('fold'));
    const check = this.actionbar.querySelector('#checkbtn');
    check && check.addEventListener('click', () => this.humanAct('check'));
    const call = this.actionbar.querySelector('#callbtn');
    call && call.addEventListener('click', () => this.humanAct('call'));
    const raise = this.actionbar.querySelector('#raisebtn');
    raise && raise.addEventListener('click', () => {
      const v = slider ? +slider.value : minTo;
      this.humanAct(v >= maxTo ? 'allin' : 'raise', v);
    });
  }

  hideActionBar() {
    this.actionbar.classList.add('hidden');
  }

  humanAct(action, amount) {
    this.clearTimers();
    const ring = this.seatEls[this.humanIndex].querySelector('.timer-ring');
    ring.style.setProperty('--deg', '0deg');
    this.hideActionBar();
    this.game.act(action, amount);
    this.scheduleNext();
  }

  // ---- rendering ----
  render() {
    const g = this.game;
    // bankroll = bank + human stack (live).
    const human = g.players[this.humanIndex];
    this.root.querySelector('#bankroll').textContent = fmt(this.bank + (human ? human.chips : 0));
    this.root.querySelector('#pot').textContent = fmt(g.pot);

    // community cards
    this.community.innerHTML = '';
    g.board.forEach((c) => this.community.appendChild(cardEl(c, { anim: 'flip' })));

    g.players.forEach((p, i) => {
      const seat = this.seatEls[i];
      seat.classList.toggle('folded', p.folded && !p.busted);
      seat.classList.toggle('active', i === g.current && !g.handOver);
      seat.style.opacity = p.busted ? '0.25' : '';
      seat.querySelector('.nm').textContent = p.name;
      seat.querySelector('.amt').textContent = fmt(p.chips);

      // hole cards
      const hc = seat.querySelector('.holecards');
      hc.innerHTML = '';
      if (!p.busted && p.holeCards.length) {
        const reveal = p.isHuman || this.revealAll;
        p.holeCards.forEach((card) => {
          hc.appendChild(reveal ? cardEl(card, { small: true }) : cardBackEl({ small: true }));
        });
      }

      // action bubble
      const old = seat.querySelector('.action-bubble');
      if (old) old.remove();
      const bub = this.lastActionBubbles[i];
      if (bub && bub.txt && !p.busted) {
        const el = document.createElement('div');
        el.className = 'action-bubble ' + (bub.kind || '');
        el.textContent = bub.txt;
        seat.querySelector('.avatar-wrap').appendChild(el);
      }

      // bet chips in front of seat
      this.renderBet(seat, i, p);
    });

    this.renderDealerButton();
  }

  renderBet(seat, i, p) {
    let chip = seat.querySelector('.bet-chips');
    if (p.bet > 0 && !p.busted) {
      if (!chip) {
        chip = document.createElement('div');
        chip.className = 'bet-chips';
        chip.innerHTML = `<span class="coin" style="width:16px;height:16px"></span><span class="bamt"></span>`;
        seat.appendChild(chip);
        // place bet chips toward the table center
        const towardCenter = this.betOffset(i);
        chip.style.left = towardCenter.left;
        chip.style.top = towardCenter.top;
      }
      chip.querySelector('.bamt').textContent = fmt(p.bet);
    } else if (chip) {
      chip.remove();
    }
  }

  betOffset(i) {
    // Nudge the bet display from the seat toward the table center.
    const pos = this.seatPositions(this.numSeats)[i];
    const dx = (50 - pos[0]) * 0.35;
    const dy = (46 - pos[1]) * 0.35;
    return { left: `calc(50% + ${dx}px)`, top: `calc(20px + ${dy}px)` };
  }

  renderDealerButton() {
    const g = this.game;
    const old = this.felt.querySelector('.dealer-btn');
    if (old) old.remove();
    if (g.button == null || g.handOver) return;
    const seat = this.seatEls[g.button];
    if (!seat) return;
    const btn = document.createElement('div');
    btn.className = 'dealer-btn';
    btn.textContent = 'D';
    btn.style.left = seat.style.left;
    btn.style.top = `calc(${seat.style.top} + 30px)`;
    this.felt.appendChild(btn);
  }

  // ---- hand end ----
  handEnd() {
    const results = this.game.results;
    this.hideActionBar();
    // Reveal all remaining hands at showdown.
    if (results && results.revealed) {
      this.revealAll = true;
    }
    this.render();

    // Highlight winners + toast.
    const winnersById = results ? results.winnersById : {};
    const winnerIdxs = [];
    this.game.players.forEach((p, i) => {
      if (winnersById[p.id]) {
        winnerIdxs.push(i);
        this.seatEls[i].classList.add('winner');
        const wrap = this.seatEls[i].querySelector('.avatar-wrap');
        const old = wrap.querySelector('.action-bubble');
        if (old) old.remove();
        const el = document.createElement('div');
        el.className = 'action-bubble win';
        el.textContent = '+' + fmt(winnersById[p.id]);
        wrap.appendChild(el);
      }
    });

    // Stats + toast text.
    const human = this.game.players[this.humanIndex];
    const humanWon = !!winnersById['human'];
    this.state.handsPlayed++;
    if (humanWon) this.state.handsWon++;
    const totalPot = results ? results.pots.reduce((s, p) => s + p.amount, 0) : 0;
    if (totalPot > this.state.biggestPot) this.state.biggestPot = totalPot;

    let title, sub;
    if (humanWon) {
      title = 'You Win!';
      sub = '+' + fmt(winnersById['human']) + ' chips';
    } else {
      const names = winnerIdxs.map((i) => this.game.players[i].name).join(', ');
      title = names + ' win' + (winnerIdxs.length > 1 ? '' : 's');
      sub = results && results.revealed && results.evals
        ? this.bestNameFor(winnerIdxs[0])
        : '';
    }
    this.toast(title, sub, 2200);

    this.persist();

    // Next hand after a pause.
    const wait = results && results.revealed ? 3200 : 2000;
    this.after(wait, () => {
      this.revealAll = false;
      this.game.players.forEach((_, i) => this.seatEls[i].classList.remove('winner'));
      this.startHand();
    });
  }

  bestNameFor(idx) {
    const r = this.game.results;
    if (!r || !r.evals) return '';
    const p = this.game.players[idx];
    const ev = r.evals[p.id];
    return ev ? ev.name : '';
  }

  showBrokeAndStore() {
    this.toast('Out of Chips!', 'Grab more to keep playing', 1800);
    this.after(1600, () => { this.onNeedChips && this.onNeedChips(); });
  }

  // Called by main after the store credits chips, to resume play.
  refreshBankroll() {
    // New chips went to state.chips; route them into the bank so the next
    // hand's auto-rebuy seats the human again.
    const human = this.game ? this.game.players[this.humanIndex] : null;
    const stack = human ? human.chips : 0;
    this.bank = Math.max(0, this.state.chips - stack);
    if (this.game && this.game.handOver) this.startHand();
  }

  // ---- helpers ----
  streetLabel(s) {
    return { preflop: 'Cards Dealt', flop: 'The Flop', turn: 'The Turn', river: 'The River' }[s] || s;
  }

  toast(title, sub, ms) {
    const old = this.felt.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${title}${sub ? `<div class="sub">${sub}</div>` : ''}`;
    this.felt.appendChild(t);
    this.after(ms, () => { if (t.parentNode) t.remove(); });
  }
}
