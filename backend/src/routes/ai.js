// backend/src/routes/ai.js
//
// AI/ML endpoints — reads from pre-computed tables (demand_forecasts,
// worker_allocations). Falls back to a live statistical calculation
// from bookings data when the ML tables are empty.

const express = require("express");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Statistical fallback: same recency-weighted approach as the frontend's
// store.js demandForecast(), but running against the real DB.
async function computeFallbackForecast() {
  const categories = ["electrical", "plumbing", "carpentry", "painting", "cleaning", "domestic", "caregiving", "driving", "gardening", "technician"];
  const now = Date.now();
  const DAY = 86400000;
  const forecasts = [];

  for (const cat of categories) {
    try {
      const recentResult = await pool.query(
        "SELECT COUNT(*) as cnt FROM bookings WHERE category_id = ? AND created_at > ?",
        [cat, new Date(now - 14 * DAY).toISOString()]
      );
      const olderResult = await pool.query(
        "SELECT COUNT(*) as cnt FROM bookings WHERE category_id = ? AND created_at > ? AND created_at <= ?",
        [cat, new Date(now - 28 * DAY).toISOString(), new Date(now - 14 * DAY).toISOString()]
      );
      const recent = Number(recentResult.rows[0]?.cnt || 0);
      const older = Number(olderResult.rows[0]?.cnt || 0);
      const growth = older === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - older) / older) * 100);

      forecasts.push({
        category_id: cat,
        predicted_bookings: Math.max(recent, Math.round(recent * (1 + growth / 100))),
        period_start: new Date().toISOString().slice(0, 10),
        period_end: new Date(now + 7 * DAY).toISOString().slice(0, 10),
        model_version: "statistical-fallback",
        generated_at: new Date().toISOString(),
      });
    } catch {
      forecasts.push({ category_id: cat, predicted_bookings: 0, model_version: "error" });
    }
  }
  return forecasts;
}

router.get("/demand-forecast", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category_id, predicted_bookings, period_start, period_end, model_version, generated_at
       FROM demand_forecasts ORDER BY category_id`
    );
    if (result.rows.length === 0) {
      // Fallback to live statistical calculation
      const fallback = await computeFallbackForecast();
      return res.json({
        forecasts: fallback,
        note: "Generated via statistical fallback from bookings data. Run ml/training/train_forecast.py for ML-based predictions.",
      });
    }
    res.json({ forecasts: result.rows });
  } catch (err) { next(err); }
});

router.get("/workforce-recommendation", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category_id, zone, recommendation, generated_at
       FROM worker_allocations ORDER BY category_id`
    );
    if (result.rows.length === 0) {
      // Fallback recommendations
      return res.json({
        recommendations: [
          { category_id: "general", zone: "all", recommendation: "Worker availability is balanced. No immediate reallocation needed.", generated_at: new Date().toISOString() },
        ],
        note: "Statistical fallback — no ML allocation data available yet.",
      });
    }
    res.json({ recommendations: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
