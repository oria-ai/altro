# Google AI for Vercel — Marketplace Integration

A **native Vercel Marketplace integration** that resells Google services
(**Gemini**, Maps, Search, Vertex AI, vector DB) to Vercel users. The customer
installs it, provisions a product, and gets env vars in their project — no Google
Cloud account of their own. Calls run through our metered proxy on **our** Google
credentials; **Vercel invoices the customer and pays us out** (we never touch cards).

## Architecture

```
Customer's Vercel project
  env: GEMINI_API_KEY=<scoped key we issued>   GEMINI_BASE_URL=<this app>/api/proxy/gemini
        │
        ▼
  /api/proxy/[...path]   ── auth the key → forward to Google (our key) → meter tokens → return
        │
        ├─ /v1/installations/[id]                     PUT  upsert install (store access token)
        │                                             DEL  uninstall
        ├─ .../products/[productId]/plans             GET  list billing plans
        ├─ .../resources                              POST provision → returns env-var secrets
        ├─ .../resources/[resourceId]                 GET/PATCH/DELETE
        ├─ /sso                                       GET  "Open in Provider" deep-link
        └─ /api/cron/billing  (daily)                 POST submitBillingData → Vercel
        │
        ▼
  Google Cloud (OUR project + bill)
```

Data model: `db/schema.sql` — `installations`, `resources`, `api_keys`, `usage_events`.

## Status

MVP spine = **Gemini only**, end-to-end. Maps/Search/Vertex/vectors are scaffolded
in `src/lib/products.ts` (`enabled: false`) and ride the same metering rail when turned on.

## Local setup

```bash
bun install
cp .env.example .env.local      # fill DATABASE_URL + GOOGLE_API_KEY at minimum
bun run db:init                 # apply schema to the Neon Postgres
bun run dev
```

## What only a human can do (Vercel Integrations Console)

These steps can't be scripted — they happen in the Vercel dashboard
(**vercel.com/dashboard/integrations/console** → create integration):

1. **Create the integration** (type: *Native* / Marketplace).
2. Set the **API base URL** to this app's origin (so Vercel calls `{origin}/v1/installations/...`).
   - Set **Redirect/SSO URL** to `{origin}/sso`.
3. Define **products**: start with `gemini`. Product id must match `src/lib/products.ts`.
4. Define **billing plans** per product (e.g. `gemini-payg`, $0.50 / 1M tokens) — must match
   `src/app/api/cron/billing/route.ts` `PRICE` and the `/plans` route.
5. Copy **client id + secret** → `.env.local` (`VERCEL_INTEGRATION_CLIENT_ID/SECRET`).
6. Submit for review when ready to go public.

## Env vars

See `.env.example`. Production also needs `CRON_SECRET` (protects the billing cron) and,
once registered, `VERCEL_INTEGRATION_CLIENT_SECRET` (enables inbound signature verification —
`src/lib/auth.ts` fails closed in prod when this is set).

## Open TODOs before production

- `src/lib/auth.ts` — implement real Vercel request signature / OIDC verification.
- `src/app/sso/route.ts` — real OIDC `code` exchange + session.
- Streaming Gemini responses — meter from stream (current metering reads non-stream JSON).
- Maps/Search/Vertex/vectors upstream clients + enable in `products.ts`.
