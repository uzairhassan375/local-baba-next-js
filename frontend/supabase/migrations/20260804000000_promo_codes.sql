-- Admin-issued promo codes scoped to specific members only — not public/
-- global codes. Created when an admin messages the members who have a
-- product in their cart or favourites (via the Cart & Fav Stats admin
-- panel) offering a discount; only the members that promo was created for
-- can redeem it at checkout. Accessed exclusively through the Flask
-- backend's service-role client, same convention as
-- member_cart/member_favorites/member_notifications — RLS enabled with no
-- permissive policies.

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  product_id uuid references public.products (id) on delete set null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  -- 0 = no minimum order quantity required to redeem this code.
  min_quantity integer not null default 0,
  -- null = never expires; otherwise redemption is rejected past this time.
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists promo_codes_product_idx on public.promo_codes (product_id);

alter table public.promo_codes enable row level security;

-- The allow-list: which members may redeem a given promo code.
create table if not exists public.promo_code_members (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (promo_code_id, auth_user_id)
);

create index if not exists promo_code_members_user_idx on public.promo_code_members (auth_user_id);
create index if not exists promo_code_members_code_idx on public.promo_code_members (promo_code_id);

alter table public.promo_code_members enable row level security;
