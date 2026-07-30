-- Favorites, cart, and real per-user notifications — all accessed exclusively
-- through the Flask backend's service-role client, never directly by
-- frontend/mobile clients. RLS is enabled with no permissive policies so
-- only the service role can touch these tables.

create table if not exists public.member_favorites (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (auth_user_id, product_id)
);

create index if not exists member_favorites_user_idx on public.member_favorites (auth_user_id);

alter table public.member_favorites enable row level security;

create table if not exists public.member_cart (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null default 30 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_user_id, product_id)
);

create index if not exists member_cart_user_idx on public.member_cart (auth_user_id);

alter table public.member_cart enable row level security;

drop trigger if exists member_cart_set_updated_at on public.member_cart;
create trigger member_cart_set_updated_at
  before update on public.member_cart
  for each row execute procedure public.set_updated_at();

-- Replaces member_notification (auth_user_id, last_read_at) — that table
-- only ever tracked a single "read up to" timestamp, had no per-row content,
-- and its column names didn't even match what any client actually wrote.
-- Notifications are now real per-user rows created server-side.
drop table if exists public.member_notification;

create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  icon text,
  related_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists member_notifications_user_idx
  on public.member_notifications (auth_user_id, created_at desc);

create unique index if not exists member_notifications_dedupe_idx
  on public.member_notifications (auth_user_id, type, related_id);

alter table public.member_notifications enable row level security;

-- Blast admin CRUD still goes direct-Supabase from the admin panel (out of
-- scope for this change), so fan-out to members on publish has to live here
-- rather than in the backend.
create or replace function public.notify_members_on_blast_publish()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and (old is null or old.status is distinct from 'published') then
    insert into public.member_notifications (auth_user_id, type, title, body, related_id)
    select ma.auth_user_id, 'blast', new.title, new.body, new.id::text
    from public.membership_applications ma
    where ma.auth_user_id is not null
      and (
        jsonb_array_length(new.target_cities) = 0
        or ma.city = any (select jsonb_array_elements_text(new.target_cities))
      )
    on conflict (auth_user_id, type, related_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists blasts_notify_on_publish on public.blasts;
create trigger blasts_notify_on_publish
  after insert or update on public.blasts
  for each row execute procedure public.notify_members_on_blast_publish();
