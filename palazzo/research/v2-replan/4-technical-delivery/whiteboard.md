# Technical Delivery — v2 Replan
_Palazzo Aventino virtual tour · technical architecture whiteboard_

---

## Top — the click

**Replace Google StreetViewPanorama with Photo Sphere Viewer v5 (PSV) and its VirtualTour plugin.** Drop the Google Maps JS dependency entirely. Wire eight `VirtualTourPlugin` nodes — one per room — each pointing to a hosted equirectangular JPEG or WebP (4K: 8192 × 4096 px, ≤ 4 MB each). Serve all panoramas as static files from the same Vercel deployment (no separate bucket needed at this scale), with `Cache-Control: public, max-age=31536000, immutable` headers via `vercel.json`. Lazy-load rooms 3–8 on demand; preload the next room when a user hovers a link arrow. The current ROOMS[] data model becomes a flat JS/JSON array of PSV node objects with an added `panorama` URL field. The rest of the chrome (intro, caption card, index, closing) stays unchanged: pure HTML/CSS, zero framework.

---

## Middle — the body

### 1. Engine comparison

| Criterion | Google StreetViewPanorama (v1) | **Photo Sphere Viewer v5** | Pannellum 2.5.7 | Marzipano |
|---|---|---|---|---|
| Equirectangular single-file | Yes (with panoProvider hack) | **Native** | **Native** | Native |
| Equirectangular tiled (lazy zoom) | No | **Yes (equirectangular-tiles adapter)** | Via multiresolution cube-map conversion | Yes (native, primary use case) |
| Hotspot / room-to-room links | Via panoProvider links[] | **VirtualTourPlugin — node → link graph, manual yaw/pitch or GPS** | JSON scene config, hotspot type "scene" | Hotspot API |
| Drag/look + zoom UX | Google's polished native chrome | **Three.js WebGL, smooth, configurable inertia** | WebGL, lighter feel | WebGL, smooth |
| Mobile perf | Keys referrer-locked → breaks on localhost/custom domain | **Gyroscope, VR, touch — all first-class** | CSS fallback for no-WebGL; gyroscope limited | Touch/gyro good |
| Bundle size (gzip) | ~250 KB (Maps JS, stripped) | **~150 KB core + three.js; plugins add ~10–20 KB each** | **21 KB** (smallest) | ~100 KB |
| License | Proprietary + usage quota | **MIT** | MIT | Apache 2.0 — **ARCHIVED Apr 2026** |
| Maintenance | Google (but panoProvider API is legacy/fragile) | **Very active — TypeScript rewrite, plugin ecosystem** | Stable (v2.5.7, Feb 2026, security patches) | **Archived Apr 2026 — dead** |
| Key/referrer risk | Yes — entire experience blocked if key fails | **None** | None | None |
| Room preloading | No | **`preload: true` or per-link callback** | No native preload | No |
| Custom HTML in overlays | No | **Yes (markers plugin: HTML, images, video)** | Text/image only | Limited |
| Flat-photography cinematic path | Possible via background swap | **Yes — flat adapter or CSS transition layer beside viewer** | No | No |

**Verdict: PSV v5.** Pannellum would be the minimum-viable option (21 KB), but PSV's VirtualTourPlugin maps 1:1 to the room-graph model, preloading is built-in, and its markers plugin supports the luxury overlay aesthetic. Marzipano is disqualified — archived April 2026.

**Why not stay on Google StreetViewPanorama:** The panoProvider single-tile approach is documented but legacy; Google's own docs recommend tiled implementations. More critically, the entire experience is gated on a referrer-locked API key — it fails silently on localhost, on any non-whitelisted domain, and whenever the quota is exhausted. That fragility is incompatible with a pitch asset.

**Flat-photography cinematic path (if chosen instead of 360°):** Replace `<div id="pano">` with a `<div id="stage">` that crossfades full-bleed `<img>` or `<video>` elements using CSS transitions. No viewer library needed. Navigation arrows and the caption card stay identical. Pros: maximum image quality, zero WebGL risk, works everywhere. Cons: no drag-look immersion. This path is viable and should be kept as a toggle in the config (`ROOM.type: "flat" | "360"`).

---

### 2. Asset delivery

#### Format and resolution targets

| Use case | Resolution | Format | Target size | Notes |
|---|---|---|---|---|
| Mobile preview / fast LCP | 4096 × 2048 | JPEG q75 or WebP q75 | ≤ 1.5 MB | Served first; swap on hover |
| Desktop full quality | 8192 × 4096 | JPEG q80 or WebP q80 | ≤ 4 MB | Lazy-loaded on room enter |
| Tiled (if needed) | 8192 × 4096 base | WebP tiles (512×512) | ≤ 3 MB total | PSV equirectangular-tiles adapter; only if 8K single-tile stalls |

**Format recommendation: WebP primary, JPEG fallback.**
- WebP: 25–34% smaller than JPEG at equivalent perceived quality; supported by all modern browsers (Safari 14+, Chrome, Firefox, Edge).
- AVIF: 20–25% smaller than WebP but encodes 5–10x slower, decodes ~2x slower, and has a browser max-resolution cap of ~8K. Avoid for 8K panoramas — encode time and decode latency outweigh the size gain.
- Serve pre-encoded WebP directly (the viewer loads them via `<img>` → GPU texture); Vercel's image optimization pipeline is framework-coupled (Next.js/Nuxt/Astro `Image` component) and does not intercept plain `<img>` fetches. For a plain static site, pre-encode assets offline.

#### Tiling decision
Single-tile 8K WebP (≤ 4 MB) is acceptable on desktop broadband and 5G. Tiling is warranted only if:
- AI-generated panoramas exceed 8K (unlikely for v2), or
- Analytics show >30% of sessions on 3G/slow-4G.

PSV's `EquirectangularTilesAdapter` supports a simple `{ width, cols, rows, baseUrl, tileUrl }` config — it can be added later without changing the room data model.

#### Lazy-loading strategy
```
Room 1 (Facade):      preload at intro screen (hidden prefetch link)
Room N:               load on goTo(N)
Room N+1:             preload when user hovers the "Next →" link arrow
                      (PSV preload callback: (node, link) => link.nodeId === nextId)
```

#### CDN and cache headers
Vercel serves static assets from its global CDN (126+ PoPs) automatically. Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/panos/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```
Store panoramas in `/public/panos/<room-id>.[webp|jpg]`. Immutable + content-hashed filenames (e.g. `cortile-v2.webp`) allow cache-busting on asset update.

#### LCP target
- LCP element: the first panorama texture (Room 1 / Facade). Target ≤ 2.5 s on 4G (10 Mbps). At 1.5 MB / 10 Mbps ≈ 1.2 s transfer + ~0.4 s GPU upload → feasible.
- Add `<link rel="preload" as="image" href="/panos/facade.webp">` in `<head>`.

---

### 3. Room data model (v2)

The existing `ROOMS[]` array is extended minimally. Each room object becomes a PSV `VirtualTourPlugin` node:

```js
// config/rooms.js  (drop-in replacement for the ROOMS[] inline object)
export const ROOMS = [
  null, // index 0 = intro
  {
    // ---- identity (unchanged from v1) ----
    idx: 1,
    id: "facade",
    exterior: true,
    it: "La Facciata",
    en: "The Façade",
    desc: "A seventeenth-century travertine front …",
    tone: { sky:"#cdbfa6", base:"#b6a88c", col:"#d8ccb4", floor:"#8c7e69", accent:"#9c6b4d" },

    // ---- PSV VirtualTourPlugin node fields ----
    panorama: "/panos/facade.webp",      // null → procedural placeholder (v1 behaviour preserved)
    panoramaFallback: "/panos/facade.jpg", // served if WebP decode fails (rare)
    type: "360",                         // "360" | "flat" — selects render path
    thumbnail: "/panos/facade-thumb.webp", // 400×200, for index menu hover preview

    // PSV links (room-to-room arrows in the viewer)
    links: [
      { nodeId: "cortile", position: { yaw: "90deg", pitch: "0deg" } }
    ],

    // Optional: markers (text/HTML labels floating in the pano)
    markers: [
      // { id: "portal", position: { yaw: "0deg", pitch: "-5deg" }, html: "<span>…</span>" }
    ],
  },
  // … rooms 2–8 follow the same shape …
];
```

**Key design decisions:**
- `panorama: null` triggers the existing procedural `makePano()` fallback — no regression during asset build-out.
- `type: "flat"` switches the render path to a CSS-crossfade fullscreen image; the same chrome (caption, index, topbar) drives it.
- `links[]` replaces the v1 panoProvider `links[]` array — same concept, PSV's field names.
- `thumbnail` is optional; used by the index panel for hover previews (PSV gallery plugin or custom).

**How AI-generated assets drop in:** Drop `cortile.webp` into `/public/panos/`, set `panorama: "/panos/cortile.webp"`, redeploy. Zero code changes.

#### Graceful fallback chain
```
1. PSV loads room.panorama (WebP)
   → on error: loads room.panoramaFallback (JPEG)
   → on error: calls makePano(room) → procedural canvas data-URL
2. If PSV/WebGL itself fails: existing #fallback div renders the procedural canvas as a flat background-image (v1 behavior unchanged)
3. No external key dependency — no silent auth failure.
```

---

## Bottom — the open ends

**Decisions for the human (unresolved):**

1. **360° vs flat-photography cinematic** — the engine choice above covers both, but the content team needs to decide before asset production begins. 360° requires equirectangular output from the AI pipeline; flat requires only high-res stills. Mixed (some rooms 360°, some flat) is supported by the `type` field per room.

2. **Tiling at v2 launch?** Single-tile 8K WebP is simpler and sufficient for ≤ 10 Mbps connections. If the AI image pipeline outputs native 8K+ or if analytics confirm mobile-heavy traffic, switch to PSV's equirectangular-tiles adapter. Defer until first real-user data.

3. **Asset storage location** — Vercel static (`/public/panos/`) works for ≤ ~1 GB total (8 rooms × 4 MB + thumbs). If the imagery pipeline iterates frequently or produces multiple resolution sets, a dedicated object-store bucket (Cloudflare R2, Vercel Blob, or AWS S3 + CloudFront) avoids Vercel's 1 GB build artifact cap and keeps the Git repo clean. Decision depends on how the imagery pipeline is owned.

4. **PSV bundle delivery** — PSV + VirtualTour + three.js via CDN (jsDelivr) keeps the repo zero-build. Alternatively, a small Vite build step bundles and tree-shakes for ~10–20% size reduction. The current zero-build static approach is simpler; add a build step only if bundle size becomes a measured problem.

5. **Pannellum as fallback engine?** If the team wants a safety net for no-WebGL (very old Android), Pannellum can render a static equirectangular without three.js. Not recommended for v2 — modern mobile WebGL coverage is >97%; double-engine complexity outweighs the gain.

6. **Google Maps key disposition** — if the facade room stays as real Street View for the exterior (it was the intent in v1), the Maps key and referrer restriction remain. Recommendation: drop real Street View entirely for v2; use an AI-generated or sourced equirectangular exterior pano, eliminating the key dependency.

**Friction / gaps noted:**

- PSV bundle sizes (core + three.js + virtual-tour plugin) could not be confirmed from Bundlephobia (403 during research); the ~150 KB gzip estimate comes from secondary sources. Verify: `npx bundlephobia @photo-sphere-viewer/core` before committing.
- Vercel's automatic image optimization (WebP/AVIF on-the-fly) requires a framework `Image` component and is not available to plain static `<img>` fetches. Pre-encode WebP offline; do not rely on Vercel to transcode.
- PSV v5 uses ES modules — the current tour.js is a plain `"use strict"` IIFE. Integrating PSV via CDN ESM import or a `<script type="module">` shim is straightforward but requires adjusting `index.html` script loading order.
- Marzipano is archived (April 2026) — do not use it regardless of any prior references in research docs.

---

_Sources consulted:_
- Photo Sphere Viewer v5 docs: https://photo-sphere-viewer.js.org/guide/ · https://photo-sphere-viewer.js.org/plugins/virtual-tour.html
- Pannellum docs: https://pannellum.org/documentation/overview/
- Marzipano archived: https://github.com/google/marzipano (read-only as of Apr 2026)
- portalZINE comparison (2026): https://portalzine.de/open-source-virtual-tour-360-panorama-libraries-in-javascript-2026/
- Vercel CDN + image optimization: https://vercel.com/docs/image-optimization · https://vercel.com/docs/cdn
- AVIF vs WebP vs JPEG: https://imagic-ai.com/blog/avif-vs-webp-comparison
- Google StreetView custom pano docs: https://developers.google.com/maps/documentation/javascript/streetview
