// Writes drop-caps.js: for each capital, how far the text beside it should
// stand from the capital's box so that it sits a fixed distance from the ink.
//
// A drop cap is one rectangle to the browser, so every capital got the same
// gap whatever its shape: the T's arm nearly touched the run-in while the
// lines beside an O stood well clear. The printed prayer books fit each
// letter. This script opens a page in WebKit, draws each capital at the size
// and weight the page uses, and finds the rightmost ink beside line 1 and
// beside line 2.
//
//   fit   where line 2 starts, measured from the capital's advance width
//         (negative: the line tucks under an overhang, at most TUCK)
//   lead  how much further right line 1 starts than line 2
//
// A capital that is narrower at the top than at the foot (A, L, R) would
// want line 1 further LEFT than line 2. A float cannot do that, so its line
// 1 keeps line 2's edge.
//
// Run after changing the font, the cap's size or weight, or the leading:
//   node scripts/fit_drop_caps.mjs
// Needs playwright-core and its WebKit build, as scripts/check_justify.mjs.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./site_server.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLEAR = 0.14; // em of the body text between the capital's ink and the text
const TUCK = 0.3;   // em: how far line 2 may sit under an overhang such as the T's arm
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
        // Line 1 is the small-caps run-in: no ascenders or descenders. Line 2 is lower case.
        out[letter] = { advance: cm.width / em, line1: reach(b1 - 0.5 * em, b1 + 0.06 * em), line2: reach(b2 - 0.72 * em, b2 + 0.24 * em), capEm: size / em };
    }
    return out;
});
await browser.close();
close();

const rows = [];
for (const [letter, m] of Object.entries(measured)) {
    const edge = Math.max(m.line2, m.line1 - TUCK);
    const fit = edge + CLEAR - m.advance, lead = Math.max(0, m.line1 - edge);
    // fit is a margin on the capital itself, so it is written in the capital's own em.
    rows.push(`    ${letter}: [${(fit / m.capEm).toFixed(3)}, ${lead.toFixed(3)}],`);
}
writeFileSync(join(ROOT, "drop-caps.js"), `// Written by scripts/fit_drop_caps.mjs; do not edit by hand.
//
// For each capital: [fit, lead]. fit is the right margin of the drop cap in
// its own em, which places line 2 ${CLEAR}em of the body text from the
// capital's ink (negative where the line tucks under an overhang). lead is
// how much further right line 1 starts, in em of the body text.
export const FIT = {
${rows.join("\n")}
};

// After a one-letter word ("O Lord") line 1 keeps a thin space in place of
// the word space, as the 2019 St. Tikhon's prayer book sets it.
export const ONE_LETTER_LEAD = 0.16;
`);
console.log(`fit_drop_caps: wrote drop-caps.js for ${rows.length} capitals`);
