// Fails the build when the justified prayer prose comes out loose, changes
// the text, runs off the column, or is not set again after the text size
// changes; when a speaker's response is not set as one; when a word that
// justify-words.js protects is divided or has break points; and when a page
// capitalises a word that file does not list.
//
// Serves the repository on a local port, opens every page that has prayer
// prose in WebKit at a phone width and a wide one, lets justify.js set the
// lines, and measures each justified line's widest word gap against the
// font's own space. It also loads each page with the script turned off and
// requires the phone prose to be justified by the stylesheet alone.
//
// Needs playwright-core and its WebKit build:
//   npm install --no-save --ignore-scripts playwright-core@1.62.1
//   npx playwright-core install --with-deps webkit
// Run from the repository root: node scripts/check_justify.mjs
// PLAYWRIGHT_CORE and WEBKIT_PATH point at an existing install; REPORT=1
// prints every page.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./site_server.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WIDTHS = [390, 1280];
// Share of justified lines, over all pages at one width, whose widest gap
// may exceed 2 and 2.5 times the font's space, and the same for one page
// with at least 100 justified lines.
const LIMIT = { all2: 3, all25: 1, page2: 6, page25: 2.5 };

const { base, close } = await serve(ROOT);

// Pages come from the service worker's precache list: every entry ending in "/".
const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
const pages = [...sw.matchAll(/BASE \+ "([^"]*\/)"/g)].map((m) => "/" + m[1])
    .filter((p) => /class="prayer/.test(readFileSync(join(ROOT, p, "index.html"), "utf8")));

const { webkit } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
const browser = await webkit.launch({ headless: true, ...(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {}) });

// Runs in the page. Words are grouped into lines by their vertical centre;
// a gap is the distance between neighbouring words on a line, in units of
// the font's own space advance.
function measure() {
    const out = { lines: 0, over2: 0, over25: 0, justified: 0, paragraphs: 0, wide: document.documentElement.scrollWidth > innerWidth + 1, text: [], divided: [], labelled: 0, unmarked: 0 };
    for (const p of document.querySelectorAll(".prayer p")) {
        // A paragraph that opens with a speaker's label is set as a response.
        const label = p.firstElementChild;
        if (label && p.firstChild === label && label.classList.contains("speaker")) {
            out.labelled++;
            const beside = p.classList.contains("response") && getComputedStyle(p).textAlign !== "justify" && label.getBoundingClientRect().width > 0;
            const above = p.classList.contains("response-long") && p.querySelector(":scope > br.after-label");
            if (!beside && !above) out.unmarked++;
        }
        // The library ties the opening word with a no-break space; nothing else
        // in the text may change.
        out.text.push(p.textContent.replace(/\u00a0/g, " "));
        const cs = getComputedStyle(p);
        const set = !!p.querySelector('[class*="justif"]');
        if (cs.textAlign !== "justify" && !set) continue;
        out.paragraphs++;
        if (set) out.justified++;
        const probe = document.createElement("span");
        probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;word-spacing:0;letter-spacing:0;font-kerning:none";
        p.appendChild(probe);
        probe.textContent = "n n n n n n n n n n n"; const a = probe.getBoundingClientRect().width;
        probe.textContent = "nnnnnnnnnnn"; const b = probe.getBoundingClientRect().width;
        probe.remove();
        const space = (a - b) / 10, lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
        const rects = [], walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let before = null, spaced = true;
        while (walker.nextNode()) {
            const n = walker.currentNode, re = /[^\s\u00a0]+/g; let m, at = 0;
            while ((m = re.exec(n.data))) {
                if (m.index > at) spaced = true;
                at = m.index + m[0].length;
                const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, at);
                const rs = [...r.getClientRects()].filter((rc) => rc.width > 0.5);
                if (!rs.length) continue;
                rects.push(...rs);
                // A word divided by the script is two pieces with no space
                // between them, on different lines.
                const mid = (rs[0].top + rs[0].bottom) / 2;
                if (!spaced && before && Math.abs(mid - before.mid) > lh * 0.45) {
                    const head = (before.text.match(/[A-Za-z]+$/) || [""])[0], tail = (m[0].match(/^[A-Za-z]+/) || [""])[0];
                    // A drop cap sits apart from the rest of its word; a real
                    // division leaves at least three letters on each side.
                    if (head.length > 1 && tail.length > 1) out.divided.push(head + "-" + tail);
                }
                const last = rs[rs.length - 1];
                before = { text: m[0], mid: (last.top + last.bottom) / 2 };
                spaced = false;
            }
            if (at < n.data.length) spaced = true;
        }
        rects.sort((x, y) => (x.top + x.bottom) - (y.top + y.bottom));
        const lines = []; let cur = null;
        for (const rc of rects) {
            const c = (rc.top + rc.bottom) / 2;
            if (!cur || Math.abs(c - cur.c) > lh * 0.45) { cur = { c, rs: [] }; lines.push(cur); }
            cur.rs.push(rc);
        }
        lines.slice(0, -1).forEach((ln) => {
            ln.rs.sort((x, y) => x.left - y.left);
            let widest = 0;
            for (let i = 1; i < ln.rs.length; i++) { const g = (ln.rs[i].left - ln.rs[i - 1].right) / space; if (g > 0.3) widest = Math.max(widest, g); }
            if (!widest) return;
            out.lines++;
            if (widest > 2) out.over2++;
            if (widest > 2.5) out.over25++;
        });
    }
    return out;
}

// Runs in the page: how many prose paragraphs have text past their right
// edge. Hanging punctuation sits outside the column by design, by less than
// one em; lines set for another text size run out by several.
function pastColumn() {
    const out = { paragraphs: 0, worst: 0, wide: document.documentElement.scrollWidth > innerWidth + 1 };
    for (const p of document.querySelectorAll(".prayer p")) {
        const edge = p.getBoundingClientRect().right, range = document.createRange();
        range.selectNodeContents(p);
        const over = Math.max(0, ...[...range.getClientRects()].filter((rc) => rc.width > 0.5).map((rc) => rc.right - edge));
        if (over > parseFloat(getComputedStyle(p).fontSize)) { out.paragraphs++; out.worst = Math.max(out.worst, Math.round(over)); }
    }
    return out;
}

const failures = [];

// Every word a page capitalises away from a sentence start, six letters or
// longer, must be filed in justify-words.js as protected or as free to divide.
const { PROTECTED, MAY_DIVIDE, BREAKS } = await import(join(ROOT, "justify-words.js"));
const unfiled = new Map();
for (const path of pages) {
    const html = readFileSync(join(ROOT, path, "index.html"), "utf8");
    for (const para of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
        // Words only: the markup between them is dropped by splitting on it.
        const words = para[1].split(/<[^>]*>/).join("").replace(/&[a-z]+;/g, " ").trim().split(/\s+/);
        // Each word is judged by the one before it, so a run of capitalised
        // words ("Holy Birthgiver of God") has every member looked at.
        for (let i = 1; i < words.length; i++) {
            const m = /^[A-Z][a-z]{5,}/.exec(words[i]);
            if (!m || /[.!?:;]["'\u201d\u2019)]?$/.test(words[i - 1])) continue;
            const word = m[0].toLowerCase();
            if (!PROTECTED.has(word) && !MAY_DIVIDE.has(word) && !unfiled.has(word)) unfiled.set(word, path);
        }
    }
}
for (const [word, path] of unfiled) failures.push(`${path}: "${word}" is capitalised and is in neither list of justify-words.js`);
// justify.js tests protection first, so hand-set break points on a word
// that is not free to divide would never be used.
for (const word of Object.keys(BREAKS)) if (!MAY_DIVIDE.has(word) || PROTECTED.has(word)) failures.push(`justify-words.js: "${word}" has break points but is not in MAY_DIVIDE alone`);

const pct = (n, d) => (d ? (100 * n) / d : 0);
for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block" });
    // The script-off loads get a context of their own: ?justify=off is remembered
    // in localStorage, and justify.js may write it after the page's load event.
    const ctxOff = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block" });
    const total = { lines: 0, over2: 0, over25: 0, set: 0, paragraphs: 0 };
    for (const path of pages) {
        const plain = await ctxOff.newPage();
        await plain.goto(base + path + "?justify=off", { waitUntil: "load" });
        await plain.evaluate(() => document.fonts.ready);
        const off = await plain.evaluate(measure);
        await plain.close();

        const page = await ctx.newPage();
        const errors = [];
        const said = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => { if (m.type() === "error" || /justify/.test(m.text())) said.push(m.text()); });
        page.on("requestfailed", (r) => said.push(`request failed: ${r.url()}`));
        await page.goto(base + path + "?justify=debug", { waitUntil: "load" });
        // justify.js marks the page when the lines are set, or records that
        // it gave up waiting for the library.
        const finished = (timeout = 30000) => page.waitForFunction(() => document.documentElement.dataset.justifySet || document.documentElement.dataset.justifyStage === "timed out", null, { timeout })
            .then(() => page.evaluate(() => !!document.documentElement.dataset.justifySet), () => false);
        const set = off.paragraphs ? await finished() : true;
        const stalledAt = set ? "" : await page.evaluate(() => document.documentElement.dataset.justifyStage || "before the script ran");
        await page.waitForTimeout(100);
        const on = await page.evaluate(measure);
        // A reader who enlarges the text after the lines are set must get
        // them set again for the new size, inside the column.
        let larger = null;
        if (set && on.justified && width < 600) {
            await page.evaluate(() => { delete document.documentElement.dataset.justifySet; document.documentElement.style.fontSize = "125%"; });
            larger = { set: await finished(10000), ...(await page.evaluate(pastColumn)) };
        }
        await page.close();

        const where = `${path} at ${width}px`;
        if (errors.length) failures.push(`${where}: script error: ${errors[0]}`);
        if (!set) failures.push(`${where}: the script did not finish setting the lines, stopped at "${stalledAt}"${said.length ? " (" + said.slice(0, 3).join("; ") + ")" : ""}`);
        if (larger && !larger.set) failures.push(`${where}: the lines were not set again after the text size changed`);
        if (larger && (larger.paragraphs || larger.wide)) failures.push(`${where}: after the text size changed, ${larger.paragraphs} paragraphs run past the column, by up to ${larger.worst}px`);
        if (on.wide) failures.push(`${where}: the page is wider than the window`);
        if (set && on.justified && on.unmarked) failures.push(`${where}: ${on.unmarked} of ${on.labelled} paragraphs that open with a speaker's label are set neither beside the label nor under it`);
        if (on.text.join("\n") !== off.text.join("\n")) failures.push(`${where}: the prayer text differs once the lines are set`);
        for (const word of on.divided) if (PROTECTED.has(word.replace("-", "").toLowerCase())) failures.push(`${where}: the protected word "${word}" is divided`);
        if (width < 600 && off.paragraphs === 0 && on.paragraphs > 0) failures.push(`${where}: with the script off, phone prose is not justified by the stylesheet`);
        const p2 = pct(on.over2, on.lines), p25 = pct(on.over25, on.lines);
        if (on.lines >= 100 && (p2 > LIMIT.page2 || p25 > LIMIT.page25)) failures.push(`${where}: ${p2.toFixed(1)}% of lines have a gap over 2 spaces and ${p25.toFixed(1)}% over 2.5 (limits ${LIMIT.page2}% and ${LIMIT.page25}%)`);
        if (process.env.REPORT) console.log(`${where.padEnd(38)} lines ${String(on.lines).padStart(4)}  >2 ${p2.toFixed(1)}%  >2.5 ${p25.toFixed(1)}%  set ${on.justified}/${on.paragraphs}  off: >2 ${pct(off.over2, off.lines).toFixed(1)}%`);
        total.lines += on.lines; total.over2 += on.over2; total.over25 += on.over25; total.set += on.justified; total.paragraphs += on.paragraphs;
    }
    const a2 = pct(total.over2, total.lines), a25 = pct(total.over25, total.lines);
    console.log(`check_justify: ${width}px, ${pages.length} pages, ${total.lines} justified lines, ${a2.toFixed(1)}% with a gap over 2 spaces, ${a25.toFixed(1)}% over 2.5, ${total.set} of ${total.paragraphs} paragraphs set by the script`);
    if (a2 > LIMIT.all2 || a25 > LIMIT.all25) failures.push(`all pages at ${width}px: ${a2.toFixed(1)}% over 2 spaces and ${a25.toFixed(1)}% over 2.5 (limits ${LIMIT.all2}% and ${LIMIT.all25}%)`);
    if (total.set === 0) failures.push(`all pages at ${width}px: the script set no paragraph`);
    await ctx.close();
    await ctxOff.close();
}
await browser.close();
close();
if (failures.length) {
    console.error("check_justify: FAILED\n  " + failures.join("\n  "));
    process.exit(1);
}
console.log("check_justify: justified prose is within limits, text unchanged");
