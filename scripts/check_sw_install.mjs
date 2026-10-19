// Fails the build when the service worker's install step can be served a copy
// from before the current deploy. A version bump must fetch every precached
// file fresh: past the browser's HTTP cache (fonts are immutable for a year,
// ornaments cached a week) and past any copy held at the edge, a 404 included.
// Otherwise the new version installs old files, or fails to install and leaves
// returning visitors on the old version.
//
// Runs sw.js's install handler in a stand-in for the worker scope where a
// plain request gets a stale answer (a 404 for the first asset, an old body for
// the rest) and only a request that skips the HTTP cache and carries the
// version in its query gets the current file.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const handlers = {};
const stored = new Map();
const requests = [];
const origin = "https://orthodoxprayers.net";

class FakeResponse {
    constructor(body, status) { this.body = body; this.status = status; this.ok = status >= 200 && status < 300; }
    clone() { return this; }
}
const cache = {
    put: async (req, res) => { stored.set(new URL(typeof req === "string" ? req : req.url, origin).href, res); },
    add: async (req) => cache.addAll([req]),
    addAll: async (reqs) => {
        const res = await Promise.all(reqs.map((r) => scope.fetch(r)));
        if (res.some((r) => !r.ok)) throw new TypeError("addAll: a response was not ok");
        res.forEach((r, i) => stored.set(new URL(typeof reqs[i] === "string" ? reqs[i] : reqs[i].url, origin).href, r));
    },
};
let version;
const scope = {
    location: new URL(origin + "/sw.js"),
    caches: { open: async () => cache, keys: async () => [], delete: async () => true, match: async () => undefined },
    Request: class { constructor(url, init = {}) { this.url = new URL(url, origin).href; this.cache = init.cache || "default"; } },
    URL,
    fetch: async (req) => {
        const r = typeof req === "string" ? { url: new URL(req, origin).href, cache: "default" } : req;
        requests.push(r);
        const u = new URL(r.url);
        const fresh = r.cache === "reload" || r.cache === "no-store" || r.cache === "no-cache";
        if (fresh && u.searchParams.get("v") === version) return new FakeResponse("current", 200);
        return r.url.endsWith(firstAsset) ? new FakeResponse("not found", 404) : new FakeResponse("stale", 200);
    },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
};
scope.self = scope;
vm.runInNewContext(src + "\n;globalThis.__v = VERSION; globalThis.__a = ASSETS;", scope);
version = scope.__v;
const assets = scope.__a;
const firstAsset = new URL(assets[1], origin).pathname;

let installError = null;
await new Promise((done) => {
    handlers.install({ waitUntil: (p) => p.then(done, (e) => { installError = e; done(); }) });
});

const problems = [];
if (installError) problems.push(`install failed on a stale copy: ${installError.message}`);
for (const a of assets) {
    const key = new URL(a, origin).href;
    const r = stored.get(key);
    if (!r) problems.push(`${a} was not stored under its own address`);
    else if (r.body !== "current") problems.push(`${a} was stored from a stale copy`);
}
if (problems.length) {
    console.error(`sw.js install (${version}, ${assets.length} assets):`);
    for (const p of [...new Set(problems)].slice(0, 10)) console.error("  " + p);
    process.exit(1);
}
console.log(`sw.js install fetches all ${assets.length} assets fresh for ${version}`);
