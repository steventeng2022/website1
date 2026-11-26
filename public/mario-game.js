/* Full-screen side-scrolling home for the "mario" site theme.
 * On "/" the page becomes a playable level: walk right, bump "?" blocks from below to open each section,
 * stand on a pipe and press Down to travel to another page, finish at the flag to reach Contact.
 * Content is cloned from the server-rendered sections, so nothing is duplicated server-side.
 * Falls back to the normal (restyled) page for reduced motion, the "classic view" toggle, and every other route.
 * Original pixel art only (sprites come from /mario-world.js); no audio. */
(() => {
  "use strict";
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GRAV = 2300, JUMP = 800, TILE = 48, GROUND_H = 96, PW = 30, PH = 44;
  const isMario = () => root.dataset.siteTheme === "mario";
  const classic = () => { try { return localStorage.getItem("mw-classic") === "1"; } catch (e) { return false; } };
  const setClassic = on => { try { on ? localStorage.setItem("mw-classic", "1") : localStorage.removeItem("mw-classic"); } catch (e) { /* ignore */ } };
  const wanted = () => isMario() && !reduce && !classic() && location.pathname === "/" && window.__mwKit && document.getElementById("about");
  let game = null;

  function addCss() {
    if (document.getElementById("mwg-css")) return;
    const l = document.createElement("link");
    l.id = "mwg-css"; l.rel = "stylesheet"; l.href = "/mario-game.css?v=2";
    document.head.appendChild(l);
  }

  // HUD button that switches between the game world and the classic page
  function syncToggle() {
    const hud = document.querySelector(".mw-hud");
    if (!hud) return;
    let b = hud.querySelector(".mwg-toggle");
    const show = isMario() && !reduce && location.pathname === "/";
    if (!show) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement("button");
      b.type = "button"; b.className = "mw-ctl mwg-toggle";
      b.addEventListener("click", () => { setClassic(!classic()); tick(); });
      hud.appendChild(b);
    }
    b.textContent = classic() ? "▶ PLAY WORLD" : "■ CLASSIC VIEW";
  }

  function tick() {
    const w = !!wanted();
    if (w && !game) game = start();
    else if (!w && game) { game.stop(); game = null; }
    syncToggle();
  }

  function start() {
    const K = window.__mwKit, save = K.save;
    addCss();
    root.classList.add("mw-game-on");
    const en = /[?&]lang=en/.test(location.search);
    const $ = id => document.getElementById(id);
    const T = s => (s || "").replace(/\s+/g, " ").trim();
    const kicker = id => { const k = $(id) && $(id).querySelector(".section-kicker"); return k ? T(k.textContent).replace(/^\d+\s*/, "") : id.toUpperCase(); };
    const mk = (cls, parent, tag) => { const e = document.createElement(tag || "div"); e.className = cls; if (parent) parent.appendChild(e); return e; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------- level data (read from the server-rendered page) ----------
    const heroName = T((document.querySelector(".hero-name") || {}).textContent) || "STEVEN";
    const greeting = T((document.querySelector(".hero-greeting") || {}).textContent);
    const intro = T((document.querySelector(".hero .intro") || {}).textContent);
    const stationIds = ["about", "projects", "skills", "blog"].filter(id => $(id));
    const seen = new Set();
    const pages = [];
    document.querySelectorAll(".premium-header__nav a").forEach(a => {
      let u; try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { return; }
      if (u.origin !== location.origin || u.pathname === "/" || seen.has(u.pathname)) return;
      seen.add(u.pathname); pages.push({ href: u.pathname + u.search, label: T(a.textContent) });
    });

    const STATION_X = 1100, GAP = 950;
    const stationX = i => STATION_X + i * GAP;
    const pipesX = stationX(stationIds.length) + 100;
    const stairsX = pipesX + pages.length * 200 + 120;
    const poleX = stairsX + 5 * TILE + 24;
    const castleX = poleX + 260;
    const W = castleX + 420;

    // ---------- DOM ----------
    const stage = mk("mwg");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", en ? "Interactive world: use arrow keys, or press Classic view for the normal page" : "互動遊戲世界：使用方向鍵，或按「CLASSIC VIEW」切換為一般頁面");
    document.body.appendChild(stage);
    const sky = mk("mwg-sky", stage), clouds = mk("mwg-par mwg-clouds", stage), hills = mk("mwg-par mwg-hills", stage);
    const world = mk("mwg-world", stage); world.style.width = W + "px";
    mk("mwg-ground", world);
    const put = (el, x, y, w, h) => { el.style.left = x + "px"; el.style.bottom = GROUND_H + y + "px"; if (w) el.style.width = w + "px"; if (h) el.style.height = h + "px"; return el; };

    // title billboard
    const title = mk("mwg-title", world);
    title.innerHTML = "";
    if (greeting) mk("mwg-title-hi", title).textContent = greeting;
    mk("mwg-title-name", title).textContent = heroName;
    if (intro) mk("mwg-title-intro", title).textContent = intro;
    const help = mk("mwg-help", title);
    help.textContent = en ? "← → move · Space jump · bump the ? blocks from below" : "← → 移動 · 空白鍵跳躍 · 從下方頂「?」方塊";
    put(title, 150, 0);

    const solids = [], blocks = [], coins = [], critters = [], pipes = [];
    const addSolid = (x, y, w, h, extra) => { const s = Object.assign({ x, y, w, h }, extra || {}); solids.push(s); return s; };

    // "?" blocks with flanking bricks
    stationIds.forEach((id, i) => {
      const x = stationX(i), by = 112;
      [-1, 1].forEach(d => {
        const el = mk("mwg-brick", world); put(el, x + d * TILE, by, TILE, TILE);
        addSolid(x + d * TILE, by, TILE, TILE, { brick: el, cool: 0 });
      });
      const el = mk("mwg-block", world, "button");
      el.type = "button"; el.setAttribute("aria-label", (en ? "Open " : "開啟 ") + kicker(id));
      el.dataset.x = x; el.textContent = "?";
      put(el, x, by, TILE, TILE);
      const s = addSolid(x, by, TILE, TILE, { block: true, id, el, cool: 0 });
      blocks.push(s);
      const tag = mk("mwg-tag", world); tag.textContent = kicker(id); put(tag, x - 60, by + TILE + 10, TILE + 120);
      // coin arc around each station
      for (let c = 0; c < 5; c++) coins.push({ x: x - 360 + c * 64, y: 40 + Math.sin(c / 4 * Math.PI) * 70, got: false });
      // a patroller before each station (not the first)
      if (i > 0 || stationIds.length === 1) critters.push({ x: x - 520, min: x - 700, max: x - 330, vx: 52, dead: 0, t: Math.random() });
    });
    critters.push({ x: pipesX - 420, min: pipesX - 620, max: pipesX - 240, vx: -52, dead: 0, t: 0 });
    for (let c = 0; c < 6; c++) coins.push({ x: 560 + c * 56, y: 34, got: false });

    // pipes to the other pages
    pages.forEach((p, i) => {
      const x = pipesX + i * 200, a = mk("mwg-pipe", world, "a");
      a.href = p.href; a.setAttribute("aria-label", (en ? "Go to " : "前往 ") + p.label);
      put(a, x, 0, 96, 96);
      const lip = mk("mwg-pipe-lip", a); void lip;
      const tag = mk("mwg-tag", world); tag.textContent = p.label; put(tag, x - 40, 96 + 14, 176);
      addSolid(x, 0, 96, 96, { pipe: a, href: p.href });
      pipes.push({ x, w: 96, a, href: p.href });
    });

    // stairs, flag, castle
    for (let i = 0; i < 4; i++) {
      const el = mk("mwg-stair", world); put(el, stairsX + i * TILE, 0, TILE, (i + 1) * TILE);
      addSolid(stairsX + i * TILE, 0, TILE, (i + 1) * TILE);
    }
    const pole = mk("mwg-pole", world); put(pole, poleX, 0, 8, 340);
    const cloth = mk("mwg-cloth", pole); cloth.style.backgroundImage = K.FLAG;
    const castle = mk("mwg-castle", world, "button"); castle.type = "button"; castle.setAttribute("aria-label", (en ? "Open " : "開啟 ") + kicker("contact"));
    castle.dataset.x = castleX; put(castle, castleX, 0, 260, 250);
    mk("mwg-castle-door", castle);
    const ctag = mk("mwg-tag", world); ctag.textContent = kicker("contact"); put(ctag, castleX - 10, 262, 280);

    // coins + critters + player elements
    coins.forEach(c => { c.el = mk("mwg-coin", world); put(c.el, c.x, c.y, 20, 26); });
    critters.forEach(c => { c.el = mk("mwg-critter", world); put(c.el, 0, 0, 36, 36); });
    const pEl = mk("mwg-player", world), pSprite = mk("mwg-sprite", pEl);
    put(pEl, 0, 0, 36, 48);

    // fast travel map + touch pad + hint
    const map = mk("mwg-map", stage);
    map.setAttribute("aria-label", en ? "Fast travel" : "快速前往");
    const stops = [{ l: en ? "START" : "起點", x: 80 }].concat(stationIds.map((id, i) => ({ l: kicker(id), x: stationX(i) - 160 })));
    if (pages.length) stops.push({ l: en ? "PAGES" : "前往頁面", x: pipesX - 160 });
    stops.push({ l: kicker("contact"), x: poleX - 260 });
    stops.forEach(s => { const b = mk("mwg-map-btn", map, "button"); b.type = "button"; b.textContent = s.l; b.addEventListener("click", () => warp(s.x)); });
    const pad = mk("mwg-pad", stage);
    pad.innerHTML = '<button type="button" data-k="left" aria-label="Left">◀</button><button type="button" data-k="right" aria-label="Right">▶</button><button type="button" data-k="jump" class="mwg-pad-a" aria-label="Jump">A</button>';
    const prog = mk("mwg-progress", stage); const progBar = mk("mwg-progress-bar", prog);

    // ---------- state ----------
    const P = { x: 60, y: 0, vx: 0, vy: 0, dir: 1, ground: true, hurt: 0, anim: 0, lock: 0, sink: 0, sinkHref: "", big: 0 };
    let camX = 0, clock = 0, last = performance.now(), raf = 0, stopped = false, dialog = null, flagDone = false, wheel = { dir: 0, t: 0 }, ignoreFocus = false, moved = false;
    const keys = new Set();
    const vw = () => stage.clientWidth, vh = () => stage.clientHeight;
    const overlap = (a, s) => a.x < s.x + s.w && a.x + PW > s.x && a.y < s.y + s.h && a.y + PH > s.y;
    const typing = t => t instanceof Element && t.closest("input,textarea,select,[contenteditable=''],[contenteditable=true]");

    function pop(text, x, y, cls) {
      const e = mk("mwg-pop " + (cls || ""), world); e.textContent = text; put(e, x, y);
      const done = () => e.remove();
      if (e.animate) e.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-50px)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = done; else setTimeout(done, 900);
    }
    function addCoin(x, y) {
      save.coins++; save.score += 200;
      if (save.coins >= 100) { save.coins -= 100; save.lives++; pop("1UP", x, y + 40, "mwg-pop-up"); }
      K.persist();
    }
    function warp(x) {
      if (dialog) return;
      stage.classList.add("mwg-warping");
      setTimeout(() => { P.x = clamp(x, 0, W - PW); P.y = 60; P.vx = 0; P.vy = 0; camX = clamp(P.x - vw() * 0.35, 0, Math.max(0, W - vw())); moved = true; }, 160);
      setTimeout(() => stage.classList.remove("mwg-warping"), 420);
    }

    // ---------- dialog (section content cloned from the server-rendered page) ----------
    function openDialog(id, returnEl) {
      if (dialog) return;
      const src = id === "contact" ? $("contact") : $(id);
      if (!src) return;
      const box = mk("mwg-dialog", stage); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      const bar = mk("mwg-dialog-bar", box);
      const h = mk("mwg-dialog-title", bar, "strong"); h.textContent = kicker(id);
      const close = mk("mwg-dialog-close", bar, "button"); close.type = "button"; close.textContent = "✕"; close.setAttribute("aria-label", en ? "Close" : "關閉");
      box.setAttribute("aria-label", kicker(id));
      const body = mk("mwg-dialog-body", box);
      const clone = src.cloneNode(true);
      clone.removeAttribute("id"); clone.className = "mwg-content";
      clone.querySelectorAll(".section-kicker").forEach(n => n.remove());
      clone.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
      clone.querySelectorAll(".motion-reveal").forEach(n => n.classList.remove("motion-reveal"));
      body.appendChild(clone);
      dialog = { box, returnEl };
      keys.clear();
      close.addEventListener("click", closeDialog);
      box.addEventListener("keydown", e => { // keep focus inside the dialog
        if (e.key !== "Tab") return;
        const f = [...box.querySelectorAll("a[href],button,input,textarea,select,[tabindex]:not([tabindex='-1'])")].filter(n => !n.disabled);
        if (!f.length) return;
        const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      });
      close.focus();
    }
    function closeDialog() {
      if (!dialog) return;
      const { box, returnEl } = dialog; dialog = null; box.remove();
      if (returnEl && returnEl.focus) { ignoreFocus = true; returnEl.focus({ preventScroll: true }); setTimeout(() => { ignoreFocus = false; }, 50); }
    }

    // ---------- interactions ----------
    function hitBlock(s) {
      if (s.cool > 0) return;
      s.cool = 0.6;
      const el = s.block ? s.el : s.brick; el.classList.remove("mwg-bump"); void el.offsetWidth; el.classList.add("mwg-bump");
      if (s.block) {
        s.el.classList.add("mwg-used");
        pop("+1", s.x + 8, s.y + TILE + 8, "mwg-pop-coin"); addCoin(s.x, s.y + TILE);
        setTimeout(() => { if (!stopped) openDialog(s.id, s.el); }, 420);
      } else if (Math.random() < 0.5) { pop("+1", s.x + 8, s.y + TILE + 8, "mwg-pop-coin"); addCoin(s.x, s.y + TILE); }
    }
    function sparks() {
      const colors = ["#e52521", "#fbd000", "#3fa83b", "#2a48d8", "#fff"];
      for (let b = 0; b < 6; b++) setTimeout(() => {
        if (stopped) return;
        const cx = vw() * (0.2 + Math.random() * 0.6), cy = vh() * (0.15 + Math.random() * 0.35);
        for (let i = 0; i < 14; i++) {
          const e = mk("mwg-spark", stage); e.style.left = cx + "px"; e.style.top = cy + "px"; e.style.background = colors[(b + i) % colors.length];
          const a = i / 14 * Math.PI * 2, r = 50 + Math.random() * 45;
          if (e.animate) e.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px)`, opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => e.remove(); else setTimeout(() => e.remove(), 600);
        }
      }, b * 240);
    }
    function reachFlag() {
      flagDone = true; P.lock = 2.2; P.vx = 0; P.vy = 0; P.x = poleX - PW - 2;
      cloth.style.transition = "transform 1.2s ease-in"; cloth.style.transform = "translateY(250px)";
      save.score += 5000; K.persist(); pop("5000", poleX - 40, P.y + 60, "mwg-pop-score"); sparks();
      setTimeout(() => { if (!stopped) openDialog("contact", castle); }, 1700);
    }

    stage.addEventListener("click", e => {
      const t = e.target instanceof Element ? e.target : null; if (!t) return;
      const blk = t.closest(".mwg-block"); if (blk) { const s = blocks.find(b => b.el === blk); if (s) { hitBlock(s); } return; }
      if (t.closest(".mwg-castle")) { openDialog("contact", castle); return; }
      const pc = t.closest(".mwg-critter"); void pc;
      if (t.closest(".mwg-player")) { jump(); pop(["Yippee!", "Hop!", "Nice!"][Math.floor(Math.random() * 3)], P.x, P.y + 60); }
    });
    stage.addEventListener("focusin", e => {
      stage.scrollLeft = 0; stage.scrollTop = 0;
      const t = e.target instanceof Element ? e.target.closest("[data-x]") : null;
      if (t && !ignoreFocus && !dialog) warp(Number(t.dataset.x) - 120);
    });
    stage.addEventListener("scroll", () => { stage.scrollLeft = 0; stage.scrollTop = 0; });
    stage.addEventListener("wheel", e => { if (dialog && dialog.box.contains(e.target)) return; e.preventDefault(); if (dialog) return; wheel = { dir: Math.sign(e.deltaY || e.deltaX), t: 0.2 }; moved = true; }, { passive: false });
    pad.addEventListener("pointerdown", e => { const b = e.target.closest("button"); if (!b) return; e.preventDefault(); if (b.dataset.k === "jump") jump(); else keys.add(b.dataset.k); moved = true; });
    const padUp = () => { keys.delete("left"); keys.delete("right"); };
    pad.addEventListener("pointerup", padUp); pad.addEventListener("pointercancel", padUp); pad.addEventListener("pointerleave", padUp);

    const norm = k => (k.length === 1 ? k.toLowerCase() : k);
    const onKeyDown = e => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = norm(e.key);
      if (k === "Escape" && dialog) { closeDialog(); return; }
      if (dialog) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "a", "d", "w", "s", "Shift"].includes(k)) {
        if (k !== "Shift") e.preventDefault();
        keys.add(k); moved = true;
        if (!e.repeat && (k === " " || k === "ArrowUp" || k === "w")) jump();
        if (!e.repeat && (k === "ArrowDown" || k === "s")) tryEnterPipe();
      }
    };
    const onKeyUp = e => keys.delete(norm(e.key));
    document.addEventListener("keydown", onKeyDown); document.addEventListener("keyup", onKeyUp);
    const onBlur = () => keys.clear(); addEventListener("blur", onBlur);

    function jump() { if (P.ground && !P.lock && !dialog && !P.sink) { P.vy = JUMP; P.ground = false; moved = true; } }
    function tryEnterPipe() {
      if (dialog || P.sink || !P.ground) return;
      const p = pipes.find(q => P.x + PW > q.x + 16 && P.x < q.x + q.w - 16 && Math.abs(P.y - 96) < 4);
      if (p) { P.sink = 0.7; P.sinkHref = p.href; P.vx = 0; }
    }

    // ---------- simulation ----------
    function step(dt) {
      clock += dt;
      solids.forEach(s => { if (s.cool) s.cool = Math.max(0, s.cool - dt); });
      P.hurt = Math.max(0, P.hurt - dt); P.lock = Math.max(0, P.lock - dt); wheel.t = Math.max(0, wheel.t - dt);
      if (P.sink > 0) {
        P.sink -= dt; P.y -= 120 * dt;
        if (P.sink <= 0) { const href = P.sinkHref; P.sinkHref = ""; const a = pipes.find(q => q.href === href); if (a) a.a.click(); }
        return;
      }
      const run = keys.has("Shift");
      let dir = 0;
      if (!dialog && !P.lock) {
        if (keys.has("ArrowRight") || keys.has("d") || keys.has("right")) dir += 1;
        if (keys.has("ArrowLeft") || keys.has("a") || keys.has("left")) dir -= 1;
        if (!dir && wheel.t > 0) dir = wheel.dir;
      }
      const target = dir * (run ? 340 : 230);
      P.vx += (target - P.vx) * Math.min(1, dt * (dir ? 10 : 14));
      if (Math.abs(P.vx) < 4 && !dir) P.vx = 0;
      if (P.vx) P.dir = Math.sign(P.vx);
      if (P.lock) { P.vx = 0; }

      // horizontal
      P.x += P.vx * dt;
      for (const s of solids) if (overlap(P, s)) { if (P.vx > 0) P.x = s.x - PW; else if (P.vx < 0) P.x = s.x + s.w; P.vx = 0; }
      P.x = clamp(P.x, 0, W - PW);
      // vertical
      if (!P.lock || P.y > 0) {
        const oy = P.y; P.vy -= GRAV * dt; if (P.lock) P.vy = Math.min(P.vy, -240); P.y += P.vy * dt; P.ground = false;
        if (P.vy > 0) {
          // Head hits the underside of whatever overlaps most: that is the block (or brick) the player is under.
          let best = null, bestOv = 0, ceil = Infinity;
          for (const s of solids) {
            if (!overlap(P, s)) continue;
            const ov = Math.min(P.x + PW, s.x + s.w) - Math.max(P.x, s.x);
            if (ov > bestOv) { bestOv = ov; best = s; }
            ceil = Math.min(ceil, s.y - PH);
          }
          if (best) { P.y = ceil; P.vy = 0; if (best.block || best.brick) hitBlock(best); }
        } else {
          for (const s of solids) {
            if (!overlap(P, s)) continue;
            if (oy >= s.y + s.h - 6) { P.y = s.y + s.h; P.vy = 0; P.ground = true; }
          }
        }
        if (P.y <= 0) { P.y = 0; P.vy = 0; P.ground = true; }
      }
      P.anim += dt * (Math.abs(P.vx) > 20 ? 9 : 0);

      // coins
      for (const c of coins) {
        if (c.got) continue;
        if (P.x < c.x + 20 && P.x + PW > c.x && P.y < c.y + 26 && P.y + PH > c.y) { c.got = true; c.el.remove(); addCoin(c.x, c.y); pop("+1", c.x, c.y + 30, "mwg-pop-coin"); }
      }
      // critters
      for (const c of critters) {
        c.t += dt;
        if (c.dead) { c.dead -= dt; if (c.dead <= 0 && c.el.parentNode) c.el.remove(); continue; }
        c.x += c.vx * dt; if (c.x < c.min || c.x > c.max) c.vx *= -1;
        if (!dialog && !P.lock && P.x < c.x + 32 && P.x + PW > c.x + 4 && P.y < 30 && P.y + PH > 0) {
          if (P.vy < 0 && P.y > 14) { c.dead = 0.5; P.vy = 460; P.ground = false; save.score += 100; K.persist(); pop("100", c.x, 40, "mwg-pop-score"); }
          else if (P.hurt <= 0) { P.hurt = 1.5; P.vy = 380; P.ground = false; P.vx = -P.dir * 200; pop("oops", P.x, P.y + 60); }
        }
      }
      // goal flag
      if (!flagDone && P.x + PW > poleX - 4 && P.x < poleX + 12) reachFlag();
      if (flagDone && P.x < poleX - 500) { flagDone = false; cloth.style.transition = "none"; cloth.style.transform = ""; }
      // camera
      const want = clamp(P.x - vw() * 0.35, 0, Math.max(0, W - vw()));
      camX += (want - camX) * Math.min(1, dt * 6);
    }

    function render() {
      world.style.transform = `translate3d(${-camX}px,0,0)`;
      clouds.style.backgroundPositionX = `${-camX * 0.25}px`; hills.style.backgroundPositionX = `${-camX * 0.55}px`;
      let img = K.PLAYER.stand;
      if (!P.ground || P.lock) img = K.PLAYER.jump; else if (Math.abs(P.vx) > 20) img = Math.floor(P.anim) % 2 ? K.PLAYER.run1 : K.PLAYER.run2;
      pSprite.style.backgroundImage = img;
      pSprite.style.transform = `scaleX(${P.dir})`;
      pEl.style.transform = `translate3d(${P.x - 3}px,${-P.y}px,0)`;
      pEl.style.opacity = P.hurt > 0 && Math.floor(clock * 14) % 2 ? "0.35" : "1";
      for (const c of critters) {
        if (!c.el.parentNode) continue;
        c.el.style.backgroundImage = c.dead ? K.CRITTER.squish : (Math.floor(c.t * 5) % 2 ? K.CRITTER.a : K.CRITTER.b);
        c.el.classList.toggle("mwg-squished", !!c.dead);
        c.el.style.transform = `translate3d(${c.x}px,0,0)`;
      }
      progBar.style.width = `${clamp((P.x / (W - PW)) * 100, 0, 100)}%`;
    }

    function frame(now) {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); render();
      raf = requestAnimationFrame(frame);
    }
    render(); raf = requestAnimationFrame(frame);
    setTimeout(() => { if (!moved && !stopped) help.classList.add("mwg-help-pulse"); }, 3500);
    const skipBtn = document.querySelector(".mwg-toggle"); void skipBtn;

    return {
      stop() {
        stopped = true; cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKeyDown); document.removeEventListener("keyup", onKeyUp); removeEventListener("blur", onBlur);
        stage.remove(); root.classList.remove("mw-game-on");
      },
    };
  }

  // Wait until after hydration, then watch the route (client-side navigation changes location without a reload).
  function boot() { tick(); setInterval(tick, 300); }
  if (document.readyState === "complete") setTimeout(boot, 700);
  else addEventListener("load", () => setTimeout(boot, 700));
})();
