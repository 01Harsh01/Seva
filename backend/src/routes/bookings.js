// backend/src/routes/bookings.js
const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/bookingsController");

const router = express.Router();

router.post("/", requireAuth, ctrl.createBooking);
router.get("/my", requireAuth, ctrl.myBookings);
router.put("/:id/status", requireAuth, ctrl.updateStatus);

module.exports = router;
