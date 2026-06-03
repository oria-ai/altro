// GET /api/status?id=123  ->  { status, file_url? }  (lightweight poll target, <1s)
function allowed(req){
  const o = req.headers.origin || req.headers.referer || '';
  try { const h = new URL(o).hostname; return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.vercel.app'); }
  catch { return false; }
}
export default async function handler(req, res){
  if (!allowed(req)) return res.status(403).json({ error: 'forbidden origin' });
  const key = process.env.SKYBOX_KEY;
  if (!key) return res.status(500).json({ error: 'SKYBOX_KEY not configured' });
  const id = (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id');
  if (!id) return res.status(400).json({ error: 'missing id' });
  const r = await fetch(`https://backend.blockadelabs.com/api/v1/imagine/requests/${encodeURIComponent(id)}`, { headers: { 'x-api-key': key } });
  if (!r.ok) return res.status(502).json({ error: 'skybox error' });
  const data = await r.json();
  const rq = data.request || data;
  return res.status(200).json({ status: rq.status, file_url: rq.file_url || null, error_message: rq.error_message || null });
}
