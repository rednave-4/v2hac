/* ==========================================================================
   PERJUANGAN — main.js v2.2.2
   Simple, reliable screen flow. Inline onclick fallbacks on critical buttons.
   ========================================================================== */

(function () {
  window.PJ = window.PJ || {};
  PJ.devMode = false;

  const $ = (id) => document.getElementById(id);

  const screens = {
    entrance1: $("entrance1"),
    entrance2: $("entrance2"),
    modeSelect: $("modeSelect"),
    learnMode: $("learnMode"),
    mainMap: $("mainMap"),
  };

  let flagInstance = null;
  let advancedFromE1 = false;
  let mapInitialized = false;
  let learnInitialized = false;

  function hideAllScreens() {
    Object.values(screens).forEach((el) => {
      if (!el) return;
      el.classList.remove("is-active", "is-leaving");
      el.hidden = true;
      el.style.pointerEvents = "none";
    });
  }

  function goTo(name) {
    hideAllScreens();
    const el = screens[name];
    if (!el) return;
    el.hidden = false;
    el.style.pointerEvents = "auto";
    el.style.display = "flex";
    void el.offsetWidth;
    el.classList.add("is-active");
  }

  function applyI18nDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key && PJ.I18N) el.textContent = PJ.I18N.t(key);
    });
    if (!PJ.I18N) return;
    const other = PJ.I18N.getLang() === "id" ? "EN" : "ID";
    document.querySelectorAll(".lang-switch").forEach((btn) => {
      btn.textContent = other;
    });
  }

  function bindLangButtons() {
    ["langBtnE2", "langBtnMode", "langBtnLearn", "langBtnGame"].forEach((id) => {
      const btn = $(id);
      if (!btn) return;
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        PJ.I18N.toggle();
      };
    });
    document.addEventListener("pj:langchange", () => {
      applyI18nDOM();
      if (PJ.MapController && PJ.MapController.applyI18n) PJ.MapController.applyI18n();
      if (PJ.LearnController && PJ.LearnController.applyI18n) PJ.LearnController.applyI18n();
    });
  }

  /* ---------- Entrance 1 ---------- */
  function initEntrance1() {
    try {
      flagInstance = PJ.FlagCloth($("flagCanvas"));
    } catch (err) {
      console.warn("[PERJUANGAN] flag failed:", err);
    }

    const bg = screens.entrance1;
    const flagWrap = $("flagWrap");
    const textBlock = $("e1Text");
    const hint = $("e1Hint");

    requestAnimationFrame(() => bg.classList.add("bg-in"));
    setTimeout(() => {
      if (flagWrap) flagWrap.classList.add("is-in");
      if (flagInstance) flagInstance.start();
    }, 300);
    setTimeout(() => { if (textBlock) textBlock.classList.add("is-in"); }, 1000);
    setTimeout(() => { if (hint) hint.classList.add("is-in"); }, 1600);

    const advance = (e) => {
      if (advancedFromE1) return;
      if (e && e.type === "keydown") {
        if (e.key !== " " && e.key !== "Enter" && e.code !== "Space") return;
        e.preventDefault();
      }
      advancedFromE1 = true;
      if (flagInstance) flagInstance.stop();
      goTo("entrance2");
      applyI18nDOM();
      console.log("[PERJUANGAN] → entrance2");
    };

    // Click anywhere on entrance1 section
    screens.entrance1.addEventListener("click", advance);
    document.addEventListener("keydown", advance);
  }

  /* ---------- Global navigation (also used by inline onclick) ---------- */
  window.__pjGoMode = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    goTo("modeSelect");
    applyI18nDOM();
    console.log("[PERJUANGAN] → mode select");
  };

  window.__pjGoLearn = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    goTo("learnMode");
    if (!learnInitialized) {
      if (PJ.LearnController) PJ.LearnController.init();
      learnInitialized = true;
    } else if (PJ.LearnController && PJ.LearnController.applyI18n) {
      PJ.LearnController.applyI18n();
    }
    applyI18nDOM();
    console.log("[PERJUANGAN] → learn");
  };

  window.__pjGoGame = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    goTo("mainMap");
    if (!mapInitialized) {
      if (PJ.MapController) PJ.MapController.init();
      mapInitialized = true;
    } else if (PJ.MapController && PJ.MapController.applyI18n) {
      PJ.MapController.applyI18n();
    }
    applyI18nDOM();
    console.log("[PERJUANGAN] → game");
  };

  function initButtons() {
    const cta = $("ctaContinue");
    if (cta) {
      cta.onclick = window.__pjGoMode;
    }
    const learnBtn = $("btnModeLearn");
    if (learnBtn) learnBtn.onclick = window.__pjGoLearn;
    const gameBtn = $("btnModeGame");
    if (gameBtn) gameBtn.onclick = window.__pjGoGame;

    const learnBack = $("learnBackBtn");
    if (learnBack) {
      learnBack.onclick = (e) => {
        e.preventDefault();
        goTo("modeSelect");
        applyI18nDOM();
      };
    }
    const gameBack = $("gameBackBtn");
    if (gameBack) {
      gameBack.onclick = (e) => {
        e.preventDefault();
        goTo("modeSelect");
        applyI18nDOM();
      };
    }
  }

  function initDevToggle() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        PJ.devMode = !PJ.devMode;
        const badge = $("devBadge");
        if (badge) badge.hidden = !PJ.devMode;
        document.dispatchEvent(new CustomEvent("pj:devmodechange"));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyI18nDOM();
    bindLangButtons();
    initEntrance1();
    initButtons();
    initDevToggle();
    goTo("entrance1");
  });
})();
