// ============================================================
//  js/ui.js — shared header/nav + small helpers
// ============================================================
import { currentUser, logout, getNotifications, seedDemoData } from "./store.js";
import "./theme.js";
import "./animate.js";
import "./tilt.js";
import "./parallax.js";

seedDemoData(); // no-op after first run

const NAV = {
  customer: [
    ["index.html", "nav_home"], ["marketplace.html", "nav_services"],
    ["map.html", "nav_map"], ["track.html", "nav_tracking"],
    ["customer-dashboard.html", "nav_bookings"], ["emergency.html", "nav_emergency"],
  ],
  worker: [
    ["worker-dashboard.html", "nav_dashboard"], ["worker-dashboard.html#jobs", "nav_jobs"],
    ["map.html", "nav_map"],
    ["worker-dashboard.html#availability", "nav_availability"],
    ["worker-dashboard.html#earnings", "nav_earnings"],
    ["worker-dashboard.html#welfare", "nav_welfare"],
  ],
  admin: [
    ["admin-dashboard.html", "nav_dashboard"], ["admin-dashboard.html#workers", "nav_workers"],
    ["admin-dashboard.html#verification", "nav_verification"],
    ["admin-dashboard.html#forecast", "nav_forecast"],
    ["admin-dashboard.html#analytics", "nav_analytics"],
  ],
};

export function renderHeader(mountSelector = "#hs-header") {
  const mount = document.querySelector(mountSelector);
  if (!mount) return;
  const user = currentUser();
  const links = user ? NAV[user.role] || [] : [["index.html", "nav_home"], ["marketplace.html", "nav_services"], ["map.html", "nav_map"], ["emergency.html", "nav_emergency"]];

  mount.innerHTML = `
    <header class="hs-header">
      <div class="hs-header-inner">
        <a class="hs-logo" href="index.html">
          <span class="hs-logo-mark">🤝</span> HomeSync <span class="hs-logo-tag">Cooperative</span>
        </a>
        <nav class="hs-nav">
          ${links.map(([href, key]) => {
            const page = href.split("#")[0];
            const isActive = page === location.pathname.split("/").pop();
            return `<a href="${href}" data-i18n="${key}" class="${isActive ? "active" : ""}"></a>`;
          }).join("")}
        </nav>
        <div class="hs-header-actions">
          <div class="hs-theme-switcher">
            <div class="theme-toggle-pills" id="theme-pills">
              <button class="theme-pill" data-mode="bright" title="Bright Daylight Mode">☀️ Bright</button>
              <button class="theme-pill" data-mode="dark" title="Dark Mode">🌙 Dark</button>
              <button class="theme-pill" data-mode="custom" title="Warm Cooperative Luxe">🎨 Custom</button>
            </div>
          </div>
          <div class="lang-switcher"></div>
          ${user ? `
            <button class="hs-bell" id="hs-bell" title="Notifications">🔔<span class="hs-bell-dot" id="hs-bell-dot" hidden></span></button>
            <span class="hs-user-chip">${user.name} <small>(${user.role})</small></span>
            <button class="btn btn-ghost btn-sm" id="hs-logout" data-i18n="logout"></button>
          ` : `
            <a class="btn btn-ghost btn-sm" href="login.html" data-i18n="login"></a>
            <a class="btn btn-primary btn-sm" href="register.html" data-i18n="register"></a>
          `}
        </div>
      </div>
    </header>`;

  document.getElementById("hs-logout")?.addEventListener("click", () => {
    logout();
    location.href = "index.html";
  });

  if (user) {
    const unread = getNotifications(user.id).filter((n) => !n.read).length;
    document.getElementById("hs-bell-dot")?.toggleAttribute("hidden", unread === 0);
    document.getElementById("hs-bell")?.addEventListener("click", () => {
      const items = getNotifications(user.id).slice(0, 8);
      alert(items.length ? items.map((n) => `• ${n.message}`).join("\n") : "No notifications yet.");
    });
  }

  // Theme switcher pills
  const pills = document.querySelectorAll("#theme-pills .theme-pill");
  const currentMode = localStorage.getItem("hs_theme_mode") || "bright";
  pills.forEach((btn) => {
    if (btn.dataset.mode === currentMode) btn.classList.add("active");
    btn.addEventListener("click", () => {
      import("./theme.js").then((m) => {
        m.setThemeMode(btn.dataset.mode);
        pills.forEach((b) => b.classList.toggle("active", b === btn));
      });
    });
  });

  import("./i18n.js").then((m) => m.initLangSwitcher());
}

export function money(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function stars(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export function badge(text, tone = "default") {
  return `<span class="badge badge-${tone}">${text}</span>`;
}

export function verificationBadge(status) {
  const map = {
    verified: ["✓ Verified Worker", "success"],
    under_review: ["Under Review", "warn"],
    pending: ["Verification Pending", "muted"],
    rejected: ["Rejected", "danger"],
  };
  const [label, tone] = map[status] || map.pending;
  return badge(label, tone);
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

document.addEventListener("DOMContentLoaded", () => renderHeader());
