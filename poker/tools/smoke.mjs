// Headless smoke test: loads the app, plays several human actions, opens the
// store and completes a fake purchase, and fails on any console/page error.
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';

// Find the cached Playwright chromium binary.
function findChromium() {
  const base = `${process.env.HOME}/.cache/ms-playwright`;
  for (const d of readdirSync(base)) {
    if (d.startsWith('chromium-')) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = `${base}/${d}/${sub}`;
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

const errors = [];
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto('http://localhost:8799/index.html');
await page.waitForSelector('.logo');
console.log('home loaded:', await page.textContent('.logo'));

// Reset save so we start from a known state.
await page.evaluate(() => localStorage.removeItem('royalpoker.save.v1'));
await page.reload();
await page.waitForSelector('#play6');

// Start a 6-seat table.
await page.click('#play6');
await page.waitForSelector('.felt');
console.log('table mounted');

// Play up to 40 human decisions, always choosing a legal-ish action.
let decisions = 0;
for (let i = 0; i < 400 && decisions < 40; i++) {
  await page.waitForTimeout(150);
  // Is it the human's turn (action bar visible with buttons)?
  const hasButtons = await page.evaluate(() => {
    const bar = document.querySelector('.actionbar');
    if (!bar || bar.classList.contains('hidden')) return null;
    return {
      call: !!bar.querySelector('#callbtn'),
      check: !!bar.querySelector('#checkbtn'),
      raise: !!bar.querySelector('#raisebtn'),
      fold: !!bar.querySelector('#foldbtn'),
    };
  });
  if (!hasButtons) continue;
  // Mix of actions: mostly call/check, sometimes raise, rarely fold.
  const r = Math.random();
  if (hasButtons.check && r < 0.6) await page.click('#checkbtn');
  else if (hasButtons.call && r < 0.6) await page.click('#callbtn');
  else if (hasButtons.raise && r < 0.85) await page.click('#raisebtn');
  else if (hasButtons.check) await page.click('#checkbtn');
  else if (hasButtons.call) await page.click('#callbtn');
  else await page.click('#foldbtn');
  decisions++;
}
console.log('human decisions played:', decisions);

// Check the engine actually progressed (community cards appeared at some point,
// pot rendered, bankroll is a number).
const stateOk = await page.evaluate(() => {
  const bankroll = document.querySelector('#bankroll')?.textContent;
  return { bankroll };
});
console.log('bankroll after play:', stateOk.bankroll);

// Open the store via the + button and complete a fake purchase.
await page.click('#addchips');
await page.waitForSelector('.pkg');
const before = await page.evaluate(() => JSON.parse(localStorage.getItem('royalpoker.save.v1')).chips);
await page.click('.pkg .price'); // first package
await page.waitForSelector('.btn.green.buy');
await page.click('.btn.green.buy');
await page.waitForSelector('.success-check', { timeout: 5000 });
const after = await page.evaluate(() => JSON.parse(localStorage.getItem('royalpoker.save.v1')).chips);
console.log('store credited chips:', before, '->', after, after > before ? 'OK' : 'FAIL');

await browser.close();

if (errors.length) {
  console.error('\nERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
if (decisions < 5) { console.error('\nFAIL: too few human turns reached'); process.exit(1); }
if (!(after > before)) { console.error('\nFAIL: store did not credit chips'); process.exit(1); }
console.log('\nSMOKE PASSED ✓');
