# Neon Bites — Local Food Ordering Website

A complete, production-ready food ordering e-commerce application for a local food seller, built with **Next.js 14 (App Router)**, **TypeScript**, **Prisma** and **Aiven PostgreSQL**, with **UPI-only payments**, email confirmations, a full admin dashboard and a reporting system — in a premium **dark neon** design.

## 1. Overview

- **Customer journey:** Home → Browse Menu → Product → Add to Cart → Login/Register → Checkout → Address → UPI Payment → Server-verified payment → Confirmation Email → Order Success → My Orders → Live Status Tracking
- **Admin journey:** Admin Login → Dashboard (KPIs + charts) → Categories → Products → Orders → Payment verification → Confirm → Preparing → Ready → Out for Delivery → Delivered → Reports & Exports

## 2. Features

- Customer registration/login/logout, forgot & reset password (bcrypt hashing, JWT httpOnly sessions)
- Menu browsing with search, category/veg/availability filters, sorting, pagination (URL query params)
- Product detail pages with related items and stock indicators
- Persistent server-side cart (per user, DB-backed)
- Checkout with saved/multiple addresses, PIN-code serviceability check, customer notes
- **UPI-only payment** behind a provider abstraction (`MockPaymentProvider` for dev, `RazorpayPaymentProvider` for production)
- **Server-side payment verification** (HMAC signature) + webhook with signature check and full idempotency
- Transactional order creation with server-side price recalculation and stock validation
- Professional HTML order-confirmation email (SMTP via Nodemailer) with `EmailLog`
- Customer account area: profile, addresses (CRUD + default), order history with status timeline
- Admin: dashboard KPIs + Recharts, product CRUD (soft archive), category CRUD, order management with status transition rules, customer activation, payments list, settings, audit logs
- Reports: 8 canned reports + dynamic report builder (allow-listed dimensions/metrics, DB-side aggregation), CSV export
- Security: RBAC (`requireUser`/`requireAdmin`), middleware route protection, rate limiting, Zod validation everywhere, security headers, soft deletes, audit trail
- Responsive dark-neon UI, accessibility, SEO (metadata, sitemap, robots)

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14.2 (App Router, server components) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS 3.4, lucide-react, Recharts |
| DB | Aiven PostgreSQL via Prisma ORM |
| Auth | Custom JWT sessions (`jose`) + `bcryptjs` |
| Validation | Zod (shared client/server schemas) |
| Email | Nodemailer (SMTP abstraction) |
| Payments | Provider abstraction (Mock / Razorpay), UPI only |
| Tests | Vitest |

## 4. Project Structure

```
src/
  app/
    (store)/          # storefront: home, menu, product, cart, checkout, account, auth, legal
    admin/            # dashboard, products, categories, orders, customers, payments, reports, settings, audit-logs
    api/              # auth, cart, checkout, payments, webhooks, admin APIs
  components/         # layout, products, checkout, admin, ui (toast)
  lib/                # db, auth, env, validations, rate-limit, logger, store-config, api-helpers
  services/           # cart, account, catalog, order, order-status, payment, email, reports
  types/
prisma/               # schema.prisma, seed.ts, seed-products.ts, seed-orders.ts
tests/                # vitest unit tests
```

## 5. Prerequisites

- Node.js 18.18+ (Node 20/22 recommended), npm
- A Aiven PostgreSQL database (see `DATABASE_URL` in `.env`)
- (Optional, production) Razorpay account, SMTP email account

## 6. Installation

```bash
npm install
copy .env.example .env        # Windows (cp on macOS/Linux)
```

## 7. Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Aiven PostgreSQL connection string (replace `<ENTER-PASSWORD>` with the real password). Keep `sslmode=require`. |
| `AUTH_SECRET` | Long random string for signing sessions (min 16 chars) |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` | Public app URL |
| `PAYMENT_MODE` | `mock` (dev) or `razorpay` |
| `PAYMENT_PROVIDER_KEY_ID` / `PAYMENT_PROVIDER_KEY_SECRET` | Razorpay API keys (production) |
| `PAYMENT_WEBHOOK_SECRET` | Razorpay webhook secret |
| `EMAIL_HOST/PORT/USER/PASSWORD/FROM/SECURE` | SMTP for order confirmation + password reset emails |

**Never commit `.env`** (already in `.gitignore`). Secrets never reach the browser (no `NEXT_PUBLIC_` prefix for private values) and are never displayed in the admin UI.

## 8. Database Setup & Migrations

```bash
npx prisma generate        # generate the Prisma client
npx prisma migrate dev     # create + apply migrations (development)
npx prisma migrate deploy  # apply migrations (production)
```

For Aiven PostgreSQL: keep `?sslmode=require`. If your driver needs an explicit CA certificate, download the Aiven CA cert and append `&sslrootcert=<path>` — **do not disable certificate verification**.

## 9. Seeding, Admin & Data Cleanup

```bash
npm run prisma:push    # sync the Prisma schema to the DB (idempotent)
npm run prisma:seed    # create/update the admin user + store menu
```

`prisma:seed` creates/updates the admin account (from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) and seeds 5 categories + 15 products. It no longer creates demo customers or demo orders.

To trim the database down to **only** the store owner and the admin (removing all other users and their transactions/orders/carts/addresses/emails), run once during setup:

```bash
npm run prisma:prune
```

`KEEP_USER_EMAIL=srikantak@yahoo.com` and `SEED_ADMIN_EMAIL=srikantak1@gmail.com` are the two accounts that survive the prune.

## 10. Running

```bash
npm run dev        # http://localhost:3000
npm run build      # production build (runs prisma generate first)
npm run start      # production server
npm run typecheck  # tsc --noEmit
npm run lint
npm test           # vitest (17 tests)
```

## 11. Testing

`npm test` covers: registration/phone/password validation, order number format, payment signature verification (valid + tampered), webhook signature checks, order status transition rules (happy path, forbidden jumps, cancellation rules), server-side delivery-fee calculation, and PIN-code serviceability.

## 12. Payment Gateway Setup (Production Checklist)

1. Create a Razorpay merchant account and complete KYC.
2. Set `PAYMENT_PROVIDER_KEY_ID` / `PAYMENT_PROVIDER_KEY_SECRET`.
3. Create a webhook for `https://yourdomain.com/api/webhooks/payment` (events: `payment.captured`, `payment.failed`) and set `PAYMENT_WEBHOOK_SECRET`.
4. Set `PAYMENT_MODE=razorpay`.
5. Test: success, failure, abandoned, duplicate webhook (idempotent — no double confirmation/stock reduction), retry.
6. Mock payments are **hard-blocked** in production (env validation throws). No order is ever confirmed without server-verified payment.

## 13. Email Setup

Configure SMTP (`EMAIL_*`). Confirmation emails are sent **only after verified payment**; failures are recorded in `EmailLog` and never change payment/order status.

## 14. Deployment (Render.com)

A Blueprint is provided in `render.yaml`. Steps:

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo.
3. In the Render dashboard (or a `.env` on your machine) set the secret env vars (leave `sync: false` values uncommitted):
   - `DATABASE_URL` — your Aiven PostgreSQL URL (e.g. `postgresql://avnadmin:***@pg-1197dc1b-srikanta-project1.f.aivencloud.com:25176/defaultdb?sslmode=require`).
   - `AUTH_SECRET` — long random string (min 16 chars).
   - `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` — `https://<your-app>.onrender.com`.
   - `EMAIL_PASSWORD` — your Gmail app password.
4. The first deploy runs `prisma db push --skip-generate && prisma seed`, which creates the schema and the admin (`srikantak1@gmail.com` / password from `SEED_ADMIN_PASSWORD`).
5. After the site is up, run once in the **Render Shell** (or locally against the same DB):
   ```
   npm run prisma:prune
   ```
   This keeps only `srikantak@yahoo.com` + the admin and removes all other users/transactions.

`NODE_ENV=production` and `PAYMENT_MODE=direct` are set in the blueprint (mock is blocked in production). Point the UPI/Razorpay webhook at `https://<your-app>.onrender.com/api/webhooks/payment` if you switch to `PAYMENT_MODE=razorpay`.

`/admin`, `/account`, `/checkout` and `/api` are excluded from the sitemap.

## 15. Security Summary

- bcrypt hashing, httpOnly/SameSite JWT cookies, middleware + server-side RBAC on every admin API
- Server-side recalculation of all prices/totals; stock re-checked inside DB transactions
- Webhook signature verification (`crypto.timingSafeEqual`) + idempotent confirmation
- Rate limiting on login, register, password reset, checkout, payment endpoints
- Zod validation on every input; Prisma parameterised queries only (no user-built SQL)
- Soft deletes for products/categories; order-item snapshots preserve history
- `AdminAuditLog` records who/what/when for sensitive admin actions
- Security headers (HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy); structured logging without secrets

## 16. Troubleshooting

- **`Invalid environment configuration`** — a required env var is missing; the error lists keys (never values).
- **SSL errors** — verify CA cert/`sslmode=require`; never use `sslmode=disable`.
- **Emails not sending** — `EMAIL_*` not configured; attempts logged as FAILED in `EmailLog`.
- **Payments show "mock"** — set `PAYMENT_MODE=razorpay` plus keys for real UPI payments.

## 17. Future Enhancements (architecture is ready)

Coupons/discounts, delivery-staff & kitchen dashboards, WhatsApp/SMS notifications, scheduled orders, ratings, PWA, GST invoices, multi-branch, multi-language (Kannada/Hindi), real-time updates via SSE, Cloudinary/S3 image uploads (currently URL-based in dev).


