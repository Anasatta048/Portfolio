/* ==========================================================================
   three-hero.js — interactive "git graph constellation" behind the hero.
   --------------------------------------------------------------------------
   • A cloud of glowing nodes linked by faint edges (the "network"),
     plus four git-branch lanes (main / feature / hotfix / release) with
     commit nodes that fork off and merge back into main.
   • Mouse → camera parallax. Scroll out of the hero → nodes spread apart
     and the camera dollies forward.
   • Pixel ratio capped at 2, rendering paused off-screen (IntersectionObserver
     + Page Visibility), resize handled, theme-aware (dark: additive glow,
     light: normal blending with deeper colours).
   • Falls back to the CSS gradient (.hero__fallback) when WebGL is missing
     or the user prefers reduced motion.
   Tweak: CONFIG below.
   ========================================================================== */
(function () {
  "use strict";

  const CONFIG = {
    nodes: { desktop: 170, mobile: 80 }, // network node count
    linkDistance: 2.6, // max distance for an edge between two nodes
    maxLinksPerNode: 3,
    driftSpeed: 0.035, // radians / second of idle rotation
    parallax: { x: 1.4, y: 0.9 }, // camera offset at full mouse deflection
    spreadOnScroll: 1.0, // how far nodes fly apart when scrolling out
    dollyOnScroll: 5.5, // camera z travel while scrolling out
    palette: {
      dark: { blue: "#58a6ff", green: "#3fb950", purple: "#a371f7", orange: "#d29922", line: 0.22 },
      light: { blue: "#0969da", green: "#1a7f37", purple: "#8250df", orange: "#9a6700", line: 0.28 },
    },
  };

  const canvas = document.getElementById("hero-canvas");
  const hero = document.getElementById("top");
  if (!canvas || !hero) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !hasWebGL()) {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  /* Perf: Three.js (~600KB) is NOT in the critical path. It is injected after
     the page has loaded and the main thread is idle; until then the CSS
     gradient (.hero__fallback) is what you see. */
  const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  const whenIdle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));
  const boot = () =>
    whenIdle(() => {
      if (window.THREE) return init();
      const tag = document.createElement("script");
      tag.src = THREE_SRC;
      tag.async = true;
      tag.onload = init;
      tag.onerror = () => document.documentElement.classList.add("no-webgl");
      document.head.appendChild(tag);
    });
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot, { once: true });

  function init() {
  if (!window.THREE) return;
  const THREE = window.THREE;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;

  /* ---------------------------------------------------------------- setup */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    document.documentElement.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const BASE_Z = isMobile ? 17 : 14;
  camera.position.set(0, 0, BASE_Z);

  const world = new THREE.Group();
  world.rotation.x = 0.18;
  scene.add(world);

  const uniforms = {
    uTime: { value: 0 },
    uSpread: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uLineAlpha: { value: 0.22 },
    uFade: { value: 1 },
  };

  /* Seeded RNG so the constellation looks the same on every visit */
  let seed = 48;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* ------------------------------------------------------------ shaders */
  const pointVert = /* glsl */ `
    attribute float aSize;
    attribute float aSeed;
    attribute vec3 aColor;
    uniform float uTime;
    uniform float uSpread;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      vec3 p = position;
      vec3 dir = normalize(position + vec3(0.001));
      p += dir * uSpread * (2.0 + aSeed * 6.0);
      p.y += sin(uTime * 0.6 + aSeed * 6.2831) * 0.18;
      p.x += cos(uTime * 0.4 + aSeed * 12.0) * 0.12;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPixelRatio * (22.0 / -mv.z);
      vColor = aColor;
      vTwinkle = 0.65 + 0.35 * sin(uTime * 1.7 + aSeed * 40.0);
    }`;

  const pointFrag = /* glsl */ `
    uniform float uFade;
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float core = smoothstep(0.18, 0.0, d);
      float halo = pow(smoothstep(0.5, 0.0, d), 2.2);
      float a = (core + halo * 0.65) * vTwinkle * uFade;
      gl_FragColor = vec4(vColor * (0.75 + core * 0.6), a);
    }`;

  const lineVert = /* glsl */ `
    attribute float aSeed;
    attribute vec3 aColor;
    uniform float uTime;
    uniform float uSpread;
    varying vec3 vColor;
    varying float vDepth;
    void main() {
      vec3 p = position;
      vec3 dir = normalize(position + vec3(0.001));
      p += dir * uSpread * (2.0 + aSeed * 6.0);
      p.y += sin(uTime * 0.6 + aSeed * 6.2831) * 0.18;
      p.x += cos(uTime * 0.4 + aSeed * 12.0) * 0.12;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      vColor = aColor;
      vDepth = clamp((-mv.z - 4.0) / 22.0, 0.0, 1.0);
    }`;

  const lineFrag = /* glsl */ `
    uniform float uLineAlpha;
    uniform float uSpread;
    uniform float uFade;
    varying vec3 vColor;
    varying float vDepth;
    void main() {
      float a = uLineAlpha * (1.0 - vDepth * 0.7) * (1.0 - uSpread * 0.85) * uFade;
      gl_FragColor = vec4(vColor, a);
    }`;

  function makePointsMaterial() {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: pointVert,
      fragmentShader: pointFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  function makeLineMaterial() {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: lineVert,
      fragmentShader: lineFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  /* ---------------------------------------------- 1) network of nodes */
  const nodeCount = isMobile ? CONFIG.nodes.mobile : CONFIG.nodes.desktop;
  const nodes = []; // {x,y,z,seed,colorKey}
  const colorKeys = ["blue", "green", "purple", "blue", "green"];
  for (let i = 0; i < nodeCount; i++) {
    // flattened ellipsoid, denser toward the right side where the copy is not
    const u = rand() * Math.PI * 2;
    const v = Math.acos(2 * rand() - 1);
    const r = Math.cbrt(rand());
    nodes.push({
      x: Math.sin(v) * Math.cos(u) * r * 13 + 2.5,
      y: Math.sin(v) * Math.sin(u) * r * 6.5,
      z: Math.cos(v) * r * 6 - 1,
      seed: rand(),
      colorKey: colorKeys[i % colorKeys.length],
      size: 1.2 + rand() * 2.4,
    });
  }

  // edges between nearby nodes
  const edges = [];
  const linkCount = new Array(nodeCount).fill(0);
  const maxD2 = CONFIG.linkDistance * CONFIG.linkDistance;
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (linkCount[i] >= CONFIG.maxLinksPerNode || linkCount[j] >= CONFIG.maxLinksPerNode) continue;
      const a = nodes[i], b = nodes[j];
      const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (d2 < maxD2) {
        edges.push([i, j]);
        linkCount[i]++;
        linkCount[j]++;
      }
    }
  }

  /* --------------------------------------------- 2) git branch lanes */
  // main runs left→right; branches fork off and merge back like `git log --graph`
  const lanes = [
    { key: "green", from: -13, to: 14, y: 0, z: 0, bend: 0, main: true },
    { key: "blue", from: -8, to: 1, y: 2.4, z: 1.2, bend: 1 },
    { key: "purple", from: -2, to: 9, y: -2.6, z: 0.8, bend: 1 },
    { key: "orange", from: 5, to: 12, y: 1.9, z: -1.4, bend: 1 },
  ];
  const lanePoints = []; // commit nodes on lanes
  const laneSegments = []; // pairs of [x,y,z,seed,colorKey]

  lanes.forEach((lane) => {
    const steps = Math.round((lane.to - lane.from) / 0.35);
    let prev = null;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = lane.from + (lane.to - lane.from) * t;
      // smooth fork/merge: 0 at both ends, full offset in the middle
      const k = lane.main ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      const ease = lane.main ? 0 : Math.pow(k, 0.6);
      const y = lane.main ? Math.sin(x * 0.25) * 0.35 : lane.y * ease + Math.sin(x * 0.25) * 0.35 * (1 - ease);
      const z = lane.z * ease;
      const p = { x, y, z, seed: 0.05 + t * 0.15, colorKey: lane.key };
      if (prev) laneSegments.push([prev, p]);
      if (s % 4 === 0) lanePoints.push({ ...p, size: lane.main ? 4.2 : 3.6 });
      prev = p;
    }
  });

  /* ------------------------------------------------------- geometry */
  const pointGeom = new THREE.BufferGeometry();
  const lineGeom = new THREE.BufferGeometry();
  const allPoints = nodes.concat(lanePoints);

  const pPos = new Float32Array(allPoints.length * 3);
  const pCol = new Float32Array(allPoints.length * 3);
  const pSize = new Float32Array(allPoints.length);
  const pSeed = new Float32Array(allPoints.length);

  const segCount = edges.length + laneSegments.length;
  const lPos = new Float32Array(segCount * 6);
  const lCol = new Float32Array(segCount * 6);
  const lSeed = new Float32Array(segCount * 2);

  allPoints.forEach((n, i) => {
    pPos.set([n.x, n.y, n.z], i * 3);
    pSize[i] = n.size;
    pSeed[i] = n.seed;
  });

  let li = 0;
  const pushSeg = (a, b) => {
    lPos.set([a.x, a.y, a.z, b.x, b.y, b.z], li * 6);
    lSeed[li * 2] = a.seed;
    lSeed[li * 2 + 1] = b.seed;
    li++;
  };
  edges.forEach(([i, j]) => pushSeg(nodes[i], nodes[j]));
  laneSegments.forEach(([a, b]) => pushSeg(a, b));

  pointGeom.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pointGeom.setAttribute("aColor", new THREE.BufferAttribute(pCol, 3));
  pointGeom.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
  pointGeom.setAttribute("aSeed", new THREE.BufferAttribute(pSeed, 1));

  lineGeom.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
  lineGeom.setAttribute("aColor", new THREE.BufferAttribute(lCol, 3));
  lineGeom.setAttribute("aSeed", new THREE.BufferAttribute(lSeed, 1));

  const pointsMat = makePointsMaterial();
  const lineMat = makeLineMaterial();
  const points = new THREE.Points(pointGeom, pointsMat);
  const lines = new THREE.LineSegments(lineGeom, lineMat);
  world.add(lines, points);

  /* --------------------------------------------------- theme colours */
  function applyTheme() {
    const theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const pal = CONFIG.palette[theme];
    const c = new THREE.Color();
    const setColor = (arr, idx, key) => {
      c.set(pal[key]);
      arr[idx] = c.r;
      arr[idx + 1] = c.g;
      arr[idx + 2] = c.b;
    };
    allPoints.forEach((n, i) => setColor(pCol, i * 3, n.colorKey));
    let k = 0;
    edges.forEach(([i, j]) => {
      setColor(lCol, k * 6, nodes[i].colorKey);
      setColor(lCol, k * 6 + 3, nodes[j].colorKey);
      k++;
    });
    laneSegments.forEach(([a, b]) => {
      setColor(lCol, k * 6, a.colorKey);
      setColor(lCol, k * 6 + 3, b.colorKey);
      k++;
    });
    pointGeom.attributes.aColor.needsUpdate = true;
    lineGeom.attributes.aColor.needsUpdate = true;

    const blending = theme === "light" ? THREE.NormalBlending : THREE.AdditiveBlending;
    pointsMat.blending = blending;
    lineMat.blending = blending;
    pointsMat.needsUpdate = true;
    lineMat.needsUpdate = true;
    uniforms.uLineAlpha.value = pal.line;
    requestRender();
  }

  /* ------------------------------------------------------ interaction */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollProgress = 0;

  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  const updateScroll = () => {
    const h = hero.offsetHeight || 1;
    scrollProgress = Math.min(1, Math.max(0, window.scrollY / h));
  };
  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  /* ------------------------------------------------------------ resize */
  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the graph comfortably framed on narrow screens
    camera.fov = w < 768 ? 70 : 55;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
    requestRender();
  }
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  /* ------------------------------------------------------------ loop */
  let visible = true;
  let rafId = 0;
  let last = performance.now();
  let elapsed = 0;

  function frame(now) {
    rafId = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;

    uniforms.uTime.value = elapsed;
    // ease scroll + mouse
    uniforms.uSpread.value += (scrollProgress * CONFIG.spreadOnScroll - uniforms.uSpread.value) * 0.08;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    world.rotation.y += CONFIG.driftSpeed * dt;
    world.rotation.z = Math.sin(elapsed * 0.1) * 0.05;

    camera.position.x = mouse.x * CONFIG.parallax.x;
    camera.position.y = -mouse.y * CONFIG.parallax.y;
    camera.position.z = BASE_Z - scrollProgress * CONFIG.dollyOnScroll;
    camera.lookAt(0, 0, 0);
    uniforms.uFade.value = 1 - scrollProgress * 0.6;

    renderer.render(scene, camera);
    if (visible && !document.hidden) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (!rafId) {
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function requestRender() {
    if (!rafId) requestAnimationFrame((t) => {
      renderer.render(scene, camera);
      if (visible && !document.hidden) start();
    });
  }

  // pause when the hero leaves the viewport
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    },
    { threshold: 0 }
  ).observe(hero);

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : visible && start()));
  window.addEventListener("themechange", applyTheme);

  applyTheme();
  resize();
  start();
  requestAnimationFrame(() => canvas.classList.add("is-ready"));
  } // end init()

  /* ---------------------------------------------------------- helpers */
  function hasWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }
})();
