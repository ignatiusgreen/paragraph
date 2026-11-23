create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  title text not null,
  client text,
  vimeo_ids text[] not null default '{}',
  allow_download boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reels enable row level security;
