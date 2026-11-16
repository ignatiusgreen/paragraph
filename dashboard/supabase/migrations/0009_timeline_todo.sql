-- A timeline task can be the bar for a to-do; deleting the to-do removes its bar.
alter table timeline_items add column if not exists todo_id uuid references todos(id) on delete cascade;
create unique index if not exists timeline_items_todo on timeline_items (todo_id) where todo_id is not null;
