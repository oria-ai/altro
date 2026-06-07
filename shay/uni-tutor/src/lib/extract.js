// Pulls the readable text and outgoing links from a loaded page.
export async function extractPage(page) {
  const title = await page.title();
  let text = "";
  try {
    text = (await page.locator("body").innerText()).trim();
  } catch {
    text = "";
  }
  const links = await page.$$eval("a[href]", (as) => as.map((a) => a.href));
  return { title, text, links: [...new Set(links)] };
}
