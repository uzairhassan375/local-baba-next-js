-- Tracked migration for the subscriptions table. It previously existed only
-- via out-of-band SQL editor creation (no migration for it anywhere in the
-- repo), which is what this file fixes. `create table if not exists` makes
-- this safe to apply against a database where the table already exists.
-- Shape matches the columns already consumed by
-- frontend/src/lib/api/subscriptionApi.ts and backend/app/blueprints/subscriptions.py.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  user_email text not null,
  user_name text not null default '',
  payment_proof_url text not null default '',
  amount numeric not null default 10.0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'expired', 'none')),
  bank_name text,
  account_title text,
  iban text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index if not exists subscriptions_user_email_uidx
  on public.subscriptions (user_email);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

alter table public.subscriptions enable row level security;

-- The table already existed in production with a wide-open policy allowing
-- any anon/authenticated client full read/write access, which let anyone
-- holding the public anon key bypass Flask's authorization entirely. Drop it
-- now that subscriptions are consolidated behind the service-role Flask
-- backend — no anon/authenticated policies are recreated (deny-all).
drop policy if exists "Allow all operations for subscriptions" on public.subscriptions;
