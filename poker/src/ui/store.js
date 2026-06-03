// The "Buy Chips" store. It LOOKS like a real in-app-purchase flow — packages,
// prices, a payment-processing spinner, a success receipt — but it never
// contacts any payment system. Tapping a package simply credits the chips for
// free. This is the whole point of the app: the player feels like they're
// topping up, but no real money is ever involved.

import { fmt } from './storage.js';

const PACKAGES = [
  { coins: 40000, price: '$1.99', bonus: '' },
  { coins: 120000, price: '$4.99', bonus: '+20% FREE' },
  { coins: 300000, price: '$9.99', bonus: '+35% FREE', best: false },
  { coins: 700000, price: '$19.99', bonus: '+50% FREE', best: true, tag: 'POPULAR' },
  { coins: 2000000, price: '$49.99', bonus: '+70% FREE' },
  { coins: 5000000, price: '$99.99', bonus: 'BEST VALUE', tag: 'WHALE' },
];

const PAYMENT_LABELS = ['Google Play', 'Visa ••••4471', 'PayPal'];

export function openStore(state, onPurchase, onClose) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <button class="modal-close" aria-label="close">×</button>
      <h2>♛ Get Chips</h2>
      <div class="sub">Choose a chip package to continue playing</div>
      <div class="pkg-grid"></div>
      <div class="store-note">Payments processed securely · Restore purchases</div>
    </div>`;

  const grid = backdrop.querySelector('.pkg-grid');
  for (const pkg of PACKAGES) {
    const el = document.createElement('div');
    el.className = 'pkg' + (pkg.best ? ' best' : '');
    el.innerHTML = `
      ${pkg.tag ? `<div class="tag">${pkg.tag}</div>` : ''}
      <div class="coins-amt"><span class="coin" style="width:22px;height:22px"></span>${fmt(pkg.coins)}</div>
      <div class="bonus">${pkg.bonus || ''}</div>
      <div class="price">${pkg.price}</div>`;
    el.querySelector('.price').addEventListener('click', () => {
      runPurchaseFlow(backdrop, pkg, state, onPurchase);
    });
    grid.appendChild(el);
  }

  const close = () => { backdrop.remove(); onClose && onClose(); };
  backdrop.querySelector('.modal-close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  document.getElementById('app').appendChild(backdrop);
  return backdrop;
}

// Fake but convincing payment flow: confirm sheet -> processing -> success.
function runPurchaseFlow(backdrop, pkg, state, onPurchase) {
  const modal = backdrop.querySelector('.modal');
  const payment = PAYMENT_LABELS[Math.floor(Math.random() * PAYMENT_LABELS.length)];

  // Step 1: a platform-style confirmation sheet.
  modal.innerHTML = `
    <h2>Confirm Purchase</h2>
    <div class="sub">${payment}</div>
    <div class="col" style="margin:18px 0;">
      <div class="coins-amt" style="font-size:28px"><span class="coin" style="width:30px;height:30px"></span>${fmt(pkg.coins)} chips</div>
      <div style="font-size:30px;font-weight:900;color:#fff">${pkg.price}</div>
    </div>
    <div class="btns-row">
      <button class="btn ghost cancel">Cancel</button>
      <button class="btn green buy">Pay ${pkg.price}</button>
    </div>`;

  modal.querySelector('.cancel').addEventListener('click', () => backdrop.remove());
  modal.querySelector('.buy').addEventListener('click', () => {
    // Step 2: processing spinner (looks like contacting the store).
    modal.innerHTML = `
      <div class="processing">
        <div class="spinner"></div>
        <div style="font-weight:700">Processing payment…</div>
        <div class="sub" style="margin-top:6px">${payment}</div>
      </div>`;

    const delay = 1100 + Math.random() * 1100;
    setTimeout(() => {
      // Step 3: credit the chips for free and show a success receipt.
      onPurchase(pkg.coins, pkg.price);
      modal.innerHTML = `
        <div class="processing fadein">
          <div class="success-check">✓</div>
          <h2 style="margin-bottom:2px">Purchase Complete</h2>
          <div class="coin-burst">🪙🪙🪙</div>
          <div style="font-weight:800;color:var(--gold-bright);font-size:22px;margin:8px 0">
            +${fmt(pkg.coins)} chips
          </div>
          <div class="sub">A receipt was sent to your email.</div>
          <button class="btn green done" style="width:100%;margin-top:14px">Awesome!</button>
        </div>`;
      modal.querySelector('.done').addEventListener('click', () => backdrop.remove());
    }, delay);
  });
}
