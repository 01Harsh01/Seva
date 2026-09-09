// backend/src/middleware/auth.js
const jwt = require("jsonwebtoken");

// Verifies the JWT and attaches { id, role } to req.user.
// This is the ONLY source of truth for who the caller is — the
// frontend's own idea of its role is never trusted for anything
// that matters (see requireRole below).
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing or invalid Authorization header." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Usage: requireRole("admin") or requireRole("worker", "admin")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `This action requires role: ${allowedRoles.join(" or ")}.` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
