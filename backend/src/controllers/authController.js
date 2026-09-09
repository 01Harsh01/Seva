// backend/src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../config/db");

const registerSchema = z.object({
  role: z.enum(["customer", "worker"]), // admins are never self-registered
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(6).max(20),
  password: z.string().min(6).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["customer", "worker", "admin"]).optional(),
});

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { role, name, email, phone, password } = parsed.data;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) return res.status(409).json({ error: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userResult = await client.query(
        `INSERT INTO users (role, name, email, phone, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, role, name, email`,
        [role, name, email, phone, passwordHash]
      );
      const user = userResult.rows[0];
      if (role === "customer") {
        await client.query("INSERT INTO customers (user_id) VALUES ($1)", [user.id]);
      }
      // Worker profile creation (skills, category, etc.) happens via
      // PUT /api/workers/profile after this call — registration only
      // creates the account + role, matching the multi-step frontend flow.
      await client.query("COMMIT");
      return res.status(201).json({ token: signToken(user), user });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { email, password, role } = parsed.data;

    const result = await pool.query("SELECT id, role, name, email, password_hash FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password." });

    if (role && user.role !== role) {
      return res.status(403).json({ error: `This account is registered as a ${user.role}, not a ${role}.` });
    }

    delete user.password_hash;
    return res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me — lets the frontend confirm who the token belongs
// to without re-sending credentials. Always derived from the JWT via
// requireAuth, never from anything the client claims separately.
async function me(req, res, next) {
  try {
    const result = await pool.query("SELECT id, role, name, email, phone FROM users WHERE id = $1", [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found." });
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
