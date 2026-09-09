// backend/src/routes/workers.js
const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/workersController");

const router = express.Router();

router.get("/nearby", ctrl.nearbyWorkers);   // public — customers browse before logging in
router.get("/:id", ctrl.getWorkerProfile);   // public profile view
router.get("/", ctrl.listWorkers);           // public
router.put("/profile", requireAuth, requireRole("worker"), ctrl.upsertOwnProfile);

module.exports = router;
