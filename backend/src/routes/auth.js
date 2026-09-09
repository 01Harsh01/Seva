// backend/src/routes/auth.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Auth endpoints are the highest-value brute-force target, so they
// get a tighter rate limit than the rest of the API.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", requireAuth, me);

module.exports = router;
