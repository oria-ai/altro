import { mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { chromium } from "playwright";
import { LOGIN_URL, SESSION_DIR, SESSION_FILE } from "./config.js";

function waitForEnter(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, () => { rl.close(); resolve(); }));
}

async function main() {
  mkdirSync(SESSION_DIR, { recursive: true });

  // Headed so YOU can complete the login (passwords, 2FA, SSO redirects).
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`\nOpening ${LOGIN_URL}`);
  console.log("Log in normally in the browser window that just opened.\n");
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });

  await waitForEnter(
    "When you're fully logged in and can see your courses, press Enter here to save the session… "
  );

  await context.storageState({ path: SESSION_FILE });
  console.log(`\nSession saved to ${SESSION_FILE}`);
  console.log("This file holds live login cookies — it is gitignored. Keep it private.\n");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
