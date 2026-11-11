-- Paragraph dashboard — initial schema
create extension if not exists pgcrypto;

-- ---------- Who may sign in ----------
create table members (
  email text primary key,
  name text
);
insert into members (email, name) values ('jg@paragraphfilms.com', 'JG');

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- App settings + section images ----------
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table sections (
  key text primary key,
  header_url text,
  background_url text
);

-- ---------- Clients + projects ----------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qbo_id text unique,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('client','documentary','narrative')),
  title text not null,
  client_id uuid references clients on delete set null,
  stage text not null,
  logline text,
  notes text,
  image_url text,
  links jsonb not null default '[]',
  budget numeric(12,2),
  hard_costs numeric(12,2),
  invoiced numeric(12,2),
  probability int,
  expected_on date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on projects (kind, stage);

-- ---------- Notebook ----------
create table notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  tags text[] not null default '{}',
  links jsonb not null default '[]',
  image_url text,
  project_id uuid references projects on delete set null,
  noted_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- To-dos + schedule ----------
create table todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  project_id uuid references projects on delete set null,
  note_id uuid references notes on delete set null,
  urgent boolean not null default false,
  due_date date,
  due_time time,
  remind_minutes int,
  done boolean not null default false,
  done_at timestamptz,
  gcal_event_id text,
  source text not null default 'web',
  created_at timestamptz not null default now()
);
create index on todos (done, due_date);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  end_date date,
  start_time time,
  end_time time,
  location text,
  notes text,
  project_id uuid references projects on delete set null,
  gcal_event_id text unique,
  source text not null default 'web',
  created_at timestamptz not null default now()
);
create index on events (date);

-- ---------- New biz ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  source text,
  status text not null default 'lead' check (status in ('lead','contacted','meeting','proposal','won','lost')),
  est_value numeric(12,2),
  next_step text,
  next_on date,
  notes text,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  tags text[] not null default '{}',
  subscribed boolean not null default true,
  created_at timestamptz not null default now()
);

create table gifts (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  recipient text not null,
  company text,
  gift text,
  cost numeric(10,2),
  status text not null default 'idea' check (status in ('idea','ordered','sent')),
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table metrics (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('website','vimeo','linkedin','instagram')),
  metric text not null,
  value numeric not null,
  recorded_on date not null default current_date,
  source text not null default 'manual',
  unique (channel, metric, recorded_on)
);

-- ---------- Finance ----------
create table overhead (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('salary','opex')),
  monthly numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Gear ----------
create table gear (
  id uuid primary key default gen_random_uuid(),
  list text not null default 'inventory' check (list in ('inventory','sell','buy')),
  name text not null,
  category text,
  serial text,
  condition text,
  location text,
  purchase_price numeric(10,2),
  purchased_on date,
  ask_price numeric(10,2),
  sold_price numeric(10,2),
  sell_status text check (sell_status in ('draft','listed','sold')),
  ebay_url text,
  fb_url text,
  buy_url text,
  est_cost numeric(10,2),
  priority text check (priority in ('low','medium','high')),
  image_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Inspiration pins ----------
create table pins (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  source_url text,
  created_at timestamptz not null default now()
);

-- ---------- Server-only: OAuth tokens + AI access tokens ----------
create table integrations (
  provider text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table agent_tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Row-level security ----------
do $$
declare t text;
begin
  foreach t in array array['settings','sections','clients','projects','notes','todos','events','leads','contacts','gifts','metrics','overhead','gear','pins']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy member_all on %I for all to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

alter table members enable row level security;
create policy member_read on members for select to authenticated using (public.is_member());
-- integrations and agent_tokens: no policies, so only the server's secret key can read them.
alter table integrations enable row level security;
alter table agent_tokens enable row level security;

revoke execute on function public.is_member() from anon, public;
grant execute on function public.is_member() to authenticated;

-- ---------- Image uploads ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;
create policy media_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_member());
create policy media_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_member());
create policy media_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_member());
