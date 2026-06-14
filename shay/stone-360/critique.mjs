// Ask Gemini to look at a render and say why it's bad.
// Tries AI-Studio key (query + header), then Vertex AI via service account.
import { setDefaultResultOrder } from 'node:dns'; setDefaultResultOrder('ipv4first');
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

const IMG = readFileSync(process.argv[2] || 'shots/critique.png').toString('base64');
const PROMPT = `Screenshot from a web 3D viewer for a real stones-gallery shop. A real, photogrammetry-reconstructed stone sits on a pedestal inside an AI-generated 360° room panorama. The owner says it looks BAD.
Be ruthless and specific. Rank by visual impact what makes it look fake/cheap/wrong — consider: is the stone seated or floating; contact-shadow quality & placement; lighting/shadow DIRECTION mismatch between stone and room; pedestal realism & proportion; is the pedestal itself grounded; room blur/low-res; warm-stone vs cool-room white-balance mismatch; composition & dead empty space; depth-of-field mismatch; reconstruction quality.
Then give the TOP 5 concrete fixes ranked by impact-to-effort. Be concise and concrete.`;

const body = JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/png', data: IMG } }] }] });

function out(label, j) {
  if (j.candidates) { console.log(`\n=== via ${label} ===\n` + j.candidates[0].content.parts.map(p => p.text).filter(Boolean).join('\n')); return true; }
  console.log(`[${label}] ` + JSON.stringify(j.error || j).slice(0, 180));
  return false;
}

// --- 1) AI-Studio key (query param, then header) ---
const KEY = process.env.GEMINI_AI_STUDIO;
if (KEY) {
  for (const [label, init] of [
    ['key?param', { method:'POST', headers:{'content-type':'application/json'}, body }],
    ['key-header', { method:'POST', headers:{'content-type':'application/json','x-goog-api-key':KEY}, body }],
  ]) {
    const url = label==='key?param'
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    try { const r = await fetch(url, { ...init, signal: AbortSignal.timeout(60000) }); if (out(label, await r.json())) process.exit(0); }
    catch(e){ console.log(`[${label}] ${e.cause?.code||e.message}`); }
  }
}

// --- 2) Vertex AI via service account ---
const SA_B64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
if (!SA_B64) { console.log('no service account; cannot reach Gemini'); process.exit(1); }
const sa = JSON.parse(Buffer.from(SA_B64, 'base64').toString());
const now = Math.floor(Date.now()/1000);
const b64url = (o) => Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
const jwt = `${b64url({alg:'RS256',typ:'JWT'})}.${b64url({iss:sa.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})}`;
const sig = crypto.createSign('RSA-SHA256').update(jwt).sign(sa.private_key, 'base64url');
const tok = await (await fetch('https://oauth2.googleapis.com/token', {
  method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
  body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}.${sig}`,
})).json();
if (!tok.access_token) { console.log('SA token error:', JSON.stringify(tok).slice(0,200)); process.exit(1); }
const pid = sa.project_id, loc = 'us-central1';
for (const model of ['gemini-2.0-flash','gemini-1.5-flash-002','gemini-1.5-pro']) {
  const url = `https://${loc}-aiplatform.googleapis.com/v1/projects/${pid}/locations/${loc}/publishers/google/models/${model}:generateContent`;
  try {
    const r = await fetch(url, { method:'POST', headers:{'content-type':'application/json',authorization:`Bearer ${tok.access_token}`}, body, signal: AbortSignal.timeout(60000) });
    if (out(`vertex:${model}`, await r.json())) process.exit(0);
  } catch(e){ console.log(`[vertex:${model}] ${e.cause?.code||e.message}`); }
}
process.exit(1);
