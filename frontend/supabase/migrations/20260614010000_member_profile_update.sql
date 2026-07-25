-- Members can update their own profile row
create policy "membership_applications_update_own"
  on public.membership_applications for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);
