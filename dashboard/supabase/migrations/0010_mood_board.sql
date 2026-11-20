-- Mood board: images and links placed freely on a per-project board, mirrored to a Google Drive folder
create table if not exists mood_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image','link')),
  image_url text,
  source_url text,
  title text,
  x numeric not null default 40,
  y numeric not null default 40,
  w numeric not null default 240,
  z int not null default 1,
  drive_file_id text,
  created_at timestamptz not null default now()
);
create index if not exists mood_items_project on mood_items (project_id);
alter table mood_items enable row level security;
drop policy if exists member_all on mood_items;
create policy member_all on mood_items for all to authenticated using (public.is_member()) with check (public.is_member());
alter table projects add column if not exists mood_folder_id text;
