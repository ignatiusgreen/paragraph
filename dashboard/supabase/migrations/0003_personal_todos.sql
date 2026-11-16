-- To-dos that belong to the Personal column rather than a project
alter table todos add column if not exists personal boolean not null default false;
