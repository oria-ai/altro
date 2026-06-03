# Palazzo Aventino v2 — R&D Synthesis

Four parallel professors (imagery, experience, benchmark, technical). They converged
on one coherent product. The v1 failure ("the palace is empty") was not a bug — it was
a content+model failure, and all four angles point the same way.

## The cross-cutting verdict

**Fill the palace with AI-generated, cohesive 360° panoramas; drop Google entirely for a
dedicated 360 viewer; wrap it in a director-led cinematic experience with quiet-luxury
chrome.** Each angle reinforces the others:

| Angle | Verdict |
|---|---|
| **Imagery** | **Blockade Labs Skybox AI** (Model 3, 8K) — the *only* route that can *invent* a coherent palace. Cohesion via shared `seed` + `skybox_style_id` + `remix` chaining off one anchor room. ~$20/mo, commercial license. Fallback: real CC-BY flat photos of Roman palazzi (Doria Pamphilj / Sailko). |
| **Experience** | **Director-led cinematic hybrid** — guided glide room→room (full-bleed, slow eased transitions, parallax, optional ambient sound, typographic narrative) + drag-to-look 360 per room. NOT literal Street View. v1 failed because literal drag-to-walk chrome made the visitor the camera operator of an empty box. |
| **Benchmark** | **Restraint = price.** Named rooms (not "Room 03"), material-specific copy ("travertine, the Roman stone par excellence"), feeling-not-features voice, best space first, close on a private-viewing invite. Never the words "luxury/exclusive/unique." The chrome IS the luxury. |
| **Technical** | **Drop Google Maps JS. Use Photo Sphere Viewer v5** (MIT, ~150KB, active) + VirtualTourPlugin — node/link graph maps directly onto `ROOMS[]`. Pre-encoded WebP (4K mobile ≤1.5MB / 8K desktop ≤4MB) on Vercel static. The referrer-locked Google key was v1's single biggest fragility — removing it enables local dev, custom domains, no quota. |

## What this means for what we already built

- The Google StreetViewPanorama engine, the referrer-locked key, the Doppler `GOOGLE_MAPS`
  secret, the `config.js` build injection — **all become unnecessary.** Cheap to have built,
  but v2 drops them. (Keeps the GitHub repo + Vercel project + deploy pipeline.)
- The `ROOMS[]` data model and the intro/caption/index/closing chrome **survive** — they map
  cleanly onto Photo Sphere Viewer's node/link model and the cinematic layer.

## Sequencing insight (de-risks the whole rebuild)

The **engine swap + cinematic chrome + room data model are imagery-independent.** They can be
built now; the imagery drops in last via each room's `panorama` field. So the imagery decision
does **not** block the rebuild — we build the shell immediately and slot imagery in when chosen.

## Decisions for the human (z026 shape)

### D1 — Imagery route *(the one decision that needs you)*
- **Options:** **(A)** AI-generated 360° via Skybox AI — needs a signup (~$20/mo) + API key (or you generate in their UI); **(B)** real public-domain flat photos of actual Roman palazzi, cinematic (no 360 free-look) — free, I can start sourcing now, attribution shown; **(C)** A for hero rooms + B elsewhere.
- **Lean:** **A.** The brief literally said "invent a beautiful one" — only AI-gen invents a *cohesive* palace, and it preserves the 360 free-look the client associates with "Street View."
- **Why:** B uses photos of *other* real palaces (not "invented"), requires visible attribution, and forecloses 360. A is the on-brief answer.
- **Price:** A = ~$20 + ~1–2h generation/curation + your signup. B = $0, I start today, but it's a different (still beautiful) product.
- **Risk:** A — Skybox quality variance; their ToS PDF 404'd (capture at purchase). B — attribution clutter; "not our palace."
- **De-risk:** regardless of A/B, I start the imagery-independent rebuild now.

### D2 — Drop Google, switch to Photo Sphere Viewer
- **Lean:** Yes. **Price:** ~half-day viewer-layer rebuild. **Risk:** low (mature MIT lib). **Upside:** kills the key fragility, local dev works, no quota.

### D3 — Manage the "Street View" expectation
- **Lean:** Deliver the *feel* (drag-to-look + move-through) without Google's blue-arrow chrome; pitch as "directed immersion." **Risk:** client wanted literal Street View — set expectation early.

Whiteboards: `1-imagery-sourcing/` · `2-experience-model/` · `3-benchmark/` · `4-technical-delivery/`
