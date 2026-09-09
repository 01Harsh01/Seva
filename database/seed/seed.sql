-- ============================================================
-- Seed data — mirrors the frontend's seedDemoData() in
-- js/store.js so the demo experience matches, now sourced from
-- Postgres instead of localStorage.
-- ============================================================

INSERT INTO categories (id, label, icon, rate_min, rate_max, theme, tagline, description) VALUES
  ('electrical', 'Electrical', '⚡', 250, 1000, '{"primary":"#B45309","accent":"#F59E0B"}', 'Power it up. Safely.', 'Certified electricians for wiring, repairs and installations.'),
  ('plumbing', 'Plumbing', '🔧', 300, 800, '{"primary":"#1D4ED8","accent":"#3B82F6"}', 'Fix leaks. Restore flow.', 'Verified local plumbers for repairs, installation and maintenance.'),
  ('carpentry', 'Carpentry', '🪚', 350, 1200, '{"primary":"#92400E","accent":"#B45309"}', 'Build. Repair. Restore.', 'Skilled carpenters for furniture, doors, woodwork and repairs.'),
  ('painting', 'Painting', '🎨', 400, 1500, '{"primary":"#BE185D","accent":"#DB2777"}', 'Color it right, the first time.', 'Interior and exterior painters for a clean, even finish.'),
  ('cleaning', 'Cleaning', '🧹', 200, 700, '{"primary":"#0891B2","accent":"#06B6D4"}', 'Fresh spaces, fair wages.', 'Deep cleaning and household cleaning.'),
  ('domestic', 'Domestic Help', '🏠', 200, 600, '{"primary":"#059669","accent":"#10B981"}', 'Reliable help, every day.', 'Cooking, housekeeping and daily household support.'),
  ('caregiving', 'Caregiving', '🩺', 300, 900, '{"primary":"#BE123C","accent":"#E11D48"}', 'Compassionate care, close to home.', 'Verified caregivers for elder, patient and child care.'),
  ('driving', 'Driving', '🚗', 300, 800, '{"primary":"#4338CA","accent":"#6366F1"}', 'Get there, safely.', 'Verified local and outstation drivers.'),
  ('gardening', 'Gardening', '🌿', 200, 600, '{"primary":"#4D7C0F","accent":"#65A30D"}', 'Grow something good.', 'Lawn care, landscaping and garden maintenance.'),
  ('technician', 'Technician', '🛠️', 300, 1200, '{"primary":"#0F766E","accent":"#14B8A6"}', 'Appliances, fixed right.', 'Verified technicians for AC, fridge, washing machine repair.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO skills (category_id, name) VALUES
  ('electrical','Wiring'), ('electrical','Switch installation'), ('electrical','Fan installation'), ('electrical','Appliance repair'),
  ('plumbing','Pipe repair'), ('plumbing','Leakage repair'), ('plumbing','Bathroom installation'), ('plumbing','Water tank repair'),
  ('carpentry','Furniture repair'), ('carpentry','Door repair'), ('carpentry','Woodwork'), ('carpentry','Modular furniture'),
  ('painting','Interior painting'), ('painting','Exterior painting'), ('painting','Waterproofing'),
  ('cleaning','Deep cleaning'), ('cleaning','Sofa cleaning'), ('cleaning','Bathroom cleaning'),
  ('domestic','Cooking'), ('domestic','Housekeeping'), ('domestic','Laundry'),
  ('caregiving','Elder care'), ('caregiving','Patient care'), ('caregiving','Child care'),
  ('driving','Local driving'), ('driving','Outstation driving'),
  ('gardening','Lawn care'), ('gardening','Pruning'), ('gardening','Landscaping'),
  ('technician','AC repair'), ('technician','Fridge repair'), ('technician','Washing machine repair')
ON CONFLICT DO NOTHING;

-- Demo accounts. Password for ALL demo accounts is: demo1234
-- (bcrypt hash below is for that literal string, cost factor 10 —
-- generated once and hardcoded here since seed data should be
-- deterministic; production user passwords are always hashed at
-- registration time by the API, never seeded like this.)
INSERT INTO users (id, role, name, email, phone, password_hash) VALUES
  ('00000000-0000-0000-0000-000000000001', 'customer', 'Demo Customer', 'customer@homesync.demo', '9800000001', '$2b$10$Dgw1Q0w0ZVXgXphosGpmGuHjSLgfVrbM1Qu/UR8/5Xl7sSZAlnoi2'),
  ('00000000-0000-0000-0000-000000000002', 'admin', 'Cooperative Admin', 'admin@homesync.demo', '9800000002', '$2b$10$Dgw1Q0w0ZVXgXphosGpmGuHjSLgfVrbM1Qu/UR8/5Xl7sSZAlnoi2'),
  ('00000000-0000-0000-0000-000000000003', 'worker', 'Ravi Kumar', 'worker1@homesync.demo', '9800000003', '$2b$10$Dgw1Q0w0ZVXgXphosGpmGuHjSLgfVrbM1Qu/UR8/5Xl7sSZAlnoi2'),
  ('00000000-0000-0000-0000-000000000004', 'worker', 'Amit Singh', 'worker2@homesync.demo', '9800000004', '$2b$10$Dgw1Q0w0ZVXgXphosGpmGuHjSLgfVrbM1Qu/UR8/5Xl7sSZAlnoi2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (user_id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO admins (user_id) VALUES ('00000000-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;

INSERT INTO workers (user_id, category_id, address, lat, lng, experience_years, qualification, languages, service_radius_km, availability, expected_rate, emergency_contact, cooperative_member_id, verification_status, rating, rating_count, completed_jobs)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'carpentry', 'Ganeshguri, Guwahati', 26.15, 91.74, 8, 'ITI Certified', ARRAY['Assamese','Hindi','English'], 12, 'available', 500, '112', 'NITA-COOP-1001', 'verified', 4.8, 142, 142),
  ('00000000-0000-0000-0000-000000000004', 'plumbing', 'Dispur, Guwahati', 26.14, 91.78, 7, 'Trade Certified', ARRAY['Hindi','Assamese'], 10, 'available', 300, '112', 'NITA-COOP-1002', 'verified', 4.9, 186, 186)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_verification (worker_id, digilocker_verified, verification_mode, verified_at, reference_id)
VALUES
  ('00000000-0000-0000-0000-000000000003', true, 'demo_mock', now(), 'DEMO-VERIFY-REF-1001'),
  ('00000000-0000-0000-0000-000000000004', true, 'demo_mock', now(), 'DEMO-VERIFY-REF-1002')
ON CONFLICT (worker_id) DO NOTHING;

INSERT INTO welfare_records (worker_id, insurance_status, scheme_status, emergency_assistance) VALUES
  ('00000000-0000-0000-0000-000000000003', 'active', 'active', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'pending', 'active', 'not_applicable')
ON CONFLICT (worker_id) DO NOTHING;

-- Historical bookings for the demand forecaster (see ml/training).
-- Generated with randomized-but-realistic distribution across the
-- last 60 days, weighted toward plumbing/electrical (matches the
-- "Very High" / "High" demo forecast levels shown in the admin UI).
DO $$
DECLARE
  i INT;
  cats TEXT[] := ARRAY['plumbing','plumbing','plumbing','electrical','electrical','carpentry','painting','cleaning','domestic','gardening','technician','caregiving','driving'];
  cat TEXT;
  wkr UUID;
  days_ago INT;
  amt NUMERIC;
  bid UUID;
BEGIN
  FOR i IN 1..80 LOOP
    cat := cats[1 + floor(random() * array_length(cats,1))::int];
    wkr := CASE WHEN cat = 'plumbing' THEN '00000000-0000-0000-0000-000000000004'::uuid ELSE '00000000-0000-0000-0000-000000000003'::uuid END;
    days_ago := floor(random() * 45)::int;
    amt := 300 + floor(random() * 500);
    bid := gen_random_uuid();
    INSERT INTO bookings (id, customer_id, worker_id, category_id, status, is_emergency, scheduled_date, address, service_charge, created_at)
    VALUES (bid, '00000000-0000-0000-0000-000000000001', wkr, cat, 'completed', random() < 0.12,
            (now() - (days_ago || ' days')::interval)::date, 'Demo address, Guwahati', amt, now() - (days_ago || ' days')::interval);
    INSERT INTO payments (booking_id, amount, method, status, transaction_id)
    VALUES (bid, amt * 1.08, 'online', 'paid', 'TXN' || bid);
  END LOOP;
END $$;
