import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { SESSION_FILE } from "./config.js";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npm run fetch -- <url>");
    process.exit(1);
  }
  if (!existsSync(SESSION_FILE)) {
    console.error(`No saved session at ${SESSION_FILE}. Run \`npm run auth\` first.`);
    process.exit(1);
  }

  // Headless this time — it reuses the session you saved during `auth`.
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded" });

  const title = await page.title();
  const text = (await page.locator("body").innerText()).trim();

  console.log(`\nURL:    ${url}`);
  console.log(`Title:  ${title}`);
  console.log(`\n--- first 1500 chars of visible text ---\n`);
  console.log(text.slice(0, 1500));
  console.log(`\n--- (${text.length} chars total) ---`);
  console.log(
    "\nIf this shows your course content (not a login page), the saved session works.\n"
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
