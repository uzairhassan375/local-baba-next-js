-- Membership applications from /apply (public insert). Admin: admin@localbaba.com (match VITE_ADMIN_EMAIL).

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  city text not null,
  business_name text not null,
  sells_what jsonb not null default '[]'::jsonb,
  sells_where jsonb not null default '[]'::jsonb,
  monthly_volume text not null,
  heard_from text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists membership_applications_status_idx
  on public.membership_applications (status, applied_at desc);

drop trigger if exists membership_applications_set_updated_at on public.membership_applications;
create trigger membership_applications_set_updated_at
  before update on public.membership_applications
  for each row execute procedure public.set_updated_at();

alter table public.membership_applications enable row level security;

-- Anyone can submit an application (anon + logged-in users)
create policy "membership_applications_insert_public"
  on public.membership_applications for insert
  to anon, authenticated
  with check (true);

-- Only admin can read
create policy "membership_applications_select_admin"
  on public.membership_applications for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

-- Only admin can update (approve / reject)
create policy "membership_applications_update_admin"
  on public.membership_applications for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com')
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');
