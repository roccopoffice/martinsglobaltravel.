-- Martins Global Travels — Client portal
-- Run in Supabase: SQL Editor → New query → paste → Run

-- One row per client (id = auth.users.id)
create table if not exists public.client_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  full_name text,
  notes text,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  currency text not null default 'usd',
  stripe_customer_id text,
  updated_at timestamptz not null default now()
);

create index if not exists client_accounts_email_idx on public.client_accounts (email);

-- Payment history (optional audit trail)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.client_accounts (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  stripe_checkout_session_id text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.client_accounts enable row level security;
alter table public.payments enable row level security;

-- Clients: read ONLY their own balance (no writes from the app)
drop policy if exists "Clients read own account" on public.client_accounts;
create policy "Clients read own account"
  on public.client_accounts for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Clients read own payments" on public.payments;
create policy "Clients read own payments"
  on public.payments for select
  to authenticated
  using (auth.uid() = user_id);

-- After signup, link auth user to client_accounts (run once per new client from SQL editor)
-- Replace UUID and email with the user's values from Authentication → Users
--
-- insert into public.client_accounts (id, email, first_name, last_name, balance_cents)
-- values (
--   'USER_UUID_FROM_AUTH',
--   'client@example.com',
--   'Jane',
--   'Smith',
--   250000  -- $2,500.00 owed
-- );

-- Reduce balance after Stripe payment (service role / webhook only)
create or replace function public.apply_payment(
  p_user_id uuid,
  p_amount_cents integer,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount_cents <= 0 then
    raise exception 'invalid amount';
  end if;

  if exists (
    select 1 from public.payments
    where stripe_checkout_session_id = p_session_id
  ) then
    return;
  end if;

  insert into public.payments (user_id, amount_cents, stripe_checkout_session_id, status)
  values (p_user_id, p_amount_cents, p_session_id, 'completed');

  update public.client_accounts
  set
    balance_cents = greatest(0, balance_cents - p_amount_cents),
    updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.apply_payment from public;
grant execute on function public.apply_payment to service_role;
