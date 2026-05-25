// Probes the mechanism uni-tutor depends on, end to end, with NO real
// credentials: log in -> save storageState -> fully close the browser ->
// open a BRAND-NEW browser from the saved state -> confirm still logged in.
//
// Target is a public auth demo (the-internet.herokuapp.com). If this passes,
// the session save/restore core is sound and the OpenU flow rests on it.
//
//   npm run probe
//
// Exit 0 = PASS, exit 1 = FAIL (with the reason printed).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = "https://the-internet.herokuapp.com";
const USER = "tomsmith";
const PASS = "SuperSecretPassword!";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), "uni-tutor-probe-"));
  const stateFile = join(tmp, "state.json");

  // --- Phase 1: log in in browser #1, then save the session and close it. ---
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#username", USER);
    await page.fill("#password", PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/secure", { timeout: 15000 });

    const body = await page.locator("body").innerText();
    assert(
      /secure area/i.test(body),
      "Phase 1: logged in but '/secure' did not show the secure area."
    );

    await context.storageState({ path: stateFile });
    await browser.close();
  }

  // --- Phase 2: brand-new browser, restore state, hit /secure directly. ---
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: stateFile });
    const page = await context.newPage();

    await page.goto(`${BASE}/secure`, { waitUntil: "domcontentloaded" });
    const url = page.url();
    const body = await page.locator("body").innerText();

    assert(
      url.endsWith("/secure"),
      `Phase 2: session NOT restored — redirected to ${url} instead of /secure.`
    );
    assert(
      /secure area/i.test(body),
      "Phase 2: at /secure but the secure-area content is missing."
    );

    await browser.close();
  }

  rmSync(tmp, { recursive: true, force: true });
  console.log("\nPASS — login + storageState save + restore in a fresh browser all work.\n");
}

main().catch((err) => {
  console.error(`\nFAIL — ${err.message}\n`);
  process.exit(1);
});
