// ============================================================
//  js/tilt.js — perspective tilt for cards ("3D card" interaction)
//
//  Auto-applies to card-like elements site-wide (imported once
//  from ui.js, same pattern as animate.js) so no page needs to
//  opt in by hand. Skipped entirely on touch devices (tilt is a
//  mouse-hover effect, not something that helps a phone) and on
//  prefers-reduced-motion.
// ============================================================

// Deliberately scoped to compact, tile-like cards only — NOT the
// generic ".card" class, which also wraps large content blocks
// (forms, dashboard tables, the invoice box). Tilting a card full
// of form fields or a data table looks gimmicky, not premium; the
// spec explicitly asks to avoid a "game" feel, so tilt is reserved
// for genuinely card-shaped UI: category tiles and worker cards.
// Stat cards (numbers/labels) are deliberately excluded too — tilt
// on a number makes it harder to read at a glance, which fights
// the "all text clearly visible" goal for dashboards.
const TILT_SELECTORS = ".cat-card, .worker-card, .glass-card";
const MAX_TILT_DEG = 6;

function supportsHoverTilt() {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  return !reduced && finePointer;
}

function attach(el) {
  if (el.dataset.tiltBound) return;
  el.dataset.tiltBound = "1";
  el.style.transformStyle = "preserve-3d";
  el.style.willChange = "transform";

  function onMove(e) {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * MAX_TILT_DEG * 2;
    const rotX = (0.5 - py) * MAX_TILT_DEG * 2;
    el.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
  }
  function onLeave() {
    el.style.transform = "";
  }
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
}

function scan(root = document) {
  if (!supportsHoverTilt()) return;
  root.querySelectorAll(TILT_SELECTORS).forEach(attach);
}

function watch() {
  let pending = false;
  const mo = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; scan(document); }, 150);
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!supportsHoverTilt()) return; // don't even set up observers on touch devices
  scan(document);
  watch();
});
