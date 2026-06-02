-- uni — conversation persistence schema.
-- Run this against your Supabase project (SQL editor or `supabase db` CLI).

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_created_at_idx
  on messages (conversation_id, created_at);
