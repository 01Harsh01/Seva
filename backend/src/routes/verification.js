// backend/src/routes/verification.js
const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { digilockerService } = require("../services/digilockerService");

const router = express.Router();

router.post("/digilocker/start", requireAuth, requireRole("worker"), (req, res) => {
  const auth = digilockerService.getAuthorizationUrl(req.user.id);
  res.json(auth); // { url, state, mode: "demo_mock" } — frontend must show "Demo Verification" label
});

router.get("/digilocker/callback", requireAuth, requireRole("worker"), async (req, res, next) => {
  try {
    const result = await digilockerService.verifyWorker(req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.get("/status", requireAuth, requireRole("worker"), async (req, res, next) => {
  try {
    const status = await digilockerService.getVerificationStatus(req.user.id);
    res.json(status);
  } catch (err) { next(err); }
});

module.exports = router;
