// ============================================================
//  js/theme.js — dynamic per-category theming
//  Sets CSS custom properties on :root so every themed element
//  (hero, buttons, badges, cards, section headings) reads from
//  the same source. Brand base (--coop-teal etc. in
//  marketplace.css) stays as the fallback, so HomeSync still
//  feels like one product underneath each category's accent.
// ============================================================

const VARS = ["--cat-primary", "--cat-secondary", "--cat-accent", "--cat-gradient"];

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
