-- Admin-editable invoice branding (company name + logo) shown on printed
-- invoices in the admin panel. Singleton row, accessed exclusively through
-- the Flask backend's service-role client — RLS enabled with no permissive
-- policies, same convention as member_favorites/member_cart/member_notifications.

create table if not exists public.invoice_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Local Baba',
  logo_url text,
  updated_at timestamptz not null default now()
);

alter table public.invoice_settings enable row level security;

drop trigger if exists invoice_settings_set_updated_at on public.invoice_settings;
create trigger invoice_settings_set_updated_at
  before update on public.invoice_settings
  for each row execute procedure public.set_updated_at();
