# Place-in-Space — Frontend UX + Client Tech (Poll / angle 02)

Angle: the user uploads a PHOTO of their real room, we composite a Stones
specimen into it, show a preview, then save/share/buy. What's the UX and the
client-side tech, grafted onto the existing vanilla-JS dream modal?

Read: `index.html` (the live inline lightbox + dream flow, lines ~452–963),
`app.js` (a **separate, legacy** lightbox — the live gallery is the inline
script in index.html; do not build on app.js), `api/dream.js` (the API this
parallels).

---

## Top — the click

**Ship fully-automatic placement first; make the single gesture of control a
one-tap "place it here" — never a drag-box, mask, or slider. And it needs
ZERO new client libraries.**

Two load-bearing calls:

1. **Placement = automatic-first, one-tap-optional.** The existing dream flow
   places the stone with *no* spatial input at all (just a text description)
   and it ships and works (`startDream`, index.html:769). Adding drag handles,
   a rubber-band box, or a mask is fiddly on a phone and is a lot of new UI for
   marginal control. The API already accepts an *optional placement hint*, so
   the honest v1 is: send **no hint** (model decides), and offer **one tap** on
   the photo that drops a marker and sends a normalized `{x,y}`. Tap is the
   whole interaction budget a phone user will spend. Everything past that
   (scale sliders, masks) is a fast-follow, gated on whether automatic actually
   misses.

2. **The client stack is zero-dependency vanilla, and it does NOT need
   three.js.** The result of this feature is a flat 2-D composite JPEG, not a
   360° pano — so the heavy `vendor/three.min.js` path is irrelevant here.
   Everything the feature needs already exists in the browser:
   - capture/upload → native `<input type=file accept=image/* capture=environment>`
   - downscale + HEIC-normalize → `createImageBitmap` + `<canvas>.toBlob` (one
     step does both, see Middle)
   - tap-to-place → pointer coords → normalized fraction
   - before/after preview → `<input type=range>` + `clip-path` (no lib)
   - share → `navigator.share` (already used, index.html:938)

   The whole thing is a **graft, not a greenfield**: it's a second AI "look"
   slide sitting beside the existing "Your Home" dream slide, reusing its
   loading ticker, mid-generation email capture, localStorage persistence,
   `?id=` deep-link, and the Offer button verbatim.

Product framing that falls out of this: **"Your Home"** (existing) = *imagine*
it (type a room → 360°). **"In Your Room"** (new) = *see* it (photo → real
composite). Two complementary slides, same chrome.

---

## Middle — the body

### How it grafts onto the existing dream modal

The lightbox builds its slides from `slidesFor(s)` (index.html:474). Today it
maps the stone's `looks` and pushes one synthetic slide `{dream:true,…}`
("Your Home"). **Add one more pushed slide** `{place:true,…}` ("In Your
Room"). `buildLB` (index.html:499) already special-cases the dream slide
(`if(v.dream) els.push(dreamSlide)`); add the mirror `if(v.place) els.push(placeSlide)`.

Reuse, near-verbatim, from the dream flow:
- **Loading state** — `DREAM_LINES` ticker + `.dreaming` class (index.html:640,
  765–767, 780–781). Same ~10–30s wait, already solved.
- **Mid-generation email capture** — the "email it when ready" box that appears
  at 3s and the `pendingEmail` handoff (index.html:783, 803–807, `emailDream`
  729). Works unchanged; only the endpoint id header name changes.
- **Persistence** — `savedDreams`/`rememberDream`/`restoreDream`
  (index.html:652–669) keyed by stone id. Add a parallel `shay_places_v1`
  store (or extend the record with a `placeId`).
- **Deep link + share** — `?dream=<id>` (index.html:629–636) and `sharePano`
  (933). Add `?place=<id>`; share the composite the same way.
- **Offer / buy** — the whole `.lb-offer` block (index.html:405–424,
  `toggleOffer`/`submitOffer` 594–621) is slide-agnostic; nothing to change.

The ONE real divergence from the dream flow: the **result presentation**. The
dream result opens the three.js pano ("step inside"). The place result is a 2-D
image, so instead of `openPano` we show a **before/after reveal** (their raw
room vs the composite). Keep `dreamResult`/`renderDreamResult` shape (a result
`<img>` on the slide + a thumbnail swap), swap "step inside — 360°" for a
draggable reveal handle.

### The flow, step by step

1. **Enter.** User opens a stone, swipes to the "In Your Room" slide. Thumb
   shows a camera glyph (or their last-used room photo if one is remembered).
2. **Capture.** Big tap target = a styled `<label>` wrapping
   `<input type=file accept="image/*" capture=environment>`. On iOS this offers
   Take Photo / Photo Library / Choose File; on Android `capture=environment`
   biases to the rear camera. (Behavior caveat → D2, Gaps.)
3. **Instant local preview.** On `change`, downscale+re-encode client-side (see
   below) and paint the room photo as the slide background *immediately* — no
   server round-trip yet. This is the fast feedback that makes the wait feel
   earned. Overlay a dismissible hint: "Tap where you'd like it (optional)".
4. **Optional placement.** A single tap on the photo drops a marker (reuse the
   stone's blurred thumbnail at low opacity) at pointer position → store
   normalized `{x: px/rectW, y: py/rectH}`. If tap-to-place is used, reveal a
   3-step **S / M / L** segmented control (not a continuous slider). Skip = fully
   automatic, hint omitted.
5. **Submit.** "Place it" → `POST /api/place` as `multipart/form-data`
   (FormData): `stone` id, the re-encoded JPEG blob, optional
   `hint={x,y,size}`. Enter the reused `.dreaming` state (ticker + disable +
   3s email offer).
6. **Result.** JPEG returns (+ `X-Place-Id` header, mirroring `X-Dream-Id`).
   `URL.createObjectURL(blob)` → show as before/after: raw room photo
   underneath, composite on top clipped by a draggable `<input type=range>`
   divider. Persist id to localStorage; set thumbnail to the composite.
7. **Save / share / buy.** "Try another photo" (= `regenDream` analog, clears
   state), "Email me" (reused), Share (`navigator.share`, ideally the image
   File itself — see Gaps), Offer button unchanged.

### Client-side image handling (the concrete part)

**One canvas pass does downscale AND HEIC-normalization at once.** Because
`canvas.toBlob('image/jpeg')` always emits a web-safe format, re-encoding a
HEIC blob through the canvas *is* the HEIC fix — for the exact device that
produces HEIC (an iPhone, whose Safari can natively decode HEIC). Shape:

```js
async function prepRoomPhoto(file, maxEdge = 1600, quality = 0.85) {
  // imageOrientation:'from-image' respects EXIF so portrait phone shots
  // aren't rotated wrong. Default createImageBitmap IGNORES EXIF. (MDN)
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  return await new Promise(r => c.toBlob(r, 'image/jpeg', quality)); // ~200–400KB
}
```

Why each piece:
- **Downscale to ~1600px longest edge / q0.85** turns a 3–8 MB phone photo into
  ~200–400 KB — smaller upload, faster round-trip, less mobile-data burn. (The
  *right* target resolution is a cross-angle dependency → D5.)
- **`imageOrientation:'from-image'`** is required — `createImageBitmap`'s
  default drops EXIF orientation, so half of all portrait phone uploads would
  arrive sideways. (MDN; whatwg/html#7210.)
- **`toBlob('image/jpeg')` as HEIC normalizer** — canvas can't emit HEIC, so
  the output is always JPEG. This dodges the whole "HEIC won't upload" class of
  bug *on the device that makes HEIC*. The residual gap is a `.heic` file
  dragged into a **non-Apple desktop browser** (Chrome/Firefox can't *decode*
  HEIC to draw it) → `createImageBitmap` rejects → catch it and show "Please use
  a JPEG or PNG." (D2.)
- The server already runs `sharp`, so it can re-clamp/normalize too — client
  downscale is about payload + battery, not correctness of record.

**Transport:** `FormData` multipart, not JSON+base64. Base64 inflates the
payload ~33% and forces a big string through JSON; multipart is smaller and
Vercel serverless + `sharp` handle it natively. (D3.)

**Before/after reveal (zero-dep):** stack composite over raw room photo in the
`.lb-stage`; an `<input type=range min=0 max=100>` drives
`clip-path: inset(0 {100-v}% 0 0)` on the top image + a thin handle line. Touch
"drag" is just the native range thumb — already accessible, already
keyboard-operable, no swipe-vs-scroll conflict.

---

## Bottom — the open ends

### Dilemmas (Decision → Options → Lean → Why → Price → Risk)

**D1 — Placement interaction.**
- Options: (a) fully automatic, no spatial input; (b) automatic + optional
  single tap → `{x,y}` hint; (c) draggable marker w/ resize; (d) rubber-band
  box / brush mask.
- **Lean: (b).** Why: matches the dream flow's zero-friction bar, spends the
  one gesture a phone user will give, and the API already takes an optional
  hint so we can ship (a) and layer the tap in without a contract change.
- Price: the model sometimes places the stone somewhere the user wouldn't; a
  tap only *hints* (compositing Poll decides how hard the hint binds).
- Risk: if automatic placement is frequently wrong, tap-as-hint may feel
  ignored → users expect the tap to be *authoritative*. Needs a real trial.

**D2 — `accept` value + HEIC path.**
- Options: (a) `accept="image/*"` + canvas re-encode as the normalizer; (b)
  explicit `accept="image/jpeg,image/png,image/heic,image/heif"`.
- **Lean: (a).** Why: `image/*` keeps both "Take Photo" and library open on
  iOS, and the canvas pass already yields JPEG regardless. Evidence is *mixed*:
  some reports say iOS Safari's automatic HEIC→JPEG conversion is more reliable
  when `accept` explicitly lists jpeg/png than with the `image/*` wildcard
  (Apple Dev Forums 743049) — but our canvas re-encode makes that moot on iOS
  because we decode+re-emit ourselves.
- Price/Risk: non-Apple **desktop** browsers can't decode a `.heic` to draw it
  → must detect the `createImageBitmap` rejection and show a friendly fallback.
  Low volume (feature is phone-first) but not zero.

**D3 — Upload transport.** multipart FormData (lean) vs JSON base64. Lean
FormData: smaller, no 33% bloat, native `sharp` handling. Price: slightly
different serverless body parsing than `api/dream.js`'s JSON. Low risk.

**D4 — Result presentation.** before/after slider (lean) vs plain reveal vs
side-by-side vs fade toggle. Lean slider: it's the "wow, that's *my* room"
moment and is zero-dep. Price: one more interactive control. Risk: on a very
small phone the drag handle competes with lightbox swipe-nav — scope the range
input to the stage and `stopPropagation`.

**D5 — Downscale target resolution [CROSS-ANGLE — do not resolve here].**
Payload/battery want *smaller*; realistic compositing wants *enough* pixels for
the model to match lighting/perspective. 1600px/q0.85 is my UX-side lean but
the **compositing (01) and realism (04) Polls own the true minimum input
resolution.** Flag: confirm min viable input dims before locking the canvas cap.

**D6 — Scale control.** none / auto-from-dimensions (lean when automatic) vs
S/M/L segmented (lean when tap-to-place) vs continuous slider (reject —
fiddly on touch). Note: stones carry real `dimensions.height_cm` in the
manifest (used by `buildRuler`, index.html:532), so the model can size
relative to the room without any user control at all.

**D7 — Slide home.** New dedicated "In Your Room" slide (lean) vs a mode toggle
inside the existing dream slide. Lean separate: cleaner product story, keeps
each slide's state independent, and `buildLB` already has the extension seam.

### Gaps / things I could not resolve from the code alone

- **`capture=environment` on iOS is largely advisory** — iOS tends to show the
  Photo/Library/File menu regardless, while Android honors it to force the rear
  camera. Needs a real-device test on both; behavior shifts across iOS
  versions. (Couldn't verify against a device from here — judgment + search.)
- **`navigator.share` with a File (the composite image itself)** vs just a URL —
  Web Share Level 2 file-sharing support varies; iOS supports it, but needs a
  device check. Current `sharePano` shares only a URL (index.html:939); sharing
  the actual image would be a nicer result-share. Untested here.
- **EXIF orientation edge cases** on older Safari despite
  `imageOrientation:'from-image'` — worth a portrait-photo device test.
- **Privacy surface is heavier than the dream flow.** A room photo is more
  sensitive than a typed description; the capture step must carry a visible
  consent line (reuse `.form-consent` + `/privacy.html`, index.html:396). The
  legal/retention specifics cross into the infra (03) angle — flagged, not
  owned here.
- **Live-camera / AR (real-time placement)** is explicitly *not* this — that's
  a WebXR / 8thWall-class project, an order of magnitude heavier. This angle is
  photo-upload-then-composite only. (Scoping judgment, not evidence.)
- Endpoint `/api/place` is **assumed** (per charter: room image + stone id +
  optional hint → JPEG). The client contract above (FormData in, JPEG +
  `X-Place-Id` out) is my proposal; the compositing/infra Polls own the actual
  signature.
```
