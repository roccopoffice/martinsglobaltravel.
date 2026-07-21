-- Run once if you already created client_accounts (adds first / last name columns)
alter table public.client_accounts
  add column if not exists first_name text,
  add column if not exists last_name text;
