-- Home page banner images — a dedicated, mobile-app-only feature, separate
-- from blasts (which are shared with the website's member dashboard). No
-- select policy is granted to anon/authenticated members at all: the only
-- reads are the Flask backend's service-role client (used exclusively by
-- the Flutter app's /api/mobile-banners endpoint) and the admin panel
-- (direct-Supabase, gated to the admin email below). This means even a
-- future website page querying this table directly would get zero rows
-- for a normal member — the separation is enforced at the data layer, not
-- just by "nobody happened to build a website UI for it yet".

create table if not exists public.mobile_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mobile_banners_active_sort_idx
  on public.mobile_banners (is_active, sort_order);

drop trigger if exists mobile_banners_set_updated_at on public.mobile_banners;
create trigger mobile_banners_set_updated_at
  before update on public.mobile_banners
  for each row execute procedure public.set_updated_at();

alter table public.mobile_banners enable row level security;

create policy "mobile_banners_select_admin_all"
  on public.mobile_banners for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "mobile_banners_insert_admin"
  on public.mobile_banners for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "mobile_banners_update_admin"
  on public.mobile_banners for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com')
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "mobile_banners_delete_admin"
  on public.mobile_banners for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');
