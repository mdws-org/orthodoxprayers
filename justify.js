// Justified prayer prose, set a paragraph at a time.
//
// A browser justifies one line at a time and can only widen word spaces; on
// a phone's forty-character line that leaves one line in five with a gap over
// twice the font's space. The justif library (vendor/justif, v0.9.2, MIT)
// chooses the breaks for the whole paragraph, lets a space close to 80% as
// well as open, and spreads what is left across the letters of the line, so
// the page reads like the printed prayer books. Paragraphs it cannot set
// keep the browser's justification from prayers.css, as does every page when
// this script does not run.
//
// ?justify=off turns it off on this device, ?justify=on turns it back on,
// ?justify=debug reports what was set.

import { PROTECTED, BREAKS } from "./justify-words.js";

const KEY = "prayers-justify";
const root = document.documentElement;

// How far the library may go. A word space closes to 80% of the font's own
// and opens to 150%; letter-spacing may take up 3% of a line's width.
const OPTIONS = {
    tracking: { max: 0.03, shrink: 0.03 },
    spacing: { stretch: 0.5, shrink: 0.2, pull: 0.7, boundaryShrink: 0 },
    hangingPunctuation: "line-end-only",
    protrusion: true,
};

// At least three letters stay on each side of a break. A protected word
// (justify-words.js) is never divided, and a word with hand-set break points
// uses those.
function wordRules(base) {
    return (word) => {
        if (PROTECTED.has(word)) return [word];
        const parts = (Object.hasOwn(BREAKS, word) ? BREAKS[word] : base(word)).slice();
        while (parts.length > 1 && parts[0].length < 3) parts.splice(0, 2, parts[0] + parts[1]);
        while (parts.length > 1 && parts[parts.length - 1].length < 3) parts.splice(-2, 2, parts[parts.length - 2] + parts[parts.length - 1]);
        return parts;
    };
}

function preference() {
    const asked = new URLSearchParams(location.search).get("justify");
    try {
        if (asked === "off") localStorage.setItem(KEY, "off");
        if (asked === "on") localStorage.removeItem(KEY);
        return { off: localStorage.getItem(KEY) === "off", debug: asked === "debug" };
    } catch {
        return { off: asked === "off", debug: asked === "debug" };
    }
}

let controller = null;
// Counts releases. A run that finds the count changed after waiting has been
// overtaken by a later run and stops, so two runs never set the same lines.
let generation = 0;

function release() {
    generation++;
    if (controller) { controller.destroy(); controller = null; }
    for (const p of document.querySelectorAll(".prayer p:is(.response, .response-more, .response-long)")) p.classList.remove("response", "response-more", "response-long");
    for (const br of document.querySelectorAll(".prayer br.after-label")) {
        const p = br.parentNode, held = br.previousSibling;
        if (held && held.nodeType === Node.TEXT_NODE && held.data === "\u00a0") held.data = " ";
        br.remove();
        p.normalize();
    }
    root.style.removeProperty("--label-column");
    delete root.dataset.justify;
}

// The most lines a response may run to and still be set beside its label.
const RESPONSE_LINES = 3;

// What a speaker says ("Choir: Lord, have mercy." and the unlabelled
// paragraphs after it) is set as the service books set a dialogue: the label
// in a column of its own, the words beside it, ragged. Justified, a short
// response is a row of words stretched across the column. A response longer
// than RESPONSE_LINES at the full measure is a prayer: its label stands on a
// line above it and the text is justified like any other. Lines are counted
// as rendered, so the same response may be short on a wide screen and long
// on a phone.
function markResponses(paragraphs) {
    const labelled = paragraphs.filter((p) => {
        const label = p.firstElementChild;
        return label && p.firstChild === label && label.classList.contains("speaker");
    });
    const mine = new Set(labelled);
    const lines = (p) => Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight));
    // Measured for every response before any is changed: marking one moves
    // nothing above it, but the counts must all be of the same layout.
    const groups = labelled.map((p) => {
        const group = [p];
        for (let n = p.nextElementSibling; n && n.tagName === "P" && !n.className && !mine.has(n); n = n.nextElementSibling) group.push(n);
        return { group, short: group.reduce((sum, g) => sum + lines(g), 0) <= RESPONSE_LINES };
    });
    let widest = 0;
    for (const { group, short } of groups) {
        const [first, ...more] = group, label = first.firstElementChild;
        if (!short) {
            first.classList.add("response-long");
            // The library drops an ordinary space beside a line break, which
            // would join the label to the first word in the page's text. The
            // space after the label is held as a no-break space, as the
            // library itself holds the space after an inline label, and
            // release() puts the ordinary one back.
            const br = document.createElement("br");
            br.className = "after-label";
            const next = label.nextSibling;
            if (next && next.nodeType === Node.TEXT_NODE && /^ /.test(next.data)) {
                next.splitText(1).before(br);
                next.data = "\u00a0";
            } else label.after(br);
            continue;
        }
        widest = Math.max(widest, label.getBoundingClientRect().width / parseFloat(getComputedStyle(first).fontSize));
        first.classList.add("response");
        for (const p of more) p.classList.add("response-more");
    }
    // The column is as wide as the widest label on the page and a gap.
    if (widest) root.style.setProperty("--label-column", (widest + 0.45).toFixed(2) + "em");
}

async function set(debug) {
    release();
    const mine = generation;
    if (debug) delete root.dataset.justifySet;
    const all = [...document.querySelectorAll(".prayer p")];
    if (!all.some((p) => getComputedStyle(p).textAlign === "justify")) return;
    const stage = (name) => { if (debug) root.dataset.justifyStage = name; };
    stage("loading");
    const [{ justify }, { hyphenateEnUS }] = await Promise.all([
        import("./vendor/justif/index.js"),
        import("./vendor/justif/hyphenate/en-us.js"),
    ]);
    if (mine !== generation) return;
    // The library sets the lines again when a font arrives, so a font that is
    // slow or never reports ready does not hold the page on the fallback.
    stage("fonts");
    if (document.fonts) await Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 2000))]);
    if (mine !== generation) return;
    stage("setting");

    // prayers.css tightens the word space for the browser's own justification;
    // this attribute lifts that, so the library measures the font's own space.
    root.dataset.justify = "on";
    markResponses(all);
    const targets = all.filter((p) => getComputedStyle(p).textAlign === "justify");
    if (!targets.length) { release(); return; }
    // A reader's own stylesheet that sets letter or word spacing wins: the
    // lines would be measured for spacing they are not shown with.
    const cs = getComputedStyle(targets[0]);
    if (!["normal", "0px"].includes(cs.letterSpacing) || !["normal", "0px"].includes(cs.wordSpacing)) {
        release();
        return;
    }
    const skipped = [];
    controller = justify(targets, {
        ...OPTIONS,
        hyphenate: wordRules(hyphenateEnUS),
        onSkip: debug ? (...why) => skipped.push(why) : undefined,
    });
    if (debug) {
        stage("set");
        const finished = await Promise.race([
            controller.ready.then(() => true),
            new Promise((done) => setTimeout(() => done(false), 5000)),
        ]);
        if (mine !== generation) return;
        // The completion mark is what scripts/check_justify.mjs waits for; a
        // run that has not finished must not carry it.
        if (!finished) { stage("timed out"); return; }
        console.info(`justify: ${controller.managed.length} of ${targets.length} paragraphs set`, skipped);
        root.dataset.justifySet = `${controller.managed.length}/${targets.length}`;
    }
}

export default function start() {
    const { off, debug } = preference();
    if (off) return;
    // Lines set for the screen's column would be wrong on paper: nothing is
    // set from the moment printing starts until it ends.
    const print = matchMedia("print");
    let printing = false;
    const run = () => {
        if (printing || print.matches) return;
        set(debug).catch((e) => { release(); if (debug) console.error("justify:", e); });
    };
    run();
    let pending = 0;
    const rerun = () => {
        clearTimeout(pending);
        pending = setTimeout(run, 200);
    };
    // Which responses are short depends on the column, so a change of width
    // starts over. The library follows the width by itself otherwise.
    let width = innerWidth;
    addEventListener("resize", () => {
        if (innerWidth === width) return;
        width = innerWidth;
        rerun();
    });
    // The library does not notice a change of text size (the reader's browser
    // setting, a zoom of text only): the lines it set would run past the
    // column. A hidden box one em wide in the prose reports the change.
    const prose = document.querySelector(".prayer");
    if (prose && typeof ResizeObserver === "function") {
        const em = document.createElement("span");
        em.setAttribute("aria-hidden", "true");
        em.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:1em;height:0";
        prose.appendChild(em);
        let size = em.getBoundingClientRect().width;
        new ResizeObserver(() => {
            const now = em.getBoundingClientRect().width;
            if (Math.abs(now - size) < 0.01) return;
            size = now;
            rerun();
        }).observe(em);
    }
    // Not every browser sends beforeprint, so the print media query is
    // watched as well.
    const toPaper = () => { printing = true; clearTimeout(pending); release(); };
    const toScreen = () => { printing = false; rerun(); };
    addEventListener("beforeprint", toPaper);
    addEventListener("afterprint", toScreen);
    if (print.addEventListener) print.addEventListener("change", (e) => (e.matches ? toPaper() : toScreen()));
}
