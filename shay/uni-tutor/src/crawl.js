import { setTimeout as sleep } from "node:timers/promises";
import { launchContext } from "./lib/browser.js";
import { extractPage } from "./lib/extract.js";
import { savePage } from "./lib/store.js";
import {
  START_URL, MAX_PAGES, MAX_DEPTH, REQUEST_DELAY_MS, DENY_PATTERNS, SKIP_EXTENSIONS,
} from "./config.js";

function allowedLink(href, allowedHosts) {
  let u;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(u.protocol)) return false;
  if (!allowedHosts.has(u.host)) return false;
  const lower = u.href.toLowerCase();
  if (DENY_PATTERNS.some((p) => lower.includes(p))) return false;
  if (SKIP_EXTENSIONS.some((ext) => u.pathname.toLowerCase().endsWith(ext))) return false;
  return true;
}

async function main() {
  const start = process.argv[2] || START_URL;
  const allowedHosts = new Set([new URL(start).host]);

  const { browser, context } = await launchContext({ headless: true });
  const page = await context.newPage();

  const queue = [{ url: start, depth: 0 }];
  const seen = new Set();
  let saved = 0;

  while (queue.length && saved < MAX_PAGES) {
    const { url, depth } = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e) {
      console.warn(`  skip ${url} (${e.message})`);
      continue;
    }

    // Read-only roaming: we only navigate to links, never submit forms.
    if (page.url().includes("sso.")) {
      console.error(
        "\nLanded on the SSO login page — your saved session has expired.\n" +
        "Re-run `npm run auth` and try again.\n"
      );
      break;
    }

    const { title, text, links } = await extractPage(page);
    if (text && text.length > 40) {
      savePage({ url, title, text });
      saved += 1;
      console.log(`[${saved}/${MAX_PAGES}] ${title || url}`);
    }

    if (depth < MAX_DEPTH) {
      for (const href of links) {
        if (allowedLink(href, allowedHosts) && !seen.has(href)) {
          queue.push({ url: href, depth: depth + 1 });
        }
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await browser.close();
  console.log(`\nDone. Saved ${saved} page(s) to data/. Next: npm run learn`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
