// One-shot Skybox panorama generator → downscaled 4K WebP into img/.
// Usage: SKYBOX_KEY=… node gen-pano.mjs <world> <styleId> <outName> "<archetype>" "<material>"
import sharp from 'sharp';
import { buildPrompt } from './lib/prompts.js';
import { writeFile } from 'node:fs/promises';

const [, , world = 'fuori', styleArg = '122', out = 'giardino', archetype = 'a formal Italian garden of clipped hedges and statues', material = 'Cypress'] = process.argv;
const style = parseInt(styleArg, 10);
const key = process.env.SKYBOX_KEY;
if (!key) { console.error('SKYBOX_KEY missing'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { prompt, negative_text } = buildPrompt(world, archetype, material);
const seed = 8000000 + Math.floor(Math.random() * 1900000);

console.log(`[gen] conjuring ${world}/${out} style=${style}`);
const r = await fetch('https://backend.blockadelabs.com/api/v1/skybox', {
  method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ skybox_style_id: style, prompt, negative_text, seed }),
});
if (!r.ok) { console.error('[gen] conjure failed', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
const { id } = await r.json();
console.log('[gen] id', id);

let fileUrl = null;
for (let i = 0; i < 90; i++) {
  await sleep(4000);
  const s = await fetch(`https://backend.blockadelabs.com/api/v1/imagine/requests/${id}`, { headers: { 'x-api-key': key } });
  if (!s.ok) continue;
  const d = (await s.json()).request;
  process.stdout.write(`\r[gen] ${i * 4}s status=${d.status}   `);
  if (d.status === 'complete' && d.file_url) { fileUrl = d.file_url; break; }
  if (d.status === 'error' || d.status === 'abort') { console.error('\n[gen] generation', d.status, d.error_message); process.exit(1); }
}
if (!fileUrl) { console.error('\n[gen] timed out'); process.exit(1); }
console.log('\n[gen] done', fileUrl);

const img = Buffer.from(await (await fetch(fileUrl)).arrayBuffer());
const webp = await sharp(img).resize(4096, 2048, { fit: 'fill' }).webp({ quality: 82 }).toBuffer();
await writeFile(`img/${out}.webp`, webp);
console.log(`[gen] wrote img/${out}.webp (${(webp.length / 1024) | 0}KB)`);
