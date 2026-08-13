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
       the moment it reads the tag, long before a deferred module runs. While
       the markup carried a fixed bar as its no-JS fallback, every page fetched
       that bar and then app.js asked for a different one: two ornaments down
       the wire on five days in six, around 18 KB wasted each cold visit.

       So the markup now ships no src at all. This script picks the bar and
       preloads it from the <head>, which starts the correct file as early as
       the wrong one used to start, and app.js sets the src once the element
       exists. One ornament, fetched no later than before.

       The seed is the reader's LOCAL calendar date. Dividing Date.now() by a
       day rolled the bar over at 00:00 UTC, which is late afternoon in
       Arizona. Passing the local Y/M/D through Date.UTC keeps both promises:
       two readers on the same calendar date see the same bar whatever their
       zone, and it turns over at their own midnight. Date.UTC also sidesteps
       DST, because it reads calendar fields rather than doing arithmetic on a
       clock offset. */
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
    // The box is reserved from the ratio of the bar actually being shown, so
    // nothing moves when the image arrives. The old width/height attributes
    // could not do this: they described the fallback, not the chosen bar.
    el.style.setProperty("--bar-ar", bar[1] + " / " + bar[2]);

    var link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/art/bars/" + bar[0] + ".svg";
    document.head.appendChild(link);
})();
