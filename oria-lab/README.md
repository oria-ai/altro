# oria-lab

The "Oria Lab — coming soon" landing page, live on the apex **https://meshugaim.org**.

- `index.html` — the page (source of truth).
- `old-apex-index.html.bak` — the blank placeholder it replaced (pre 2026-06-05).

## Deploy

The apex is served by the Vercel project `meshugaim` (deploy dir `~/meshugaim/`, account aurelius-7242):

```bash
cp ~/altro/oria-lab/index.html ~/meshugaim/index.html
cd ~/meshugaim && vercel deploy --prod
```
