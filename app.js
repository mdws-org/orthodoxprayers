// Theme toggle + measured drop cap. ES module, deferred by default.
import { prepare, layout } from "./vendor/pretext.js";

/* ---- Theme: one button toggling day <-> night ------------------------
   There is no "system" position on the button. A visitor with no stored
   choice follows the system, which is what theme.js leaves alone; the first
   click stores an explicit choice. The glyph lives in prayers.css so it is
   right before this module runs. */
const LABEL = { day: "Switch to night", night: "Switch to day" };

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
        if (next === systemTheme()) {
            // The tap lands back on what the system already shows: return to
            // follow-the-system silently instead of pinning an override that
            // happens to match it today.
            delete document.documentElement.dataset.theme;
            try { localStorage.removeItem("prayers-theme"); } catch (e) {}
        } else {
            document.documentElement.dataset.theme = next;
            try { localStorage.setItem("prayers-theme", next); } catch (e) {}
        }
        describe(themeBtn);
    });
    // Still following the system? Then keep the label honest if it changes.
    if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            if (!document.documentElement.dataset.theme) describe(themeBtn);
        });
    }
}

/* ---- Install hint (index only, phones and tablets only) --------------
   One line at the bottom of the page, in flow. Shown only on a device that
   has a home screen to add to, and only when the page is not already running
   standalone. A tap removes the element outright -- removal, not hiding, so
   the layout returns to exactly its pre-hint state -- and stores the
   dismissal for good. iOS has no install API (Safari lacks
   beforeinstallprompt), so the most a hint can do there is name the
   gesture. iPadOS reports itself as a Mac, hence the touch-point check. */
const hint = document.getElementById("install-hint");
if (hint) {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) ||
        (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const mobile = ios || /Android/.test(ua);
    const standalone =
        (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
        window.navigator.standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem("prayers-hint") === "dismissed"; } catch (e) {}
    if (mobile && !standalone && !dismissed) {
        hint.textContent = ios
            ? "Read offline: tap Share, then Add to Home Screen"
            : "Read offline: tap Menu, then Add to Home Screen";
        const dismiss = document.createElement("span");
        dismiss.textContent = "(tap to dismiss)";
        hint.appendChild(dismiss);
        hint.hidden = false;
        hint.addEventListener("click", () => {
            hint.remove();
            try { localStorage.setItem("prayers-hint", "dismissed"); } catch (e) {}
        });
    } else {
        hint.remove();
    }
}

/* ---- Opening word: drop cap + small-caps run-in ---------------------- */
// The printed books run the rest of the first word in small caps after the
// initial ("T HROUGH", "R ISING"). When the first word is a single letter
// ("O", "I"), the run-in extends through the following word ("O GOD").
// Trailing punctuation stays in ordinary type.
function markRunIn() {
    const p = document.querySelector(".prayer p.opening");
    if (!p || p.querySelector(".runin")) return;
    const node = p.firstChild;
    if (!node || node.nodeType !== 3) return;
    const text = node.nodeValue;
    const m = text.match(/^(\s*)(\S+)(\s+)(\S+)?/);
    if (!m) return;
    const capEnd = m[1].length + 1;
    let runEnd = m[1].length + m[2].length;
    if (m[2].length === 1 && m[4]) runEnd = m[1].length + m[2].length + m[3].length + m[4].length;
    while (runEnd > capEnd && /[,.;:!?'"\u2019\u201d]/.test(text[runEnd - 1])) runEnd--;
    if (runEnd <= capEnd) return;
    const span = document.createElement("span");
    span.className = "runin";
    span.textContent = text.slice(capEnd, runEnd);
    const rest = document.createTextNode(text.slice(runEnd));
    node.nodeValue = text.slice(0, capEnd);
    p.insertBefore(span, node.nextSibling);
    p.insertBefore(rest, span.nextSibling);
}
markRunIn();

/* ---- Drop cap: size the cap to span whole lines exactly -------------- */
// The CSS ::first-letter float is the no-JS baseline. Here we measure the
// real loaded font (canvas metrics for the cap glyph; Pretext layout() for
// the paragraph) and set --cap-size/--cap-pad so the cap's height equals an
// exact number of text lines: 3 when the opening paragraph runs at least 3
// lines beside the cap, 2 otherwise (narrow screens). Pretext's layout() is
// what answers "how many lines will this paragraph occupy at this width"
// without touching the DOM.
function fitDropCap() {
    const p = document.querySelector(".prayer p.opening");
    if (!p) return;
    const cs = getComputedStyle(p);
    const fontPx = parseFloat(cs.fontSize);
    const lineH = parseFloat(cs.lineHeight);
    const family = cs.fontFamily;
    const font = `${cs.fontWeight} ${fontPx}px ${family}`;

    const text = p.textContent;
    const capChar = text.trimStart().charAt(0);

    // Cap glyph metrics at a probe size.
    const ctx = document.createElement("canvas").getContext("2d");
    const PROBE = 100;
    ctx.font = `500 ${PROBE}px ${family}`;
    const m = ctx.measureText(capChar);
    const capHeightAtProbe =
        (m.actualBoundingBoxAscent || PROBE * 0.7) +
        (m.actualBoundingBoxDescent || 0);

    // Body cap height (an "O" of the text) -- the cap's top should align with
    // the first line's cap top, its bottom with the Nth baseline.
    ctx.font = font;
    const bm = ctx.measureText("O");
    const bodyCapH = bm.actualBoundingBoxAscent || fontPx * 0.7;

    const width = p.getBoundingClientRect().width;
    let lines = 3;
    // Ask Pretext how many lines the paragraph runs beside a 3-line cap; if
    // fewer, drop to a 2-line cap. (Cap width estimated at target size.)
    try {
        const targetH3 = (3 - 1) * lineH + bodyCapH;
        const capW3 = m.width * (targetH3 / capHeightAtProbe);
        const prepared = prepare(text.slice(1), font);
        const beside = layout(prepared, Math.max(60, width - capW3 - 12), lineH);
        if (beside.lineCount < 3) lines = 2;
    } catch (e) { /* keep 3-line default */ }

    const targetH = (lines - 1) * lineH + bodyCapH;
    const capPx = PROBE * (targetH / capHeightAtProbe);
    p.style.setProperty("--cap-size", (capPx / fontPx).toFixed(3) + "em");
    p.style.setProperty("--cap-pad", "0.02em 0.14em 0 0");
}

/* ---- Masthead: daily-rotating ornament bar ---------------------------- */
// A small curated subset of Orthodox Illustration Project bars. The pick is
// seeded by the calendar day (plus a per-page offset from data-rotate), so
// every visitor sees the same bar on a given day, pages differ from each
// other, and the ornament turns over at midnight. The static src in the HTML
// is the no-JS fallback.
const BARS = [
    ["bar2", 2816, 477],
    ["bar8", 2741, 418],
    ["bar12", 4371, 718],
    ["bar13", 5087, 647],
    ["bar19", 2243, 479],
    ["bar20", 2556, 565],
];
const masthead = document.querySelector(".ornament[data-rotate]");
if (masthead) {
    const day = Math.floor(Date.now() / 864e5);
    const offset = parseInt(masthead.dataset.rotate, 10) || 0;
    const [name, w, h] = BARS[(day + offset) % BARS.length];
    masthead.src = "/art/bars/" + name + ".svg";
    masthead.width = w;
    masthead.height = h;
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
