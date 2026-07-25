-- Link membership rows to auth.users; members can read/insert their own row. Admin policies unchanged.

alter table public.membership_applications
  add column if not exists auth_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists email text;

create unique index if not exists membership_applications_auth_user_id_uidx
  on public.membership_applications (auth_user_id)
  where auth_user_id is not null;

drop policy if exists "membership_applications_insert_public" on public.membership_applications;
drop policy if exists "membership_applications_insert_own_user" on public.membership_applications;
drop policy if exists "membership_applications_select_own" on public.membership_applications;

-- After sign-up, members insert a profile row tied to their user id.
create policy "membership_applications_insert_own_user"
  on public.membership_applications for insert
  to authenticated
  with check (auth.uid() = auth_user_id);

create policy "membership_applications_select_own"
  on public.membership_applications for select
  to authenticated
  using (auth.uid() = auth_user_id);
