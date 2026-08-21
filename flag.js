/* ==========================================================================
   PERJUANGAN — flag.js v2.5
   Sang Saka Merah Putih — official ratio 3:2 (width:height).
   Fabric always 3:2; container only provides the drawing box.
   ========================================================================== */

window.PJ = window.PJ || {};

PJ.FlagCloth = function (canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });

  let dpr = 1;
  let cols = 16;
  let rows = 10;
  let W = 300; // fabric width (CSS px)
  let H = 200; // fabric height = W * 2/3
  let viewW = 400;
  let viewH = 280;
  let running = false;
  let rafId = null;
  let startTime = 0;

  const RED = { r: 200, g: 16, b: 46 };
  const WHITE = { r: 245, g: 241, b: 232 };
  const FLAG_RATIO = 3 / 2; // official W/H

  function isMobile() {
    return window.innerWidth < 720;
  }

  function configure() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;

    // Never lock parent with inline sizes — CSS owns the box
    if (parent) {
      parent.style.removeProperty("width");
      parent.style.removeProperty("height");
      delete parent.dataset.flagSized;
    }

    let pw = 0;
    let ph = 0;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      pw = rect.width;
      ph = rect.height;
    }

    // Fallback if layout not ready (hidden / first frame)
    if (pw < 40 || ph < 40) {
      pw = Math.min(window.innerWidth * 0.85, 560);
      ph = pw / 1.2; // match CSS aspect-ratio 6/5
    }

    viewW = pw;
    viewH = ph;

    const bw = Math.max(1, Math.round(pw * dpr));
    const bh = Math.max(1, Math.round(ph * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fit 3:2 fabric inside the box with room for pole (top) + shadow (bottom)
    // Vertical pack: pole top 0.12H + fabric H + shadow ~0.18H ≈ 1.30H
    const marginX = Math.max(8, pw * 0.04);
    const marginY = Math.max(6, ph * 0.04);
    const availW = pw - marginX * 2;
    const availH = ph - marginY * 2;

    const maxWByWidth = availW * 0.94;
    const maxWByHeight = (availH / 1.3) * FLAG_RATIO;
    W = Math.min(maxWByWidth, maxWByHeight, 620);
    W = Math.max(120, W);
    H = W / FLAG_RATIO; // strict 3:2

    cols = isMobile() ? 12 : 18;
    rows = isMobile() ? 8 : 12; // even → red/white exact half
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

    // Center composition; offset for pole sitting on the left of the cloth
    const packH = H * 1.3;
    const anchorX = (viewW - W) * 0.5 + 4;
    const anchorY = (viewH - packH) * 0.5 + H * 0.12;
    const sway = Math.sin(t * 0.55) * 3.5;

    ctx.save();
    ctx.translate(anchorX + sway * 0.12, anchorY);

    // Soft ground shadow
    ctx.save();
    ctx.translate(6, H * 0.1);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(W * 0.48, H * 0.55, W * 0.42, H * 0.15, 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const amp1 = H * 0.05;
    const amp2 = H * 0.025;
    const colOffset = [];
    const colScale = [];
    for (let i = 0; i <= cols; i++) {
      const dist = i / cols;
      const phase1 = i * 0.55 - t * 1.8;
      const phase2 = i * 1.15 - t * 2.6 + 1.2;
      colOffset[i] = (Math.sin(phase1) * amp1 + Math.sin(phase2) * amp2) * dist;
      colScale[i] = 1 - 0.04 * dist * (1 - Math.cos(phase1)) * 0.5;
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

    const half = rows / 2;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p0 = verts[j][i];
        const p1 = verts[j][i + 1];
        const p2 = verts[j + 1][i + 1];
        const p3 = verts[j + 1][i];
        const base = j < half ? RED : WHITE;
        const slope =
          (colOffset[Math.min(i + 1, cols)] - colOffset[i]) / (amp1 + amp2 + 0.001);
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
    ctx.arc(-3, -H * 0.12, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    rafId = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    startTime = performance.now();
    configure();
    // Re-measure after layout settles
    requestAnimationFrame(() => {
      configure();
      requestAnimationFrame(() => configure());
    });
    setTimeout(() => configure(), 150);
    setTimeout(() => configure(), 500);
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
