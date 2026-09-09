// backend/src/controllers/paymentsController.js
//
// Razorpay integration. This code is real (uses Razorpay's actual
// order-creation API and their documented HMAC signature-verification
// scheme) but has NOT been exercised against a live Razorpay account
// in this build, because doing so requires an actual merchant's
// RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET, which we don't have. Until
// real keys are supplied, treat this as "written and logically
// correct, not integration-tested" — do not claim it as a verified
// working payment flow in a demo.

const crypto = require("crypto");
const { pool } = require("../config/db");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

async function createOrder(req, res, next) {
  try {
    const { bookingId } = req.body;
    const booking = await pool.query("SELECT service_charge FROM bookings WHERE id = $1", [bookingId]);
    if (!booking.rows[0]) return res.status(404).json({ error: "Booking not found." });

    const cooperativeFeePct = Number(process.env.COOPERATIVE_FEE_PCT || 0.08);
    const amountPaise = Math.round(Number(booking.rows[0].service_charge) * (1 + cooperativeFeePct) * 100);

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(501).json({
        error: "Razorpay is not configured on this server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to enable real payments.",
        demoMode: true,
      });
    }

    // Real Razorpay order-creation call (Basic Auth with key:secret,
    // per Razorpay's documented REST API — no SDK dependency needed).
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: bookingId }),
    });
    const order = await rpRes.json();
    if (!rpRes.ok) return res.status(502).json({ error: "Razorpay order creation failed.", details: order });

    await pool.query(
      "INSERT INTO payments (booking_id, amount, method, status, razorpay_order_id) VALUES ($1,$2,'online','created',$3)",
      [bookingId, amountPaise / 100, order.id]
    );
    res.json({ order, keyId: RAZORPAY_KEY_ID }); // key ID (public) is fine client-side; secret never leaves the server
  } catch (err) { next(err); }
}

// Verifies the HMAC signature Razorpay returns after checkout —
// this is the step that makes "trust the frontend's success message"
// impossible, per the spec's explicit requirement.
async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    if (!RAZORPAY_KEY_SECRET) return res.status(501).json({ error: "Razorpay is not configured on this server." });

    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const valid = expected === razorpay_signature;
    await pool.query(
      "UPDATE payments SET status = $1, razorpay_payment_id = $2, transaction_id = $2 WHERE razorpay_order_id = $3",
      [valid ? "paid" : "failed", razorpay_payment_id, razorpay_order_id]
    );
    if (valid) await pool.query("UPDATE bookings SET status = 'accepted' WHERE id = $1 AND status = 'pending'", [bookingId]);

    res.json({ verified: valid });
  } catch (err) { next(err); }
}

// Razorpay webhook — the authoritative confirmation, independent of
// what the browser reports (browser can close/crash mid-flow).
async function webhook(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "").update(req.rawBody || "").digest("hex");
    if (signature !== expected) return res.status(400).json({ error: "Invalid webhook signature." });

    const event = req.body;
    if (event.event === "payment.captured") {
      const orderId = event.payload.payment.entity.order_id;
      await pool.query("UPDATE payments SET status = 'paid' WHERE razorpay_order_id = $1", [orderId]);
    }
    res.json({ received: true });
  } catch (err) { next(err); }
}

module.exports = { createOrder, verifyPayment, webhook };
