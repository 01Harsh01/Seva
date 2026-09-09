// backend/src/config/db.js
//
// Dual-mode database layer: tries PostgreSQL first, falls back to
// SQLite when Postgres isn't available. The SQLite adapter wraps
// better-sqlite3 in a pool.query()-compatible API so none of the
// controllers need to change.

require("dotenv").config();
const path = require("path");
const fs = require("fs");

let currentDbType = process.env.DB_TYPE === "postgres" ? "postgres" : "sqlite";
let realPool = null;

// ── SQLite Pool Adapter ──
function createSqlitePool() {
  const Database = require("better-sqlite3");
  const dbPath = path.join(__dirname, "..", "..", "homesync.db");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run schema if needed
  const schemaPath = path.join(__dirname, "..", "..", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);
    console.log("[DB] SQLite schema applied.");
  }

  // PostgreSQL uses $1, $2 params; SQLite uses ?, ?
  // Also translate case-insensitive ILIKE to LIKE and NOW() to CURRENT_TIMESTAMP
  function translateQuery(sql, params) {
    let q = sql.replace(/\$\d+/g, "?");
    q = q.replace(/\bILIKE\b/gi, "LIKE");
    q = q.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
    q = q.replace(/\bCOUNT\(\*\)(?!\s+AS\b)/gi, "COUNT(*) AS count");
    return { sql: q, params: params || [] };
  }

  const fakePool = {
    _db: db,

    async query(sql, params = []) {
      const { sql: q, params: p } = translateQuery(sql, params);
      const trimmed = q.trim().toUpperCase();

      if (
        sql.toUpperCase().includes("RETURNING") ||
        trimmed.startsWith("SELECT") ||
        trimmed.startsWith("WITH") ||
        trimmed.startsWith("PRAGMA")
      ) {
        const stmt = db.prepare(q);
        const rows = stmt.all(...p);
        return { rows, rowCount: rows.length };
      } else {
        const stmt = db.prepare(q);
        const info = stmt.run(...p);
        return { rows: [], rowCount: info.changes };
      }
    },

    async connect() {
      return {
        async query(sql, params = []) {
          return fakePool.query(sql, params);
        },
        async release() {
          /* no-op for SQLite */
        },
      };
    },

    on() {},
    async end() {
      db.close();
    },
  };

  return fakePool;
}

// ── Try PostgreSQL ──
function tryPostgres() {
  try {
    const { Pool } = require("pg");
    const isRemote = Boolean(process.env.DATABASE_URL);
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "homesync",
      connectionTimeoutMillis: 5000,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });

    pgPool.on("error", (err) => {
      console.error("Postgres pool error:", err.message);
    });

    return pgPool;
  } catch {
    return null;
  }
}

// Synchronously initialize SQLite immediately so pool is never null
realPool = createSqlitePool();

// ── Async Init (checks postgres if requested) ──
async function initDb() {
  if (process.env.DB_TYPE === "sqlite") {
    currentDbType = "sqlite";
    console.log("[DB] Using SQLite (DB_TYPE=sqlite).");
    return;
  }

  // Try PostgreSQL if DB_TYPE is not explicitly sqlite
  const pgPool = tryPostgres();
  if (pgPool) {
    try {
      await pgPool.query("SELECT 1");
      realPool = pgPool;
      currentDbType = "postgres";
      console.log("[DB] Connected to PostgreSQL.");

      // Auto-apply PostgreSQL migrations if users table is not yet created
      try {
        const tableCheck = await realPool.query("SELECT to_regclass('public.users') AS exists");
        if (!tableCheck.rows[0]?.exists) {
          console.log("[DB] PostgreSQL tables missing, auto-applying migrations...");
          const candidateDirs = [
            path.join(__dirname, "..", "..", "..", "database"),
            path.join(__dirname, "..", "..", "database"),
          ];
          const dbDir = candidateDirs.find((d) => fs.existsSync(d));
          if (dbDir) {
            const extSql = path.join(dbDir, "migrations", "000_extensions.sql");
            const initSql = path.join(dbDir, "migrations", "001_init.sql");
            const seedSql = path.join(dbDir, "seed", "seed.sql");

            if (fs.existsSync(extSql)) {
              try {
                await realPool.query(fs.readFileSync(extSql, "utf8"));
              } catch (e) {
                console.warn("[DB] Notice running extensions:", e.message);
              }
            }
            if (fs.existsSync(initSql)) {
              await realPool.query(fs.readFileSync(initSql, "utf8"));
              console.log("[DB] PostgreSQL schema applied successfully.");
            }
            if (fs.existsSync(seedSql)) {
              await realPool.query(fs.readFileSync(seedSql, "utf8"));
              console.log("[DB] PostgreSQL seed data applied successfully.");
            }
          } else {
            console.warn("[DB] Could not locate database directory to run migrations.");
          }
        } else {
          console.log("[DB] PostgreSQL schema already exists.");
        }
      } catch (migErr) {
        console.error("[DB] Migration error:", migErr.message);
      }
      return;
    } catch (err) {
      console.warn(`[DB] PostgreSQL not available (${err.code || err.message}), falling back to SQLite.`);
      try {
        await pgPool.end();
      } catch {}
    }
  }

  currentDbType = "sqlite";
  console.log("[DB] Using SQLite fallback (homesync.db).");
}

// Export a stable pool object whose methods forward to realPool
const pool = {
  query(sql, params = []) {
    return realPool.query(sql, params);
  },
  connect() {
    return realPool.connect();
  },
  on(...args) {
    if (realPool && typeof realPool.on === "function") {
      realPool.on(...args);
    }
  },
  end(...args) {
    if (realPool && typeof realPool.end === "function") {
      return realPool.end(...args);
    }
  },
};

module.exports = {
  pool,
  initDb,
  get dbType() {
    return currentDbType;
  },
  getDbType() {
    return currentDbType;
  },
};
