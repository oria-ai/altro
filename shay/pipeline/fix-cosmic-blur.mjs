// One-off: regenerate the "Sophisticated Blur" look for stone-1guo "Cosmic Ascent".
// The live blur (stone-1guo/blur.jpg) used a busy wall of fairy-lights bokeh and
// the dark stone got lost. This re-shoots it: calm, refined backdrop + strong,
// separating studio light so the black-and-white-veined stone reads tack-sharp.
// Saves to /tmp first for review; pass `upload` as argv[2] to push to R2 in place.
import fs from "node:fs";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const IMAGE_MODEL = "gemini-3.1-flash-image";
const ID = "stone-1guo";
const ORIG = `https://cdn.shaym.beauty/${ID}/original.jpg`;

// load .env.local
for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const KEY = process.env.GEMINI_AI_STUDIO;
const acct = process.env.CLOUDFLARE_ACCOUNT_ID, tok = process.env.CLOUDFLARE_API_TOKEN;

const PROMPT = `Take the exact stone from the provided photo — preserve its shape, texture, colors and every distinctive feature faithfully, including the glossy black surface and the bright white mineral veins. Re-photograph it as elegant fine-art product photography.

Lighting (most important): light the stone with soft, directional studio light so it is TACK-SHARP and reads clearly — the polished black surface, the depth, and the crisp white veins must all be plainly visible and well separated from the background. Add a gentle rim/back light so the dark stone does not merge into the backdrop.

Background: a calm, sophisticated, softly-blurred backdrop — a smooth, gently graduated neutral surface (warm grey shading to soft charcoal) with refined, minimal, out-of-focus bokeh. The blur must be subtle and tasteful — NOT a busy field of fairy lights, string lights, or scattered bright dots; no clutter, no patterns, no distracting highlights competing with the stone.

The stone rests on a clean, subtly reflective surface. Photorealistic, gallery-quality, shallow depth of field with the stone in crisp focus. No people, no text, no watermarks. Composition: the stone is perfectly centered in the frame, both horizontally and vertically — the clear central subject.`;

async function gemini(parts) {
  for (let a = 1; ; a++) {
    const r = await fetch(`${API}/${IMAGE_MODEL}:generateContent?key=${KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { imageSize: "2K" } } }),
    });
    if ((r.status === 429 || r.status >= 500) && a <= 3) { await new Promise(k => setTimeout(k, a * 3000)); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const out = (await r.json()).candidates?.[0]?.content?.parts ?? [];
    const img = out.find(p => p.inlineData);
    if (img) return Buffer.from(img.inlineData.data, "base64");
    if (a <= 3) continue;
    throw new Error("no image");
  }
}

const origBuf = Buffer.from(await (await fetch(ORIG)).arrayBuffer());
console.log(`original ${origBuf.length} bytes — generating…`);
const img = await gemini([{ inlineData: { mimeType: "image/jpeg", data: origBuf.toString("base64") } }, { text: PROMPT }]);
const local = "/tmp/cosmic-blur-new.jpg";
fs.writeFileSync(local, img);
console.log(`wrote ${local} (${img.length} bytes)`);

if (process.argv[2] === "upload") {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/r2/buckets/shay-stones/objects/${ID}/blur.jpg`, {
    method: "PUT", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "image/jpeg" }, body: img,
  });
  if (!r.ok) throw new Error(`R2 put: ${r.status} ${(await r.text()).slice(0, 200)}`);
  console.log(`uploaded → https://cdn.shaym.beauty/${ID}/blur.jpg`);
}
