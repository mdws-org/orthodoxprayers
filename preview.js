// Justification proof switches for the beta preview (2026-11-13). Sets the
// prayer prose five ways so the choice can be made on a phone: ragged as
// live, justified by CSS alone, and three settings of the justif library
// (vendor/justif, v0.9.2), which chooses line breaks for a whole paragraph.
// This file, vendor/justif and the import in app.js are removed before
// anything reaches main.

const SWITCHES = [
    { key: "prose", label: "Prose", options: [["ragged", "Ragged"], ["css", "CSS"], ["lib", "Full"], ["lib80", "Spaces 80%"], ["lib2", "Light"]] },
    { key: "hang", label: "Hanging punctuation", options: [["on", "On"], ["off", "Off"]] },
];

// What each library setting allows. tracking is the share of a line's width
// that letter-spacing may add or remove; shrink is how far a word space may
// close (0.2 = down to 80% of the font's space).
const LIB = {
    lib: { tracking: 0.03, shrink: 1 / 3 },
    lib80: { tracking: 0.03, shrink: 0.2 },
    lib2: { tracking: 0.02, shrink: 0.2 },
};

const CSS = `
@media (max-width: 600px) {
    :root:not([data-proof-prose="ragged"]) .prayer p { text-align: justify; }
    :root[data-proof-prose="css"] .prayer p {
        word-spacing: -0.05em;
        hanging-punctuation: first allow-end;
        -webkit-hyphenate-limit-lines: 2;
    }
    :root:not([data-proof-prose="ragged"]) .prayer .prayer.indented p,
    :root:not([data-proof-prose="ragged"]) .prayer .verse p { text-align: left; word-spacing: normal; }
}
:root[data-proof-prose="css"][data-proof-hang="off"] .prayer p { hanging-punctuation: none; }
.proof-tab, .proof {
    position: fixed; left: 50%; bottom: max(0.6rem, env(safe-area-inset-bottom));
    transform: translateX(-50%); z-index: 10;
    font: inherit; font-size: 0.85rem; font-variant: small-caps; letter-spacing: 0.08em;
    color: var(--ink-soft); background: var(--bg);
    border: 1px solid var(--rule);
}
.proof-tab { padding: 0.35rem 0.9rem; min-height: 44px; cursor: pointer; }
.proof { width: min(24rem, calc(100% - 1rem)); padding: 0.7rem 0.7rem 0.5rem; }
.proof[hidden], .proof-tab[hidden] { display: none; }
.proof div { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-bottom: 0.45rem; }
.proof span.name { flex: 1 0 100%; }
.proof button {
    font: inherit; color: var(--ink-soft); background: none; cursor: pointer;
    border: 1px solid var(--rule); min-height: 44px; padding: 0 0.55rem;
}
.proof button[aria-pressed="true"] { color: var(--rubric); border-color: var(--rubric); }
.proof .done { display: block; margin: 0.4rem auto 0; border: none; }
.proof .note { display: block; font-variant: normal; letter-spacing: 0; opacity: 0.8; min-height: 1.3em; }
@media print { .proof-tab, .proof { display: none; } }
`;

// Hyphenation rules for the prayer text: at least three letters on each side
// of a break, and a word the page capitalises away from a sentence start
// (God, Christ, Theotokos, Thine) is never hyphenated, as in the 1982 book.
function wordRules(base, paragraphs) {
    const caps = new Set();
    const re = /(?<![.!?:;]["'”’)]?\s)(?<=\S\s)[A-Z][a-z]{4,}/g;
    for (const p of paragraphs) for (const m of p.textContent.matchAll(re)) caps.add(m[0].toLowerCase());
    return (word) => {
        if (caps.has(word)) return [word];
        const parts = base(word).slice();
        while (parts.length > 1 && parts[0].length < 3) parts.splice(0, 2, parts[0] + parts[1]);
        while (parts.length > 1 && parts[parts.length - 1].length < 3) parts.splice(-2, 2, parts[parts.length - 2] + parts[parts.length - 1]);
        return parts;
    };
}

export default function proof() {
    const root = document.documentElement;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.append(style);

    const get = (k, d) => { try { return localStorage.getItem("proof-" + k) || d; } catch { return d; } };
    const set = (k, v) => { try { localStorage.setItem("proof-" + k, v); } catch { /* private mode */ } };

    const note = document.createElement("span");
    note.className = "note";
    let controller = null, run = 0;

    async function apply() {
        const mine = ++run;
        if (controller) { controller.destroy(); controller = null; }
        for (const s of SWITCHES) root.dataset["proof" + s.key[0].toUpperCase() + s.key.slice(1)] = get(s.key, s.options[0][0]);
        const mode = get("prose", "ragged");
        note.textContent = "";
        if (!LIB[mode]) return;
        try {
            const [{ justify }, { hyphenateEnUS }] = await Promise.all([import("./vendor/justif/index.js"), import("./vendor/justif/hyphenate/en-us.js")]);
            if (mine !== run) return;
            const all = [...document.querySelectorAll(".prayer p")];
            const targets = all.filter((p) => getComputedStyle(p).textAlign === "justify");
            const hang = get("hang", "on") === "on";
            const t0 = performance.now();
            controller = justify(targets, {
                hyphenate: wordRules(hyphenateEnUS, all),
                tracking: { max: LIB[mode].tracking, shrink: LIB[mode].tracking },
                spacing: { stretch: 0.5, shrink: LIB[mode].shrink, pull: 0.7, boundaryShrink: 0 },
                hangingPunctuation: hang ? "line-end-only" : "none",
                protrusion: hang,
            });
            note.textContent = `${controller.managed.length} of ${targets.length} paragraphs set in ${Math.round(performance.now() - t0)} ms`;
        } catch (e) {
            note.textContent = "Script failed: " + e.message;
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
    panel.append(note);
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
