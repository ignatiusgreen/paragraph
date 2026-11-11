-- Optional page background colour per section
alter table sections add column if not exists background_color text;
