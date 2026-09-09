// backend/src/controllers/workersController.js
const { pool } = require("../config/db");
const { haversineKm, scoreWorker } = require("../services/smartMatch");

async function listWorkers(req, res, next) {
  try {
    const { category } = req.query;
    const params = [];
    let where = "WHERE w.verification_status = 'verified'";
    if (category) { params.push(category); where += ` AND w.category_id = $${params.length}`; }

    const result = await pool.query(
      `SELECT w.user_id, u.name, w.category_id, w.experience_years, w.rating, w.rating_count,
              w.completed_jobs, w.expected_rate, w.availability, w.verification_status, w.lat, w.lng
       FROM workers w JOIN users u ON u.id = w.user_id
       ${where} ORDER BY w.rating DESC LIMIT 100`,
      params
    );
    res.json({ workers: result.rows });
  } catch (err) { next(err); }
}

// GET /api/workers/nearby?category=plumbing&lat=..&lng=..
// This is the SmartMatch-ranked endpoint the spec calls for — not
// a plain distance sort.
async function nearbyWorkers(req, res, next) {
  try {
    const { category, lat, lng } = req.query;
    if (!category) return res.status(400).json({ error: "category is required." });

    const result = await pool.query(
      `SELECT w.user_id, u.name, w.experience_years, w.rating, w.rating_count, w.completed_jobs,
              w.expected_rate, w.availability, w.verification_status, w.lat, w.lng
       FROM workers w JOIN users u ON u.id = w.user_id
       WHERE w.category_id = $1 AND w.verification_status = 'verified'`,
      [category]
    );

    const userLat = lat ? Number(lat) : null;
    const userLng = lng ? Number(lng) : null;

    const ranked = result.rows.map((w) => {
      const distance_km = userLat != null ? haversineKm(userLat, userLng, w.lat, w.lng) : null;
      const { matchScore, etaMinutes } = scoreWorker({ ...w, distance_km });
      return {
        id: w.user_id, name: w.name, experienceYears: w.experience_years, rating: Number(w.rating),
        ratingCount: w.rating_count, completedJobs: w.completed_jobs, expectedRate: Number(w.expected_rate),
        availability: w.availability, verificationStatus: w.verification_status,
        distanceKm: distance_km === null ? null : Math.round(distance_km * 10) / 10,
        matchScore, estimatedArrivalMinutes: etaMinutes,
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json({ workers: ranked, weights: require("../services/smartMatch").WEIGHTS });
  } catch (err) { next(err); }
}

async function getWorkerProfile(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT w.*, u.name, u.email, u.phone,
              (SELECT digilocker_verified FROM worker_verification wv WHERE wv.worker_id = w.user_id) AS digilocker_verified
       FROM workers w JOIN users u ON u.id = w.user_id WHERE w.user_id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Worker not found." });

    const skills = await pool.query(
      `SELECT s.name FROM worker_skills ws JOIN skills s ON s.id = ws.skill_id WHERE ws.worker_id = $1`,
      [req.params.id]
    );
    res.json({ worker: { ...result.rows[0], skills: skills.rows.map((r) => r.name) } });
  } catch (err) { next(err); }
}

// PUT /api/workers/profile — the logged-in worker updates their own
// profile. req.user.id comes from the verified JWT, never the body.
async function upsertOwnProfile(req, res, next) {
  try {
    const w = req.body;
    await pool.query(
      `INSERT INTO workers (user_id, category_id, address, lat, lng, experience_years, qualification, languages, service_radius_km, expected_rate, emergency_contact, cooperative_member_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (user_id) DO UPDATE SET
         category_id=$2, address=$3, lat=$4, lng=$5, experience_years=$6, qualification=$7,
         languages=$8, service_radius_km=$9, expected_rate=$10, emergency_contact=$11`,
      [req.user.id, w.categoryId, w.address, w.lat, w.lng, w.experienceYears, w.qualification,
       w.languages || [], w.serviceRadiusKm || 10, w.expectedRate, w.emergencyContact,
       w.cooperativeMemberId || `NITA-COOP-${Math.floor(1000 + Math.random() * 9000)}`]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listWorkers, nearbyWorkers, getWorkerProfile, upsertOwnProfile };
