# Imagery Sourcing — Palazzo Aventino v2 (filling the eight rooms)

_Professor: Imagery Sourcing. Charter: rank concrete routes to fill 8 invented-palazzo
rooms with beautiful, legally-usable, web-deliverable imagery + a hand-off pipeline.
All prices/licenses fetched live June 2026 — sources inline._

---

## Top — the click

**Generate all eight rooms as true 2:1 equirectangular 360° panoramas with Blockade Labs'
Skybox AI (Model 3, 8K), driven through its API with a locked `seed` + a shared
`skybox_style_id` + room-to-room `remix_imagine_id` chaining.** This is the only route
that can _invent_ a coherent, never-existed palazzo — the exact brief ("invent a beautiful
one for me") — while outputting natively the one thing the engine already eats: a single
2:1 equirectangular image URL per room (`room.pano`, consumed verbatim by
`getTileUrl`). It keeps the Google-Street-View drag-to-look / click-to-walk feel intact
because the rooms stay real 360° panoramas, not flat photos. Licensing is clean and
commercial on every paid tier ($20/mo Essential is enough). The whole 8-room set is a
~$20 month and roughly an afternoon of prompt iteration. **Fallback: Route C** — curated
CC-BY flat photography of real Roman palazzi (Doria Pamphilj et al.) re-cut into a
cinematic non-360 presentation — if AI cohesion/quality fails the luxury bar. Route B
(scavenged CC0/CC-BY real 360s) is the weakest fit and is demoted to a texture/HDRI
source, not a primary path.

---

## Middle — the body

### How the engine consumes imagery (constraint that decides everything)

`tour.js` → `panoProvider()` builds a Google `StreetViewPanorama` custom tile where
`getTileUrl` returns **one image** sized `PW×PH = 2048×1024` (2:1). `room.pano` is the
single swap point: _"set a room's `pano` field to an equirectangular image URL — it
replaces the procedural placeholder automatically, no engine changes"_ (README). So the
deliverable per room is exactly **one true equirectangular 2:1 JPG/PNG**, rehosted in the
repo (`/img/<room>.jpg`) and referenced by URL. Anything that isn't natively equirectangular
(flat photos, cropped HDRIs) either needs conversion or a change to the presentation model.
This is why 360-native routes (A, B) plug in for free and the flat route (C) needs an
engine fork.

---

### Route A — AI-generated equirectangular 360° (Skybox AI / Blockade Labs) ★ RECOMMENDED

**What it outputs:** true 360° equirectangular skyboxes. Model 3 → **8K** equirectangular;
Model 4 → 4K. Output is a hosted image URL (and HDR/depth on higher tiers). Native 2:1 —
drops straight into `room.pano`.
Source: <https://api-documentation.blockadelabs.com/api/skybox.html>, <https://www.blockadelabs.com/>

**Cost (live, blockadelabs.com/membership):**
- Free trial: 5 generations, **preview only, no export** → useless for delivery.
- **Essential $20/mo** (annual $24/mo… i.e. $240/yr): 100 credits/mo, 8K export, *limited* API.
- Standard $48/mo: 300 credits, 8K, **no API**.
- Business $112/mo (annual $140/mo): 500 credits, 16K, **full API**.
Credit burn per generation (from API docs): **Model 3 = 1 credit** (~20s), Model 4 Standard
= 3 credits, Model 4 Enhanced = 6 credits. So 8 rooms on Model 3 = **8 credits**; even at
~5 iterations/room that's ~40 credits — comfortably inside one **$20 Essential** month.
Source: <https://skybox.blockadelabs.com/membership>

**Commercial license:** "All plans include full commercial licensing" with "clear IP
ownership — your creations, your rights, no hidden restrictions or usage limitations"
(blockadelabs.com). Applies to all paid tiers. **Friction:** the homepage marketing line is
clear; I could not load the formal ToS PDF (FAQ URL 404'd) — see Bottom. Treat $20 Essential
as commercially licensed but have the build team screenshot the ToS at purchase.

**API availability:** `POST` generate with `skybox_style_id`, `prompt`, `negative_text`,
`seed` (1–4294967295 to freeze), `remix_imagine_id`, `control_image` (+ `control_model:"remix"`),
`enhance_prompt`, `horizon_shift`, `webhook_url`. Style list via `GET /api/v1/skybox/styles`.
Note Essential is "limited API"; the UI alone (Standard/Business not required) can also do
seed + remix manually if API tier is a blocker. Source: API docs above.

**THE COHESION PROBLEM (8 rooms → 1 palace) — pressure-tested:** this is the real risk and
Skybox gives three stackable levers:
1. **Lock `skybox_style_id`** — one realistic-architecture style across all 8 calls fixes the
   render "look" (lens, material feel, light model).
2. **Freeze `seed`** to one value across all rooms — same generator latent, so palette/grain/
   light temperature stay siblings rather than strangers.
3. **`remix_imagine_id` chaining** — generate Room 1 (façade or salon as the "anchor"), then
   generate every other room as a _remix of that anchor_; the docs state remix "keeps the
   shape/structure while applying new styling and colors" and carries the parent's aesthetic.
   Even stronger: feed a hand-built **`control_image`** (a 2:1 equirectangular sketch of the
   room's geometry) so each room has the right architecture but inherits the anchor's palette.
4. **Prompt scaffolding** — a fixed prefix/suffix block on every prompt:
   `"interior of a 17th-century Roman palazzo on the Aventine Hill, quiet-luxury, muted
   travertine and warm stone, restrained, warm neutral daylight, [ROOM-SPECIFIC], photoreal,
   no people, no text"` + a shared `negative_text` (`"oversaturated, neon, modern, fisheye
   distortion, watermark, people, text"`). The fixed palette words ("travertine", "warm
   neutral") are the palette lock; the index.html tokens (`--travertine #efe9df`,
   `--stone #ded5c6`, `--ochre #9c6b4d`) are the literal swatches to name in-prompt.

**Quality ceiling:** high for "invented atmospheric interior" — 8K is more than the 2048-px
tile needs (downscale on rehost). The known weak spots of AI 360s are straight-line geometry
(columns bowing), repeated/garbled detail at the poles (ceiling fresco, floor), and text on
spines/paintings. For the library's "walnut shelving" and the salon's "frescoed vault" expect
to cherry-pick across iterations. Mitigated by control_image + curation, not eliminated.

**Effort:** ~half a day. Sign up → pull style list → write the prompt scaffold → generate
anchor → remix 7 → curate → downscale to 2048×1024 JPG → drop in `/img/`. No engine change.

**Licensing risk for a commercial pitch:** **low** — generated, self-owned, no third-party
rights, no attribution. (Residual: generic AI-IP uncertainty, but for a private pitch deck
this is negligible and far below using a real photographed property.)

**Plug-in:** `room.pano = "/img/salone.jpg"` per room. Zero engine work. Perfect fit.

---

### Route B — Real CC0 / public-domain 360° interior panoramas (scavenged) — DEMOTED

**What actually exists:**
- **Poly Haven indoor HDRIs** (CC0, polyhaven.com/license) — genuinely free, commercial, no
  attribution. The catalogue is mostly studios/garages/abandoned-industrial, BUT it includes
  **"Ballroom"** — a Victorian ballroom, "warm chandelier glow, soft daylight from tall
  windows," tiled floor, piano; tags `victorian, window, piano, chandelier`. Downloadable as
  4K/8K/16K EXR/HDR **and an 8K tonemapped JPG (5.09 MB)** — the JPG is the web-deliverable
  one. True 2:1 equirectangular. URL pattern:
  `https://dl.polyhaven.org/file/ph-assets/HDRIs/.../ballroom_*.{exr,hdr,jpg}`.
  Source: <https://polyhaven.com/a/ballroom>, <https://polyhaven.com/hdris/indoor>
  → Realistically Poly Haven gives **one** plausibly-palatial room (the Ballroom → could be the
  Salone or Sala da Ballo). Not eight. Lighting (HDRI) is great; it's a single isolated room
  with a modern-ish floor, won't form a coherent palace with seven siblings.
- **Wikimedia Commons "360° panoramas with equirectangular projection"** (542 files) — mostly
  European cathedrals/civic interiors (Soissons, Laon, Bourges, Brompton Oratory London,
  **Biblioteca Pública de Évora**). The Évora library is a real grand-library 360 that could
  stand in for `La Biblioteca`. But these are scattered, individually-licensed (mix of CC-BY /
  CC-BY-SA), and almost none are _Italian palazzo_ interiors — no coherent set.
  Source: <https://commons.wikimedia.org/wiki/Category:360%C2%B0_panoramas_with_equirectangular_projection>

**CORS / hosting reality — important:** Wikimedia **changed its hotlink behaviour between
Dec 2025–Mar 2026**; the old `upload.wikimedia.org/.../thumb/` pattern now risks hitting the
Varnish cache directly and getting rate-limited. The supported hotlink is
`Special:FilePath` / `Special:Redirect`. **Conclusion: do not hotlink — download and rehost
into `/img/`.** Poly Haven serves from `dl.polyhaven.org` / `cdn.polyhaven.com` with no stated
hotlink ban, but for a pitch you rehost anyway (stability > a live dependency).
Sources: <https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/technical>,
<https://polyhaven.com/our-api>

**Quality ceiling:** medium-high per individual asset (these are real, beautiful spaces) but
**low as a _set_** — you cannot assemble 8 Italian-palazzo rooms that read as one building.
**Cost:** $0. **Effort:** medium (hunt, verify each license individually, rehost). **Licensing
risk:** low-medium — CC0 (Poly Haven) is clean; Wikimedia CC-BY/CC-BY-SA needs per-asset
attribution and SA can be awkward in a commercial deck.
**Plug-in:** native 2:1, drops into `room.pano` like Route A. **Best use: not primary —
keep Poly Haven Ballroom/indoor HDRIs as a style/lighting reference for Route A, or as an
emergency single-room stopgap.**

---

### Route C — Curated public-domain / CC FLAT photography of real Roman palazzi — FALLBACK

**What exists (verified):** **Palazzo Doria Pamphilj (Rome) – Interiors** on Wikimedia Commons
is a rich, high-res set: Galleria Aldobrandini (1908×3356), **Galleria degli Specchi / Hall of
Mirrors** (3232×2304), Sala da Ballo (3080×2304), Sala dei Velluti (3228×2252), frescoed vault
allegory (4000×5877), Cappella di Carlo Fontana (3156×2272). Many shot by **"Sailko"** and
licensed **CC-BY-3.0** (verified on the Galleria degli Specchi file page — attribution required,
not CC0/PD). Palazzo Barberini, Colonna, Spada have categories too but I verified Doria Pamphilj
in depth.
Sources: <https://commons.wikimedia.org/wiki/Category:Palazzo_Doria_Pamphilj_(Rome)_-_Interiors>,
file-level license verified at the Galleria degli Specchi file page (CC-BY-3.0, author Sailko).

**Quality ceiling:** **highest absolute fidelity** — these are real 16th–17th c. Roman palace
interiors at 3–6 MP, exactly the reference fantasy the brief evokes. **But** it abandons the
Street-View 360 feel: flat photos = a cinematic slideshow / Ken-Burns presentation, an **engine
fork** (drop the `StreetViewPanorama`, build a flat lightbox/parallax viewer). **Cost:** $0.
**Effort:** high — engine rework + curate 8 cohesive rooms + attribution plumbing. **Licensing
risk:** medium — CC-BY-3.0 is commercial-OK but **requires visible attribution** (credit +
license link + "changes made"); for a discreet luxury pitch a visible "photo: Sailko / CC-BY"
credit is a minor aesthetic compromise. Also these are _identifiable real palaces_, which
slightly undercuts the "invented palazzo" fiction.
**Plug-in:** does NOT fit the current model — needs a new flat-image viewer. That's why it's the
fallback, not co-primary.

---

### Ranking

| Rank | Route | Fits "invent a beautiful one" | Cohesive as 1 palace | 360 SV-feel | Cost | Effort | Commercial-license risk | Engine change |
|---|---|---|---|---|---|---|---|---|
| **1** | **A — Skybox AI 360** | ★ purpose-built | ★ via seed+style+remix | ✅ native | ~$20 | low (½ day) | low (self-owned) | none |
| 2 | C — PD/CC flat palazzi | partial (real, not invented) | ★ (hand-curated) | ✗ flat | $0 | high | medium (CC-BY attribution) | yes (fork viewer) |
| 3 | B — scavenged real 360s | ✗ can't assemble a set | ✗ | ✅ native | $0 | medium | low–med | none |

### Exact pipeline for #1 (ship 8 rooms this week)

1. **Buy** Skybox AI **Essential ($20/mo)**; screenshot the commercial-license ToS at checkout.
2. `GET /api/v1/skybox/styles?model_version=3` → pick the most photoreal architectural style;
   record its `skybox_style_id`. Choose a fixed `seed` (e.g. 7000001) — reuse for all 8.
3. **Prompt scaffold** (store in a JSON the build team edits — mirrors `ROOMS[]`):
   - Fixed prefix: `interior of a 17th-century Roman palazzo on the Aventine Hill, quiet luxury,
     muted travertine #efe9df and warm stone, restrained, soft warm neutral daylight, photoreal, no people, no text —`
   - Per-room body from `ROOMS[].desc` (e.g. salone → `vaulted ceiling with a faded allegory of
     the seasons, piano-nobile reception room`).
   - Shared `negative_text`: `oversaturated, neon, modern furniture, fisheye distortion, watermark, signage, people, text, duplicated columns`.
4. **Anchor first:** generate Room 4 *Il Salone* (the signature room) on Model 3. Iterate prompt
   until the palette/light is the house style. Save its `imagine_id` as `ANCHOR`.
5. **Remix the other 7:** generate each remaining room with `remix_imagine_id = ANCHOR`, same
   `seed`, same `skybox_style_id`, per-room body text. For rooms needing specific geometry
   (scalone, cortile arcade) optionally pass a hand-sketched 2:1 `control_image` +
   `control_model:"remix"`.
6. **Curate:** request 2–4 variants/room (still <40 credits total); pick the one with cleanest
   poles (ceiling/floor) and least bowed verticals.
7. **Process:** download 8K JPG → downscale to **2048×1024** (matches `PW×PH`), strip metadata,
   `mozjpeg -quality 82` (~200–400 KB each) → commit to `/img/{facade,cortile,scalone,salone,
   biblioteca,pranzo,padronale,terrazza}.jpg`.
8. **Wire:** set each `ROOMS[i].pano = "img/<id>.jpg"` in `tour.js`. No other engine change;
   ground-arrow walking and fallback path already consume `room.pano`.
9. **Façade (room 1):** keep the existing real-Google-Street-View attempt; if you want the
   invented façade instead, generate it as an 8th-anchored room and set `exterior:false`-style
   handling, or leave SV as-is and use the AI façade only as the fallback `pano`.
10. **Deploy** to Vercel; verify on the `*.vercel.app` URL (Maps key is referrer-locked there).

---

## Bottom — the open ends

**Decisions for the human:**
1. **Invented vs. real.** Route A invents (matches the brief literally); Route C uses real Roman
   palaces (higher fidelity, but identifiable buildings + a flat presentation that drops the
   360 walk). If the client values "drag-to-look immersion" → A. If they value photographic
   realism over interactivity → C. **My call: A**, because the brief said "invent" and "Google-
   Street-View feel," and A is the only route satisfying both.
2. **API tier.** Essential is "limited API." If the limit blocks scripted remix-chaining, either
   (a) do seed+remix manually in the Skybox UI (no code), or (b) take Business ($112) for one
   month only. Cheapest viable path is UI-driven on Essential.
3. **AI-IP comfort.** Commercial license is asserted on the marketing/plan pages; I want the
   formal ToS confirmed (see friction). For a private pitch deck the risk is negligible.

**Friction / could-not-verify:**
- **Skybox formal ToS:** `blockadelabs.com/faq` returned **404**; pricing/membership and API
  pages rendered, but I'm relying on the plan-page "full commercial licensing / your rights"
  copy rather than the legal ToS document. Build team should capture the ToS at purchase.
- **JS-rendered pages:** polyhaven.com/hdris/indoor and the Wikimedia category page are
  client-rendered — WebFetch saw "0 results" on first pass. I recovered the data via the
  Poly Haven JSON API and the category file-list excerpt; the **Évora library** and several
  cathedral 360s are real but I did not individually license-verify each (Route B is demoted
  anyway).
- **Skybox output resolution discrepancy:** API docs say Model 3 = 8K / Model 4 = 4K; review
  sites and the plan page frame 8K/16K as a tier feature. Net: 8K on Model 3 is available at the
  $20 tier and is more than the 2048-px tile needs — not load-bearing, but confirm at generation.
- **Wikimedia hotlink change (Dec 2025–Mar 2026)** is reported via a secondary source + the
  official "Reusing content/technical" page; the upshot (rehost, don't hotlink) holds regardless
  and is the safe default for any route.
- **Poly Haven CORS:** no explicit CORS-header doc found; mooted because we rehost into the repo.

**Gaps not pursued (out of scope/time):** Google's own AI panorama tooling, Stable-Diffusion
panorama pipelines (e.g. self-hosted LDM3D / 360-aware LoRAs) — viable but require GPU infra and
more effort than Skybox for the same output; only worth it if Skybox licensing is rejected.
Archive.org and the Flickr Equirectangular pool were not deep-searched (Route B already demoted).
