-- Lets members set their own invoice branding (company name + logo), same
-- table as the admin's global default — each member gets their own row
-- (member_id set), while the existing singleton admin row (member_id null,
-- fixed id 00000000-0000-0000-0000-000000000001) stays the platform-wide
-- default a member sees until they set their own. Still accessed
-- exclusively through the Flask backend's service-role client.
-- Run this in the Supabase SQL Editor.

alter table public.invoice_settings add column if not exists member_id text;

-- A full (non-partial) unique index — Postgres won't accept a partial index
-- as an `ON CONFLICT (member_id)` upsert target unless the conflict clause
-- repeats the same WHERE predicate, which Supabase's upsert() doesn't do.
-- Plain UNIQUE still allows multiple NULLs (the single admin row), so this
-- doesn't block the singleton default row.
create unique index if not exists invoice_settings_member_uidx
  on public.invoice_settings (member_id);
