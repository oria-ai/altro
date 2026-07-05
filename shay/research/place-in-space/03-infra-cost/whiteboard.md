# Place-in-Space — Angle 03: Infra, Latency, Storage & COST

Poll (Professor of inference infra & cost). Scope: backend cost/latency/storage/rate-limit only.
Quality, frontend, prompt engineering are other Polls.

---

## Top — the click

- **Each generation costs ≈ $0.10 (ten cents), NOT the $0.06 the budget assumes.**
  Gemini 3.1 Flash Image ("Nano Banana 2", the exact model in `api/dream.js:11`) at
  `imageSize:"2K"` bills **1680 output tokens × $60/1M = $0.1008**. The two input
  images (stone art + room photo, ~560 tokens each) + prompt add ~$0.0007 — negligible.
  So **place-in-space ≈ $0.10/generation, standard tier.** (Verified web, Jul 2026 — see Middle.)

- **The existing `_budget.js` will absorb it — but its cost estimate is wrong TODAY.**
  `DEFAULT_COST = 0.06` (`_budget.js:18`) understates real 2K Gemini cost by ~40%,
  for the *current* dream feature too. The budget MACHINERY (monthly cap, lifetime
  cap, row-count × cost, admin top-up) plugs in perfectly. But the scalar
  `costPerDreamUsd` must be bumped to **~0.11** or the caps under-count real spend
  ~1.7×. This is a same-turn fix, not a redesign.

- **The one infra gotcha: a new function file needs its OWN `maxDuration` in
  `vercel.json`, or it silently inherits the platform default (~10–15s) and TIMES OUT.**
  Image gen is 10–30s. `api/dream.js` is protected with `maxDuration:120`
  (`vercel.json:3-5`); a new `api/place.js` gets NO protection unless added there.
  This is the single most likely production break, and it's a one-line config, not code.

---

## Middle — the body

### 1. Per-generation cost math (Gemini 3.1 Flash Image, 2K)

Model in code: `gemini-3.1-flash-image` (`api/dream.js:11`), request config
`imageConfig: { aspectRatio: "21:9", imageSize: "2K" }` (`dream.js:47`). Place-in-space
extends the same call shape but with **two** `inlineData` input images (stone + room).

Verified pricing (Google AI dev docs + corroborating breakdowns, Jul 2026):

| Component | Tokens | Rate (standard) | $ |
|---|---|---|---|
| Output image, 2K tier | 1,680 | $60 / 1M | **$0.1008** |
| Input image ×2 (stone + room) | ~1,120 | $0.50 / 1M | $0.00056 |
| Input text prompt (~200–500 tok) | ~500 | $0.50 / 1M | $0.00025 |
| **Total per generation (standard)** | | | **≈ $0.1016** |

- **Round number to plan with: $0.10–0.11 / generation.**
- **Batch tier is half price ($0.050 out)** BUT batch is asynchronous (submit → poll),
  unusable for a synchronous user-facing "upload → see it" request. Not applicable here.
- Aspect ratio (21:9 vs square) does not lower the tier — Gemini bills by the
  `imageSize` label ("2K"), so the 1680-token/$0.101 charge holds regardless of ratio.
- **Cross-finding on the existing feature:** the current dream is ALSO a 2K single-image
  gen ⇒ its true cost is ~$0.10, but `_budget.js` counts it at $0.06. The place-in-space
  round is a good moment to correct the estimate for both.

### 2. Does it fit `_budget.js`? (yes, structurally)

`computeUsage()` (`_budget.js:64`) = `countDreams() × costPerDreamUsd`, checked against
`monthlyCapUsd` (resets UTC monthly, +one-time `monthlyBonus`) and `totalCapUsd`
(lifetime). Fails **open** on read error (`dream.js:216`) — never breaks the public feature.

- The gate is a **global $ ceiling**, model-agnostic. It doesn't care *which* feature spent
  the money, only the row count. So it absorbs place-in-space automatically **IF the new
  generations are counted in the same tally.**
- Two ways to make them counted — see Dilemma D2.
- **Required change regardless:** set `costPerDreamUsd ≈ 0.11` (admin-editable via
  `setBudget`, `_budget.js:103`; or bump `DEFAULT_COST`). Single scalar today; if dream and
  place ever diverge in cost you'd need per-kind cost (Dilemma D2).

### 3. Vercel timeout / memory / streaming

- **Timeout:** `vercel.json` sets `maxDuration:120` for `api/dream.js`, `admin.js`; 60 for
  `world.js`. Anything NOT listed inherits the account default (10s Hobby / 15s Pro-ish).
  A new `api/place.js` **must** get an explicit entry, e.g.:
  ```json
  "api/place.js": { "maxDuration": 120 }
  ```
  120s is ample for a 10–30s gen with the existing 2-retry backoff (`dream.js:51-59`,
  up to 2×4s + 2×8s sleeps on 429/5xx = worst case ~24s of retry sleep + gen time —
  still well inside 120s).
- **Memory:** default (1024–1769 MB) is fine. Payload sizes: room photo base64 in memory +
  ~1–3 MB output JPEG. The real risk is an **oversized user upload** — cap it (see §5).
- **Streaming vs waitUntil:** the current handler is synchronous — `await generatePano` →
  `await saveDream` → `res.end(jpeg)` (`dream.js:255-268`). The `waitUntil` mention at
  `dream.js:258` is a comment only; the code awaits inline because it needs `dreamId` for the
  `X-Dream-Id` header. **Reuse this exact pattern** — no streaming needed (single image out).
  Optional optimization: flush the image first and move the R2/DB write into a real
  `waitUntil`, but then you lose the id-in-header round-trip; not worth it. Keep it simple.

### 4. Storage & data model

Current dream path: insert `dreams` row → `r2put("dreams/{id}.jpg", ...)`
(`dream.js:93`, R2 bucket `shay-stones`, served `https://cdn.shaym.beauty` — `_storage.js:9`)
→ patch `image` URL back. Budget's `countDreams()` (`_budget.js:48`) counts `dreams` rows.

**Recommendation:** reuse the `dreams` table with a `kind` discriminator column
(`'dream' | 'placement'`), and a **new R2 prefix `placements/{id}.jpg`**.
- Why: `countDreams()` keeps working with ZERO change to `_budget.js` — the budget gate
  stays correct automatically. New prefix keeps the CDN namespace clean and lets you set a
  different R2 lifecycle/retention rule on room composites (see §4b).
- The alternative (separate `placements` table) is cleaner separation but **breaks the
  budget gate** until you extend `computeUsage` to sum both tables. That's the trap. See D2.

**4b. PII / privacy — this is new and load-bearing.** Room photos are the interior of a
real person's home = personal data. The dream feature never had this (stones only).
- **Do NOT persist the input room photo.** Process it in-memory, discard after the gen.
  You only need the *output* composite. This removes the biggest retention liability at
  zero cost. (If a "re-run / tweak" feature later needs the source, revisit with a retention
  policy + deletion path.)
- **The OUTPUT composite still contains the room** → also PII, and it lands on a **public**
  R2 bucket (`cdn.shaym.beauty`, anyone-with-URL can fetch). Mitigations: UUID path is
  effectively unguessable and unlisted (acceptable baseline, same as dreams today), but
  consider (a) an R2 lifecycle rule to auto-expire `placements/` objects after N days, and
  (b) a delete endpoint so a user can revoke. Document the "public-with-unguessable-URL"
  posture explicitly — it's fine for a shared art render, riskier for someone's living room.
- `ip` is already stored per row (`dream.js:86`) — keep, but note it's PII under GDPR.

### 5. Rate limiting & abuse (uploads are heavier)

Current limiter (`dream.js:18-24`): in-memory `Map`, 30 hits/hour/IP.
- **Weakness (pre-existing):** it's **per-instance** — serverless runs many instances, and
  each cold start resets the Map, so 30/hr/IP is a soft, leaky bound, not a global one.
- **The real global backstop is the budget gate** (`computeUsage.blocked`) — that IS the
  cost ceiling and it works across instances. Good. Keep leaning on it.
- **Uploads raise the stakes:** an attacker can (a) flood expensive $0.10 gens, (b) upload
  huge images to blow memory/bandwidth. Recommend for `api/place.js`:
  1. **Hard cap the upload size** (e.g. reject > 6–8 MB, and/or downscale server-side before
     sending to Gemini — also trims input tokens). The current code has NO size guard.
  2. **Tighter per-IP RL** than dreams (e.g. 10/hr) since each call is a paid image + upload.
  3. Keep the budget gate as the true ceiling; consider a lower `monthlyCapUsd` headroom
     buffer given place gens cost ~$0.10 each.

### 6. Cost / latency comparison — Gemini vs alternatives

Only relevant if quality (other Poll) rules Gemini out. Rough $/image at edit/compositing,
Jul 2026 (see Sources — third-party aggregators, treat ±20%):

| Path | Model | ~$/image | Latency | Notes |
|---|---|---|---|---|
| **Gemini API (current)** | gemini-3.1-flash-image, 2K | **$0.10** | 10–30s | Already wired; multi-image input native; batch $0.05 (async only) |
| fal.ai | FLUX.1 Kontext [pro] | ~$0.04 | ~2–6s | Purpose-built in-context edit; cheaper + faster; different model/quality |
| fal.ai | Nano Banana 2 (resold) | ~$0.06 @512 / ~$0.10 @2K | sub-2s (Lite) | Same family as Gemini, sometimes cheaper at low res |
| Replicate | FLUX Kontext / nano-banana | ~$0.04–0.06 | ~5–15s (+cold start) | Per-run billing; cold starts add latency |
| HF Space (self-host) | FLUX/SD self-hosted | GPU-time (~$0.6–4/hr) | 30–60s cold, GPU-dep | No per-image fee but you pay idle GPU + cold starts + ops; worst latency |

- **Cost read:** Gemini 2K ($0.10) is the *pricey* end. fal.ai FLUX Kontext (~$0.04) is
  ~2.5× cheaper AND ~5× faster — the strongest cost/latency alternative **if** its
  compositing quality is acceptable (quality = other Poll; do not decide here).
- **Latency read:** Gemini's 10–30s is the slow end; fal is seconds. For a user staring at
  an upload spinner, that UX gap is real (frontend Poll's call).
- **Integration read:** Gemini is already coded (`generatePano` reused almost verbatim, just
  add a 2nd `inlineData`). Switching providers = new SDK/HTTP path + new keys + new failure
  modes. That integration cost is real and favors staying on Gemini for v1.

---

## Bottom — the open ends

### Dilemmas (Decision → Options → Lean → Why → Price → Risk)

**D1 — Provider for v1.**
- Options: (a) Gemini 3.1 Flash Image (reuse spine), (b) fal.ai FLUX Kontext, (c) HF self-host.
- Lean: **(a) Gemini for v1.**
- Why: already wired; `generatePano` needs only a second input image; one env var, known
  failure modes. Ship, measure real cost/latency, then revisit.
- Price: ~$0.10/gen, 10–30s latency (the expensive + slow corner of the table).
- Risk: if latency hurts conversion or cost scales badly, (b) fal is ~2.5× cheaper / ~5×
  faster — but that's a quality call (other Poll) + an integration rebuild.

**D2 — Where do placements live (budget correctness).**
- Options: (a) reuse `dreams` table + `kind` column + `placements/` R2 prefix; (b) new
  `placements` table + extend `computeUsage` to sum both.
- Lean: **(a).**
- Why: `countDreams()` and the whole budget gate keep working with ZERO `_budget.js`
  change; lowest friction; costs are equal (~$0.10) so a shared `costPerDreamUsd` is honest.
- Price: one `kind` column migration + bump `costPerDreamUsd` to ~0.11.
- Risk: PII (room composites) shares a table with stone dreams; if per-feature cost ever
  diverges, the single scalar becomes a lie and you're forced into (b) anyway.

**D3 — Do we store the input room photo at all?**
- Options: (a) discard after gen (in-memory only); (b) persist for re-runs/tweaks.
- Lean: **(a) discard.**
- Why: removes the heaviest PII liability at zero product cost; the composite is the
  deliverable, not the source.
- Price: none (actually cheaper — no extra R2 write).
- Risk: a future "adjust my placement" feature would need the source; revisit then with a
  retention + deletion policy.

**D4 — `costPerDreamUsd` correction scope.**
- The $0.06 → ~$0.11 correction affects the EXISTING dream feature's budget accounting too
  (it's been under-counting spend ~1.7×). Decision for Mark/owner: correct it now (accurate
  caps, but existing caps effectively tighten) or leave dreams at $0.06 and only price place
  correctly (requires per-kind cost = pushes toward D2 option b). Not my call — flagging.

### Gaps / unverified

- **Pricing is web-sourced, not invoiced.** $0.101/2K standard is consistent across Google
  dev docs + 3 aggregators (Jul 2026), but I could not pull a real Stones Gemini invoice to
  confirm the *effective* rate (free-tier allotments, AI Studio vs API rate discrepancy the
  sources flagged — AI Studio reportedly shows 2× input rates; image-output rate is
  consistent). Confirm against an actual billing export before hard-committing caps.
- **Alternative-provider $/latency (§6) are third-party aggregator figures, ±20%.** Not
  benchmarked on our actual 2-image compositing payload. Directional only.
- **Vercel account tier / true default maxDuration** not verified from the dashboard — I
  inferred "must set explicitly" from the fact that all three long functions carry explicit
  `maxDuration`. Worst case if unset is a timeout, so the recommendation (always set it)
  holds regardless of the exact default.
- **Actual place-in-space latency (10–30s) is the charter's estimate**, not measured. Two
  input images may push gen time up vs the single-image dream. Measure on first deploy.

### Sources
- Gemini pricing (official): https://ai.google.dev/gemini-api/docs/pricing
- 2K token/$ breakdown: https://blog.laozhang.ai/en/posts/gemini-3-1-flash-image-preview
- Nano Banana 2 price range: https://www.aifreeapi.com/en/posts/gemini-flash-image-generation-pricing
- Provider comparison: https://pricepertoken.com/image ; https://fal.ai/learn/tools/ai-image-editing-tools
- Code: `api/dream.js`, `api/_budget.js`, `api/_storage.js`, `vercel.json` (all in `/home/oriamasas/altro/shay/`)
