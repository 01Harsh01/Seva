# HomeSync — Cooperative-owned Digital Service Marketplace

Built for **SIH 2026, Problem Statement 89**: *Cooperative-owned Digital Service
Marketplace for Labour Cooperative Federations and Labour Cooperative Societies.*

HomeSync connects verified skilled workers (electricians, plumbers, carpenters,
painters, domestic help, caregivers, drivers, gardeners, technicians and more)
with customers, through a marketplace owned and governed by the labour
cooperative — not a private gig platform.

## What changed from the original HomeSync

The original HomeSync was a household-inventory / consumption-tracking app
built on Firebase Auth + Firestore. That domain doesn't map onto a labour
marketplace, and Firebase was tightly coupled to it, so this version:

- Removes Firebase entirely (no Google sign-in, no Firestore, no API keys).
- Replaces it with a small local data layer (`js/store.js`) using
  `localStorage` as a demo database — the whole app runs as a static site,
  no backend required to try it out.
- Keeps the original visual theme (`styles.css`, Inter font, card/badge
  language) and layers the marketplace UI on top (`marketplace.css`).
- Removes the receipt-scanning / reorder-agent pages that don't apply to a
  service marketplace.

`js/store.js` is written so every function (`getWorkers`, `createBooking`,
`recordPayment`, …) can be re-implemented against a real backend
(Firestore, Postgres, whatever the cooperative federation runs) later
without changing any page.

## Tech stack

Plain HTML + CSS + vanilla JS (ES modules) — same stack as the original
project. No build step. No framework. Leaflet/OpenStreetMap for maps.

## Running locally

No install needed — it's static files.

```bash
npx serve .
# or just open index.html directly in a browser
```

## Deploying

**Netlify / Vercel / GitHub Pages** — point at the repo root, no build
command required (`netlify.toml` is already configured with
`publish = "."`).

## Demo accounts

| Role     | Email                     | Password  |
|----------|---------------------------|-----------|
| Customer | customer@homesync.demo    | demo1234  |
| Worker   | worker1@homesync.demo     | demo1234  |
| Admin    | admin@homesync.demo       | demo1234  |

(17 more demo workers exist across every category — `worker2@homesync.demo`
through `worker18@homesync.demo`, same password — created automatically the
first time the app loads, in `seedDemoData()` inside `js/store.js`.)

To wipe the demo data and reseed, open the browser console on any page and
run:
```js
import("./js/store.js").then(m => { m.resetDemoData(); location.reload(); });
```

## SIH Demo Flow

**Customer:** Login → Find a Service → Select Plumbing → View Nearby
Verified Workers → Select Worker → View Profile → Book Service → Select
Date & Time → Confirm Booking → Payment → Booking Confirmed → Worker
Accepts → Service Completed → Invoice Generated → Customer Rates Worker.

**Worker:** Login → Dashboard → Receive Booking → Accept → Complete
Service → View Earnings → View Rating.

**Admin:** Login → Dashboard → Verify Workers → Monitor Bookings → View
Payments → View Worker Welfare → View AI Demand Forecast → View AI
Workforce Allocation → Manage Disputes.

## SIH Problem Statement 89 — feature mapping

| Requirement | Where it lives |
|---|---|
| Role-based access (Customer / Worker / Admin) | `js/store.js` (`login`, `requireAuth`), separate dashboards |
| Worker registration & verification states | `register.html`, `js/store.js` (`registerWorker`, `setWorkerVerification`) |
| Skill profiling & certifications | `register.html`, `worker-dashboard.html#skills` |
| Service marketplace with filters | `marketplace.html` |
| Geo-location matching & ranking | `js/store.js` (`distanceKm`, `findMatches`), `marketplace.html`, `map.html` |
| Booking & scheduling | `booking.html`, `js/store.js` (`createBooking`, `updateBookingStatus`) |
| Emergency / on-demand services | `emergency.html` |
| Digital payments (demo mode) | `payment.html`, `js/store.js` (`recordPayment`) |
| Digital invoice | `invoice.html`, `js/store.js` (`generateInvoice`) |
| Ratings & feedback | `customer-dashboard.html`, `js/store.js` (`addReview`) |
| Worker welfare & insurance | `worker-dashboard.html#welfare`, `admin-dashboard.html#welfare` |
| Cooperative admin dashboard | `admin-dashboard.html` |
| AI-assisted demand forecasting (statistical, clearly labelled) | `js/store.js` (`demandForecast`), `admin-dashboard.html#forecast` |
| AI-assisted workforce allocation | `js/store.js` (`workforceAllocation`), `admin-dashboard.html#analytics` |
| Multilingual (English / Hindi / Assamese) | `js/i18n.js` |
| Notifications (in-app) | `js/store.js` (`notify`, `getNotifications`), bell icon in header |
| Fair wage / transparent pricing | Cooperative fee and worker earning shown on every booking/invoice |
| Safety & trust (verified badge, disputes) | `verificationBadge()` in `js/ui.js`, `admin-dashboard.html#disputes` |
| Map-based discovery | `map.html` (Leaflet + OpenStreetMap) |

## Honest limitations (by design, not oversight)

- **Payments** are demo-mode only — no real Razorpay order is created. The
  UI, invoice, and success/failure states are wired up so a backend
  function can be dropped in later (see `.env.example`).
- **AI demand forecasting** is an explicit statistical trend calculation
  over booking history, not a trained ML model — the UI says so. Swap in
  a real model once there's production data.
- **Geocoding** for worker addresses is simulated (random points near
  Guwahati) since no geocoding API key is configured.
- There is **no real backend** — all data is per-browser `localStorage`,
  so it won't sync across devices. That's the trade-off for a
  zero-config, zero-cost static deploy; see `js/store.js` for where a
  real API would slot in.
- The **3D category hero visuals** are abstract, procedurally-generated
  shapes (via three.js), not photographs of tradespeople or job sites —
  there's no real photo library wired up, and using unrelated stock
  images would violate the "no random unrelated stock images" rule this
  build was scoped against. Swap `mountCategoryScene()` in
  `js/scene3d.js` for a real image/video hero once licensed photography
  is available.

## Dynamic, category-aware architecture (added on top of the marketplace)

HomeSync no longer shows the same generic page for every service. One
reusable page, `category.html`, renders a completely different-feeling
experience per category — theme, hero copy, 3D hero shape, services,
FAQs, testimonials, features and booking questions — all driven by a
single config file.

**How it works**

- `js/categoryConfig.js` — the single source of truth. `DEFAULT_CONFIG`
  holds each category's theme colors, tagline, description, services,
  FAQs, features, testimonials, emergency types and dynamic booking
  fields. `getCategoryConfig(id)` merges those defaults with any admin
  edits (stored as an override layer in `localStorage`, so it's a drop-in
  replacement for a real "categories" Firestore/Postgres collection later).
- `js/theme.js` — `applyCategoryTheme(theme)` sets CSS custom properties
  (`--cat-primary`, `--cat-accent`, `--cat-gradient`, …) on `:root`, which
  every themed element (hero, buttons, badges, cards) reads from. HomeSync's
  base brand colors stay as the fallback, so every category still looks
  like the same product underneath its accent.
- `js/scene3d.js` — a small, lazily-loaded three.js scene behind each
  category hero: a rotating primitive (torus for plumbing, box for
  carpentry, cone for painting/gardening, etc.) colored from that
  category's theme. This is intentionally abstract rather than a stock
  photo — see "Honest limitations" below. It's skipped entirely (falls
  back to a static gradient) when the visitor has `prefers-reduced-motion`
  set, and it's torn down cleanly on every category switch so nothing
  leaks between pages.
- `category.html` — the one reusable page. Reads `?category=` from the
  URL (or `/services/:category` via the Netlify redirect in
  `netlify.toml`), loads that category's config, and renders the hero,
  service grid, filtered/ranked worker list, AI recommendation panel,
  features, testimonials and FAQs together — no stale content from the
  previous category flashes while switching.
- `booking.html` now renders **category-specific questions** (e.g.
  "leak location" for plumbing, "appliance involved" for electrical)
  from `categoryConfig.bookingFields` instead of one fixed form.
- `emergency.html` is now category-aware too — pick a category (or land
  on `emergency.html?category=plumbing` directly) and get that
  category's emergency types, theme and matched workers.
- `admin-dashboard.html` → **Categories** tab lets a cooperative admin
  edit tagline, description, and accent color inline, plus an
  "Advanced" JSON editor for services/FAQs/features/testimonials/
  emergency types/booking fields — no code changes needed. Categories
  can be deactivated but not deleted once they have bookings attached,
  to keep booking history intact.

**Adding a new category:** add its id/label/icon/skills/rate range to
`CATEGORIES` in `js/store.js`, then add a matching entry to
`DEFAULT_CONFIG` in `js/categoryConfig.js`. Everything else (routing,
theming, booking form, admin editing) picks it up automatically.

**Testing each category:** open `category.html?category=<id>` for any
of `electrical, plumbing, carpentry, painting, cleaning, domestic,
caregiving, driving, gardening, technician` — or, once deployed on
Netlify, `/services/<id>`.

## Premium 3D / glassmorphism interaction layer

Layered on top of the dynamic category system, without a framework
swap (this project stays vanilla HTML/CSS/JS, so "React Three Fiber /
Framer Motion" became their vanilla equivalents — same visual result,
no build step added):

- **`js/scene3d.js`** — `mountHeroFieldScene()` renders a small cluster
  of floating, softly-lit primitives + drifting particles behind the
  homepage hero, colored from the first five category accents.
  `mountCategoryScene()` (already existed) now also gets a fake
  contact-shadow blob beneath the shape and cursor-parallax (the
  whole group tilts gently toward the pointer). Both fall back to a
  static CSS gradient — no WebGL at all — for `prefers-reduced-motion`
  or `isLowPowerDevice()` (small screens / low core count without a
  fine pointer).
- **`js/tilt.js`** — perspective tilt-on-hover, applied automatically
  to compact tile-like cards (category tiles, worker cards, stat
  tiles) — deliberately **not** applied to large content cards (forms,
  tables, the invoice box), since tilting a form while someone's
  typing in it reads as a bug, not a feature. Skipped entirely on
  touch devices and reduced-motion.
- **`js/parallax.js`** — cheap, rAF-throttled scroll parallax for the
  decorative gradient "blobs" behind hero/section backgrounds
  (`[data-parallax]`), disabled on mobile and reduced-motion.
- **CSS** — floating glass navbar (`.hs-header`), `.glass-card` /
  `.glass-btn` utilities, cinematic hero typography (`.hero-3d`), and
  an active-page nav indicator. `overflow-x: hidden` on `html, body`
  guarantees no horizontal scroll on any breakpoint.

All three JS files are imported once from `js/ui.js`, which every page
already loads — so the effects apply site-wide without editing markup
per page, and re-scan automatically when dashboards inject new content
(tab switches, filtered worker grids, etc.) via a debounced
`MutationObserver`.

## Original "mascot badge" component (`js/mascot.js`)

A small, dimensional badge per category — a glossy shaded sphere in
that category's theme color, carrying its icon, with a soft contact
shadow and a gentle float animation — built entirely from CSS
(gradient highlight + inset shadow for the sphere shading, no images).
This exists because stock character illustrations aren't something
this project has a license to use; the badge achieves the same
"friendly, dimensional, tool-themed" feel as an original asset instead.

Applied where a badge-sized accent fits naturally: the homepage
category grid, the category-page hero, and the emergency category
picker. Worker initials avatars across the app (`marketplace.html`,
`booking.html`, `category.html`, `worker-profile.html`) got the same
glossy-sphere shading treatment, tinted to that worker's category
color via a `--avatar-color` CSS variable, instead of a flat color
fill.

**Deliberately not everywhere:** chip-sized UI (the category switcher
row, small filter chips) keeps plain icons — a badge that size reads
as noise, not polish.

## Platform Capabilities page (`features.html`)

A dedicated, animated feature showcase covering the same 15 SIH-89
capabilities (registration & verification, skill profiling, booking,
geo-matching, payments, ratings, welfare, emergency booking, admin
dashboard, multilingual support, AI forecasting, workforce allocation,
cloud-readiness, mobile responsiveness) as interactive glass cards with
mascot badges — built with the site's own components rather than
static reference images. Linked from the homepage's closing CTA.
