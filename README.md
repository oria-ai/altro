# uni

A Claude-powered HTTP agent service. Node + TypeScript, deployed on Railway,
with optional Supabase-backed conversation memory. Secrets are supplied through
the environment (Doppler in dev and on Railway).

## What it does

`uni` exposes a small HTTP API. A `POST /chat` request runs an agentic loop
against the Claude API: the model can call tools, the service executes them and
feeds the results back, and the loop repeats until the model produces a final
answer. Conversations are persisted to Supabase when configured, so follow-up
turns carry context.

## Endpoints

| Method | Path      | Description                                              |
| ------ | --------- | -------------------------------------------------------- |
| `GET`  | `/health` | Liveness + config summary (used by the Railway healthcheck). |
| `POST` | `/chat`   | Run the agent. Body: `{ "message": string, "conversationId"?: string }`. Returns `{ conversationId, reply, steps }`. |

Example:

```bash
curl -s localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"What time is it in Tokyo?"}'
```

Pass the returned `conversationId` on the next request to continue the thread.

## Configuration

All config comes from environment variables (see `.env.example`):

| Variable                    | Required | Default             | Notes                                  |
| --------------------------- | -------- | ------------------- | -------------------------------------- |
| `ANTHROPIC_API_KEY`         | yes      | —                   | Claude API key.                        |
| `MODEL`                     | no       | `claude-sonnet-4-6` | Any current Claude model id. Set to the latest Opus for max capability. |
| `EFFORT`                    | no       | `high`              | `low`/`medium`/`high`/`xhigh`/`max` (xhigh/max are Opus-tier). |
| `MAX_AGENT_STEPS`           | no       | `10`                | Max tool-use iterations per request.   |
| `SYSTEM_PROMPT`             | no       | built-in            | Override the agent's persona.          |
| `SUPABASE_URL`              | no       | —                   | Enables persistence when set with the key below. |
| `SUPABASE_SERVICE_ROLE_KEY` | no       | —                   | Server-side Supabase key.              |
| `PORT`                      | no       | `3000`              | Railway sets this automatically.       |

If the Supabase variables are absent, the agent runs statelessly — every
request starts a fresh conversation and nothing is written.

## Local development

```bash
npm install
cp .env.example .env          # then fill in your values
npm run dev                   # hot-reloading dev server

# or, with Doppler injecting secrets:
doppler run -- npm run dev
```

Type-check and build:

```bash
npm run typecheck
npm run build && npm start
```

## Supabase setup

Create the tables by running [`supabase/schema.sql`](supabase/schema.sql)
against your project (SQL editor or the Supabase CLI). The service uses the
service-role key, so it bypasses RLS — keep that key server-side only.

## Deploying to Railway

1. Create a Railway project from this repo. Railway detects the `Dockerfile`
   (see `railway.json`).
2. Connect Doppler (or add the variables directly) so the service receives at
   minimum `ANTHROPIC_API_KEY`, plus `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` for persistence. `PORT` is provided by Railway.
3. Deploy. Railway builds the image and runs the healthcheck against `/health`.

## Project layout

```
src/
  index.ts     HTTP server + routes
  config.ts    env validation (zod)
  agent.ts     Claude agentic loop
  tools.ts     client-side tool definitions + dispatch
  supabase.ts  conversation persistence
supabase/
  schema.sql   database schema
Dockerfile     multi-stage build for Railway
railway.json   Railway build/deploy config
```

Add new tools in `src/tools.ts` — each tool is a JSON schema plus a local
handler.
