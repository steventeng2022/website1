/* Retro platformer layer for the "mario" site theme.
 * Original pixel art drawn from character maps below (no Nintendo assets or audio).
 * Loaded only when the admin picks the theme; plain JS so it adds nothing to other themes.
 * Autopilot runs by default; "CONTROL" in the HUD lets visitors drive with the keyboard. */
(() => {
  "use strict";
  if (window.__marioWorld) return;
  const root = document.documentElement;
  const isOn = () => root.dataset.siteTheme === "mario";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const S = 3, GRAVITY = 2300, JUMP = 790, GROUND = 16, PIPE_W = 64;
  const PAL = { R: "#e52521", B: "#2a48d8", S: "#fcc59c", K: "#6a3a12", Y: "#fbd000", W: "#ffffff", D: "#3a1d08", C: "#b5651d", L: "#f2d6a2", E: "#1b1f3b", P: "#ff7ab8" };

  function sprite(rows) {
    const h = rows.length, w = rows[0].length;
    let rects = "";
    rows.forEach((row, y) => {
      let x = 0;
      while (x < w) {
        const c = row[x];
        if (c === ".") { x++; continue; }
        let n = 1;
        while (x + n < w && row[x + n] === c) n++;
        rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PAL[c]}"/>`;
        x += n;
      }
    });
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${rects}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const TOP = ["...RRRRR....", "..RRRRRRRRR.", "..KKKSSKS...", ".KSKSSSKSSS.", ".KSKKSSSKSSS", ".KKSSSSKKKK.", "...SSSSSSS..", "..RRBRRR....", ".RRRBRRBRRR.", "RRRRBBBBRRRR", "SSRBYBBYBRSS", "SSSBBBBBBSSS", "SSBBBBBBBBSS"];
  const LEGS = {
    stand: ["..BBB..BBB..", ".KKK....KKK.", "KKKK....KKKK"],
    run1: ["..BBBBBB....", ".KKKB..KKK..", ".KKK....KKKK"],
    run2: ["....BBBBBB..", "..KKK..BKKK.", ".KKKK....KKK"],
    jump: [".BBB....BBB.", "KKK......KKK", "KK........KK"],
  };
  const PLAYER = {};
  for (const k in LEGS) PLAYER[k] = sprite(TOP.concat(LEGS[k]));
  const BODY = ["....CCCC....", "..CCCCCCCC..", ".CCCCCCCCCC.", ".CWWCCCCWWC.", "CCWEWCCWEWCC", "CCCWWCCWWCCC", "CCCCCCCCCCCC", ".CCCLLLLCCC.", "...LLLLLL...", "..LLLLLLLL.."];
  const CRITTER = {
    a: sprite(BODY.concat(["..DDD..DDD..", ".DDDD..DDDD."])),
    b: sprite(BODY.concat(["...DDD.DDD..", "..DDDD.DDDD."])),
    squish: sprite(["..CCCCCCCC..", ".CCWECCEWCC.", "CCCCCCCCCCCC", ".LLLLLLLLLL.", "..DDDD.DDDD."]),
  };
  const STAR = sprite(["....YY....", "....YY....", "...YYYY...", "YYYYYYYYYY", ".YYYEYEYY.", "..YYYYYY..", "..YYYYYY..", ".YYYYYYYY.", ".YY....YY.", "YY......YY"]);
  const FLAG = sprite(["WWWWWWWW", "WRRWWRRW", "WRRRRRRW", "WWRRRRWW", "WWWRRWWW", "WWWWWWWW"]);

  // Shared with /mario-game.js (the full-screen side-scrolling home) so both use one set of sprites and one score.
  const SAVE = { score: 0, coins: 0, lives: 3 };
  try { Object.assign(SAVE, JSON.parse(sessionStorage.getItem("mw-state") || "{}")); } catch (e) { /* storage may be blocked */ }
  window.__mwKit = { sprite, PLAYER, CRITTER, STAR, FLAG, PAL, save: SAVE, persist() { try { sessionStorage.setItem("mw-state", JSON.stringify(SAVE)); } catch (e) { /* ignore */ } } };

  function start() {
    const rect = { w: innerWidth, h: innerHeight };
    const mk = (cls, parent, tag) => { const e = document.createElement(tag || "div"); e.className = cls; (parent || layer).appendChild(e); return e; };
    const layer = document.createElement("div");
    layer.className = "mw-layer"; layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    root.classList.add("mw-active");

    // --- persistent counters -------------------------------------------------
    const save = window.__mwKit.save, persist = window.__mwKit.persist;

    // --- HUD -----------------------------------------------------------------
    const hud = mk("mw-hud", document.body);
    hud.innerHTML = `<div class="mw-hud-cell" aria-hidden="true">STEVEN<b data-k="score"></b></div>
      <div class="mw-hud-cell" aria-hidden="true"><span class="mw-hud-coin"></span>×<b data-k="coins" class="inline"></b></div>
      <div class="mw-hud-cell mw-hide-s" aria-hidden="true">WORLD<b>1-1</b></div>
      <div class="mw-hud-cell mw-hide-s" aria-hidden="true">LIVES<b>×<span data-k="lives"></span></b></div>
      <div class="mw-hud-cell mw-hide-s" aria-hidden="true">TIME<b data-k="time"></b></div>
      <button type="button" class="mw-ctl" aria-pressed="false" title="Arrow keys / A D move, Space jumps, Esc to stop"></button>`;
    const q = k => hud.querySelector(`[data-k="${k}"]`);
    const ctl = hud.querySelector(".mw-ctl");
    let timeLeft = 400, shown = {};
    const setText = (k, v) => { if (shown[k] !== v) { shown[k] = v; q(k).textContent = v; } };
    const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, "0");

    // --- static scenery ------------------------------------------------------
    mk("mw-ground");
    const pipeL = mk("mw-pipe mw-pipe-l"), pipeR = mk("mw-pipe mw-pipe-r");
    const flag = mk("mw-flag");
    const flagCloth = mk("mw-flag-cloth", flag);
    flagCloth.style.backgroundImage = FLAG;
    const flagX = () => rect.w - PIPE_W - 150;

    // --- player --------------------------------------------------------------
    const pEl = mk("mw-player"), pSprite = mk("mw-sprite", pEl);
    pEl.style.pointerEvents = "auto";
    const P = { x: 100, y: 0, vx: 0, vy: 0, dir: 1, ground: true, big: 0, star: 0, hurt: 0, hold: 0, anim: 0, clicks: [] };
    let controls = false, ap = { dir: 1, rest: 0 };
    const keys = new Set();
    const pw = () => (P.big ? 42 : 30), ph = () => (P.big ? 66 : 44);

    function pop(text, x, y, cls) {
      const e = mk("mw-pop " + (cls || ""));
      e.textContent = text; e.style.left = x + "px"; e.style.bottom = GROUND + y + "px";
      const done = () => e.remove();
      if (reduce || !e.animate) { setTimeout(done, 900); return; }
      e.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-46px)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = done;
    }
    function addScore(n, x, y) {
      save.score += n; persist();
      if (x != null) pop(String(n), x, y, "mw-pop-score");
    }
    function addCoin(x, y) {
      save.coins++; save.score += 200;
      if (save.coins >= 100) { save.coins -= 100; save.lives++; pop("1UP", x, y + 24, "mw-pop-up"); }
      persist();
    }

    // --- coins, critters, stars ---------------------------------------------
    const coins = [], critters = [], stars = [];
    function spawnCoinRow() {
      if (coins.length > 9) return;
      const n = 3 + Math.floor(Math.random() * 3), x0 = 110 + Math.random() * Math.max(40, rect.w - 420), y = 76 + Math.random() * 44;
      for (let i = 0; i < n; i++) {
        const e = mk("mw-coin"); coins.push({ el: e, x: x0 + i * 38, y, age: 0 });
        e.style.left = x0 + i * 38 + "px"; e.style.bottom = GROUND + y + "px";
      }
    }
    function spawnCritter() {
      if (critters.length >= 2) return;
      const fromRight = Math.random() < 0.65, e = mk("mw-critter");
      critters.push({ el: e, x: fromRight ? rect.w - 10 : -40, vx: fromRight ? -70 : 70, dead: 0, t: 0, h: 30, w: 28 });
    }
    function spawnStar(x, y) {
      const e = mk("mw-star"); e.style.backgroundImage = STAR;
      stars.push({ el: e, x, y, vx: Math.random() < 0.5 ? -130 : 130, vy: 200, age: 0 });
    }
    const hit = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

    // --- interactions --------------------------------------------------------
    function jump(strength) { if (P.ground && !P.hold) { P.vy = JUMP * (strength || 1); P.ground = false; } }
    function startStar(seconds) { P.star = seconds; pop("STAR!", P.x, ph() + 10, "mw-pop-up"); }
    function coinShower() {
      for (let i = 0; i < 36; i++) {
        const e = mk("mw-coin mw-coin-fall"); e.style.left = Math.random() * rect.w + "px"; e.style.bottom = "auto"; e.style.top = "-30px";
        const d = 1100 + Math.random() * 1400;
        if (!reduce && e.animate) e.animate([{ transform: "translateY(0)" }, { transform: `translateY(${rect.h + 40}px)` }], { duration: d, delay: Math.random() * 700, easing: "cubic-bezier(.3,0,.8,1)" }).onfinish = () => e.remove();
        else setTimeout(() => e.remove(), 800);
      }
      save.coins += 36; save.score += 3600;
      if (save.coins >= 100) { save.coins -= 100; save.lives++; pop("1UP", P.x, ph() + 20, "mw-pop-up"); }
      persist();
    }
    function fireworks() {
      const colors = ["#e52521", "#fbd000", "#3fa83b", "#2a48d8", "#ffffff"];
      for (let b = 0; b < 5; b++) setTimeout(() => {
        const cx = rect.w * (0.2 + Math.random() * 0.6), cy = rect.h * (0.2 + Math.random() * 0.35);
        for (let i = 0; i < 14; i++) {
          const e = mk("mw-spark"); e.style.left = cx + "px"; e.style.top = cy + "px"; e.style.background = colors[(b + i) % colors.length];
          const a = (i / 14) * Math.PI * 2, r = 50 + Math.random() * 40;
          if (!reduce && e.animate) e.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px)`, opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => e.remove();
          else setTimeout(() => e.remove(), 600);
        }
      }, b * 260);
    }

    let brickClicks = [], flagState = 0; // 0 idle, 1 sliding, 2 done
    const onClick = ev => {
      const t = ev.target instanceof Element ? ev.target : null;
      if (!t) return;
      if (t === pEl || t.closest(".mw-player")) {
        const now = performance.now(); P.clicks = P.clicks.filter(c => now - c < 2000); P.clicks.push(now);
        jump(); pop(["Yippee!", "Hop!", "Nice!"][Math.floor(Math.random() * 3)], P.x, ph() + 8);
        if (P.clicks.length >= 3) { P.clicks = []; P.big = 15; pop("SUPER!", P.x, ph() + 28, "mw-pop-up"); }
        return;
      }
      if (t.closest(".mw-hud")) return;
      const kick = t.closest(".section-kicker > span");
      if (kick) {
        const r = kick.getBoundingClientRect();
        kick.classList.remove("mw-bump"); void kick.offsetWidth; kick.classList.add("mw-bump");
        const c = mk("mw-coin mw-coin-pop"); c.style.left = r.left + r.width / 2 - 10 + "px"; c.style.top = r.top - 30 + "px"; c.style.bottom = "auto";
        if (!reduce && c.animate) c.animate([{ transform: "translateY(0) scaleX(1)", opacity: 1 }, { transform: "translateY(-70px) scaleX(.2)", opacity: 1, offset: .6 }, { transform: "translateY(-40px) scaleX(1)", opacity: 0 }], { duration: 800, easing: "ease-out" }).onfinish = () => c.remove();
        else setTimeout(() => c.remove(), 600);
        addCoin(r.left, rect.h - r.top); return;
      }
      if (t.closest(".premium-header__brand")) {
        const now = performance.now(); brickClicks = brickClicks.filter(c => now - c < 1800); brickClicks.push(now);
        if (brickClicks.length >= 5) { brickClicks = []; coinShower(); }
        return;
      }
      const card = t.closest(".skill-grid article, .project-card, .blog-card");
      if (card && !t.closest("a")) { card.classList.remove("mw-bump"); void card.offsetWidth; card.classList.add("mw-bump"); return; }
      if (!controls && !t.closest("a,button,input,textarea,select,label,summary,[role=button],.mw-layer")) jump(0.9);
    };
    const onDbl = ev => {
      const t = ev.target instanceof Element ? ev.target : null;
      if (t && t.closest(".hero-photo, .hero-character")) spawnStar(ev.clientX - 20, Math.max(80, rect.h - ev.clientY));
    };
    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let kIdx = 0;
    const typing = t => t instanceof Element && t.closest("input,textarea,select,[contenteditable=''],[contenteditable=true]");
    const onKeyDown = ev => {
      if (typing(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
      kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
      if (kIdx === KONAMI.length) { kIdx = 0; startStar(12); }
      if (!controls) return;
      if (k === "Escape") { setControls(false); return; }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "a", "d", "w", "s"].includes(k)) {
        ev.preventDefault(); keys.add(k);
        if (k === " " || k === "ArrowUp" || k === "w") jump();
      }
    };
    const onKeyUp = ev => { keys.delete(ev.key.length === 1 ? ev.key.toLowerCase() : ev.key); };
    function setControls(on) {
      controls = on; keys.clear();
      ctl.setAttribute("aria-pressed", String(on));
      ctl.textContent = on ? "■ CONTROL ON" : "▶ CONTROL";
      layer.classList.toggle("mw-driving", on);
    }
    setControls(false);
    ctl.addEventListener("click", () => setControls(!controls));
    document.addEventListener("click", onClick);
    document.addEventListener("dblclick", onDbl);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    const onResize = () => { rect.w = innerWidth; rect.h = innerHeight; };
    addEventListener("resize", onResize);

    // --- main loop -----------------------------------------------------------
    let last = performance.now(), nextCoin = 1.5, nextCritter = 5, raf = 0, clock = 0, destroyed = false;
    const nearBottom = () => scrollY + innerHeight >= document.documentElement.scrollHeight - 10 && document.documentElement.scrollHeight > innerHeight + 60;

    function autopilot(dt) {
      const L = -10, R = rect.w + 10;
      if (ap.rest > 0) { ap.rest -= dt; P.vx = 0; return; }
      if (Math.random() < 0.0016 && P.ground) { ap.rest = 0.8 + Math.random() * 1.6; return; }
      let speed = 150;
      const goFlag = flagState === 0 && nearBottom();
      if (goFlag) { ap.dir = flagX() - 34 > P.x ? 1 : -1; speed = 240; }
      else if (P.x > R - 40 && ap.dir > 0 && Math.random() < 0.02) ap.dir = -1;
      for (const c of critters) {
        if (c.dead) continue;
        const ahead = (c.x - P.x) * ap.dir;
        if (ahead > 10 && ahead < 120 && P.ground) jump(1);
      }
      if (P.ground) for (const c of coins) { const a = (c.x - (P.x + ap.dir * 46)) * ap.dir; if (Math.abs(a) < 24 && c.y > 56) { jump(1); break; } }
      P.vx = ap.dir * speed;
    }

    function frame(now) {
      if (destroyed) return;
      if (!isOn()) { destroy(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
      rect.w = innerWidth; rect.h = innerHeight;
      if (root.classList.contains("mw-game-on")) { // the full-screen game owns the page: only keep the HUD fresh
        timeLeft -= dt * 0.9; if (timeLeft <= 0) timeLeft = 400;
        renderHud(); raf = requestAnimationFrame(frame); return;
      }

      // timers
      P.hurt = Math.max(0, P.hurt - dt); P.star = Math.max(0, P.star - dt); P.big = Math.max(0, P.big - dt);
      if (P.hold > 0) P.hold -= dt;
      timeLeft -= dt * 0.9; if (timeLeft <= 0) timeLeft = 400;

      // input
      const right = keys.has("ArrowRight") || keys.has("d"), left = keys.has("ArrowLeft") || keys.has("a");
      if (P.hold > 0) P.vx = 0;
      else if (controls) { P.vx = ((right ? 1 : 0) - (left ? 1 : 0)) * (ev_shift ? 300 : 210); if (P.vx) ap.dir = Math.sign(P.vx); }
      else if (!reduce) autopilot(dt);
      else P.vx = 0;
      if (P.vx) P.dir = Math.sign(P.vx);
      if (P.star > 0) P.vx *= 1.4;

      // physics (pipes at both edges hide the wrap-around seam)
      P.x += P.vx * dt;
      if (P.x > rect.w + 8) P.x = -pw() - 4;
      if (P.x < -pw() - 8) P.x = rect.w + 4;
      if (!P.ground || P.vy > 0) {
        P.vy -= GRAVITY * dt; P.y += P.vy * dt;
        if (P.y <= 0) { P.y = 0; P.vy = 0; P.ground = true; }
      }
      if (controls && P.vy > 280 && !(keys.has(" ") || keys.has("ArrowUp") || keys.has("w"))) P.vy *= 0.86; // variable jump height
      P.anim += dt * (Math.abs(P.vx) > 20 ? 9 : 0);

      // spawners (not under reduced motion)
      if (!reduce) {
        nextCoin -= dt; if (nextCoin <= 0) { spawnCoinRow(); nextCoin = 6 + Math.random() * 5; }
        nextCritter -= dt; if (nextCritter <= 0) { spawnCritter(); nextCritter = 8 + Math.random() * 6; }
      }

      // coins
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]; c.age += dt;
        if (hit(P.x + 3, P.y, pw(), ph(), c.x, c.y, 20, 26)) {
          addCoin(c.x, c.y + 20); pop("+1", c.x, c.y + 30, "mw-pop-coin"); c.el.remove(); coins.splice(i, 1);
        } else if (c.age > 40) { c.el.remove(); coins.splice(i, 1); }
      }

      // critters
      for (let i = critters.length - 1; i >= 0; i--) {
        const c = critters[i]; c.t += dt;
        if (c.dead) {
          c.dead -= dt;
          if (c.flung) { c.x += c.vx * dt; c.fy += c.fvy * dt; c.fvy -= GRAVITY * dt; if (c.fy < -140) c.dead = 0; }
          if (c.dead <= 0) { c.el.remove(); critters.splice(i, 1); }
          continue;
        }
        c.x += c.vx * dt;
        if (c.x < -60 || c.x > rect.w + 60) { c.el.remove(); critters.splice(i, 1); continue; }
        if (hit(P.x + 3, P.y, pw(), ph(), c.x + 4, 0, c.w, c.h) && P.hold <= 0) {
          if (P.star > 0) { c.dead = 3; c.flung = true; c.fy = 0; c.fvy = 520; c.vx = P.dir * 260; addScore(200, c.x, 40); }
          else if (P.vy < 0 && P.y > c.h * 0.45) { c.dead = 0.55; P.vy = 460; P.ground = false; addScore(100, c.x, 40); }
          else if (P.hurt <= 0) {
            P.hurt = 1.6; P.vy = 380; P.ground = false; P.vx = -P.dir * 160;
            if (P.big > 0) { P.big = 0; pop("ouch", P.x, ph() + 6); } else pop("oops", P.x, ph() + 6);
          }
        }
      }

      // stars
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i]; s.age += dt; s.vy -= GRAVITY * 0.55 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y <= 0) { s.y = 0; s.vy = 430; }
        if (s.x < 0 || s.x > rect.w - 30) s.vx *= -1;
        if (hit(P.x + 3, P.y, pw(), ph(), s.x, s.y, 30, 30)) { startStar(12); s.el.remove(); stars.splice(i, 1); }
        else if (s.age > 14) { s.el.remove(); stars.splice(i, 1); }
      }

      // goal flag at the bottom of the page
      const fx = flagX(), atEnd = nearBottom();
      flag.style.left = fx + "px"; flag.classList.toggle("mw-flag-on", atEnd);
      if (!atEnd && flagState === 2 && scrollY + innerHeight < document.documentElement.scrollHeight - 300) { flagState = 0; flagCloth.style.transform = ""; }
      if (atEnd && flagState === 0 && P.x + pw() / 2 >= fx - 8 && P.x <= fx + 30) {
        flagState = 1; P.hold = 1.6; P.vy = 0; P.y = 0;
        flagCloth.style.transition = reduce ? "none" : "transform 1.2s ease-in"; flagCloth.style.transform = "translateY(150px)";
        addScore(5000, fx, 150); fireworks();
        setTimeout(() => { flagState = 2; }, 1700);
      }

      render();
      raf = requestAnimationFrame(frame);
    }
    let ev_shift = false;
    addEventListener("keydown", e => { if (e.key === "Shift") ev_shift = true; });
    addEventListener("keyup", e => { if (e.key === "Shift") ev_shift = false; });

    function render() {
      // player
      let img = PLAYER.stand;
      if (!P.ground) img = PLAYER.jump; else if (P.hold > 0) img = PLAYER.jump; else if (Math.abs(P.vx) > 20) img = Math.floor(P.anim) % 2 ? PLAYER.run1 : PLAYER.run2;
      pSprite.style.backgroundImage = img;
      const sc = P.big ? 1.45 : 1;
      pEl.style.transform = `translate3d(${P.x}px,${-P.y}px,0)`;
      pSprite.style.transform = `scale(${P.dir * sc},${sc})`;
      pEl.style.opacity = P.hurt > 0 && Math.floor(clock * 14) % 2 ? "0.35" : "1";
      pSprite.style.filter = P.star > 0 ? `hue-rotate(${(clock * 720) % 360}deg) saturate(2.4) brightness(1.15)` : "";
      // critters
      for (const c of critters) {
        c.el.style.backgroundImage = c.dead && !c.flung ? CRITTER.squish : (Math.floor(c.t * 5) % 2 ? CRITTER.a : CRITTER.b);
        c.el.classList.toggle("mw-squished", !!c.dead && !c.flung);
        c.el.style.transform = `translate3d(${c.x}px,${c.flung ? -c.fy : 0}px,0) scaleY(${c.flung ? -1 : 1})`;
      }
      for (const c of coins) c.el.style.setProperty("--age", c.age.toFixed(2));
      for (const s of stars) s.el.style.transform = `translate3d(${s.x}px,${-s.y}px,0)`;
      // hud
      renderHud();
    }
    function renderHud() {
      setText("score", pad(save.score, 6)); setText("coins", pad(save.coins, 2)); setText("lives", String(save.lives)); setText("time", pad(timeLeft, 3));
    }

    function destroy() {
      destroyed = true; cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick); document.removeEventListener("dblclick", onDbl);
      document.removeEventListener("keydown", onKeyDown); document.removeEventListener("keyup", onKeyUp);
      removeEventListener("resize", onResize);
      layer.remove(); hud.remove(); root.classList.remove("mw-active"); window.__marioWorld = null;
    }

    // idle sprite visible immediately; rAF is skipped while the tab is hidden
    P.x = Math.min(120, rect.w / 3);
    render(); raf = requestAnimationFrame(frame);
    return { destroy };
  }

  function boot() { if (isOn() && !window.__marioWorld) window.__marioWorld = start(); }
  // Wait until after hydration so React never sees these extra nodes mid-hydration.
  if (document.readyState === "complete") setTimeout(boot, 500);
  else addEventListener("load", () => setTimeout(boot, 500));
})();
