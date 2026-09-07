/* ================================================================
   🎁 BIRTHDAY ADVENTURE — script.js
   Sections: CONFIGURATION · STATE · STORAGE · UTILITIES · AUDIO ·
   PARTICLES & FX · BACKGROUND · SCREEN MANAGEMENT · OPENING · MAP ·
   LEVEL 1 MEMORY · LEVEL 2 CATCH · LEVEL 3 SCRAMBLE · LEVEL 4 WORD
   SEARCH · SECRET DIGIT MODAL · MYSTERY GIFT · FINAL REVEAL ·
   SURPRISE · UI GLUE · INITIALIZATION
================================================================ */
"use strict";

/* ================================================================
   CONFIGURATION — ✏️ change every personal value right here
================================================================ */
const birthdayConfig = {
  photo: "assets/birthday-photo.jpg",     // photo on the final screen
  music: "assets/birthday-music.mp3",     // background music (optional)
  finalCode: "7429",                      // digit per level = 7 · 4 · 2 · 9

  sounds: {
    click:   "assets/click.mp3",
    success: "assets/success.mp3",
    wrong:   "assets/wrong.mp3",
    gift:    "assets/gift.mp3",
  },

  catchGoal: 8,
  scrambleWord: "BIRTHDAY",
  scrambledWord: "YADHTRIB",
  scrambleHint: "It's the one day of the year that is entirely about you 🎂",
  wordSearchWords: ["HAPPY", "BIRTHDAY", "TO", "YOU"],

  finalTitle: "Happy Birthday! ❤️",
  finalMessage: [
    "Today isn't just another day. It's a reminder of how special you are.",
    "May this year bring you beautiful memories, unexpected adventures, endless happiness, and everything your heart wishes for.",
    "Keep smiling. Keep shining. And never stop being amazing. ❤️",
  ],
  finalSignoff: "Happy Birthday once again! 🎂✨",
  hiddenMessage: "You are loved. You are cherished. You matter. ✨",
  photoAlt: "A cherished photo of someone truly special",
};

/* ================================================================
   STATE
================================================================ */
const state = {
  completed: [false, false, false, false],
  screen: "screen-opening",
  openingDone: false,
  musicOn: false,
  musicStarted: false,
  musicAvailable: true,
};
const prefersReducedMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const LEVELS = [
  { num: "01", name: "Memory",      icon: "🎴" },
  { num: "02", name: "Catch",       icon: "⭐" },
  { num: "03", name: "Puzzle",      icon: "🧩" },
  { num: "04", name: "Word Search", icon: "🔎" },
];
const GIFT_NODE = { num: "05", name: "Mystery Gift", icon: "🎁" };
const LEVEL_SCREENS = ["screen-level1", "screen-level2", "screen-level3", "screen-level4"];

/* ================================================================
   STORAGE (defensive — never crashes if unavailable)
================================================================ */
const STORAGE_KEY = "birthday-adventure-progress-v1";
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: state.completed })); } catch (e) {}
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.completed) && data.completed.length === 4) {
      state.completed = data.completed.map(Boolean);
    }
  } catch (e) {}
}
function clearProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

/* ================================================================
   UTILITIES
================================================================ */
const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function debounce(fn, ms) {
  let t = null;
  return function () { clearTimeout(t); t = setTimeout(fn, ms); };
}
function completedCount() { return state.completed.filter(Boolean).length; }
function unlockedIndex() {
  for (let i = 0; i < 4; i++) if (!state.completed[i]) return i;
  return 4; // everything done → gift unlocked
}

/* ================================================================
   AUDIO — music + sound effects (missing files fail silently)
================================================================ */
let musicEl = null;
const sfxCache = {};

function ensureMusic() {
  if (musicEl) return musicEl;
  try {
    musicEl = new Audio(birthdayConfig.music);
    musicEl.loop = true;
    musicEl.volume = 0;
    musicEl.preload = "auto";
    musicEl.addEventListener("error", function () {
      state.musicAvailable = false;
      renderMusicButton();
    });
  } catch (e) { state.musicAvailable = false; }
  return musicEl;
}
function fadeVolume(el, target, dur) {
  if (!el) return;
  if (el._fadeTimer) clearInterval(el._fadeTimer);
  const start = el.volume, diff = target - start;
  const steps = Math.max(1, Math.round(dur / 90));
  let i = 0;
  el._fadeTimer = setInterval(function () {
    i++;
    el.volume = Math.min(1, Math.max(0, start + diff * (i / steps)));
    if (i >= steps) { clearInterval(el._fadeTimer); el._fadeTimer = null; }
  }, 90);
}
function startMusic() {
  if (!state.musicAvailable || state.musicStarted) return;
  const el = ensureMusic();
  if (!el) return;
  state.musicStarted = true;
  const p = el.play();
  if (p && p.then) {
    p.then(function () {
      state.musicOn = true;
      fadeVolume(el, 0.45, 1600);
      renderMusicButton();
    }).catch(function () {});
  }
}
function toggleMusic() {
  if (!state.musicAvailable) { showToast("Add birthday-music.mp3 to enable music 🎵"); return; }
  const el = ensureMusic();
  if (!el) return;
  if (state.musicOn) {
    state.musicOn = false;
    fadeVolume(el, 0, 450);
    setTimeout(function () { if (!state.musicOn) { try { el.pause(); } catch (e) {} } }, 520);
  } else {
    const p = el.play();
    if (p && p.then) {
      p.then(function () { state.musicOn = true; fadeVolume(el, 0.45, 700); renderMusicButton(); })
       .catch(function () {});
    }
  }
  renderMusicButton();
}
function renderMusicButton() {
  const b = $("#btn-music");
  if (!b) return;
  b.textContent = state.musicOn ? "🔊" : "🔇";
  b.setAttribute("aria-pressed", String(state.musicOn));
  b.classList.toggle("unavailable", !state.musicAvailable);
}
function playSfx(name) {
  try {
    const src = birthdayConfig.sounds[name];
    if (!src) return;
    let a = sfxCache[name];
    if (!a) {
      a = new Audio(src);
      a.volume = 0.75;
      a.addEventListener("error", function () { a._broken = true; });
      sfxCache[name] = a;
    }
    if (a._broken) return;
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(function () {});
  } catch (e) {}
}

/* ================================================================
   PARTICLES & FX (burst / confetti — capped for performance)
================================================================ */
let fxCount = 0;
function trackFx(el, ms) {
  fxCount++;
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); fxCount = Math.max(0, fxCount - 1); }, ms);
}
function burst(x, y, opts) {
  opts = opts || {};
  const layer = $("#fx-layer");
  if (!layer) return;
  let count = opts.count != null ? opts.count : 16;
  const colors = opts.colors || ["#ffd166", "#ff7d9c", "#a99cf5", "#fff6e0"];
  const power = opts.power || 90;
  if (prefersReducedMotion) count = Math.min(5, count);
  for (let i = 0; i < count && fxCount < 140; i++) {
    const p = document.createElement("span");
    p.className = "fx-p";
    const ang = Math.random() * Math.PI * 2;
    const dist = power * (0.4 + Math.random() * 0.9);
    const s = 4 + Math.random() * 6;
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.width = s + "px";
    p.style.height = s + "px";
    p.style.setProperty("--dx", (Math.cos(ang) * dist) + "px");
    p.style.setProperty("--dy", (Math.sin(ang) * dist - 22) + "px");
    p.style.setProperty("--clr", colors[i % colors.length]);
    layer.appendChild(p);
    trackFx(p, 900);
  }
}
function burstFromElement(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}
function confetti(count) {
  const layer = $("#fx-layer");
  if (!layer) return;
  if (prefersReducedMotion) count = 8;
  count = count || 50;
  const colors = ["#ffd166", "#ff7d9c", "#a99cf5", "#7fe3c1", "#fff6e0", "#ff9d5c"];
  for (let i = 0; i < count && fxCount < 140; i++) {
    const c = document.createElement("span");
    c.className = "fx-c";
    const w = 6 + Math.random() * 5;
    c.style.left = (Math.random() * 100) + "%";
    c.style.width = w + "px";
    c.style.height = (w * (1 + Math.random())) + "px";
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    if (Math.random() < 0.3) c.style.borderRadius = "50%";
    c.style.setProperty("--dur", (2 + Math.random() * 1.4) + "s");
    c.style.setProperty("--delay", (Math.random() * 0.5) + "s");
    c.style.setProperty("--sway", ((Math.random() - 0.5) * 140) + "px");
    c.style.setProperty("--rot", ((Math.random() - 0.5) * 900) + "deg");
    layer.appendChild(c);
    trackFx(c, 4200);
  }
}

/* ================================================================
   BACKGROUND — canvas stars, dust, orbs, shooting stars, parallax
================================================================ */
const bg = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
  stars: [], dust: [], orbs: [], shooting: [],
  raf: null, lastShoot: 0, px: 0, py: 0, tx: 0, ty: 0,
};
function initBackground() {
  bg.canvas = $("#bg-canvas");
  if (!bg.canvas || !bg.canvas.getContext) return;
  bg.ctx = bg.canvas.getContext("2d");
  resizeBackground();
  window.addEventListener("resize", function () {
    resizeBackground();
    if (prefersReducedMotion) drawBackground(0);
  });
  window.addEventListener("pointermove", function (e) {
    bg.tx = e.clientX / Math.max(1, bg.w) - 0.5;
    bg.ty = e.clientY / Math.max(1, bg.h) - 0.5;
  }, { passive: true });
  if (prefersReducedMotion) { drawBackground(0); return; }
  bg.raf = requestAnimationFrame(tickBackground);
}
function resizeBackground() {
  bg.dpr = Math.min(2, window.devicePixelRatio || 1);
  bg.w = window.innerWidth;
  bg.h = window.innerHeight;
  bg.canvas.width = bg.w * bg.dpr;
  bg.canvas.height = bg.h * bg.dpr;
  bg.canvas.style.width = bg.w + "px";
  bg.canvas.style.height = bg.h + "px";
  bg.ctx.setTransform(bg.dpr, 0, 0, bg.dpr, 0, 0);
  seedBackground();
}
function seedBackground() {
  const starCount = Math.min(150, Math.round((bg.w * bg.h) / 9000));
  bg.stars = [];
  for (let i = 0; i < starCount; i++) {
    bg.stars.push({
      x: Math.random() * bg.w, y: Math.random() * bg.h,
      r: 0.3 + Math.random() * 1.4, tw: Math.random() * Math.PI * 2,
      sp: 0.5 + Math.random() * 1.3, depth: 0.3 + Math.random() * 0.7,
      warm: Math.random() < 0.18,
    });
  }
  bg.dust = [];
  for (let i = 0; i < 22; i++) {
    bg.dust.push({
      x: Math.random() * bg.w, y: Math.random() * bg.h,
      r: 1 + Math.random() * 2.2, vy: -(0.06 + Math.random() * 0.22),
      vx: (Math.random() - 0.5) * 0.12, a: 0.14 + Math.random() * 0.32,
      tw: Math.random() * Math.PI * 2,
    });
  }
  const base = Math.max(140, bg.w * 0.26);
  bg.orbs = [
    { x: bg.w * 0.16, y: bg.h * 0.20, r: base,        clr: "255,125,156", a: 0.11 },
    { x: bg.w * 0.86, y: bg.h * 0.34, r: base * 0.9,  clr: "169,156,245", a: 0.10 },
    { x: bg.w * 0.50, y: bg.h * 0.88, r: base * 1.15, clr: "246,183,60",  a: 0.09 },
    { x: bg.w * 0.10, y: bg.h * 0.72, r: base * 0.7,  clr: "127,227,193", a: 0.06 },
  ];
  bg.shooting = [];
}
function tickBackground(t) {
  if (!document.hidden) drawBackground(t);
  bg.raf = requestAnimationFrame(tickBackground);
}
function drawBackground(t) {
  const c = bg.ctx;
  if (!c) return;
  c.clearRect(0, 0, bg.w, bg.h);
  bg.px += (bg.tx - bg.px) * 0.03;
  bg.py += (bg.ty - bg.py) * 0.03;

  // glowing orbs (parallax layer, deepest)
  for (let i = 0; i < bg.orbs.length; i++) {
    const o = bg.orbs[i];
    const drift = Math.sin(t * 0.00012 + i * 2.1) * 22 + bg.px * 26;
    const oy = o.y + Math.cos(t * 0.0001 + i) * 16 + bg.py * 20;
    const g = c.createRadialGradient(o.x + drift, oy, 0, o.x + drift, oy, o.r);
    g.addColorStop(0, "rgba(" + o.clr + "," + o.a + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(o.x + drift - o.r, oy - o.r, o.r * 2, o.r * 2);
  }

  // twinkling stars
  for (let i = 0; i < bg.stars.length; i++) {
    const s = bg.stars[i];
    const tw = 0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.tw);
    c.globalAlpha = 0.25 + tw * 0.65;
    c.fillStyle = s.warm ? "#ffe9c4" : "#eef1ff";
    c.beginPath();
    c.arc(s.x + bg.px * 16 * s.depth, s.y + bg.py * 12 * s.depth, s.r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // rising golden dust
  for (let i = 0; i < bg.dust.length; i++) {
    const d = bg.dust[i];
    d.y += d.vy; d.x += d.vx;
    if (d.y < -12) { d.y = bg.h + 12; d.x = Math.random() * bg.w; }
    c.globalAlpha = d.a * (0.6 + 0.4 * Math.sin(t * 0.002 + d.tw));
    c.fillStyle = "#ffe3a3";
    c.beginPath();
    c.arc(d.x + bg.px * 30, d.y + bg.py * 22, d.r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // occasional shooting stars
  if (!prefersReducedMotion) {
    if (t - bg.lastShoot > 4200 + Math.random() * 4000) {
      bg.lastShoot = t;
      const fromLeft = Math.random() < 0.5;
      bg.shooting.push({
        x: fromLeft ? -30 : bg.w * (0.4 + Math.random() * 0.6),
        y: bg.h * (0.05 + Math.random() * 0.25),
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 3),
        vy: 2.2 + Math.random() * 1.4, life: 0, max: 46,
      });
    }
    for (let i = bg.shooting.length - 1; i >= 0; i--) {
      const s = bg.shooting[i];
      s.x += s.vx; s.y += s.vy; s.life++;
      const alpha = Math.sin(Math.PI * (s.life / s.max));
      const tail = 9;
      const grad = c.createLinearGradient(s.x, s.y, s.x - s.vx * tail, s.y - s.vy * tail);
      grad.addColorStop(0, "rgba(255,246,224," + Math.max(0, alpha).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(255,246,224,0)");
      c.strokeStyle = grad;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(s.x, s.y);
      c.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
      c.stroke();
      if (s.life >= s.max || s.x < -60 || s.x > bg.w + 60 || s.y > bg.h + 60) bg.shooting.splice(i, 1);
    }
  }
}

/* ================================================================
   SCREEN MANAGEMENT
================================================================ */
const screenCleanups = {};
function showScreen(id) {
  if (state.screen === id) return;
  const prev = document.getElementById(state.screen);
  const next = document.getElementById(id);
  if (!next) return;
  const clean = screenCleanups[state.screen];
  if (typeof clean === "function") { try { clean(); } catch (e) {} }
  if (prev) prev.classList.remove("active");
  next.classList.add("active");
  state.screen = id;
  const scroller = next.querySelector(".screen-scroll");
  if (scroller) scroller.scrollTop = 0;
}

/* ================================================================
   OPENING SEQUENCE
================================================================ */
let openingTimers = [];
let journeyStarted = false;
function clearOpeningTimers() {
  openingTimers.forEach(clearTimeout);
  openingTimers = [];
}
function runOpeningSequence() {
  state.openingDone = false;
  const els = ["opening-light", "opening-text-1", "opening-text-2", "opening-heart", "btn-begin"];
  els.forEach(function (id) { const el = document.getElementById(id); if (el) el.classList.remove("visible"); });
  clearOpeningTimers();

  if (prefersReducedMotion) {
    ["opening-light", "opening-text-2", "opening-heart", "btn-begin"].forEach(function (id) {
      const el = document.getElementById(id); if (el) el.classList.add("visible");
    });
    state.openingDone = true;
    return;
  }
  function at(ms, fn) { openingTimers.push(setTimeout(fn, ms)); }
  at(1000, function () { const el = $("#opening-light"); if (el) el.classList.add("visible"); });
  at(1500, function () { const el = $("#opening-text-1"); if (el) el.classList.add("visible"); });
  at(2800, function () { const el = $("#opening-text-1"); if (el) el.classList.remove("visible"); });
  at(3200, function () { const el = $("#opening-text-2"); if (el) el.classList.add("visible"); });
  at(4200, function () { const el = $("#opening-heart"); if (el) el.classList.add("visible"); });
  at(4800, function () { const el = $("#btn-begin"); if (el) el.classList.add("visible"); state.openingDone = true; });
}
function skipOpening() {
  if (state.openingDone) return;
  clearOpeningTimers();
  const t1 = $("#opening-text-1"); if (t1) t1.classList.remove("visible");
  ["opening-light", "opening-text-2", "opening-heart", "btn-begin"].forEach(function (id) {
    const el = document.getElementById(id); if (el) el.classList.add("visible");
  });
  state.openingDone = true;
}
function beginAdventure() {
  if (journeyStarted) return;
  journeyStarted = true;
  playSfx("click");
  vibrate(15);
  startMusic(); // first user gesture → safe to start music
  showScreen("screen-map");
  renderMap();
  if (completedCount() > 0) showToast("Welcome back — your journey continues ✨");
}

/* ================================================================
   ADVENTURE MAP
================================================================ */
function renderMap() {
  const list = $("#map-nodes");
  if (!list) return;
  const cur = unlockedIndex();
  list.innerHTML = "";
  const nodes = LEVELS.map(function (l, i) { return { num: l.num, name: l.name, icon: l.icon, type: "level", index: i }; });
  nodes.push({ num: GIFT_NODE.num, name: GIFT_NODE.name, icon: GIFT_NODE.icon, type: "gift", index: 4 });

  nodes.forEach(function (n, idx) {
    let status;
    if (n.type === "level") {
      status = state.completed[n.index] ? "done" : (n.index === cur ? "current" : "locked");
    } else {
      status = cur === 4 ? "current" : "locked";
    }
    const li = document.createElement("li");
    li.className = "map-node " + status;
    li.style.animationDelay = (idx * 90) + "ms";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "node-btn";
    btn.setAttribute("aria-label",
      n.num + " " + n.name + " — " + (status === "locked" ? "locked" : status === "done" ? "completed" : "play"));
    const icon = document.createElement("span");
    icon.className = "node-icon"; icon.setAttribute("aria-hidden", "true"); icon.textContent = n.icon;
    const badge = document.createElement("span");
    badge.className = "node-state"; badge.setAttribute("aria-hidden", "true");
    badge.textContent = status === "done" ? "✓" : status === "current" ? "▶" : "🔒";
    btn.appendChild(icon); btn.appendChild(badge);
    btn.addEventListener("click", function () { onNodeTap(n, status); });

    const label = document.createElement("div");
    label.className = "node-label";
    const num = document.createElement("span"); num.className = "node-num"; num.textContent = n.num;
    const name = document.createElement("span"); name.className = "node-name"; name.textContent = n.name;
    label.appendChild(num); label.appendChild(name);

    li.appendChild(btn); li.appendChild(label);
    list.appendChild(li);
  });

  const pt = $("#map-progress-text");
  if (pt) pt.textContent = completedCount() + " / 4 COMPLETE";
  const fill = $("#map-progress-fill");
  if (fill) fill.style.width = (completedCount() / 4 * 100) + "%";

  requestAnimationFrame(function () { drawMapPath(); scrollToCurrentNode(); });
}
function drawMapPath() {
  const wrap = $("#map-path-wrap"), svg = $("#map-path-svg");
  const path = $("#map-path"), glow = $("#map-path-glow");
  if (!wrap || !svg || !path || !glow) return;
  const btns = $$(".node-btn", wrap);
  if (btns.length < 2) return;
  const wr = wrap.getBoundingClientRect();
  if (wr.width < 10) return;
  const pts = btns.map(function (b) {
    const r = b.getBoundingClientRect();
    return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 };
  });
  let d = "M " + pts[0].x + " " + pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2;
    d += " C " + a.x + " " + my + ", " + b.x + " " + my + ", " + b.x + " " + b.y;
  }
  svg.setAttribute("viewBox", "0 0 " + wr.width + " " + wr.height);
  path.setAttribute("d", d);
  glow.setAttribute("d", d);
}
function scrollToCurrentNode() {
  const node = $(".map-node.current");
  if (!node || typeof node.scrollIntoView !== "function") return;
  try { node.scrollIntoView({ block: "center", behavior: prefersReducedMotion ? "auto" : "smooth" }); } catch (e) {}
}
function onNodeTap(node, status) {
  playSfx("click");
  if (status === "locked") {
    vibrate(30);
    showToast(node.type === "gift"
      ? "Finish all four adventures to unlock the gift 🎁"
      : "Complete the previous adventure first 🔒");
    return;
  }
  if (node.type === "gift") { showScreen("screen-gift"); initGiftScreen(); return; }
  if (status === "done") showToast("Already completed ✓ — replaying for fun ✨");
  openLevel(node.index);
}
function openLevel(i) {
  showScreen(LEVEL_SCREENS[i]);
  if (i === 0) initMemoryGame();
  if (i === 1) initCatchGame();
  if (i === 2) initScramble();
  if (i === 3) initWordSearch();
}

/* ================================================================
   LEVEL 1 — MEMORY MATCH
================================================================ */
const memory = { first: null, lock: false, matched: 0 };
function initMemoryGame() {
  memory.first = null; memory.lock = false; memory.matched = 0;
  const grid = $("#memory-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const emojis = shuffle(["🎂", "🎈", "🎁", "🎂", "🎈", "🎁"]);
  emojis.forEach(function (e, i) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mem-card";
    b.dataset.emoji = e;
    b.setAttribute("aria-label", "Hidden card");
    b.style.animationDelay = (i * 70) + "ms";
    const inner = document.createElement("span"); inner.className = "mem-inner";
    const back = document.createElement("span"); back.className = "mem-face mem-back"; back.setAttribute("aria-hidden", "true"); back.textContent = "✦";
    const front = document.createElement("span"); front.className = "mem-face mem-front"; front.setAttribute("aria-hidden", "true"); front.textContent = e;
    inner.appendChild(back); inner.appendChild(front);
    b.appendChild(inner);
    b.addEventListener("click", function () { onMemoryCard(b); });
    grid.appendChild(b);
  });
}
function onMemoryCard(card) {
  if (memory.lock) return;
  if (card.classList.contains("flipped") || card.classList.contains("matched")) return;
  playSfx("click");
  card.classList.add("flipped");
  if (!memory.first) { memory.first = card; return; }
  memory.lock = true;
  const a = memory.first, b = card;
  memory.first = null;
  if (a.dataset.emoji === b.dataset.emoji) {
    setTimeout(function () {
      a.classList.add("matched"); b.classList.add("matched");
      memory.lock = false; memory.matched++;
      playSfx("success"); vibrate(20);
      burstFromElement(a, { count: 12, power: 62 });
      burstFromElement(b, { count: 12, power: 62 });
      if (memory.matched === 3) setTimeout(function () { completeLevel(0); }, 700);
    }, 430);
  } else {
    setTimeout(function () { a.classList.add("shake"); b.classList.add("shake"); }, 330);
    setTimeout(function () {
      a.classList.remove("flipped", "shake");
      b.classList.remove("flipped", "shake");
      memory.lock = false;
      playSfx("wrong");
    }, 920);
  }
}

/* ================================================================
   LEVEL 2 — CATCH THE STARS
================================================================ */
const catchGame = { running: false, raf: null, spawnTimer: null, score: 0, items: [], last: 0 };
function initCatchGame() {
  stopCatchGame();
  const area = $("#catch-area");
  if (!area) return;
  area.innerHTML = "";
  catchGame.running = true;
  catchGame.score = 0;
  catchGame.items = [];
  catchGame.last = performance.now();
  updateCatchHud();
  spawnCatchItem();
  catchGame.spawnTimer = setInterval(spawnCatchItem, 620);
  catchGame.raf = requestAnimationFrame(stepCatch);
}
function spawnCatchItem() {
  if (!catchGame.running || document.hidden) return;
  if (catchGame.items.length > 14) return;
  const area = $("#catch-area");
  if (!area || area.clientWidth < 40) return;
  const goodPool = ["⭐", "🎂", "❤️", "🎁"], badPool = ["💀", "🧨"];
  const isBad = Math.random() < 0.22;
  const pool = isBad ? badPool : goodPool;
  const el = document.createElement("div");
  el.className = "catch-item" + (isBad ? " bad" : "");
  el.textContent = pool[Math.floor(Math.random() * pool.length)];
  el.dataset.good = isBad ? "0" : "1";
  el.style.left = (6 + Math.random() * Math.max(10, area.clientWidth - 58)) + "px";
  const item = {
    el: el, y: -54, dead: false,
    speed: 95 + Math.random() * 135,
    sway: (12 + Math.random() * 28) * (Math.random() < 0.5 ? -1 : 1),
    phase: Math.random() * Math.PI * 2,
  };
  el.addEventListener("pointerdown", function (ev) { ev.preventDefault(); catchTap(item); });
  area.appendChild(el);
  catchGame.items.push(item);
}
function stepCatch(t) {
  if (!catchGame.running) return;
  const dt = Math.min(48, t - catchGame.last) / 1000;
  catchGame.last = t;
  const area = $("#catch-area");
  const H = area ? area.clientHeight : 420;
  for (let i = 0; i < catchGame.items.length; i++) {
    const it = catchGame.items[i];
    if (it.dead) continue;
    it.y += it.speed * dt;
    const xoff = Math.sin(t * 0.002 + it.phase) * it.sway * 0.3;
    it.el.style.transform = "translate3d(" + xoff + "px," + it.y + "px,0)";
    if (it.y > H + 60) { it.dead = true; if (it.el.parentNode) it.el.parentNode.removeChild(it.el); }
  }
  catchGame.items = catchGame.items.filter(function (i) { return !i.dead; });
  catchGame.raf = requestAnimationFrame(stepCatch);
}
function catchTap(item) {
  if (!catchGame.running || item.dead) return;
  item.dead = true;
  const r = item.el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (item.dataset.good === "1") {
    catchGame.score++;
    item.el.classList.add("popped");
    setTimeout(function () { if (item.el.parentNode) item.el.parentNode.removeChild(item.el); }, 370);
    burst(cx, cy, { count: 10, power: 58, colors: ["#ffd166", "#fff6e0", "#ff7d9c"] });
    playSfx("click"); vibrate(12);
    updateCatchHud();
    const goal = birthdayConfig.catchGoal || 8;
    if (catchGame.score >= goal) {
      catchGame.running = false;
      if (catchGame.spawnTimer) { clearInterval(catchGame.spawnTimer); catchGame.spawnTimer = null; }
      if (catchGame.raf) { cancelAnimationFrame(catchGame.raf); catchGame.raf = null; }
      playSfx("success"); vibrate([20, 40, 20]);
      setTimeout(function () { completeLevel(1); }, 650);
    }
  } else {
    item.el.classList.add("popped-bad");
    setTimeout(function () { if (item.el.parentNode) item.el.parentNode.removeChild(item.el); }, 330);
    burst(cx, cy, { count: 8, power: 50, colors: ["#ff5d5d", "#8a8fae"] });
    playSfx("wrong"); vibrate([40, 40, 40]);
    const area = $("#catch-area");
    if (area) { area.classList.remove("shake"); void area.offsetWidth; area.classList.add("shake"); }
  }
}
function updateCatchHud() {
  const goal = birthdayConfig.catchGoal || 8;
  const s = $("#catch-score"); if (s) s.textContent = catchGame.score;
  const p = $("#catch-progress"); if (p) p.style.width = Math.min(100, catchGame.score / goal * 100) + "%";
}
function stopCatchGame() {
  catchGame.running = false;
  if (catchGame.spawnTimer) { clearInterval(catchGame.spawnTimer); catchGame.spawnTimer = null; }
  if (catchGame.raf) { cancelAnimationFrame(catchGame.raf); catchGame.raf = null; }
  catchGame.items.forEach(function (i) { try { if (i.el.parentNode) i.el.parentNode.removeChild(i.el); } catch (e) {} });
  catchGame.items = [];
}
screenCleanups["screen-level2"] = stopCatchGame;

/* ================================================================
   LEVEL 3 — WORD SCRAMBLE
================================================================ */
const scramble = { attempts: 3, done: false };
function initScramble() {
  scramble.attempts = 3; scramble.done = false;
  const tiles = $("#scramble-tiles");
  if (!tiles) return;
  tiles.innerHTML = "";
  const letters = (birthdayConfig.scrambledWord || "YADHTRIB").split("");
  letters.forEach(function (ch, i) {
    const s = document.createElement("span");
    s.className = "s-tile";
    s.textContent = ch;
    s.style.animationDelay = (120 + i * 80) + "ms";
    tiles.appendChild(s);
  });
  const input = $("#scramble-input");
  if (input) { input.value = ""; input.disabled = false; input.classList.remove("shake"); }
  const status = $("#scramble-status"); if (status) status.textContent = "Attempts left: 3";
  const hint = $("#scramble-hint-text");
  if (hint) { hint.hidden = true; hint.textContent = birthdayConfig.scrambleHint || ""; }
  const sub = $("#scramble-submit"); if (sub) sub.disabled = false;
}
function revealScrambleAnswer(thenComplete) {
  const target = (birthdayConfig.scrambleWord || "BIRTHDAY").toUpperCase();
  const tiles = $$(".s-tile", $("#scramble-tiles"));
  target.split("").forEach(function (ch, i) {
    const t = tiles[i];
    if (!t) return;
    setTimeout(function () { t.textContent = ch; t.classList.add("solved"); }, i * 90);
  });
  const input = $("#scramble-input");
  if (input) { input.value = target; input.disabled = true; }
  const sub = $("#scramble-submit"); if (sub) sub.disabled = true;
  if (thenComplete) setTimeout(function () { completeLevel(2); }, 1150);
}
function submitScramble() {
  if (scramble.done) return;
  const input = $("#scramble-input");
  if (!input) return;
  const val = (input.value || "").trim().toUpperCase();
  const target = (birthdayConfig.scrambleWord || "BIRTHDAY").toUpperCase();
  if (!val) {
    input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
    return;
  }
  if (val === target) {
    scramble.done = true;
    playSfx("success"); vibrate([20, 40, 20]);
    confetti(28);
    revealScrambleAnswer(true);
  } else {
    scramble.attempts--;
    playSfx("wrong"); vibrate(60);
    input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
    const status = $("#scramble-status");
    if (scramble.attempts > 0) {
      if (status) status.textContent = "Attempts left: " + scramble.attempts;
      if (scramble.attempts <= 1) { const h = $("#scramble-hint-text"); if (h) h.hidden = false; }
    } else {
      if (status) status.textContent = "Out of attempts — here it is…";
      scramble.done = true; // graceful auto-solve so the journey never dead-ends
      revealScrambleAnswer(true);
    }
  }
}

/* ================================================================
   LEVEL 4 — WORD SEARCH (10×10, 8 directions, drag selection)
================================================================ */
const ws = { grid: [], size: 10, words: [], found: null, selecting: false, start: null, current: null, cells: [], done: false };
const WS_DIRS = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];

function initWordSearch() {
  ws.found = new Set();
  ws.done = false;
  ws.selecting = false; ws.start = null; ws.current = null;
  ws.words = (birthdayConfig.wordSearchWords || ["HAPPY", "BIRTHDAY", "TO", "YOU"]).map(function (w) { return w.toUpperCase(); });
  let ok = false, tries = 0;
  while (!ok && tries < 60) { ok = buildWordSearch(); tries++; }
  renderWordSearch();
  renderWsWordList();
}
function buildWordSearch() {
  const size = ws.size;
  const g = [];
  for (let r = 0; r < size; r++) g.push(new Array(size).fill(""));
  const words = ws.words.slice().sort(function (a, b) { return b.length - a.length; });
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    let placed = false;
    for (let attempt = 0; attempt < 220 && !placed; attempt++) {
      const dir = WS_DIRS[Math.floor(Math.random() * WS_DIRS.length)];
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const er = r + dir[0] * (word.length - 1);
      const ec = c + dir[1] * (word.length - 1);
      if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
      let okAll = true;
      for (let k = 0; k < word.length; k++) {
        const cell = g[r + dir[0] * k][c + dir[1] * k];
        if (cell !== "" && cell !== word[k]) { okAll = false; break; }
      }
      if (!okAll) continue;
      for (let k = 0; k < word.length; k++) g[r + dir[0] * k][c + dir[1] * k] = word[k];
      placed = true;
    }
    if (!placed) return false;
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (g[r][c] === "") g[r][c] = alphabet[Math.floor(Math.random() * 26)];
    }
  }
  ws.grid = g;
  return true;
}
function renderWordSearch() {
  const gridEl = $("#ws-grid");
  if (!gridEl) return;
  gridEl.innerHTML = "";
  ws.cells = [];
  for (let r = 0; r < ws.size; r++) {
    const row = [];
    for (let c = 0; c < ws.size; c++) {
      const d = document.createElement("div");
      d.className = "ws-cell";
      d.textContent = ws.grid[r][c];
      d.dataset.r = r; d.dataset.c = c;
      gridEl.appendChild(d);
      row.push(d);
    }
    ws.cells.push(row);
  }
}
function renderWsWordList() {
  const box = $("#ws-words");
  if (!box) return;
  box.innerHTML = "";
  ws.words.forEach(function (w) {
    const s = document.createElement("span");
    s.className = "ws-word" + (ws.found && ws.found.has(w) ? " found" : "");
    s.textContent = w;
    box.appendChild(s);
  });
}
function wsSnappedEnd() {
  if (!ws.start || !ws.current) return ws.start;
  const dr = ws.current.r - ws.start.r, dc = ws.current.c - ws.start.c;
  if (dr === 0 && dc === 0) return { r: ws.start.r, c: ws.start.c };
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  const ang = Math.atan2(dr, dc);
  const snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
  let rr = Math.round(ws.start.r + Math.sin(snap) * len);
  let cc = Math.round(ws.start.c + Math.cos(snap) * len);
  rr = Math.max(0, Math.min(ws.size - 1, rr));
  cc = Math.max(0, Math.min(ws.size - 1, cc));
  return { r: rr, c: cc };
}
function wsRepaint() {
  if (!ws.cells.length) return;
  for (let r = 0; r < ws.size; r++) {
    for (let c = 0; c < ws.size; c++) ws.cells[r][c].classList.remove("sel");
  }
  if (!ws.start || !ws.current) return;
  const end = wsSnappedEnd();
  const dr = end.r - ws.start.r, dc = end.c - ws.start.c;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr) || 0, sc = Math.sign(dc) || 0;
  for (let k = 0; k <= steps; k++) {
    ws.cells[ws.start.r + sr * k][ws.start.c + sc * k].classList.add("sel");
  }
}
function wsPointerDown(e) {
  if (ws.done) return;
  const cell = e.target && e.target.closest ? e.target.closest(".ws-cell") : null;
  if (!cell) return;
  e.preventDefault();
  const grid = $("#ws-grid");
  try { if (grid && grid.setPointerCapture) grid.setPointerCapture(e.pointerId); } catch (err) {}
  ws.selecting = true;
  ws.start = { r: +cell.dataset.r, c: +cell.dataset.c };
  ws.current = { r: ws.start.r, c: ws.start.c };
  wsRepaint();
}
function wsPointerMove(e) {
  if (!ws.selecting || ws.done || !ws.cells.length) return;
  e.preventDefault();
  const a = ws.cells[0][0].getBoundingClientRect();
  const b = ws.cells[ws.size - 1][ws.size - 1].getBoundingClientRect();
  const cw = (b.right - a.left) / ws.size;
  const ch = (b.bottom - a.top) / ws.size;
  let c = Math.floor((e.clientX - a.left) / cw);
  let r = Math.floor((e.clientY - a.top) / ch);
  c = Math.max(0, Math.min(ws.size - 1, c));
  r = Math.max(0, Math.min(ws.size - 1, r));
  ws.current = { r: r, c: c };
  wsRepaint();
}
function wsPointerUp() {
  if (!ws.selecting) return;
  ws.selecting = false;
  const start = ws.start;
  const end = wsSnappedEnd();
  ws.start = null; ws.current = null;
  if (!start || !end) { wsRepaint(); return; }
  const dr = end.r - start.r, dc = end.c - start.c;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr) || 0, sc = Math.sign(dc) || 0;
  let fwd = "";
  const line = [];
  for (let k = 0; k <= steps; k++) {
    const rr = start.r + sr * k, cc = start.c + sc * k;
    fwd += ws.grid[rr][cc];
    line.push(ws.cells[rr][cc]);
  }
  const rev = fwd.split("").reverse().join("");
  let matched = null;
  for (let i = 0; i < ws.words.length; i++) {
    const w = ws.words[i];
    if (!ws.found.has(w) && (fwd === w || rev === w)) { matched = w; break; }
  }
  if (matched) {
    ws.found.add(matched);
    const ci = ws.words.indexOf(matched);
    line.forEach(function (el, k) {
      el.classList.remove("sel");
      el.style.transitionDelay = (k * 28) + "ms";
      el.classList.add("f" + ci);
    });
    playSfx("success"); vibrate(25);
    const mid = line[Math.floor(line.length / 2)];
    if (mid) burstFromElement(mid, { count: 12, power: 58 });
    renderWsWordList();
    if (ws.found.size === ws.words.length) {
      ws.done = true;
      setTimeout(function () { completeLevel(3); }, 800);
    }
  } else {
    if (steps >= 1) playSfx("wrong");
    line.forEach(function (el) { el.classList.add("miss"); });
    setTimeout(function () {
      line.forEach(function (el) { el.classList.remove("miss", "sel"); el.style.transitionDelay = ""; });
    }, 280);
  }
}
function wsPointerCancel() {
  ws.selecting = false; ws.start = null; ws.current = null;
  wsRepaint();
}

/* ================================================================
   LEVEL COMPLETE → SECRET DIGIT MODAL
================================================================ */
let digitModalNext = null;
function completeLevel(i) {
  state.completed[i] = true;
  saveProgress();
  showDigitModal(i);
}
function showDigitModal(i) {
  const modal = $("#digit-modal");
  if (!modal) return;
  const code = String(birthdayConfig.finalCode || "0000");
  const digit = code.charAt(i) || "0";
  const kicker = $("#dm-kicker");
  const title = $("#dm-title");
  const digitEl = $("#dm-digit");
  const note = $("#dm-note");
  if (kicker) kicker.textContent = i === 3 ? "FINAL SECRET DIGIT" : "SECRET DIGIT UNLOCKED";
  if (title) title.textContent = LEVELS[i].name + " complete!";
  if (digitEl) digitEl.textContent = digit;
  if (note) note.textContent = i === 3
    ? "That's all four digits. The gift is waiting…"
    : "Keep it safe — you'll need all four at the end.";
  modal.classList.remove("show");
  void modal.offsetWidth; // restart staged animations
  modal.classList.add("show");
  playSfx("success");
  vibrate([20, 60, 20]);
  setTimeout(function () {
    if (modal.classList.contains("show")) confetti(38);
  }, prefersReducedMotion ? 150 : 1150);
  digitModalNext = i === 3
    ? function () { hideDigitModal(); showScreen("screen-gift"); initGiftScreen(); }
    : function () { hideDigitModal(); showScreen("screen-map"); renderMap(); };
  const cont = $("#dm-continue");
  if (cont) { try { cont.focus({ preventScroll: true }); } catch (e) {} }
}
function hideDigitModal() {
  const m = $("#digit-modal");
  if (m) m.classList.remove("show");
}

/* ================================================================
   MYSTERY GIFT — PIN entry + cinematic opening
================================================================ */
let giftBusy = false;
let giftCineToken = 0;

function initGiftScreen() {
  giftBusy = false;
  const slots = $("#digit-slots");
  if (slots) {
    slots.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const s = document.createElement("div");
      s.className = "digit-slot" + (state.completed[i] ? " filled" : "");
      s.textContent = state.completed[i] ? String(birthdayConfig.finalCode || "").charAt(i) : "•";
      slots.appendChild(s);
    }
  }
  const pins = $$(".pin-box");
  pins.forEach(function (p) { p.value = ""; p.disabled = false; });
  const row = $("#pin-row"); if (row) row.classList.remove("correct", "shake");
  const msg = $("#pin-message"); if (msg) msg.textContent = "";
  const box = $("#gift-box"); if (box) box.classList.remove("burst", "shaking");
  const flash = $("#gift-flash"); if (flash) flash.classList.remove("go");
  try { if (pins[0]) pins[0].focus({ preventScroll: true }); } catch (e) {}
}
function onPinInput(e) {
  if (giftBusy) return;
  const el = e.target;
  const v = (el.value || "").replace(/\D/g, "");
  el.value = v.slice(-1);
  if (v) {
    playSfx("click");
    const next = el.nextElementSibling;
    if (next && next.classList.contains("pin-box")) next.focus();
    checkPinAuto();
  }
}
function onPinKeydown(e) {
  const el = e.target;
  if (e.key === "Backspace" && !el.value) {
    const prev = el.previousElementSibling;
    if (prev && prev.classList.contains("pin-box")) { prev.focus(); prev.value = ""; e.preventDefault(); }
  }
  if (e.key === "ArrowLeft") { const p = el.previousElementSibling; if (p && p.classList.contains("pin-box")) p.focus(); }
  if (e.key === "ArrowRight") { const n = el.nextElementSibling; if (n && n.classList.contains("pin-box")) n.focus(); }
  if (e.key === "Enter") validatePin();
}
function onPinPaste(e) {
  if (giftBusy) return;
  const text = ((e.clipboardData && e.clipboardData.getData("text")) || "").replace(/\D/g, "");
  if (!text) return;
  e.preventDefault();
  const pins = $$(".pin-box");
  pins.forEach(function (p, i) { p.value = text[i] || ""; });
  const idx = Math.min(text.length, pins.length - 1);
  pins[idx].focus();
  checkPinAuto();
}
function checkPinAuto() {
  const pins = $$(".pin-box");
  if (pins.every(function (p) { return p.value; })) validatePin();
}
function validatePin() {
  if (giftBusy) return;
  const pins = $$(".pin-box");
  const entered = pins.map(function (p) { return p.value; }).join("");
  const msg = $("#pin-message");
  if (entered.length < 4) { if (msg) msg.textContent = "Enter all four digits ✦"; return; }
  if (entered === String(birthdayConfig.finalCode)) {
    giftBusy = true;
    if (msg) msg.textContent = "";
    pins.forEach(function (p) { p.disabled = true; });
    const row = $("#pin-row"); if (row) row.classList.add("correct");
    playSfx("gift");
    vibrate([30, 60, 30, 60, 90]);
    runGiftCinematic();
  } else {
    playSfx("wrong");
    vibrate([60, 40, 60]);
    const row = $("#pin-row");
    if (row) { row.classList.remove("shake"); void row.offsetWidth; row.classList.add("shake"); }
    if (msg) msg.textContent = "Not quite… try again.";
    setTimeout(function () {
      pins.forEach(function (p) { p.value = ""; });
      if (pins[0]) pins[0].focus();
    }, 520);
  }
}
function runGiftCinematic() {
  const token = ++giftCineToken;
  const screen = $("#screen-gift");
  const box = $("#gift-box");
  const flash = $("#gift-flash");
  setTimeout(function () { if (token !== giftCineToken) return; if (screen) screen.classList.add("dimmed"); }, 300);
  setTimeout(function () { if (token !== giftCineToken) return; if (box) box.classList.add("shaking"); }, 750);
  setTimeout(function () {
    if (token !== giftCineToken) return;
    if (box) { box.classList.remove("shaking"); box.classList.add("burst"); burstFromElement(box, { count: 38, power: 150 }); }
    if (flash) { flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go"); }
    confetti(70);
    playSfx("success");
    vibrate(90);
  }, 1900);
  setTimeout(function () {
    if (token !== giftCineToken) return;
    showScreen("screen-final");
    runFinalSequence();
    if (screen) screen.classList.remove("dimmed");
  }, 3150);
}
screenCleanups["screen-gift"] = function () { giftCineToken++; };

/* ================================================================
   FINAL REVEAL
================================================================ */
let finalSequenceToken = 0;
let finalFxTimer = null;

function renderFinalMessage() {
  const title = $("#final-title");
  if (title) title.textContent = birthdayConfig.finalTitle || "Happy Birthday! ❤️";
  const box = $("#final-message");
  if (box) {
    box.innerHTML = "";
    (birthdayConfig.finalMessage || []).forEach(function (line, i) {
      const p = document.createElement("p");
      p.textContent = line;
      p.style.transitionDelay = (0.15 + i * 0.45) + "s";
      box.appendChild(p);
    });
  }
  const sign = $("#final-signoff");
  if (sign) sign.textContent = birthdayConfig.finalSignoff || "";
}
function loadFinalPhoto() {
  const img = $("#final-photo");
  const ph = $("#photo-placeholder");
  if (!img) return;
  img.alt = birthdayConfig.photoAlt || "Birthday photo";
  img.onerror = function () { img.hidden = true; if (ph) ph.hidden = false; };
  if (ph) ph.hidden = true;
  img.hidden = false;
  img.src = birthdayConfig.photo;
}
function runFinalSequence() {
  const token = ++finalSequenceToken;
  const stage = $("#final-stage");
  const veil = $("#final-veil");
  const spark = $("#final-spark");
  if (!stage) return;
  // reset
  stage.classList.remove("phase-photo", "phase-title", "phase-msg", "phase-sign", "phase-actions");
  if (spark) { spark.classList.remove("go"); void spark.offsetWidth; }
  if (veil) { veil.classList.remove("lift"); void veil.offsetWidth; }
  if (finalFxTimer) { clearInterval(finalFxTimer); finalFxTimer = null; }
  loadFinalPhoto();

  function step(ms, fn) {
    setTimeout(function () { if (token === finalSequenceToken) fn(); }, ms);
  }
  step(450,  function () { if (spark) spark.classList.add("go"); });
  step(1250, function () { if (veil) veil.classList.add("lift"); });
  step(1400, function () { stage.classList.add("phase-photo"); });
  step(2450, function () { stage.classList.add("phase-title"); playSfx("success"); });
  step(2950, function () { stage.classList.add("phase-msg"); });
  step(3650, function () { stage.classList.add("phase-sign"); });
  step(4250, function () {
    stage.classList.add("phase-actions");
    confetti(46);
    // continuous gentle sparkles around the photo
    if (!prefersReducedMotion) {
      finalFxTimer = setInterval(function () {
        if (token !== finalSequenceToken || state.screen !== "screen-final") {
          clearInterval(finalFxTimer); finalFxTimer = null; return;
        }
        const frame = $("#photo-frame");
        if (frame) burstFromElement(frame, { count: 2, power: 46, colors: ["#ffd166", "#fff6e0"] });
      }, 1100);
    }
  });
}
screenCleanups["screen-opening"] = clearOpeningTimers;
screenCleanups["screen-final"] = function () {
  finalSequenceToken++;
  if (finalFxTimer) { clearInterval(finalFxTimer); finalFxTimer = null; }
};

/* ================================================================
   HIDDEN SURPRISE + REPLAY
================================================================ */
function showSurprise() {
  const ov = $("#surprise-overlay");
  const txt = $("#surprise-text");
  if (!ov) return;
  if (txt) txt.textContent = birthdayConfig.hiddenMessage || "";
  ov.hidden = false;
  requestAnimationFrame(function () { ov.classList.add("show"); });
  playSfx("success");
  vibrate([30, 50, 30, 50, 120]);
  confetti(60);
  burst(window.innerWidth / 2, window.innerHeight / 2, { count: 26, power: 130 });
}
function hideSurprise() {
  const ov = $("#surprise-overlay");
  if (!ov) return;
  ov.classList.remove("show");
  setTimeout(function () { ov.hidden = true; }, 450);
}
function replayAdventure() {
  if (!window.confirm("Replay the adventure from the beginning? Your progress will be reset.")) return;
  clearProgress();
  state.completed = [false, false, false, false];
  journeyStarted = false;
  finalSequenceToken++;
  giftCineToken++;
  if (finalFxTimer) { clearInterval(finalFxTimer); finalFxTimer = null; }
  const ov = $("#surprise-overlay");
  if (ov) { ov.classList.remove("show"); ov.hidden = true; }
  hideDigitModal();
  playSfx("click");
  showScreen("screen-opening");
  runOpeningSequence();
}

/* ================================================================
   UI GLUE — toast, ripple, keyboard
================================================================ */
let toastTimer = null;
function showToast(msgText) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msgText;
  t.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
}
function bindOnce() {
  // opening
  const begin = $("#btn-begin");
  if (begin) begin.addEventListener("click", beginAdventure);
  const opening = $("#screen-opening");
  if (opening) opening.addEventListener("click", function () { if (!state.openingDone) skipOpening(); });

  // music
  const music = $("#btn-music");
  if (music) music.addEventListener("click", toggleMusic);

  // back buttons → map
  $$(".btn-back-map").forEach(function (b) {
    b.addEventListener("click", function () {
      playSfx("click");
      showScreen("screen-map");
      renderMap();
    });
  });

  // digit modal continue
  const cont = $("#dm-continue");
  if (cont) cont.addEventListener("click", function () {
    if (!digitModalNext) return;
    const fn = digitModalNext;
    digitModalNext = null;
    playSfx("click");
    fn();
  });

  // level 3
  const sub = $("#scramble-submit");
  if (sub) sub.addEventListener("click", function () { playSfx("click"); submitScramble(); });
  const hintBtn = $("#scramble-hint");
  if (hintBtn) hintBtn.addEventListener("click", function () {
    playSfx("click");
    const h = $("#scramble-hint-text");
    if (h) { h.textContent = birthdayConfig.scrambleHint || ""; h.hidden = false; }
  });
  const scrInput = $("#scramble-input");
  if (scrInput) scrInput.addEventListener("keydown", function (e) { if (e.key === "Enter") submitScramble(); });

  // level 4 — pointer selection (bound once, grid element is static)
  const grid = $("#ws-grid");
  if (grid) {
    grid.addEventListener("pointerdown", wsPointerDown);
    grid.addEventListener("pointermove", wsPointerMove);
    grid.addEventListener("pointerup", wsPointerUp);
    grid.addEventListener("pointercancel", wsPointerCancel);
    grid.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  // PIN boxes
  $$(".pin-box").forEach(function (p) {
    p.addEventListener("input", onPinInput);
    p.addEventListener("keydown", onPinKeydown);
    p.addEventListener("paste", onPinPaste);
  });

  // final buttons
  const surprise = $("#btn-surprise");
  if (surprise) surprise.addEventListener("click", showSurprise);
  const surpriseClose = $("#surprise-close");
  if (surpriseClose) surpriseClose.addEventListener("click", hideSurprise);
  const replay = $("#btn-replay");
  if (replay) replay.addEventListener("click", replayAdventure);

  // global keyboard
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const ov = $("#surprise-overlay");
    if (ov && !ov.hidden) { hideSurprise(); return; }
    const modal = $("#digit-modal");
    if (modal && modal.classList.contains("show") && digitModalNext) {
      const fn = digitModalNext;
      digitModalNext = null;
      fn();
    }
  });

  // ripple micro-interaction (delegated — bound once)
  document.addEventListener("pointerdown", function (e) {
    if (prefersReducedMotion) return;
    const target = e.target && e.target.closest ? e.target.closest(".btn, .node-btn, .btn-music, .btn-back") : null;
    if (!target) return;
    const r = target.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ripple";
    const size = Math.max(r.width, r.height) * 2;
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.style.left = (e.clientX - r.left - size / 2) + "px";
    s.style.top = (e.clientY - r.top - size / 2) + "px";
    target.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
  });

  // layout-reactive redraws
  window.addEventListener("resize", debounce(function () { drawMapPath(); }, 160));
  window.addEventListener("orientationchange", function () { setTimeout(drawMapPath, 350); });
}

/* ================================================================
   INITIALIZATION
================================================================ */
function init() {
  loadProgress();
  renderFinalMessage();
  bindOnce();
  initBackground();
  renderMusicButton();
  runOpeningSequence();
  // redraw map path once fonts/layout settle
  setTimeout(drawMapPath, 400);
}
document.addEventListener("DOMContentLoaded", init);
