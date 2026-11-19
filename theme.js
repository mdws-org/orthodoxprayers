// Loaded synchronously in <head> so the stored theme applies before first
// paint (no flash). External file because the site CSP is script-src 'self'.
// Stored values: "day" | "night". Nothing stored means follow the system,
// which is the default for a new visitor and is not a button position.
(function () {
    var t = null;
    try { t = localStorage.getItem("prayers-theme"); } catch (e) {}
    if (t === "day" || t === "night") {
        document.documentElement.dataset.theme = t;
    }

    /* ---- Masthead ornament: choose the day's bar before anything loads ----
       This runs here, and not in app.js, because of when the browser looks
       for images. The parser's preload scanner starts fetching an <img src>
       the moment it reads the tag, long before a deferred module runs, so the
       masthead <img> ships with no src: a fixed fallback src would be fetched
       on every page and then replaced by the day's bar. This script picks the
       bar and preloads it from the <head>, and app.js sets the src once the
       element exists, so each visit fetches one ornament, as early as the
       preload scanner would have.

       The seed is the reader's LOCAL calendar date, passed as Y/M/D through
       Date.UTC: two readers on the same calendar date see the same bar
       whatever their zone, and it turns over at their own midnight rather than
       at 00:00 UTC. Date.UTC reads calendar fields rather than doing
       arithmetic on a clock offset, so DST does not move the turnover. */
    var BARS = [
        ["bar2", 2816, 477],
        ["bar8", 2741, 418],
        ["bar12", 4371, 718],
        ["bar13", 5087, 647],
        ["bar19", 2243, 479],
        ["bar20", 2556, 565]
    ];
    var el = document.documentElement;
    var now = new Date();
    var day = Math.floor(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5
    );
    var offset = parseInt(el.dataset.rotate, 10) || 0;
    var bar = BARS[(day + offset) % BARS.length];

    el.dataset.bar = bar[0];
    // The box is reserved from the ratio of the bar being shown, so nothing
    // moves when the image arrives.
    el.style.setProperty("--bar-ar", bar[1] + " / " + bar[2]);

    var link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/art/bars/" + bar[0] + ".svg";
    document.head.appendChild(link);
})();
