// backend/src/routes/payments.js
const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/paymentsController");

const router = express.Router();

router.post("/create-order", requireAuth, ctrl.createOrder);
router.post("/verify", requireAuth, ctrl.verifyPayment);
router.post("/webhook", ctrl.webhook); // Razorpay calls this directly, no user JWT

module.exports = router;
