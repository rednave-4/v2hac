/* ==========================================================================
   PERJUANGAN — stage-rengasdengklok.js
   "Malam ke Rengasdengklok" — 2D stealth escort (16 Agustus 1945).

   Golongan muda mengawal Soekarno & Hatta ke Rengasdengklok agar proklamasi
   segera dikumandangkan. Hindari patroli Jepang, capai rumah aman.

   Kontrol: WASD / panah / sentuh & drag. Escape = tutup.
   ========================================================================== */

window.PJ = window.PJ || {};
PJ.Stages = PJ.Stages || {};

PJ.Stages["rengasdengklok"] = (function () {
  const GOLD = "#eac873";
  const RED = "#c8102e";
  const PARCH = "#f3eee1";
  const INK = "#0a0908";

  let overlay, canvas, ctx, playArea, progressEl, closeBtn, completePanel;
  let headingEl, hintEl, orbsLayer;
  let W = 0, H = 0, dpr = 1;
  let active = false;
  let completed = false;
  let rafId = null;
  let onCompleteCb = null;
  let initialized = false;

  // World (logical units; camera follows player)
  const WORLD = { w: 1400, h: 900 };
  let player = { x: 120, y: 450, r: 14, speed: 2.6 };
  let leaders = { x: 90, y: 450, r: 16 }; // Soekarno-Hatta group, follows player
  let goal = { x: 1240, y: 420, r: 36 };
  let patrols = [];
  let bushes = []; // cover
  let keys = Object.create(null);
  let touchId = null;
  let touchVec = { x: 0, y: 0 };
  let lives = 3;
  let alertTimer = 0;
  let spottedFlash = 0;
  let cam = { x: 0, y: 0 };
  let startSafe = 90; // grace frames at start
  let particles = [];

  function qs(id) {
    return document.getElementById(id);
  }

  function ensureDom() {
    if (initialized) return;
    overlay = qs("stageOverlay");
    canvas = qs("stageCanvas");
    ctx = canvas.getContext("2d");
    playArea = qs("stagePlayArea");
    progressEl = qs("stageProgress");
    closeBtn = qs("stageCloseBtn");
    completePanel = qs("stageCompletePanel");
    orbsLayer = qs("stageOrbsLayer");
    headingEl = overlay && overlay.querySelector(".stage-overlay__heading .eyebrow");
    hintEl = overlay && overlay.querySelector(".stage-overlay__hint");
    const completeBtn = qs("stageCompleteBtn");

    closeBtn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      close(false);
    });
    if (completeBtn) {
      completeBtn.addEventListener("pointerup", (e) => {
        e.preventDefault();
        close(true);
      });
    }

    window.addEventListener("resize", () => {
      if (active) configure();
    });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // Touch / pointer drag on canvas for movement
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    initialized = true;
  }

  function onKeyDown(e) {
    if (!active) return;
    if (e.key === "Escape") {
      close(false);
      return;
    }
    keys[e.key.toLowerCase()] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }

  function onPointerDown(e) {
    if (!active || completed) return;
    touchId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    updateTouchVec(e);
  }
  function onPointerMove(e) {
    if (touchId !== e.pointerId) return;
    updateTouchVec(e);
  }
  function onPointerUp(e) {
    if (touchId !== e.pointerId) return;
    touchId = null;
    touchVec.x = 0;
    touchVec.y = 0;
  }
  function updateTouchVec(e) {
    const rect = canvas.getBoundingClientRect();
    // screen position of player
    const sx = (player.x - cam.x) * (rect.width / W);
    const sy = (player.y - cam.y) * (rect.height / H);
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let dx = mx - sx;
    let dy = my - sy;
    const len = Math.hypot(dx, dy) || 1;
    // deadzone
    if (len < 18) {
      touchVec.x = 0;
      touchVec.y = 0;
      return;
    }
    touchVec.x = dx / len;
    touchVec.y = dy / len;
  }

  function configure() {
    const rect = playArea.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetWorld() {
    player = { x: 140, y: WORLD.h * 0.52, r: 14, speed: 2.75 };
    leaders = { x: 100, y: WORLD.h * 0.52, r: 17 };
    goal = { x: WORLD.w - 140, y: WORLD.h * 0.48, r: 42 };
    lives = 3;
    alertTimer = 0;
    spottedFlash = 0;
    startSafe = 100;
    particles = [];
    completed = false;
    if (completePanel) completePanel.hidden = true;

    // Cover bushes
    bushes = [
      { x: 320, y: 280, r: 48 },
      { x: 480, y: 620, r: 55 },
      { x: 700, y: 220, r: 50 },
      { x: 820, y: 580, r: 60 },
      { x: 980, y: 340, r: 45 },
      { x: 1100, y: 680, r: 52 },
      { x: 560, y: 420, r: 40 },
      { x: 250, y: 700, r: 42 },
    ];

    // Patrols: path waypoints, speed, vision radius & angle
    patrols = [
      {
        path: [
          { x: 380, y: 180 },
          { x: 380, y: 720 },
        ],
        idx: 0,
        t: 0,
        speed: 1.15,
        angle: Math.PI / 2,
        vision: 130,
        fov: 0.7,
      },
      {
        path: [
          { x: 620, y: 750 },
          { x: 620, y: 160 },
        ],
        idx: 0,
        t: 0,
        speed: 1.0,
        angle: -Math.PI / 2,
        vision: 140,
        fov: 0.65,
      },
      {
        path: [
          { x: 900, y: 200 },
          { x: 1050, y: 450 },
          { x: 900, y: 700 },
          { x: 750, y: 450 },
        ],
        idx: 0,
        t: 0,
        speed: 1.25,
        angle: 0,
        vision: 125,
        fov: 0.75,
      },
      {
        path: [
          { x: 1180, y: 150 },
          { x: 1180, y: 780 },
        ],
        idx: 0,
        t: 0,
        speed: 0.95,
        angle: Math.PI / 2,
        vision: 120,
        fov: 0.7,
      },
    ];
    patrols.forEach((p) => {
      p.x = p.path[0].x;
      p.y = p.path[0].y;
    });

    updateProgressUI();
  }

  function updateProgressUI() {
    if (progressEl) progressEl.textContent = lives + " / 3";
  }

  function inBush(x, y) {
    return bushes.some((b) => Math.hypot(x - b.x, y - b.y) < b.r * 0.85);
  }

  function moveEntity(ent, vx, vy, speed) {
    const len = Math.hypot(vx, vy) || 1;
    let nx = ent.x + (vx / len) * speed;
    let ny = ent.y + (vy / len) * speed;
    nx = Math.max(30, Math.min(WORLD.w - 30, nx));
    ny = Math.max(30, Math.min(WORLD.h - 30, ny));
    ent.x = nx;
    ent.y = ny;
  }

  function updatePatrol(p) {
    const a = p.path[p.idx];
    const b = p.path[(p.idx + 1) % p.path.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    p.t += p.speed / dist;
    if (p.t >= 1) {
      p.t = 0;
      p.idx = (p.idx + 1) % p.path.length;
    }
    const a2 = p.path[p.idx];
    const b2 = p.path[(p.idx + 1) % p.path.length];
    p.x = a2.x + (b2.x - a2.x) * p.t;
    p.y = a2.y + (b2.y - a2.y) * p.t;
    p.angle = Math.atan2(b2.y - a2.y, b2.x - a2.x);
  }

  function canSee(patrol, tx, ty) {
    if (inBush(tx, ty)) return false;
    const dx = tx - patrol.x;
    const dy = ty - patrol.y;
    const dist = Math.hypot(dx, dy);
    if (dist > patrol.vision) return false;
    const ang = Math.atan2(dy, dx);
    let diff = ang - patrol.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < patrol.fov;
  }

  function onSpotted() {
    if (startSafe > 0 || alertTimer > 0 || completed) return;
    lives -= 1;
    alertTimer = 90;
    spottedFlash = 40;
    updateProgressUI();
    // knock back toward start a bit
    player.x = Math.max(80, player.x - 80);
    leaders.x = player.x - 40;
    leaders.y = player.y;
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: player.x,
        y: player.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 30 + Math.random() * 20,
        color: RED,
      });
    }
    if (lives <= 0) {
      // soft reset world, keep trying
      setTimeout(() => {
        if (active && !completed) resetWorld();
      }, 600);
    }
  }

  function update() {
    if (!active || completed) return;

    if (startSafe > 0) startSafe--;
    if (alertTimer > 0) alertTimer--;
    if (spottedFlash > 0) spottedFlash--;

    // input
    let vx = 0;
    let vy = 0;
    if (keys["w"] || keys["arrowup"]) vy -= 1;
    if (keys["s"] || keys["arrowdown"]) vy += 1;
    if (keys["a"] || keys["arrowleft"]) vx -= 1;
    if (keys["d"] || keys["arrowright"]) vx += 1;
    if (touchId !== null) {
      vx += touchVec.x;
      vy += touchVec.y;
    }

    if (vx !== 0 || vy !== 0) {
      moveEntity(player, vx, vy, player.speed);
    }

    // leaders follow player with lag
    const ldx = player.x - 36 - leaders.x;
    const ldy = player.y - leaders.y;
    leaders.x += ldx * 0.08;
    leaders.y += ldy * 0.08;

    patrols.forEach(updatePatrol);

    // detection — check player & leaders
    if (startSafe <= 0 && alertTimer <= 0) {
      for (const p of patrols) {
        if (canSee(p, player.x, player.y) || canSee(p, leaders.x, leaders.y)) {
          onSpotted();
          break;
        }
      }
    }

    // goal
    if (Math.hypot(player.x - goal.x, player.y - goal.y) < goal.r + player.r) {
      win();
    }

    // particles
    particles = particles.filter((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 1;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      return pt.life > 0;
    });

    // camera
    cam.x = player.x - W * 0.4;
    cam.y = player.y - H * 0.5;
    cam.x = Math.max(0, Math.min(WORLD.w - W, cam.x));
    cam.y = Math.max(0, Math.min(WORLD.h - H, cam.y));
  }

  function win() {
    if (completed) return;
    completed = true;
    if (completePanel) {
      if (headingEl) headingEl.textContent = "Rengasdengklok";
      const title = completePanel.querySelector(".stage-complete__title");
      const body = completePanel.querySelector(".stage-complete__body");
      const eyebrow = completePanel.querySelector(".eyebrow");
      if (eyebrow) eyebrow.textContent = PJ.I18N && PJ.I18N.getLang() === "en" ? "Safe" : "Aman";
      if (title)
        title.textContent =
          PJ.I18N && PJ.I18N.getLang() === "en"
            ? "Soekarno & Hatta have arrived"
            : "Soekarno & Hatta tiba dengan selamat";
      if (body)
        body.textContent =
          PJ.I18N && PJ.I18N.getLang() === "en"
            ? "Under pressure from the youth, the proclamation could no longer be delayed."
            : "Di bawah desakan golongan muda, proklamasi tak lagi bisa ditunda.";
      completePanel.hidden = false;
    }
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: goal.x,
        y: goal.y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 40 + Math.random() * 30,
        color: GOLD,
      });
    }
  }

  function drawVisionCone(p) {
    ctx.save();
    ctx.translate(p.x - cam.x, p.y - cam.y);
    ctx.rotate(p.angle);
    const grd = ctx.createRadialGradient(0, 0, 10, 0, 0, p.vision);
    grd.addColorStop(0, "rgba(200, 16, 46, 0.22)");
    grd.addColorStop(1, "rgba(200, 16, 46, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, p.vision, -p.fov, p.fov);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function render() {
    if (!ctx || !active) return;
    ctx.clearRect(0, 0, W, H);

    // night ground
    ctx.fillStyle = "#0c0f0a";
    ctx.fillRect(0, 0, W, H);

    // subtle grid / fields
    ctx.strokeStyle = "rgba(201, 162, 39, 0.06)";
    ctx.lineWidth = 1;
    const grid = 80;
    const ox = -((cam.x % grid) + grid) % grid;
    const oy = -((cam.y % grid) + grid) % grid;
    for (let x = ox; x < W; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = oy; y < H; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // path glow toward goal
    ctx.strokeStyle = "rgba(234, 200, 115, 0.12)";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(120 - cam.x, WORLD.h * 0.52 - cam.y);
    ctx.lineTo(goal.x - cam.x, goal.y - cam.y);
    ctx.stroke();

    // bushes (cover)
    bushes.forEach((b) => {
      const sx = b.x - cam.x;
      const sy = b.y - cam.y;
      ctx.beginPath();
      ctx.arc(sx, sy, b.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30, 48, 28, 0.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(76, 110, 70, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // leaves hint
      ctx.fillStyle = "rgba(60, 90, 55, 0.4)";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(sx + Math.cos(a) * b.r * 0.45, sy + Math.sin(a) * b.r * 0.45, b.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // goal safe house
    {
      const gx = goal.x - cam.x;
      const gy = goal.y - cam.y;
      ctx.beginPath();
      ctx.arc(gx, gy, goal.r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(234, 200, 115, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      // house body
      ctx.fillStyle = "#2a2218";
      ctx.fillRect(gx - 22, gy - 16, 44, 32);
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.moveTo(gx - 28, gy - 16);
      ctx.lineTo(gx, gy - 36);
      ctx.lineTo(gx + 28, gy - 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.font = "11px Special Elite, monospace";
      ctx.textAlign = "center";
      ctx.fillText("RENGASDENGKLOK", gx, gy + 52);
    }

    // patrol vision then bodies
    patrols.forEach(drawVisionCone);
    patrols.forEach((p) => {
      const sx = p.x - cam.x;
      const sy = p.y - cam.y;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.angle);
      // body
      ctx.fillStyle = "#3d5a73";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // head direction
      ctx.fillStyle = "#5a84a6";
      ctx.beginPath();
      ctx.arc(8, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // leaders (Soekarno-Hatta)
    {
      const lx = leaders.x - cam.x;
      const ly = leaders.y - cam.y;
      ctx.beginPath();
      ctx.arc(lx, ly, leaders.r, 0, Math.PI * 2);
      ctx.fillStyle = "#f3eee1";
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S+H", lx, ly);
    }

    // player (youth)
    {
      const px = player.x - cam.x;
      const py = player.y - cam.y;
      const hidden = inBush(player.x, player.y);
      ctx.beginPath();
      ctx.arc(px, py, player.r, 0, Math.PI * 2);
      ctx.fillStyle = hidden ? "rgba(200, 16, 46, 0.55)" : RED;
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (hidden) {
        ctx.fillStyle = "rgba(234, 200, 115, 0.8)";
        ctx.font = "9px Special Elite, monospace";
        ctx.textAlign = "center";
        ctx.fillText("SEMBUNYI", px, py - player.r - 10);
      }
    }

    // particles
    particles.forEach((pt) => {
      ctx.globalAlpha = Math.max(0, pt.life / 50);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - cam.x, pt.y - cam.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // HUD vignette + alert
    if (spottedFlash > 0) {
      ctx.fillStyle = `rgba(200, 16, 46, ${0.25 * (spottedFlash / 40)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // controls hint
    ctx.fillStyle = "rgba(243, 238, 225, 0.45)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "left";
    const isId = !(PJ.I18N && PJ.I18N.getLang() === "en");
    ctx.fillText(
      isId ? "WASD / panah / sentuh-seret · Semak = sembunyi" : "WASD / arrows / drag · Bushes = hide",
      16,
      H - 18
    );

    if (startSafe > 0) {
      ctx.fillStyle = "rgba(234, 200, 115, 0.85)";
      ctx.font = "13px Special Elite, monospace";
      ctx.textAlign = "center";
      ctx.fillText(isId ? "Berangkat diam-diam…" : "Move out quietly…", W / 2, 28);
    }
  }

  function loop() {
    if (!active) return;
    update();
    render();
    rafId = requestAnimationFrame(loop);
  }

  function open(opts) {
    ensureDom();
    onCompleteCb = (opts && opts.onComplete) || function () {};
    completed = false;
    if (orbsLayer) orbsLayer.innerHTML = "";
    if (completePanel) completePanel.hidden = true;

    const isId = !(PJ.I18N && PJ.I18N.getLang() === "en");
    if (headingEl) headingEl.textContent = "Rengasdengklok · 16 Agustus 1945";
    if (hintEl)
      hintEl.textContent = isId
        ? "Kawal Soekarno & Hatta ke rumah aman. Hindari sinar patroli. Semak melindungi."
        : "Escort Soekarno & Hatta to the safe house. Avoid patrol lights. Bushes hide you.";

    overlay.hidden = false;
    overlay.classList.add("is-open");
    active = true;
    configure();
    resetWorld();
    keys = Object.create(null);
    touchId = null;
    touchVec = { x: 0, y: 0 };

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function close(didComplete) {
    active = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (overlay) {
      overlay.classList.remove("is-open");
      overlay.hidden = true;
    }
    if (completePanel) completePanel.hidden = true;
    if (didComplete && typeof onCompleteCb === "function") {
      onCompleteCb();
    }
  }

  return { open, close };
})();
