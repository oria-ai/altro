# Palazzo Aventino — A Private Tour

An immersive 360° real-estate tour for an invented luxury Roman palazzo on the Aventine Hill.
Quiet-luxury aesthetic; responsive. Built as a static site.

**Engine:** Google `StreetViewPanorama` (Google's real viewer — drag to look, scroll to zoom,
ground arrows to walk). Content path **A+B**:

- **La Facciata (room 1)** tries **real Google Street View** at an Aventine coordinate; falls
  back to a placeholder panorama if there's no coverage.
- **Rooms 2–8** are **custom equirectangular panoramas** served via `panoProvider`, linked so
  Google's native ground arrows walk between them. Procedural stone placeholders stand in until
  real 360° photos are supplied.

The experience degrades gracefully: if the key is unauthorised or Maps fails to load, a fallback
layer shows the same placeholder imagery and the chrome stays navigable.

## Files

| File | Role |
|---|---|
| `index.html` | Design system (CSS custom properties) + all chrome: intro, top bar, caption, index, closing. |
| `tour.js` | Viewer engine, room data (`ROOMS[]`), navigation, fallback. |
| `config.js` | Holds `window.GMAPS_KEY`. **Gitignored** — regenerated at build from the env var. |
| `config.js.template` + `build.sh` | Key-injection: `build.sh` substitutes `GOOGLE_MAPS_API_KEY` into `config.js`. |
| `vercel.json` | `buildCommand: sh build.sh`, static output. |

## The Maps key

- One key: **Google Maps Platform** with **Maps JavaScript API** enabled, billing on.
- It's a **client-side** key (it ships to the browser). Security = **HTTP-referrer restriction**
  (`https://*.vercel.app/*` + any custom domain) and **API restriction** to Maps JavaScript API.
- Stored in **Doppler** (`GOOGLE_MAPS_API_KEY`), synced to Vercel's build env. `build.sh` writes it
  into `config.js` at build time. The key is **never committed**.

> Because the key is referrer-locked to `*.vercel.app`, the live Google viewer only works on the
> Vercel deploy — not on localhost. Add any custom domain to the key's referrer list before using it there.

## Deploy

```bash
vercel login
vercel link                                    # project "palazzo-tour"
vercel env add GOOGLE_MAPS_API_KEY production   # or via the Doppler → Vercel integration
vercel deploy --prod
```

Connecting this repo to Vercel gives preview deploys per PR and production on `main`.

## Content ownership

Everything editable lives in `tour.js` → `ROOMS[]`:

- **Copy / stats / brand:** room `it`/`en`/`desc` strings; intro stats and closing details in `index.html`.
- **Real 360° photos:** set a room's `pano` field to an **equirectangular image URL** — it replaces
  the procedural placeholder automatically, no engine changes.
- **Tour order / room graph:** the `ROOMS[]` order; links between interior rooms are derived from it.

## Local verification

`config.js` is gitignored; for local structural testing it holds the key, but the Google viewer
won't authorise off `*.vercel.app` — local testing exercises the chrome/navigation via the fallback
path only. The Google viewer is validated on the deploy.
