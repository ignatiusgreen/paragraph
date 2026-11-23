-- Review Portal tables (already applied to the PARAGRAPH Supabase project on 2026-11-23).
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  title text not null,
  client text,
  video_url text not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create table public.review_notes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  parent_id uuid references public.review_notes(id) on delete cascade,
  author_name text not null,
  author_email text,
  is_team boolean not null default false,
  timecode numeric,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index review_notes_review_idx on public.review_notes(review_id, created_at);
alter table public.reviews enable row level security;
alter table public.review_notes enable row level security;
-- No policies on purpose: only the site's server code (service key) reads or writes these.

-- 2026-11-23: edit support
alter table public.review_notes add column if not exists edit_key text, add column if not exists edited_at timestamptz;

-- 2026-11-23: projects, presentations, notes requests
create table public.review_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  created_at timestamptz not null default now()
);
alter table public.review_projects enable row level security;
alter table public.reviews
  add column if not exists kind text not null default 'review' check (kind in ('review','presentation')),
  add column if not exists project_id uuid references public.review_projects(id) on delete set null,
  add column if not exists label text,
  add column if not exists request_status text check (request_status in ('pending','approved','declined')),
  add column if not exists requested_name text,
  add column if not exists requested_email text,
  add column if not exists requested_message text,
  add column if not exists requested_at timestamptz;
create index if not exists reviews_project_idx on public.reviews(project_id);
