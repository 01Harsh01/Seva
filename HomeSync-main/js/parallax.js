// ============================================================
//  js/parallax.js — cheap scroll parallax for decorative layers
//
//  Elements with [data-parallax="0.2"] drift at that fraction of
//  scroll speed, giving foreground/background depth without any
//  WebGL — used for the soft gradient "blobs" behind hero/section
//  backgrounds. rAF-throttled, skipped on mobile and
//  prefers-reduced-motion so it never costs anything there.
// ============================================================

function enabled() {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  return !reduced && !smallScreen;
}

function init() {
  if (!enabled()) return;
  const els = () => [...document.querySelectorAll("[data-parallax]")];
  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    els().forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      const rect = el.getBoundingClientRect();
      // Only move elements roughly in/near the viewport — cheap and avoids jank far off-screen.
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const offset = (rect.top - vh / 2) * speed;
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
    });
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

document.addEventListener("DOMContentLoaded", init);
