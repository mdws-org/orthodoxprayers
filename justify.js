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

function release() {
    if (controller) { controller.destroy(); controller = null; }
    delete root.dataset.justify;
}

async function set(debug) {
    const all = [...document.querySelectorAll(".prayer p")];
    const targets = all.filter((p) => getComputedStyle(p).textAlign === "justify");
    if (!targets.length) return;
    const [{ justify }, { hyphenateEnUS }] = await Promise.all([
        import("./vendor/justif/index.js"),
        import("./vendor/justif/hyphenate/en-us.js"),
    ]);
    if (document.fonts) await document.fonts.ready;

    // prayers.css tightens the word space for the browser's own justification;
    // this attribute lifts that, so the library measures the font's own space.
    root.dataset.justify = "on";
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
        await controller.ready;
        console.info(`justify: ${controller.managed.length} of ${targets.length} paragraphs set`, skipped);
        root.dataset.justifySet = `${controller.managed.length}/${targets.length}`;
    }
}

export default function start() {
    const { off, debug } = preference();
    if (off) return;
    const run = () => set(debug).catch((e) => { release(); if (debug) console.error("justify:", e); });
    run();
    // Lines set for the screen's column would be wrong on paper.
    addEventListener("beforeprint", release);
    addEventListener("afterprint", run);
}
