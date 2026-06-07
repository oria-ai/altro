import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { SESSION_FILE } from "../config.js";

// Opens a browser context that reuses the session saved by `npm run auth`.
export async function launchContext({ headless = true } = {}) {
  if (!existsSync(SESSION_FILE)) {
    throw new Error(
      `No saved session at ${SESSION_FILE}. Run \`npm run auth\` first.`
    );
  }
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  return { browser, context };
}
