# shay stone-360 — POC: prompt a room, orbit the real stone

Proof that the parked "stones-360 / image-to-3D" idea (long filed as
*"Replicate token still missing"*) builds locally, cheaply, today. The blocker was
a **missing credential + one-vendor framing**, never a technological wall —
`REPLICATE` is present in Doppler `stones/dev` (account `oria-ai`).

Two old "walls", both walked straight through:

| Old "wall" | Reality |
|---|---|
| "no model makes a 360 room from a prompt" | `igorriti/flux-360` → true 2:1 equirectangular, **~5–15 s, ~$0.02** |
| "no way to put the *real* stone in 3D" | `ndreca/hunyuan3d-2` → ONE real photo → orbitable textured GLB, ~60 s |

## Run it (interactive — type your own room)
```bash
export REPLICATE_API_TOKEN=$(doppler secrets get REPLICATE --plain -p stones -c dev)
node server.mjs            # http://localhost:8799/viewer.html
```
In the page: pick a stone, type a room prompt (or a preset) → **Generate room** →
the 360° panorama regenerates around the stone. Drag to orbit; it idle-auto-rotates.

CLI equivalents:
```bash
node gen-room.mjs "a calm gallery room, concrete floor, soft light, central plinth"
node gen-stone3d.mjs /path/to/stone.jpg stone-<id>.glb
```

## What's what
- `server.mjs` — local backend: serves the viewer + `POST /api/room {prompt}`.
- `room.mjs` — prompt → equirectangular room (`out/room.jpg`). **720×360** by default
  (`ROOM_H`) — kept light because 4K upscaled textures were too heavy for the
  integrated GPU. Bump `ROOM_H` for sharper at the cost of GPU/VRAM.
- `gen-stone3d.mjs` — real stone photo → orbitable mesh (`out/stone-<id>.glb`).
- `viewer.html` — three.js: 360 room as environment + stone at TRUE scale on an
  **adaptive plinth** (small stones get taller museum columns), shadow-mapped
  contact shadow, idle auto-rotate, stone picker, prompt panel.
  `?stone=<id>&az=<deg>&bare=1` = deterministic capture mode.
- `vendor/` — three.js r169 vendored (fully local, no CDN).
- `out/` — generated assets (room + per-stone GLBs).
- `shots/` — headless turntable proofs.

## Stones
From the shaym.beauty manifest: **boulder** (Striped Sentinel, 85 cm) and
**flint** (Banded Flint, 14 cm). Add more by generating `out/stone-<id>.glb`
and adding an entry to `STONES` in `viewer.html`.

## Realism pass (Gemini-in-the-loop)
`critique.mjs` sends a render to Gemini Vision and asks why it looks fake; fixes
were applied iteratively until realism went "pasted-on" → **7/10**:
- IBL: the room panorama lights the stone (no more pasted-on lighting).
- `matchSun()` auto-aims the key light at the room's brightest window.
- `matchFloor()` color-matches a reflective ground plane to the room's floor; it
  fades into the panorama so the plinth stands on continuous ground.
- Faded **mirror reflection** of stone + plinth in the floor.
- **Depth of field** (BokehPass) — stone in focus, room softens, edges not cut-out.
- Soft shadows + contact decals + procedurally-textured plinth.

Run: `GEMINI_AI_STUDIO=$(doppler secrets get GEMINI_AI_STUDIO --plain -p oria -c dev) node critique.mjs shots/hero.png`

## Notes
- Each "Generate room" is a real Replicate spend (~$0.02). Account <$5 credit →
  throttled to burst-1 (handled by retry in `lib.mjs`). IPv4 here is flaky →
  `lib.mjs` forces `ipv4first` + retries `ETIMEDOUT`.
- POC only — **not** wired into `~/shay` / shaym.beauty production.
