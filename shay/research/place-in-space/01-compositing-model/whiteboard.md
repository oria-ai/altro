# Place-in-Space — Compositing Model (Poll 01)

Angle: which model/pipeline places a specific Stones piece into the user's
uploaded room photo. Charter question: can `gemini-3.1-flash-image` do faithful
two-image compositing (room + stone → room-with-stone) in one shot? If not,
what's the fallback?

---

## Top — the click

**Ship the one-shot Gemini path first — it is genuinely capable now and it is
already 90% built in this repo — but design it knowing Gemini re-renders the
WHOLE frame, so it preserves the user's room *approximately, not pixel-exact*.
Keep a mask-based inpaint pipeline (Flux Fill / SDXL inpaint) as the named
fallback for when "that's not quite my room" kills the magic.**

Three facts drive this:

1. **Gemini 3.1 Flash Image (Nano Banana 2) does exactly this task.** It accepts
   many input images in one request (this variant: up to **10 object + 4
   character + 3 style** reference images — 2 images is trivially within limit),
   and it does both *composition* ("take X from image 1, place it on the subject
   in image 2") and *targeted editing* ("change only Y, keep the rest
   unchanged") in a single call. Two images (room, stone) + an edit prompt is
   the documented sweet spot. Source: [ai.google.dev image-generation docs](https://ai.google.dev/gemini-api/docs/image-generation).

2. **The delta from the existing `dream.js` is tiny.** `dream.js:40-49` already
   sends `contents:[{parts:[{text},{inlineData:stone}]}]` to this exact model /
   endpoint / env var. Place-in-space is: add a **second** `inlineData` (the room
   photo), swap the "generate a 360 pano" prompt for an "edit THIS room, insert
   the attached stone" prompt, and set `aspectRatio` to the room's ratio instead
   of `21:9`. Same infra spine, same retry loop, same budget/storage plumbing.

3. **The load-bearing caveat.** Gemini image editing re-renders the entire output
   image; "preserve unchanged" is *learned behavior, not a pixel copy*. The public
   Gemini API exposes **no mask input** (unlike Imagen), and there are documented
   reports of it failing to "lock" the untouched region on image-to-image edits.
   So the user's walls/furniture/floor come back *plausibly similar*, not
   identical. For `dream.js` that's fine (it's a fantasy pano). For "see the stone
   in **MY** room" the emotional promise is "that's *my* room" — so preservation
   fidelity matters more here, and this is the one thing to empirically test
   before committing.

**Recommendation: one-shot Gemini as the primary; mask-based inpaint as the
declared fallback gated on a QA finding, not shipped up front.** (This is a
model-choice call; the DECIDE on "how good is good enough" is a dilemma below —
that's Mark's slot.)

---

## Middle — the body

### What Gemini multi-image actually does (evidence)

- **Multiple input images, one request.** Passed as a flat `parts`/`input` array:
  `[{text}, {image A}, {image B}, ...]`. Nano Banana 2 supports up to 14 total
  reference images; the Flash-Image variant budget is 10 object + 4 character +
  3 style. Our need = 2. Sources:
  [image-generation docs](https://ai.google.dev/gemini-api/docs/image-generation),
  [Gemini 3.1 Flash Image model page](https://ai.google.dev/gemini-api/docs/models).
- **It composites across images.** Documented example: *"Create a professional
  e-commerce fashion photo. Take the blue floral dress from the first image and
  let the woman from the second image wear it."* The model "synthesizes across
  images, adjusting lighting and shadows to match." That is structurally our task
  (take the stone from image 2, place it in the room from image 1).
- **It does targeted, preserve-the-rest edits (mask-free).** Documented example:
  *"change only the blue sofa to be a … chesterfield sofa. Keep the rest of the
  room … unchanged."* Nano Banana 2 has built-in semantic segmentation, so it can
  localize an edit from text alone — no mask upload. Source:
  [image-generation docs](https://ai.google.dev/gemini-api/docs/image-generation),
  [gemini.google image-generation](https://gemini.google/overview/image-generation/).
- **Identity/color preservation is a prompt lever, not a guarantee.** Docs advise
  describing the preserved features explicitly: *"Ensure the [subject]'s features
  remain completely unchanged … it should look like it's naturally [placed],
  following the [surface]."* This maps directly to the stone's banding/veining/
  color language already written in `dream.js:32`.
- **Output config we get for free** (same `generationConfig` shape as `dream.js`):
  `responseModalities:["IMAGE"]`, `imageConfig.aspectRatio` (enum incl.
  `1:1,4:3,3:4,16:9,9:16,21:9,...`), `imageConfig.imageSize` (`512px|1K|2K|4K`).
  For place-in-space set `aspectRatio` to the **room photo's** ratio (portrait
  phone shots → `3:4`/`9:16`) and `imageSize:"2K"` or `"4K"`.

### Prompt shape for place-in-space (derived, judgment)

Order matters — put the **scene to edit first**, the **object second**, and name
them by position:

```
parts: [
  { text: <edit prompt below> },
  { inlineData: { mimeType:"image/jpeg", data: roomB64 } },   // image 1 = the room
  { inlineData: { mimeType:"image/jpeg", data: stoneB64 } },  // image 2 = the stone
]
```

Prompt skeleton (edit-register, not generate-register):

> "Edit the FIRST image — the user's own room — by placing the polished mineral
> specimen from the SECOND image into it, resting on [a surface already visible
> in the room: the table/shelf/floor]. Keep the room itself — walls, furniture,
> floor, windows, lighting — exactly as in the first image; do not restyle,
> recolor or reframe the room. Reproduce the stone faithfully from the second
> photo: its true colors, banding, veining, texture and exact shape [reuse the
> stone-fidelity language from dream.js]. Match the stone's lighting and cast a
> soft, physically-plausible shadow so it sits naturally in the room. No people,
> no text, no watermarks."

Key differences from `dream.js`'s prompt: (a) explicit "FIRST image = the room,
keep it unchanged" clause, (b) drop all the 360/equirectangular framing, (c)
anchor the stone to a real surface in the user's photo rather than an invented
pedestal.

### "Regenerate around the stone" vs "true composite onto the uploaded pixels"

This is the charter's core fork. Three tiers, decreasing room-drift:

| Tier | What it does | Room fidelity | Stone fidelity | Effort |
|---|---|---|---|---|
| A. Full regenerate (dream.js today) | text scene + stone → new scene | none (invented room) | good | already built |
| B. Gemini one-shot edit (room+stone) | re-renders whole frame, tries to preserve room | **approximate** (learned, drift risk) | good | tiny delta from A |
| C. Mask-based inpaint | only a masked region changes; rest = original pixels | **exact** (literal pixels) | model-dependent | new pipeline |

The feature needs **B or C, not A** — A throws away the user's actual room, which
defeats "in MY space." B is the pragmatic default (one call, one model, already
wired). C is the fidelity ceiling but demands a mask (auto-segmentation or a user
tap on "where should it go") and loses Gemini's global relight coherence at the
mask seam.

### Named fallback / alternative models (if Gemini under-delivers on room fidelity)

- **Flux Fill / FLUX.2 Klein inpainting** (mask-based). Original image + B/W mask
  (white = edit, black = keep). Everything outside the mask is the *literal
  uploaded pixels* → pixel-exact room. On fal & Replicate. Best when "must be
  provably my room" is the hard requirement. Source:
  [FLUX.2 Klein inpainting](https://www.floyo.ai/workflows/flux-2-klein-9b-image-inpainting-jwf7puc9qufc).
- **SDXL inpaint** — the commodity open-weight mask inpaint baseline; cheap,
  everywhere, weaker at photoreal relight than Flux. Fallback-of-fallback.
- **Bria Product Shot** (fal, **$0.04/img**) — "place any product in any scenery
  with a prompt or reference image while maintaining high integrity of the
  product"; trained on **licensed data → commercially safe**. But its native shape
  is product→*new* scene (like tier A), not insert-into-*user's* scene; usable
  only if it accepts a scene reference image as the background to preserve. Source:
  [fal Bria Product Shot](https://fal.ai/models/fal-ai/bria/product-shot).
- **Seedream 4.5 Edit** (fal, up to 10 ref images) — spatial multi-image edits
  ("replace the product in Figure 1 with that in Figure 2"); a direct
  Gemini-alternative for the two-image composite if Gemini's stone identity
  slips. Source:
  [fal image editing tools](https://fal.ai/learn/tools/ai-image-editing-tools).
- **Nightjar / Photoroom / Flair** — SaaS product-placement tools. Nightjar's
  "reference-based, product-first" framing is the right philosophy but these are
  app-first, not clean API primitives for our serverless spine — deprioritize.
  Source: [nightjar three-approaches](https://nightjar.so/blog/ai-product-placement-in-scenes).

Industry framing worth internalizing (nightjar): **prompt-only generation "treats
your product photo as a suggestion, not a constraint — colors shift, textures
smooth, logos go illegible."** That is precisely the failure mode we must guard
the stone's banding against — hence the explicit fidelity clause in the prompt and
why identity preservation is the make-or-break, not scene beauty.

---

## Bottom — the open ends

### Dilemma D1 — Room-fidelity bar: Gemini-approximate vs mask-exact
- **Decision:** How faithful must the user's *room* come back?
- **Options:** (B) Gemini one-shot, room preserved approximately / (C) mask-based
  inpaint, room preserved to the pixel.
- **Lean:** B first. Ship the one-shot, measure real drift on real phone photos.
- **Why:** B is one model, already wired, and gives coherent global relighting of
  the stone into the scene. Most users won't pixel-diff their own wall; "close
  enough + a beautifully lit stone" likely beats "exact wall + a flatter paste."
- **Price:** B ≈ same per-image cost as dream.js today (one Gemini call). C adds a
  segmentation/mask step (auto or user-tap) + a second model (~$0.04–higher/img).
- **Risk:** If drift is bad (furniture morphs, room recolors), the "that's my
  room" magic dies and B is worse than useless. Mitigation: gate the ship on a QA
  pass; keep C spec'd and ready.

### Dilemma D2 — Who chooses placement: model-auto vs user-directed
- **Decision:** Does the model decide where the stone goes, or the user?
- **Options:** (a) model auto-anchors to a plausible surface / (b) user taps a
  spot (which also gives us a free mask for tier C).
- **Lean:** (a) for v1 (mask-free, zero UX). Revisit if placements land wrong.
- **Why / Price / Risk:** auto = zero friction but the stone may float / sit on
  the wrong surface; a tap unlocks both better placement AND the mask that makes
  tier C possible. (UX ownership is another Poll's — flagging the coupling only.)

### Dilemma D3 — Stay Gemini vs hedge to a fidelity-tuned alt
- **Decision:** Single-vendor on Gemini, or wire a second model behind a flag?
- **Options:** Gemini-only / Gemini + Seedream 4.5 or Flux Fill behind a toggle.
- **Lean:** Gemini-only for v1; the delta from dream.js is too small to justify a
  second integration before we've seen Gemini fail.
- **Risk:** vendor lock + "preview" model status (Nano Banana 2 is a
  preview/February-2026 model) — API shape or limits could shift.

### Gaps / couldn't verify
- **No live API test run.** I did not fire a real place-in-space call (would spend
  the shared Gemini budget + out of a read-only research charter). **The #1 thing
  to empirically test:** take 3–4 real phone photos of rooms + a Stones product
  photo, run tier-B, and eyeball (i) room drift and (ii) stone banding fidelity.
  Everything above is doc-grounded capability, not measured output quality.
- **Model doc page 404'd.** `…/models/gemini-3.1-flash-image-preview` returned 404;
  the per-variable image-count budget (10 object / 4 character / 3 style) comes
  from the general [image-generation docs](https://ai.google.dev/gemini-api/docs/image-generation),
  not the model-specific page. Treat exact counts as approximate.
- **Aspect-ratio exactness.** The API takes an aspect-ratio *enum*, not an
  arbitrary ratio — a user's oddly-cropped photo may be nudged to the nearest
  enum. Unverified whether that causes visible letterbox/crop of their room.
- **Does Bria Product Shot accept a *background-to-preserve* image?** Its docs say
  "prompt or reference image" for the scene; unclear if that reference is a
  *style* ref (regenerate) or a *preserve-this-background* input. Would need a test
  to know if it can do tier B/C at all.
- **Realism (shadow/lighting/scale)** is another Poll's angle — touched here only
  where inseparable from the model call (Gemini's built-in relight is a *reason*
  to prefer B over a hard paste).
