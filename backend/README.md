# Local Baba Backend

Flask API shared by the web app (Next.js) and the reseller mobile app. Talks
to Supabase using the service-role key, so it — not individual clients — is
the single place authorization rules live.

## Structuree

```
app/
  core/            shared infra: config, JWT auth, error handlers, Supabase client
  api/
    <feature>/
      routes.py     Flask blueprint + endpoints for this feature
      service.py     external API calls / business logic (only where needed:
                      shopify, images)
wsgi.py             gunicorn entrypoint (`from app import create_app`)
```

Each feature under `app/api/` is self-contained: its blueprint, its request
handling, and (if it talks to something other than Supabase) its own
`service.py`. To add a new feature, copy the shape of an existing one
(`app/api/blasts/` is the simplest example) and register its blueprint in
`app/api/__init__.py`.

## Running locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 wsgi.py            # http://localhost:5000
```

`.env.local` is loaded automatically (see `app/core/config.py`) — no need to `source` it manually first.

## Auth

Every member-scoped endpoint expects:

```
Authorization: Bearer <supabase access_token>
```

Get that token from the Supabase client SDK after sign-in (`supabase.auth.getSession()`
on web, the equivalent on mobile — `supabase-flutter` / `supabase-swift` etc.).
The backend verifies it against the project's JWKS endpoint (`app/core/auth.py`,
ES256 — Supabase signs access tokens with an asymmetric key, not the legacy
shared "JWT Secret") and enforces access rules in Python — it does not rely
on Postgres RLS, since it connects with the service-role key.

Endpoints marked "public" below need no header. Everything else 401s without
a valid token, and further restricts by ownership (e.g. you only ever see
your own orders) or by admin email (`ADMIN_EMAIL` env var) where noted.

Response envelope: `{"success": true, ...}` or `{"success": false, "error": "..."}`.

## Endpoints

### Health
- `GET /health` — public.
- `GET /api/health` — public (same response).

### Shopify integration (`app/api/shopify/`)
Per-member row in the `shopify_integrations` table — no shared/global state.
- `GET /api/shopify/status` — auth required.
- `POST /api/shopify/verify` — auth required. Body: `{shopDomain, accessToken}`.
- `POST /api/shopify/connect` — auth required. Body: `{shopDomain, accessToken, apiSecretKey?, syncPreferences?}`.
- `POST /api/shopify/sync-products` — auth required.
- `POST /api/shopify/disconnect` — auth required.
- `POST /api/shopify/create-product` — auth required. Body: product fields only, no credentials.
- `POST /api/shopify/webhook` — public (called by Shopify), verified via per-shop HMAC secret.

### Images (`app/api/images/`)
- `POST /api/images/search` — public. Body: `{imageUrl?, productName?, limit?}`.

### Subscriptions (`app/api/subscriptions/`)
- `GET /api/subscriptions/status?email=` — auth required (own email, or admin).
- `POST /api/subscriptions/submit` — auth required. Body: `{userEmail, userName?, paymentProofUrl, amount?}`.
- `GET /api/subscriptions/list` — admin only.
- `POST /api/subscriptions/confirm` — admin only. Body: `{subscriptionId}` or `{userEmail}`.
- `POST /api/subscriptions/reject` — admin only. Same body shape.

### Products / catalogue (`app/api/products/`)
- `GET /api/products` — public (non-admin sees `active`/`sold_out` only). Query params: `category`, `catalog_type`, `trending=true`, `landing=true`, `limit`.
- `GET /api/products/<id_or_slug>` — public, same visibility rule.

### Orders (`app/api/orders/`)
- `GET /api/orders` — auth required, own orders only (admin sees all).
- `GET /api/orders/<order_id>` — auth required, 404 if not yours.
- `POST /api/orders` — auth required, creates an order for the caller.
- `PATCH /api/orders/<order_id>` — auth required. Members may only cancel; admin-only fields (`payment_status`, `courier`, `tracking_number`) are rejected from non-admin callers.

### Applications / profile (`app/api/applications/`)
- `POST /api/applications` — public, membership signup form.
- `GET /api/profile` — auth required, caller's own application row.
- `PATCH /api/profile` — auth required. Editable: `name`, `whatsapp`, `city`, `businessName`.

### China delivery prices (`app/api/china_delivery/`)
- `GET /api/china-delivery-prices` — public.

### Blasts / announcements (`app/api/blasts/`)
- `GET /api/blasts` — auth required. Non-admin sees published only; admin sees all.

### Favorites (`app/api/favorites/`)
- `GET /api/favorites` — auth required, caller's own favorited products (joined with `products`).
- `POST /api/favorites` — auth required. Body: `{productId}`.
- `DELETE /api/favorites/<product_id>` — auth required.

### Cart (`app/api/cart/`)
- `GET /api/cart` — auth required, caller's own cart items (joined with `products`).
- `POST /api/cart` — auth required. Body: `{productId, quantity?}` (default 30). Also removes the product from favorites, if present.
- `PATCH /api/cart/<product_id>` — auth required. Body: `{quantity}`.
- `DELETE /api/cart/<product_id>` — auth required, removes one item.
- `DELETE /api/cart` — auth required, clears the whole cart (call after checkout).

### Notifications (`app/api/notifications/`)
Real per-user rows in `member_notifications`, created server-side by the orders/subscriptions endpoints (order placed/payment confirmed/dispatched/delivered/cancelled, subscription submitted/confirmed/rejected) and by a Postgres trigger when an admin publishes a blast.
- `GET /api/notifications` — auth required, caller's own notifications, newest first.
- `POST /api/notifications/mark-all-read` — auth required.
- `PATCH /api/notifications/<id>/read` — auth required.
- `DELETE /api/notifications/<id>` — auth required, permanent delete.

### Invoice branding (`app/api/invoice_settings/`)
Singleton row — the company name/logo shown on admin-printed invoices (`AdminInvoices.tsx`). The logo image itself is uploaded separately via the existing admin-only `/api/upload-media` Next.js route (Bunny CDN); only the resulting URL is saved here.
- `GET /api/invoice-settings` — admin only.
- `PATCH /api/invoice-settings` — admin only. Body: `{companyName?, logoUrl?}`.

## Mobile app integration

The mobile app doesn't need its own Supabase wiring for data — only for
auth. Sign in with the Supabase SDK to get a JWT, then call this backend
exactly like the web app does, with that JWT as the bearer token. See
`frontend/src/lib/api/shopifyApi.ts` and `subscriptionApi.ts` for a reference
client implementation (timeout handling, auth header attachment).

`products`, `orders`, `applications`/`profile`, `china_delivery`, and
`blasts` are fully built and tested against production data but not yet
consumed by the web frontend (which still reads/writes Supabase directly for
those, protected by RLS) — the mobile app can start using them today.

`favorites`, `cart`, and `notifications` are consumed by both the web
frontend and the mobile app's `FavouritesService`/`CartService`/`NotificationsService`
(via `DatabaseService` in `lib/services/database_service.dart`) — neither
stores this locally or reads Supabase directly anymore.
