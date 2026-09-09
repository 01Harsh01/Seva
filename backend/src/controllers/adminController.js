// backend/src/controllers/adminController.js
const { pool } = require("../config/db");

async function dashboard(req, res, next) {
  try {
    const [workers, bookings, payments, customers] = await Promise.all([
      pool.query("SELECT verification_status, count(*) AS count FROM workers GROUP BY verification_status"),
      pool.query("SELECT status, count(*) AS count FROM bookings GROUP BY status"),
      pool.query("SELECT coalesce(sum(amount),0) AS revenue FROM payments WHERE status = 'paid'"),
      pool.query("SELECT count(*) AS count FROM customers"),
    ]);

    const workerCounts = Object.fromEntries(workers.rows.map((r) => [r.verification_status, Number(r.count)]));
    const bookingCounts = Object.fromEntries(bookings.rows.map((r) => [r.status, Number(r.count)]));

    res.json({
      totalWorkers: Object.values(workerCounts).reduce((a, b) => a + b, 0),
      verifiedWorkers: workerCounts.verified || 0,
      pendingVerification: (workerCounts.pending || 0) + (workerCounts.under_review || 0),
      totalCustomers: Number(customers.rows[0].count),
      activeBookings: (bookingCounts.pending || 0) + (bookingCounts.accepted || 0) + (bookingCounts.on_the_way || 0) + (bookingCounts.in_progress || 0),
      completedBookings: bookingCounts.completed || 0,
      totalRevenue: Number(payments.rows[0].revenue),
    });
  } catch (err) { next(err); }
}

async function listWorkersForReview(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT w.user_id, u.name, w.category_id, w.experience_years, w.verification_status, w.created_at,
              wv.digilocker_verified, wv.verification_mode
       FROM workers w JOIN users u ON u.id = w.user_id
       LEFT JOIN worker_verification wv ON wv.worker_id = w.user_id
       ORDER BY w.created_at DESC`
    );
    res.json({ workers: result.rows });
  } catch (err) { next(err); }
}

async function setWorkerVerification(req, res, next) {
  try {
    const { status } = req.body; // 'verified' | 'rejected' | 'under_review'
    await pool.query("UPDATE workers SET verification_status = $1 WHERE user_id = $2", [status, req.params.id]);
    await pool.query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1,'verification',$2,$3)",
      [req.params.id, "Verification status updated", `Your verification status is now: ${status}`]
    );
    await pool.query("INSERT INTO audit_logs (actor_id, action, entity, entity_id) VALUES ($1,$2,'worker',$3)", [
      req.user.id, `set_verification_${status}`, req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { dashboard, listWorkersForReview, setWorkerVerification };
