-- Undoes 20260806000000_blasts_image.sql — the home banner feature moved
-- to its own dedicated table (mobile_banners) instead of living on blasts,
-- since blasts are shared with the website's member dashboard and this
-- content must stay mobile-app-only. Safe to run whether or not the
-- previous migration was ever applied.
alter table public.blasts
  drop column if exists image_url;
