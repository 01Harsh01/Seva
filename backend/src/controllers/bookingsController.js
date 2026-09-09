// backend/src/controllers/bookingsController.js
const { pool } = require("../config/db");

const VALID_TRANSITIONS = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["on_the_way", "cancelled"],
  on_the_way: ["arrived", "cancelled"],
  arrived: ["in_progress"],
  in_progress: ["completed", "disputed"],
  completed: ["disputed"],
};

async function createBooking(req, res, next) {
  try {
    const b = req.body;
    if (req.user.role !== "customer") return res.status(403).json({ error: "Only customers can create bookings." });

    const worker = await pool.query("SELECT expected_rate, category_id FROM workers WHERE user_id = $1 AND verification_status = 'verified'", [b.workerId]);
    if (!worker.rows[0]) return res.status(404).json({ error: "Worker not found or not verified." });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO bookings (customer_id, worker_id, category_id, is_emergency, scheduled_date, scheduled_time, address, description, details, payment_method, service_charge)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [req.user.id, b.workerId, worker.rows[0].category_id, !!b.isEmergency, b.date || null, b.time || null,
         b.address, b.description || "", JSON.stringify(b.details || {}), b.paymentMethod || "online", worker.rows[0].expected_rate]
      );
      const booking = result.rows[0];
      await client.query("INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES ($1,'pending',$2)", [booking.id, req.user.id]);
      await client.query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1,'booking_requested','New booking request', $2)",
        [b.workerId, `New ${b.isEmergency ? "EMERGENCY " : ""}booking request.`]
      );
      await client.query("COMMIT");
      res.status(201).json({ booking });
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  } catch (err) { next(err); }
}

// Role-scoped: a customer only ever sees their own bookings, a
// worker only their own — enforced server-side via req.user.id,
// never a client-supplied filter.
async function myBookings(req, res, next) {
  try {
    const column = req.user.role === "worker" ? "worker_id" : "customer_id";
    const result = await pool.query(
      `SELECT b.*, cu.name AS customer_name, wu.name AS worker_name
       FROM bookings b
       JOIN users cu ON cu.id = b.customer_id
       JOIN users wu ON wu.id = b.worker_id
       WHERE b.${column} = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: result.rows });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const current = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
    if (!current.rows[0]) return res.status(404).json({ error: "Booking not found." });
    const booking = current.rows[0];

    // Authorization: only the assigned worker or customer (or admin) may change status.
    const isParty = req.user.id === booking.customer_id || req.user.id === booking.worker_id;
    if (!isParty && req.user.role !== "admin") return res.status(403).json({ error: "You are not part of this booking." });

    const allowed = VALID_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status) && req.user.role !== "admin") {
      return res.status(400).json({ error: `Cannot move booking from ${booking.status} to ${status}.` });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2", [status, id]);
      await client.query("INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES ($1,$2,$3)", [id, status, req.user.id]);
      const notifyUser = req.user.id === booking.customer_id ? booking.worker_id : booking.customer_id;
      await client.query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1,'booking_status',$2,$3)",
        [notifyUser, "Booking status updated", `Booking is now: ${status.replace(/_/g, " ")}`]
      );
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }

    res.json({ success: true, status });
  } catch (err) { next(err); }
}

module.exports = { createBooking, myBookings, updateStatus };
