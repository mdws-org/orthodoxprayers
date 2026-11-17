// Writes drop-caps.js: for each capital, where the two lines beside it start.
//
// A drop cap is one rectangle to the browser, so every capital got the same
// gap whatever its shape. The printed prayer books fit each letter, and they
// fit the two lines differently:
//
//   line 1  is the rest of the opening word. It runs in to the capital at
//           the height of its own letters: over the leg of an A or the foot
//           of an L, beside the arm of a T.
//   line 2  stands off the capital's rightmost ink below line 1's baseline.
//           For a round letter that is the widest point of the bowl, which
//           lies between the two lines; a T's arm is above it and does not
//           count, so line 2 goes under the arm.
//
// CLEAR holds the two distances for each capital, in em of the body text,
// from the capital's ink to the edge of the text's box. They were set by
// rendering the site beside the St. Tikhon's Monastery Press prayer book
// (Prayers for Morning, Day and Night, 2019) and matching, letter by letter,
// the distance from the capital's ink to the text's ink on each line. The
// book has A B G H I L M O R T W; the rest follow the nearest shape, and F,
// P and T keep line 2 under the arm or bowl.
//
// This script opens a page in WebKit, draws each capital at the size and
// weight the page uses, finds its rightmost ink at the height of line 1 and
// below line 1's baseline, and writes:
//
//   fit   the capital's right margin, in its own em: where line 2 starts
//   lead  where line 1 starts from there, in em of the body text (negative
//         where it starts further left)
//
// Run after changing the font, the cap's size, weight or position, or the
// leading:
//   node scripts/fit_drop_caps.mjs
// Needs playwright-core and its WebKit build, as scripts/check_justify.mjs.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./site_server.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// [line 1, line 2]: capital's ink to the text's box, in em of the body text.
const CLEAR = {
    A: [0.189, 0.396], B: [0.278, 0.197], C: [0.203, 0.112], D: [0.291, 0.192],
    E: [0.263, 0.197], F: [0.033, 0.140], G: [0.208, 0.123], H: [0.221, 0.105],
    I: [0.188, 0.132], J: [0.205, 0.136], K: [0.113, 0.136], L: [0.267, 0.312],
    M: [0.225, 0.072], N: [0.145, 0.088], O: [0.233, 0.200], P: [0.220, -0.146],
    Q: [0.133, 0.232], R: [0.188, 0.131], S: [0.133, 0.194], T: [0.109, 0.438],
    U: [0.201, 0.105], V: [0.098, 0.346], W: [0.111, 0.319], X: [0.126, 0.124],
    Y: [0.110, 0.371], Z: [0.198, 0.168],
};
const PAGE = "/morning/";

const { base, close } = await serve(ROOT);
const { webkit } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
const browser = await webkit.launch({ headless: true, ...(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {}) });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" })).newPage();
await page.goto(base + PAGE + "?justify=off", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

// In the page: ink reach beside each line, in em of the body text from the
// capital's left edge, and the capital's advance width.
const measured = await page.evaluate(() => {
    const p = document.querySelector(".prayer p.opening");
    p.style.setProperty("--cap-fit", "0em");
    const body = getComputedStyle(p), em = parseFloat(body.fontSize), out = {};
    const canvas = document.createElement("canvas"), scale = 8;
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        p.textContent = letter + "ord grant me to greet the coming day in peace help me in all things to rely upon your holy will in every hour of the day";
        const text = p.firstChild;
        const rect = (a, b) => { const r = document.createRange(); r.setStart(text, a); r.setEnd(text, b); return r.getClientRects()[0]; };
        const cap = rect(0, 1), first = rect(1, 2);
        let second = null;
        for (let i = 2; i < text.data.length && !second; i++) { const r = rect(i, i + 1); if (r && r.top > first.top + em * 0.8) second = r; }
        const style = getComputedStyle(p, "::first-letter"), size = parseFloat(style.fontSize), padTop = parseFloat(style.paddingTop);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.font = `${body.fontWeight} ${em}px ${body.fontFamily}`;
        const bm = ctx.measureText("x"), bodyBox = bm.fontBoundingBoxAscent + bm.fontBoundingBoxDescent;
        const baseline = (r) => r.bottom - (r.height - bodyBox) / 2 - bm.fontBoundingBoxDescent;
        ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
        const cm = ctx.measureText(letter), up = cm.fontBoundingBoxAscent, down = cm.fontBoundingBoxDescent;
        const capBaseline = cap.top + padTop + (cap.height - padTop - (up + down)) / 2 + up;
        const inset = size * 0.1;
        canvas.width = Math.ceil((cm.width + size * 0.4) * scale); canvas.height = Math.ceil((up + down) * scale);
        const draw = canvas.getContext("2d", { willReadFrequently: true });
        draw.scale(scale, scale); draw.font = `${style.fontWeight} ${size}px ${style.fontFamily}`; draw.fillText(letter, inset, up);
        const pixels = draw.getImageData(0, 0, canvas.width, canvas.height).data;
        const reach = (top, bottom) => {
            let best = -1;
            const from = Math.max(0, Math.round((top - capBaseline + up) * scale)), to = Math.min(canvas.height - 1, Math.round((bottom - capBaseline + up) * scale));
            for (let y = from; y <= to; y++) for (let x = canvas.width - 1; x > best; x--) if (pixels[(y * canvas.width + x) * 4 + 3] > 60) { best = x; break; }
            return best < 0 ? 0 : (best / scale - inset) / em;
        };
        const b1 = baseline(first), b2 = baseline(second);
        // Line 1 is the small-caps run-in, as tall as a lower-case x. For line 2
        // the capital counts from just under line 1's baseline to its own foot.
        out[letter] = { advance: cm.width / em, line1: reach(b1 - 0.42 * em, b1 + 0.02 * em), low: reach(b1 + 0.08 * em, b2 + 0.02 * em), capEm: size / em };
    }
    return out;
});
await browser.close();
close();

const rows = [];
for (const [letter, m] of Object.entries(measured)) {
    const [clear1, clear2] = CLEAR[letter];
    const edge = m.low + clear2;
    const fit = edge - m.advance, lead = m.line1 + clear1 - edge;
    // fit is a margin on the capital itself, so it is written in the capital's own em.
    rows.push(`    ${letter}: [${(fit / m.capEm).toFixed(4)}, ${lead.toFixed(3)}],`);
}
writeFileSync(join(ROOT, "drop-caps.js"), `// Written by scripts/fit_drop_caps.mjs; do not edit by hand.
//
// For each capital: [fit, lead]. fit is the right margin of the drop cap in
// its own em, which is where line 2 starts. lead is where line 1 starts from
// there, in em of the body text: negative where the opening word runs in over
// the capital's leg or foot. The distances behind them are in the script.
export const FIT = {
${rows.join("\n")}
};

// After a one-letter word ("O Lord") line 1 keeps a thin space in place of
// the word space, as the 2019 St. Tikhon's prayer book sets it.
export const ONE_LETTER_LEAD = 0.16;
`);
console.log(`fit_drop_caps: wrote drop-caps.js for ${rows.length} capitals`);
