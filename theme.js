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
})();
