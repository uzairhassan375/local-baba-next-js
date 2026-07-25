-- Products shown on the public landing page (admin-curated)
alter table public.products
  add column if not exists show_on_landing boolean not null default false,
  add column if not exists landing_sort int not null default 0;

create index if not exists products_landing_idx
  on public.products (show_on_landing, landing_sort desc, updated_at desc)
  where show_on_landing = true;
