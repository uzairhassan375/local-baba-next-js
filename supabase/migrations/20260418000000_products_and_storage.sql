-- Run in Supabase SQL Editor (or CLI). Admin email is synced with VITE_ADMIN_EMAIL: admin@localbaba.com

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  price_per_pc numeric not null,
  market_rate numeric not null,
  moq int not null default 30,
  stock int not null default 0,
  status text not null check (status in ('active', 'draft', 'sold_out')),
  tags jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  description text not null default '',
  specs jsonb not null default '[]'::jsonb,
  seller_tips jsonb not null default '[]'::jsonb,
  show_in_trending boolean not null default false,
  trending_sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_show_trending_idx
  on public.products (show_in_trending, trending_sort desc, updated_at desc);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

alter table public.products enable row level security;

-- Policies: public sees active + sold_out; admin@localbaba.com sees all rows + write.

create policy "products_select_public"
  on public.products for select
  to anon
  using (status in ('active', 'sold_out'));

create policy "products_select_member_auth"
  on public.products for select
  to authenticated
  using (status in ('active', 'sold_out'));

create policy "products_select_admin_all"
  on public.products for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "products_insert_admin"
  on public.products for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "products_update_admin"
  on public.products for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com')
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "products_delete_admin"
  on public.products for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

-- Storage: product images (public read; authenticated upload/update/delete — use only admin auth user in practice)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "product_images_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

create policy "product_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
