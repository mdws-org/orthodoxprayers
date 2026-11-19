// Offline shell for /. Precache everything fixed;
// cache-first with network fallback.
// VERSION names the cache. CONTENT is the hash of the precached files it was
// set for: python3 scripts/check_precache.py --write raises VERSION and writes
// CONTENT when they change, and the check in CI fails when CONTENT is stale.
const VERSION = "prayers-v66";
const CONTENT = "42dfd3088ee00c40";
const BASE = "/";
const ASSETS = [
    // Pages: written from the page tree by scripts/check_precache.py --write.
    BASE,
    BASE + "about/",
    BASE + "canons/",
    BASE + "commemorations/",
    BASE + "common/",
    BASE + "communion/",
    BASE + "communion/canon/",
    BASE + "communion/thanksgiving/",
    BASE + "compline/",
    BASE + "evening/",
    BASE + "evening/rule/",
    BASE + "evening/sleep/",
    BASE + "hours/",
    BASE + "morning/",
    BASE + "morning/daybreak/",
    BASE + "morning/rule/",
    BASE + "psalter/",
    BASE + "psalter/kathisma-1/",
    BASE + "psalter/kathisma-2/",
    BASE + "psalter/kathisma-3/",
    BASE + "psalter/kathisma-4/",
    BASE + "psalter/kathisma-5/",
    BASE + "psalter/kathisma-6/",
    BASE + "psalter/kathisma-7/",
    BASE + "psalter/kathisma-8/",
    BASE + "psalter/kathisma-9/",
    BASE + "psalter/kathisma-10/",
    BASE + "psalter/kathisma-11/",
    BASE + "psalter/kathisma-12/",
    BASE + "psalter/kathisma-13/",
    BASE + "psalter/kathisma-14/",
    BASE + "psalter/kathisma-15/",
    BASE + "psalter/kathisma-16/",
    BASE + "psalter/kathisma-17/",
    BASE + "psalter/kathisma-18/",
    BASE + "psalter/kathisma-19/",
    BASE + "psalter/kathisma-20/",
    BASE + "table/",
    BASE + "typika/",
    // Files every page uses, listed by hand.
    BASE + "prayers.css",
    BASE + "theme.js",
    BASE + "app.js",
    BASE + "drop-caps.js",
    BASE + "justify.js",
    BASE + "justify-words.js",
    BASE + "justify-engine.js",
    BASE + "vendor/justif/chunk-ZW2EUTPS.js",
    BASE + "vendor/justif/hyphenate/en-us.js",
    BASE + "fonts/ebgaramond-var.woff2",
    BASE + "fonts/ebgaramond-italic-var.woff2",
    BASE + "art/bars/bar2.svg",
    BASE + "art/bars/bar8.svg",
    BASE + "art/bars/bar12.svg",
    BASE + "art/bars/bar13.svg",
    BASE + "art/bars/bar19.svg",
    BASE + "art/bars/bar20.svg",
    BASE + "art/icons/cross-pattee.svg",
    BASE + "art/icons/leaf.svg",
    BASE + "art/icons/byzantine-cross-1.svg",
    BASE + "manifest.webmanifest",
    BASE + "icon-192.png",
    BASE + "icon-512.png",
];

// Each file is fetched past the browser's HTTP cache (cache: "reload") and
// with the version in its query, which no edge copy from before this deploy
// can match, then stored under its plain address. Fonts are cached as
// immutable for a year, so a plain fetch could install last version's file.
function fresh(path) {
    const url = new URL(path, self.location);
    url.searchParams.set("v", VERSION);
    return fetch(new Request(url, { cache: "reload" })).then((r) => {
        if (!r.ok) throw new Error(path + " answered " + r.status);
        return r;
    });
}

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(VERSION).then((c) =>
            Promise.all(ASSETS.map((path) => fresh(path).then((r) => c.put(path, r))))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET") return;
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then(
            (hit) => hit || fetch(e.request)
        )
    );
});
