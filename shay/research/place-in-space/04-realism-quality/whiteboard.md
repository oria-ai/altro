# Realism & Quality — placing THIS stone into a REAL uploaded room photo

Angle 04 of the "place-in-space" R&D round. Investigator: Poll (Professor of
visual realism in AI compositing). SoT persona: `oria-crazy-world/ground/personas/poll.md`.

Subject studied first-hand:
- `/home/oriamasas/altro/shay/api/dream.js` — the `generatePano()` PROMPT (our prompt-craft baseline).
- `/home/oriamasas/altro/shay/input/flint.jpg`, `boulder.jpg` — the product photos.
- `/home/oriamasas/altro/shay/stones/manifest.json` — **carries real cm dimensions per stone.**
- `/home/oriamasas/altro/shay/stones/flint/meta.json` — **carries a structured material description per stone.**
- `/home/oriamasas/altro/shay/stones/flint/dream-sample.jpg` — a current pano output.

---

## Top — the click

**The new feature inverts the constraint the existing prompt was built for, and
that inversion is the whole realism problem.** `generatePano()` *generates* a
scene and *re-renders* the stone inside it, and it deliberately makes the stone
"the unmistakable focal point… large enough that every band is visible…
centred dead-ahead, large and sharp" (dream.js:32–36). For a composite into the
user's *real, fixed* photo, three of those instincts become the exact things
that read as fake. Get these three right and the rest is polish:

1. **Respect true scale — do NOT make it the hero.** A ~15 cm stone on a table
   3 m across a room occupies only ~3–5 % of frame width (judgment; geometry in
   Middle). Every "make it large and sharp and central" reflex from the pano
   prompt must be *reversed*. The single most common tell of a fake composite is
   an object rendered bigger than its real-world size allows. We already **know**
   the true size — `manifest.json` has `dimensions.width_cm` (flint 14, boulder
   85). Feed it. Anchor it to a surface the user picks. Never let the model
   free-size the stone.

2. **Ground it with a real contact shadow whose direction is read FROM the room,
   not from the product photo.** The flint photo has hard studio light from the
   upper-left with a hard shadow baked in on a white background (see flint.jpg).
   Naïvely inserted, the stone brings its *own* light direction and a white
   halo, and floats. The model must (a) strip the white background, (b) detect
   the room's dominant light direction/softness, (c) re-light the stone to match,
   and (d) cast a *new* contact + drop shadow consistent with the room. "Floating,
   no contact shadow" and "light coming from the wrong side" are the two failure
   modes users read as fake even when they can't name why.

3. **Lock identity by hue/banding/shape, let only illumination move.** We have a
   per-stone `distinctive_features` list already written (meta.json). The tension:
   matching the room's warm light can recolor the flint's cool blue-grey body and
   drift its identity into a "generic warm rock." Resolve it explicitly in the
   prompt: *keep the stone's own colours and every marking; let the room's light
   fall across it as brightness and soft ambient tint only.* Preserve pigment,
   adapt exposure.

**Go-to prompt scaffold** (full version in Middle; this is the spine):

> Image 1 is a real photograph of a room — this is the fixed background; do not
> change it. Image 2 is a product photo of a specific polished stone on a white
> studio background. Composite the stone from Image 2 onto the [SURFACE] in
> Image 1, and change nothing else in the room. The stone is [W] cm wide, about
> the size of [RELATABLE OBJECT] — render it at exactly that real-world size for
> its position on the [SURFACE]; it should look modest, not oversized. Preserve
> the stone's exact shape, colours, banding and markings: [DISTINCTIVE_FEATURES].
> Discard the white background around it. Re-light the stone so its illumination,
> colour-temperature and softness match the room; the stone keeps its own colours
> but the room's light falls across it. Cast a physically correct contact shadow
> and soft drop shadow on the [SURFACE] in the same direction and softness as the
> other shadows already in the room. Match the photo's focus, grain and white
> balance. Photorealistic; the result must look like the stone was always there.

---

## Middle — the body

### A. Failure modes → countermeasures

| # | Failure mode (the tell) | Root cause | Prompt countermeasure | Pipeline countermeasure |
|---|---|---|---|---|
| 1 | **Floating / no contact shadow** | model treats insert as a sticker | Explicit: "cast a contact shadow where the stone meets the [surface] plus a soft drop shadow"; name that the stone "rests on / sits on" the surface | Optional shadow-synthesis post-pass (see §D) |
| 2 | **Wrong light direction** | product photo's baked light ≠ room light | "re-light the stone so its shading matches the direction and softness of the light already in the room; move highlights to the side the room is lit from" | Detect room light dir (bright-region heuristic) and pass as text: "light comes from the [left/right/window]" |
| 3 | **Wrong scale (too big = classic fake)** | model free-sizes objects | inject real cm + relatable-object comparison + surface anchor; "modest, not oversized" | Compute expected pixel size from cm + surface distance and, if post-QA, reject/redo if the rendered stone exceeds it (judgment) |
| 4 | **White halo / matte fringe** | product shot on white bg, edges dragged in | "discard the white studio background entirely; blend only the stone, no white edge or halo" | Pre-segment the stone (remove.bg / SAM) and pass a cut-out PNG instead of the white-bg JPG (see §E) |
| 5 | **Plastic / over-smooth look** | model "beautifies" and kills micro-texture + adds uniform sheen | "keep the stone's real matte/waxy surface and micro-texture; do not smooth, polish or add gloss it doesn't have"; "match the photo's natural grain and slightly soft focus"; **optical anchoring** — name a focal length + aperture (e.g. "shot on 85 mm at f/2.8") steers toward a real photographic signature better than "photorealistic" [nightjar] | Post color/grain match to the room photo (see §D) |
| 6 | **Identity drift → generic rock** | re-lighting + "improvement" recolors/reshapes | lead with the identity-lock opener (proven in meta.json design prompts) + paste `distinctive_features` verbatim; "do not invent, add or remove any marking" | high reference-image weight; pass the *original* high-res stone photo, not a variant (see §E) |
| 7 | **Wrong perspective / tilt** | insert not aligned to surface plane | "align the stone to the perspective of the [surface]; it sits flat, seen from the same camera angle and height as the rest of the room" | tap-to-place coordinate gives the model the vanishing-consistent spot |
| 8 | **Missing occlusion** | stone drawn over foreground objects | "if any object in the room is in front of the chosen spot, let it occlude the stone naturally" | place behind via layer if doing manual composite (out of scope for prompt-only) |
| 9 | **No reflection on glossy surface / on the stone** | model omits secondary light interaction | "if the [surface] is glossy, add a soft reflection of the stone in it; let the room subtly reflect in the stone's polished faces" | minor; prompt-only is enough |
| 10 | **Whole room subtly regenerated** (colors shift, objects morph) | model re-paints the background | "do not alter, move, recolour or regenerate anything in the room except adding the stone and its shadow" | mask-based edit / inpaint only the insert region if the model supports it |

### B. Scale strategy (the highest-leverage, and we already hold the data)

**Geometry (judgment, first-order).** A phone camera ≈ 26 mm-equiv, ~65–70° horizontal FOV. Horizontal scene width ≈ `2 · d · tan(34°) ≈ 1.35 · d`.
- Flint (14 cm) on a coffee table at d≈1.5 m → scene width ≈2.0 m → stone ≈**7 % of frame width**.
- Flint on a console across the room at d≈3.5 m → scene width ≈4.7 m → stone ≈**3 % of frame width**.
- Boulder (85 cm) on the floor at d≈3 m → scene width ≈4.0 m → **~21 % of frame width** — a floor object, never a tabletop object.

The click: on a 1024-px-wide render the flint is **~30–70 px**. That is *small*, and small is what reads as real. The pano prompt's "large, hero, dead-center" is the anti-pattern here.

External corroboration [rewarx]: **reference objects in frame are the most
robust scale method** (household anchors — dining chair ≈96 cm, door frame
≈206 cm, countertop ≈86 cm) — more reliable than raw cm text; explicit cm is
second; surface-contact anchoring third. Practitioner note: unclear product
sizing drives ~18 % cart abandonment [rewarx] — scale isn't cosmetic, it's
conversion. Our advantage: the *surface itself* (the user's own table/shelf) is
a built-in in-frame reference object.

**Enforcement — layered, cheapest first:**
1. **Real cm from `manifest.json`** — inject `dimensions.width_cm`. (We have it; use it.)
2. **Relatable-object comparison** — models reason poorly about absolute cm but well about familiar objects. Map cm→comparison: ~14 cm ≈ "a grapefruit / a small coffee mug / two stacked fists"; ~85 cm ≈ "a large beanbag / a car tyre." (Judgment; a small lookup table.)
3. **Surface picker → distance prior.** User picks "on a table / on a shelf / on the floor." Table/shelf ⇒ small tabletop object near-to-mid; floor ⇒ larger, farther, grounded on the ground plane. This also drives *where* the shadow goes.
4. **Tap-to-place coordinate** (if the frontend allows) gives the model the exact spot → perspective + scale-with-distance become consistent. Strongly recommended; see Dilemma D3.
5. **Post-QA guard (optional):** compute expected max pixel-width from cm + surface, reject renders where the stone is clearly oversized. (Judgment; only if QA shows drift.)

### C. Full prompt scaffold (drop-in, fields in ALL-CAPS filled from data)

```
You are compositing a real object into a real photograph.

INPUTS
- Image 1 = a real photo of the user's room. This is the fixed background.
  You must NOT change, move, recolour, relight or regenerate anything in it.
- Image 2 = a studio product photo of one specific polished stone on a plain
  white background. This is the object to insert.

TASK
Place the stone from Image 2 onto the {SURFACE: e.g. wooden coffee table in the
foreground / floating shelf on the left wall / floor near the window} in Image 1,
{AT_POINT: optional "at the point I marked"}. Add only the stone and the shadow
and reflection it would cast. Everything else in the room stays pixel-identical.

TRUE SIZE (critical for realism)
The stone is {W_CM} cm wide, {H_CM} cm tall — about the size of {RELATABLE}.
Render it at exactly that real-world size for where it sits on the {SURFACE}.
It should look modest and correctly-scaled, NOT oversized, NOT a hero object.
A small stone across a room is small in the frame; keep it that way.

IDENTITY — this exact stone, not a generic rock
Preserve its exact shape, proportions, colours, banding and every marking:
{DISTINCTIVE_FEATURES, verbatim from meta.json, e.g.:
 - two-tone banding: dark brown outer layer over a milky white / grey-blue core
 - conchoidal fracture ripples on the pale faces
 - smooth semi-lustrous waxy surface
 - faint pinkish-brown gradations and sparse rust-coloured specks}
Do not add, remove, invent, smooth away or beautify any marking. Keep its real
matte/waxy micro-texture; do not turn it glossy or plastic. Discard the white
studio background completely — no white halo, fringe or edge.

LIGHT & GROUNDING (make it belong)
Re-light the stone so its shading, brightness, colour-temperature and shadow
softness match the light already in the room. The stone keeps its OWN colours;
the room's light merely falls across it (a warm room warms the highlights, a
cool room cools them). Move its highlights to the side the room is lit from.
Cast a physically correct contact shadow where the stone meets the {SURFACE},
plus a soft drop shadow, in the SAME direction and softness as the other shadows
in the room. If the {SURFACE} is glossy, add a faint reflection of the stone in
it, and let the room reflect subtly in the stone's polished faces. If anything in
the room is in front of the chosen spot, let it occlude the stone naturally.
Align the stone to the surface's perspective and the camera's height.

OUTPUT
A single photorealistic image identical to Image 1 except the stone now sits
there. Match Image 1's exposure, white balance, focus/blur and grain so the
stone looks photographed in the same shot. No text, no watermark.
```

Notes on ordering (judgment, reinforced by our own meta.json precedent): the
identity-lock sentence works best *early and repeated*; the meta.json `design`
prompts all open with *"Take the exact stone from the provided photo — preserve
its shape, texture, colors and every distinctive feature faithfully"* and that
phrasing already ships successfully — reuse it. The scale + "don't change the
room" clauses are the *new* load-bearing additions the pano prompt never needed.

### D. Pre/post-processing — verdict

**Verdict (judgment, pending live A/B): prompt-only for MVP; two cheap surgical
steps are the first things to add if QA shows tells.**

- **PRE — segment the stone off its white background (HIGH value, cheap).**
  The flint/boulder photos are on white/outdoor backgrounds with baked light.
  Passing a clean cut-out PNG (remove.bg or SAM) instead of the white-bg JPG
  removes failure #4 (halo) at the source and gives the model a cleaner identity
  signal. Low cost, high realism return. **Recommend for v1 if trivial to wire.**
  *Caveat [nightjar]:* the cut-out must be a **reference input to a generative
  composite**, never literally alpha-pasted onto the room — a hard paste "breaks
  contact-shadow physics" and reintroduces floating. Feed the cut-out; let the
  model re-render the stone + its shadow.
- **PRE — pass room light direction as text** (bright-region heuristic on the
  uploaded photo → "light from the left/window"). Cheap; directly attacks #2.
- **POST — color/white-balance + grain harmonization** (classic image
  harmonization; match insert stats to the room). Modern models often do this
  in-shot, so treat as *conditional*: add only if QA shows the stone reading
  "cleaner/sharper than the room." Medium cost (extra pass).
- **POST — shadow synthesis.** Only if the model keeps floating things after the
  prompt is tuned. Modern single-shot models usually cast shadows when told;
  a dedicated shadow pass is a fallback, not a default.
- **POST — relight pass (IC-Light V2).** The named tool: separates subject from
  its lighting and re-applies the target environment's light; ~$0.20/image via
  fal.ai/WaveSpeed, one extra call [apatero; fal.ai]. Practitioner consensus is
  it's *complementary, not strictly necessary* for a modern reference-anchored
  model — it exists precisely for "product shot under studio light must match a
  room's window light," which is our flint case. Hold as the escalation if
  in-shot re-lighting (D1c) fails the live test; not a v1 default.

Guiding principle: every post step is latency + cost + a new failure surface.
Add them reactively, driven by a realism QA rubric (below), not preemptively.

### E. Identity preservation (this specific stone)

Levers, strongest first:
1. **Feed the original high-res photo**, not a variant — `stones/<id>/original.jpg`
   (dream.js already resolves `images.original`). Max real detail = max fidelity.
2. **Reuse the proven identity-lock opener** from meta.json design prompts.
3. **Paste `distinctive_features` verbatim** into the prompt as a preserve-list —
   it's already authored per stone; it's the model's checklist against drift.
4. **Explicit anti-drift negatives:** "do not replace with a generic rock, do not
   invent/remove markings, do not smooth or polish" (the pano prompt already
   carries the "do NOT replace with a generic rock / glowing orb / blob" negative
   — dream.js:32 — reuse it).
5. **Decouple pigment from light** (the core tension): "keep the stone's own
   colours; let the room's light change only its brightness and add a soft
   ambient tint." This is what lets you match room warmth *without* losing the
   flint's cool blue identity.
6. **Reference-image strength:** if the model exposes a fidelity/denoise-strength
   knob for the object image, bias high on the stone. (Model-mechanics = angle 01's
   turf; flagged, not decided here.)

External corroboration [nightjar]: **reference-based >> template-based >>
prompt-only** for product consistency — passing the actual product photo and
having the model extract its lighting/colour/material beats describing it in
words. This validates feeding `original.jpg` as a reference over any text-only
description. Caveat [ai.google.dev]: Gemini docs do **not** quantify a fidelity
threshold or when identity drift kicks in — it's empirical, so the live test
(below) is how we calibrate, not the docs.

### F. A realism QA rubric (for eval / live test)

Score each render 0–2 on: (1) contact shadow present & correct direction;
(2) scale plausible vs surface; (3) light-temperature match; (4) no white halo;
(5) identity — banding/shape/colour intact; (6) texture not plasticky;
(7) room otherwise unchanged. Anything <2 on #1/#3/#5 = reject. This rubric is
also the checklist the live A/B in the Bottom section should measure.

---

## Bottom — the open ends

### Dilemmas (Decision → Options → Lean → Why → Price → Risk)

**D1 — Re-light strength vs identity fidelity.**
- Options: (a) lock colour hard, adapt nothing → stone looks pasted, wrong temp;
  (b) full re-light to room → identity drift to generic warm rock;
  (c) decouple: preserve pigment/markings, adapt only brightness + soft ambient tint.
- Lean: **(c).** Why: it's the only option that gets both "belongs in the room"
  and "still THIS stone." Price: needs careful prompt wording; may under-match a
  very warm room. Risk: model ignores the decoupling and recolors anyway → needs
  live test to confirm the wording holds.

**D2 — Prompt-only vs post-processing harmonization.**
- Options: (a) prompt-only; (b) prompt + pre-segment; (c) prompt + pre-segment + post color/shadow.
- Lean: **(b) for v1**, (c) reactively. Why: pre-segment is cheap and kills the
  halo; post-harmonize is conditional on QA. Price: (b) adds one API/tool call;
  (c) adds latency+cost+failure surface. Risk: skipping post may leave a faint
  "too clean" tell on some rooms.

**D3 — Scale/placement control: prompt-region vs tap-to-place vs bounding box.**
- Options: (a) describe the surface in text ("the coffee table"); (b) user taps a
  point on the uploaded photo → coordinate in prompt; (c) user drags a box sizing
  the stone.
- Lean: **(b) tap-to-place** as the sweet spot. Why: text placement is ambiguous
  in a cluttered room; a coordinate makes perspective+scale+shadow consistent
  with far less prompt gymnastics. Box (c) risks users choosing an unrealistic
  size, fighting the whole "true scale" thesis. Price: (b) needs a frontend tap
  UI + coordinate plumbing (angle 02's turf). Risk: if MVP ships text-only,
  expect more scale/placement rejects.

**D4 — cm vs relatable-object for size anchoring.**
- Options: (a) raw cm only; (b) relatable-object only; (c) both.
- Lean: **(c) both.** Why: cm is precise but models anchor better on familiar
  objects; belt-and-suspenders. Price: a tiny cm→comparison lookup table
  (judgment call per stone). Risk: a bad comparison could mislead — keep the
  table conservative.

**D5 — Single combined input image vs two labelled images.**
- Options: (a) pre-composite a rough paste, ask model to "harmonize"; (b) two
  separate images (room + stone) labelled by role in text.
- Lean: **(b)**, matching dream.js's existing multi-part `contents` shape
  (text + inlineData). Why: cleaner identity signal, no rough-paste artifacts to
  fight. Price: must reliably label which image is background vs object (order +
  text). Risk: model confuses roles → mitigated by explicit "Image 1 = … Image 2 = …".
- **Hard constraint [ai.google.dev]:** Gemini's image API has **no parameter to
  tag an input as background vs object** — role assignment is *entirely* natural
  language in the prompt. So (b) isn't just preferred, it's the only lever we
  have; the "Image 1 = fixed room / Image 2 = object" labelling in the scaffold
  is doing real work, not decoration. Gemini officially "blends multiple input
  images" and accepts many references, and Google's own example is exactly our
  shape: *"Put the car from Image A into the landscape from Image B. Match shadows
  and reflections to B; keep the car's paint texture from A"* [developers.googleblog].

### Known gaps / gaps named as gaps

- **Model mechanics (identity/fidelity knobs, multi-image role handling on
  gemini-3.1-flash-image) are OUT of my scope** (angle 01). My scaffold assumes
  the model honors a background image unchanged and a labelled object image —
  *this must be verified live*; if the model regenerates the whole frame,
  failure #10 dominates and a mask/inpaint path becomes necessary.
- **No live generations were run** in this angle (research-only). Every scale
  number is first-order geometry (judgment), and the prompt scaffold is untested
  against the real model.
- **Frontend/UX** of surface-picker and tap-to-place is angle 02's; I only
  established that realism *depends* on placement control.
- **Reflective/translucent minerals** (the flint is semi-translucent, waxy) may
  need extra care — subsurface glow, edge translucency — that generic "product
  compositing" advice doesn't cover. Flagged for the live test.
- **Web best-practice citations** (below) corroborate the first-hand analysis;
  claims not tagged with a `[source]` are my judgment or first-order geometry.

### Sources (external)

- [nightjar] Nightjar — realistic AI product placement / prompt patterns / "look real" checklist:
  https://nightjar.so/blog/ai-product-placement-in-scenes ·
  https://nightjar.so/blog/prompt-patterns-realistic-ai-product-photos ·
  https://nightjar.so/blog/how-to-make-ai-product-photos-look-real-checklist
- [lifehackedai] Failure modes of AI image generation (floating/contact-shadow/light-direction):
  https://lifehackedai.com/articles/ai-image-failure-modes/
- [rewarx] Keeping product scale/proportion in AI lifestyle scenes (reference objects, 18% cart-abandon):
  https://www.rewarx.com/blogs/keep-product-exact-scale-and-proportions-in-ai-lifestyle-scenes
- [developers.googleblog] Introducing Gemini 2.5 Flash Image (multi-image blend, car-into-landscape example):
  https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/
- [ai.google.dev] Gemini image API docs (no bg/object role param; no quantified fidelity threshold):
  https://ai.google.dev/gemini-api/docs/image-understanding
- [apatero / fal.ai] IC-Light V2 relighting (post-pass, ~$0.20/img):
  https://apatero.com/blog/ic-light-v2-flux-complete-relighting-guide-2025 ·
  https://fal.ai/models/fal-ai/iclight-v2 · https://github.com/lllyasviel/IC-Light
- [arxiv] Unconstrained Generative Object Compositing (bbox/scale, research-phase):
  https://arxiv.org/html/2409.04559v1

Gap named: sources are practitioner blogs + vendor docs + one arXiv paper — no
peer-reviewed benchmark on *mineral/translucent* subjects specifically; the
translucency angle (flint is semi-translucent, waxy) is uncovered by the
literature and must be settled in the live test.

### What needs a live test to confirm

1. Does gemini-3.1-flash-image keep the room **pixel-unchanged** when handed it as
   "Image 1 = fixed background"? (If not → mask/inpaint path.)
2. Does the **decoupling wording** (D1c) actually preserve the flint's cool
   colour while matching a warm room? Run flint into a warm-lamp living room.
3. Does the model **cast a correct-direction shadow** from a text light-direction
   hint, or does it need the pre-segmented cut-out + explicit coordinate?
4. Is **pre-segmentation** (cut-out PNG) materially better than the white-bg JPG?
   Cheap A/B.
5. **True-scale honoring:** does injecting cm + relatable-object + surface actually
   produce a modest, correctly-sized stone, or does the model still hero-size it?
   This is the make-or-break realism test.
6. Score every arm with the §F rubric.
