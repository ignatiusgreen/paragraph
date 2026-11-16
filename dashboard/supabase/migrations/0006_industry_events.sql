-- Festival submission deadlines and industry events shown on the dashboard
create table if not exists industry_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  org text,
  kind text not null default 'deadline' check (kind in ('deadline','event')),
  date date,
  end_date date,
  url text,
  notes text,
  created_at timestamptz not null default now()
);
alter table industry_events enable row level security;
drop policy if exists member_all on industry_events;
create policy member_all on industry_events for all to authenticated using (public.is_member()) with check (public.is_member());
