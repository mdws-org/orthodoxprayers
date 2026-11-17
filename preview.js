// BETA ONLY: a panel to compare the two line-setting engines on a phone.
// Shows which engine set the page and how long it took, and switches.
import { ENGINE, choose } from "./engine-pref.js";

const root = document.documentElement;
const panel = document.createElement("div");
panel.setAttribute("role", "group");
panel.setAttribute("aria-label", "Beta: line-setting engine");
panel.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;gap:8px;align-items:center;justify-content:center;padding:6px 10px calc(6px + env(safe-area-inset-bottom));font:13px/1.2 -apple-system,system-ui,sans-serif;background:rgba(20,20,20,0.9);color:#eee";

const label = document.createElement("span");
const button = (engine, text) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-pressed", String(ENGINE === engine));
    b.style.cssText = "font:inherit;padding:5px 10px;border-radius:6px;border:1px solid #888;color:#eee;background:" + (ENGINE === engine ? "#8f1f1f" : "transparent");
    b.addEventListener("click", () => { if (ENGINE !== engine) choose(engine); });
    return b;
};
const hide = document.createElement("button");
hide.type = "button";
hide.textContent = "Hide";
hide.style.cssText = "font:inherit;padding:5px 8px;border:0;color:#bbb;background:transparent";
hide.addEventListener("click", () => panel.remove());

const report = () => {
    const took = root.dataset.justifyTook, set = root.dataset.justifyCount;
    label.textContent = took ? `${set} paragraphs in ${took} ms` : root.dataset.justify === "on" ? "setting" : "not set";
};
new MutationObserver(report).observe(root, { attributes: true, attributeFilter: ["data-justify-took", "data-justify"] });
report();

panel.append(button("own", "Ours"), button("lib", "Library"), label, hide);
document.body.append(panel);
