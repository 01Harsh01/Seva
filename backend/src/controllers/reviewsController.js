// backend/src/controllers/reviewsController.js
const { pool } = require("../config/db");

async function createReview(req, res, next) {
  try {
    const { bookingId, overall, quality, professionalism, timeliness, comment } = req.body;

    const booking = await pool.query("SELECT customer_id, worker_id, status FROM bookings WHERE id = $1", [bookingId]);
    if (!booking.rows[0]) return res.status(404).json({ error: "Booking not found." });
    if (booking.rows[0].customer_id !== req.user.id) return res.status(403).json({ error: "Only the customer on this booking can review it." });
    if (booking.rows[0].status !== "completed") return res.status(400).json({ error: "Only completed bookings can be reviewed." });

    const existing = await pool.query("SELECT id FROM reviews WHERE booking_id = $1", [bookingId]);
    if (existing.rows[0]) return res.status(409).json({ error: "This booking has already been reviewed." });

    const workerId = booking.rows[0].worker_id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO reviews (booking_id, worker_id, overall_rating, quality_rating, professionalism_rating, timeliness_rating, comment)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [bookingId, workerId, overall, quality, professionalism, timeliness, comment || null]
      );
      // Recompute the worker's average rating from source data —
      // never trust an incrementally-cached average to stay correct.
      const agg = await client.query("SELECT avg(overall_rating) AS avg, count(*) AS cnt FROM reviews WHERE worker_id = $1", [workerId]);
      await client.query("UPDATE workers SET rating = $1, rating_count = $2 WHERE user_id = $3", [
        Number(agg.rows[0].avg).toFixed(1), agg.rows[0].cnt, workerId,
      ]);
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }

    res.status(201).json({ success: true });
  } catch (err) { next(err); }
}

async function workerReviews(req, res, next) {
  try {
    const result = await pool.query(
      "SELECT overall_rating, comment, created_at FROM reviews WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.params.id]
    );
    res.json({ reviews: result.rows });
  } catch (err) { next(err); }
}

module.exports = { createReview, workerReviews };
