-- Project timeline (Gantt): tasks with a start and end, grouped into phases, and single-date milestones
create table if not exists timeline_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null default 'task' check (kind in ('task','milestone')),
  title text not null,
  group_name text,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);
create index if not exists timeline_items_project on timeline_items (project_id, start_date);
alter table timeline_items enable row level security;
drop policy if exists member_all on timeline_items;
create policy member_all on timeline_items for all to authenticated using (public.is_member()) with check (public.is_member());
