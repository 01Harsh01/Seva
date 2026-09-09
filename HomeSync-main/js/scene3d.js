// ============================================================
//  js/scene3d.js — Home-service-themed 3D hero visuals
//
//  Replaced the previous abstract geometric shapes (torus, cone,
//  box, octahedron) with visuals that are actually relevant to a
//  home services marketplace:
//
//  Homepage hero: A stylised 3D house model built from primitives
//  (walls + roof + door + chimney + window glow) with orbiting
//  tool-themed particles, all using the brand colour palette.
//
//  Category heroes: A single floating, glowing badge showing the
//  category's thematic shape (wrench, paintbrush, etc.), much
//  more subtle and professional than a random metallic torus.
//
//  three.js loaded lazily from CDN. Falls back to CSS gradient
//  for reduced-motion or low-power devices. Everything disposed
//  on teardown so navigation never leaks canvases.
// ============================================================

let threePromise = null;
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!threePromise) {
    threePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      script.onload = () => resolve(window.THREE);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return threePromise;
}

export function reducedMotionPreferred() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isLowPowerDevice() {
  const smallScreen = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  const fewCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  const noFinePointer = window.matchMedia && !window.matchMedia("(pointer: fine)").matches;
  return smallScreen || (fewCores && noFinePointer);
}

function trackPointer(target, onMove) {
  let raw = { x: 0, y: 0 };
  function handler(e) {
    const rect = target.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    raw = { x: (cx / rect.width) * 2 - 1, y: (cy / rect.height) * 2 - 1 };
    onMove(raw);
  }
  window.addEventListener("pointermove", handler, { passive: true });
  return { untrack: () => window.removeEventListener("pointermove", handler), get: () => raw };
}

let activeHandles = [];
function registerHandle(h) { activeHandles.push(h); return h; }

// ── Shadow texture ──
function makeShadowTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.3)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// ── Tool-themed floating particles (wrench, hammer, plug, etc.) ──
function makeToolParticles(THREE, count, spread, colors) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const particleColors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.4;
    const c = new THREE.Color(colors[i % colors.length]);
    particleColors[i * 3] = c.r;
    particleColors[i * 3 + 1] = c.g;
    particleColors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.06, transparent: true, opacity: 0.55,
    sizeAttenuation: true, vertexColors: true,
  });
  return new THREE.Points(geo, mat);
}

// ── Build a stylised 3D house from primitives ──
function buildHouse(THREE, accentColor) {
  const house = new THREE.Group();

  // Base / walls — slightly warm white
  const wallGeo = new THREE.BoxGeometry(1.8, 1.2, 1.4);
  const wallMat = new THREE.MeshStandardMaterial({ color: "#F8F4F0", metalness: 0.05, roughness: 0.7 });
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = 0.6;
  house.add(walls);

  // Roof — triangular prism (using ExtrudeGeometry for a wedge shape)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.1, 0);
  roofShape.lineTo(0, 0.9);
  roofShape.lineTo(1.1, 0);
  roofShape.lineTo(-1.1, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.6, bevelEnabled: false });
  const roofMat = new THREE.MeshStandardMaterial({ color: accentColor || "#0F766E", metalness: 0.2, roughness: 0.4 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 1.2, -0.8);
  house.add(roof);

  // Door
  const doorGeo = new THREE.BoxGeometry(0.35, 0.6, 0.06);
  const doorMat = new THREE.MeshStandardMaterial({ color: "#92400E", metalness: 0.1, roughness: 0.6 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.3, 0.73);
  house.add(door);

  // Door handle
  const handleGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const handleMat = new THREE.MeshStandardMaterial({ color: "#D4AF37", metalness: 0.8, roughness: 0.2 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(0.1, 0.3, 0.77);
  house.add(handle);

  // Windows (left + right) — glowing teal
  const winGeo = new THREE.BoxGeometry(0.3, 0.3, 0.06);
  const winMat = new THREE.MeshStandardMaterial({
    color: "#06B6D4", emissive: "#06B6D4", emissiveIntensity: 0.4,
    metalness: 0.1, roughness: 0.3, transparent: true, opacity: 0.85,
  });
  const winL = new THREE.Mesh(winGeo, winMat);
  winL.position.set(-0.55, 0.7, 0.73);
  house.add(winL);
  const winR = new THREE.Mesh(winGeo, winMat);
  winR.position.set(0.55, 0.7, 0.73);
  house.add(winR);

  // Chimney
  const chimGeo = new THREE.BoxGeometry(0.25, 0.5, 0.25);
  const chimMat = new THREE.MeshStandardMaterial({ color: "#78716C", metalness: 0.15, roughness: 0.6 });
  const chimney = new THREE.Mesh(chimGeo, chimMat);
  chimney.position.set(0.5, 1.85, -0.2);
  house.add(chimney);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(4, 3);
  const groundMat = new THREE.MeshStandardMaterial({ color: "#E8F5E9", metalness: 0, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  house.add(ground);

  // Collect disposables
  const disposables = [
    wallGeo, wallMat, roofGeo, roofMat, doorGeo, doorMat,
    handleGeo, handleMat, winGeo, winMat, chimGeo, chimMat,
    groundGeo, groundMat,
  ];

  return { group: house, disposables };
}

// ── Orbiting tool icons (simple 3D shapes that represent services) ──
function buildOrbitingTools(THREE, colors) {
  const tools = new THREE.Group();
  const disposables = [];

  const toolDefs = [
    // Wrench: cylinder + sphere
    (c) => {
      const g = new THREE.Group();
      const shaft = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
      const mat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3 });
      const m = new THREE.Mesh(shaft, mat);
      g.add(m);
      const head = new THREE.TorusGeometry(0.08, 0.03, 8, 12);
      const hm = new THREE.Mesh(head, mat);
      hm.position.y = 0.28;
      hm.rotation.x = Math.PI / 2;
      g.add(hm);
      disposables.push(shaft, head, mat);
      return g;
    },
    // Hammer: box + cylinder
    (c) => {
      const g = new THREE.Group();
      const handle = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
      const mat = new THREE.MeshStandardMaterial({ color: "#92400E", metalness: 0.2, roughness: 0.5 });
      const hm = new THREE.Mesh(handle, mat);
      g.add(hm);
      const headGeo = new THREE.BoxGeometry(0.2, 0.08, 0.08);
      const headMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.2 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.28;
      g.add(head);
      disposables.push(handle, mat, headGeo, headMat);
      return g;
    },
    // Paintbrush: cone + cylinder
    (c) => {
      const g = new THREE.Group();
      const handle = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
      const mat = new THREE.MeshStandardMaterial({ color: "#D4A574", metalness: 0.1, roughness: 0.6 });
      const hm = new THREE.Mesh(handle, mat);
      g.add(hm);
      const bristle = new THREE.ConeGeometry(0.06, 0.15, 8);
      const bMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.1, roughness: 0.4 });
      const bm = new THREE.Mesh(bristle, bMat);
      bm.position.y = -0.28;
      bm.rotation.z = Math.PI;
      g.add(bm);
      disposables.push(handle, mat, bristle, bMat);
      return g;
    },
    // Lightning bolt (electrical): two angled boxes
    (c) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.3, roughness: 0.3, emissive: c, emissiveIntensity: 0.3 });
      const b1 = new THREE.BoxGeometry(0.08, 0.25, 0.04);
      const m1 = new THREE.Mesh(b1, mat);
      m1.rotation.z = 0.3;
      m1.position.set(-0.02, 0.1, 0);
      g.add(m1);
      const b2 = new THREE.BoxGeometry(0.08, 0.25, 0.04);
      const m2 = new THREE.Mesh(b2, mat);
      m2.rotation.z = -0.3;
      m2.position.set(0.02, -0.1, 0);
      g.add(m2);
      disposables.push(b1, b2, mat);
      return g;
    },
    // Gear/cog: torus
    (c) => {
      const g = new THREE.Group();
      const gear = new THREE.TorusGeometry(0.12, 0.035, 6, 8);
      const mat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.3 });
      const m = new THREE.Mesh(gear, mat);
      g.add(m);
      const center = new THREE.CylinderGeometry(0.04, 0.04, 0.07, 8);
      const cm = new THREE.Mesh(center, mat);
      cm.rotation.x = Math.PI / 2;
      g.add(cm);
      disposables.push(gear, center, mat);
      return g;
    },
  ];

  toolDefs.forEach((builder, i) => {
    const c = colors[i % colors.length];
    const tool = builder(c);
    const angle = (i / toolDefs.length) * Math.PI * 2;
    const radius = 2.2;
    tool.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.4 + 0.8, Math.sin(angle) * 0.8);
    tool.userData.orbitAngle = angle;
    tool.userData.orbitSpeed = 0.15 + Math.random() * 0.1;
    tool.userData.orbitRadius = radius;
    tool.userData.floatOffset = Math.random() * Math.PI * 2;
    tool.scale.setScalar(0.9);
    tools.add(tool);
  });

  return { group: tools, disposables };
}

// ------------------------------------------------------------
// Homepage hero: 3D house with orbiting tool icons + particles
// ------------------------------------------------------------
export async function mountHeroFieldScene({ container, colors }) {
  teardownScene(container);
  if (!container) return () => {};

  if (reducedMotionPreferred() || isLowPowerDevice()) {
    container.style.background = `radial-gradient(circle at 70% 35%, ${colors[0]}30, transparent 55%), radial-gradient(circle at 25% 70%, ${colors[1]}20, transparent 50%)`;
    registerHandle({ container, dispose: () => { container.style.background = ""; } });
    return () => teardownScene(container);
  }

  let THREE;
  try { THREE = await loadThree(); }
  catch {
    container.style.background = `radial-gradient(circle at 70% 35%, ${colors[0]}30, transparent 55%)`;
    registerHandle({ container, dispose: () => { container.style.background = ""; } });
    return () => teardownScene(container);
  }

  const width = container.clientWidth || 700;
  const height = container.clientHeight || 520;

  const scene = new THREE.Scene();
  // Add a subtle fog for depth
  scene.fog = new THREE.FogExp2(0xF8F9FC, 0.06);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(2.5, 2.5, 5.5);
  camera.lookAt(0, 0.6, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = false;
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // Build the house
  const { group: house, disposables: houseDisposables } = buildHouse(THREE, colors[0]);
  house.scale.setScalar(0.85);
  scene.add(house);

  // Build orbiting tools
  const { group: tools, disposables: toolDisposables } = buildOrbitingTools(THREE, colors);
  scene.add(tools);

  // Particles
  const particles = makeToolParticles(THREE, 60, 8, colors);
  scene.add(particles);

  // Shadow under house
  const shadowMat = new THREE.MeshBasicMaterial({ map: makeShadowTexture(THREE), transparent: true, depthWrite: false });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.01, 0.2);
  scene.add(shadowPlane);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fill = new THREE.PointLight(new THREE.Color(colors[0]).getHex(), 0.4);
  fill.position.set(-3, 2, 3);
  scene.add(fill);
  const rim = new THREE.PointLight(new THREE.Color(colors[1] || colors[0]).getHex(), 0.3);
  rim.position.set(3, -1, -3);
  scene.add(rim);

  let raf = null, disposed = false, t = 0;
  const pointerTracker = trackPointer(container.closest("section") || container, () => {});

  function resize() {
    if (disposed) return;
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function tick() {
    if (disposed) return;
    t += 0.008;

    // Gently float the house
    house.position.y = Math.sin(t * 0.5) * 0.06;
    house.rotation.y += 0.001;

    // Orbit tools around the house
    tools.children.forEach((tool, i) => {
      const ud = tool.userData;
      ud.orbitAngle += ud.orbitSpeed * 0.008;
      tool.position.x = Math.cos(ud.orbitAngle) * ud.orbitRadius;
      tool.position.z = Math.sin(ud.orbitAngle) * ud.orbitRadius * 0.5;
      tool.position.y = 0.8 + Math.sin(t * 1.2 + ud.floatOffset) * 0.25;
      tool.rotation.y += 0.012;
      tool.rotation.z = Math.sin(t + i) * 0.15;
    });

    // Drift particles
    particles.rotation.y += 0.0004;

    // Mouse parallax
    const pointer = pointerTracker.get();
    camera.position.x += ((2.5 + pointer.x * 0.8) - camera.position.x) * 0.025;
    camera.position.y += ((2.5 - pointer.y * 0.4) - camera.position.y) * 0.025;
    camera.lookAt(0, 0.6, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  function dispose() {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    pointerTracker.untrack();
    houseDisposables.forEach(d => d.dispose());
    toolDisposables.forEach(d => d.dispose());
    particles.geometry.dispose(); particles.material.dispose();
    shadowPlane.geometry.dispose(); shadowMat.dispose(); shadowMat.map.dispose();
    renderer.dispose();
    container.innerHTML = "";
  }

  registerHandle({ container, dispose });
  return () => teardownScene(container);
}

// ------------------------------------------------------------
// Category hero: a floating, glowing badge with themed accent
// — much more subtle and relevant than the old abstract shapes
// ------------------------------------------------------------
export async function mountCategoryScene({ container, shape, color }) {
  teardownScene(container);
  if (!container) return () => {};

  if (reducedMotionPreferred() || isLowPowerDevice()) {
    container.style.background = `radial-gradient(circle at 65% 40%, ${color}55, transparent 60%)`;
    registerHandle({ container, dispose: () => { container.style.background = ""; } });
    return () => teardownScene(container);
  }

  let THREE;
  try { THREE = await loadThree(); }
  catch {
    container.style.background = `radial-gradient(circle at 65% 40%, ${color}55, transparent 60%)`;
    registerHandle({ container, dispose: () => { container.style.background = ""; } });
    return () => teardownScene(container);
  }

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0.3, 3.8);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.innerHTML = "";
  container.style.background = "";
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  scene.add(group);

  // Create a themed badge — glowing sphere with inner ring
  const sphereGeo = new THREE.SphereGeometry(0.9, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({
    color, metalness: 0.15, roughness: 0.35,
    transparent: true, opacity: 0.25,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Inner glowing core
  const coreGeo = new THREE.SphereGeometry(0.45, 24, 24);
  const coreMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.5,
    metalness: 0.3, roughness: 0.2,
    transparent: true, opacity: 0.7,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Orbital ring
  const ringGeo = new THREE.TorusGeometry(1.15, 0.025, 12, 48);
  const ringMat = new THREE.MeshStandardMaterial({
    color: "#ffffff", metalness: 0.5, roughness: 0.3,
    transparent: true, opacity: 0.4,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.5;
  group.add(ring);

  // Second ring at different angle
  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.rotation.x = Math.PI / 3;
  ring2.rotation.y = Math.PI / 4;
  group.add(ring2);

  // Small orbiting accent dots
  const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const dotMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.8 });
  const dots = [];
  for (let i = 0; i < 4; i++) {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.userData.angle = (i / 4) * Math.PI * 2;
    dot.userData.speed = 0.4 + Math.random() * 0.3;
    dot.userData.radius = 1.0 + Math.random() * 0.3;
    group.add(dot);
    dots.push(dot);
  }

  // Shadow below
  const shadowMat2 = new THREE.MeshBasicMaterial({ map: makeShadowTexture(THREE), transparent: true, depthWrite: false });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), shadowMat2);
  shadowPlane.position.set(0, -1.5, -0.3);
  group.add(shadowPlane);

  // Particles
  const pGeo = new THREE.BufferGeometry();
  const pCount = 40;
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 5;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 3;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 3;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({ color, size: 0.03, transparent: true, opacity: 0.4, sizeAttenuation: true });
  const pMesh = new THREE.Points(pGeo, pMat);
  scene.add(pMesh);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.PointLight(0xffffff, 1.0);
  key.position.set(3, 3, 4);
  scene.add(key);
  const accent = new THREE.PointLight(new THREE.Color(color).getHex(), 0.7);
  accent.position.set(-2, -1, 2);
  scene.add(accent);

  let raf = null, disposed = false, t = 0;
  const pointerTracker = trackPointer(container.closest("section") || container, () => {});

  function resize() {
    if (disposed) return;
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function tick() {
    if (disposed) return;
    t += 0.01;

    // Gentle rotation
    group.rotation.y += 0.003;
    core.rotation.y -= 0.008;

    // Pulse the outer sphere
    const pulse = 1 + Math.sin(t * 0.8) * 0.04;
    sphere.scale.setScalar(pulse);

    // Rings rotate independently
    ring.rotation.z += 0.004;
    ring2.rotation.z -= 0.003;

    // Orbiting dots
    dots.forEach(dot => {
      dot.userData.angle += dot.userData.speed * 0.015;
      const r = dot.userData.radius;
      dot.position.x = Math.cos(dot.userData.angle) * r;
      dot.position.y = Math.sin(dot.userData.angle * 0.7) * r * 0.6;
      dot.position.z = Math.sin(dot.userData.angle) * r * 0.5;
    });

    // Particles drift
    pMesh.rotation.y += 0.0005;

    // Mouse parallax
    const pointer = pointerTracker.get();
    group.rotation.y += ((pointer.x * 0.3) - group.rotation.y) * 0.02;
    group.rotation.x += ((-pointer.y * 0.15) - group.rotation.x) * 0.02;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  function dispose() {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    pointerTracker.untrack();
    sphereGeo.dispose(); sphereMat.dispose();
    coreGeo.dispose(); coreMat.dispose();
    ringGeo.dispose(); ringMat.dispose();
    dotGeo.dispose(); dotMat.dispose();
    shadowPlane.geometry.dispose(); shadowMat2.dispose(); shadowMat2.map.dispose();
    pGeo.dispose(); pMat.dispose();
    renderer.dispose();
    container.innerHTML = "";
  }

  registerHandle({ container, dispose });
  return () => teardownScene(container);
}

export function teardownScene(container) {
  activeHandles = activeHandles.filter((h) => {
    if (!container || h.container === container) { h.dispose(); return false; }
    return true;
  });
}

export function teardownActiveScene() {
  activeHandles.forEach((h) => h.dispose());
  activeHandles = [];
}
