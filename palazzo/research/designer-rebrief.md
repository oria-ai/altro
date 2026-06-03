# Palazzo Aventino — Designer Rebrief (v3 redesign)

**To:** the designer who produced the original `design_handoff_palazzo_tour` zip.
**From:** the build side. **Date:** 2026-06-03.
**Repo:** https://github.com/oria-ai/palazzo-tour · **Live v2:** https://palazzo-tour.vercel.app

---

## 0. TL;DR — the click

The brief has **changed direction twice** since your zip. We're stopping the build to let
you redesign properly. Two big shifts you need to absorb:

1. **Aesthetic flip.** Forget quiet-luxury travertine restraint. The client now wants **the
   most opulent palace imaginable — Aladdin × Rome, an arab-roman fusion**: gilded arches,
   Moorish mosaics, muqarnas ceilings, marble, gold, silk, fountains, jewel tones. Maximalist.
2. **The palace is now generative & endless.** It is **not** a fixed set of 8 rooms. Rooms are
   **conjured on demand by AI as the visitor explores** (double-click to walk on → a new 360°
   room is generated live). Plus a top-level toggle between two worlds: **"Palazzo"** (opulent
   interior) and **"Fuori"** (the Roman exterior — gardens, courts, views over Rome).

Your job: design the **visual language + experience** for that. The imagery tech is solved
(AI-generated 360° panoramas); we need *your* eye on how it all looks and feels.

---

## 1. Where you left off

Your zip contained `README.md` (the spec) for a **quiet-luxury, Street-View-style** tour:
muted travertine, Cormorant Garamond + Jost, 8 named rooms (façade → courtyard → staircase →
salon → library → dining → master → terrace), drag-to-look, drag-and-drop image slots for
real photos. (Note: the zip shipped *only* the README — the `index.html`/`tour3d.js` it
described weren't in it, so we reconstructed from the spec.)

## 2. What happened since (honest timeline)

1. **v1** — reconstructed your spec on Google Street View: a *real* Street View façade at an
   Aventine coordinate + **empty procedural placeholder interiors**. Client reaction:
   *"the palace itself is empty. very bad app."* → killed.
2. **R&D round** (see `research/v2-replan/SYNTHESIS.md`) — four parallel investigations
   concluded: fill the rooms with **AI-generated 360° panoramas**, **drop Google** for a
   dedicated 360 viewer, and present it as a **director-led cinematic** experience.
3. **v2** (currently live at the URL above) — 8 **AI-generated, cohesive quiet-luxury
   travertine rooms** on **Photo Sphere Viewer**. Genuinely beautiful; this is what's live now.
   Go look at it — the *chrome* (intro, caption cards, index, closing, typography) is the
   design language you'll evolve.
4. **The pivot** — client then asked for: (a) double-click navigation like Google Maps,
   (b) "build itself as you go" (generative, not pre-made), (c) top tabs **Palazzo / Fuori**,
   (d) **"the most rich palace ever seen, like in Aladdin, arab-roman."** That last one
   reverses the quiet-luxury direction.
5. We generated **3 opulent arab-roman style tests** and wired a working generative backend,
   then paused here to hand the look back to you.

## 3. The vision now — design against THIS

- **Aesthetic: opulent arab-roman ("Aladdin's palace").** Gilded horseshoe/ogee arches,
  intricate Moorish geometric tilework & mosaics, polychrome marble floors, gold leaf,
  carved muqarnas (honeycomb) ceilings, crystal lamps, silk drapery & cushions, marble
  fountains, jewel tones (lapis, emerald, ruby) against warm gold. **Maximalist, not minimal.**
- **The crux design challenge:** make maximalist opulence read **expensive and intentional,
  not gaudy or themed.** Richness with composition and restraint-of-palette, not clutter.
  (The earlier benchmark mantra was "restraint = price"; now translate that into "every gilded
  surface is deliberate," not "more is more.")
- **Two worlds, top tabs:** **Palazzo** = the opulent interior. **Fuori** = the Roman exterior
  (travertine, cypress, gardens, fountains, rooftops, the dome of St. Peter's). They should feel
  like one estate but two moods — design the *transition* and the tab control.
- **Generative & endless.** No fixed room count ("Senza fine"). The visitor **double-clicks to
  walk on**, and a new room is **generated live (~20–40s)**. **Design the wait** — the
  "conjuring the next hall…" moment must feel intentional and luxurious (a held breath, not a
  spinner). Design how a freshly-conjured room is *introduced* (its name, its caption).
- **Navigation:** double-click / tap-to-walk (Street-View feel), drag to look, scroll to zoom.
  No Google blue arrows. A subtle floor affordance or first-time hint is welcome.
- **Keep & evolve from v2:** the intro title moment, the translucent caption card, named rooms
  with **material-specific, feeling-led copy** (e.g. *"the smell of time"*, not square-footage),
  the private-viewing close (`viewings@nadaa.estate`, brand **NADAA — Private Estates**).
  Responsive (desktop + mobile). Typography currently Cormorant Garamond (display) + Jost (UI) —
  evolve if a richer pairing serves the opulence.

## 4. Hard technical realities (design *within* these — they're solved, don't fight them)

- **Engine:** Photo Sphere Viewer v5 (equirectangular 360°). Rooms are full-sphere panoramas;
  the visitor looks around inside them.
- **Imagery:** AI-generated via **Blockade Labs Skybox AI**, output as true 2:1 equirectangular,
  served as **4K WebP (~300–700 KB)**. Cohesion across rooms is achieved by locking one
  **style + palette prompt-scaffold** — so the "house look" you choose is set once and every
  conjured room inherits it. This is why your style decision (below) matters: it defines the
  entire palace.
- **Generative latency is real:** ~20–40s per new room. Cached after first visit (Back is
  instant). This is *the* UX constraint to design around.
- **Chrome is HTML/CSS over the WebGL canvas** — you have full design freedom on every overlay
  (tabs, caption, intro, conjure moment, close). Same as your original prototype approach.

## 5. Assets & references

- **Live v2** (the current chrome & motion to evolve): https://palazzo-tour.vercel.app
- **Repo** (design tokens in `index.html`, room copy in `tour.js`, R&D in `research/`):
  https://github.com/oria-ai/palazzo-tour
- **3 opulent style options already generated** (pick one as the house look — see §6). They are
  the same "grand opulent arab-roman hall" prompt rendered in three engines:
  - **Option 1 — Photoreal:** believable, bright daylight opulence (reads like a real palace).
  - **Option 2 — Elegant Maximalism:** jewel-toned, domed, painterly fantasy (most "Aladdin").
  - **Option 3 — Cinematic Realism:** warm golden, dramatic, filmic (build-side favourite).
  (Ask for the three preview images — they're in the chat history and `img/raw/try_*.jpg`.)
- **Current design tokens (v2, quiet-luxury — your *starting* palette to push toward gold/jewel):**
  `--travertine #efe9df · --stone #ded5c6 · --ink #2f2a23 · --ochre #9c6b4d`. New direction wants
  a gilded/jewel layer on top (e.g. golds, lapis, deep reds).

## 6. Open decision (needs the client, surface it in your concepts)

**Which of the 3 style options is the house look?** This sets every room. Build-side lean:
**Option 3 (Cinematic Realism)** for drama, or **Option 2 (Elegant Maximalism)** for the most
literal Aladdin fantasy. Show your recommendation in the redesign.

## 7. What we'd love back from you

A **hi-fi redesign + interactive prototype** (your usual format), covering:
1. The **opulent arab-roman visual language** + a design-token set (palette, type, ornament,
   the gilded/mosaic motifs, how chrome sits over rich imagery without fighting it).
2. The **explorer experience**: the Palazzo/Fuori tab control, the double-click-to-walk model,
   and especially the **"conjuring" moment** (the 20–40s wait designed as a luxurious beat).
3. The **intro** and **private-viewing close**, re-skinned to the opulent direction.
4. **Mobile** treatment.
5. Your **style recommendation** (Option 1/2/3) and any room-naming / copy voice for an
   *endless* palace (we can't pre-name 8 rooms anymore — propose a system).

## 8. Lessons (so we don't repeat them)

- **Never ship empty/placeholder rooms.** The "empty palace" was the original failure. Imagery
  is the product — design assumes every room is full and beautiful.
- **Validate the look early.** We now generate a test image before committing a whole set; lean
  on that — propose, we'll render it, you react.
- **"Street View feel" = immersive move-through**, not literal Google chrome. Deliver the feeling
  by your own means.
- **Opulence must feel composed, not cluttered.** That's the whole design bet this round.
