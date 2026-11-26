/* "Depth" (3D) site theme.
 * - Every public page gets a living 3D backdrop: parallax star layers, a neon grid floor and floating wireframe cubes
 *   that react to the pointer and to scrolling.
 * - On "/" (desktop width, motion allowed) the page turns into a fly-through: scrolling moves the camera down a tunnel
 *   of glass panels, one per section. A 2D/3D toggle switches back to the normal page at any time.
 * Plain CSS 3D transforms only (no WebGL, no libraries). Real DOM stays focusable; focusing a panel flies to it. */
(() => {
  "use strict";
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isOn = () => root.dataset.siteTheme === "depth";
  const isAdmin = () => location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const flat = () => { try { return localStorage.getItem("d3-flat") === "1"; } catch (e) { return false; } };
  const setFlat = on => { try { on ? localStorage.setItem("d3-flat", "1") : localStorage.removeItem("d3-flat"); } catch (e) { /* ignore */ } };
  const mk = (cls, parent, tag) => { const e = document.createElement(tag || "div"); e.className = cls; if (parent) parent.appendChild(e); return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let bg = null, fly = null, toggle = null, raf = 0, last = 0;

  // ---------- 3D backdrop (all public pages) ----------
  function makeBg() {
    const el = mk("d3-bg", document.body);
    el.setAttribute("aria-hidden", "true");
    ["d3-s1", "d3-s2", "d3-s3"].forEach(c => mk("d3-stars " + c, el));
    mk("d3-glow", el);
    mk("d3-floor", el);
    const shapes = mk("d3-shapes", el);
    const specs = [[8, 22, 90, 0], [86, 16, 70, 4], [14, 68, 60, 9], [78, 64, 110, 2], [48, 12, 46, 7], [58, 78, 52, 12], [30, 38, 36, 5]];
    specs.forEach(([x, y, s, d], i) => {
      const wrap = mk("d3-float", shapes); wrap.style.left = x + "%"; wrap.style.top = y + "%"; wrap.style.setProperty("--d", d + "s"); wrap.style.setProperty("--depth", (i % 3) + 1);
      if (i === 6) { const r = mk("d3-ring", wrap); r.style.setProperty("--s", s + "px"); return; }
      const cube = mk("d3-cube", wrap); cube.style.setProperty("--s", s + "px"); cube.style.animationDelay = "-" + d + "s";
      for (let f = 0; f < 6; f++) mk("d3-face d3-f" + f, cube);
    });
    return el;
  }

  // ---------- fly-through home ----------
  function startFly(main, secs) {
    const STEP = () => innerHeight * 0.9;
    root.classList.add("d3-on");
    const spacer = mk("d3-spacer", document.body);
    const size = () => { spacer.style.height = (secs.length - 1) * STEP() + innerHeight + "px"; };
    size();
    const labels = secs.map(s => {
      const k = s.querySelector(".section-kicker");
      return k ? k.textContent.replace(/\s+/g, " ").replace(/^\d+\s*/, "").trim() : (s.id === "top" ? "Home" : s.id);
    });
    const dots = mk("d3-dots", document.body);
    dots.setAttribute("aria-label", "Sections");
    const dotEls = secs.map((s, i) => {
      const b = mk("d3-dot", dots, "button"); b.type = "button"; b.setAttribute("aria-label", labels[i]); b.title = labels[i];
      b.addEventListener("click", () => scrollToIndex(i));
      return b;
    });
    let p = scrollY / STEP(), stopped = false;
    const idFor = new Map(secs.map((s, i) => [s.id, i]));
    function scrollToIndex(i) { scrollTo({ top: clamp(i, 0, secs.length - 1) * STEP(), behavior: "smooth" }); }

    const onClick = e => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      let u; try { u = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
      if (u.origin !== location.origin || u.pathname !== "/" || !u.hash) return;
      const i = idFor.get(u.hash.slice(1));
      if (i !== undefined) { e.preventDefault(); scrollToIndex(i); }
    };
    const onFocusIn = e => {
      const i = secs.findIndex(s => s.contains(e.target));
      if (i >= 0 && Math.abs(i - p) > 0.45) scrollToIndex(i);
    };
    const onResize = () => size();
    document.addEventListener("click", onClick); document.addEventListener("focusin", onFocusIn); addEventListener("resize", onResize);
    if (location.hash && idFor.has(location.hash.slice(1))) setTimeout(() => scrollTo({ top: idFor.get(location.hash.slice(1)) * STEP() }), 60);

    function frame(dt) {
      const target = scrollY / STEP();
      p += (target - p) * Math.min(1, dt * 7);
      const w = innerWidth;
      secs.forEach((s, i) => {
        const t = i - p, side = i % 2 ? 1 : -1;
        const z = t >= 0 ? -t * 1250 : -t * 1500;
        const x = side * t * w * (t >= 0 ? 0.13 : 0.3);
        const y = t >= 0 ? t * 14 : t * 44;
        const ry = -side * t * 13 + pointer.sx * 3;
        const rx = -pointer.sy * 2.2 + (t < 0 ? t * 5 : 0);
        const o = t >= 0 ? Math.pow(Math.max(0, 1 - t * 0.75), 2) : Math.max(0, 1 + t / 0.85);
        s.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        s.style.opacity = o.toFixed(3);
        s.style.pointerEvents = Math.abs(t) < 0.45 ? "auto" : "none";
        s.style.zIndex = String(100 - Math.round(t * 10));
        if (dotEls[i]) dotEls[i].classList.toggle("d3-dot-on", Math.abs(t) < 0.5);
      });
      return p;
    }
    return {
      frame,
      stop() {
        stopped = true; void stopped;
        document.removeEventListener("click", onClick); document.removeEventListener("focusin", onFocusIn); removeEventListener("resize", onResize);
        secs.forEach(s => { s.style.transform = s.style.opacity = s.style.pointerEvents = s.style.zIndex = ""; });
        spacer.remove(); dots.remove(); root.classList.remove("d3-on");
      },
    };
  }

  function syncToggle() {
    const show = isOn() && !reduce && location.pathname === "/" && innerWidth >= 900;
    if (!show) { if (toggle) { toggle.remove(); toggle = null; } return; }
    if (!toggle) {
      toggle = mk("d3-toggle", document.body, "button"); toggle.type = "button";
      toggle.addEventListener("click", () => { setFlat(!flat()); tick(); });
    }
    toggle.textContent = flat() ? "◈ 3D" : "▣ 2D";
    toggle.setAttribute("aria-label", flat() ? "Switch to the 3D fly-through" : "Switch to the normal 2D page");
  }

  function homeSections() {
    const main = document.querySelector("main.home-shell");
    if (!main) return null;
    const secs = [...main.children].filter(n => (n.tagName === "SECTION" || n.tagName === "FOOTER") && n.id);
    return secs.length >= 3 ? { main, secs } : null;
  }

  function tick() {
    if (!isOn()) { teardown(); return; }
    if (!bg && !isAdmin()) bg = makeBg();
    if (bg && isAdmin()) { bg.remove(); bg = null; }
    const home = location.pathname === "/" && !reduce && !flat() && innerWidth >= 900 ? homeSections() : null;
    if (home && !fly) fly = startFly(home.main, home.secs);
    else if (!home && fly) { fly.stop(); fly = null; }
    syncToggle();
    if (!raf && (bg || fly) && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }

  function loop(now) {
    raf = 0;
    if (!isOn() || (!bg && !fly)) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 5); pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 5);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    let p = scrollY / maxScroll * 4;
    if (fly) p = fly.frame(dt) * 0.9;
    if (bg) { bg.style.setProperty("--mx", pointer.sx.toFixed(3)); bg.style.setProperty("--my", pointer.sy.toFixed(3)); bg.style.setProperty("--p", p.toFixed(3)); }
    raf = requestAnimationFrame(loop);
  }

  function teardown() {
    if (fly) { fly.stop(); fly = null; }
    if (bg) { bg.remove(); bg = null; }
    if (toggle) { toggle.remove(); toggle = null; }
    root.classList.remove("d3-on");
  }

  addEventListener("pointermove", e => { pointer.x = (e.clientX / innerWidth - 0.5) * 2; pointer.y = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  // Wait until after hydration; then watch the route (client-side navigation changes the URL without a reload).
  function boot() { tick(); setInterval(tick, 300); }
  if (document.readyState === "complete") setTimeout(boot, 600);
  else addEventListener("load", () => setTimeout(boot, 600));
})();
