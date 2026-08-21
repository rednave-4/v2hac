/* ==========================================================================
   PERJUANGAN — flag.js v2.3
   Cloth flag. Never depends on parent being visible at construct time.
   Uses window-based fallback size so W/H are never 0.
   ========================================================================== */

window.PJ = window.PJ || {};

PJ.FlagCloth = function (canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });

  let dpr = 1;
  let cols = 16;
  let rows = 10;
  let W = 320;
  let H = 213;
  let viewW = 400;
  let viewH = 280;
  let running = false;
  let rafId = null;
  let startTime = 0;

  const RED = { r: 200, g: 16, b: 46 };
  const WHITE = { r: 245, g: 241, b: 232 };

  function isMobile() {
    return window.innerWidth < 720;
  }

  function configure() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const parent = canvas.parentElement;
    let pw = 0;
    let ph = 0;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      pw = rect.width;
      ph = rect.height;
    }

    // Fallback when parent not laid out yet (hidden screen, flex not settled)
    if (pw < 32 || ph < 32) {
      pw = Math.min(window.innerWidth * 0.78, 640);
      ph = Math.min(window.innerWidth * 0.42, 340);
      if (pw < 32) pw = 320;
      if (ph < 32) ph = 213;
      // Apply explicit size on parent so absolute canvas has a box
      if (parent) {
        parent.style.width = pw + "px";
        parent.style.height = ph + "px";
      }
    }

    viewW = pw;
    viewH = ph;

    canvas.width = Math.max(1, Math.round(pw * dpr));
    canvas.height = Math.max(1, Math.round(ph * dpr));
    canvas.style.width = pw + "px";
    canvas.style.height = ph + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const maxW = Math.min(pw * 0.78, 560);
    W = Math.max(120, maxW);
    H = W * (2 / 3);
    cols = isMobile() ? 12 : 16;
    rows = isMobile() ? 8 : 10; // even → exact red/white half
    return true;
  }

  function shade(base, factor) {
    const f = Math.max(-1, Math.min(1, factor));
    const mix = f >= 0 ? 255 : 0;
    const amt = Math.abs(f) * (f >= 0 ? 0.28 : 0.35);
    return (
      "rgb(" +
      Math.round(base.r + (mix - base.r) * amt) +
      "," +
      Math.round(base.g + (mix - base.g) * amt) +
      "," +
      Math.round(base.b + (mix - base.b) * amt) +
      ")"
    );
  }

  function render(now) {
    if (!running) return;
    const t = ((now || performance.now()) - startTime) / 1000;

    ctx.clearRect(0, 0, viewW, viewH);

    const anchorX = viewW * 0.16;
    const anchorY = viewH * 0.38;
    const sway = Math.sin(t * 0.55) * 4;

    ctx.save();
    ctx.translate(anchorX + sway * 0.15, anchorY);

    // Shadow
    ctx.save();
    ctx.translate(8, H * 0.12);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(W * 0.45, H * 0.55, W * 0.4, H * 0.16, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const amp1 = H * 0.055;
    const amp2 = H * 0.028;
    const colOffset = [];
    const colScale = [];
    for (let i = 0; i <= cols; i++) {
      const dist = i / cols;
      const phase1 = i * 0.55 - t * 1.8;
      const phase2 = i * 1.15 - t * 2.6 + 1.2;
      colOffset[i] = (Math.sin(phase1) * amp1 + Math.sin(phase2) * amp2) * dist;
      colScale[i] = 1 - 0.06 * dist * (1 - Math.cos(phase1)) * 0.5;
    }

    const verts = [];
    for (let j = 0; j <= rows; j++) {
      const row = [];
      for (let i = 0; i <= cols; i++) {
        row.push({
          x: (i / cols) * W * colScale[i],
          y: (j / rows) * H + colOffset[i],
        });
      }
      verts.push(row);
    }

    // rows must be even so red/white split is exact 50/50
    const half = rows / 2;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p0 = verts[j][i];
        const p1 = verts[j][i + 1];
        const p2 = verts[j + 1][i + 1];
        const p3 = verts[j + 1][i];
        const base = j < half ? RED : WHITE;
        const slope = (colOffset[Math.min(i + 1, cols)] - colOffset[i]) / (amp1 + amp2 + 0.001);
        ctx.fillStyle = shade(base, -slope * 0.8);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Pole
    ctx.fillStyle = "#8a6a2f";
    ctx.fillRect(-6, -H * 0.12, 6, H * 1.24);
    ctx.fillStyle = "#e8c468";
    ctx.beginPath();
    ctx.arc(-3, -H * 0.12, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    rafId = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    startTime = performance.now();
    configure();
    // Re-measure after a couple frames (layout may settle)
    requestAnimationFrame(() => {
      configure();
      requestAnimationFrame(() => configure());
    });
    setTimeout(() => configure(), 100);
    setTimeout(() => configure(), 400);
    setTimeout(() => configure(), 900);
    rafId = requestAnimationFrame(render);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  configure();
  window.addEventListener("resize", () => {
    configure();
  });

  return { start, stop, configure };
};
