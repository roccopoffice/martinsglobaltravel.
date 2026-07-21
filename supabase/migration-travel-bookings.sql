-- Travel bookings (flights, event tickets) — run in Supabase SQL Editor

create table if not exists public.travel_bookings (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  booking_type text not null check (booking_type in ('flight', 'ticket', 'hotel')),
  status text not null default 'pending',
  customer_email text,
  customer_name text,
  customer_phone text,
  total_cents integer not null check (total_cents > 0),
  currency text not null default 'USD',
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_bookings_email_idx on public.travel_bookings (customer_email);
create index if not exists travel_bookings_status_idx on public.travel_bookings (status);

alter table public.travel_bookings enable row level security;

-- No public access — Jeanie views via Supabase dashboard or admin tools (service role)
