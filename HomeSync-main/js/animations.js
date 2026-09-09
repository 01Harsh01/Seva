// ============================================================
//  js/animations.js
//  Global animation utilities — particles, number counters,
//  intersection observer reveals, ripple effects
//  Import on any page: import "./js/animations.js";
// ============================================================

// ── Floating particles ────────────────────────────────────
export function initParticles(count = 12) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 6 + 3;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}vw;
      top: ${Math.random() * 100}vh;
      --dur: ${Math.random() * 20 + 12}s;
      --delay: ${Math.random() * -20}s;
      --x1: ${(Math.random() - 0.5) * 100}px;
      --y1: ${(Math.random() - 0.5) * 100}px;
      --x2: ${(Math.random() - 0.5) * 150}px;
      --y2: ${(Math.random() - 0.5) * 150}px;
      --x3: ${(Math.random() - 0.5) * 80}px;
      --y3: ${(Math.random() - 0.5) * 80}px;
      opacity: ${Math.random() * 0.3 + 0.05};
    `;
    document.body.appendChild(p);
  }
}

// ── Animated number counter ───────────────────────────────
export function animateCounter(el, from, to, duration = 1200, prefix = "", suffix = "") {
  const start   = performance.now();
  const isFloat = String(to).includes(".");
  const decimals = isFloat ? String(to).split(".")[1].length : 0;

  const step = (now) => {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const value  = from + (to - from) * eased;

    el.textContent = prefix + (isFloat ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-IN")) + suffix;

    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Run counters on all .metric-value elements ────────────
export function animateAllCounters() {
  document.querySelectorAll(".metric-value").forEach((el) => {
    const text    = el.textContent.trim();
    const prefix  = text.match(/^[₹$£€]/) ? text[0] : "";
    const suffix  = text.match(/[%+]$/)    ? text[text.length - 1] : "";
    const numStr  = text.replace(/[₹$£€%+,]/g, "");
    const num     = parseFloat(numStr);
    if (!isNaN(num)) {
      el.textContent = prefix + "0" + suffix;
      animateCounter(el, 0, num, 1400, prefix, suffix);
    }
  });
}

// ── Intersection Observer — reveal on scroll ──────────────
export function initRevealOnScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = "running";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".card, .metric-card, .item-row").forEach((el) => {
    el.style.animationPlayState = "paused";
    observer.observe(el);
  });
}

// ── Ripple effect on buttons ──────────────────────────────
export function initRipple() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn, .nav-item, .counter-btn");
    if (!btn) return;

    const rect   = btn.getBoundingClientRect();
    const x      = e.clientX - rect.left;
    const y      = e.clientY - rect.top;
    const ripple = document.createElement("span");

    ripple.style.cssText = `
      position: absolute;
      width: 4px; height: 4px;
      background: rgba(255,255,255,0.4);
      border-radius: 50%;
      left: ${x}px; top: ${y}px;
      transform: scale(0);
      animation: rippleExpand 0.5s ease-out forwards;
      pointer-events: none;
    `;

    if (getComputedStyle(btn).position === "static") {
      btn.style.position = "relative";
    }
    btn.style.overflow = "hidden";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // Inject ripple keyframe
  if (!document.getElementById("ripple-style")) {
    const style = document.createElement("style");
    style.id    = "ripple-style";
    style.textContent = `
      @keyframes rippleExpand {
        to { transform: scale(80); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Page transition — fade out before navigate ────────────
export function initPageTransitions() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto")) return;
    if (link.target === "_blank") return;

    e.preventDefault();
    document.body.style.transition = "opacity 0.25s ease";
    document.body.style.opacity    = "0";
    setTimeout(() => { window.location.href = href; }, 260);
  });
}

// ── Stagger children animations ───────────────────────────
export function staggerChildren(parent, delay = 60) {
  if (!parent) return;
  const children = parent.children;
  Array.from(children).forEach((child, i) => {
    child.style.animationDelay = `${i * delay}ms`;
  });
}

// ── Tilt effect on cards ──────────────────────────────────
export function initCardTilt() {
  document.querySelectorAll(".metric-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect   = card.getBoundingClientRect();
      const x      = (e.clientX - rect.left) / rect.width  - 0.5;
      const y      = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-4px) scale(1.02)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.transition = "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)";
    });
    card.addEventListener("mouseenter", () => {
      card.style.transition = "transform 0.1s";
    });
  });
}

// ── Stock bar animated fill ───────────────────────────────
export function animateStockBars() {
  document.querySelectorAll(".stock-fill").forEach((bar) => {
    const targetWidth = bar.style.width;
    bar.style.width   = "0%";
    setTimeout(() => {
      bar.style.transition = "width 1s cubic-bezier(0.4,0,0.2,1)";
      bar.style.width      = targetWidth;
    }, 100);
  });
}

// ── Master init — call this on every page ─────────────────
export function initAllAnimations() {
  initParticles(10);
  initRipple();
  initPageTransitions();
  initRevealOnScroll();

  // Run after short delay to let DOM settle
  setTimeout(() => {
    animateAllCounters();
    initCardTilt();
    animateStockBars();
    staggerChildren(document.querySelector(".metrics-grid"), 80);
    staggerChildren(document.querySelector(".two-col"), 100);
  }, 300);
}
