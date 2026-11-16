-- A lead's "next step" becomes a to-do filed under New Biz, linked back to the lead.
alter table todos add column if not exists lead_id uuid references leads(id) on delete set null;
alter table todos drop constraint if exists todos_category_check;
alter table todos add constraint todos_category_check check (category in ('personal','operations','newbiz'));
