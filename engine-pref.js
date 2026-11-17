// BETA ONLY: which line-setting engine this device uses.
//
// "own" is the site's own engine (own-engine.js), with the drop caps fitted
// to the printed book; "lib" is the justif library as on the live site.
// ?engine=own or ?engine=lib chooses and is remembered; the panel in
// preview.js does the same with two buttons.
const KEY = "prayers-engine";

function read() {
    const asked = new URLSearchParams(location.search).get("engine");
    try {
        if (asked === "own" || asked === "lib") localStorage.setItem(KEY, asked);
        return localStorage.getItem(KEY) === "lib" ? "lib" : "own";
    } catch {
        return asked === "lib" ? "lib" : "own";
    }
}

export const ENGINE = read();
document.documentElement.dataset.engine = ENGINE;

export function choose(engine) {
    try { localStorage.setItem(KEY, engine); } catch { /* the reload keeps the old one */ }
    const url = new URL(location.href);
    url.searchParams.delete("engine");
    location.replace(url);
}
