-- Run once in Supabase SQL Editor (staff notes on client_accounts)
alter table public.client_accounts
  add column if not exists notes text;
