// POST /api/conjure { world:'palazzo'|'fuori', style:<skyboxStyleId>, archetype, material }
// Starts a Skybox generation matching the room the client named; returns its id at once.
import { buildPrompt } from '../lib/prompts.js';

function allowed(req){
  const o = req.headers.origin || req.headers.referer || '';
  try { const h = new URL(o).hostname; return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.vercel.app'); }
  catch { return false; }
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!allowed(req)) return res.status(403).json({ error: 'forbidden origin' });
  const key = process.env.SKYBOX_KEY;
  if (!key) return res.status(500).json({ error: 'SKYBOX_KEY not configured' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const world = body.world === 'fuori' ? 'fuori' : 'palazzo';
  const style = Number.isInteger(body.style) ? body.style : 122;
  const seed = 8000000 + Math.floor(Math.random() * 1900000);
  const { prompt, negative_text } = buildPrompt(world, body.archetype, body.material);

  const r = await fetch('https://backend.blockadelabs.com/api/v1/skybox', {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ skybox_style_id: style, prompt, negative_text, seed }),
  });
  if (!r.ok) return res.status(502).json({ error: 'skybox error', detail: (await r.text()).slice(0, 300) });
  const data = await r.json();
  return res.status(200).json({ id: data.id });
}
