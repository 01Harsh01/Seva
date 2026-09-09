// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { initDb, pool, getDbType } = require("./src/config/db");
const authRoutes = require("./src/routes/auth");
const workersRoutes = require("./src/routes/workers");
const bookingsRoutes = require("./src/routes/bookings");
const paymentsRoutes = require("./src/routes/payments");
const verificationRoutes = require("./src/routes/verification");
const reviewsRoutes = require("./src/routes/reviews");
const adminRoutes = require("./src/routes/admin");
const aiRoutes = require("./src/routes/ai");
const { errorHandler } = require("./src/middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get("/api/health", (req, res) => res.json({
  status: "ok",
  demoMode: process.env.DEMO_MODE === "true",
  dbType: getDbType(),
}));

app.use("/api/auth", authRoutes);
app.use("/api/workers", workersRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found." }));
app.use(errorHandler);

// ── Demo data seeding ──
async function seedDemoData() {
  // If PostgreSQL is in use, migrations and seed are handled via seed.sql
  if (getDbType() === "postgres") {
    return;
  }
  try {
    const bcrypt = require("bcryptjs");
    const existing = await pool.query("SELECT id FROM users LIMIT 1");
    if (existing.rows.length > 0) {
      console.log("[Seed] Demo data already exists, skipping.");
      return;
    }

    console.log("[Seed] Inserting demo users and workers...");
    const hash = await bcrypt.hash("demo1234", 10);

    // Admin
    await pool.query(
      "INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)",
      ["admin", "Cooperative Admin", "admin@homesync.demo", "9800000002", hash]
    );

    // Customer
    await pool.query(
      "INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)",
      ["customer", "Demo Customer", "customer@homesync.demo", "9800000001", hash]
    );
    const custResult = await pool.query("SELECT id FROM users WHERE email = 'customer@homesync.demo'");
    const custId = custResult.rows[0]?.id;
    if (custId) {
      await pool.query("INSERT INTO customers (user_id) VALUES (?)", [custId]);
    }

    // Workers
    const categories = ["electrical", "plumbing", "carpentry", "painting", "cleaning", "domestic", "caregiving", "driving", "gardening", "technician"];
    const workerNames = [
      "Ramen Das", "Priya Sharma", "Anil Bora", "Sunita Rai", "Manoj Kalita",
      "Farida Begum", "Dilip Sarma", "Rekha Devi", "Bikash Gogoi", "Meena Kumari",
      "Suresh Yadav", "Tanvir Ahmed", "Purnima Baruah", "Jagat Deka",
    ];
    const baseLat = 26.1445, baseLng = 91.7362;

    for (let i = 0; i < workerNames.length; i++) {
      const name = workerNames[i];
      const cat = categories[i % categories.length];
      const email = `worker${i + 1}@homesync.demo`;
      const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;

      await pool.query(
        "INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)",
        ["worker", name, email, phone, hash]
      );
      const wResult = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      const wId = wResult.rows[0]?.id;
      if (!wId) continue;

      const rating = Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
      const verification = i < 12 ? "verified" : i < 14 ? "under_review" : "pending";
      const rates = { electrical: 450, plumbing: 400, carpentry: 500, painting: 600, cleaning: 350, domestic: 300, caregiving: 500, driving: 400, gardening: 300, technician: 450 };

      await pool.query(
        `INSERT INTO workers (user_id, category_id, address, lat, lng, experience_years, qualification, expected_rate, verification_status, availability, rating, rating_count, completed_jobs, cooperative_member_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wId, cat,
          `${["Fancy Bazar", "Ganeshguri", "Dispur", "Beltola", "Zoo Road", "Six Mile", "Chandmari", "Paltan Bazar"][i % 8]}, Guwahati`,
          baseLat + (Math.random() - 0.5) * 0.15,
          baseLng + (Math.random() - 0.5) * 0.15,
          1 + (i % 12),
          ["ITI Certified", "Diploma Holder", "Trade Certified", "On-the-job Trained"][i % 4],
          (rates[cat] || 400) + Math.floor(Math.random() * 200),
          verification,
          i % 5 === 0 ? "busy" : "available",
          verification === "verified" ? rating : 0,
          verification === "verified" ? 5 + (i % 20) : 0,
          verification === "verified" ? 5 + (i % 40) : 0,
          `NITA-COOP-${1000 + i}`,
        ]
      );
    }

    // Seed some historical bookings for AI forecast
    const verifiedWorkers = (await pool.query("SELECT user_id, expected_rate, category_id FROM workers WHERE verification_status = 'verified'")).rows;
    for (let i = 0; i < 30; i++) {
      const w = verifiedWorkers[Math.floor(Math.random() * verifiedWorkers.length)];
      if (!w) break;
      const daysAgo = Math.floor(Math.random() * 40);
      const createdDate = new Date(Date.now() - daysAgo * 86400000);

      await pool.query(
        `INSERT INTO bookings (customer_id, worker_id, category_id, scheduled_date, address, description, service_charge, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          custId, w.user_id, w.category_id,
          createdDate.toISOString().slice(0, 10),
          "Demo address, Guwahati",
          "Historical demo booking",
          Number(w.expected_rate),
          "completed",
          createdDate.toISOString(),
        ]
      );
    }

    // Seed demand forecasts for the AI dashboard
    for (const cat of categories) {
      const predicted = Math.floor(5 + Math.random() * 20);
      const now = new Date();
      const nextWeek = new Date(Date.now() + 7 * 86400000);
      await pool.query(
        `INSERT INTO demand_forecasts (category_id, predicted_bookings, period_start, period_end, model_version) VALUES (?, ?, ?, ?, ?)`,
        [cat, predicted, now.toISOString().slice(0, 10), nextWeek.toISOString().slice(0, 10), "statistical-v1"]
      );
    }

    // Seed workforce allocation recommendations
    for (const cat of categories) {
      await pool.query(
        `INSERT INTO worker_allocations (category_id, zone, recommendation) VALUES (?, ?, ?)`,
        [cat, "Guwahati", `Balanced availability for ${cat} services in this zone.`]
      );
    }

    console.log("[Seed] Demo data seeded successfully.");
  } catch (err) {
    console.error("[Seed] Error seeding demo data:", err.message);
  }
}

// ── Start ──
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await initDb();
    console.log(`[DB] Database ready (${getDbType()}).`);

    if (process.env.DEMO_MODE === "true") {
      await seedDemoData();
    }

    app.listen(PORT, () => {
      console.log(`HomeSync API listening on port ${PORT} (demo mode: ${process.env.DEMO_MODE === "true"}, db: ${getDbType()})`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
