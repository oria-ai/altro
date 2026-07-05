# Place-in-Space — Synthesis

R&D round: "upload a photo of your real space, place a Stones piece into it."
Four angles (compositing model / frontend UX / infra-cost / realism). Whiteboards
in the sibling folders. This is the cross-cut.

---

## The click

**Build it as a graft onto the existing `dream-it-home` feature, using the same
Gemini model in a two-image "edit" mode. Before writing the feature, run a
~1-hour live spike** — fire 3–4 real phone room-photos + a stone through Gemini
and eyeball the result — **because every angle independently flagged the same
single unknown: does Gemini keep the user's actual room intact while inserting the
stone?** That one question is the whole risk. Everything else is already answered
and already ~90% built in the repo.

## What all four angles agree on (convergence)

- **Model:** `gemini-3.1-flash-image` (the exact model `dream.js` already uses).
  It genuinely does two-image compositing now — pass the room as `inlineData` #1,
  the stone as #2, and an "edit this room, insert the attached stone, keep the
  room unchanged" prompt. Delta from `dream.js`: a second image, a rewritten
  prompt, and `aspectRatio` set to the room's ratio instead of `21:9`.
- **Reuse the whole spine:** R2 storage, Supabase `dreams` table (add a `kind`
  column + a new `placements/` prefix), `_budget.js` gate, rate-limiter, and the
  result/email/share/Offer UI all carry over.
- **Frontend:** fully-automatic placement + one *optional* tap, **zero new client
  libraries** (no three.js — output is a flat 2-D image, shown with a zero-dep
  before/after slider). One canvas pass does downscale + HEIC-normalization.
- **v1 is prompt-only** — no mask pipeline, no relight model up front. Keep
  mask-inpaint (Flux Fill) and IC-Light relight as *named, gated* fallbacks.

## The load-bearing tensions (dialectic — not averaged away)

1. **Room fidelity: Gemini-approximate vs mask-exact.** Gemini re-renders the
   *whole* frame — "keep the room unchanged" is learned behavior, not a pixel
   copy, and the public API has no mask input. So the room comes back *plausibly
   similar, not pixel-exact*. For a "see it in **MY** room" promise that matters
   more than it did for the fantasy pano. → **The spike resolves this empirically.**
   If drift is bad, escalate to tier-C mask inpaint (needs a user tap = a mask).

2. **Realism inverts the dream prompt.** `dream.js` deliberately makes the stone a
   large, sharp, dead-center hero. For a real room that reads as **fake** — a
   ~15 cm stone across a room is only ~3–7% of frame width. The prompt must be
   *rewritten*, not copied: true scale, a contact shadow whose direction is read
   from the *room's* light (not the stone's white-bg studio photo), identity-lock
   on hue/banding/shape. Assets already in repo: `manifest.json` (real cm dims),
   `meta.json` (`distinctive_features` = ready-made preserve-checklist).

3. **Cost estimate is quietly wrong (affects the *current* feature too).** A 2K
   Gemini image is **~$0.10/gen**, not the `$0.06` `_budget.js` assumes
   (`DEFAULT_COST`). Bump `costPerDreamUsd` to ~0.11. The budget *machinery* fits
   fine; only the constant is stale.

## Next action (de-risk before build)

Run the spike: a throwaway Node script (mirror `dream.js`'s `generatePano`) that
sends room+stone+edit-prompt to Gemini for 3–4 real room photos, writes the
outputs to disk. Judge: (i) is it still my room? (ii) is the stone's banding
faithful? (iii) does it sit at believable scale with a real shadow? Outcome picks
tier B (ship) vs tier C (add masking) and finalizes the prompt scaffold.

## Decisions for Oria (z026 shape)

- **D-fidelity — how exact must the room be?** Options: (B) Gemini one-shot,
  room approximate / (C) mask inpaint, room pixel-exact. **Lean: B, gated on the
  spike.** Price: B = one Gemini call (~$0.10); C adds a mask step + second model.
  Risk: if drift kills the "my room" magic, B is worse than useless — hence the
  spike gates the ship.
- **D-placement — auto vs tap?** **Lean: auto for v1** (zero friction); a tap is
  the upgrade path and also unlocks C's mask.
- **D-vendor — Gemini-only vs hedge?** **Lean: Gemini-only v1**; delta from
  `dream.js` too small to justify a second integration before seeing Gemini fail.
  (fal FLUX Kontext ~$0.04 & ~5× faster is the noted alt if we ever move off.)
- **D-privacy — the uploaded room is the inside of someone's home (PII).** Don't
  persist the input photo (in-memory, discard). Add R2 expiry + a delete path for
  the output composite. Not really optional — a policy call to confirm.
