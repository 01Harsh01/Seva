// ============================================================
//  js/theme.js — dynamic per-category theming + Mode Switcher
//  (Bright / Dark / Custom)
// ============================================================

const VARS = ["--cat-primary", "--cat-secondary", "--cat-accent", "--cat-gradient"];
const THEME_MODE_KEY = "hs_theme_mode";

export function getThemeMode() {
  return localStorage.getItem(THEME_MODE_KEY) || "bright";
}

export function setThemeMode(mode) {
  const valid = ["bright", "dark", "custom"];
  const m = valid.includes(mode) ? mode : "bright";
  localStorage.setItem(THEME_MODE_KEY, m);
  document.documentElement.setAttribute("data-theme", m);
  window.dispatchEvent(new CustomEvent("hs:theme-change", { detail: { mode: m } }));
  return m;
}

export function initTheme() {
  const current = getThemeMode();
  document.documentElement.setAttribute("data-theme", current);
}

// Auto-run theme initialization
if (typeof window !== "undefined") {
  initTheme();
}

export function applyCategoryTheme(theme) {
  const root = document.documentElement.style;
  if (!theme) return resetCategoryTheme();
  root.setProperty("--cat-primary", theme.primary || "var(--coop-teal)");
  root.setProperty("--cat-secondary", theme.secondary || "var(--coop-teal-dim)");
  root.setProperty("--cat-accent", theme.accent || "var(--coop-teal-dark)");
  root.setProperty("--cat-gradient", theme.gradient || "linear-gradient(135deg, var(--coop-teal-dark), var(--coop-teal))");
  document.body.classList.add("has-category-theme");
}

export function resetCategoryTheme() {
  const root = document.documentElement.style;
  VARS.forEach((v) => root.removeProperty(v));
  document.body.classList.remove("has-category-theme");
}
