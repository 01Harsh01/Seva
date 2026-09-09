// backend/src/services/smartMatch.js
//
// HomeSync SmartMatch — ranks workers for a booking request.
// Weights are configurable (env vars, falling back to the spec's
// defaults) rather than hardcoded, per the "must be configurable
// from the backend" requirement.

const WEIGHTS = {
  skill: Number(process.env.SMARTMATCH_WEIGHT_SKILL ?? 0.40),
  distance: Number(process.env.SMARTMATCH_WEIGHT_DISTANCE ?? 0.25),
  availability: Number(process.env.SMARTMATCH_WEIGHT_AVAILABILITY ?? 0.15),
  rating: Number(process.env.SMARTMATCH_WEIGHT_RATING ?? 0.10),
  experience: Number(process.env.SMARTMATCH_WEIGHT_EXPERIENCE ?? 0.10),
};

function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined || Number.isNaN(v))) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// worker: { has_required_skill, distance_km, availability, rating, experience_years }
// Returns 0-100. Estimated arrival assumes a conservative 25km/h
// average urban speed — clearly an estimate, not a routing-API ETA.
function scoreWorker(worker, { requiredSkillMatched = true } = {}) {
  const skillScore = requiredSkillMatched ? 100 : 40;
  const distanceScore = worker.distance_km == null ? 55 : Math.max(0, 100 - worker.distance_km * 6);
  const availabilityScore = worker.availability === "available" ? 100 : worker.availability === "busy" ? 30 : 0;
  const ratingScore = (Number(worker.rating) / 5) * 100;
  const experienceScore = Math.min(100, Number(worker.experience_years) * 10);

  const score =
    skillScore * WEIGHTS.skill +
    distanceScore * WEIGHTS.distance +
    availabilityScore * WEIGHTS.availability +
    ratingScore * WEIGHTS.rating +
    experienceScore * WEIGHTS.experience;

  const etaMinutes = worker.distance_km == null ? null : Math.round((worker.distance_km / 25) * 60) + 5;

  return { matchScore: Math.round(score), etaMinutes };
}

module.exports = { WEIGHTS, haversineKm, scoreWorker };
