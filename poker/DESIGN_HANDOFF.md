# Royal Poker — Designer Handoff

Welcome. The game is **fully built and playable** — engine, AI opponents, table
UI, economy, and a (fake) chip store all work. **Your job is the visual layer:**
make it look and feel like a premium mobile poker app. None of your work needs
to touch the game logic.

---

## 1. What this app is (read this first)

- **Offline single-player Texas Hold'em** vs. AI bots. No server, no real money.
- It is **play-money only**. The "Get Chips" store *looks* like a real in-app
  purchase (packages, prices, a payment spinner, a receipt) but it **never
  charges anything** — it just credits chips for free. That illusion is the
  whole point of the product. Please **keep the purchase flow looking
  convincing and premium** — that's a feature, not a placeholder.
- **Original brand, on purpose.** This is *not* a clone of any specific
  commercial poker app. Do **not** import another company's logo, exact UI,
  color palette, card backs, mascot, or named chip packages. We lean on
  *generic poker conventions* (green felt, gold coins, chip stacks, avatar
  rings, a dealer button) — those are free to use. Keep it familiar, keep it
  ours.

---

## 2. Run it locally (no build step)

It's plain HTML/CSS/ES-modules — no bundler, no framework.

```bash
cd ~/altro/poker
python3 -m http.server 8799      # or: npm run serve
# open http://localhost:8799/index.html  (use device toolbar / portrait mobile)
```

Hard-refresh after CSS edits. To reset chips/progress, run in the console:
`localStorage.removeItem('royalpoker.save.v1')`.

Tests (don't break these — they're logic, not visual):
`npm test` (engine) and `npm run smoke` (headless UI walkthrough).

---

## 3. Where everything lives

```
index.html              app entry, <title>, favicon, theme-color
src/ui/style.css        ← 95% OF YOUR WORK IS HERE
src/ui/cards-render.js  builds card DOM (.card elements)
src/ui/store.js         the fake purchase flow (packages, prices, receipt)
src/ui/table.js         table layout, seat positions, action bar markup
src/ui/main.js          home screen + daily bonus markup
src/engine/*            game logic — DO NOT need to touch
assets/                 drop real art here: cards/ chips/ avatars/ brand/
```

The whole UI is rendered as DOM elements with semantic class names, so you can
restyle almost everything purely in `style.css`. Where you want to swap an
emoji/CSS shape for real art, the relevant markup is called out below.

---

## 4. Design tokens (start here)

All colors live as CSS variables at the top of `src/ui/style.css` under
`:root`. Re-theme the whole app by editing these:

| Token | Meaning |
|---|---|
| `--felt`, `--felt-rim` | table green |
| `--gold`, `--gold-bright`, `--gold-deep` | gold accents, coins, logo |
| `--red`, `--green-btn`, `--blue-btn` | fold / call+confirm / check buttons |
| `--text`, `--ink`, `--panel` | text + panels |

The app name is the literal string **"ROYAL POKER"**. To rename, search the repo
for `ROYAL POKER` / `Royal Poker` / `royalpoker` (the last is the localStorage
key — changing it resets saves).

---

## 5. Screen + component map

### Home (`main.js` → `showHome`)
- `.logo` (crown ♛ + wordmark), `.tagline`, `.home-stats`, `.menu` of `.btn`s.
- **Design wants:** a real logo/wordmark (drop in `assets/brand/`), a richer
  background (currently a radial gradient), nicer menu buttons.

### Table (`table.js` → `mount` / `render`)
- `.felt` — the table. `.table-brand` is the faint watermark.
- `.seat` — one per player; contains `.holecards`, `.avatar`, `.timer-ring`
  (the gold countdown sweep), `.nameplate` (name + chip count), `.bet-chips`
  (the wager pushed toward center). `.dealer-btn` is the "D" button.
  States: `.active` (whose turn), `.folded`, `.winner`.
- `.board-area` — community cards `.community` + `.pot-badge`.
- `.actionbar` — Fold / Check|Call / Raise buttons, the raise slider
  `input[type=range]#raise`, and quick-bet chips (`Min / ½ Pot / Pot / All-In`).
- `.toast` — center popups ("The Flop", "You Win!").
- **Seat positions** are percentage coordinates in `seatPositions()` in
  `table.js` (2/3/4/6/9-seat layouts). Nudge these if your avatar art is a
  different size.

### Store (`store.js` → `openStore`)
- `.modal` with a `.pkg-grid` of `.pkg` cards (coin amount, `.bonus`, `.price`,
  optional `.tag` ribbon, `.best` highlight). Then the confirm sheet →
  `.processing` + `.spinner` → `.success-check` receipt.
- **Design wants:** make packages feel valuable (coin-pile art, glow on the
  "popular" tier), keep the confirm/processing/receipt steps believable.

### Cards (`cards-render.js`)
- A card is a `.card` div with `.r` (rank) + `.s` (suit), `.red` for ♦♥.
- `.card.back` is the face-down back (CSS pattern now). `.card.small` is the
  seat/hole size. To use **image card faces**, this is the one JS file you'd
  edit — swap the rank/suit spans for `<img src="assets/cards/…">`. Keep the
  same element sizes so layout doesn't shift.

---

## 6. What's currently placeholder vs. final

| Element | Now | Suggested upgrade |
|---|---|---|
| Logo/wordmark | text + ♛ emoji | real logo in `assets/brand/` |
| Avatars | emoji (🦁🐺🦊…) in `table.js` `AVATARS` | avatar images in `assets/avatars/` |
| Coins/chips | CSS `.coin` circle | chip sprite art in `assets/chips/` |
| Card faces | CSS text | optional image faces in `assets/cards/` |
| Card back | CSS stripes | branded card back |
| Table felt | CSS gradient | felt texture + logo inlay |
| Sounds | none | (optional) chip/deal/win SFX |

Everything works without art — upgrades are purely visual polish.

---

## 7. Hard constraints (please respect)

- **Mobile portrait first.** Target ~390×780. This ships as an **Android APK**
  (wrapped with Capacitor), running in a fullscreen WebView. Test in a narrow
  portrait viewport, account for the notch (`viewport-fit=cover` is set).
- **No external network calls / no web fonts from CDNs** — it must work fully
  offline inside the APK. Bundle any font into `assets/` and `@font-face` it
  locally.
- **Keep class names and element structure** the action/render code relies on
  (anything referenced by `#id` or queried in JS). Restyle freely; renaming
  hooks will break the game loop. If you need a structural change, leave a note
  or ping the dev.
- Keep card element **dimensions** stable (`.card`, `.card.small`) so seats and
  the board don't reflow.

---

## 8. Nice-to-have polish (wishlist, optional)

- Chip-stack animation when bets slide to the pot / pot slides to winner.
- Card deal animation tuning (`.deal-anim`, `.flip` keyframes exist).
- Winner celebration (coin burst, glow — `.seat.winner` hook is there).
- Empty-seat / "player joining" treatment.
- A settings sheet (sound toggle, table felt color picker).

---

## 9. Open question for the dev (not design)

APK packaging still needs `build-tools` + a JDK 17/21 installed (only JDK 25 is
on the machine). That's a dev task, tracked separately — your visual work can
proceed entirely in the browser in the meantime.

Questions about hooks/structure → see `src/ui/table.js` and `src/ui/store.js`,
or ask the dev. Have fun. ♛
