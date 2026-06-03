# Designer kickoff prompt

Paste the block below into a fresh Claude (design) session opened in `~/altro/poker`.
It points the agent at the in-repo handoff and sets the guardrails.

---

```
You are the visual designer for an existing, fully-working game in this repo
(~/altro/poker). The game logic is DONE and tested — your job is the visual layer
only. Do NOT modify anything in src/engine/, and do NOT rename any HTML id/class
that JS queries (it will break the game loop).

START HERE:
1. Read DESIGN_HANDOFF.md end-to-end, then README.md, then REFERENCE_STUDY.md.
   They contain the design tokens, the component/selector map, the run
   instructions, hard constraints, and how to study the poker genre for
   familiarity without cloning any specific app. Follow them.
2. REFERENCE STUDY: study the poker genre (Zynga Poker and other popular mobile
   poker apps) for the SHARED conventions that make these apps feel familiar —
   table layout, seat unit, action controls, the economy "juice". Replicate the
   GENRE GRAMMAR, not any one app's identity. If a human has dropped reference
   screenshots in assets/reference/, use them to understand layout/spacing only,
   then design our OWN original surface. See REFERENCE_STUDY.md for the exact
   do/don't list. (You cannot open the installed Android app yourself — work
   from the documented conventions and any provided screenshots.)
3. Run the app and look at it before changing anything:
     npm run serve        # static server on :8799
   Then load http://localhost:8799/index.html in a PORTRAIT MOBILE viewport
   (~390x780). To screenshot headlessly, copy the pattern in tools/smoke.mjs
   (it locates the cached Playwright chromium) — capture the home, table, and
   store screens before and after your changes.

WHAT TO DELIVER (in priority order):
  1. A cohesive premium visual pass on src/ui/style.css — table felt, buttons,
     seats, cards, the store, and the home screen. ~95% of the work is here.
  2. A real logo/wordmark for "ROYAL POKER" and any art you add → assets/
     (brand/ cards/ chips/ avatars/). Wire art in via CSS where possible; the
     only JS file you may touch for image card faces is src/ui/cards-render.js
     (keep .card element dimensions identical so layout doesn't reflow).
  3. Keep the deal/flip/win animation hooks that already exist (.deal-anim,
     .flip, .seat.winner, .timer-ring) and improve them if time allows.

NON-NEGOTIABLE CONSTRAINTS:
  - ORIGINAL BRAND. This is not a clone of any commercial poker app. Do not
    copy another company's logo, exact UI, palette, card backs, mascot, or
    named chip packages. Use only generic poker conventions (green felt, gold
    coins, chip stacks, avatar rings, dealer button). Keep it familiar but ours.
  - The "Get Chips" store is a SIMULATED purchase flow by design — it must look
    convincing and premium (packages, prices, payment spinner, receipt). Polish
    it; do not turn it into an obvious placeholder and do not wire real payments.
  - Mobile portrait first. Ships as an Android APK in a fullscreen WebView.
    Account for the notch (viewport-fit=cover is set).
  - Fully OFFLINE: no external network calls, no CDN web fonts. Bundle any font
    into assets/ and @font-face it locally.

VERIFY BEFORE YOU FINISH:
  - npm test        (engine — must still pass; you shouldn't have touched it)
  - npm run smoke   (headless UI walkthrough — must still pass; confirms you
                     didn't rename a hook the game loop depends on)
  - Re-screenshot home/table/store and confirm they look right in portrait.

When done, append a short "Design pass — <date>" section to DESIGN_HANDOFF.md
listing what you changed, what art you added, and anything still open.
```

---

That's the whole brief — it's self-contained and assumes nothing beyond the repo.
