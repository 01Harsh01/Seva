// backend/src/routes/reviews.js
const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/reviewsController");

const router = express.Router();
router.post("/", requireAuth, ctrl.createReview);
router.get("/worker/:id", ctrl.workerReviews);

module.exports = router;
