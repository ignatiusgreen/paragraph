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
