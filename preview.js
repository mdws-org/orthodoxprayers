// Typesetting proof switches for the beta preview (2026-11-08). Four choices
// left open by the review are set here on a phone and remembered across
// pages; the settled ones are already in prayers.css. This file and its
// import in app.js are removed before the change reaches main.

const SWITCHES = [
    { key: "w", label: "Weight", options: [["400", "400"], ["440", "440"]] },
    { key: "last", label: "Last lines", options: [["off", "As set"], ["pretty", "No lone word"]] },
    { key: "rule", label: "Night rules", options: [["now", "As now"], ["2", "Stronger"]] },
    { key: "caps", label: "Drop caps", options: [["page", "Per page"], ["prayer", "Per prayer"]] },
];

const CSS = `
:root[data-proof-w="440"] body { font-weight: 440; }
@media (max-width: 600px) {
    :root[data-proof-last="pretty"] .prayer p { text-wrap: pretty; }
}
:root[data-proof-rule="2"][data-theme="night"] { --rule: #4a453d; }
@media (prefers-color-scheme: dark) {
    :root[data-proof-rule="2"]:not([data-theme="day"]) { --rule: #4a453d; }
}
.proof-tab, .proof {
    position: fixed; left: 50%; bottom: max(0.6rem, env(safe-area-inset-bottom));
    transform: translateX(-50%); z-index: 10;
    font: inherit; font-size: 0.85rem; font-variant: small-caps; letter-spacing: 0.08em;
    color: var(--ink-soft); background: var(--bg);
    border: 1px solid var(--rule);
}
.proof-tab { padding: 0.35rem 0.9rem; min-height: 44px; cursor: pointer; }
.proof { width: min(22rem, calc(100% - 2rem)); padding: 0.7rem 0.9rem 0.5rem; }
.proof[hidden], .proof-tab[hidden] { display: none; }
.proof div { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.35rem; }
.proof span.name { flex: 1; }
.proof button {
    font: inherit; color: var(--ink-soft); background: none; cursor: pointer;
    border: 1px solid var(--rule); min-height: 44px; padding: 0 0.6rem;
}
.proof button[aria-pressed="true"] { color: var(--rubric); border-color: var(--rubric); }
.proof .done { display: block; margin: 0.4rem auto 0; border: none; }
@media print { .proof-tab, .proof { display: none; } }
`;

// Where a prayer starts, on the long services: the paragraph after a psalm or
// canon head (or the inscription under one), after an inscription, or after a
// rubric. Refrains, paragraphs that open on punctuation and paragraphs under
// three lines (a drop cap is two lines tall) are skipped.
const STARTS = [
    ".psalm-head + p", ".psalm-head + .inscription + p",
    ".canon-head + p", ".canon-head + .inscription + p",
    ".inscription + p", ".rubric-line + p",
].map((s) => ".prayer " + s).join(", ");

function prayerStarts() {
    return [...document.querySelectorAll(STARTS)].filter((p) => {
        if (p.classList.contains("opening") || p.classList.contains("refrain")) return false;
        if (!/^\s*[A-Za-z]/.test(p.textContent)) return false;
        const lh = parseFloat(getComputedStyle(p).lineHeight);
        return p.getBoundingClientRect().height >= 2.5 * lh;
    });
}

export default function proof({ markRunIn }) {
    const root = document.documentElement;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.append(style);

    const get = (k, d) => { try { return localStorage.getItem("proof-" + k) || d; } catch { return d; } };
    const set = (k, v) => { try { localStorage.setItem("proof-" + k, v); } catch { /* private mode */ } };

    const added = [];
    function apply() {
        for (const s of SWITCHES) root.dataset["proof" + s.key[0].toUpperCase() + s.key.slice(1)] = get(s.key, s.options[0][0]);
        for (const p of added.splice(0)) {
            p.classList.remove("opening");
            const run = p.querySelector(".runin");
            if (run) { run.replaceWith(run.textContent); p.normalize(); }
        }
        if (get("caps", "page") === "prayer") {
            for (const p of prayerStarts()) { p.classList.add("opening"); markRunIn(p); added.push(p); }
        }
    }

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "proof-tab";
    tab.textContent = "Proof";
    const panel = document.createElement("div");
    panel.className = "proof";
    panel.hidden = true;
    for (const s of SWITCHES) {
        const row = document.createElement("div");
        const name = document.createElement("span");
        name.className = "name";
        name.textContent = s.label;
        row.append(name);
        for (const [value, text] of s.options) {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = text;
            b.dataset.key = s.key;
            b.dataset.value = value;
            row.append(b);
        }
        panel.append(row);
    }
    const done = document.createElement("button");
    done.type = "button";
    done.className = "done";
    done.textContent = "Close";
    panel.append(done);

    function render() {
        for (const b of panel.querySelectorAll("button[data-key]")) {
            const s = SWITCHES.find((x) => x.key === b.dataset.key);
            b.setAttribute("aria-pressed", String(get(s.key, s.options[0][0]) === b.dataset.value));
        }
    }
    panel.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-key]");
        if (!b) return;
        set(b.dataset.key, b.dataset.value);
        apply();
        render();
    });
    tab.addEventListener("click", () => { panel.hidden = false; tab.hidden = true; render(); });
    done.addEventListener("click", () => { panel.hidden = true; tab.hidden = false; });

    document.body.append(tab, panel);
    if (document.fonts) document.fonts.ready.then(apply); else apply();
}
