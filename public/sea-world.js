/* "Underwater" (abyss) site theme: scrolling is diving.
 * A fixed, decorative sea layer sits behind the page: the water darkens with depth, light rays fade, marine snow drifts,
 * fish swim (and flee from the pointer or chase food you drop by clicking empty space), jellyfish glow in the dark,
 * bubbles rise and pop when clicked, and a seabed with a treasure chest appears at the bottom of the page.
 * A depth gauge shows metres and the ocean zone. All art is original SVG/CSS drawn in code; no audio, no libraries.
 * Everything is decorative (aria-hidden, pointer-events: none); clicks are hit-tested so page links always work. */
(() => {
  "use strict";
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isOn = () => root.dataset.siteTheme === "abyss";
  const isAdmin = () => location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const en = () => /[?&]lang=en/.test(location.search);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mk = (cls, parent, tag) => { const e = document.createElement(tag || "div"); e.className = cls; if (parent) parent.appendChild(e); return e; };
  const uri = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  let sea = null;

  // ---------- original fish art (drawn in code) ----------
  const fishSvg = (body, fin, stripe, eye) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 36'>
    <path d='M2 18 L16 6 L16 30 Z' fill='${fin}'/>
    <ellipse cx='36' cy='18' rx='24' ry='13' fill='${body}'/>
    <path d='M26 6 Q34 -2 44 6 Z' fill='${fin}'/><path d='M30 30 Q36 36 42 30 Z' fill='${fin}'/>
    ${stripe ? `<path d='M30 6 Q34 18 30 30 L35 30 Q39 18 35 6 Z' fill='${stripe}'/><path d='M44 8 Q47 18 44 28 L48 27 Q51 18 48 9 Z' fill='${stripe}'/>` : ""}
    <circle cx='52' cy='15' r='3.4' fill='#fff'/><circle cx='53' cy='15' r='1.8' fill='${eye || "#12263a"}'/></svg>`;
  const anglerSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 48'>
    <path d='M4 24 L18 12 L18 36 Z' fill='#16344d'/><ellipse cx='40' cy='28' rx='24' ry='15' fill='#16344d'/>
    <path d='M52 16 Q60 2 70 8' stroke='#16344d' stroke-width='2' fill='none'/><circle cx='70' cy='8' r='4' fill='#7affea'/><circle cx='70' cy='8' r='8' fill='#7affea' opacity='.3'/>
    <path d='M50 34 L66 34 L60 30 L56 34 L52 30 Z' fill='#e8fbff'/><circle cx='54' cy='24' r='3' fill='#7affea'/></svg>`;
  const SPECIES = [
    { img: uri(fishSvg("#ff8a1f", "#e06a00", "#ffffff", "#12263a")), w: 54, band: [0, .5], n: 2 },
    { img: uri(fishSvg("#2e7bff", "#ffd23f", null, "#0b1b33")), w: 60, band: [0, .55], n: 2 },
    { img: uri(fishSvg("#cfeaf5", "#8fc4d9", null, "#12263a")), w: 30, band: [0, .6], n: 5 },
    { img: uri(fishSvg("#ff7aa8", "#d94b7e", "#ffd5e4", "#2a0c1b")), w: 50, band: [.1, .7], n: 2 },
    { img: uri(fishSvg("#2fd6c4", "#139a8d", "#b8fff6", "#06231f")), w: 56, band: [.25, .9], n: 2 },
    { img: uri(anglerSvg), w: 92, band: [.6, 1.05], n: 2, glow: true },
  ];
  const JELLY = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 90'>
    <path d='M6 34 Q6 4 30 4 Q54 4 54 34 Q40 40 30 36 Q20 40 6 34 Z' fill='#b58cff' opacity='.85'/>
    <path d='M16 36 Q12 62 18 84 M26 38 Q24 66 28 88 M36 38 Q38 66 34 88 M46 36 Q50 62 44 84' stroke='#d9c2ff' stroke-width='2.4' fill='none' stroke-linecap='round' opacity='.8'/>
    <ellipse cx='22' cy='16' rx='8' ry='5' fill='#fff' opacity='.35'/></svg>`);
  const WHALE = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 120'>
    <path d='M8 70 Q40 20 130 24 Q220 28 262 56 L296 30 L286 72 L296 108 L258 84 Q200 112 120 104 Q40 100 8 70 Z' fill='#3b5f7e'/>
    <path d='M40 82 Q120 112 240 88 Q150 106 40 82 Z' fill='#cfe3ee' opacity='.8'/><circle cx='60' cy='58' r='4' fill='#e8fbff'/></svg>`);
  const SAND = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60'>
    <path d='M0 36 Q50 20 100 32 T200 30 T300 34 T400 28 L400 60 L0 60 Z' fill='#d9bf86'/><path d='M0 46 Q60 36 120 44 T240 42 T400 44 L400 60 L0 60 Z' fill='#c4a56a'/></svg>`);
  const WEED = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 160'>
    <path d='M20 160 Q4 120 22 90 Q38 62 18 28' stroke='#2fae6a' stroke-width='9' fill='none' stroke-linecap='round'/>
    <path d='M52 160 Q70 118 50 86 Q34 56 54 20' stroke='#1f8f56' stroke-width='9' fill='none' stroke-linecap='round'/>
    <path d='M92 160 Q74 126 94 98 Q108 76 96 46' stroke='#3fc980' stroke-width='9' fill='none' stroke-linecap='round'/>
    <path d='M70 160 Q84 140 76 120' stroke='#ff6f91' stroke-width='7' fill='none' stroke-linecap='round'/></svg>`);

  function build() {
    const lang = en();
    const layer = mk("sea", document.body);
    layer.setAttribute("aria-hidden", "true");
    mk("sea-bg", layer); mk("sea-rays", layer); mk("sea-snow", layer);
    const jellyLayer = mk("sea-layer", layer), fishLayer = mk("sea-layer", layer), bubbleLayer = mk("sea-layer", layer), fxLayer = mk("sea-layer", layer);
    const ui = mk("sea-ui", document.body); // above the page so the seabed, chest and gauge can be clicked
    ui.setAttribute("aria-hidden", "true");
    const floor = mk("sea-floor", ui);
    mk("sea-sand", floor).style.backgroundImage = SAND;
    for (let i = 0; i < 9; i++) { const w = mk("sea-weed", floor); w.style.backgroundImage = WEED; w.style.left = (i * 11 + (i % 3) * 2) + "%"; w.style.setProperty("--sway", (3 + (i % 4)) + "s"); w.style.setProperty("--h", (70 + (i * 23) % 70) + "px"); }
    const chest = mk("sea-chest", floor); chest.innerHTML = "<i class='sea-chest-lid'></i><i class='sea-chest-base'></i><i class='sea-chest-lock'></i>";

    let save = { pops: 0, pearls: 0 };
    try { Object.assign(save, JSON.parse(sessionStorage.getItem("sea-state") || "{}")); } catch (e) { /* storage may be blocked */ }
    const persist = () => { try { sessionStorage.setItem("sea-state", JSON.stringify(save)); } catch (e) { /* ignore */ } };

    const gauge = mk("sea-gauge", ui);
    gauge.innerHTML = `<div class="sea-gauge-track"><i class="sea-gauge-dot"></i></div><div class="sea-gauge-text"><span class="sea-gauge-label">${lang ? "DEPTH" : "水深"}</span><b data-k="m">0</b><span class="sea-gauge-unit">m</span><span class="sea-gauge-zone" data-k="zone"></span><span class="sea-gauge-pops"><i></i><b data-k="pops">0</b></span></div>`;
    const q = k => gauge.querySelector(`[data-k="${k}"]`);
    const dot = gauge.querySelector(".sea-gauge-dot");
    const zones = lang ? [[0, "SUNLIGHT ZONE"], [200, "TWILIGHT ZONE"], [1000, "MIDNIGHT ZONE"], [4000, "ABYSSAL ZONE"], [6000, "HADAL ZONE"]] : [[0, "陽光層"], [200, "暮光層"], [1000, "午夜層"], [4000, "深淵層"], [6000, "超深淵層"]];

    let W = innerWidth, H = innerHeight, depth = 0, now0 = performance.now(), last = now0, raf = 0, stopped = false, clock = 0, nextBubble = 0.3, nextJelly = 0;
    const ptr = { x: -999, y: -999 };
    const fish = [], bubbles = [], foods = [], jellies = [];

    // fish
    SPECIES.forEach((sp, si) => {
      const count = Math.max(1, Math.round(sp.n * (innerWidth < 700 ? 0.6 : 1)));
      for (let i = 0; i < count; i++) {
        const el = mk("sea-fish" + (sp.glow ? " sea-fish-glow" : ""), fishLayer);
        el.style.backgroundImage = sp.img; el.style.width = sp.w + "px"; el.style.height = sp.w * (si === 5 ? 0.66 : 0.5625) + "px";
        const dir = Math.random() < 0.5 ? -1 : 1;
        fish.push({ el, sp, w: sp.w, x: Math.random() * W, y: H * (0.12 + Math.random() * 0.72), vx: dir * (30 + Math.random() * 40) * (sp.w < 40 ? 1.4 : 1), vy: 0, dir, ph: Math.random() * 6.28, boost: 0, base: 0 });
      }
    });
    // jellyfish
    for (let i = 0; i < 3; i++) {
      const el = mk("sea-jelly", jellyLayer); el.style.backgroundImage = JELLY; el.style.setProperty("--d", (4 + i) + "s");
      jellies.push({ el, x: W * (0.15 + i * 0.32), y: H * (0.2 + (i % 2) * 0.35), ph: Math.random() * 6, s: 0.8 + i * 0.25 });
    }

    function pulse(x, y, color) { // ripple ring
      const r = mk("sea-ring", fxLayer); r.style.left = x + "px"; r.style.top = y + "px"; if (color) r.style.borderColor = color;
      if (r.animate) r.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: .9 }, { transform: "translate(-50%,-50%) scale(2.4)", opacity: 0 }], { duration: 700, easing: "ease-out" }).onfinish = () => r.remove(); else setTimeout(() => r.remove(), 500);
    }
    function label(text, x, y, cls) {
      const e = mk("sea-pop " + (cls || ""), fxLayer); e.textContent = text; e.style.left = x + "px"; e.style.top = y + "px";
      if (e.animate) e.animate([{ transform: "translate(-50%,0)", opacity: 1 }, { transform: "translate(-50%,-46px)", opacity: 0 }], { duration: 1000, easing: "ease-out" }).onfinish = () => e.remove(); else setTimeout(() => e.remove(), 900);
    }
    function spawnBubble(x, y, size) {
      const el = mk("sea-bubble", bubbleLayer), s = size || 8 + Math.random() * 38;
      el.style.width = el.style.height = s + "px";
      bubbles.push({ el, x: x != null ? x : Math.random() * W, y: y != null ? y : H + 40, s, vy: 36 + Math.random() * 60 + (50 - s) * 0.6, ph: Math.random() * 6.28, amp: 6 + Math.random() * 16 });
    }
    function popBubble(b) {
      const i = bubbles.indexOf(b); if (i < 0) return; bubbles.splice(i, 1);
      pulse(b.x, b.y, "rgba(220,250,255,.9)"); b.el.remove();
      save.pops++; persist();
      for (let k = 0; k < 3; k++) { const s = spawnMini(b.x, b.y); void s; }
    }
    function spawnMini(x, y) { const el = mk("sea-bubble sea-mini", bubbleLayer); const s = 4 + Math.random() * 5; el.style.width = el.style.height = s + "px"; bubbles.push({ el, x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 20, s, vy: 50 + Math.random() * 40, ph: Math.random() * 6, amp: 4, life: 1.4 }); return el; }

    // ---------- interactions (all hit-tested so real links/buttons keep working) ----------
    const INTERACTIVE = "a,button,input,textarea,select,label,summary,[role=button],[contenteditable],.sea-chest";
    let gaugeClicks = [];
    function onClick(e) {
      const t = e.target instanceof Element ? e.target : null; if (!t) return;
      if (t.closest(".sea-chest")) { openChest(); return; }
      if (t.closest(".sea-gauge")) { const n = performance.now(); gaugeClicks = gaugeClicks.filter(c => n - c < 2000); gaugeClicks.push(n); if (gaugeClicks.length >= 5) { gaugeClicks = []; releaseWhale(); } return; }
      if (t.closest(INTERACTIVE)) return;
      const x = e.clientX, y = e.clientY;
      const b = bubbles.find(q => Math.hypot(q.x - x, q.y - y) < q.s / 2 + 8);
      if (b) { popBubble(b); return; }
      const f = fish.find(q => Math.hypot(q.x - x, q.y - y) < q.w * 0.7);
      if (f) { f.boost = 1.2; f.dir = f.x < x ? -1 : 1; for (let k = 0; k < 4; k++) spawnBubble(f.x + (Math.random() - 0.5) * 20, f.y, 6 + Math.random() * 8); pulse(x, y); return; }
      pulse(x, y);
      const el = mk("sea-food", fxLayer); foods.push({ el, x, y, life: 9 });
    }
    function openChest() {
      chest.classList.add("sea-chest-open");
      setTimeout(() => chest.classList.remove("sea-chest-open"), 1600);
      const r = chest.getBoundingClientRect();
      save.pearls++; persist();
      label(lang ? "+1 pearl" : "+1 珍珠", r.left + r.width / 2, r.top - 10, "sea-pop-pearl");
      for (let i = 0; i < 12; i++) {
        const p = mk("sea-pearl", fxLayer); p.style.left = r.left + r.width / 2 + "px"; p.style.top = r.top + "px";
        const dx = (Math.random() - 0.5) * 220, dy = -80 - Math.random() * 160;
        if (p.animate) p.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${dx}px,${dy}px)`, opacity: 0 }], { duration: 1200 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => p.remove(); else setTimeout(() => p.remove(), 800);
      }
    }
    function releaseWhale() {
      if (document.querySelector(".sea-whale")) return;
      const w = mk("sea-whale", fxLayer); w.style.backgroundImage = WHALE; w.style.top = H * 0.3 + "px";
      label(lang ? "A giant passes by..." : "海洋的巨人經過了…", W / 2, H * 0.22, "sea-pop-big");
      if (w.animate) w.animate([{ transform: `translateX(${-420}px)` }, { transform: `translateX(${W + 420}px)` }], { duration: 16000, easing: "linear" }).onfinish = () => w.remove(); else setTimeout(() => w.remove(), 2000);
    }
    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]; let kIdx = 0;
    const onKey = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0); if (kIdx === KONAMI.length) { kIdx = 0; releaseWhale(); } };
    const onMove = e => { ptr.x = e.clientX; ptr.y = e.clientY; };
    const onLeave = () => { ptr.x = ptr.y = -999; };
    const onResize = () => { W = innerWidth; H = innerHeight; };
    document.addEventListener("click", onClick); document.addEventListener("keydown", onKey); addEventListener("pointermove", onMove, { passive: true }); document.addEventListener("pointerleave", onLeave); addEventListener("resize", onResize);

    // ---------- frame ----------
    const setText = (k, v) => { const n = q(k); if (n && n.textContent !== v) n.textContent = v; };
    function frame(now) {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      depth += (clamp(scrollY / max, 0, 1) - depth) * Math.min(1, dt * 6);
      layer.style.setProperty("--depth", depth.toFixed(4));
      root.style.setProperty("--sea-depth", depth.toFixed(3));
      ui.style.setProperty("--floor", clamp((depth - 0.9) / 0.1, 0, 1).toFixed(3));
      const metres = Math.round(depth * 10900 / 10) * 10;
      setText("m", String(metres).padStart(5, "0")); setText("pops", String(save.pops));
      let z = zones[0][1]; zones.forEach(([m, n]) => { if (metres >= m) z = n; }); setText("zone", z);
      dot.style.top = (depth * 100).toFixed(1) + "%";

      if (reduce) return void (raf = requestAnimationFrame(frame));

      // bubbles
      nextBubble -= dt; if (nextBubble <= 0 && bubbles.length < 22) { spawnBubble(); nextBubble = 0.5 + Math.random() * 0.9; }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]; b.y -= b.vy * dt; b.ph += dt * 1.6;
        if (b.life != null) { b.life -= dt; if (b.life <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; } }
        if (b.y < -60) { b.el.remove(); bubbles.splice(i, 1); continue; }
        b.el.style.transform = `translate3d(${(b.x + Math.sin(b.ph) * b.amp - b.s / 2).toFixed(1)}px,${(b.y - b.s / 2).toFixed(1)}px,0)`;
      }
      // food
      for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i]; f.life -= dt; f.y += 34 * dt; f.x += Math.sin(clock * 2 + i) * 6 * dt;
        if (f.life <= 0 || f.y > H + 10) { f.el.remove(); foods.splice(i, 1); continue; }
        f.el.style.transform = `translate3d(${f.x.toFixed(1)}px,${f.y.toFixed(1)}px,0)`; f.el.style.opacity = Math.min(1, f.life / 1.5);
      }
      // fish (species fade with depth)
      for (const f of fish) {
        const [a, bnd] = f.sp.band, vis = clamp(Math.min((depth - a + 0.12) / 0.12, (bnd - depth + 0.12) / 0.12), 0, 1);
        f.el.style.opacity = vis.toFixed(2);
        if (vis <= 0) continue;
        let tx = null, ty = null, fast = 1;
        let nearest = null, nd = 420; for (const fd of foods) { const d = Math.hypot(fd.x - f.x, fd.y - f.y); if (d < nd) { nd = d; nearest = fd; } }
        if (nearest) { tx = nearest.x; ty = nearest.y; fast = 2.2; if (nd < 18) { nearest.life = 0; label("+1", f.x, f.y - 10, "sea-pop-food"); } }
        const dp = Math.hypot(f.x - ptr.x, f.y - ptr.y);
        if (dp < 150) { const k = (150 - dp) / 150; f.vx += ((f.x - ptr.x) / (dp + 1)) * 300 * k * dt; f.vy += ((f.y - ptr.y) / (dp + 1)) * 300 * k * dt; }
        else if (tx != null) { f.vx += Math.sign(tx - f.x) * 90 * dt * fast; f.vy += (ty - f.y) * 1.2 * dt; }
        f.boost = Math.max(0, f.boost - dt);
        const cruise = (f.dir * (36 + f.w * 0.4)) * (1 + f.boost * 2);
        f.vx += (cruise - f.vx) * Math.min(1, dt * (tx != null && dp >= 150 ? 0.3 : 1.2));
        f.ph += dt * 2.2; f.vy += (Math.sin(f.ph) * 14 - f.vy) * Math.min(1, dt * 2);
        f.x += f.vx * dt; f.y = clamp(f.y + f.vy * dt, 30, H - 120);
        if (Math.abs(f.vx) > 6) f.dir = Math.sign(f.vx);
        if (f.x > W + 100) f.x = -100; if (f.x < -100) f.x = W + 100;
        f.el.style.transform = `translate3d(${(f.x - f.w / 2).toFixed(1)}px,${(f.y - f.w * 0.28).toFixed(1)}px,0) scaleX(${-f.dir}) rotate(${(f.vy * 0.06).toFixed(1)}deg)`;
      }
      // jellyfish drift (more visible in the dark)
      jellies.forEach((j, i) => {
        j.ph += dt * 0.5; const vis = clamp((depth - 0.25) / 0.2, 0, 1);
        j.el.style.opacity = vis.toFixed(2);
        j.el.style.transform = `translate3d(${(j.x + Math.sin(j.ph + i) * 50).toFixed(1)}px,${(j.y + Math.sin(j.ph * 1.3) * 60 + Math.sin(clock * 2 + i) * 8).toFixed(1)}px,0) scale(${j.s})`;
      });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    void nextJelly; void now0;
    return {
      stop() {
        stopped = true; cancelAnimationFrame(raf);
        document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave); removeEventListener("resize", onResize);
        layer.remove(); ui.remove(); root.style.removeProperty("--sea-depth");
      },
    };
  }

  function tick() {
    if (isOn() && !isAdmin()) { if (!sea) sea = build(); }
    else if (sea) { sea.stop(); sea = null; }
  }
  // Start after hydration so React never sees these extra nodes, then watch the route (admin is excluded).
  function boot() { tick(); setInterval(tick, 400); }
  if (document.readyState === "complete") setTimeout(boot, 600);
  else addEventListener("load", () => setTimeout(boot, 600));
})();
