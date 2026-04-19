-- Unique SKU per product (stable identity for catalogue and orders).

alter table public.products add column if not exists sku text;

update public.products
set sku = 'TLB-' || replace(id::text, '-', '')
where sku is null or btrim(sku) = '';

alter table public.products alter column sku set not null;

create unique index if not exists products_sku_unique on public.products (sku);
