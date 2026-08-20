/* ==========================================================================
   PERJUANGAN — flag.js
   Cloth-like Indonesian flag on Canvas 2D mesh.
   Re-configures when parent size was 0 at init (common when screen starts hidden).
   ========================================================================== */

window.PJ = window.PJ || {};

PJ.FlagCloth = function (canvas, opts) {
  opts = opts || {};
  const ctx = canvas.getContext("2d");

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cols = 16;
  let rows = 10;
  let W = 0;
  let H = 0;
  let running = false;
  let rafId = null;
  let startTime = performance.now();

  const RED = { r: 200, g: 16, b: 46 };
  const WHITE = { r: 245, g: 241, b: 232 };

  function isMobile() {
    return window.innerWidth < 720;
  }

  function configure() {
    const parent = canvas.parentElement;
    if (!parent) return false;
    const rect = parent.getBoundingClientRect();
    // Parent still hidden / not laid out
    if (rect.width < 8 || rect.height < 8) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const maxW = Math.min(rect.width * 0.72, 560);
    W = maxW;
    H = maxW * (2 / 3);
    cols = isMobile() ? 10 : 16;
    rows = isMobile() ? 6 : 10;
    return true;
  }

  function shade(base, factor) {
    const f = Math.max(-1, Math.min(1, factor));
    const mix = f >= 0 ? 255 : 0;
    const amt = Math.abs(f) * (f >= 0 ? 0.28 : 0.35);
    const r = Math.round(base.r + (mix - base.r) * amt);
    const g = Math.round(base.g + (mix - base.g) * amt);
    const b = Math.round(base.b + (mix - base.b) * amt);
    return `rgb(${r},${g},${b})`;
  }

  function render(now) {
    if (!running) return;

    // If we still have no valid size, keep trying to measure
    if (W < 8 || H < 8) {
      configure();
      rafId = requestAnimationFrame(render);
      return;
    }

    const t = (now - startTime) / 1000;
    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: W, height: H };

    // Parent grew after first layout (e.g. font load / flex settle)
    if (rect.width >= 8 && Math.abs(rect.width - canvas.clientWidth) > 2) {
      configure();
    }

    ctx.clearRect(0, 0, rect.width || canvas.clientWidth, rect.height || canvas.clientHeight);

    const anchorX = (rect.width || canvas.clientWidth) * 0.18;
    const anchorY = (rect.height || canvas.clientHeight) * 0.42;

    const sway = Math.sin(t * 0.55) * 4;
    ctx.save();
    ctx.translate(anchorX + sway * 0.15, anchorY);

    // Soft shadow under cloth
    ctx.save();
    ctx.translate(10, H * 0.15);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(W * 0.45, H * 0.55, W * 0.42, H * 0.18, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const amp1 = H * 0.055;
    const amp2 = H * 0.028;
    const freq1 = 0.55;
    const freq2 = 1.15;
    const speed1 = 1.8;
    const speed2 = 2.6;

    const colOffset = [];
    const colScale = [];
    for (let i = 0; i <= cols; i++) {
      const distFactor = i / cols;
      const phase1 = i * freq1 - t * speed1;
      const phase2 = i * freq2 - t * speed2 + 1.2;
      const w1 = Math.sin(phase1) * amp1;
      const w2 = Math.sin(phase2) * amp2;
      colOffset[i] = (w1 + w2) * distFactor;
      colScale[i] = 1 - 0.06 * distFactor * (1 - Math.cos(phase1)) * 0.5;
    }

    const verts = [];
    for (let j = 0; j <= rows; j++) {
      const row = [];
      for (let i = 0; i <= cols; i++) {
        const baseX = (i / cols) * W * colScale[i];
        const baseY = (j / rows) * H;
        row.push({ x: baseX, y: baseY + colOffset[i] });
      }
      verts.push(row);
    }

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p0 = verts[j][i];
        const p1 = verts[j][i + 1];
        const p2 = verts[j + 1][i + 1];
        const p3 = verts[j + 1][i];
        const base = j < rows / 2 ? RED : WHITE;
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
    running = true;
    startTime = performance.now();
    // Measure after layout — retry a few frames if still 0
    let tries = 0;
    function tryStart() {
      if (configure() || tries > 30) {
        if (W < 8) configure();
        rafId = requestAnimationFrame(render);
        return;
      }
      tries += 1;
      requestAnimationFrame(tryStart);
    }
    tryStart();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Initial attempt (may fail if parent hidden — start() will retry)
  configure();
  window.addEventListener("resize", () => {
    configure();
  });

  return { start, stop, configure };
};
