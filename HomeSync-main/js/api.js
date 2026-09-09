// ============================================================
//  js/api.js — centralized client for the real HomeSync backend
//
//  MIGRATION STATUS (be honest about this — see README):
//  Only auth (register/login/me) is wired through this client to
//  the real Express + Postgres backend built in /backend. Every
//  other page (bookings, workers, payments, reviews, admin
//  dashboards) still reads/writes js/store.js's localStorage layer.
//  That's not an oversight — migrating 15+ pages off localStorage
//  is a real, separate effort, and claiming it's done when it
//  isn't would violate the "don't claim integration that doesn't
//  work" rule this project is built under. This file is the seam
//  the rest of the migration hangs off of.
//
//  Configure the backend's base URL by setting window.HS_API_BASE
//  before this module loads (e.g. in a page's inline script), or
//  it defaults to http://localhost:4000 for local development.
// ============================================================

const BASE = window.HS_API_BASE || "http://localhost:4000";
const TOKEN_KEY = "hs_api_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    // Backend unreachable (not running, wrong URL, CORS, offline) —
    // surface this distinctly so callers can fall back to demo mode
    // instead of showing a confusing generic error.
    const err = new Error("Could not reach the HomeSync API. Is the backend running?");
    err.offline = true;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  async register({ role, name, email, phone, password }) {
    const data = await request("/api/auth/register", { method: "POST", body: { role, name, email, phone, password } });
    setToken(data.token);
    return data.user;
  },
  async login({ email, password, role }) {
    const data = await request("/api/auth/login", { method: "POST", body: { email, password, role } });
    setToken(data.token);
    return data.user;
  },
  async me() {
    const data = await request("/api/auth/me", { auth: true });
    return data.user;
  },
  logout: clearToken,
};
