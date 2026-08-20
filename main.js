/* ==========================================================================
   PERJUANGAN — main.js  (v2.1 — bulletproof entrance click/touch)
   ========================================================================== */

(function () {
  window.PJ = window.PJ || {};
  PJ.devMode = false;

  const screens = {
    entrance1: document.getElementById("entrance1"),
    entrance2: document.getElementById("entrance2"),
    mainMap: document.getElementById("mainMap"),
  };

  let flagInstance = null;
  let advancedFromE1 = false;
  let mapInitialized = false;

  function goTo(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (key === name) {
        el.hidden = false;
        void el.offsetWidth;
        requestAnimationFrame(() => el.classList.add("is-active"));
      } else {
        el.classList.remove("is-active");
      }
    });
  }

  // ---------- Entrance 1 ----------
  function initEntrance1() {
    const canvas = document.getElementById("flagCanvas");
    try {
      flagInstance = PJ.FlagCloth(canvas);
    } catch (err) {
      console.warn("[PERJUANGAN] flag animation failed to start:", err);
      flagInstance = null;
    }

    const bg = screens.entrance1;
    const flagWrap = document.getElementById("flagWrap");
    const textBlock = document.getElementById("e1Text");
    const hint = document.getElementById("e1Hint");
    const hit = document.getElementById("e1Hit");

    requestAnimationFrame(() => bg.classList.add("bg-in"));
    setTimeout(() => {
      flagWrap.classList.add("is-in");
      if (flagInstance) flagInstance.start();
    }, 300);
    setTimeout(() => textBlock.classList.add("is-in"), 1000);
    setTimeout(() => hint.classList.add("is-in"), 1600);

    const advance = (e) => {
      if (advancedFromE1) return;
      if (e && e.type === "keydown") {
        if (e.key !== " " && e.key !== "Enter" && e.code !== "Space") return;
      }
      // only primary pointer
      if (e && typeof e.isPrimary === "boolean" && !e.isPrimary) return;

      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      advancedFromE1 = true;
      console.log("[PERJUANGAN] Entrance 1 advanced via", e ? e.type : "unknown");
      leaveEntrance1();
    };

    // Bind to the dedicated full-screen hit button (most reliable)
    if (hit) {
      hit.addEventListener("pointerup", advance, { passive: false });
      hit.addEventListener("click", advance);
      hit.addEventListener("touchend", advance, { passive: false });
    }
    // Also bind to the section itself as backup
    screens.entrance1.addEventListener("pointerup", advance, { passive: false });
    screens.entrance1.addEventListener("click", advance);

    document.addEventListener("keydown", advance, true);

    screens.entrance1._advanceHandler = advance;
    screens.entrance1._hitEl = hit;
  }

  function leaveEntrance1() {
    screens.entrance1.classList.add("is-leaving");
    setTimeout(() => {
      if (flagInstance) flagInstance.stop();
      const h = screens.entrance1._advanceHandler;
      const hit = screens.entrance1._hitEl;
      if (h) {
        document.removeEventListener("keydown", h, true);
        screens.entrance1.removeEventListener("pointerup", h);
        screens.entrance1.removeEventListener("click", h);
        if (hit) {
          hit.removeEventListener("pointerup", h);
          hit.removeEventListener("click", h);
          hit.removeEventListener("touchend", h);
        }
      }
      screens.entrance1.hidden = true;
      goTo("entrance2");
    }, 700);
  }

  // ---------- Entrance 2 ----------
  function initEntrance2() {
    const ctaBtn = document.getElementById("ctaEnterMap");
    if (!ctaBtn) return;
    ctaBtn.style.pointerEvents = "auto";
    ctaBtn.style.position = "relative";
    ctaBtn.style.zIndex = "10";

    const goMap = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      screens.entrance2.classList.add("is-leaving");
      setTimeout(() => {
        screens.entrance2.hidden = true;
        goTo("mainMap");
        if (!mapInitialized) {
          PJ.MapController.init();
          mapInitialized = true;
        }
      }, 650);
    };
    ctaBtn.addEventListener("pointerup", goMap, { passive: false });
    ctaBtn.addEventListener("click", goMap);
    ctaBtn.addEventListener("touchend", goMap, { passive: false });
  }

  // ---------- Hidden dev toggle ----------
  function initDevToggle() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        PJ.devMode = !PJ.devMode;
        const badge = document.getElementById("devBadge");
        if (badge) badge.hidden = !PJ.devMode;
        console.log(`[PERJUANGAN] dev mode ${PJ.devMode ? "ON" : "OFF"}`);
        document.dispatchEvent(new CustomEvent("pj:devmodechange"));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEntrance1();
    initEntrance2();
    initDevToggle();
    goTo("entrance1");
  });
})();
