/* ==========================================================================
   PERJUANGAN — main.js v2.2.1
   Flow: E1 → E2 → Mode Select → Learn | Game
   ========================================================================== */

(function () {
  window.PJ = window.PJ || {};
  PJ.devMode = false;

  const screens = {
    entrance1: document.getElementById("entrance1"),
    entrance2: document.getElementById("entrance2"),
    modeSelect: document.getElementById("modeSelect"),
    learnMode: document.getElementById("learnMode"),
    mainMap: document.getElementById("mainMap"),
  };

  let flagInstance = null;
  let advancedFromE1 = false;
  let mapInitialized = false;
  let learnInitialized = false;

  function goTo(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      if (key === name) {
        el.hidden = false;
        el.classList.remove("is-leaving");
        // force reflow then fade in
        void el.offsetWidth;
        requestAnimationFrame(() => {
          el.classList.add("is-active");
        });
      } else {
        el.classList.remove("is-active");
        el.classList.remove("is-leaving");
        el.hidden = true;
      }
    });
  }

  function applyI18nDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = PJ.I18N.t(key);
    });
    const other = PJ.I18N.getLang() === "id" ? "EN" : "ID";
    document.querySelectorAll(".lang-switch").forEach((btn) => {
      btn.textContent = other;
    });
  }

  function bindLangButtons() {
    ["langBtnE2", "langBtnMode", "langBtnLearn", "langBtnGame"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        PJ.I18N.toggle();
      });
    });
    document.addEventListener("pj:langchange", () => {
      applyI18nDOM();
      if (PJ.MapController && typeof PJ.MapController.applyI18n === "function") {
        PJ.MapController.applyI18n();
      }
      if (PJ.LearnController && typeof PJ.LearnController.applyI18n === "function") {
        PJ.LearnController.applyI18n();
      }
    });
  }

  function initEntrance1() {
    const canvas = document.getElementById("flagCanvas");
    try {
      flagInstance = PJ.FlagCloth(canvas);
    } catch (err) {
      console.warn("[PERJUANGAN] flag failed:", err);
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
      if (e && typeof e.isPrimary === "boolean" && !e.isPrimary) return;
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      advancedFromE1 = true;
      leaveEntrance1();
    };

    if (hit) {
      ["pointerup", "click", "touchend"].forEach((evt) => {
        hit.addEventListener(evt, advance, { passive: false });
      });
    }
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
          ["pointerup", "click", "touchend"].forEach((evt) => hit.removeEventListener(evt, h));
        }
      }
      goTo("entrance2");
      applyI18nDOM();
    }, 700);
  }

  function initEntrance2() {
    const btn = document.getElementById("ctaContinue");
    if (!btn) return;
    const go = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Direct switch — no race with overlapping timers
      goTo("modeSelect");
      applyI18nDOM();
      console.log("[PERJUANGAN] → mode select");
    };
    ["pointerup", "click", "touchend"].forEach((evt) => {
      btn.addEventListener(evt, go, { passive: false });
    });
  }

  function initModeSelect() {
    const learnBtn = document.getElementById("btnModeLearn");
    const gameBtn = document.getElementById("btnModeGame");

    const enterLearn = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      goTo("learnMode");
      if (!learnInitialized) {
        PJ.LearnController.init();
        learnInitialized = true;
      } else {
        PJ.LearnController.applyI18n();
      }
      applyI18nDOM();
      console.log("[PERJUANGAN] → learn mode");
    };

    const enterGame = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      goTo("mainMap");
      if (!mapInitialized) {
        PJ.MapController.init();
        mapInitialized = true;
      } else if (PJ.MapController.applyI18n) {
        PJ.MapController.applyI18n();
      }
      applyI18nDOM();
      console.log("[PERJUANGAN] → game mode");
    };

    ["pointerup", "click", "touchend"].forEach((evt) => {
      if (learnBtn) learnBtn.addEventListener(evt, enterLearn, { passive: false });
      if (gameBtn) gameBtn.addEventListener(evt, enterGame, { passive: false });
    });

    const back = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      goTo("modeSelect");
      applyI18nDOM();
    };
    const learnBack = document.getElementById("learnBackBtn");
    const gameBack = document.getElementById("gameBackBtn");
    if (learnBack) learnBack.addEventListener("click", back);
    if (gameBack) gameBack.addEventListener("click", back);
  }

  function initDevToggle() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        PJ.devMode = !PJ.devMode;
        const badge = document.getElementById("devBadge");
        if (badge) badge.hidden = !PJ.devMode;
        document.dispatchEvent(new CustomEvent("pj:devmodechange"));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyI18nDOM();
    bindLangButtons();
    initEntrance1();
    initEntrance2();
    initModeSelect();
    initDevToggle();
    goTo("entrance1");
  });
})();
