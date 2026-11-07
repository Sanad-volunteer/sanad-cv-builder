-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- One row per user (the e-mail on the CV). The site writes with the service-role key; nobody else can read the table.
create table if not exists public.cvs (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  title       text,
  phone       text,
  city        text,
  residence   text,
  university  text,
  major       text,
  level       text,
  lang        text,
  cv          jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cvs_updated_idx on public.cvs (updated_at desc);
alter table public.cvs enable row level security; -- no policies on purpose: the public (anon) key can read and write nothing

-- ===== Upgrade for CVs saved from the analyzer (run ONCE, BEFORE deploying the new code) =====
-- One row per (email, source): 'builder' = made in the CV builder, 'analyzed' = uploaded to the analyzer.
alter table public.cvs add column if not exists source    text not null default 'builder';
alter table public.cvs add column if not exists file_name text;
alter table public.cvs drop constraint if exists cvs_email_key;
create unique index if not exists cvs_email_source_idx on public.cvs (email, source);
