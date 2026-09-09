-- HomeSync Database Schema
-- This schema works with both PostgreSQL and SQLite.
-- For SQLite, the db.js adapter auto-translates incompatible types.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('customer','worker','admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workers (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  category_id TEXT NOT NULL,
  address TEXT DEFAULT '',
  lat REAL,
  lng REAL,
  experience_years INTEGER DEFAULT 0,
  qualification TEXT DEFAULT '',
  languages TEXT DEFAULT '[]',
  service_radius_km INTEGER DEFAULT 10,
  expected_rate REAL DEFAULT 300,
  emergency_contact TEXT DEFAULT '',
  cooperative_member_id TEXT DEFAULT '',
  verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending','under_review','verified','rejected')),
  availability TEXT DEFAULT 'available' CHECK(availability IN ('available','busy','offline')),
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL REFERENCES users(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  UNIQUE(worker_id, skill_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  worker_id INTEGER NOT NULL REFERENCES users(id),
  category_id TEXT NOT NULL,
  is_emergency INTEGER DEFAULT 0,
  scheduled_date TEXT,
  scheduled_time TEXT,
  address TEXT DEFAULT '',
  description TEXT DEFAULT '',
  details TEXT DEFAULT '{}',
  payment_method TEXT DEFAULT 'online',
  service_charge REAL DEFAULT 0,
  additional_charges REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','on_the_way','arrived','in_progress','completed','cancelled','disputed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  status TEXT NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT DEFAULT 'general',
  title TEXT DEFAULT '',
  message TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  amount REAL NOT NULL,
  method TEXT DEFAULT 'online',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','success','failed','refunded')),
  transaction_id TEXT DEFAULT '',
  razorpay_order_id TEXT DEFAULT '',
  razorpay_payment_id TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  customer_name TEXT,
  worker_name TEXT,
  category_id TEXT,
  labour_charge REAL DEFAULT 0,
  additional_charges REAL DEFAULT 0,
  cooperative_fee REAL DEFAULT 0,
  total REAL DEFAULT 0,
  worker_earning REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  transaction_id TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
  worker_id INTEGER NOT NULL REFERENCES users(id),
  overall REAL NOT NULL,
  quality REAL DEFAULT 0,
  professionalism REAL DEFAULT 0,
  timeliness REAL DEFAULT 0,
  comment TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_verification (
  worker_id INTEGER PRIMARY KEY REFERENCES users(id),
  digilocker_verified INTEGER DEFAULT 0,
  verification_mode TEXT DEFAULT 'none',
  verified_at DATETIME,
  reference_id TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS disputes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  raised_by INTEGER NOT NULL REFERENCES users(id),
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'open' CHECK(status IN ('open','resolved','escalated')),
  resolution TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ML/AI tables (written by training scripts, read by API)
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT NOT NULL,
  predicted_bookings INTEGER DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  model_version TEXT DEFAULT 'v1',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT NOT NULL,
  zone TEXT DEFAULT 'default',
  recommendation TEXT DEFAULT '',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
