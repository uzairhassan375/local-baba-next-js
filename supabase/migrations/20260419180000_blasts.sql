-- Announcements / “blasts”: admin manages; members read published rows.

create table if not exists public.blasts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null,
  target_cities jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blasts_status_sort_idx
  on public.blasts (status, sort_order desc, created_at desc);

drop trigger if exists blasts_set_updated_at on public.blasts;
create trigger blasts_set_updated_at
  before update on public.blasts
  for each row execute procedure public.set_updated_at();

alter table public.blasts enable row level security;

drop policy if exists "blasts_select_admin" on public.blasts;
drop policy if exists "blasts_select_published_members" on public.blasts;
drop policy if exists "blasts_insert_admin" on public.blasts;
drop policy if exists "blasts_update_admin" on public.blasts;
drop policy if exists "blasts_delete_admin" on public.blasts;

create policy "blasts_select_admin"
  on public.blasts for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "blasts_select_published_members"
  on public.blasts for select
  to authenticated
  using (status = 'published');

create policy "blasts_insert_admin"
  on public.blasts for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "blasts_update_admin"
  on public.blasts for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com')
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

create policy "blasts_delete_admin"
  on public.blasts for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');
