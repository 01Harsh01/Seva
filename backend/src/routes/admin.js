// backend/src/routes/admin.js
const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

const router = express.Router();
router.use(requireAuth, requireRole("admin")); // every admin route requires the admin role, server-verified

router.get("/dashboard", ctrl.dashboard);
router.get("/workers", ctrl.listWorkersForReview);
router.put("/workers/:id/verify", ctrl.setWorkerVerification);

module.exports = router;
