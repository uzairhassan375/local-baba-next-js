-- Home page banner image, admin-uploaded per blast (hosted on Bunny CDN,
-- only the URL lives here) — shown above the announcements ticker on the
-- mobile app for whichever published blasts have one set. Purely additive:
-- existing blasts keep working as text-only announcements if left null.
alter table public.blasts
  add column if not exists image_url text;
