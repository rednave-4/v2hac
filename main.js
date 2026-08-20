/* ==========================================================================
   PERJUANGAN — main.js
   Orchestrates the screen flow: Entrance 1 (flag splash) -> Entrance 2
   (credits) -> Main Map. Handles the flag cloth instance lifecycle and a
   hidden dev-mode toggle (Ctrl+Shift+D) for testing the unlock chain.
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

    requestAnimationFrame(() => bg.classList.add("bg-in"));
    setTimeout(() => {
      flagWrap.classList.add("is-in");
      if (flagInstance) flagInstance.start();
    }, 300);
    setTimeout(() => textBlock.classList.add("is-in"), 1000);
    setTimeout(() => hint.classList.add("is-in"), 1600);

    // Unified pointer + keyboard advance (pointerup covers mouse/touch/pen reliably)
    const advance = (e) => {
      if (advancedFromE1) return;

      if (e && e.type === "keydown") {
        if (e.key !== " " && e.key !== "Enter" && e.code !== "Space") return;
      }
      if (e && e.type && e.type.startsWith("pointer") && e.isPrimary === false) return;

      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      advancedFromE1 = true;
      leaveEntrance1();
    };

    document.addEventListener("keydown", advance, true);
    screens.entrance1.addEventListener("pointerup", advance, { passive: false });
    screens.entrance1.addEventListener("click", advance); // legacy fallback

    screens.entrance1._advanceHandler = advance;
  }

  function leaveEntrance1() {
    screens.entrance1.classList.add("is-leaving");
    setTimeout(() => {
      if (flagInstance) flagInstance.stop();
      const h = screens.entrance1._advanceHandler;
      if (h) {
        document.removeEventListener("keydown", h, true);
        screens.entrance1.removeEventListener("pointerup", h);
        screens.entrance1.removeEventListener("click", h);
      }
      screens.entrance1.hidden = true;
      goTo("entrance2");
    }, 700);
  }

  // ---------- Entrance 2 ----------
  function initEntrance2() {
    const ctaBtn = document.getElementById("ctaEnterMap");
    ctaBtn.style.pointerEvents = "auto";
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
