/* ==========================================================================
   PERJUANGAN — main.js
   Flow: E1 → E2 → Mode Select → Learn | Game
   Language switcher + i18n refresh
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
        void el.offsetWidth;
        requestAnimationFrame(() => el.classList.add("is-active"));
      } else {
        el.classList.remove("is-active");
        // keep hidden after leave animation for non-active
        if (key !== name) {
          setTimeout(() => {
            if (!el.classList.contains("is-active")) el.hidden = true;
          }, 700);
        }
      }
    });
  }

  function applyI18nDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = PJ.I18N.t(key);
    });
    // lang button labels show the *other* language
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

  // ---------- Entrance 1 ----------
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
      screens.entrance1.hidden = true;
      goTo("entrance2");
      applyI18nDOM();
    }, 700);
  }

  // ---------- Entrance 2 → Mode Select ----------
  function initEntrance2() {
    const btn = document.getElementById("ctaContinue");
    if (!btn) return;
    const go = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      screens.entrance2.classList.add("is-leaving");
      setTimeout(() => {
        screens.entrance2.hidden = true;
        goTo("modeSelect");
        applyI18nDOM();
      }, 650);
    };
    ["pointerup", "click", "touchend"].forEach((evt) => {
      btn.addEventListener(evt, go, { passive: false });
    });
  }

  // ---------- Mode select ----------
  function initModeSelect() {
    const learnBtn = document.getElementById("btnModeLearn");
    const gameBtn = document.getElementById("btnModeGame");

    const enterLearn = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      screens.modeSelect.classList.add("is-leaving");
      setTimeout(() => {
        screens.modeSelect.hidden = true;
        goTo("learnMode");
        if (!learnInitialized) {
          PJ.LearnController.init();
          learnInitialized = true;
        } else {
          PJ.LearnController.applyI18n();
        }
        applyI18nDOM();
      }, 500);
    };

    const enterGame = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      screens.modeSelect.classList.add("is-leaving");
      setTimeout(() => {
        screens.modeSelect.hidden = true;
        goTo("mainMap");
        if (!mapInitialized) {
          PJ.MapController.init();
          mapInitialized = true;
        } else if (PJ.MapController.applyI18n) {
          PJ.MapController.applyI18n();
        }
        applyI18nDOM();
      }, 500);
    };

    ["pointerup", "click", "touchend"].forEach((evt) => {
      if (learnBtn) learnBtn.addEventListener(evt, enterLearn, { passive: false });
      if (gameBtn) gameBtn.addEventListener(evt, enterGame, { passive: false });
    });

    // Back to mode select
    const learnBack = document.getElementById("learnBackBtn");
    const gameBack = document.getElementById("gameBackBtn");
    const back = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      goTo("modeSelect");
      applyI18nDOM();
    };
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
