// App shell: home screen, daily bonus, store, and routing into the table.
import { load, save, fmt } from './storage.js';
import { openStore } from './store.js';
import { Table } from './table.js';

const APP = document.getElementById('app');
let state = load();
let table = null;

function persist() { save(state); }

function clearApp() {
  if (table) { table.destroy(); table = null; }
  APP.innerHTML = '';
}

// ---------- Home ----------
function showHome() {
  clearApp();
  const winRate = state.handsPlayed ? Math.round((state.handsWon / state.handsPlayed) * 100) : 0;
  const bonusReady = dailyBonusReady();
  const home = document.createElement('div');
  home.className = 'home fadein';
  home.innerHTML = `
    <div class="topbar">
      <div class="chip-pill"><span class="coin" style="width:24px;height:24px"></span>
        <span>${fmt(state.chips)}</span>
        <span class="plus" id="addchips">+</span>
      </div>
      <div class="spacer"></div>
    </div>
    <div>
      <span class="logo"><span class="crown">♛</span>ROYAL POKER</span>
      <div class="tagline">TEXAS HOLD'EM</div>
    </div>
    <div class="home-stats">
      <div><b>${fmt(state.chips)}</b>Chips</div>
      <div><b>${state.handsPlayed}</b>Hands</div>
      <div><b>${winRate}%</b>Win rate</div>
    </div>
    <div class="menu">
      <button class="btn green" id="play6">▶  PLAY NOW</button>
      <button class="btn" id="play9">9-Seat Table</button>
      <button class="btn" id="play2">Heads-Up (1v1)</button>
      <button class="btn ${bonusReady ? 'blue' : 'ghost'}" id="bonus">
        ${bonusReady ? '🎁  Claim Daily Bonus' : '🎁  Bonus claimed today'}
      </button>
      <button class="btn ghost" id="store">🪙  Get Chips</button>
    </div>`;
  APP.appendChild(home);

  home.querySelector('#addchips').addEventListener('click', () => showStore(showHome));
  home.querySelector('#play6').addEventListener('click', () => startTable(6));
  home.querySelector('#play9').addEventListener('click', () => startTable(9));
  home.querySelector('#play2').addEventListener('click', () => startTable(2));
  home.querySelector('#store').addEventListener('click', () => showStore(showHome));
  const bonusBtn = home.querySelector('#bonus');
  if (bonusReady) bonusBtn.addEventListener('click', () => showDailyBonus());
}

// ---------- Daily bonus ----------
function dailyBonusReady() {
  const last = state.lastDailyBonus || 0;
  return Date.now() - last >= 20 * 60 * 60 * 1000; // once per ~day
}

function showDailyBonus() {
  const amount = 5000 + Math.floor(Math.random() * 6) * 2500; // 5k..17.5k
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal col">
      <h2>🎁 Daily Bonus</h2>
      <div class="sub">Come back every day for free chips!</div>
      <div class="bonus-amount">+${fmt(amount)}</div>
      <div class="coin-burst">🪙🪙🪙</div>
      <button class="btn green" id="claim" style="width:100%">Collect</button>
    </div>`;
  APP.appendChild(backdrop);
  backdrop.querySelector('#claim').addEventListener('click', () => {
    state.chips += amount;
    state.lastDailyBonus = Date.now();
    persist();
    backdrop.remove();
    showHome();
  });
}

// ---------- Store ----------
function showStore(onClose) {
  openStore(
    state,
    (coins) => { // onPurchase: credit chips for free
      state.chips += coins;
      state.totalPurchased += coins;
      persist();
      if (table) table.refreshBankroll();
      refreshChipDisplays();
    },
    onClose,
  );
}

function refreshChipDisplays() {
  document.querySelectorAll('#bankroll, .chip-pill span:not(.plus):first-of-type')
    .forEach(() => {});
  // Home pill text (if on home).
  const pill = document.querySelector('.home .chip-pill span');
  if (pill) pill.textContent = fmt(state.chips);
}

// ---------- Table ----------
function startTable(seats) {
  clearApp();
  table = new Table(APP, state, persist, {
    numSeats: seats,
    onExit: () => showHome(),
    onNeedChips: () => showStore(() => {}),
  });
  table.mount();
}

// Boot.
showHome();
