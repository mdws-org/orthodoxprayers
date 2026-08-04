// Theme cycling + measured drop cap. ES module, deferred by default.
import { prepare, layout } from "./vendor/pretext.js";

/* ---- Theme: one button toggling day <-> night ------------------------
   There is no "system" position on the button. A visitor with no stored
   choice follows the system, which is what theme.js leaves alone; the first
   click stores an explicit choice. The glyph lives in prayers.css so it is
   right before this module runs. */
const LABEL = { day: "Theme: day (parchment)", night: "Theme: night (vigil)" };

function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "night"
        : "day";
}
// What the reader is actually looking at: an explicit choice, else the system.
function effectiveTheme() {
    const t = document.documentElement.dataset.theme;
    return t === "day" || t === "night" ? t : systemTheme();
}
function describe(btn) {
    const label = LABEL[effectiveTheme()];
    btn.setAttribute("aria-label", label);
    btn.title = label;
}
const themeBtn = document.getElementById("theme");
if (themeBtn) {
    describe(themeBtn);
    themeBtn.addEventListener("click", () => {
        const next = effectiveTheme() === "night" ? "day" : "night";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("prayers-theme", next); } catch (e) {}
        describe(themeBtn);
    });
    // Still following the system? Then keep the label honest if it changes.
    if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            if (!document.documentElement.dataset.theme) describe(themeBtn);
        });
    }
}

/* ---- Install hint (index only) ---------------------------------------
   One line at the bottom of the page, in flow. Shown only when the page is
   not already running standalone; a tap dismisses it permanently. iOS has no
   install API (Safari lacks beforeinstallprompt), so the most a hint can do
   there is name the gesture. */
const hint = document.getElementById("install-hint");
if (hint) {
    const standalone =
        (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
        window.navigator.standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem("prayers-hint") === "dismissed"; } catch (e) {}
    if (!standalone && !dismissed) {
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        hint.textContent = ios
            ? "This book can live on your home screen: tap Share, then Add to Home Screen. (tap to dismiss)"
            : "This book can live on your home screen and reads offline. (tap to dismiss)";
        hint.hidden = false;
        hint.addEventListener("click", () => {
            hint.hidden = true;
            try { localStorage.setItem("prayers-hint", "dismissed"); } catch (e) {}
        });
    }
}

/* ---- Psalter: today's kathisma --------------------------------------- */
// Day-of-month rule: kathisma 1 on the 1st through kathisma 20 on the 20th,
// wrapping on the 21st. Highlights the entry and fills the pointer line.
const todayLine = document.getElementById("today-line");
if (todayLine) {
    const dom = new Date().getDate();
    const k = ((dom - 1) % 20) + 1;
    const link = document.querySelector(`.toc a[data-kathisma="${k}"]`);
    if (link) {
        document.getElementById("today-day").textContent = String(dom);
        document.getElementById("today-name").textContent = link.textContent.toLowerCase();
        document.getElementById("today-link").href = link.getAttribute("href");
        todayLine.hidden = false;
        link.style.color = "var(--rubric)";
    }
}

/* ---- PWA ------------------------------------------------------------- */
if ("serviceWorker" in navigator) {
    // Absolute path: this module is loaded from subpages too, and a relative
    // "./sw.js" would resolve against the page URL, not this file's.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
}
