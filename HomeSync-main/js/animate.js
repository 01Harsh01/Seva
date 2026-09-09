// ============================================================
//  js/animate.js — universal scroll-reveal + count-up layer
//
//  Imported once from js/ui.js, which every page already loads,
//  so animation is automatic everywhere rather than hand-added
//  per page. It:
//   1. Fades/slides cards, hero text, table rows, FAQ items, etc.
//      into view as they scroll on screen, with a light stagger.
//   2. Counts stat numbers up from 0 when they scroll into view
//      (any element with [data-countup]).
//   3. Fades the whole page in on load.
//   4. Re-scans on DOM mutations, since most content on this app
//      is injected via innerHTML after data loads (worker grids,
//      dashboard tabs, bookings...) — a one-shot IntersectionObserver
//      set up before that content exists would miss it entirely.
//   5. Does nothing but instantly show content if the visitor has
//      prefers-reduced-motion set.
// ============================================================

const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Dashboards (admin/worker/customer) set this flag before importing
// ui.js — see the <script> at the top of each dashboard page — so
// text-heavy stat cards and tables render immediately and fully
// legible instead of fading/staggering in or counting up from zero.
// The rest of the site keeps the full animated treatment.
function dashboardModeActive() {
  return document.documentElement.dataset.dashboard === "1";
}

const REVEAL_SELECTORS = [
  ".card", ".cat-card", ".worker-card", ".stat-card", ".faq-item",
  "table.hs-table tbody tr", ".section-title", ".empty-state", ".hs-bar-track",
].join(",");

let io = null;
function getObserver() {
  if (io) return io;
  io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  return io;
}

function primeCountUp(el) {
  if (el.dataset.countupDone) return;
  const raw = el.textContent.trim();
  const match = raw.match(/([₹]?)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return;
  const [, prefix, numStr, suffix] = match;
  const target = parseFloat(numStr.replace(/,/g, ""));
  if (Number.isNaN(target)) return;
  el.dataset.countupDone = "1";
  if (REDUCED || dashboardModeActive()) return; // dashboards show the real number immediately, no hide-then-count
  el.textContent = prefix + "0" + suffix;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const duration = 700;
      const start = performance.now();
      function frame(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        const display = Number.isInteger(target) ? Math.round(val).toLocaleString("en-IN") : val.toFixed(1);
        el.textContent = prefix + display + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }, { threshold: 0.4 });
  obs.observe(el);
}

let staggerCounter = 0;
function scan(root = document) {
  if (REDUCED || dashboardModeActive()) {
    // Dashboards: show every card/row/stat fully visible immediately —
    // no opacity fade, no translateY, no stagger delay — so numbers and
    // labels are always clearly readable, including right after a tab
    // switch or filter change re-renders the content.
    root.querySelectorAll(REVEAL_SELECTORS).forEach((el) => el.classList.add("reveal", "in-view"));
    root.querySelectorAll(".stat-value, [data-countup]").forEach((el) => (el.dataset.countupDone = "1"));
    return;
  }
  root.querySelectorAll(REVEAL_SELECTORS).forEach((el) => {
    if (el.classList.contains("reveal")) return;
    el.classList.add("reveal");
    el.style.transitionDelay = `${(staggerCounter++ % 8) * 55}ms`;
    getObserver().observe(el);
  });
  root.querySelectorAll(".stat-value, [data-countup]").forEach(primeCountUp);
}

function watchMutations() {
  let pending = false;
  const mo = new MutationObserver((mutations) => {
    // Debounced: count-up animations mutate text nodes every frame,
    // which would otherwise trigger a full document re-scan on every
    // frame. A short debounce still catches genuinely new content
    // (worker grids, dashboard tab renders) without that cost.
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; scan(document); }, 120);
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

function fadeInPage() {
  if (REDUCED) return;
  document.documentElement.classList.add("hs-page-enter");
  requestAnimationFrame(() => {
    document.documentElement.classList.add("hs-page-enter-active");
  });
}

// Cross-page transition: since this is a real multi-page app (not
// an SPA), navigating between pages is otherwise a hard cut. This
// intercepts same-tab internal link clicks, fades the page out,
// then navigates — so moving from marketplace → worker profile →
// booking feels like one continuous cinematic flow instead of a
// flash of white between page loads.
function wirePageExitTransition() {
  if (REDUCED) return;
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target && link.target !== "_self") return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    let url;
    try { url = new URL(href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor, let smooth-scroll handle it

    e.preventDefault();
    document.documentElement.classList.add("hs-page-exit");
    setTimeout(() => { location.href = url.href; }, 180);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fadeInPage();
  wirePageExitTransition();
  scan(document);
  watchMutations();

  // Safety net: if any reveal elements are still invisible after 3 seconds
  // (IntersectionObserver timing edge case), force them visible.
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.in-view)").forEach(el => el.classList.add("in-view"));
  }, 3000);
});
