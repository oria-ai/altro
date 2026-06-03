# Reference study — how to make it feel familiar (without cloning)

Goal: Royal Poker should feel instantly familiar to anyone who's played a big
mobile poker app, while being **our own original product**. This file tells you
how to use existing poker apps as reference correctly.

## Study the genre, don't trace one app

Look at several popular mobile poker apps (Zynga Poker and others) and the
poker genre in general. You're studying the **shared grammar** that makes these
apps feel like "real" poker — that grammar is not any one company's property:

- **Table layout:** oval felt, you seated at the bottom-center, opponents arced
  around the top, community cards + pot in the middle.
- **Seat unit:** avatar, name + chip count plate, a turn-timer ring that drains,
  the dealer "D" button, the player's bet pushed toward the pot.
- **Action controls:** Fold / Check-Call / Raise, a bet-sizing slider with
  quick presets (Min, ½-pot, Pot, All-in).
- **Economy "juice":** coin counter up top with a "+" to buy, daily-bonus
  reward moment, a chip store with tiered packages and "best value" emphasis,
  win celebrations (chips flying to the winner).
- **Feel:** chunky tactile buttons, gold/green casino palette, satisfying
  motion on deal / bet / win.

All of the above already exists structurally in our build — your job is to make
it look *premium*. (See `DESIGN_HANDOFF.md` for the component/selector map.)

## The hard line (do NOT cross)

Familiar grammar = fine. Copying a specific company's identity = not fine.
**Do not reproduce, trace, or near-copy** any specific app's:

- logo, wordmark, or app name
- mascot/character art or specific avatars
- exact card-back artwork or card face style
- their specific brand color palette as a brand signature
- their store's exact package art, names, or pricing copy
- any screen reproduced pixel-for-pixel from screenshots

Produce **original** art and an original brand ("Royal Poker", crown ♛). When in
doubt: if a player could mistake a screen for a specific commercial product,
push it further toward our own look.

## If you want real screenshots as reference

A design agent can't open an installed Android app itself. If you want concrete
visual reference, a human should drop screenshots into
**`assets/reference/`** (they're git-ignored from shipping by being reference
only — treat them as study material, not assets to copy into the app). Use them
to understand layout and spacing conventions, then design our own surface.

## Deliverable framing

"Looks like a polished, familiar poker app a Zynga player would feel at home in,
but is clearly its own product." That's the target.
