-- To-dos that aren't tied to a project can be filed under a named list: 'personal' or 'operations'.
alter table todos add column if not exists category text check (category in ('personal','operations'));
update todos set category = 'personal' where personal and category is null;
