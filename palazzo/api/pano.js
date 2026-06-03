// GET /api/pano?u=<skybox image url>
// Same-origin proxy for Skybox CDN images (the CDN sends no CORS header, so WebGL can't
// texture it directly). Host-locked to blockadelabs.com; downscales 8K master -> 4K WebP.
import sharp from 'sharp';

export default async function handler(req, res){
  const u = (req.query && req.query.u) || new URL(req.url, 'http://x').searchParams.get('u');
  if (!u) return res.status(400).json({ error: 'missing u' });
  let url;
  try { url = new URL(u); } catch { return res.status(400).json({ error: 'bad url' }); }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('blockadelabs.com'))
    return res.status(403).json({ error: 'host not allowed' });

  const r = await fetch(url.toString());
  if (!r.ok) return res.status(502).json({ error: 'upstream ' + r.status });
  const src = Buffer.from(await r.arrayBuffer());
  let out, type = 'image/webp';
  try { out = await sharp(src).resize(4096, 2048, { fit: 'fill' }).webp({ quality: 82 }).toBuffer(); }
  catch { out = src; type = r.headers.get('content-type') || 'image/jpeg'; }
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.status(200).send(out);
}
