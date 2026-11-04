/* ==========================================================================
   main.js — Anas Atta portfolio
   --------------------------------------------------------------------------
   0.  Config (all animation speeds / distances live here)
   1.  Utilities
   2.  Theme
   3.  Rendering from data.js (pinned, repositories, showcase, SHAs)
   4.  Browser mockup: screenshot loading + "live page" scrolling
   5.  Contribution graph
   6.  Typing + split text
   7.  Scroll system (progress bar, header, tabs, smooth anchors)
   8.  GSAP animation system (data-anim, pin, skill bars, parallax…)
   9.  Preloader + hero intro
   10. Tilt + glare, magnetic buttons, custom cursor
   11. Project drawer (modal) with full-page screenshot
   12. Command palette + header search
   13. Clipboard + toasts
   14. Contact terminal form
   15. Easter egg (Konami / "git push" → confetti)
   16. Boot
   ========================================================================== */
(function () {
  "use strict";

  /* ======================================================================
     0. CONFIG — tweak speeds and directions here
     ====================================================================== */
  const CONFIG = {
    // Signature right-to-left entrance (used by every [data-anim="rtl"])
    rtl: { x: 120, duration: 0.9, ease: "power3.out", start: "top 85%", stagger: 0.12 },
    rtlMobile: { x: 44, duration: 0.7 }, // lighter on phones
    heroChars: { x: 90, rotateY: -55, duration: 1, stagger: 0.035, ease: "power4.out" },
    preloaderMs: 650, // fake "clone" duration (first visit per session only)
    screenScrollSpeed: 260, // px / second for hover auto-scroll of screenshots
    screenReturn: 0.9, // seconds to glide back to the top on mouse leave
    tiltMax: 7, // degrees
    magnetStrength: 0.35,
    typing: { type: 42, erase: 18, hold: 2300 },
    // Screenshot service fallback when no local image is registered in js/screens.js
    screenshotService: (url, width) => `https://image.thum.io/get/width/${width}/fullpage/${url}`,
    pinBreakpoint: "(min-width: 900px)",
  };

  const D = window.PORTFOLIO;
  if (!D) return;
  const LOCAL_SCREENS = window.LOCAL_SCREENS || {};

  const root = document.documentElement;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasST = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  const hasFlip = hasGSAP && typeof window.Flip !== "undefined";
  const hasScrollTo = hasGSAP && typeof window.ScrollToPlugin !== "undefined";
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const reduced = () => reduceMQ.matches;

  if (hasGSAP) {
    const plugins = [window.ScrollTrigger, window.ScrollToPlugin, window.Flip].filter(Boolean);
    gsap.registerPlugin(...plugins);
    if (hasST) ScrollTrigger.config({ ignoreMobileResize: true });
    if (!reduced()) root.classList.add("anim-ready");
  }

  const state = { pinST: null, activeTab: null, filter: "All", query: "" };

  /* ======================================================================
     1. Utilities
     ====================================================================== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const icon = (name, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const pad2 = (n) => String(n).padStart(2, "0");
  const bySlug = (slug) => D.PROJECTS.find((p) => p.slug === slug);

  /** rAF-throttle: run fn at most once per frame */
  function rafThrottle(fn) {
    let queued = false;
    return (...args) => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn(...args);
      });
    };
  }

  /** Small deterministic string hash → hex (fake commit SHAs, seeds) */
  function hashStr(str) {
    let h1 = 0xdeadbeef ^ str.length,
      h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }

  /** Seeded PRNG (mulberry32) */
  function rng(seed) {
    let a = parseInt(hashStr(String(seed)).slice(0, 8), 16);
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const headerEl = $("#site-header");
  const headerOffset = () => (headerEl ? headerEl.offsetHeight : 0);

  /* ======================================================================
     2. Theme (dark default, light option, persisted, respects system)
     ====================================================================== */
  const themeBtn = $("#theme-toggle");

  function setTheme(theme, persist = true) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {}
    }
    if (themeBtn) themeBtn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }

  /** Toggle with a circular reveal (View Transitions API) when available */
  function toggleTheme(origin) {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reduced()) return setTheme(next);
    const r = origin ? origin.getBoundingClientRect() : { left: innerWidth - 40, top: 30, width: 0, height: 0 };
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => setTheme(next));
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 550, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" }
        );
      })
      .catch(() => {});
  }

  function initTheme() {
    setTheme(root.getAttribute("data-theme") || "dark", false);
    themeBtn && themeBtn.addEventListener("click", () => toggleTheme(themeBtn));
    // follow the OS while the user hasn't chosen explicitly
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
      let saved = null;
      try {
        saved = localStorage.getItem("theme");
      } catch (err) {}
      if (!saved) setTheme(e.matches ? "light" : "dark", false);
    });
  }

  /* ======================================================================
     3. Rendering from data.js
     ====================================================================== */
  const langColor = (lang) => D.LANG[String(lang).split(" ")[0]] || "#8b949e";

  function visibilityBadge(p) {
    if (p.url) return `<span class="badge badge-green">Live</span>`;
    if (p.repo) return `<span class="badge">Public</span>`;
    return `<span class="badge">Private</span>`;
  }

  function metaRow(p) {
    return `<div class="repo-meta">
      <span><i class="lang-dot" style="--c:${langColor(p.lang)}"></i>${esc(p.lang)}</span>
      <span title="Stars">${icon("star")}${p.stars}</span>
      <span title="Forks">${icon("fork")}${p.forks}</span>
      <span>Updated ${esc(p.updated)}</span>
    </div>`;
  }

  const topics = (p, max = 99) =>
    `<ul class="topics">${p.tags
      .slice(0, max)
      .map((t) => `<li class="topic">${esc(t)}</li>`)
      .join("")}</ul>`;

  function renderPinned() {
    const list = $("#pinned");
    if (!list) return;
    list.innerHTML = D.PROJECTS.filter((p) => p.pinned)
      .slice(0, 6)
      .map(
        (p) => `<li>
          <article class="pin-card" data-cursor-label="open">
            <div class="repo-title">${icon("book")}
              <button class="repo-name" type="button" data-open="${p.slug}">${esc(p.repoName)}</button>
              ${visibilityBadge(p)}
            </div>
            <p class="repo-desc">${esc(p.desc)}</p>
            ${metaRow(p)}
          </article>
        </li>`
      )
      .join("");
  }

  function renderFilters() {
    const wrap = $("#filters");
    if (!wrap) return;
    wrap.innerHTML = D.FILTERS.map((f) => {
      const count = f === "All" ? D.PROJECTS.length : D.PROJECTS.filter((p) => p.cats.includes(f)).length;
      return `<button type="button" class="filter" data-filter="${esc(f)}" aria-pressed="${f === "All"}">${esc(f)} <span class="counter">${count}</span></button>`;
    }).join("");
  }

  function renderRepos() {
    const grid = $("#repo-grid");
    if (!grid) return;
    grid.innerHTML = D.PROJECTS.map(
      (p) => `<li class="repo-item" data-slug="${p.slug}" data-cats="${esc(p.cats.join("|"))}"
            data-search="${esc([p.name, p.repoName, p.desc, p.lang, p.tags.join(" "), p.cats.join(" ")].join(" ").toLowerCase())}">
        <article class="repo-card" data-tilt data-host data-slug="${p.slug}" data-cursor-label="open">
          <div class="repo-card__thumb">${browserHTML(p, { size: 800, compact: true })}</div>
          <div class="repo-card__body">
            <div class="repo-title">${icon("book")}
              <button class="repo-name" type="button" data-open="${p.slug}">${esc(p.repoName)}</button>
              ${visibilityBadge(p)}
            </div>
            <p class="repo-desc">${esc(p.desc)}</p>
            ${topics(p, 4)}
            ${metaRow(p)}
          </div>
          <span class="tilt-glare" aria-hidden="true"></span>
        </article>
      </li>`
    ).join("");
    // keep every "N repos / N live" stat in sync with data.js
    const stats = { repos: D.PROJECTS.length, live: D.PROJECTS.filter((p) => p.url).length };
    $("#repo-count").textContent = stats.repos;
    $$("[data-stat]").forEach((el) => {
      const v = stats[el.dataset.stat];
      if (el.dataset.count) el.dataset.count = v;
      else el.textContent = v;
    });
  }

  function renderShowcase() {
    const track = $("#showcase-track");
    if (!track) return;
    const featured = D.PROJECTS.filter((p) => p.featured);
    const total = pad2(featured.length);
    track.innerHTML = featured
      .map(
        (p, i) => `<li class="show-card" data-slug="${p.slug}">
          ${browserHTML(p, { size: 1000, tilt: true, host: true })}
          <div class="show-card__info">
            <p class="show-card__num"><b>${pad2(i + 1)}</b> / ${total} · ${esc(p.year)}</p>
            <h3 class="show-card__title">${esc(p.name)}</h3>
            <span class="deploy-chip">${p.host ? "Deployed on " + esc(p.host) : "Deployed · production"}</span>
            <p class="show-card__desc">${esc(p.desc)}</p>
            <p class="show-card__impact">${esc(p.impact)}</p>
            ${topics(p)}
            ${metaRow(p)}
            <div class="show-card__actions">
              <a class="btn btn-primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-magnetic>${icon("external")}Visit live</a>
              <button class="btn" type="button" data-open="${p.slug}">${icon("eye")}Details</button>
            </div>
          </div>
        </li>`
      )
      .join("");
    $("#showcase-total").textContent = total;
    const pc = $("#proj-count");
    if (pc) pc.textContent = featured.length;
  }

  /** Fill commit hashes in the experience timeline */
  function renderShas() {
    $$(".commit-list li").forEach((li) => {
      const sha = $(".sha", li);
      if (sha) sha.textContent = hashStr(li.textContent.trim()).slice(0, 7);
    });
  }

  /* ======================================================================
     4. Browser mockup — screenshots that behave like live pages
     ====================================================================== */
  function browserHTML(p, opts = {}) {
    let host = `${p.repoName}.local`;
    let path = "";
    if (p.url) {
      try {
        const u = new URL(p.url);
        host = u.hostname.replace(/^www\./, "");
        path = u.pathname.replace(/\/$/, "");
      } catch (e) {}
    }
    const favicon = p.url
      ? `<img class="favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32" alt="" width="14" height="14" loading="lazy" onerror="this.style.display='none'">`
      : icon(p.icon);
    const right = p.url
      ? `<span class="live-badge"><span class="live-dot"></span>Live</span>`
      : `<span class="badge">${icon("lock")}Private</span>`;
    return `<div class="browser${p.mobile ? " browser--mobile" : ""}" data-browser data-slug="${p.slug}" data-size="${opts.size || 800}"${opts.tilt ? " data-tilt" : ""}${opts.host ? " data-host" : ""}${opts.host ? ' data-cursor-label="open"' : ""}>
      <div class="browser__chrome" aria-hidden="true">
        <span class="dots"><i></i><i></i><i></i></span>
        <div class="browser__tab">${favicon}<span>${esc(p.name)}</span>${icon("x")}</div>
      </div>
      <div class="browser__toolbar">
        <span class="browser__nav" aria-hidden="true">${icon("arrow-right", "icon flip-x")}${icon("arrow-right")}</span>
        <div class="address">${p.url ? icon("lock") : icon("code")}<span class="address__url">${p.url ? "https://" : ""}<b>${esc(host)}</b>${esc(path)}</span><span class="address__progress"></span></div>
        ${right}
      </div>
      <div class="browser__viewport">
        <div class="browser__placeholder">
          ${icon(p.icon)}
          <strong>${esc(p.name)}</strong>
          <span>${p.url ? "Preview unavailable — open the live site" : `🔒 Private client work · ${esc(p.lang)}`}</span>
        </div>
        <div class="browser__skeleton" aria-hidden="true">
          <div class="sk sk-nav"></div><div class="sk sk-hero"></div><div class="sk sk-w70"></div><div class="sk sk-w50"></div>
          <div class="sk-row"><div class="sk sk-card"></div><div class="sk sk-card"></div><div class="sk sk-card"></div></div>
          <div class="sk sk-w70"></div><div class="sk sk-w50"></div>
        </div>
        <img class="browser__shot" alt="Full-page screenshot of ${esc(p.name)}" width="1440" height="2400" decoding="async" draggable="false" />
        <svg class="browser__cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l16 9.5-7 1.5-3.5 7z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>
        ${opts.compact ? "" : `<span class="browser__hint">${icon("pulse")}hover · scroll</span>`}
      </div>
      ${opts.tilt ? '<span class="tilt-glare" aria-hidden="true"></span>' : ""}
    </div>`;
  }

  /** Ordered list of image URLs to try: local → screenshot service */
  function screenSources(p, size) {
    const list = [];
    const local = LOCAL_SCREENS[p.slug];
    if (local) {
      // cards + showcase use the light 800px "-sm" variant (≈3× fewer pixels to
      // decode); the drawer gets the full 1440px capture.
      if (size < 1440) list.push(local.replace(/(\.\w+)$/, "-sm$1"));
      list.push(local);
    }
    if (p.url) list.push(CONFIG.screenshotService(p.url, size));
    return list;
  }

  /** First reveal: address-bar progress 0→100, skeleton → image fade */
  function loadBrowser(b) {
    if (b.dataset.state) return;
    b.dataset.state = "loading";
    const p = bySlug(b.dataset.slug);
    const img = $(".browser__shot", b);
    const bar = $(".address__progress", b);
    const sources = screenSources(p, +b.dataset.size || 800);
    const anim = hasGSAP && !reduced();
    let progressTween = anim ? gsap.to(bar, { scaleX: 0.82, duration: 1.8, ease: "power2.out" }) : null;

    const finish = (ok) => {
      progressTween && progressTween.kill();
      const done = () => {
        b.classList.add("is-loaded");
        if (!ok) b.classList.add("is-placeholder");
        b.dataset.state = ok ? "ready" : "failed";
        b.dispatchEvent(new CustomEvent("browser:ready"));
      };
      if (anim) {
        gsap
          .timeline({ onComplete: done })
          .to(bar, { scaleX: 1, duration: 0.25, ease: "power1.out" })
          .to(bar, { opacity: 0, duration: 0.3 });
      } else {
        bar.style.opacity = "0";
        done();
      }
    };

    let i = 0;
    const tryNext = () => {
      if (i >= sources.length) return finish(false);
      img.onload = () => finish(true);
      img.onerror = () => {
        i++;
        tryNext();
      };
      img.src = sources[i];
    };
    // tiny delay so the "page load" is visible even for cached images
    setTimeout(tryNext, anim ? 250 : 0);
  }

  /** Lazy-load every browser mockup when it approaches the viewport */
  const browserIO =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (e.isIntersecting) {
                loadBrowser(e.target);
                browserIO.unobserve(e.target);
              }
            }),
          { rootMargin: "300px 300px" }
        )
      : null;

  function observeBrowsers(ctx = document) {
    $$("[data-browser]", ctx).forEach((b) => (browserIO ? browserIO.observe(b) : loadBrowser(b)));
  }

  /**
   * Hover = the page scrolls itself (translateY 0 → -(imgH - viewportH)),
   * mouse-leave glides back, wheel over the preview scrolls it smoothly.
   * On touch devices an IntersectionObserver plays a yoyo scroll in view.
   */
  function bindLiveScroll(host) {
    if (!hasGSAP || reduced()) return;
    const b = host.matches("[data-browser]") ? host : $("[data-browser]", host);
    if (!b) return;
    const vp = $(".browser__viewport", b);
    const img = $(".browser__shot", b);
    const cursor = $(".browser__cursor", b);
    let tween = null;
    let cursorTl = null;
    let lastMove = 0;

    const distance = () => Math.max(0, img.offsetHeight - vp.clientHeight);
    const ready = () => b.dataset.state === "ready";

    function playCursor() {
      if (!cursor) return;
      cursorTl && cursorTl.kill();
      const w = vp.clientWidth;
      const h = vp.clientHeight;
      const pt = () => ({ x: w * (0.15 + Math.random() * 0.7), y: h * (0.2 + Math.random() * 0.6) });
      cursorTl = gsap.timeline({ repeat: -1 });
      gsap.set(cursor, { x: w * 0.5, y: h * 0.6 });
      cursorTl.to(cursor, { opacity: 1, duration: 0.3 });
      for (let k = 0; k < 4; k++) {
        cursorTl
          .to(cursor, { ...pt(), duration: 1.1 + Math.random() * 0.6, ease: "power2.inOut" })
          .call(() => {
            cursor.classList.remove("is-click");
            void cursor.offsetWidth; // restart CSS animation
            cursor.classList.add("is-click");
          });
      }
    }

    function stopCursor() {
      cursorTl && cursorTl.kill();
      cursor && gsap.to(cursor, { opacity: 0, duration: 0.25 });
    }

    function scrollDown() {
      if (!ready()) return;
      const dist = distance();
      if (!dist) return;
      tween && tween.kill();
      img.style.willChange = "transform";
      const cur = gsap.getProperty(img, "y");
      tween = gsap.to(img, { y: -dist, duration: (dist + cur) / CONFIG.screenScrollSpeed, ease: "none" });
      playCursor();
    }

    function scrollBack() {
      tween && tween.kill();
      tween = gsap.to(img, { y: 0, duration: CONFIG.screenReturn, ease: "power3.out", onComplete: () => (img.style.willChange = "") });
      stopCursor();
    }

    if (isTouch) {
      // auto "browse" when the card is mostly in view
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting && ready()) {
              const dist = distance();
              if (!dist) return;
              tween && tween.kill();
              tween = gsap.to(img, {
                y: -dist,
                duration: dist / (CONFIG.screenScrollSpeed * 0.8),
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
                repeatDelay: 1.2,
                delay: 0.6,
              });
            } else if (tween) {
              tween.pause();
            }
          }),
        { threshold: 0.6 }
      );
      b.addEventListener("browser:ready", () => {
        io.unobserve(b);
        io.observe(b);
      });
      io.observe(b);
      return;
    }

    host.addEventListener("pointerenter", scrollDown);
    host.addEventListener("pointerleave", scrollBack);
    host.addEventListener("pointermove", (e) => {
      const r = vp.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right) lastMove = performance.now();
    });
    b.addEventListener("browser:ready", () => host.matches(":hover") && scrollDown());

    // Wheel → GSAP-smoothed preview scrolling. Only captures when the user
    // deliberately moved onto the preview (so page scrolling never gets stuck)
    // and releases at the top/bottom edges.
    host.addEventListener(
      "wheel",
      (e) => {
        if (!ready() || performance.now() - lastMove > 1500) return;
        const r = vp.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
        const dist = distance();
        const cur = gsap.getProperty(img, "y");
        const target = clamp(cur - e.deltaY * 1.1, -dist, 0);
        if (target === cur) return; // at an edge → let the page scroll
        e.preventDefault();
        lastMove = performance.now();
        tween && tween.kill();
        tween = gsap.to(img, { y: target, duration: 0.7, ease: "power3.out", overwrite: true });
      },
      { passive: false }
    );
  }

  /* ======================================================================
     5. Contribution graph (fake, seeded, animated)
     ====================================================================== */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /** Activity model loosely following the career timeline */
  function activityFor(date, rand) {
    const t = date.getTime();
    const d = (s) => new Date(s).getTime();
    let base;
    if (t < d("2024-08-01")) base = 0.25; // university side projects
    else if (t < d("2025-03-01")) base = 0.55; // Ifinity Hub
    else if (t < d("2025-08-01")) base = 0.45; // freelance
    else if (t < d("2026-03-01")) base = 0.72; // Bluehorn
    else base = 0.86; // BrandixSoft
    const day = date.getDay();
    if (day === 0 || day === 6) base *= 0.45;
    if (rand() > base) return 0;
    const burst = rand() < 0.08 ? 8 : 0;
    return Math.round(1 + rand() * 9 * base + burst);
  }

  const levelOf = (n) => (n === 0 ? 0 : n < 4 ? 1 : n < 7 ? 2 : n < 10 ? 3 : 4);

  function buildContrib(yearKey = "last", animate = true) {
    const grid = $("#contrib-grid");
    const months = $("#contrib-months");
    if (!grid) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start, end;
    if (yearKey === "last") {
      end = new Date(today);
      start = new Date(today);
      start.setDate(start.getDate() - 364);
    } else {
      start = new Date(+yearKey, 0, 1);
      end = new Date(+yearKey, 11, 31);
    }
    // align to the Sunday on/before start
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    const rand = rng("contrib-" + yearKey);
    const cells = [];
    const monthMarks = [];
    let total = 0;
    let week = 0;
    let lastMonth = -1;

    while (cursor <= end || cursor.getDay() !== 0) {
      const inRange = cursor >= start && cursor <= end;
      const future = cursor > today;
      if (cursor.getDay() === 0) {
        if (cursor.getMonth() !== lastMonth && cursor <= end) {
          const label = cursor < start ? new Date(start) : new Date(cursor);
          if (label.getMonth() !== lastMonth) {
            monthMarks.push({ week, label: MONTHS[label.getMonth()] });
            lastMonth = label.getMonth();
          }
        }
      }
      let n = 0;
      if (inRange && !future) {
        n = activityFor(cursor, rand);
        total += n;
      }
      cells.push({ date: new Date(cursor), n, empty: !inRange || future });
      if (cursor.getDay() === 6) week++;
      cursor.setDate(cursor.getDate() + 1);
      if (cells.length > 380) break;
    }

    grid.innerHTML = cells
      .map((c) =>
        c.empty
          ? `<i class="is-empty"></i>`
          : `<i class="lv${levelOf(c.n)}" data-n="${c.n}" data-d="${c.date.toISOString().slice(0, 10)}"></i>`
      )
      .join("");
    months.innerHTML = monthMarks
      .filter((m, i, arr) => i === 0 || m.week - arr[i - 1].week >= 3)
      .map((m) => `<span style="left:${m.week * 14}px">${m.label}</span>`)
      .join("");

    const totalEl = $("#contrib-total");
    const label = yearKey === "last" ? "the last year" : yearKey;
    $("#contrib-year-label").textContent = label;
    grid.setAttribute("aria-label", `${total.toLocaleString()} contributions in ${label}. Activity heatmap.`);

    if (hasGSAP && !reduced() && animate) {
      const obj = { v: 0 };
      gsap.to(obj, { v: total, duration: 1.2, ease: "power2.out", onUpdate: () => (totalEl.textContent = Math.round(obj.v).toLocaleString()) });
      const weeks = Math.ceil(cells.length / 7);
      // right-to-left wave: newest weeks first
      gsap.from(grid.children, {
        opacity: 0,
        scale: 0.2,
        duration: 0.45,
        ease: "back.out(2)",
        stagger: (i) => (weeks - Math.floor(i / 7)) * 0.018 + (i % 7) * 0.012,
      });
    } else {
      totalEl.textContent = total.toLocaleString();
    }

    // on narrow screens start scrolled to the most recent weeks
    const sc = $(".contrib__scroll");
    if (sc) sc.scrollLeft = sc.scrollWidth;
  }

  function initContrib() {
    const grid = $("#contrib-grid");
    const tip = $("#contrib-tip");
    if (!grid) return;

    const showTip = (cell) => {
      if (!cell || !cell.dataset.d) return hideTip();
      const n = +cell.dataset.n;
      const date = new Date(cell.dataset.d + "T00:00:00");
      tip.textContent = `${n ? n : "No"} contribution${n === 1 ? "" : "s"} on ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      const r = cell.getBoundingClientRect();
      tip.style.left = r.left + r.width / 2 + "px";
      tip.style.top = r.top + "px";
      tip.hidden = false;
    };
    const hideTip = () => (tip.hidden = true);
    grid.addEventListener("pointerover", (e) => showTip(e.target.closest("i")));
    grid.addEventListener("pointerleave", hideTip);
    window.addEventListener("scroll", hideTip, { passive: true });

    $$("#contrib-years .year-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        $$("#contrib-years .year-btn").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", b === btn);
        });
        buildContrib(btn.dataset.year);
      })
    );

    // build (unanimated) now, animate when it scrolls into view
    if (hasST && !reduced()) {
      buildContrib("last", false);
      ScrollTrigger.create({ trigger: grid, start: "top 88%", once: true, onEnter: () => buildContrib("last", true) });
    } else {
      buildContrib("last", false);
    }
  }

  /* ======================================================================
     6. Typing + split text
     ====================================================================== */
  function typeLoop(el, strings) {
    if (!el || !strings.length) return;
    if (reduced()) {
      el.textContent = strings[0];
      return;
    }
    let s = 0;
    let c = 0;
    let erasing = false;
    const tick = () => {
      const full = Array.from(strings[s]);
      if (!erasing) {
        c++;
        el.textContent = full.slice(0, c).join("");
        if (c >= full.length) {
          erasing = true;
          return setTimeout(tick, CONFIG.typing.hold);
        }
        return setTimeout(tick, CONFIG.typing.type + Math.random() * 40);
      }
      c--;
      el.textContent = full.slice(0, c).join("");
      if (c <= 0) {
        erasing = false;
        s = (s + 1) % strings.length;
        return setTimeout(tick, 350);
      }
      setTimeout(tick, CONFIG.typing.erase);
    };
    tick();
  }

  /** Type a heading once when it scrolls into view (README "# Hi, I'm …") */
  function typeOnce(el) {
    if (!el || reduced() || !hasST) return;
    const text = Array.from(el.dataset.type || el.textContent);
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text.join("");
    el.before(sr);
    el.setAttribute("aria-hidden", "true");
    el.textContent = "";
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        let i = 0;
        const step = () => {
          el.textContent = text.slice(0, ++i).join("");
          if (i < text.length) setTimeout(step, 55);
        };
        setTimeout(step, 300);
      },
    });
  }

  /** Split an element into .word > .char spans (keeps an accessible label) */
  function splitChars(el) {
    if (!el || el.dataset.splitDone) return [];
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text.replace(/\u00a0/g, " "));
    const words = text.split(" ");
    el.innerHTML = words
      .map((w, wi) => {
        const chars = Array.from(w);
        const accent = wi === words.length - 1 ? " word--accent" : "";
        return `<span class="word${accent}" aria-hidden="true">${chars
          .map((ch, i) => `<span class="char" style="--i:${i};--n:${chars.length}">${ch === "\u00a0" ? "&nbsp;" : esc(ch)}</span>`)
          .join("")}</span>`;
      })
      .join(" ");
    el.dataset.splitDone = "1";
    return $$(".char", el);
  }

  /* ======================================================================
     7. Scroll system — progress bar, header, active tab, smooth anchors
     ====================================================================== */
  const progressEl = $("#scroll-progress");
  const tabsEl = $(".tabs");
  const indicator = $("#tabs-indicator");
  const SECTION_TABS = [
    ["top", "overview"],
    ["overview", "overview"],
    ["repositories", "repositories"],
    ["projects", "projects"],
    ["stack", "stack"],
    ["contact", "contact"],
  ];

  function moveIndicator(link, instant) {
    if (!indicator || !link) return;
    const x = link.offsetLeft;
    const w = link.offsetWidth;
    if (hasGSAP && !instant && !reduced()) {
      gsap.to(indicator, { x, scaleX: w, duration: 0.5, ease: "power3.out", overwrite: true });
    } else {
      indicator.style.transform = `translateX(${x}px) scaleX(${w})`;
    }
  }

  function setActiveTab(tab, instant) {
    if (state.activeTab === tab) return;
    state.activeTab = tab;
    let activeLink = null;
    $$(".tabs__link").forEach((a) => {
      const on = a.dataset.tab === tab;
      on ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current");
      if (on) activeLink = a;
    });
    moveIndicator(activeLink, instant);
    // keep the active tab visible on small screens
    if (activeLink && tabsEl && tabsEl.scrollWidth > tabsEl.clientWidth) {
      tabsEl.scrollTo({ left: activeLink.offsetLeft - 16, behavior: reduced() ? "auto" : "smooth" });
    }
  }

  let sectionEls = null;
  const onScroll = rafThrottle(() => {
    // --- reads (layout) ---
    if (!sectionEls) sectionEls = SECTION_TABS.map(([id, tab]) => [document.getElementById(id), tab]).filter(([el]) => el);
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const line = innerHeight * 0.35;
    let current = "overview";
    // active section = last one whose top crossed 35% of the viewport
    sectionEls.forEach(([el, tab]) => {
      if (el.getBoundingClientRect().top - line <= 0) current = tab;
    });
    if (y >= max - 4) current = "contact";
    // --- writes ---
    if (progressEl) progressEl.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (headerEl) {
      const scrolled = y > 24;
      if (scrolled !== headerEl.classList.contains("is-scrolled")) headerEl.classList.toggle("is-scrolled", scrolled);
    }
    setActiveTab(current);
  });

  function scrollToId(id, opts = {}) {
    const el = document.getElementById(id);
    if (!el) return;
    let y;
    if (id === "top") y = 0;
    else if (id === "projects" && state.pinST) y = state.pinST.start;
    else y = el.getBoundingClientRect().top + window.scrollY - headerOffset() + 1;
    y = Math.max(0, y);
    const instant = opts.instant || reduced();
    if (!instant && hasScrollTo) {
      const dist = Math.abs(y - window.scrollY);
      gsap.to(window, { scrollTo: { y, autoKill: true }, duration: clamp(dist / 2600, 0.6, 1.5), ease: "power3.inOut", overwrite: true });
    } else {
      window.scrollTo({ top: y, behavior: instant ? "auto" : "smooth" });
    }
    if (!opts.noFocus) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  }

  function initScroll() {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", rafThrottle(() => {
      const link = $(`.tabs__link[data-tab="${state.activeTab}"]`);
      moveIndicator(link, true);
      onScroll();
    }));
    // smooth anchors
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      scrollToId(id);
    });
    setActiveTab("overview", true);
    onScroll();
  }

  /* ======================================================================
     8. GSAP animation system
     ----------------------------------------------------------------------
     Declarative: add to any element in HTML
       data-anim="rtl"        (rtl | ltr | up | fade | scale)
       data-delay="0.2"       seconds
       data-stagger="0.12"    animate the element's CHILDREN with a stagger
       data-x="160"           override travel distance
       data-duration="1.2"
     ====================================================================== */
  function animFrom(type, dist) {
    switch (type) {
      case "ltr":
        return { x: -dist };
      case "up":
        return { y: dist * 0.5 };
      case "fade":
        return {};
      case "scale":
        return { scale: 0.92 };
      default:
        return { x: dist }; // rtl — the signature
    }
  }

  function initDataAnims(isMobile) {
    const base = isMobile ? { ...CONFIG.rtl, ...CONFIG.rtlMobile } : CONFIG.rtl;
    $$("[data-anim]").forEach((el) => {
      if (el.closest(".showcase__track")) return;
      const ds = el.dataset;
      const dist = ds.x ? +ds.x * (isMobile ? 0.4 : 1) : base.x;
      const targets = ds.stagger !== undefined ? Array.from(el.children) : el;
      if (!targets.length && targets !== el) return;
      gsap.from(targets, {
        ...animFrom(ds.anim, dist),
        opacity: 0,
        duration: ds.duration ? +ds.duration : base.duration,
        ease: base.ease,
        delay: ds.delay ? +ds.delay : 0,
        stagger: ds.stagger !== undefined ? +ds.stagger || base.stagger : 0,
        clearProps: "transform",
        scrollTrigger: { trigger: el, start: base.start, once: true },
      });
    });
  }

  function initRepoReveal(isMobile) {
    const items = $$("#repo-grid .repo-item");
    gsap.set(items, { opacity: 0, x: isMobile ? 40 : 120 });
    ScrollTrigger.batch(items, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, x: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, overwrite: true, clearProps: "transform" }),
    });
  }

  function initCounters() {
    $$("[data-count]").forEach((el) => {
      if (el.closest(".hero")) return; // hero counters run in the intro
      const to = parseFloat(el.dataset.count);
      const dec = +(el.dataset.decimals || 0);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: to,
        duration: 1.4,
        ease: "power3.out",
        onUpdate: () => (el.textContent = obj.v.toFixed(dec)),
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    });
  }

  function initSkillBars() {
    $$(".skill-list").forEach((list) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: "top 90%", once: true } });
      $$(".skill", list).forEach((el, i) => {
        const v = +el.dataset.value;
        const num = $(".skill__val span", el);
        const obj = { v: 0 };
        tl.fromTo($(".skill__bar i", el), { scaleX: 0 }, { scaleX: v / 100, duration: 1.4, ease: "power3.out" }, i * 0.08).to(
          obj,
          { v, duration: 1.4, ease: "power3.out", onUpdate: () => (num.textContent = Math.round(obj.v)) },
          i * 0.08
        );
      });
    });
    const lb = $("#langbar");
    if (lb) {
      gsap.fromTo(
        lb,
        { clipPath: "inset(0 100% 0 0 round 6px)" },
        { clipPath: "inset(0 0% 0 0 round 6px)", duration: 1.6, ease: "power3.inOut", scrollTrigger: { trigger: lb, start: "top 90%", once: true } }
      );
    }
  }

  /** Static final state (reduced motion / no GSAP) */
  function staticFinalState() {
    $$(".skill").forEach((el) => {
      $(".skill__bar i", el).style.transform = `scaleX(${+el.dataset.value / 100})`;
      $(".skill__val span", el).textContent = el.dataset.value;
    });
    $$("[data-count]").forEach((el) => (el.textContent = (+el.dataset.count).toFixed(+(el.dataset.decimals || 0))));
  }

  function initParallax() {
    $$("[data-speed]").forEach((el) => {
      const speed = parseFloat(el.dataset.speed);
      gsap.to(el, {
        y: () => speed * 400,
        ease: "none",
        scrollTrigger: { trigger: el.closest("section") || el, start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true },
      });
    });
  }

  /* ---------- Pinned horizontal Projects showcase ---------- */
  const showcase = $("#projects");
  const track = $("#showcase-track");
  const counterCur = $("#showcase-current");
  const progressBar = $("#showcase-progress");

  function setShowcaseIndex(i, progress) {
    if (counterCur) counterCur.textContent = pad2(i + 1);
    if (progressBar) progressBar.style.transform = `scaleX(${clamp(progress, 0, 1)})`;
  }

  function initPinnedShowcase() {
    const cards = $$(".show-card", track);
    if (!cards.length) return null;
    showcase.classList.add("is-pinned");
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    let points = [];
    const computePoints = () => {
      const d = dist() || 1;
      points = cards.map((c) => clamp((c.offsetLeft + c.offsetWidth / 2 - window.innerWidth / 2) / d, 0, 1));
    };
    const nearest = (v) => points.reduce((best, p) => (Math.abs(p - v) < Math.abs(best - v) ? p : best), 0);

    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: showcase,
        start: "top top",
        end: () => "+=" + dist(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: computePoints,
        snap: { snapTo: (v) => nearest(v), duration: { min: 0.25, max: 0.7 }, delay: 0.08, ease: "power2.inOut", inertia: false },
        onUpdate: (self) => {
          const idx = points.indexOf(nearest(self.progress));
          setShowcaseIndex(Math.max(0, idx), self.progress);
        },
      },
    });
    computePoints();
    state.pinST = tween.scrollTrigger;

    // per-card parallax for the info column while the track moves
    cards.forEach((card) => {
      gsap.from($(".show-card__info", card), {
        x: 140,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 95%", end: "left 45%", scrub: true },
      });
    });
    return () => {
      showcase.classList.remove("is-pinned");
      state.pinST = null;
    };
  }

  /** Mobile / reduced: native horizontal scroll-snap carousel */
  function initCarouselShowcase() {
    const vp = $("#showcase-viewport");
    const cards = $$(".show-card", track);
    if (!vp || !cards.length) return null;
    const update = rafThrottle(() => {
      const max = vp.scrollWidth - vp.clientWidth;
      const center = vp.scrollLeft + vp.clientWidth / 2;
      let idx = 0;
      let best = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      setShowcaseIndex(idx, max > 0 ? vp.scrollLeft / max : 0);
    });
    vp.addEventListener("scroll", update, { passive: true });
    update();
    return () => vp.removeEventListener("scroll", update);
  }

  function initAnimations() {
    if (!hasST) {
      staticFinalState();
      initCarouselShowcase();
      return;
    }
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: CONFIG.pinBreakpoint,
        mobile: "(max-width: 899px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { desktop, reduce } = ctx.conditions;
        if (reduce) {
          staticFinalState();
          return initCarouselShowcase();
        }
        // pins first (positions of later triggers depend on pin spacing)
        const cleanupShowcase = desktop ? initPinnedShowcase() : initCarouselShowcase();
        initDataAnims(!desktop);
        initRepoReveal(!desktop);
        initCounters();
        initSkillBars();
        if (desktop) initParallax();
        ScrollTrigger.sort();
        return () => {
          cleanupShowcase && cleanupShowcase();
        };
      }
    );
  }

  /* ---------- Repositories filter (GSAP Flip) ---------- */
  function initFilters() {
    const grid = $("#repo-grid");
    const empty = $("#repo-empty");
    const search = $("#repo-search");
    if (!grid) return;
    let revealedAll = false;

    function apply() {
      const items = $$(".repo-item", grid);
      if (!revealedAll && hasGSAP) {
        // stop the scroll-reveal so filtering never hides items mid-animation
        gsap.killTweensOf(items);
        gsap.set(items, { opacity: 1, clearProps: "transform" });
        revealedAll = true;
      }
      const q = state.query.trim().toLowerCase();
      const flipState = hasFlip && !reduced() ? Flip.getState(items) : null;
      let shown = 0;
      items.forEach((li) => {
        const catOk = state.filter === "All" || li.dataset.cats.split("|").includes(state.filter);
        const qOk = !q || q.split(/\s+/).every((t) => li.dataset.search.includes(t));
        const show = catOk && qOk;
        li.style.display = show ? "" : "none";
        if (show) shown++;
      });
      empty.hidden = shown > 0;
      if (flipState) {
        Flip.from(flipState, {
          duration: 0.6,
          ease: "power3.inOut",
          stagger: 0.03,
          absolute: true,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, x: 80, scale: 0.94 }, { opacity: 1, x: 0, scale: 1, duration: 0.55, ease: "power3.out", stagger: 0.05 }),
          onLeave: (els) => gsap.to(els, { opacity: 0, x: -80, scale: 0.94, duration: 0.35, ease: "power2.in" }),
          onComplete: () => hasST && ScrollTrigger.refresh(),
        });
      } else if (hasST) {
        ScrollTrigger.refresh();
      }
    }

    $("#filters").addEventListener("click", (e) => {
      const btn = e.target.closest(".filter");
      if (!btn) return;
      state.filter = btn.dataset.filter;
      $$(".filter").forEach((b) => b.setAttribute("aria-pressed", b === btn));
      apply();
    });
    let t;
    search.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.query = search.value;
        apply();
      }, 140);
    });
    $("#repo-reset").addEventListener("click", () => {
      state.filter = "All";
      state.query = "";
      search.value = "";
      $$(".filter").forEach((b) => b.setAttribute("aria-pressed", b.dataset.filter === "All"));
      apply();
    });
  }

  /* ======================================================================
     9. Preloader + hero intro
     ====================================================================== */
  function runPreloader() {
    return new Promise((resolve) => {
      const pre = $("#preloader");
      if (!pre) return resolve();
      let seen = false;
      try {
        seen = sessionStorage.getItem("preloaded") === "1";
        sessionStorage.setItem("preloaded", "1");
      } catch (e) {}
      if (!hasGSAP || reduced() || seen) {
        pre.remove();
        return resolve();
      }
      const fill = $("#preloader-fill");
      const pct = $("#preloader-pct");
      const line = $("#preloader-line");
      const lines = ["Initializing portfolio...", "Resolving deltas: 100%", "Compiling personality...", "404: Sleep Not Found — continuing", "Ready. Welcome 👋"];
      const obj = { p: 0 };
      const dur = CONFIG.preloaderMs / 1000;
      gsap
        .timeline({
          onComplete: () => {
            pre.remove();
          },
        })
        .to(obj, {
          p: 100,
          duration: dur,
          ease: "power2.inOut",
          onUpdate: () => {
            pct.textContent = Math.round(obj.p);
            fill.style.transform = `scaleX(${obj.p / 100})`;
            line.textContent = lines[Math.min(lines.length - 1, Math.floor((obj.p / 100) * lines.length))];
          },
        })
        .add(resolve) // start revealing the page while the curtain lifts
        .to(pre, { clipPath: "inset(0 0 100% 0)", duration: 0.75, ease: "power4.inOut" }, "+=0.12");
    });
  }

  function heroIntro() {
    const chars = splitChars($("[data-split]"));
    const heroBits = $$("[data-hero]");
    const startTyping = () => typeLoop($("#typed"), D.profile.typed);
    const counters = $$(".hero [data-count]");
    const countUp = () =>
      counters.forEach((el) => {
        const obj = { v: 0 };
        gsap.to(obj, { v: +el.dataset.count, duration: 1.6, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(obj.v)) });
      });

    if (!hasGSAP || reduced()) {
      counters.forEach((el) => (el.textContent = el.dataset.count));
      startTyping();
      return;
    }
    const c = CONFIG.heroChars;
    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .from(chars, { x: c.x, rotateY: c.rotateY, opacity: 0, duration: c.duration, stagger: c.stagger, ease: c.ease })
      .fromTo(heroBits, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, stagger: 0.1, clearProps: "transform" }, 0.15)
      .add(startTyping, 0.5)
      .add(countUp, 0.8);
  }

  /* ======================================================================
     10. Tilt + glare · magnetic buttons · custom cursor
     ====================================================================== */
  function bindTilt(el) {
    if (!hasGSAP || isTouch || reduced() || el.dataset.tiltBound) return;
    el.dataset.tiltBound = "1";
    const max = CONFIG.tiltMax;
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 2 * max);
      rx(-(py - 0.5) * 2 * max);
      el.style.setProperty("--gx", px * 100 + "%");
      el.style.setProperty("--gy", py * 100 + "%");
    });
    el.addEventListener("pointerleave", () => {
      rx(0);
      ry(0);
    });
  }

  function bindMagnetic(el) {
    if (!hasGSAP || isTouch || reduced() || el.dataset.magBound) return;
    el.dataset.magBound = "1";
    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * CONFIG.magnetStrength);
      yTo((e.clientY - (r.top + r.height / 2)) * CONFIG.magnetStrength * 1.2);
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)", overwrite: true });
    });
  }

  function initInteractions(ctx = document) {
    $$("[data-tilt]", ctx).forEach(bindTilt);
    $$("[data-magnetic]", ctx).forEach(bindMagnetic);
    $$("[data-host]", ctx).forEach(bindLiveScroll);
  }

  function initCursor() {
    if (!hasGSAP || isTouch || reduced()) return;
    const wrap = $(".cursor");
    const dot = $(".cursor__dot");
    const ring = $(".cursor__ring");
    const label = $(".cursor__label");
    root.classList.add("has-cursor");
    const dx = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3" });
    const dy = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3" });
    const rx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
    gsap.set([dot, ring], { opacity: 0 });
    let shown = false;
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        if (!shown) {
          gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
          gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
          shown = true;
        }
        dx(e.clientX);
        dy(e.clientY);
        rx(e.clientX);
        ry(e.clientY);
      },
      { passive: true }
    );
    document.addEventListener("pointerover", (e) => {
      const host = e.target.closest("[data-cursor-label]");
      const hov = e.target.closest("a, button, [data-cursor], label, input, textarea, select, .topic");
      const control = e.target.closest("a, input, textarea, .btn, .filter, .topic");
      wrap.classList.toggle("is-view", !!host && !control);
      wrap.classList.toggle("is-hover", !!hov);
      label.textContent = host ? host.dataset.cursorLabel : "";
    });
    document.addEventListener("pointerdown", () => wrap.classList.add("is-down"));
    document.addEventListener("pointerup", () => wrap.classList.remove("is-down"));
    document.documentElement.addEventListener("pointerleave", () => {
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
      shown = false;
    });
  }

  /* ======================================================================
     11. Project drawer (GitHub-style modal)
     ====================================================================== */
  const drawer = $("#drawer");
  const drawerPanel = $(".drawer__panel", drawer);
  const drawerContent = $("#drawer-content");
  let lastFocus = null;

  const getStars = () => {
    try {
      return JSON.parse(localStorage.getItem("starred") || "[]");
    } catch (e) {
      return [];
    }
  };
  const setStars = (arr) => {
    try {
      localStorage.setItem("starred", JSON.stringify(arr));
    } catch (e) {}
  };

  function drawerHTML(p) {
    const starred = getStars().includes(p.slug);
    const source = p.repo
      ? `<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer">${icon("code")}View source</a>`
      : `<a class="btn" href="${esc(D.profile.github)}" target="_blank" rel="noopener noreferrer" title="Client code is private">${icon("lock")}Source is private · GitHub</a>`;
    const live = p.url
      ? `<a class="btn btn-primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${icon("external")}Visit live</a>`
      : "";
    return `
      <header class="drawer__head">
        <h2 class="drawer__title" id="drawer-title">${icon("book")}<span><a href="${esc(D.profile.github)}" target="_blank" rel="noopener noreferrer">${esc(D.profile.username)}</a> / <strong>${esc(p.repoName)}</strong></span></h2>
        ${visibilityBadge(p)}
        <div class="drawer__counters">
          <span class="counter-btn${starred ? " is-starred" : ""}" id="star-wrap">
            <button type="button" id="star-btn" aria-pressed="${starred}">${icon("star")}<span>${starred ? "Starred" : "Star"}</span></button>
            <span class="counter" id="star-count">${p.stars + (starred ? 1 : 0)}</span>
          </span>
          <span class="counter-btn"><span>${icon("fork")}Fork</span><span class="counter">${p.forks}</span></span>
        </div>
        <button class="btn-icon drawer__close" type="button" data-close aria-label="Close project details">${icon("x")}</button>
      </header>
      <div class="drawer__body">
        <div class="drawer__tabs">
          <span class="drawer__tab is-active">${icon("eye")}Full-page screenshot</span>
        </div>
        <div class="drawer__preview">
          ${browserHTML(p, { size: 1440 })}
        </div>
        <div class="drawer__cols">
          <div class="drawer__about">
            <h3>${icon("book-open")} README.md</h3>
            <p><strong>${esc(p.name)}</strong> — ${esc(p.desc)}</p>
            <p class="muted">${esc(p.impact)}</p>
          </div>
          <aside class="drawer__side">
            <div>
              <h3>About</h3>
              ${p.url ? `<p><a class="drawer__site" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${icon("link")}${esc(p.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></p>` : `<p class="t-muted">${icon("lock")} Private / internal — available on request.</p>`}
              <div style="margin-top:12px">${topics(p)}</div>
            </div>
            <div>
              <h3>Languages</h3>
              <p class="repo-meta"><span><i class="lang-dot" style="--c:${langColor(p.lang)}"></i>${esc(p.lang)}</span><span>${esc(p.cats.join(" · "))}</span></p>
            </div>
            <div class="drawer__links">${live}${source}</div>
          </aside>
        </div>
      </div>`;
  }

  function trapFocus(container, e) {
    const f = $$('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])', container).filter(
      (el) => el.offsetParent !== null
    );
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openProject(slug) {
    const p = bySlug(slug);
    if (!p || !drawer) return;
    lastFocus = document.activeElement;
    drawerContent.innerHTML = drawerHTML(p);
    drawer.hidden = false;
    document.body.classList.add("is-locked");
    drawerPanel.scrollTop = 0;
    observeBrowsers(drawerContent);

    if (hasGSAP && !reduced()) {
      gsap.fromTo($(".drawer__backdrop", drawer), { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(drawerPanel, { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: "power4.out" });
      gsap.from($$(".drawer__body > *", drawer), { x: 80, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power3.out", delay: 0.15, clearProps: "transform" });
    }
    setTimeout(() => $(".drawer__close", drawer).focus(), 50);

    // star toggle (persisted)
    $("#star-btn").addEventListener("click", () => {
      const stars = getStars();
      const on = !stars.includes(p.slug);
      setStars(on ? stars.concat(p.slug) : stars.filter((s) => s !== p.slug));
      $("#star-wrap").classList.toggle("is-starred", on);
      $("#star-btn").setAttribute("aria-pressed", on);
      $("#star-btn span").textContent = on ? "Starred" : "Star";
      $("#star-count").textContent = p.stars + (on ? 1 : 0);
      if (on) {
        toast(`Starred ${p.repoName} ⭐`);
        hasGSAP && gsap.fromTo("#star-wrap .icon", { scale: 0.4, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(3)" });
      }
    });
  }

  function closeProject() {
    if (!drawer || drawer.hidden) return;
    const done = () => {
      drawer.hidden = true;
      drawerContent.innerHTML = "";
      document.body.classList.remove("is-locked");
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    };
    if (hasGSAP && !reduced()) {
      gsap.to($(".drawer__backdrop", drawer), { opacity: 0, duration: 0.3 });
      gsap.to(drawerPanel, { xPercent: 100, duration: 0.45, ease: "power3.in", onComplete: done });
    } else done();
  }

  function initDrawer() {
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open]");
      if (opener) {
        e.preventDefault();
        return openProject(opener.dataset.open);
      }
      // clicking a showcase screenshot opens details too
      const shot = e.target.closest(".show-card [data-browser]");
      if (shot) return openProject(shot.dataset.slug);
      if (e.target.closest("#drawer [data-close]")) closeProject();
    });
    drawer.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeProject();
      if (e.key === "Tab") trapFocus(drawerPanel, e);
    });
  }

  /* ======================================================================
     12. Command palette (Ctrl/Cmd+K) + header search
     ====================================================================== */
  const palette = $("#palette");
  const pInput = $("#palette-input");
  const pList = $("#palette-list");
  let pIndex = 0;
  let pItems = [];

  function getCommands() {
    const sections = [
      ["overview", "Overview", "book-open", "profile · README · activity"],
      ["experience", "Experience", "commit", "git log --experience"],
      ["education", "Education", "award", "university · college"],
      ["repositories", "Repositories", "book", "all projects"],
      ["projects", "Projects", "layers", "live deployments"],
      ["stack", "Stack", "code", "languages · skills · tools"],
      ["contact", "Contact", "mail", "send a message"],
    ].map(([id, label, ic, kw]) => ({ group: "Navigate", label, icon: ic, hint: "#" + id, kw, run: () => scrollToId(id) }));
    const projects = D.PROJECTS.map((p) => ({
      group: "Projects",
      label: p.name,
      icon: p.icon,
      hint: p.url ? "live" : p.lang,
      kw: [p.repoName, p.desc, p.tags.join(" "), p.cats.join(" ")].join(" "),
      run: () => openProject(p.slug),
    }));
    const actions = [
      { label: "Toggle theme", icon: "sun", hint: "light / dark", kw: "dark light mode color", run: () => toggleTheme(themeBtn) },
      { label: "Copy email address", icon: "copy", hint: D.profile.email, kw: "mail contact clipboard", run: () => copyText(D.profile.email, "Email copied to clipboard") },
      { label: "Download resume", icon: "download", hint: "PDF", kw: "cv pdf", run: () => window.open(D.profile.resume, "_blank", "noopener") },
      { label: "Open GitHub profile", icon: "github", hint: "@" + D.profile.username, kw: "code source", run: () => window.open(D.profile.github, "_blank", "noopener") },
      { label: "Open LinkedIn", icon: "linkedin", hint: "in/anas-atta", kw: "social network", run: () => window.open(D.profile.linkedin, "_blank", "noopener") },
      { label: "git push", icon: "sparkle", hint: "🎉", kw: "confetti party easter egg", run: () => celebrate() },
    ].map((a) => ({ group: "Actions", ...a }));
    return sections.concat(projects, actions);
  }

  function matchCommands(q, groups) {
    const all = getCommands().filter((c) => !groups || groups.includes(c.group));
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return all;
    return all
      .map((c) => {
        const hay = (c.label + " " + c.kw + " " + c.hint).toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return null;
        const score = c.label.toLowerCase().startsWith(terms[0]) ? 0 : c.label.toLowerCase().includes(terms[0]) ? 1 : 2;
        return { c, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.c);
  }

  function highlight(label, q) {
    const t = q.trim().split(/\s+/)[0];
    if (!t) return esc(label);
    const i = label.toLowerCase().indexOf(t.toLowerCase());
    if (i < 0) return esc(label);
    return esc(label.slice(0, i)) + "<mark>" + esc(label.slice(i, i + t.length)) + "</mark>" + esc(label.slice(i + t.length));
  }

  /** Shared renderer for palette + header search lists */
  function renderCmdList(listEl, items, q, activeIdx, idPrefix) {
    if (!items.length) {
      listEl.innerHTML = `<li class="cmd-empty">No results for “${esc(q)}”</li>`;
      return;
    }
    let html = "";
    let group = "";
    items.forEach((c, i) => {
      if (c.group !== group) {
        group = c.group;
        html += `<li class="palette__group" role="presentation">${esc(group)}</li>`;
      }
      html += `<li class="cmd" role="option" id="${idPrefix}-${i}" data-idx="${i}" aria-selected="${i === activeIdx}">${icon(c.icon)}<span>${highlight(c.label, q)}</span><span class="cmd__hint">${esc(c.hint)}</span></li>`;
    });
    listEl.innerHTML = html;
    const act = $(`[aria-selected="true"]`, listEl);
    act && act.scrollIntoView({ block: "nearest" });
  }

  function paletteRender() {
    pItems = matchCommands(pInput.value);
    pIndex = clamp(pIndex, 0, Math.max(0, pItems.length - 1));
    renderCmdList(pList, pItems, pInput.value, pIndex, "pcmd");
    pInput.setAttribute("aria-activedescendant", pItems.length ? "pcmd-" + pIndex : "");
  }

  function openPalette() {
    if (!palette.hidden) return;
    lastFocus = document.activeElement;
    palette.hidden = false;
    pInput.value = "";
    pIndex = 0;
    paletteRender();
    pInput.focus();
    if (hasGSAP && !reduced()) {
      gsap.fromTo($(".palette__panel", palette), { y: -16, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" });
      gsap.fromTo($(".palette__backdrop", palette), { opacity: 0 }, { opacity: 1, duration: 0.25 });
    }
  }

  function closePalette(restore = true) {
    if (palette.hidden) return;
    palette.hidden = true;
    restore && lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }

  function runCmd(c) {
    if (!c) return;
    closePalette(false);
    setTimeout(c.run, 30);
  }

  function initPalette() {
    $("#palette-open").addEventListener("click", openPalette);
    palette.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) return closePalette();
      const li = e.target.closest(".cmd");
      if (li) runCmd(pItems[+li.dataset.idx]);
    });
    pInput.addEventListener("input", () => {
      pIndex = 0;
      paletteRender();
    });
    palette.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return closePalette();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        pIndex = (pIndex + (e.key === "ArrowDown" ? 1 : -1) + pItems.length) % Math.max(1, pItems.length);
        paletteRender();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        runCmd(pItems[pIndex]);
      }
      if (e.key === "Tab") trapFocus($(".palette__panel", palette), e);
    });

    // global shortcuts
    document.addEventListener("keydown", (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        palette.hidden ? openPalette() : closePalette();
        return;
      }
      if (e.key === "/" && !typing && palette.hidden && drawer.hidden) {
        e.preventDefault();
        const s = $("#site-search");
        s && s.offsetParent ? s.focus() : openPalette();
      }
    });
  }

  /* Header search: filters + jumps to sections and projects */
  function initHeaderSearch() {
    const input = $("#site-search");
    const list = $("#search-results");
    if (!input) return;
    let items = [];
    let idx = 0;
    const render = () => {
      items = matchCommands(input.value, ["Navigate", "Projects"]).slice(0, 10);
      idx = clamp(idx, 0, Math.max(0, items.length - 1));
      renderCmdList(list, items, input.value, idx, "scmd");
      input.setAttribute("aria-activedescendant", items.length ? "scmd-" + idx : "");
    };
    const open = () => {
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      render();
    };
    const close = () => {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
    };
    const pick = (c) => {
      if (!c) return;
      close();
      input.value = "";
      input.blur();
      c.run();
    };
    input.addEventListener("focus", open);
    input.addEventListener("input", () => {
      idx = 0;
      open();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
        render();
      } else if (e.key === "Enter") {
        e.preventDefault();
        pick(items[idx]);
      } else if (e.key === "Escape") {
        close();
        input.blur();
      }
    });
    list.addEventListener("pointerdown", (e) => {
      const li = e.target.closest(".cmd");
      if (li) {
        e.preventDefault();
        pick(items[+li.dataset.idx]);
      }
    });
    input.addEventListener("blur", () => setTimeout(close, 120));
  }

  /* ======================================================================
     13. Clipboard + toasts
     ====================================================================== */
  function toast(msg, ic = "check") {
    const stack = $("#toasts");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
    stack.appendChild(el);
    if (hasGSAP && !reduced()) {
      gsap.fromTo(el, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
      gsap.to(el, { x: -60, opacity: 0, duration: 0.35, delay: 2.6, ease: "power2.in", onComplete: () => el.remove() });
    } else setTimeout(() => el.remove(), 3000);
  }

  async function copyText(text, msg = "Copied to clipboard") {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      toast(msg);
    } catch (e) {
      toast("Couldn't copy — " + text, "x");
    }
  }

  function initCopy() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy]");
      if (btn) copyText(btn.dataset.copy, "Email copied to clipboard");
    });
  }

  /* ======================================================================
     14. Contact terminal form (validation + Formspree/mailto)
     ====================================================================== */
  function initContact() {
    const form = $("#contact-form");
    if (!form) return;
    const out = $("#contact-out");
    const rules = {
      name: (v) => (v.trim().length >= 2 ? "" : "error: name must be at least 2 characters"),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "error: that doesn't look like a valid email"),
      message: (v) => (v.trim().length >= 10 ? "" : "error: message must be at least 10 characters"),
    };

    const validate = (field) => {
      const msg = rules[field.name](field.value);
      const wrap = field.closest(".field");
      wrap.classList.toggle("is-invalid", !!msg);
      field.setAttribute("aria-invalid", !!msg);
      $(".field__err", wrap).textContent = msg;
      return !msg;
    };

    const fields = ["name", "email", "message"].map((n) => form.elements[n]);
    fields.forEach((f) => {
      f.addEventListener("blur", () => f.value && validate(f));
      f.addEventListener("input", () => f.closest(".field").classList.contains("is-invalid") && validate(f));
    });

    const print = (lines) => {
      out.innerHTML = "";
      lines.forEach((l, i) =>
        setTimeout(() => {
          const p = document.createElement("p");
          p.innerHTML = l;
          out.appendChild(p);
          hasGSAP && !reduced() && gsap.from(p, { x: 40, opacity: 0, duration: 0.35, ease: "power2.out" });
        }, reduced() ? 0 : i * 220)
      );
    };

    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit"));
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ok = fields.map(validate).every(Boolean);
      if (!ok) {
        const firstBad = fields.find((f) => f.getAttribute("aria-invalid") === "true");
        firstBad && firstBad.focus();
        print([`<span class="t-red">✖ push rejected</span> — fix the errors above and try again.`]);
        hasGSAP && !reduced() && gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
        return;
      }
      if (form.elements._gotcha.value) return; // bot
      const data = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), message: form.elements.message.value.trim() };
      const endpoint = form.dataset.endpoint;
      print([
        `<span class="t-muted">$</span> git push origin hire-me`,
        `Enumerating objects: 3, done.`,
        `Writing objects: 100% (3/3), ${new Blob([data.message]).size} bytes`,
      ]);
      if (endpoint) {
        try {
          const res = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(res.status);
          setTimeout(() => {
            print([
              `Writing objects: 100% (3/3), done.`,
              `To <span class="t-accent">${esc(D.profile.email)}</span>`,
              `<span class="t-green"> * [new branch]  hire-me -> main</span>`,
              `<span class="t-green">✔ Message delivered. Talk soon, ${esc(data.name.split(" ")[0])}!</span>`,
            ]);
            form.reset();
            celebrate();
          }, 700);
        } catch (err) {
          print([`<span class="t-red">✖ remote rejected (${esc(err.message)})</span> — email me directly at <a href="mailto:${esc(D.profile.email)}">${esc(D.profile.email)}</a>`]);
        }
      } else {
        const subject = encodeURIComponent(`Portfolio contact from ${data.name}`);
        const body = encodeURIComponent(`${data.message}\n\n— ${data.name} <${data.email}>`);
        setTimeout(() => {
          print([
            `To <span class="t-accent">${esc(D.profile.email)}</span>`,
            `<span class="t-green"> * [new branch]  hire-me -> main</span>`,
            `<span class="t-green">✔ Opening your mail client…</span>`,
          ]);
          window.location.href = `mailto:${D.profile.email}?subject=${subject}&body=${body}`;
        }, 650);
      }
    });
  }

  /* ======================================================================
     15. Easter egg — Konami code or typing "git push" → confetti
     ====================================================================== */
  const confettiCanvas = $("#confetti");

  function celebrate() {
    toast("🚀 Everything up-to-date. Thanks for visiting!", "sparkle");
    if (reduced() || !confettiCanvas) return;
    const ctx = confettiCanvas.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    confettiCanvas.width = innerWidth * dpr;
    confettiCanvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#3fb950", "#58a6ff", "#a371f7", "#d29922", "#f85149", "#39d353", "#ffffff"];
    const parts = Array.from({ length: 180 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 16,
      vy: -(Math.random() * 16 + 8),
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 6,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    const step = (t) => {
      const life = (t - t0) / 1000;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.42;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - life / 3.2);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (life < 3.2) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(step);
  }

  function initEasterEgg() {
    const konami = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
    let keys = [];
    let typed = "";
    document.addEventListener("keydown", (e) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase();
      keys = keys.concat(k).slice(-konami.length);
      if (keys.join() === konami.join()) {
        keys = [];
        celebrate();
      }
      if (k.length === 1) {
        typed = (typed + k).slice(-8);
        if (typed === "git push") {
          typed = "";
          celebrate();
        }
      }
    });
  }

  /* ======================================================================
     16. Boot
     ====================================================================== */
  function initMisc() {
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
    // local time in Pakistan
    const lt = $("#local-time");
    if (lt && window.Intl) {
      const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });
      const tick = () => (lt.textContent = `${fmt.format(new Date())} local · PKT (UTC +05:00)`);
      tick();
      setInterval(tick, 30000);
    }
    // avatar flip (pixel art ↔ photo)
    const av = $("#avatar-flip");
    if (av) {
      av.setAttribute("aria-pressed", "false");
      av.addEventListener("click", () => {
        const on = av.classList.toggle("is-flipped");
        av.setAttribute("aria-pressed", on);
      });
    }
  }

  async function boot() {
    if (headerEl) root.style.setProperty("--header-h", headerEl.offsetHeight + "px");
    renderPinned();
    renderFilters();
    renderRepos();
    renderShowcase();
    renderShas();

    initTheme();
    initScroll();
    initDrawer();
    initPalette();
    initHeaderSearch();
    initCopy();
    initContact();
    initEasterEgg();
    initMisc();
    initCursor();
    initFilters();
    initInteractions();
    observeBrowsers();
    typeOnce($(".type-heading"));

    await runPreloader();
    initAnimations();
    initContrib();
    heroIntro();

    // deep link (e.g. /#contact) after layout + pin spacing exist
    const id = location.hash.slice(1);
    if (id && document.getElementById(id)) {
      requestAnimationFrame(() => scrollToId(id, { instant: true, noFocus: true }));
    }
    // fonts/images can shift layout slightly → refresh triggers once everything is in
    window.addEventListener("load", () => hasST && ScrollTrigger.refresh());
  }

  /** Never leave the page hidden behind the preloader if something throws */
  function safeBoot() {
    boot().catch((err) => {
      console.error(err);
      root.classList.remove("anim-ready");
      const pre = $("#preloader");
      pre && pre.remove();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", safeBoot);
  else safeBoot();
})();
