# Experience / Interaction Model — Palazzo Aventino v2

## Top — the click

**Recommend a director-led cinematic core with optional free-look, NOT literal drag-to-walk Street View.**
Build the spine as a **guided cinematic sequence** — full-bleed imagery, slow choreographed transitions, Ken Burns / dolly motion, layered parallax depth, ambient sound, and typographic narrative that arrives room by room. At each room the visitor can *opt into* a **360° free-look** (drag-to-look) where we have a real or convincing equirectangular pano; where we only have flat photography, the same room plays as a cinematic still-in-motion panel. This is a **hybrid biased toward cinema**: the tour *moves the visitor* (so the palazzo always looks composed, full, and lit), and hands them control only as a reward, never as the default chore. The v1 failure was not "not enough Street View" — it was the opposite: literal Street-View chrome made the visitor the camera operator of an *empty box*, foregrounding control over thin content and turning every drag into a tour of emptiness. v2 inverts that: **the experience curates; the visitor savors.**

**Handling the "Street View" request:** treat it as a proxy for *immersive + I can move through it*, not a literal spec. Deliver the *feeling* — you glide room to room, you can look around — without literal Google chrome, blue arrows, or the "camera-operator" burden. In the pitch, name it: "Street-View immersion, directed like a film" — we keep drag-to-look (the part clients actually mean when they say Street View) and add cinematic motion + sound the client *can't* get from Street View. If the client insists on the literal blue-dot walk, offer free-look-on-demand inside each room as the concession; do not let click-to-walk arrows be the primary navigation, because they only flatter a fully-furnished, fully-real space and we cannot guarantee that across eight rooms.

---

## Middle — the body

### Why the three models land where they do

**1. True 360° walk-through (Street-View style).**
- **Delights when:** imagery is real, complete, and *furnished/staged*; the space rewards looking around (detail, light, materials); the visitor is in "I'm evaluating this property" mode and wants spatial truth. Evidence: buyers want layout comprehension — 51% of buyers cite wanting to understand the layout, and listings with interactive 3D tours report up to ~49% more qualified leads ([Pinnacle](https://www.pinnaclerealestatemarketing.com/real-estate-marketing-guides/matterport-vs-virtual-tours/)). Spatial control *is* the value.
- **Exposes thin content when:** rooms are empty, AI-generated with stitching seams, or inconsistent across the set. The moment you give someone a free camera in an empty room, the emptiness becomes the subject — exactly v1. Free navigation has nowhere to hide.
- **Demands of imagery:** seamless equirectangular panos per room, consistent lighting/white balance/exposure across all eight, no nadir/zenith artifacts, and ideally **virtual staging** (furniture) — staged 360s sell ~75% faster and at/above asking ([BoxBrownie](https://www.boxbrownie.com/360-virtual-staging)). This is the *highest* imagery bar of the three.

**2. Cinematic scrollytelling / parallax.**
- **Delights when:** atmosphere and finish lead the sale (exactly luxury) — "if the property sells on atmosphere, finish quality, or lifestyle appeal, a video/cinematic tour creates stronger emotional pull" ([Pinnacle](https://www.pinnaclerealestatemarketing.com/real-estate-marketing-guides/matterport-vs-virtual-tours/)). The director picks the best angle, the best light, the best crop; the visitor can never frame an ugly shot. Strong with **flat high-res photography** — Ken Burns, layered parallax, and pinned reveals manufacture depth and motion from stills. Award-winning property sites (e.g. "VILLA – 3D Immersive Property," AVATR Vision) lean on smooth parallax transitions and reactive UI to guide through interior detail ([Awwwards](https://www.awwwards.com/sites/villa-3d-immersive-property)).
- **Weakness:** not self-guided — the visitor "cannot walk through" ([Matterport via Pinnacle](https://www.pinnaclerealestatemarketing.com/real-estate-marketing-guides/matterport-vs-virtual-tours/)). Pure scrollytelling can feel like a *brochure*, not a *residence you could occupy*. Mitigate by punctuating with the free-look moments (model 1) where imagery allows.
- **Demands of imagery:** lowest bar — high-res flat stills are enough; even a handful of hero shots per room. Best fit if the imagery track returns "flat photography only."

**3. Hybrid (recommended).**
- **Guided auto-walk + manual look**, 360 where we have panos, cinematic transitions/sequences elsewhere. This is the only model that is **robust to all three imagery scenarios** and degrades gracefully *upward in quality* rather than downward into emptiness. It also reconciles the client: motion + look-around = the Street-View *feel*; direction + sound + pacing = the luxury the client actually wants.

### Conditioning on the imagery scenarios (the load-bearing matrix)

| Imagery we get | Primary model | Per-room interaction | Risk to manage |
|---|---|---|---|
| **Real 360° equirectangular panos (staged/furnished)** | Hybrid, lean into 360 | Cinematic *arrival* transition into the room, then **drag-to-look free-look** on demand; subtle auto-pan if idle | Cross-room consistency (white balance, exposure, height). Insist on staging. |
| **Flat high-res photography only** | Cinematic scrollytelling/parallax | Ken Burns + parallax layers + pinned typographic reveal per room; no free-look (don't fake a pano badly) | Don't let it feel like a brochure — use sound, pacing, and a guided "next room" glide to keep it a *journey* |
| **Mix (some panos, some flat)** | Hybrid as designed | 360 free-look on the rooms that have panos; cinematic panels on the rest. Keep the *transition grammar* identical so the seam is invisible | The set must feel like one tour, not two engines bolted together — unify transitions, type, sound, pacing |

**Critical:** the imagery track's answer doesn't change the *spine* (guided cinematic glide room→room with consistent chrome, type, sound). It only changes whether a given room *also* offers free-look. That keeps the build decoupled from the imagery decision — we can ship the spine now and light up 360 per-room as panos arrive (the existing `room.pano` swap-in pattern in `tour.js` already anticipates this).

### Pacing, transitions, sound, intro/closing

- **Pacing:** slow and deliberate. Luxury motion is "choreography, not a dance party" — animations slow, smooth, purposeful; "a hover too fast feels cheap; a smooth deliberate fade is control" ([IIAD](https://www.iiad.edu.in/the-circle/why-some-websites-just-feel-expensive/)). Target room-to-room transitions ~1.2–2.0s with `ease-in-out` (the existing `--ease: cubic-bezier(.22,.61,.36,1)` is a good base; lengthen durations from the current .5–.8s).
- **Transitions:** never hard cuts. Cross-dissolve or a slow push/dolly between rooms so the palazzo feels *continuous* — one residence, not eight slides. This is the single biggest "expensive vs cheap" lever at the interaction level.
- **Sound:** add a low, optional ambient bed (muted by default with a visible unmute, per autoplay norms) — distant Roman street hush at the façade, a fountain trickle in the cortile, room tone inside. "Ambient audio transforms a visual tour into a sensory experience" ([Revfine VR hotel tours](https://www.revfine.com/vr-hotel-tour/)). This is *free* perceived luxury that Street View structurally cannot offer — a concrete way to beat the literal request.
- **Intro:** hold the current strong cold-open (full-bleed hero, restrained serif title, stats, single "Step Inside" CTA) but let it *resolve into motion* — a slow push toward the façade on enter, not a jump cut. First impression sets the price tag.
- **Closing:** keep the "A Private Viewing / by appointment" register — it reads exclusive ("some residences are not listed; they are introduced"). Land it after a slow fade-up from the terrace (St. Peter's at dusk) — end on the strongest emotional frame.

### Mobile vs desktop

- **Desktop:** room for parallax layering, larger type, generous negative space (whitespace improves comprehension ~20% and signals exclusivity — [Manypixels](https://www.manypixels.co/blog/web-design/white-space)). Free-look via drag.
- **Mobile:** scroll *is* the native motion — scrollytelling maps perfectly to a thumb. Free-look via gyroscope/touch-drag where panos exist. Drop parallax depth (jank risk) for clean cross-fades; current mobile rule already hides `.cap-desc` — keep captions terse. Most luxury-listing traffic is mobile; the cinematic-scroll model is *more* robust on mobile than literal Street-View arrows, which are fiddly on touch.

### What feels expensive vs cheap (interaction level — the cheat sheet)

- **Expensive:** slow eased transitions; continuous motion between rooms; one serif + one sans (already have Cormorant Garamond + Jost); generous negative space; restraint in UI chrome; ambient sound; the system doing the work so the visitor only savors; a single, calm CTA per moment.
- **Cheap:** hard cuts; visible blue navigation arrows / Google chrome; fast hovers; the visitor stuck operating an empty camera; cluttered HUD; watermarked/placeholder content (literally the current `PLACEHOLDER 360°` text baked into panos); inconsistent imagery; jank/lag on transition.

---

## Bottom — the open ends

**Decision 1 — Primary model.**
- *Options:* (a) literal Street View walk; (b) pure cinematic scrollytelling; (c) **hybrid: cinematic spine + free-look on demand**.
- *Lean:* (c).
- *Why:* only (c) is robust to all imagery outcomes, reconciles the client's "Street View" proxy without betting the pitch on furnished real panos, and structurally prevents the v1 "empty box" failure by curating framing.
- *Risk:* a hybrid done lazily reads as two bolted-together engines. Mitigation: one transition grammar, one type system, one sound bed across all rooms regardless of per-room interaction.

**Decision 2 — How hard to push back on "literal Street View."**
- *Options:* (a) deliver literal Google StreetViewPanorama; (b) keep drag-to-look but drop Google chrome/arrows; (c) reframe in the pitch as "directed Street-View immersion."
- *Lean:* (b)+(c).
- *Why:* the client's real want is immersion + look-around + move-through; literal Google chrome actively cheapens a luxury pitch and only flatters guaranteed-real-furnished imagery we don't have.
- *Risk:* client is "emphatic." Mitigation: show, don't tell — a 20-second side-by-side of literal-arrows-in-empty-room vs cinematic-glide-with-sound will settle it. **Recommend producing that A/B as the pitch-internal artifact.**

**Decision 3 — 360 engine if we keep free-look.**
- *Options:* (a) stay on Google StreetViewPanorama (current); (b) lighter-weight WebGL pano viewer (krpano / Pannellum / three.js); (c) Marzipano.
- *Lean:* (b)/(c) — Google's chrome, key/referrer friction, and "real Street View at a coordinate" coupling are all liabilities for a *fictional* palazzo. A bare equirectangular WebGL viewer gives drag-to-look without Google branding or billing, runs on mobile, and removes the whole `gm_authFailure`/`*.vercel.app` fragility documented in the README. **Defer to the technical-delivery track** (folder 4) for the engine pick — flag raised.
- *Risk:* swapping engines is real work; but the current code already abstracts imagery behind `room.pano`, so the panel/look layer is replaceable.

**Gaps / friction / uncertainty:**
- Parallel tracks (imagery `1-`, benchmark `3-`, technical `4-`) are **empty** as of this writing — recommendations are conditioned on the imagery matrix above but not yet reconciled with what imagery actually returns. This whiteboard should be re-read against `1-imagery-sourcing/` once it lands.
- The "empty palace" complaint is **partly a content/staging problem, not only interaction** — even a perfect cinematic model over genuinely empty rooms will feel empty. Virtual staging (furniture) belongs in the imagery track; flag that the experience model *assumes* rooms read as inhabited (furnished or richly architectural). Surface this to whoever owns content.
- Sound autoplay is constrained by browser policy — ship muted-with-unmute; don't assume audio-on first paint.
- No conversion data specific to *fictional pitch* tours (all evidence is real-listing marketing); treat conversion stats as directional, not literal, for a one-shot pitch artifact whose goal is *wow in the room*, not lead-gen funnel metrics.
