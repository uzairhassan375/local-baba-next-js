-- Create member_orders table to persist all orders placed by members
-- Run this in Supabase SQL Editor

create table if not exists public.member_orders (
  id text primary key,                         -- e.g. "LB-2847"
  member_id text not null,                     -- auth user id or application id
  customer_name text,
  items jsonb not null default '[]'::jsonb,   -- [{productId, name, qty, pricePerPc, image}]
  total numeric not null default 0,
  delivery_charges numeric not null default 250,
  discount numeric not null default 0,
  payment_method text not null default 'bank_transfer',
  payment_status text not null check (payment_status in ('pending', 'confirmed', 'failed')) default 'pending',
  order_status text not null check (order_status in ('processing', 'dispatched', 'delivered', 'cancelled')) default 'processing',
  courier text,
  tracking_number text,
  delivery_address text not null default '',
  city text not null default '',
  notes text,
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for searching by member and status
create index if not exists member_orders_member_idx on public.member_orders (member_id);
create index if not exists member_orders_status_idx on public.member_orders (payment_status, order_status);
create index if not exists member_orders_created_idx on public.member_orders (created_at desc);

-- Auto-update updated_at
drop trigger if exists member_orders_set_updated_at on public.member_orders;
create trigger member_orders_set_updated_at
  before update on public.member_orders
  for each row execute procedure public.set_updated_at();

-- Enable Row Level Security
alter table public.member_orders enable row level security;

-- Members can see their own orders (matched by auth user ID stored in member_id)
create policy "member_orders_select_own"
  on public.member_orders for select
  to authenticated
  using (member_id = auth.uid()::text OR (auth.jwt() ->> 'email') = 'admin@localbaba.com');

-- Members can insert their own orders
create policy "member_orders_insert_own"
  on public.member_orders for insert
  to authenticated
  with check (member_id = auth.uid()::text OR (auth.jwt() ->> 'email') = 'admin@localbaba.com');

-- Admin can update any order (e.g. price sync, status updates)
create policy "member_orders_update_admin"
  on public.member_orders for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com')
  with check ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

-- Also allow members to update their own (for cancellation etc.)
create policy "member_orders_update_own"
  on public.member_orders for update
  to authenticated
  using (member_id = auth.uid()::text);

-- Admin can delete
create policy "member_orders_delete_admin"
  on public.member_orders for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@localbaba.com');

-- Allow anon to select member orders? No. Only authenticated.
-- Allow unauthenticated insert? No. Only authenticated.
