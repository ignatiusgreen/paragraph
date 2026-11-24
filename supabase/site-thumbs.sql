alter table public.site_videos add column if not exists thumb_url text;
insert into storage.buckets (id, name, public) values ('site-thumbs','site-thumbs',true) on conflict (id) do update set public = true;
