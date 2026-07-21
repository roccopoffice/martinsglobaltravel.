-- Run in Supabase SQL Editor if payments succeed in Stripe but balance does not update.

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
