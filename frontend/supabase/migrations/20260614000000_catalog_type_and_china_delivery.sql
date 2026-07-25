-- Catalog type on products (standard vs china import catalog)
alter table public.products
  add column if not exists catalog_type text not null default 'standard'
  check (catalog_type in ('standard', 'china'));

create index if not exists products_catalog_type_idx on public.products (catalog_type);

-- Category-wise delivery prices for China catalog
create table if not exists public.china_delivery_prices (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  delivery_price numeric not null check (delivery_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists china_delivery_prices_set_updated_at on public.china_delivery_prices;
create trigger china_delivery_prices_set_updated_at
  before update on public.china_delivery_prices
  for each row execute procedure public.set_updated_at();

alter table public.china_delivery_prices enable row level security;

create policy "china_delivery_select_public"
  on public.china_delivery_prices for select
  to anon, authenticated
  using (true);

create policy "china_delivery_admin_all"
  on public.china_delivery_prices for all
  to authenticated
  using ((auth.jwt() ->> 'email') = coalesce(current_setting('app.admin_email', true), 'admin@localbaba.com'))
  with check ((auth.jwt() ->> 'email') = coalesce(current_setting('app.admin_email', true), 'admin@localbaba.com'));
