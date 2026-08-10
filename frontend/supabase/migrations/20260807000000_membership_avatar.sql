-- Profile picture URL (hosted on Bunny CDN, only the URL lives here) for
-- the Flutter app's "upload profile image" feature — was previously
-- referenced by the backend/app code but the column never existed.
alter table public.membership_applications
  add column if not exists avatar_url text;
