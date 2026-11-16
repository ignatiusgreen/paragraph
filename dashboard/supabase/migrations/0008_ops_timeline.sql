-- Timeline items can belong to a project or to a named scope such as 'ops' (the Operations page).
alter table timeline_items alter column project_id drop not null;
alter table timeline_items add column if not exists scope text;
create index if not exists timeline_items_scope on timeline_items (scope, start_date);
