/* ==========================================================================
   PERJUANGAN — stage-sumpah-pemuda.js
   "Satukan Suara" — a self-contained node-linking mini-game.

   Mechanic: tap/click/keyboard-activate each of six orbs to connect it to
   the glowing center. No dragging required — this keeps it equally usable
   on touchscreens (a single tap) and keyboards (Tab + Enter/Space), and
   the goal is legible purely from the visuals (empty dots, one glowing
   hub) without any historical knowledge.

   Orbs are real <button> elements (same accessible pattern as the mission
   nodes in map.js), absolutely positioned over a decorative canvas layer
   that only renders the ambient glow, connection lines, and particles.

   Registered on PJ.Stages["sumpah-pemuda"] with an open({onComplete}) API,
   called by startMission() in map.js.
   ========================================================================== */

window.PJ = window.PJ || {};
PJ.Stages = PJ.Stages || {};

PJ.Stages["sumpah-pemuda"] = (function () {
  const ORB_COUNT = 6;
  const GOLD = "#eac873";
  const ORBS_DEF = [
    { color: "#c8102e", icon: "flame" },
    { color: "#c9a227", icon: "sun" },
    { color: "#4c8cae", icon: "wave" },
    { color: "#8a5cb0", icon: "star" },
    { color: "#4caf6a", icon: "leaf" },
    { color: "#c9702e", icon: "mountain" },
  ];

  const ICONS = {
    flame: '<path d="M12 3c1 3-1 4-1 6 2 0 3 1 3 3 0 3-2 5-2 5s-2-2-2-5c0-2 1-3 3-3-1-2-2-3-1-6z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    wave: '<path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    star: '<path d="M12 3l2.2 5.6L20 9.3l-4.3 3.9L17 19l-5-3.2L7 19l1.3-5.8L4 9.3l5.8-.7z"/>',
    leaf: '<path d="M6 20c8 0 12-6 12-14-8 0-14 4-14 12 0 1 0 2 2 2z"/><path d="M6 20c2-4 5-7 10-10"/>',
    mountain: '<path d="M3 19l6-10 4 6 2-3 6 7z"/>',
  };

  function iconSvg(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${
      ICONS[name] || ICONS.star
    }</svg>`;
  }

  let overlay, canvas, ctx, playArea, orbsLayer, progressEl, closeBtn, completePanel;
  let W = 0,
    H = 0,
    dpr = 1;
  let orbs = [];
  let center = { x: 0, y: 0, r: 30 };
  let particles = [];
  let active = false;
  let completed = false;
  let rafId = null;
  let closeTimer = null;
  let onCompleteCb = null;
  let initialized = false;

  function qs(id) {
    return document.getElementById(id);
  }

  function ensureDom() {
    if (initialized) return;
    overlay = qs("stageOverlay");
    canvas = qs("stageCanvas");
    ctx = canvas.getContext("2d");
    playArea = qs("stagePlayArea");
    orbsLayer = qs("stageOrbsLayer");
    progressEl = qs("stageProgress");
    closeBtn = qs("stageCloseBtn");
    completePanel = qs("stageCompletePanel");
    const completeBtn = qs("stageCompleteBtn");

    closeBtn.addEventListener("click", () => close(false));
    if (completeBtn) completeBtn.addEventListener("click", () => close(true));

    window.addEventListener("resize", () => {
      if (active) configure();
    });
    document.addEventListener("keydown", (e) => {
      if (active && e.key === "Escape") close(false);
    });

    initialized = true;
  }

  function configure() {
    const rect = playArea.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    if (W === 0 || H === 0) return; // guard against measuring before layout is ready
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutOrbs();
    if (orbsLayer.children.length === 0) buildOrbButtons();
    positionOrbButtons();
  }

  function layoutOrbs() {
    center = {
      x: W / 2,
      y: H / 2,
      r: Math.max(26, Math.min(W, H) * 0.06),
    };
    const radiusX = W * 0.34;
    const radiusY = H * 0.34;
    orbs.forEach((orb, i) => {
      const angle = (i / ORB_COUNT) * Math.PI * 2 - Math.PI / 2;
      orb.x = center.x + Math.cos(angle) * radiusX;
      orb.y = center.y + Math.sin(angle) * radiusY;
    });
  }

  function positionOrbButtons() {
    orbs.forEach((orb) => {
      orb.el.style.left = orb.x + "px";
      orb.el.style.top = orb.y + "px";
    });
  }

  function buildOrbButtons() {
    orbsLayer.innerHTML = "";
    orbs.forEach((orb) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "orb";
      btn.style.setProperty("--orb-color", orb.color);
      btn.setAttribute("aria-label", `Titik ${orb.id + 1}, belum tersambung`);
      btn.innerHTML = `<span class="orb__ring"></span><span class="orb__icon">${iconSvg(orb.icon)}</span>`;
      btn.addEventListener("click", () => connectOrb(orb));
      orb.el = btn;
      orbsLayer.appendChild(btn);
    });
  }

  function resetState() {
    orbs = ORBS_DEF.map((def, i) => ({
      id: i,
      color: def.color,
      icon: def.icon,
      connected: false,
      x: 0,
      y: 0,
      el: null,
    }));
    completed = false;
    particles = [];
    buildOrbButtons();
  }

  function connectedCount() {
    return orbs.reduce((n, o) => n + (o.connected ? 1 : 0), 0);
  }

  function updateProgressLabel() {
    if (progressEl) progressEl.textContent = `${connectedCount()} / ${ORB_COUNT} TERSAMBUNG`;
  }

  function connectOrb(orb) {
    if (!active || completed || orb.connected) return;
    orb.connected = true;
    orb.el.classList.add("orb--connected");
    orb.el.disabled = true;
    orb.el.setAttribute("aria-label", `Titik ${orb.id + 1}, tersambung`);
    spawnBurst(orb.x, orb.y);
    spawnBurst(center.x, center.y);
    updateProgressLabel();

    if (connectedCount() === ORB_COUNT) {
      completed = true; // lock further input immediately, before the reveal delay
      setTimeout(triggerCompletion, 550);
    } else {
      // Keyboard users: disabling this button drops focus to <body>, which
      // is disorienting. Hand focus to the next unconnected orb instead,
      // so Tab/Enter can keep going without hunting for where focus went.
      const next = orbs.find((o) => !o.connected);
      if (next && next.el) next.el.focus({ preventScroll: true });
    }
  }

  function spawnBurst(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.1 + Math.random() * 2.4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
  }

  function triggerCompletion() {
    if (!completePanel) return;
    completePanel.hidden = false;
    requestAnimationFrame(() => {
      completePanel.classList.add("is-in");
      const btn = qs("stageCompleteBtn");
      if (btn) btn.focus({ preventScroll: true });
    });
  }

  function drawLine(x1, y1, x2, y2, color, width, glow) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    if (!active) return;
    ctx.clearRect(0, 0, W, H);

    // ambient center glow
    const glowR = center.r * 3.6;
    const grad = ctx.createRadialGradient(center.x, center.y, 2, center.x, center.y, glowR);
    grad.addColorStop(0, "rgba(234,200,115,0.32)");
    grad.addColorStop(1, "rgba(234,200,115,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // connection lines
    orbs.forEach((o) => {
      if (o.connected) drawLine(o.x, o.y, center.x, center.y, "rgba(234,200,115,0.9)", 2.6, true);
    });

    // center node — layered rings for a "hub" feel
    ctx.save();
    const t = performance.now() / 1000;
    const pulseR = center.r + Math.sin(t * 1.3) * 3;
    ctx.strokeStyle = "rgba(201,162,39,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(center.x, center.y, pulseR + 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#1f1a14";
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, pulseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    rafId = requestAnimationFrame(render);
  }

  function open(opts) {
    ensureDom();
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    onCompleteCb = (opts && opts.onComplete) || function () {};
    resetState();

    overlay.hidden = false;
    completePanel.hidden = true;
    completePanel.classList.remove("is-in");
    active = true;

    // layout requires the overlay to be visible (non-zero size) first
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      configure();
      updateProgressLabel();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(render);
      // move focus into the game for keyboard users
      if (orbs[0] && orbs[0].el) orbs[0].el.focus({ preventScroll: true });
    });
  }

  function close(didComplete) {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    overlay.classList.remove("is-open");
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      // guard: a fast reopen in the meantime may have set active back to true
      if (!active) overlay.hidden = true;
      closeTimer = null;
    }, 320);
    if (didComplete && typeof onCompleteCb === "function") {
      onCompleteCb();
    }
  }

  return { open, close };
})();
