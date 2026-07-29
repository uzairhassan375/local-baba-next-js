-- Per-member Shopify integration credentials. Replaces the old Node backend's
-- single global shopify_integration.json file (no per-user scoping) with a
-- proper per-member row. The service-role Flask backend is the only reader/
-- writer; RLS is enabled with zero grants to anon/authenticated so even a
-- leaked anon/publishable key cannot read tokens directly from Postgres.

create table if not exists public.shopify_integrations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users (id) on delete cascade,
  shop_domain text not null default '',
  access_token text not null default '',
  api_secret_key text not null default '',
  store_name text not null default '',
  currency text not null default 'USD',
  connected boolean not null default false,
  connected_at timestamptz,
  last_synced_at timestamptz,
  synced_products_count int not null default 0,
  sync_preferences jsonb not null default '{"syncProducts": true, "syncOrders": true, "webhooksEnabled": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shopify_integrations_member_uidx
  on public.shopify_integrations (member_id);

-- Defined inline (create or replace) rather than assuming public.set_updated_at()
-- already exists — the live database's actual trigger functions turned out to be
-- named touch_updated_at/update_updated_at_column, not what earlier migration
-- files assumed, so this migration no longer depends on that.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists shopify_integrations_set_updated_at on public.shopify_integrations;
create trigger shopify_integrations_set_updated_at
  before update on public.shopify_integrations
  for each row execute procedure public.set_updated_at();

alter table public.shopify_integrations enable row level security;
-- No policies created: RLS enabled + zero grants = deny-all for anon/authenticated.
-- Only the service-role key (used exclusively by the Flask backend) bypasses RLS.
