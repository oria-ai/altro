-- Control-plane schema for the Google-AI Vercel marketplace integration.
-- Run against the Vercel/Neon Postgres provisioned for THIS app (not the customer's).

-- One row per customer install of our integration.
create table if not exists installations (
  id              text primary key,                 -- Vercel installationId (icfg_...)
  account_name    text,
  contact_email   text,
  access_token    text not null,                    -- token WE use to call Vercel (billing API) for this install
  scopes          jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz                       -- set on uninstall
);

-- One row per provisioned product instance (e.g. a "Gemini" resource inside an install).
create table if not exists resources (
  id              text primary key,                 -- resourceId we mint
  installation_id text not null references installations(id) on delete cascade,
  product_id      text not null,                    -- 'gemini' | 'maps' | 'search' | 'vertex' | 'vectors'
  name            text not null,
  status          text not null default 'ready',    -- ready | suspended | error
  billing_plan_id text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- Scoped API keys handed to the customer's project as env vars. We store only a hash.
create table if not exists api_keys (
  id              text primary key,
  resource_id     text not null references resources(id) on delete cascade,
  key_prefix      text not null,                    -- non-secret prefix for display/lookup
  key_hash        text not null,                    -- sha-256 of the full key
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);
create index if not exists api_keys_prefix_idx on api_keys (key_prefix) where revoked_at is null;

-- Raw metering events written by the proxy on every upstream Google call.
create table if not exists usage_events (
  id              bigserial primary key,
  resource_id     text not null references resources(id) on delete cascade,
  product_id      text not null,
  metric          text not null,                    -- e.g. 'gemini_tokens', 'maps_calls'
  quantity        numeric not null,
  units           text not null,                    -- 'tokens' | 'calls'
  created_at      timestamptz not null default now(),
  reported_at     timestamptz                       -- set once included in a submitBillingData call
);
create index if not exists usage_events_unreported_idx
  on usage_events (resource_id, created_at) where reported_at is null;

-- Vector store (the "Vector DB" product): Google gemini-embedding-001 @768-dim + pgvector.
create extension if not exists vector;
create table if not exists vectors (
  installation_id text not null,
  namespace       text not null default 'default',
  id              text not null,
  content         text,
  embedding       vector(768),
  created_at      timestamptz not null default now(),
  primary key (installation_id, namespace, id)
);
create index if not exists vectors_ann on vectors using hnsw (embedding vector_cosine_ops);
