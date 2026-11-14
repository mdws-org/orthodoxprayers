// Fails the build when the justified prayer prose comes out loose, changes
// the text, or runs off the column.
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
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WIDTHS = [390, 1280];
// Share of justified lines, over all pages at one width, whose widest gap
// may exceed 2 and 2.5 times the font's space, and the same for one page
// with at least 100 justified lines. The page limit is the looser one: the
// Commemorations are dense with titles and names that are never divided
// ("Archbishop of Washington, Metropolitan") and measure 7.9% and 4.4% on a
// phone; every other page is under 3.5% and 1%.
const LIMIT = { all2: 3, all25: 1, page2: 9, page25: 5 };

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    let file = join(ROOT, path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;

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
    const out = { lines: 0, over2: 0, over25: 0, justified: 0, paragraphs: 0, wide: document.documentElement.scrollWidth > innerWidth + 1, text: [] };
    for (const p of document.querySelectorAll(".prayer p")) {
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
        while (walker.nextNode()) {
            const n = walker.currentNode, re = /[^\s\u00a0]+/g; let m;
            while ((m = re.exec(n.data))) {
                const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
                for (const rc of r.getClientRects()) if (rc.width > 0.5) rects.push(rc);
            }
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

const failures = [];
const pct = (n, d) => (d ? (100 * n) / d : 0);
for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block" });
    const total = { lines: 0, over2: 0, over25: 0, set: 0, paragraphs: 0 };
    for (const path of pages) {
        const plain = await ctx.newPage();
        await plain.goto(base + path + "?justify=off", { waitUntil: "load" });
        await plain.evaluate(() => document.fonts.ready);
        const off = await plain.evaluate(measure);
        await plain.evaluate(() => { try { localStorage.removeItem("prayers-justify"); } catch {} });
        await plain.close();

        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base + path + "?justify=debug", { waitUntil: "load" });
        if (off.paragraphs) await page.waitForFunction(() => document.documentElement.dataset.justifySet, null, { timeout: 30000 });
        await page.waitForTimeout(100);
        const on = await page.evaluate(measure);
        await page.close();

        const where = `${path} at ${width}px`;
        if (errors.length) failures.push(`${where}: script error: ${errors[0]}`);
        if (on.wide) failures.push(`${where}: the page is wider than the window`);
        if (on.text.join("\n") !== off.text.join("\n")) failures.push(`${where}: the prayer text differs once the lines are set`);
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
}
await browser.close();
server.close();
if (failures.length) {
    console.error("check_justify: FAILED\n  " + failures.join("\n  "));
    process.exit(1);
}
console.log("check_justify: justified prose is within limits, text unchanged");
