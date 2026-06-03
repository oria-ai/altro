# ♛ Royal Poker

Offline single-player **Texas Hold'em** vs. AI opponents. Play money only — no
server, no real-money transactions. Built as a plain HTML/CSS/ES-module web app,
intended to be wrapped into an **Android APK** with Capacitor.

> The "Get Chips" store is intentionally a *simulated* purchase flow: it looks
> like a real in-app purchase but charges nothing and credits chips for free.

## Run

```bash
npm run serve            # static server on :8799  (or: python3 -m http.server 8799)
# open http://localhost:8799/index.html in a portrait mobile viewport
```

## Test

```bash
npm test                 # engine: hand evaluator (15) + 100-table simulation
npm run smoke            # headless browser walkthrough of the full UI loop
```

## Layout

| Path | What |
|---|---|
| `src/engine/` | pure game logic — cards, 7-card evaluator, hold'em state machine, AI bots |
| `src/ui/` | screens + rendering (`main`, `table`, `store`, `cards-render`, `storage`, `style.css`) |
| `assets/` | art drop zone (cards / chips / avatars / brand) |
| `tools/smoke.mjs` | Playwright headless smoke test |

## For designers

See **[DESIGN_HANDOFF.md](./DESIGN_HANDOFF.md)** — design tokens, component map,
constraints, and what's placeholder vs. final. The visual layer is ~95% in
`src/ui/style.css`; the game logic does not need to be touched.

## Status

- ✅ Engine (evaluator + side-pots + all-ins) — tested, chip-conserving
- ✅ AI opponents with varied personalities
- ✅ Table UI: seats, dealing, action bar + bet slider, turn timer, showdown
- ✅ Economy: bankroll, buy-in/auto-rebuy, daily bonus, simulated store
- ⏳ APK packaging — needs Android `build-tools` + JDK 17/21 installed (only
  JDK 25 present). Capacitor wrap is the remaining dev step.
