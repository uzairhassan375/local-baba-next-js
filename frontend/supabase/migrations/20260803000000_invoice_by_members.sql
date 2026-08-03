-- Member-facing "Invoice" feature (free — not subscription-gated). Members
-- create their own invoices for their customers, the same shape as the
-- admin panel's Manual Invoice tab, just scoped to the logged-in member.
-- Accessed exclusively through the Flask backend's service-role client —
-- RLS enabled with no permissive policies, same convention as
-- invoice_settings/member_favorites/member_cart/member_notifications.
-- Run this in the Supabase SQL Editor.
--
-- Safe to run whether or not you already ran an earlier version of this
-- migration named "manual_invoices": if that table exists it's renamed
-- (and your data is preserved); otherwise a fresh table is created.

do $$
begin
  if to_regclass('public.manual_invoices') is not null then
    alter table public.manual_invoices rename to invoice_by_members;
    alter index if exists manual_invoices_member_idx rename to invoice_by_members_member_idx;
    alter index if exists manual_invoices_created_idx rename to invoice_by_members_created_idx;
    if exists (select 1 from pg_trigger where tgname = 'manual_invoices_set_updated_at') then
      alter trigger manual_invoices_set_updated_at on public.invoice_by_members rename to invoice_by_members_set_updated_at;
    end if;
  end if;
end $$;

create table if not exists public.invoice_by_members (
  id text primary key,                          -- e.g. "INV-LB-483920"
  member_id text not null,                      -- auth user id
  invoice_number text not null,
  customer_name text not null,
  customer_phone text,
  delivery_address text not null default '',
  city text not null default '',
  items jsonb not null default '[]'::jsonb,     -- [{description, qty, rate, amount}]
  subtotal numeric not null default 0,
  delivery_charges numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null check (payment_method in ('bank_transfer', 'easypaisa', 'cod')) default 'bank_transfer',
  payment_status text not null check (payment_status in ('pending', 'confirmed', 'failed')) default 'pending',
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_by_members_member_idx on public.invoice_by_members (member_id);
create index if not exists invoice_by_members_created_idx on public.invoice_by_members (created_at desc);

drop trigger if exists invoice_by_members_set_updated_at on public.invoice_by_members;
create trigger invoice_by_members_set_updated_at
  before update on public.invoice_by_members
  for each row execute procedure public.set_updated_at();

alter table public.invoice_by_members enable row level security;
-- No permissive policies — all reads/writes go through the backend's
-- service-role client, which bypasses RLS and self-scopes by member_id.
