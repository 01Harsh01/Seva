-- ============================================================
-- HomeSync PostgreSQL schema — replaces the localStorage store
-- (js/store.js in the frontend) as the system of record.
--
-- Run order: this file is idempotent (IF NOT EXISTS / DROP TYPE
-- guards) so it can be re-run safely during development.
-- ============================================================

-- ---------- Enum types ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'worker', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'under_review', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('created', 'pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('online', 'cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'worker_response', 'resolved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE welfare_state AS ENUM ('active', 'pending', 'not_available', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE availability_state AS ENUM ('available', 'busy', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Core identity ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          user_role NOT NULL,
  name          TEXT NOT NULL,
  email         CITEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Categories & services (admin-configurable) ----------
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,           -- e.g. 'plumbing'
  label       TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '',
  rate_min    NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_max    NUMERIC(10,2) NOT NULL DEFAULT 0,
  theme       JSONB NOT NULL DEFAULT '{}',
  tagline     TEXT,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  base_price  NUMERIC(10,2) NOT NULL,
  price_unit  TEXT NOT NULL DEFAULT 'per visit',
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  UNIQUE (category_id, name)
);

-- ---------- Workers ----------
CREATE TABLE IF NOT EXISTS workers (
  user_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  category_id            TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  address                TEXT,
  lat                    DOUBLE PRECISION,
  lng                    DOUBLE PRECISION,
  experience_years       INTEGER NOT NULL DEFAULT 0,
  qualification          TEXT,
  languages              TEXT[] NOT NULL DEFAULT '{}',
  service_radius_km      NUMERIC(5,1) NOT NULL DEFAULT 10,
  availability           availability_state NOT NULL DEFAULT 'offline',
  expected_rate          NUMERIC(10,2) NOT NULL DEFAULT 0,
  emergency_contact      TEXT,
  cooperative_member_id  TEXT UNIQUE,
  verification_status    verification_status NOT NULL DEFAULT 'pending',
  rating                 NUMERIC(2,1) NOT NULL DEFAULT 0,
  rating_count           INTEGER NOT NULL DEFAULT 0,
  completed_jobs         INTEGER NOT NULL DEFAULT 0,
  location_sharing       BOOLEAN NOT NULL DEFAULT false, -- worker-controlled; only meaningful during an active booking
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workers_category ON workers(category_id);
CREATE INDEX IF NOT EXISTS idx_workers_verification ON workers(verification_status);
CREATE INDEX IF NOT EXISTS idx_workers_location ON workers(lat, lng);

CREATE TABLE IF NOT EXISTS worker_skills (
  worker_id UUID NOT NULL REFERENCES workers(user_id) ON DELETE CASCADE,
  skill_id  UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, skill_id)
);

CREATE TABLE IF NOT EXISTS worker_certifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    UUID NOT NULL REFERENCES workers(user_id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  verified     BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS worker_availability (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID NOT NULL REFERENCES workers(user_id) ON DELETE CASCADE,
  weekday    SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  UNIQUE (worker_id, weekday, start_time)
);

-- Time-series location pings — only meaningful while an active
-- booking is in progress and worker.location_sharing = true (see
-- "Live Worker Tracking" in the service layer). Old rows should be
-- pruned by a scheduled job in production; not implemented here.
CREATE TABLE IF NOT EXISTS worker_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID NOT NULL REFERENCES workers(user_id) ON DELETE CASCADE,
  booking_id UUID,   -- FK added after bookings table exists
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DigiLocker identity verification — see backend/src/services/digilockerService.js.
-- Only minimum verification metadata is stored; NEVER Aadhaar numbers or documents.
CREATE TABLE IF NOT EXISTS worker_verification (
  worker_id         UUID PRIMARY KEY REFERENCES workers(user_id) ON DELETE CASCADE,
  digilocker_verified BOOLEAN NOT NULL DEFAULT false,
  verification_mode   TEXT NOT NULL DEFAULT 'none' CHECK (verification_mode IN ('none', 'demo_mock', 'digilocker_live')),
  verified_at         TIMESTAMPTZ,
  reference_id        TEXT   -- opaque token returned by DigiLocker/mock, never a document ID
);

-- ---------- Welfare & training ----------
CREATE TABLE IF NOT EXISTS welfare_records (
  worker_id           UUID PRIMARY KEY REFERENCES workers(user_id) ON DELETE CASCADE,
  insurance_status    welfare_state NOT NULL DEFAULT 'pending',
  scheme_status       welfare_state NOT NULL DEFAULT 'pending',
  emergency_assistance welfare_state NOT NULL DEFAULT 'not_applicable',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS worker_training (
  worker_id  UUID NOT NULL REFERENCES workers(user_id) ON DELETE CASCADE,
  course_id  UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (worker_id, course_id)
);

-- ---------- Bookings ----------
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  worker_id        UUID NOT NULL REFERENCES workers(user_id) ON DELETE RESTRICT,
  category_id      TEXT NOT NULL REFERENCES categories(id),
  status           booking_status NOT NULL DEFAULT 'pending',
  is_emergency     BOOLEAN NOT NULL DEFAULT false,
  scheduled_date   DATE,
  scheduled_time   TIME,
  address          TEXT NOT NULL,
  description      TEXT,
  details          JSONB NOT NULL DEFAULT '{}',   -- dynamic category-specific booking answers
  payment_method   payment_method NOT NULL DEFAULT 'online',
  service_charge   NUMERIC(10,2) NOT NULL,
  additional_charges NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_category_date ON bookings(category_id, created_at);

ALTER TABLE worker_locations
  ADD CONSTRAINT fk_worker_locations_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS booking_status_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status     booking_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Payments & invoices ----------
CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,
  method            payment_method NOT NULL,
  status            payment_status NOT NULL DEFAULT 'created',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  transaction_id    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

CREATE TABLE IF NOT EXISTS invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number     TEXT NOT NULL UNIQUE,
  booking_id         UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  labour_charge      NUMERIC(10,2) NOT NULL,
  additional_charges NUMERIC(10,2) NOT NULL DEFAULT 0,
  cooperative_fee    NUMERIC(10,2) NOT NULL,
  worker_earning     NUMERIC(10,2) NOT NULL,
  total              NUMERIC(10,2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Reviews ----------
CREATE TABLE IF NOT EXISTS reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id        UUID NOT NULL REFERENCES workers(user_id) ON DELETE CASCADE,
  overall_rating   SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating   SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  professionalism_rating SMALLINT CHECK (professionalism_rating BETWEEN 1 AND 5),
  timeliness_rating SMALLINT CHECK (timeliness_rating BETWEEN 1 AND 5),
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON reviews(worker_id);

-- ---------- Disputes ----------
CREATE TABLE IF NOT EXISTS disputes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by    UUID NOT NULL REFERENCES users(id),
  reason       TEXT NOT NULL,
  status       dispute_status NOT NULL DEFAULT 'open',
  worker_response TEXT,
  resolution   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- ---------- Notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_status);

-- ---------- AI / demand forecasting ----------
-- Populated by ml/training + ml/inference (see that folder); the
-- Node API reads the latest row per (category, period) rather than
-- calling Python synchronously on every request.
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      TEXT NOT NULL REFERENCES categories(id),
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  predicted_bookings NUMERIC(10,2) NOT NULL,
  model_version    TEXT NOT NULL,          -- e.g. 'statistical-v1' or 'rf-v1'
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_allocations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   TEXT NOT NULL REFERENCES categories(id),
  zone          TEXT,
  recommendation TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Audit log ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
