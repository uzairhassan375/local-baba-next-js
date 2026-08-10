-- Admin-managed home-page categories ("Shop by Category" row) — each has a
-- display name and a cover image (hosted on Bunny CDN, only the URL lives
-- here). Independent of products.category (free text); the admin Categories
-- page filters existing products by matching that text, so no migration of
-- product data is needed. Same public-read / admin-write RLS shape as
-- products (20260418000000_products_and_storage.sql).

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_active_sort_idx
  on public.categories (is_active, sort_order);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute procedure public.set_updated_at();

alter table public.categories enable row level security;

create policy "categories_select_public"
  on public.categories for select
  to anon
  using (is_active = true);

create policy "categories_select_member_auth"
  on public.categories for select
  to authenticated
  using (is_active = true);

create policy "categories_select_admin_all"
  on public.categories for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "categories_insert_admin"
  on public.categories for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "categories_update_admin"
  on public.categories for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com')
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "categories_delete_admin"
  on public.categories for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

-- Per-product curation flag: does this product appear in its category's
-- home-page collection row (mobile app "below Trending" sections)? Same
-- shape as show_in_trending/show_on_landing.
alter table public.products
  add column if not exists show_in_category_home boolean not null default false;

create index if not exists products_show_category_home_idx
  on public.products (category, show_in_category_home);
