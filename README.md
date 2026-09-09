# HomeSync — Cooperative-owned Digital Service Marketplace

Built for **SIH 2026, Problem Statement 89**. This repo has four parts:

```
HomeSync-main/   Frontend — static HTML/CSS/JS, deployable as-is (Netlify/Vercel/GitHub Pages)
backend/         REST API — Node/Express + PostgreSQL, JWT auth, RBAC
database/        SQL migrations + seed data for PostgreSQL
ml/              Python demand-forecasting model (scikit-learn)
```

## Honest status — what's real vs. mocked vs. not yet wired up

This matters more than a features list. Every line below reflects what
was actually built and tested, not what the spec asked for.

| Piece | Status |
|---|---|
| Postgres schema (25 tables, FKs, constraints, indexes) | **Real.** Migrations run clean against a live Postgres 16 instance. |
| Seed data (categories, skills, 4 demo users, 2 workers, 80 historical bookings) | **Real.** Loaded and queried successfully. |
| Express API: register/login, JWT, bcrypt | **Real & tested** — correct password, wrong password, wrong role, duplicate email all verified with curl against the live DB. |
| RBAC (role-based authorization) | **Real & tested** — customer hitting an admin route gets a genuine 403; unauthenticated requests get a genuine 401. Role is always read from the verified JWT, never trusted from the client. |
| Booking lifecycle + state machine | **Real & tested** — invalid transitions (e.g. `pending → completed`) rejected, valid ones succeed, cross-user unauthorized updates blocked, every change logged to `booking_status_history`. |
| SmartMatch engine (configurable weighted scoring) | **Real & tested** — verified against real haversine distance calculations, returns match score + estimated arrival. Weights configurable via env vars. |
| Admin dashboard stats | **Real** — computed with live SQL aggregates, not mock numbers. |
| DigiLocker verification | **Mock only, clearly labeled** (`verification_mode: "demo_mock"` in every API response). No real DigiLocker OAuth — that requires officially issued credentials this project doesn't have. The service is written behind an interface (`digilockerService.js`) so a real adapter can be dropped in later without touching calling code. |
| Razorpay payments | **Written, NOT integration-tested.** The order-creation and HMAC signature-verification logic is real and follows Razorpay's documented API, but I don't have a merchant account's real keys to test against. Without keys configured, the endpoint returns a clear `501 not configured` rather than faking success. |
| AI demand forecasting | **Real, trained model** (RandomForestRegressor via scikit-learn), actually run against the seeded booking data, writing real predictions into `demand_forecasts`, served by a real API endpoint. **But**: 80 seeded rows across 10 categories is a toy dataset — the pipeline is genuinely real, the predictions aren't something to staff around yet. Re-run `ml/training/train_forecast.py` as real bookings accumulate. |
| Frontend ↔ backend integration | **Partial, by design.** Only `login.html` and the customer half of `register.html` call the real API (`js/api.js`), with a "backend unreachable → fall back to local demo mode" path so the static frontend still works standalone when deployed without a backend. Every other page (bookings, worker profiles, payments, reviews, all three dashboards) still reads/writes `js/store.js`'s `localStorage` layer. Migrating those is real, separate follow-up work — see "Next migration steps" below. |
| Dashboard animations | **Cleaned up per request** — admin/worker/customer dashboards now render stat numbers, badges, and table rows immediately at full opacity (no fade-in, no stagger, no count-up-from-zero), while the rest of the site keeps its animated treatment. |

## Architecture

```
Browser (HomeSync-main/)
  │
  ├─ login.html / register.html ──► js/api.js ──► backend/ (Express) ──► PostgreSQL
  │                                                    │
  │                                                    └─► ml/ writes demand_forecasts,
  │                                                        API reads them back
  │
  └─ every other page ──► js/store.js ──► localStorage (unmigrated, see status table)
```

## Database schema

See `database/migrations/001_init.sql` for the full DDL. Summary of relationships:

```
users ──┬── customers
        ├── admins
        └── workers ──┬── worker_skills ── skills ── categories
                       ├── worker_certifications
                       ├── worker_availability
                       ├── worker_locations (time-series, booking-scoped)
                       ├── worker_verification (DigiLocker status)
                       └── welfare_records

bookings ──┬── booking_status_history
           ├── payments
           ├── invoices
           ├── reviews
           └── disputes

demand_forecasts, worker_allocations   (written by ml/, read by /api/ai/*)
notifications, audit_logs
```

## API reference

Base URL: `http://localhost:4000` in development.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | none | Liveness check |
| POST | `/api/auth/register` | none | `{ role, name, email, phone, password }` → `{ token, user }` |
| POST | `/api/auth/login` | none | `{ email, password, role? }` → `{ token, user }` |
| GET | `/api/auth/me` | JWT | Current user, derived from the token |
| GET | `/api/workers` | none | List verified workers, optional `?category=` |
| GET | `/api/workers/nearby` | none | SmartMatch-ranked workers — `?category=&lat=&lng=` |
| GET | `/api/workers/:id` | none | Public worker profile + skills |
| PUT | `/api/workers/profile` | JWT, worker | Create/update own worker profile |
| POST | `/api/bookings` | JWT, customer | Create a booking |
| GET | `/api/bookings/my` | JWT | Own bookings (customer or worker, scoped server-side) |
| PUT | `/api/bookings/:id/status` | JWT | Status transition, validated against the state machine |
| POST | `/api/payments/create-order` | JWT | Razorpay order (501 if not configured) |
| POST | `/api/payments/verify` | JWT | HMAC signature verification |
| POST | `/api/payments/webhook` | none (Razorpay-signed) | Authoritative payment confirmation |
| POST | `/api/reviews` | JWT, customer | Rate a completed booking (once per booking) |
| GET | `/api/reviews/worker/:id` | none | A worker's reviews |
| POST | `/api/verification/digilocker/start` | JWT, worker | Returns a demo consent URL |
| GET | `/api/verification/digilocker/callback` | JWT, worker | Completes the mock verification |
| GET | `/api/verification/status` | JWT, worker | Current verification status |
| GET | `/api/admin/dashboard` | JWT, admin | Real aggregate stats |
| GET | `/api/admin/workers` | JWT, admin | Workers pending/verified, with DigiLocker status |
| PUT | `/api/admin/workers/:id/verify` | JWT, admin | Approve/reject/re-review |
| GET | `/api/ai/demand-forecast` | JWT, admin | Latest per-category ML forecast |
| GET | `/api/ai/workforce-recommendation` | JWT, admin | Latest allocation recommendations |

## Running it locally

**1. Database**
```bash
createdb homesync
psql -d homesync -f database/migrations/000_extensions.sql
psql -d homesync -f database/migrations/001_init.sql
psql -d homesync -f database/seed/seed.sql
```

**2. Backend**
```bash
cd backend
cp .env.example .env   # fill in DB credentials + JWT_SECRET at minimum
npm install
npm start               # listens on :4000
```

**3. ML forecasting** (run once after seeding, and again as real data accumulates)
```bash
cd ml
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=homesync \
  ./venv/bin/python training/train_forecast.py
```

**4. Frontend**
```bash
cd HomeSync-main
npx serve .
```
By default `js/api.js` points at `http://localhost:4000`. To point a deployed frontend at a deployed backend, set `window.HS_API_BASE = "https://your-backend-url"` in a small inline script before `js/ui.js` loads on the pages that need it (currently `login.html`/`register.html`).

If the backend isn't running or reachable, login/register automatically fall back to the local `localStorage` demo mode — the frontend still works standalone.

## Demo credentials

Same across both the real backend and the localStorage fallback:

| Role | Email | Password |
|---|---|---|
| Customer | customer@homesync.demo | demo1234 |
| Worker | worker1@homesync.demo | demo1234 |
| Admin | admin@homesync.demo | demo1234 |

## Deploying

- **Frontend** → Netlify/Vercel/GitHub Pages, same as before (see `HomeSync-main/README.md`).
- **Backend** → Render/Railway/Fly.io. Set all vars from `backend/.env.example`, point `DATABASE_URL` at a managed Postgres instance, then run the migration + seed commands (`npm run migrate`, `npm run seed`) once against it.
- **ML** → run `train_forecast.py` on a schedule (cron/GitHub Action) against the same production database, writing into `demand_forecasts` for the API to serve.

## Next migration steps (not done in this pass — listed honestly, not silently skipped)

1. Migrate worker registration to the real backend (currently local-only, since it needs the worker-profile fields wired through `PUT /api/workers/profile` after account creation, not just the auth call).
2. Migrate `marketplace.html`, `category.html`, `worker-profile.html`, `booking.html`, `emergency.html`, `map.html` from `js/store.js` to `js/api.js` calls against `/api/workers/nearby`, `/api/bookings`, etc.
3. Migrate the three dashboards (`admin-dashboard.html`, `worker-dashboard.html`, `customer-dashboard.html`) to real endpoints (`/api/admin/*`, `/api/bookings/my`, `/api/ai/*`).
4. Wire `payment.html` to `/api/payments/create-order` + the Razorpay Checkout script, once real merchant keys exist to test against.
5. Build a real DigiLocker adapter once official OAuth credentials are issued (the interface in `digilockerService.js` is ready for it).
6. Add live worker location pings (`worker_locations` table already exists) during an active booking, with the "stop after job completion" rule enforced server-side.
