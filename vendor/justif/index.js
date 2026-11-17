import { normalizeHangingPunctuation, hangingCharacters, composeProtrusion, latinProtrusion, defaultBuildOptions, defaultBreakOptions, textMakesBox, breakParagraph, layoutLines, fontProtrusion, buildItems, ItemType, graphemes, breakEndBox, CJK_CHAR, caseTransformedText } from './chunk-C566JZY6.js';
export { composeProtrusion, fontProtrusion, hangingCharacters, hangingPunctuation, kinsokuNotAtLineEnd, kinsokuNotAtLineStart, latinProtrusion } from './chunk-C566JZY6.js';

// src/core/errors.ts
function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/dom/measure.ts
function fontSpecOf(style) {
  const letterSpacing = style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing) || 0;
  const wordSpacing = parseFloat(style.wordSpacing) || 0;
  const computed = function (property, fallback) {
    if (fallback === void 0) {
      fallback = "normal";
    }
    return style.getPropertyValue(property).trim() || fallback;
  };
  const spec = {
    style: style.fontStyle,
    weight: style.fontWeight,
    sizePx: parseFloat(style.fontSize) || 16,
    family: style.fontFamily,
    letterSpacingPx: letterSpacing,
    wordSpacingPx: wordSpacing,
    stretch: style.fontStretch || "100%",
    variationSettings: style.fontVariationSettings || "normal",
    variantAlternates: computed("font-variant-alternates"),
    variantCaps: computed("font-variant-caps"),
    variantEastAsian: computed("font-variant-east-asian"),
    // font-variant-emoji is newer than the other longhands and is absent
    // from older CSSStyleDeclaration typings/engines. An unsupported
    // property computes to the same effective initial value.
    variantEmoji: computed("font-variant-emoji"),
    hyphens: style.hyphens || style.webkitHyphens || "manual",
    ligatures: computed("font-variant-ligatures"),
    featureSettings: computed("font-feature-settings"),
    numeric: computed("font-variant-numeric"),
    variantPosition: computed("font-variant-position"),
    textTransform: computed("text-transform", "none"),
    direction: style.direction === "rtl" ? "rtl" : "ltr",
    key: "",
    needsDomMeasurement: false
  };
  spec.key = [spec.style, spec.weight, spec.sizePx, spec.family, spec.letterSpacingPx, spec.wordSpacingPx, spec.stretch, spec.variationSettings, spec.variantAlternates, spec.variantCaps, spec.variantEastAsian, spec.variantEmoji, spec.ligatures, spec.featureSettings, spec.numeric, spec.variantPosition, spec.textTransform].join("|");
  spec.needsDomMeasurement = spec.textTransform !== "none" || spec.variantCaps !== "normal" || spec.variantAlternates !== "normal" || spec.variantEastAsian !== "normal" || spec.variantEmoji !== "normal" || spec.ligatures !== "normal" || spec.featureSettings !== "normal" || spec.numeric !== "normal" || spec.variantPosition !== "normal";
  return spec;
}
function ctxFontOf(spec) {
  const style = spec.style === "normal" ? "" : spec.style + " ";
  const weight = spec.weight === "400" || spec.weight === "normal" ? "" : spec.weight + " ";
  return `${style}${weight}${spec.sizePx}px ${spec.family}`;
}
var sharedCtx = null;
var currentKey = "";
var currentDirection = "ltr";
function getCtx() {
  if (sharedCtx === null) {
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(0, 0);
    sharedCtx = canvas.getContext("2d");
    if (sharedCtx === null) throw new Error("justif: no 2d canvas context");
  }
  return sharedCtx;
}
var probeCtx = null;
function probeAdvance(font, text) {
  if (probeCtx === null) {
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(0, 0);
    probeCtx = canvas.getContext("2d");
    if (probeCtx === null) throw new Error("justif: no 2d canvas context");
  }
  probeCtx.font = font;
  let width = 0;
  for (let at = 0; at < text.length;) {
    let end = Math.min(text.length, at + 2048);
    const code = text.charCodeAt(end - 1);
    if (code >= 55296 && code <= 56319 && end < text.length) end++;
    width += probeCtx.measureText(text.slice(at, end)).width;
    at = end;
  }
  return width;
}
function setFont(ctx, spec) {
  if (currentKey === spec.key && currentDirection === spec.direction) return;
  if ("direction" in ctx) ctx.direction = spec.direction;
  currentDirection = spec.direction;
  ctx.font = ctxFontOf(spec);
  if ("letterSpacing" in ctx) ctx.letterSpacing = spec.letterSpacingPx + "px";
  if ("wordSpacing" in ctx) ctx.wordSpacing = spec.wordSpacingPx + "px";
  if ("fontVariantCaps" in ctx) {
    ctx.fontVariantCaps = "normal";
  }
  currentKey = spec.key;
}
function applyFontSpec(el, spec) {
  el.style.fontStyle = spec.style;
  el.style.fontWeight = spec.weight;
  el.style.fontSize = spec.sizePx + "px";
  el.style.fontFamily = spec.family;
  el.style.letterSpacing = spec.letterSpacingPx + "px";
  el.style.wordSpacing = spec.wordSpacingPx + "px";
  el.style.direction = spec.direction;
  el.style.fontStretch = spec.stretch;
  el.style.fontVariationSettings = spec.variationSettings;
  el.style.setProperty("text-transform", spec.textTransform);
  el.style.setProperty("font-variant-alternates", spec.variantAlternates);
  el.style.setProperty("font-variant-caps", spec.variantCaps);
  el.style.setProperty("font-variant-east-asian", spec.variantEastAsian);
  el.style.setProperty("font-variant-emoji", spec.variantEmoji);
  el.style.setProperty("font-variant-ligatures", spec.ligatures);
  el.style.setProperty("font-variant-numeric", spec.numeric);
  el.style.setProperty("font-variant-position", spec.variantPosition);
  el.style.setProperty("font-feature-settings", spec.featureSettings);
}
function requiresDomMeasurement(spec) {
  return spec.needsDomMeasurement;
}
function supportsSpec(spec) {
  if (spec.stretch !== "100%" && spec.stretch !== "normal") return false;
  if (spec.variationSettings !== "normal") return false;
  return true;
}
var widthCache = /* @__PURE__ */new Map();
var domWidthCache = /* @__PURE__ */new Map();
var MAX_CACHED_WIDTHS = 15e4;
var cachedWidths = 0;
function trimWidthCaches() {
  for (const cache3 of [widthCache, domWidthCache]) {
    for (const _ref of cache3) {
      const key = _ref[0];
      const perFont = _ref[1];
      const drop = perFont.size >> 1;
      if (drop === 0) {
        if (perFont.size === 0) cache3.delete(key);
        continue;
      }
      let dropped = 0;
      for (const text of perFont.keys()) {
        if (dropped >= drop) break;
        perFont.delete(text);
        dropped++;
      }
      cachedWidths -= dropped;
    }
  }
}
function noteCachedWidth() {
  if (++cachedWidths > MAX_CACHED_WIDTHS) trimWidthCaches();
}
var pendingDomWidths = /* @__PURE__ */new Map();
var collectingDomWidths = false;
var segmenter;
function graphemeCount(text) {
  if (segmenter === void 0) {
    segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter() : null;
  }
  if (segmenter === null) return Array.from(text).length;
  let n = 0;
  for (const _ of segmenter.segment(text)) n++;
  return n;
}
function measureCanvasWidth(text, spec) {
  let perFont = widthCache.get(spec.key);
  if (perFont === void 0) {
    perFont = /* @__PURE__ */new Map();
    widthCache.set(spec.key, perFont);
  }
  const hit = perFont.get(text);
  if (hit !== void 0) return hit;
  const ctx = getCtx();
  setFont(ctx, spec);
  let width = ctx.measureText(text).width;
  if (!("letterSpacing" in ctx)) {
    if (spec.letterSpacingPx !== 0) width += spec.letterSpacingPx * graphemeCount(text);
    if (spec.wordSpacingPx !== 0) {
      let spaces = 0;
      for (const ch of text) if (ch === " " || ch === "\xA0") spaces++;
      width += spec.wordSpacingPx * spaces;
    }
  }
  perFont.set(text, width);
  noteCachedWidth();
  return width;
}
function cachedDomWidth(text, spec) {
  return domWidthCache.get(spec.key)?.get(text);
}
function queueDomWidth(text, spec) {
  let pending = pendingDomWidths.get(spec.key);
  if (pending === void 0) {
    pending = {
      spec,
      texts: /* @__PURE__ */new Set()
    };
    pendingDomWidths.set(spec.key, pending);
  }
  pending.texts.add(text);
}
function flushDomWidths() {
  if (pendingDomWidths.size === 0) return;
  if (typeof document === "undefined" || document.body === null) {
    pendingDomWidths.clear();
    return;
  }
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none;white-space:pre;width:max-content;contain:layout style paint;";
  const probes = [];
  for (const _ref2 of pendingDomWidths.values()) {
    const spec = _ref2.spec;
    const texts = _ref2.texts;
    let perFont = domWidthCache.get(spec.key);
    if (perFont === void 0) {
      perFont = /* @__PURE__ */new Map();
      domWidthCache.set(spec.key, perFont);
    }
    for (const text of texts) {
      if (perFont.has(text)) continue;
      if (text.length === 0) {
        perFont.set(text, 0);
        noteCachedWidth();
        continue;
      }
      const span = document.createElement("span");
      applyFontSpec(span, spec);
      span.style.display = "block";
      span.style.width = "max-content";
      span.style.whiteSpace = "pre";
      span.textContent = text;
      host.append(span);
      probes.push({
        span,
        text,
        spec
      });
    }
  }
  pendingDomWidths.clear();
  document.body.append(host);
  try {
    for (const _ref3 of probes) {
      const span = _ref3.span;
      const text = _ref3.text;
      const spec = _ref3.spec;
      domWidthCache.get(spec.key).set(text, span.getBoundingClientRect().width);
      noteCachedWidth();
    }
  } finally {
    host.remove();
  }
}
function collectDomMeasurements(work) {
  if (collectingDomWidths) return work();
  collectingDomWidths = true;
  try {
    return work();
  } finally {
    collectingDomWidths = false;
    flushDomWidths();
  }
}
function measureWidth(text, spec) {
  if (!requiresDomMeasurement(spec)) return measureCanvasWidth(text, spec);
  const hit = cachedDomWidth(text, spec);
  if (hit !== void 0) return hit;
  queueDomWidth(text, spec);
  if (collectingDomWidths) return measureCanvasWidth(text, spec);
  flushDomWidths();
  return cachedDomWidth(text, spec) ?? measureCanvasWidth(text, spec);
}
var bearingCache = /* @__PURE__ */new Map();
function transformedText(text, spec) {
  return caseTransformedText(text, spec.textTransform);
}
function measureInkBearings(ch, spec) {
  let perFont = bearingCache.get(spec.key);
  if (perFont === void 0) {
    perFont = /* @__PURE__ */new Map();
    bearingCache.set(spec.key, perFont);
  }
  const hit = perFont.get(ch);
  if (hit !== void 0) return hit;
  const ctx = getCtx();
  setFont(ctx, spec);
  const m = ctx.measureText(transformedText(ch, spec));
  const bearings = {
    l: Math.max(0, -m.actualBoundingBoxLeft),
    r: Math.max(0, m.width - m.actualBoundingBoxRight)
  };
  perFont.set(ch, bearings);
  return bearings;
}
function isMonospace(spec) {
  return Math.abs(measureWidth("i", spec) - measureWidth("M", spec)) < 0.01;
}
function clearMeasureCache() {
  widthCache.clear();
  domWidthCache.clear();
  cachedWidths = 0;
  pendingDomWidths.clear();
  bearingCache.clear();
  currentKey = "";
}

// src/dom/calibrate.ts
var NO_EXPANSION = {
  ratioAtMax: 1,
  ratioAtMin: 1
};
var CALIBRATION_STRING = "Sphinx of black quartz, judge my vow; 0123456789 flavors of justified text.";
var RESPONSE_EPSILON = 0.05;
var HEBREW_SAMPLE = "\u05D0\u05D1\u05D2\u05D3\u05D4\u05D5\u05D6\u05D7\u05D8\u05D9\u05DB\u05DC\u05DE\u05E0\u05E1\u05E2\u05E4\u05E6\u05E7\u05E8\u05E9\u05EA";
var ARABIC_SAMPLE = "\u0627\u0644\u062D\u0645\u062F\u0644\u0644\u0647\u0631\u0628\u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0646\u0648\u0628\u0647\u0646\u0633\u062A\u0639\u064A\u0646";
var CJK_SAMPLE = "\u6C38\u56FD\u916C\u9DF9\u91B8\u3042\u304B\u3059\u306A\u306E\u306F\u305F\u307E\u30A2\u30AB\u30CA\u30BF\u30DE\uAC00\uB098\uB2E4\uB77C\uB9C8\uBC14\uC0AC";
function calibrationTextFor(runText) {
  let text = "";
  let tag = "";
  if (runText !== void 0) {
    if (/\p{Script=Hebrew}/u.test(runText)) {
      text = HEBREW_SAMPLE;
      tag = "he";
    }
    if (/\p{Script=Arabic}/u.test(runText)) {
      text += ARABIC_SAMPLE;
      tag += "ar";
    }
    if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(runText)) {
      text += CJK_SAMPLE;
      tag += "cjk";
    }
  }
  return text === "" ? {
    text: CALIBRATION_STRING,
    tag: ""
  } : {
    text,
    tag
  };
}
var cache = /* @__PURE__ */new Map();
function calibrateStretch(spec, maxPct, minPct, samplePcts, runText) {
  if (samplePcts === void 0) {
    samplePcts = [];
  }
  const _calibrationTextFor = calibrationTextFor(runText),
    calibrationText = _calibrationTextFor.text,
    tag = _calibrationTextFor.tag;
  const cacheKey = `${spec.key}|${maxPct}|${minPct}|${samplePcts.join(",")}|${tag}`;
  const hit = cache.get(cacheKey);
  if (hit !== void 0) return hit;
  if (spec.variationSettings.includes('"wdth"') || spec.stretch !== "100%" && spec.stretch !== "normal") {
    cache.set(cacheKey, NO_EXPANSION);
    return NO_EXPANSION;
  }
  if (typeof document === "undefined" || document.body === null) return NO_EXPANSION;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden;white-space:pre;width:max-content;contain:layout style;";
  const span = document.createElement("span");
  applyFontSpec(span, spec);
  span.textContent = calibrationText;
  host.append(span);
  document.body.append(host);
  const widthAt = stretch => {
    span.style.fontStretch = stretch;
    return span.getBoundingClientRect().width;
  };
  let result;
  try {
    const base = widthAt("100%");
    const wide = widthAt(maxPct + "%");
    const narrow = widthAt(minPct + "%");
    const ratioAtMax = base > 0 && Math.abs(wide - base) > RESPONSE_EPSILON ? wide / base : 1;
    const ratioAtMin = base > 0 && Math.abs(narrow - base) > RESPONSE_EPSILON ? narrow / base : 1;
    let ratios;
    if (base > 0 && (ratioAtMax !== 1 || ratioAtMin !== 1) && samplePcts.length > 0) {
      ratios = /* @__PURE__ */new Map();
      for (const pct of samplePcts) {
        if (pct > 100 && ratioAtMax === 1) ratios.set(pct, 1);else if (pct < 100 && ratioAtMin === 1) ratios.set(pct, 1);else ratios.set(pct, widthAt(pct + "%") / base);
      }
    }
    result = {
      ratioAtMax,
      ratioAtMin,
      ratios
    };
  } finally {
    host.remove();
  }
  cache.set(cacheKey, result);
  return result;
}
function clearCalibrationCache() {
  cache.clear();
}

// src/dom/optical.ts
var LAMBDA_EM = 0.45;
var NOISE_K = 1;
var ALLOW_EM = 0.05;
var HEFT_K = 0.3;
var RASTER_PX = 32;
var RASTER_COLUMNS = 8;
var INK_PRESENT = 0.2;
var INK_BYTE_MIN = (() => {
  let byte = 0;
  while (byte < 255 && byte / 255 < INK_PRESENT) byte++;
  return byte;
})();
var INK_BYTE_OVER = (() => {
  let byte = INK_BYTE_MIN;
  while (byte < 255 && byte / 255 <= INK_PRESENT) byte++;
  return byte;
})();
var CAPS_PROBE = "handgloves";
var TAILS = ["nono", "aese"];
var HEADS = ["onon", "esea"];
var STEM_REFERENCE = {
  l: ["n", "h", "m", "u", "r", "b", "p", "k"],
  r: ["d", "h", "n", "m", "u", "l", "k", "q"]
};
var POPULATION = {
  l: ["t", "a", "s", "w", "o", "c", "n", "h", "d", "r", "i", "l", "f", "m", "p", "b", "e", "g"],
  r: ["e", "s", "d", "t", "n", "y", "r", "o", "l", "f", "h", "m", "a", "g", "k", "w", "p", "x"]
};
var CANDIDATES = [...`\u201C\u201D\u2018\u2019"'.,;:!?-\u2013\u2014\u2010()[]{}\xAB\xBB\u2039\u203A\xA1\xBF*/@%~_+\u201A\u201E<>\\|=&`, ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", ..."abcdefghijklmnopqrstuvwxyz", ..."0123456789"];
var opticalCandidates = CANDIDATES;
var shared = null;
var unavailable = false;
function context() {
  if (unavailable) return null;
  if (shared !== null) return shared;
  try {
    const ctx = document.createElement("canvas").getContext("2d", {
      willReadFrequently: true
    });
    if (ctx === null) {
      unavailable = true;
      return null;
    }
    shared = ctx;
    return shared;
  } catch {
    unavailable = true;
    return null;
  }
}
var cache2 = /* @__PURE__ */new Map();
function clearOpticalCache() {
  cache2.clear();
}
function opticalFontKey(spec) {
  return [`${spec.style} ${spec.weight} ${RASTER_PX}px ${spec.family}`, spec.stretch, spec.variationSettings, spec.variantCaps, spec.variantAlternates, spec.variantEastAsian, spec.variantPosition, spec.numeric, spec.ligatures, spec.featureSettings].join("|");
}
function fullSpec(spec) {
  return {
    style: "normal",
    weight: "400",
    stretch: "100%",
    variationSettings: "normal",
    variantCaps: "normal",
    variantAlternates: "normal",
    variantEastAsian: "normal",
    variantPosition: "normal",
    numeric: "normal",
    ligatures: "normal",
    featureSettings: "normal",
    ...spec
  };
}
function opticalProtrusion(input) {
  const spec = fullSpec(input);
  const key = opticalFontKey(spec);
  const hit = cache2.get(key);
  if (hit !== void 0 || cache2.has(key)) return hit;
  const table = measure(spec);
  cache2.set(key, table);
  return table;
}
function measure(spec) {
  const draw = context();
  if (draw === null) return void 0;
  const font = `${spec.style} ${spec.weight} ${RASTER_PX}px ${spec.family}`;
  const applyFont = () => {
    draw.font = font;
    draw.textBaseline = "alphabetic";
    draw.fontVariantCaps = spec.variantCaps;
  };
  applyFont();
  const metricsMemo = /* @__PURE__ */new Map();
  const metricsOf = text => {
    let box = metricsMemo.get(text);
    if (box === void 0) {
      box = draw.measureText(text);
      metricsMemo.set(text, box);
    }
    return box;
  };
  const advance = text => metricsOf(text).width;
  if (advance("n") <= 0) return void 0;
  if (spec.variantCaps !== "normal") {
    const variantWidth = draw.measureText(CAPS_PROBE).width;
    draw.font = `${spec.style} ${spec.weight} ${RASTER_PX}px ${spec.family}`;
    draw.fontVariantCaps = "normal";
    if (draw.measureText(CAPS_PROBE).width === variantWidth) return void 0;
    applyFont();
  }
  const monoAdvances = ["i", "W", ".", "m"].map(advance);
  const monospace = Math.max(...monoAdvances) - Math.min(...monoAdvances) <= 0.01;
  const pad = Math.round(RASTER_PX * 0.5);
  const win = Math.round(RASTER_PX * 1.6);
  const strip = pad + win;
  const asc = Math.round(RASTER_PX * 1.05);
  const cellH = asc + Math.round(RASTER_PX * 0.4);
  const gridFor = count => {
    const columns = Math.min(RASTER_COLUMNS, Math.max(1, count));
    return {
      columns,
      width: strip * columns,
      height: cellH * Math.ceil(Math.max(1, count) / columns)
    };
  };
  const fillClippedToColumn = (text, x, y, cellX, canvasHeight) => {
    draw.save();
    draw.beginPath();
    draw.rect(cellX, 0, strip, canvasHeight);
    draw.clip();
    draw.fillText(text, x, y);
    draw.restore();
  };
  let geometry;
  let bandTop = cellH;
  let bandBottom = -1;
  try {
    const glyphs = [...CANDIDATES, "n"];
    const grid = gridFor(glyphs.length);
    draw.canvas.width = grid.width;
    draw.canvas.height = grid.height;
    applyFont();
    draw.clearRect(0, 0, grid.width, grid.height);
    draw.fillStyle = "#000";
    glyphs.forEach((g, i) => {
      const cellX = i % grid.columns * strip;
      const cellY = Math.floor(i / grid.columns) * cellH;
      fillClippedToColumn(g, cellX + pad, cellY + asc, cellX, grid.height);
    });
    const img = draw.getImageData(0, 0, grid.width, grid.height);
    const data = img.data;
    const measured = glyphs.map((g, i) => {
      let mass = 0;
      let moment = 0;
      const cellX = i % grid.columns * strip;
      const cellY = Math.floor(i / grid.columns) * cellH;
      for (let dy = 0; dy < cellH; dy++) {
        let at = ((cellY + dy) * grid.width + cellX) * 4 + 3;
        for (let x = 0; x < strip; x++, at += 4) {
          const raw = data[at];
          if (raw >= INK_BYTE_MIN) {
            const a = raw / 255;
            mass += a;
            moment += a * (x + 0.5 - pad);
            if (dy < bandTop) bandTop = dy;
            if (dy > bandBottom) bandBottom = dy;
          }
        }
      }
      return mass > 0 ? {
        mass,
        centre: moment / mass
      } : null;
    });
    const nMass = measured[glyphs.length - 1]?.mass ?? 0;
    if (nMass <= 0) return void 0;
    geometry = new Map(glyphs.flatMap((g, i) => {
      const m = measured[i];
      return m === null || m === void 0 ? [] : [[g, {
        centre: m.centre,
        mass: m.mass / nMass
      }]];
    }));
  } catch {
    unavailable = true;
    return void 0;
  }
  const centroids = (strings, side) => {
    const grid = gridFor(strings.length);
    draw.canvas.width = grid.width;
    draw.canvas.height = grid.height;
    applyFont();
    draw.clearRect(0, 0, grid.width, grid.height);
    draw.fillStyle = "#000";
    strings.forEach((s, i) => {
      const cellX = i % grid.columns * strip;
      const cellY = Math.floor(i / grid.columns) * cellH;
      const x = side === "l" ? cellX + pad : cellX + strip - pad - advance(s);
      fillClippedToColumn(s, x, cellY + asc, cellX, grid.height);
    });
    const img = draw.getImageData(0, 0, grid.width, grid.height);
    const data = img.data;
    const noBand = bandBottom < bandTop;
    const dy0 = noBand ? 0 : Math.max(0, bandTop - 1);
    const dy1 = noBand ? cellH - 1 : Math.min(cellH - 1, bandBottom + 1);
    const cols = new Float64Array(strip);
    return strings.map((_, i) => {
      let sum = 0;
      let moment = 0;
      const cellX = i % grid.columns * strip;
      const cellY = Math.floor(i / grid.columns) * cellH;
      cols.fill(0);
      for (let dy = dy0; dy <= dy1; dy++) {
        let at = ((cellY + dy) * grid.width + cellX) * 4 + 3;
        for (let x = 0; x < strip; x++, at += 4) {
          const raw = data[at];
          if (raw >= INK_BYTE_OVER) cols[x] = cols[x] + (raw / 255 - INK_PRESENT);
        }
      }
      for (let x = 0; x < strip; x++) {
        const d = side === "l" ? x - pad : strip - pad - 1 - x;
        const w = cols[x] * Math.exp(-Math.max(0, d) / RASTER_PX / LAMBDA_EM);
        sum += w;
        moment += w * (d + 0.5);
      }
      return sum > 0 ? moment / sum : null;
    });
  };
  const table = {};
  for (const side of ["l", "r"]) {
    const contexts = side === "l" ? TAILS : HEADS;
    const refSet = STEM_REFERENCE[side];
    const popSet = POPULATION[side];
    const measuredAsReference = [... /* @__PURE__ */new Set([...refSet, ...popSet])].map(r => ` ${r}`);
    const strings = [];
    const owner = [];
    for (const ch of [...CANDIDATES, ...measuredAsReference]) {
      const glyph = ch.startsWith(" ") ? ch.slice(1) : ch;
      for (const t of contexts) {
        strings.push(side === "l" ? glyph + t : t + glyph);
        owner.push(ch);
      }
    }
    let cells;
    try {
      cells = centroids(strings, side);
    } catch {
      unavailable = true;
      return void 0;
    }
    const sums = /* @__PURE__ */new Map();
    cells.forEach((v, i) => {
      if (v === null) return;
      const rec = sums.get(owner[i]) ?? [];
      rec.push(v);
      sums.set(owner[i], rec);
    });
    const meanOf = k => {
      const rec = sums.get(k);
      if (rec === void 0 || rec.length === 0) return null;
      return rec.reduce((a, b) => a + b, 0) / rec.length;
    };
    const refs = refSet.map(r => meanOf(` ${r}`)).filter(v => v !== null);
    if (refs.length === 0) return void 0;
    const reference = refs.reduce((a, b) => a + b, 0) / refs.length;
    applyFont();
    const bearingOf = ch => {
      const box = metricsOf(ch);
      return side === "l" ? -box.actualBoundingBoxLeft : advance(ch) - box.actualBoundingBoxRight;
    };
    const stemBearing = refSet.reduce((a, r) => a + bearingOf(r), 0) / refSet.length;
    const pop = popSet.map(r => meanOf(` ${r}`)).filter(v => v !== null);
    const popMean = pop.length > 0 ? pop.reduce((a, b) => a + b, 0) / pop.length : reference;
    const noise = pop.length < 2 ? 0 : NOISE_K * Math.sqrt(pop.reduce((sum, v) => sum + (v - popMean) ** 2, 0) / (pop.length - 1));
    for (const ch of CANDIDATES) {
      const mu = meanOf(ch);
      if (mu === null) continue;
      const adv = advance(ch);
      if (adv <= 0) continue;
      const geo = geometry.get(ch);
      if (geo === void 0) continue;
      const raw = mu - reference;
      const read = raw * Math.max(0, 1 - (noise / (Math.abs(raw) || 1e-9)) ** 2);
      const bearing = bearingOf(ch);
      const inkLine = bearing - stemBearing;
      const centre = side === "l" ? geo.centre : adv - geo.centre;
      const light = Math.exp(-((geo.mass / HEFT_K) ** 2));
      const ceiling = Math.max(0, (1 - light) * inkLine + light * centre + RASTER_PX * ALLOW_EM);
      const floor = Math.min(inkLine, ceiling);
      const permille = Math.round(Math.min(Math.max(read, floor), ceiling) / adv * 1e3);
      if (monospace && permille < 0) continue;
      if (Math.abs(permille) < 15) continue;
      (table[ch] ?? (table[ch] = {}))[side] = permille;
    }
  }
  return Object.keys(table).length > 0 ? table : void 0;
}

// src/dom/clipboard.ts
var BLOCKY_TAGS = /^(?:P|DIV|LI|UL|OL|BLOCKQUOTE|H[1-6]|PRE|TABLE|TR|SECTION|ARTICLE|HEADER|FOOTER|FIGURE|FIGCAPTION)$/;
function plainTextOf(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? "";
  let out = "";
  for (let c = node.firstChild; c !== null; c = c.nextSibling) out += plainTextOf(c);
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName;
    if (tag === "BR") out += "\n";else if (BLOCKY_TAGS.test(tag)) out += "\n\n";
  }
  return out;
}
function nonEmptyTextNodesInRange(range) {
  const root = range.commonAncestorContainer;
  const out = [];
  const visit = node => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node;
    if (!range.intersectsNode(text)) return;
    const start = text === range.startContainer ? range.startOffset : 0;
    const end = text === range.endContainer ? range.endOffset : text.data.length;
    if (start < end) out.push(text);
  };
  if (root.nodeType === Node.TEXT_NODE) visit(root);else {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      visit(node);
    }
  }
  return out;
}
function isJustifBoundaryJoint(node) {
  const parent = node.parentElement;
  return node.data === " " && parent !== null && parent.closest(".justif-seg") === null && parent.closest("[data-justif]") !== null;
}
function isClonedBoundaryJoint(node) {
  const parent = node.parentElement;
  return node.data === " " && (parent === null || parent.closest(".justif-seg") === null);
}
function removeCopiedBoundaryJoints(range, fragment) {
  const included = nonEmptyTextNodesInRange(range);
  if (included.length === 0) return;
  const trimLeading = isJustifBoundaryJoint(included[0]);
  const trimTrailing = isJustifBoundaryJoint(included[included.length - 1]);
  if (!trimLeading && !trimTrailing) return;
  const cloned = nonEmptyTextNodesInRange(
  // A detached fragment is not a live selection range, so collect its text
  // nodes directly rather than reusing the range helper above.
  (() => {
    const cloneRange = fragment.ownerDocument.createRange();
    cloneRange.selectNodeContents(fragment);
    return cloneRange;
  })());
  const remove = /* @__PURE__ */new Set();
  const first = cloned[0];
  const last = cloned[cloned.length - 1];
  if (trimLeading && first !== void 0 && isClonedBoundaryJoint(first)) {
    remove.add(first);
  }
  if (trimTrailing && last !== void 0 && isClonedBoundaryJoint(last)) {
    remove.add(last);
  }
  for (const node of remove) node.remove();
}
function removeVoidJoints(fragment) {
  for (const joint of fragment.querySelectorAll(".justif-joint-void")) joint.remove();
}
function removeGeneratedMetadata(fragment) {
  for (const el of fragment.querySelectorAll(".justif-generated-before,.justif-generated-after,.justif-generated-before-none,.justif-generated-after-none")) {
    el.classList.remove("justif-generated-before", "justif-generated-after", "justif-generated-before-none", "justif-generated-after-none");
    if (el.classList.length === 0) el.removeAttribute("class");
    for (let i = el.style.length - 1; i >= 0; i--) {
      const property = el.style.item(i);
      if (property.startsWith("--j-b-") || property.startsWith("--j-a-")) {
        el.style.removeProperty(property);
      }
    }
    if (el.style.length === 0) el.removeAttribute("style");
  }
}
var clipboardParticipants = /* @__PURE__ */new Set();
var onDocumentCopy = e => {
  if (e.clipboardData === null) return;
  const sel = document.getSelection();
  if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) return;
  let touches = false;
  let authorNbsp = false;
  for (const participant of clipboardParticipants) {
    for (const _ref4 of participant.enhanced()) {
      const p = _ref4[0];
      const scan = _ref4[1];
      if (!sel.containsNode(p, true)) continue;
      touches = true;
      if (scan.authorHasNbsp) authorNbsp = true;
    }
  }
  if (!touches) return;
  const clean = v => {
    const noWj = v.replace(/\u2060/g, "");
    return authorNbsp ? noWj : noWj.replace(/\u00A0/g, " ");
  };
  const html = document.createElement("div");
  let plain = "";
  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i);
    const frag = range.cloneContents();
    removeCopiedBoundaryJoints(range, frag);
    removeVoidJoints(frag);
    removeGeneratedMetadata(frag);
    const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
      n.nodeValue = clean(n.nodeValue ?? "");
    }
    plain += plainTextOf(frag);
    html.append(frag);
  }
  e.clipboardData.setData("text/plain", plain.replace(/\n+$/, ""));
  e.clipboardData.setData("text/html", html.innerHTML);
  e.preventDefault();
};
function joinClipboardCleanup(participant) {
  if (clipboardParticipants.size === 0) {
    document.addEventListener("copy", onDocumentCopy);
  }
  clipboardParticipants.add(participant);
  return () => {
    if (!clipboardParticipants.delete(participant)) return;
    if (clipboardParticipants.size === 0) {
      document.removeEventListener("copy", onDocumentCopy);
    }
  };
}

// src/dom/generated-content.ts
var GENERATED_STYLE_PROPERTIES = ["content", "unicode-bidi", "white-space", "padding-left", "padding-right", "border-left-width", "border-left-style", "border-right-width", "border-right-style", "font-family", "font-size", "font-style", "font-weight", "font-stretch", "font-variation-settings", "font-feature-settings", "font-variant-alternates", "font-variant-caps", "font-variant-east-asian", "font-variant-emoji", "font-variant-ligatures", "font-variant-numeric", "font-variant-position", "letter-spacing", "word-spacing", "line-height"];
function contentString(value) {
  if (!/^"(?:[^"\\\n\r]|\\(?:[0-9a-fA-F]{1,6}\s?|[^\n\r]))*"$/.test(value)) {
    return null;
  }
  return value.slice(1, -1).replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (_, escaped) => {
    if (!/^[0-9a-fA-F]/.test(escaped)) return escaped;
    const code = parseInt(escaped.trim(), 16);
    return code === 0 || code > 1114111 || code >= 55296 && code <= 57343 ? "\uFFFD" : String.fromCodePoint(code);
  });
}
function readGeneratedText(style, parent, indexSpec) {
  if (style.display === "none" || style.content === "none" || style.content === "normal") {
    return null;
  }
  if (style.position === "absolute" || style.position === "fixed") {
    return "unsupported generated layout";
  }
  const text = contentString(style.content);
  if (text === null) return "unsupported generated content";
  if (style.display !== "inline" || style.float !== "none" || style.position !== "static" || style.direction !== parent.direction || style.writingMode !== "horizontal-tb" || style.unicodeBidi !== "normal" && style.unicodeBidi !== "isolate" || style.verticalAlign !== "baseline" || style.textTransform !== "none" || style.whiteSpace !== "normal" && style.whiteSpace !== "nowrap" || style.transform !== "none" || ["scale", "rotate", "translate"].some(prop => {
    const value = style.getPropertyValue(prop);
    return value !== "" && value !== "none";
  })) return "unsupported generated layout";
  if ([style.marginLeft, style.marginRight].some(value => (parseFloat(value) || 0) !== 0)) {
    return "generated content has a horizontal margin";
  }
  const insetPx = [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  if (text === "") return "empty generated box";
  if (!/^[\p{Script=Latin}\p{M}\p{N}_]+$/u.test(text) && [...text].length !== 1) {
    return "breakable generated content";
  }
  if (/^\p{M}/u.test(text)) return "contextual generated text";
  if (/[\s\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u2069]/u.test(text)) {
    return "breakable generated content";
  }
  return {
    text,
    spec: indexSpec(style),
    insetPx,
    style: GENERATED_STYLE_PROPERTIES.map(property => style.getPropertyValue(property))
  };
}

// src/dom/write.ts
function hangCarrierShed(seg) {
  return (seg.physicalEndHangPx ?? 0) + (seg.hyphenLetterSpacingPx === void 0 ? seg.physicalPadPx ?? 0 : 0);
}
function terminalSplit(text) {
  const clusters = graphemes(text);
  let end = clusters.length - 1;
  while (end > 0 && clusters[end] === " ") end--;
  const terminal = clusters[end];
  if (terminal === void 0) return {
    before: "",
    prev: void 0,
    terminal,
    after: ""
  };
  return {
    before: clusters.slice(0, end).join(""),
    prev: end > 0 ? clusters[end - 1] : void 0,
    terminal,
    after: clusters.slice(end + 1).join("")
  };
}
var WRAP_SAFETY_PAD_PX = 1.5;
var CORRECTION_WINDOW_PX = -3;
var FLOAT_WRAP_SPARE_PX = 0.25;
var OBJECT_WRAP_SPARE_PX = 0.25;
var STYLE_ID = "justif-style";
var WORD_JOINER = "\u2060";
var px = v => `${Math.round(v * 1e3) / 1e3}px`;
var generatedRule = side => `.justif-generated-${side}::${side}{` + GENERATED_STYLE_PROPERTIES.map((property, index) => `${property}:var(--j-${side[0]}-${index})!important`).join(";") + "}";
var GENERATED_RESET_RULE = ".justif-generated-before::before,.justif-generated-after::after{display:inline!important;position:static!important;float:none!important;direction:inherit!important;writing-mode:horizontal-tb!important;vertical-align:baseline!important;text-transform:none!important;transform:none!important;scale:none!important;rotate:none!important;translate:none!important;margin:0!important;animation:none!important;transition:none!important}";
var SHEET_TEXT =
// Emergency-break licences are neutralized on the paragraph too, but
// Firefox resolves them from the element AT the break point, so the
// paragraph reset alone leaves it breaking whenever an author rule grants
// one closer in — `!important`, or a nested inline the segments are cloned
// into (`a{overflow-wrap:break-word}`). This rule is what covers Firefox
// in those cases; Chromium consults the block container and ignores it.
'.justif-seg,.justif-hyphen,.justif-break{overflow-wrap:normal;word-break:normal;line-break:auto}.justif-seg{white-space:nowrap}.justif-generated-weld-start::before{content:"\u2060";letter-spacing:0!important}.justif-generated-weld-end::after{content:"\u2060";letter-spacing:0!important}.justif-generated-outer-weld::before{content:"\u2060";letter-spacing:0!important}[data-justif]::before,[data-justif]::after{content:none!important}.justif-generated-before-none::before{content:none!important}.justif-generated-after-none::after{content:none!important}' + GENERATED_RESET_RULE + generatedRule("before") + generatedRule("after") + '.justif-soft-break::after{content:"\\A";white-space:pre}.justif-joint{font-size:0;line-height:0}[data-justif-dropcap]::first-letter{all:unset!important}.justif-hyphen{white-space:nowrap}.justif-hyphen::after{content:"-"}.justif-no-transition{transition-property:none!important}.justif-break::after{content:"\u200B"}.justif-weld-end::after{content:"\u2060"}@supports (content:"-" / ""){.justif-hyphen::after{content:"-" / ""}.justif-break::after{content:"\u200B" / ""}.justif-weld-end::after{content:"\u2060" / ""}.justif-generated-weld-start::before{content:"\u2060" / ""}.justif-generated-weld-end::after{content:"\u2060" / ""}.justif-generated-outer-weld::before{content:"\u2060" / ""}}';
var TEXT_AUTOSIZING_DECLARATIONS = [["-webkit-text-size-adjust", "100%"], ["text-size-adjust", "100%"]];
function disableTextAutosizing(el) {
  for (const _ref5 of TEXT_AUTOSIZING_DECLARATIONS) {
    const property = _ref5[0];
    const value = _ref5[1];
    el.style.setProperty(property, value, "important");
  }
}
var styledRoots = /* @__PURE__ */new WeakSet();
function ensureStylesheet(root) {
  if (styledRoots.has(root)) return;
  const isDoc = root.nodeType === 9;
  const doc = isDoc ? root : root.ownerDocument;
  const win = doc.defaultView;
  if (win !== null && "adoptedStyleSheets" in root) {
    try {
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(SHEET_TEXT);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      styledRoots.add(root);
      return;
    } catch {}
  }
  if (isDoc && doc.getElementById(STYLE_ID) !== null) {
    styledRoots.add(root);
    return;
  }
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = SHEET_TEXT;
  (isDoc ? doc.head : root).append(style);
  styledRoots.add(root);
}
function writeParagraph(p, contents, lineWidths, contentWidth, physicalFitLines, leadingFloat, previousFloat, generated) {
  if (physicalFitLines === void 0) {
    physicalFitLines = 0;
  }
  if (generated === void 0) {
    generated = /* @__PURE__ */new Map();
  }
  const doc = p.ownerDocument;
  const root = p.getRootNode();
  ensureStylesheet(root.nodeType === 9 || root.nodeType === 11 && "host" in root ? root : doc);
  const lineElements = [[]];
  const atomicBindings = [];
  const generatedOwners = [];
  const fragment = doc.createDocumentFragment();
  let renderedFloat = null;
  let keptFloat = null;
  if (leadingFloat !== void 0) {
    if (previousFloat != null && previousFloat.parentNode === p) {
      keptFloat = previousFloat;
      renderedFloat = previousFloat;
    } else {
      for (const node of leadingFloat.leadingTrivia) fragment.append(node.cloneNode(true));
      renderedFloat = leadingFloat.source.cloneNode(true);
      fragment.append(renderedFloat);
    }
  }
  const stack = [];
  const containerAt = depth => depth === 0 ? fragment : stack[depth - 1].clone;
  const commonDepth = chain => {
    let i = 0;
    while (i < stack.length && i < chain.length && stack[i].src === chain[i]) i++;
    return i;
  };
  const generatedWeld = () => {
    const weld = doc.createElement("span");
    weld.className = "justif-generated-outer-weld";
    weld.ariaHidden = "true";
    return weld;
  };
  const closeTo = depth => {
    while (stack.length > depth) {
      const entry = stack.pop();
      if (entry.weldAfter) entry.clone.after(generatedWeld());
    }
  };
  const pinGenerated = (clone, side, snapshot) => {
    if (snapshot === null) {
      clone.classList.add(`justif-generated-${side}-none`);
      return;
    }
    clone.classList.add(`justif-generated-${side}`);
    for (let index = 0; index < snapshot.style.length; index++) {
      clone.style.setProperty(`--j-${side[0]}-${index}`, snapshot.style[index]);
    }
  };
  const containerFor = chain => {
    let depth = commonDepth(chain);
    closeTo(depth);
    for (; depth < chain.length; depth++) {
      const src = chain[depth];
      const snapshots = generated.get(src);
      const parent = containerAt(depth);
      if (snapshots?.[0] !== null && snapshots?.[0] !== void 0) {
        parent.append(generatedWeld());
      }
      const clone = src.cloneNode(false);
      if (snapshots !== void 0) {
        pinGenerated(clone, "before", snapshots[0]);
        pinGenerated(clone, "after", snapshots[1]);
        generatedOwners.push({
          clone,
          snapshots
        });
      }
      parent.append(clone);
      stack.push({
        src,
        clone,
        weldAfter: snapshots?.[1] != null
      });
    }
    return containerAt(chain.length);
  };
  const cloneFor = (src, chain) => {
    if (src === void 0) return void 0;
    const depth = chain.indexOf(src);
    return depth < 0 ? void 0 : stack[depth]?.clone;
  };
  let prevContainer = fragment;
  let floatSource = null;
  const segments = contents.filter(content => !("kind" in content));
  const floatBaseStyle = new Map(segments.find(segment => segment.floatedStyle !== void 0)?.floatedStyle ?? []);
  const floatInnerProperties = new Set(segments.flatMap(segment => (segment.floatedInnerStyle ?? []).map(_ref6 => {
    let property = _ref6[0];
    return property;
  })));
  let lastWasHardBreak = false;
  for (const content of contents) {
    if ("kind" in content) {
      const container2 = containerFor(content.ancestors);
      container2.append(content.source.cloneNode(false));
      prevContainer = container2;
      lineElements.push([]);
      lastWasHardBreak = true;
      continue;
    }
    const segment = content;
    lastWasHardBreak = false;
    if (segment.joint === "hyphen") {
      const hyphen = doc.createElement("span");
      hyphen.className = "justif-hyphen";
      disableTextAutosizing(hyphen);
      const entries = lineElements[lineElements.length - 1];
      const prevEntry = entries[entries.length - 1];
      if (prevEntry !== void 0 && prevEntry.marginEndEl.style.marginInlineEnd !== "") {
        hyphen.style.marginInlineEnd = prevEntry.marginEndEl.style.marginInlineEnd;
        prevEntry.marginEndEl.style.marginInlineEnd = "";
      }
      if (prevEntry?.seg?.hyphenLetterSpacingPx !== void 0) {
        hyphen.style.letterSpacing = px(prevEntry.seg.hyphenLetterSpacingPx);
      }
      prevContainer.append(hyphen);
      entries.push({
        el: hyphen,
        seg: null,
        marginEndEl: hyphen
      });
    }
    if (segment.joint !== "none") {
      lineElements.push([]);
      const depth = Math.min(commonDepth(segment.ancestors), stack.length);
      closeTo(depth);
      const container2 = containerAt(depth);
      if (segment.joint === "space") {
        const space = doc.createTextNode(" ");
        if (segment.jointFlat !== true && segment.jointVoid !== true) {
          container2.append(space);
        } else {
          const flat = doc.createElement("span");
          flat.className = segment.jointVoid === true ? "justif-joint justif-joint-void" : "justif-joint";
          flat.append(space);
          container2.append(flat);
        }
      } else {
        const brk = doc.createElement("span");
        brk.className = "justif-break";
        container2.append(brk);
      }
      if (segment.jointFlat) {
        const softBreak = container2.appendChild(doc.createElement("span"));
        softBreak.className = "justif-soft-break";
        softBreak.ariaHidden = "true";
      }
    }
    const container = containerFor(segment.ancestors);
    if (segment.floatedPrefix !== void 0) {
      if (floatSource === null) {
        floatSource = doc.createElement("span");
        floatSource.className = "justif-float-source";
        disableTextAutosizing(floatSource);
        for (const _ref7 of segment.floatedStyle ?? []) {
          const property = _ref7[0];
          const value = _ref7[1];
          floatSource.style.setProperty(property, value);
        }
        container.append(floatSource);
      }
      if (floatInnerProperties.size === 0) {
        floatSource.append(doc.createTextNode(segment.floatedPrefix));
      } else {
        const innerStyle = new Map(segment.floatedInnerStyle ?? []);
        const fragment2 = doc.createElement("span");
        fragment2.className = "justif-float-fragment";
        for (const property of floatInnerProperties) {
          const value = innerStyle.get(property) ?? floatBaseStyle.get(property);
          if (value !== void 0) fragment2.style.setProperty(property, value);
        }
        fragment2.append(doc.createTextNode(segment.floatedPrefix));
        floatSource.append(fragment2);
      }
    }
    if (segment.atomic !== void 0) {
      const el2 = doc.createElement("span");
      el2.className = "justif-seg";
      disableTextAutosizing(el2);
      const clone = segment.atomic.box.source.cloneNode(true);
      for (const _ref8 of segment.atomic.box.style) {
        const property = _ref8[0];
        const value = _ref8[1];
        clone.style?.setProperty(property, value);
      }
      atomicBindings.push({
        box: segment.atomic.box,
        clone
      });
      if (segment.atomic.weldStart) el2.append(WORD_JOINER);
      el2.append(clone);
      if (segment.atomic.weldEnd) el2.append(WORD_JOINER);
      const marginStartEl2 = cloneFor(segment.marginStartOwner, segment.ancestors) ?? el2;
      const marginEndEl2 = cloneFor(segment.marginEndOwner, segment.ancestors) ?? el2;
      const paintEndEl2 = cloneFor(segment.decorEndOwner, segment.ancestors);
      if (segment.marginStartPx !== 0) {
        marginStartEl2.style.marginInlineStart = px(segment.marginStartPx);
      }
      if (segment.marginEndPx !== 0) marginEndEl2.style.marginInlineEnd = px(segment.marginEndPx);
      container.append(el2);
      prevContainer = container;
      lineElements[lineElements.length - 1].push({
        el: el2,
        seg: segment,
        marginEndEl: marginEndEl2,
        paintEndEl: paintEndEl2
      });
      continue;
    }
    if (segment.text.length === 0) {
      prevContainer = container;
      continue;
    }
    const el = doc.createElement("span");
    el.className = ["justif-seg", segment.weldEnd === true ? "justif-weld-end" : "", segment.generatedWeldStart === true ? "justif-generated-weld-start" : "", segment.generatedWeldEnd === true ? "justif-generated-weld-end" : ""].filter(Boolean).join(" ");
    disableTextAutosizing(el);
    el.style.wordSpacing = px(segment.wordSpacingPx);
    if (segment.letterSpacingPx !== null) {
      el.style.letterSpacing = px(segment.letterSpacingPx);
      if (segment.fontFeatureSettings !== void 0) {
        el.style.fontFeatureSettings = segment.fontFeatureSettings;
      }
    }
    if (segment.isolateShaping === true) el.style.unicodeBidi = "isolate";
    if (segment.fontStretchPct !== 100) {
      el.style.fontStretch = `${Math.round(segment.fontStretchPct * 100) / 100}%`;
    }
    const marginStartEl = cloneFor(segment.marginStartOwner, segment.ancestors) ?? el;
    const marginEndEl = cloneFor(segment.marginEndOwner, segment.ancestors) ?? el;
    const paintEndEl = cloneFor(segment.decorEndOwner, segment.ancestors);
    if (segment.marginStartPx !== 0) {
      marginStartEl.style.marginInlineStart = px(segment.marginStartPx);
    }
    if (segment.marginEndPx !== 0) marginEndEl.style.marginInlineEnd = px(segment.marginEndPx);
    if (segment.cjk === true) {
      el.style.fontKerning = "none";
      el.style.setProperty("text-spacing-trim", "space-all");
    }
    const shedPx = hangCarrierShed(segment);
    if (shedPx > 0) {
      const _terminalSplit = terminalSplit(segment.text),
        before = _terminalSplit.before,
        terminal = _terminalSplit.terminal,
        after = _terminalSplit.after;
      if (terminal === void 0) el.textContent = segment.text;else {
        el.append(before);
        const span = doc.createElement("span");
        span.className = "justif-hanging-end";
        span.style.letterSpacing = px(segment.resolvedLetterSpacingPx - shedPx);
        if (segment.terminalKernPx !== void 0) {
          span.style.fontKerning = "none";
          span.style.marginInlineStart = px(segment.terminalKernPx);
        }
        span.textContent = terminal;
        el.append(span, after);
      }
    } else el.textContent = segment.text;
    container.append(el);
    prevContainer = container;
    lineElements[lineElements.length - 1].push({
      el,
      seg: segment,
      marginEndEl,
      paintEndEl
    });
  }
  closeTo(0);
  if (lastWasHardBreak) lineElements.pop();
  if (keptFloat === null) p.replaceChildren(fragment);else {
    while (keptFloat.nextSibling !== null) keptFloat.nextSibling.remove();
    p.append(fragment);
  }
  for (const _ref9 of atomicBindings) {
    const box = _ref9.box;
    const clone = _ref9.clone;
    box.rendered = clone;
  }
  return {
    doc,
    paragraph: p,
    lineElements,
    lineWidths,
    contentWidth,
    physicalFitLines,
    renderedFloat,
    floatSource,
    generatedOwners
  };
}

// src/dom/geometry.ts
var FRAGMENT_WIDTH_TOLERANCE_PX = 0.5;
function fragmentBoxesOf(el, style) {
  const view = el.ownerDocument.defaultView;
  if (view === null) return {
    ok: false,
    reason: "not rendered"
  };
  const cs = style ?? view.getComputedStyle(el);
  const all = el.getClientRects();
  if (all.length === 0) return {
    ok: false,
    reason: "not rendered"
  };
  const rects = [...all].filter(rect => rect.width > 0);
  if (rects.length === 0) return {
    ok: false,
    reason: "zero content width"
  };
  const borderBoxWidth = rects[0].width;
  if (rects.some(rect => Math.abs(rect.width - borderBoxWidth) > FRAGMENT_WIDTH_TOLERANCE_PX)) {
    return {
      ok: false,
      reason: "fragment boxes have unequal widths"
    };
  }
  const contentWidth = borderBoxWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) - (parseFloat(cs.borderLeftWidth) || 0) - (parseFloat(cs.borderRightWidth) || 0);
  return contentWidth > 0 ? {
    ok: true,
    rects,
    contentWidth
  } : {
    ok: false,
    reason: "zero content width"
  };
}

// src/dom/float-geometry.ts
function firstLetterRange(text) {
  const punctuation = /^[\p{Ps}\p{Pe}\p{Pi}\p{Pf}\p{Po}]$/u;
  const clusters = graphemes(text);
  let offset = 0;
  let i = 0;
  while (i < clusters.length && /^\s+$/u.test(clusters[i])) {
    offset += clusters[i].length;
    i++;
  }
  if (i === clusters.length) return null;
  const start = offset;
  while (i < clusters.length && punctuation.test(clusters[i])) {
    offset += clusters[i].length;
    i++;
  }
  if (i === clusters.length || /^\s+$/u.test(clusters[i])) return null;
  offset += clusters[i].length;
  i++;
  while (i < clusters.length && punctuation.test(clusters[i])) {
    offset += clusters[i].length;
    i++;
  }
  return {
    start,
    end: offset
  };
}
function textPointAt(nodes, target) {
  let offset = 0;
  for (const node of nodes) {
    const end = offset + node.data.length;
    if (target <= end) return {
      node,
      offset: target - offset
    };
    offset = end;
  }
  const last = nodes[nodes.length - 1];
  return last === void 0 ? null : {
    node: last,
    offset: last.data.length
  };
}
function pxValue(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
var FIRST_LETTER_PROPERTIES = ["float", "box-sizing", "width", "height", "min-width", "max-width", "min-height", "max-height", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "border-top-style", "border-right-style", "border-bottom-style", "border-left-style", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius", "font-family", "font-size", "font-style", "font-weight", "font-stretch", "font-kerning", "font-optical-sizing", "font-feature-settings", "font-variation-settings", "font-variant-caps", "font-variant-east-asian", "font-variant-ligatures", "font-variant-numeric", "font-variant-position", "font-synthesis", "line-height", "letter-spacing", "word-spacing", "color", "background-color", "background-image", "background-position", "background-size", "background-repeat", "background-origin", "background-clip", "text-decoration-line", "text-decoration-color", "text-decoration-style", "text-decoration-thickness", "text-shadow", "text-transform", "vertical-align", "direction", "writing-mode", "-webkit-text-fill-color", "-webkit-text-stroke-color", "-webkit-text-stroke-width"];
var FIRST_LETTER_INNER_PROPERTIES = ["font-family", "font-size", "font-style", "font-weight", "font-stretch", "font-kerning", "font-optical-sizing", "font-feature-settings", "font-variation-settings", "font-variant-caps", "font-variant-east-asian", "font-variant-ligatures", "font-variant-numeric", "font-variant-position", "font-synthesis", "line-height", "letter-spacing", "word-spacing", "color", "text-decoration-line", "text-decoration-color", "text-decoration-style", "text-decoration-thickness", "text-shadow", "text-transform", "vertical-align", "-webkit-text-fill-color", "-webkit-text-stroke-color", "-webkit-text-stroke-width"];
function firstLetterStyle(style) {
  return FIRST_LETTER_PROPERTIES.map(property => [property, style.getPropertyValue(property)]).filter(entry => entry[1] !== "");
}
function firstLetterInnerStyle(style, paragraph) {
  return FIRST_LETTER_INNER_PROPERTIES.map(property => [property, style.getPropertyValue(property)]).filter(_ref0 => {
    let property = _ref0[0],
      value = _ref0[1];
    return value !== "" && value !== paragraph.getPropertyValue(property);
  });
}
function physicalFloatSide(value, direction) {
  if (value === "left" || value === "right") return value;
  if (value === "inline-start") return direction === "rtl" ? "right" : "left";
  if (value === "inline-end") return direction === "rtl" ? "left" : "right";
  return null;
}
var FIRST_LETTER_METRIC_PROPERTIES = ["font-family", "font-size", "font-style", "font-weight", "font-stretch", "font-kerning", "font-optical-sizing", "font-feature-settings", "font-variation-settings", "font-variant-alternates", "font-variant-caps", "font-variant-east-asian", "font-variant-emoji", "font-variant-ligatures", "font-variant-numeric", "font-variant-position", "font-synthesis", "line-height", "letter-spacing", "word-spacing", "text-transform", "vertical-align"];
var FIRST_LETTER_INLINE_BOX_PROPERTIES = ["margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width"];
function nonFloatedFirstLetterChangesLayout(p, paragraphStyle, style, text) {
  const differsFromParagraph = FIRST_LETTER_METRIC_PROPERTIES.some(property => style.getPropertyValue(property) !== paragraphStyle.getPropertyValue(property));
  const hasBox = FIRST_LETTER_INLINE_BOX_PROPERTIES.some(property => Math.abs(parseFloat(style.getPropertyValue(property)) || 0) > 1e-6);
  if (!differsFromParagraph && !hasBox) return false;
  const span = firstLetterRange(text);
  if (span === null) return false;
  const nodes = [];
  const walker = p.ownerDocument.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    nodes.push(node);
  }
  const point = textPointAt(nodes, span.start);
  const source = point?.node.parentElement ?? p;
  const sourceStyle = p.ownerDocument.defaultView?.getComputedStyle(source);
  if (sourceStyle === void 0) return false;
  return hasBox || FIRST_LETTER_METRIC_PROPERTIES.some(property => style.getPropertyValue(property) !== sourceStyle.getPropertyValue(property));
}
function visualLines(rects, lineHeight) {
  const lines = [];
  const threshold = Math.max(2, lineHeight * 0.45);
  for (const rect of [...rects].sort((a, b) => a.top - b.top || a.left - b.left)) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    const line = lines.find(candidate => {
      const topDelta = Math.abs(candidate.top - rect.top);
      if (topDelta < threshold) return true;
      return topDelta < lineHeight * 1.25 && candidate.fragments.some(fragment => {
        const overlap = Math.min(fragment.bottom, rect.bottom) - Math.max(fragment.top, rect.top);
        const smallerHeight = Math.min(fragment.bottom - fragment.top, rect.height);
        const largerHeight = Math.max(fragment.bottom - fragment.top, rect.height);
        const compact = smallerHeight < lineHeight * 0.8;
        return (compact || largerHeight > lineHeight * 1.25) && overlap > smallerHeight * (compact ? 0.3 : 0.5);
      });
    });
    if (line === void 0) {
      lines.push({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        fragments: [{
          top: rect.top,
          bottom: rect.bottom
        }]
      });
    } else {
      line.bottom = Math.max(line.bottom, rect.bottom);
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
      line.fragments.push({
        top: rect.top,
        bottom: rect.bottom
      });
    }
  }
  return lines.sort((a, b) => a.top - b.top);
}
function paragraphContentBox(p, paragraphStyle) {
  const rect = p.getBoundingClientRect();
  return {
    left: rect.left + pxValue(paragraphStyle.borderLeftWidth) + pxValue(paragraphStyle.paddingLeft),
    right: rect.right - pxValue(paragraphStyle.borderRightWidth) - pxValue(paragraphStyle.paddingRight),
    top: rect.top + pxValue(paragraphStyle.borderTopWidth) + pxValue(paragraphStyle.paddingTop),
    lineHeight: parseFloat(paragraphStyle.lineHeight) || pxValue(paragraphStyle.fontSize) * 1.2
  };
}
function displacedFloatLines(p, source, lines, affected) {
  const view = p.ownerDocument.defaultView;
  if (view === null) return false;
  const style = view.getComputedStyle(source);
  const side = physicalFloatSide(style.float, style.direction === "rtl" ? "rtl" : "ltr");
  if (side === null) return false;
  const rect = source.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const paragraphStyle = view.getComputedStyle(p);
  const content = paragraphContentBox(p, paragraphStyle);
  const bottom = rect.bottom + pxValue(style.marginBottom);
  const edge = side === "left" ? rect.right + pxValue(style.marginRight) : rect.left - pxValue(style.marginLeft);
  const tolerance = Math.max(1, pxValue(paragraphStyle.fontSize));
  for (let i = 0; i < Math.min(affected, lines.length); i++) {
    if (content.top + (i + 1) * content.lineHeight >= bottom) break;
    for (const entry of lines[i]) {
      if (entry.seg === null || !entry.el.isConnected) continue;
      const line = entry.el.getBoundingClientRect();
      if (line.width === 0 || line.height === 0) continue;
      if (line.top >= bottom + 0.5) return true;
      if (side === "left" ? line.left < edge - tolerance : line.right > edge + tolerance) return true;
    }
  }
  return false;
}
function lastLineRaggedAt(paragraphStyle, floatSide) {
  if (paragraphStyle.textAlign === "justify-all") return false;
  const last = paragraphStyle.getPropertyValue("text-align-last") || "auto";
  if (last === "justify") return false;
  if (last === "center") return true;
  const direction = paragraphStyle.direction === "rtl" ? "rtl" : "ltr";
  let flushEdge;
  if (last === "left" || last === "right") flushEdge = last;else if (last === "end") flushEdge = direction === "rtl" ? "left" : "right";else flushEdge = direction === "rtl" ? "right" : "left";
  return floatSide !== flushEdge;
}
function intrudedLineCount(lines, content, paragraphStyle, floatSide, inlineSize, floatBottom, boundaryMode) {
  const skipLastLine = lastLineRaggedAt(paragraphStyle, floatSide);
  let affected = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (boundaryMode === 2 && line.top >= floatBottom + 0.5) {
      const previous = lines[i - 1];
      if (affected > 0 && previous !== void 0 && line.top - previous.top < content.lineHeight * 1.5) {
        return affected;
      }
      break;
    }
    if (skipLastLine && i === lines.length - 1) break;
    const observed = floatSide === "left" ? line.left - content.left : content.right - line.right;
    if (observed > inlineSize * 0.5) affected++;else {
      if (boundaryMode === 1 && affected > 0) return affected;
      break;
    }
  }
  const firstLine = lines[0];
  const textTop = firstLine !== void 0 && firstLine.top < floatBottom ? Math.max(content.top, firstLine.top) : content.top;
  const geometricLines = Math.max(1, Math.ceil((floatBottom - textTop) / content.lineHeight - 1e-6));
  return Math.max(affected, geometricLines);
}
function floatedFirstLetter(p, paragraphStyle, style, floatSide, text, span) {
  const nodes = [];
  const walker = p.ownerDocument.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    nodes.push(node);
  }
  const start = textPointAt(nodes, span.start);
  const end = textPointAt(nodes, span.end);
  if (start === null || end === null) return null;
  const range = p.ownerDocument.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const glyphRect = range.getBoundingClientRect();
  const specifiedWidth = parseFloat(style.width);
  const pseudoLineHeight = parseFloat(style.lineHeight) || pxValue(style.fontSize) * 1.2;
  const rangeRepresentsPseudo = glyphRect.width > 0 && glyphRect.height >= pseudoLineHeight * 0.5;
  const glyphWidth = rangeRepresentsPseudo ? glyphRect.width : measureWidth(text.slice(span.start, span.end), fontSpecOf(style));
  const contentWidth = Number.isFinite(specifiedWidth) ? specifiedWidth : glyphWidth;
  const inlineExtras = pxValue(style.paddingLeft) + pxValue(style.paddingRight) + pxValue(style.borderLeftWidth) + pxValue(style.borderRightWidth);
  const borderBoxWidth = style.boxSizing === "border-box" && Number.isFinite(specifiedWidth) ? contentWidth : contentWidth + inlineExtras;
  const inlineSize = Math.max(0, borderBoxWidth + pxValue(style.marginLeft) + pxValue(style.marginRight));
  if (inlineSize <= 0) return null;
  const content = paragraphContentBox(p, paragraphStyle);
  const tail = p.ownerDocument.createRange();
  tail.setStart(end.node, end.offset);
  const last = nodes[nodes.length - 1];
  tail.setEnd(last, last.data.length);
  const lines = visualLines([...tail.getClientRects()], content.lineHeight);
  const specifiedHeight = parseFloat(style.height);
  const compactAutoBox = !Number.isFinite(specifiedHeight) && glyphRect.height > 0 && glyphRect.height <= pseudoLineHeight * 1.2;
  const contentHeight = Number.isFinite(specifiedHeight) ? specifiedHeight : compactAutoBox ? glyphRect.height : pseudoLineHeight;
  const blockExtras = pxValue(style.paddingTop) + pxValue(style.paddingBottom) + pxValue(style.borderTopWidth) + pxValue(style.borderBottomWidth);
  const borderBoxHeight = style.boxSizing === "border-box" && Number.isFinite(specifiedHeight) ? contentHeight : contentHeight + blockExtras;
  const floatBottom = compactAutoBox ? glyphRect.bottom + pxValue(style.paddingBottom) + pxValue(style.borderBottomWidth) + pxValue(style.marginBottom) : content.top + pxValue(style.marginTop) + borderBoxHeight + pxValue(style.marginBottom);
  const affected = intrudedLineCount(lines, content, paragraphStyle, floatSide, inlineSize, floatBottom, 0);
  return {
    kind: "first-letter",
    inlineSize,
    lines: affected,
    style: firstLetterStyle(style)
  };
}
var LEADING_TRIVIA = /^[\t\n\f\r ]*$/;
var UNSAFE_FLOAT_CONTENT = ["iframe", "object", "embed", "audio", "video", "canvas", "input", "button", "select", "textarea", "script", "style"].join(",");
function borderBoxSize(style, axis) {
  const size = parseFloat(axis === "inline" ? style.width : style.height);
  if (!Number.isFinite(size)) return null;
  if (style.boxSizing === "border-box") return Math.max(0, size);
  const extras = axis === "inline" ? pxValue(style.paddingLeft) + pxValue(style.paddingRight) + pxValue(style.borderLeftWidth) + pxValue(style.borderRightWidth) : pxValue(style.paddingTop) + pxValue(style.paddingBottom) + pxValue(style.borderTopWidth) + pxValue(style.borderBottomWidth);
  return Math.max(0, size + extras);
}
function unsafeFloatSubtree(source) {
  const unsafe = source.matches(UNSAFE_FLOAT_CONTENT) ? source : source.querySelector(UNSAFE_FLOAT_CONTENT);
  if (unsafe !== null) return `<${unsafe.tagName.toLowerCase()}> in floated element`;
  for (const el of [source, ...source.querySelectorAll("*")]) {
    if (el.shadowRoot !== null) return "shadow root in floated element";
  }
  return null;
}
function elementFloatGeometry(p, source, paragraphStyle, style, floatSide, verify) {
  const borderInline = borderBoxSize(style, "inline");
  const borderBlock = borderBoxSize(style, "block");
  if (borderInline === null || borderBlock === null) return null;
  const inlineSize = borderInline + pxValue(style.marginLeft) + pxValue(style.marginRight);
  const blockSize = borderBlock + pxValue(style.marginTop) + pxValue(style.marginBottom);
  if (inlineSize <= 0 || blockSize <= 0) return null;
  const content = paragraphContentBox(p, paragraphStyle);
  const tail = p.ownerDocument.createRange();
  tail.selectNodeContents(p);
  tail.setStartAfter(source);
  const lines = visualLines([...tail.getClientRects()], content.lineHeight);
  const floatBottom = content.top + blockSize;
  return {
    inlineSize,
    lines: intrudedLineCount(lines, content, paragraphStyle, floatSide, inlineSize, floatBottom, !p.hasAttribute("data-justif") ? 1 : verify ? 2 : 0)
  };
}
function leadingElementFloatOf(p, paragraphStyle, fragmentCount) {
  const view = p.ownerDocument.defaultView;
  if (view === null) return null;
  const leadingTrivia = [];
  let source = null;
  for (let child = p.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === Node.COMMENT_NODE) {
      leadingTrivia.push(child);
      continue;
    }
    if (child.nodeType === Node.TEXT_NODE && LEADING_TRIVIA.test(child.nodeValue ?? "")) {
      leadingTrivia.push(child);
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child;
      if (view.getComputedStyle(el).float !== "none") source = el;
    }
    break;
  }
  if (source === null) return null;
  const outsideFloats = [];
  for (const el of p.querySelectorAll("*")) {
    if (el === source || source.contains(el)) continue;
    if (view.getComputedStyle(el).float !== "none") outsideFloats.push(el);
  }
  if (outsideFloats.length > 0) return "multiple floated elements";
  if (fragmentCount > 1) return "fragmented paragraph with leading floated element";
  const unsafe = unsafeFloatSubtree(source);
  if (unsafe !== null) return `unsafe ${unsafe}`;
  const style = view.getComputedStyle(source);
  if (style.clear !== "none") return `clear: ${style.clear} on leading floated element`;
  const shapeOutside = style.getPropertyValue("shape-outside") || "none";
  if (shapeOutside !== "none") return "shape-outside on leading floated element";
  const direction = paragraphStyle.direction === "rtl" ? "rtl" : "ltr";
  const side = physicalFloatSide(style.float, direction);
  if (side === null) return `unsupported element float: ${style.float}`;
  const geometry = elementFloatGeometry(p, source, paragraphStyle, style, side, false);
  if (geometry === null) return "could not measure leading floated element";
  return {
    kind: "element",
    source,
    leadingTrivia,
    ...geometry
  };
}
var RULES_PER_PARAGRAPH = 24;
function beginScanBatch(paragraphCount) {
  return {
    firstLetterRoots: /* @__PURE__ */new Map(),
    ruleBudget: paragraphCount * RULES_PER_PARAGRAPH
  };
}
function endScanBatch(batch) {
  batch.firstLetterRoots.clear();
}
var MAX_RULE_DEPTH = 12;
function rulesMentionFirstLetter(rules, depth) {
  if (depth > MAX_RULE_DEPTH) return true;
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];
    if (rule === void 0) continue;
    if (rule.selectorText !== void 0 && rule.selectorText.includes("first-letter")) {
      return true;
    }
    const imported = rule.styleSheet;
    if (imported != null && sheetMentionsFirstLetter(imported, depth + 1)) return true;
    const nested = rule.cssRules;
    if (nested != null && rulesMentionFirstLetter(nested, depth + 1)) return true;
  }
  return false;
}
function sheetMentionsFirstLetter(sheet, depth) {
  let rules;
  try {
    rules = sheet.cssRules;
  } catch {
    return true;
  }
  return rulesMentionFirstLetter(rules, depth);
}
function rootMentionsFirstLetter(root) {
  try {
    const sheets = root.styleSheets;
    for (let i = 0; i < sheets.length; i += 1) {
      const sheet = sheets[i];
      if (sheet !== void 0 && sheetMentionsFirstLetter(sheet, 0)) return true;
    }
    const adopted = root.adoptedStyleSheets;
    if (adopted !== void 0) {
      for (let i = 0; i < adopted.length; i += 1) {
        const sheet = adopted[i];
        if (sheet !== void 0 && sheetMentionsFirstLetter(sheet, 0)) return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}
function countRules(root) {
  let total = 0;
  try {
    const sheets = root.styleSheets;
    for (let i = 0; i < sheets.length; i += 1) {
      total += sheets[i].cssRules.length;
    }
    const adopted = root.adoptedStyleSheets;
    if (adopted !== void 0) {
      for (let i = 0; i < adopted.length; i += 1) {
        total += adopted[i].cssRules.length;
      }
    }
  } catch {
    return null;
  }
  return total;
}
function rootMayHaveFirstLetterRule(batch, root) {
  const cached = batch.firstLetterRoots.get(root);
  if (cached !== void 0) return cached;
  const rules = countRules(root);
  const answer = rules === null || rules > batch.ruleBudget || rootMentionsFirstLetter(root);
  batch.firstLetterRoots.set(root, answer);
  return answer;
}
function mayHaveFirstLetterRule(p, batch) {
  if (batch === void 0) return true;
  if (p.assignedSlot !== null) return true;
  const doc = p.ownerDocument;
  const root = p.getRootNode();
  if (root === doc) return rootMayHaveFirstLetterRule(batch, doc);
  const shadowRoot = doc.defaultView?.ShadowRoot;
  if (shadowRoot === void 0 || !(root instanceof shadowRoot)) return true;
  return rootMayHaveFirstLetterRule(batch, root) ||
  // The host document reaches into the shadow tree with
  // `::part(x)::first-letter`.
  rootMayHaveFirstLetterRule(batch, doc);
}
function floatDetailsOf(p, text, paragraphStyle, fragmentCount, batch) {
  if (!mayHaveFirstLetterRule(p, batch)) return null;
  const view = p.ownerDocument.defaultView;
  if (view === null) return null;
  let style;
  try {
    style = view.getComputedStyle(p, "::first-letter");
  } catch {
    return "could not inspect ::first-letter style";
  }
  if (style.float === "none") {
    return nonFloatedFirstLetterChangesLayout(p, paragraphStyle ?? view.getComputedStyle(p), style, text) ? "layout-changing non-floated ::first-letter" : null;
  }
  const cs = paragraphStyle ?? view.getComputedStyle(p);
  let liveFragmentCount = fragmentCount;
  if (liveFragmentCount === void 0) {
    const fragments = fragmentBoxesOf(p, cs);
    if (!fragments.ok) return fragments.reason;
    liveFragmentCount = fragments.rects.length;
  }
  if (liveFragmentCount > 1) {
    return "fragmented paragraph with floated ::first-letter";
  }
  const direction = cs.direction === "rtl" ? "rtl" : "ltr";
  const floatSide = physicalFloatSide(style.float, direction);
  if (floatSide === null) return `unsupported ::first-letter float: ${style.float}`;
  const span = firstLetterRange(text);
  if (span === null) return "could not locate floated ::first-letter text";
  const intrusion = floatedFirstLetter(p, cs, style, floatSide, text, span);
  return intrusion === null ? "could not measure floated ::first-letter" : {
    intrusion,
    span
  };
}
function floatIntrusionOf(p, text, previous) {
  if (text === void 0) {
    text = p.textContent ?? "";
  }
  if (previous?.kind === "element") {
    const view = p.ownerDocument.defaultView;
    if (view === null) return null;
    const fragments = fragmentBoxesOf(p);
    if (!fragments.ok) return null;
    const next = leadingElementFloatOf(p, view.getComputedStyle(p), fragments.rects.length);
    return typeof next === "object" ? next : null;
  }
  const details = floatDetailsOf(p, text);
  return typeof details === "object" && details !== null ? details.intrusion : null;
}
function renderedElementFloatIntrusionOf(p, source, previous, verify) {
  const view = p.ownerDocument.defaultView;
  if (view === null) return null;
  const paragraphStyle = view.getComputedStyle(p);
  const style = view.getComputedStyle(source);
  const direction = paragraphStyle.direction === "rtl" ? "rtl" : "ltr";
  const side = physicalFloatSide(style.float, direction);
  if (side === null) return null;
  const geometry = elementFloatGeometry(p, source, paragraphStyle, style, side, verify);
  return geometry === null ? null : {
    ...previous,
    ...geometry
  };
}
function floatInlineSizeOf(p) {
  const rendered = p.querySelector(":scope .justif-float-source");
  if (rendered !== null) {
    const rect = rendered.getBoundingClientRect();
    const style = rendered.ownerDocument.defaultView?.getComputedStyle(rendered);
    if (style === void 0) return rect.width > 0 ? rect.width : null;
    const size = rect.width + pxValue(style.marginLeft) + pxValue(style.marginRight);
    return size > 0 ? size : null;
  }
  return floatIntrusionOf(p)?.inlineSize ?? null;
}

// src/dom/read.ts
function boxTransformed(style) {
  const scale = style.getPropertyValue("scale");
  const rotate = style.getPropertyValue("rotate");
  return style.transform !== "none" || scale !== "" && scale !== "none" || rotate !== "" && rotate !== "none";
}
function activeAtomicElement(box) {
  if (box.source.isConnected) return box.source;
  return box.rendered?.isConnected === true ? box.rendered : null;
}
function atomicAdvance(box) {
  if (!box.inFlow) return 0;
  const el = activeAtomicElement(box);
  if (el === null) return null;
  const view = el.ownerDocument.defaultView;
  if (view === null) return null;
  const rect = el.getBoundingClientRect();
  if (box.widthPx > 0 && rect.width === 0 && rect.height === 0) return null;
  const style = view.getComputedStyle(el);
  if (boxTransformed(style)) return null;
  const margins = (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
  return Math.max(0, rect.width + margins);
}
function atomicWidthStale(box) {
  const width = atomicAdvance(box);
  return width !== null && Math.abs(width - box.widthPx) > ATOMIC_WIDTH_EPSILON_PX;
}
function refreshAtomicBox(box) {
  const width = atomicAdvance(box);
  if (width === null || Math.abs(width - box.widthPx) <= ATOMIC_WIDTH_EPSILON_PX) return false;
  box.widthPx = width;
  return true;
}
var ATOMIC_WIDTH_EPSILON_PX = 0.01;
function refreshAtomicWidths(scan) {
  let changed = false;
  for (const run of scan.runs) {
    if (run.atomic !== void 0 && refreshAtomicBox(run.atomic)) changed = true;
  }
  return changed;
}
function clearAtomicRendered(scan) {
  for (const run of scan.runs) {
    if (run.atomic !== void 0) run.atomic.rendered = null;
  }
}
function paragraphStyleKey(style) {
  const spec = fontSpecOf(style);
  return [
  // The MEASUREMENT key: fonts, spacing, variants, features. Two of its own
  // fields sit outside it, measuring identically but scanning differently, so
  // both are named here.
  spec.key, spec.hyphens, spec.direction,
  // Grounds for keeping a paragraph native, and so for reconsidering one.
  style.display, style.whiteSpace, style.textTransform, style.writingMode, style.lineHeight, style.minWidth, style.contain].join(" ");
}
var REJECT_TAGS = /* @__PURE__ */new Set(["WBR", "IMG", "PICTURE", "VIDEO", "AUDIO", "CANVAS", "IFRAME", "OBJECT", "EMBED", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "TABLE", "HR", "SVG"]);
var ATOMIC_DISPLAYS = /* @__PURE__ */new Set(["inline-block", "inline-flex", "inline-grid", "inline-table", "inline flow-root", "inline math", "math"]);
var UNCLONEABLE = 'canvas,iframe,video,audio,object,embed,input,button,select,textarea,slot,[contenteditable=""],[contenteditable="true"]';
var ATOMIC_PINNED_PROPERTIES = ["white-space", "letter-spacing", "word-spacing", "font-stretch", "font-kerning", "text-align"];
var UNSUPPORTED_SCRIPTS = /[\u0E00-\u0EFF]/;
var BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
var STRONG_RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u;
var NON_RTL_LETTER = /(?![\p{Script=Hebrew}\p{Script=Arabic}])\p{L}/u;
var RTL_LETTER = /[\p{Script=Hebrew}\p{Script=Arabic}]/u;
var FORCED_LINE_SEPARATORS = /[\u2028\u2029]/;
var DIVERGENT_CONTROLS = /[\u000B\u000C]/;
function textSupported(text, direction) {
  if (BIDI_CONTROLS.test(text)) return false;
  if (FORCED_LINE_SEPARATORS.test(text)) return false;
  if (DIVERGENT_CONTROLS.test(text)) return false;
  if (UNSUPPORTED_SCRIPTS.test(text)) return false;
  if (direction === "rtl") {
    if (NON_RTL_LETTER.test(text)) return false;
    if (!RTL_LETTER.test(text)) return false;
  } else if (STRONG_RTL.test(text)) {
    return false;
  }
  return true;
}
var MARGIN_PROPS = ["marginLeft", "marginRight"];
function transparentColor(color) {
  const value = color.trim().toLowerCase();
  if (value === "transparent") return true;
  if (/^rgba\([^)]*,\s*0(?:\.0*)?%?\s*\)$/.test(value)) return true;
  return /\/\s*0(?:\.0*)?%?\s*\)$/.test(value);
}
function splitCss(value, commas) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;else if (ch === ")") depth = Math.max(0, depth - 1);else if (depth === 0 && (commas ? ch === "," : /\s/.test(ch))) {
      const token = value.slice(start, i).trim();
      if (token.length > 0) out.push(token);
      start = i + 1;
    }
  }
  const tail = value.slice(start).trim();
  if (tail.length > 0) out.push(tail);
  return out;
}
function shadowPaintedEdges(value, direction) {
  let left = false;
  let right = false;
  if (value === "none") return {
    start: false,
    end: false
  };
  for (const shadow of splitCss(value, true)) {
    const tokens = splitCss(shadow, false);
    if (tokens.some(token => token.toLowerCase() === "inset")) continue;
    const color = tokens.find(token => token === "transparent" || /^[a-z-]+\(/i.test(token));
    if (color !== void 0 && transparentColor(color)) continue;
    const lengths = tokens.filter(token => /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?:px)?$/i.test(token)).map(token => parseFloat(token));
    if (lengths.length < 2) continue;
    const offsetX = lengths[0];
    const blur = Math.max(0, lengths[2] ?? 0);
    const spread = lengths[3] ?? 0;
    const reach = blur + spread;
    if (offsetX - reach < 0) left = true;
    if (offsetX + reach > 0) right = true;
  }
  return direction === "rtl" ? {
    start: right,
    end: left
  } : {
    start: left,
    end: right
  };
}
function paintedInlineEdges(style, direction) {
  const clips = style.backgroundClip.split(",").map(clip => clip.trim());
  const clippedToText = clips.length > 0 && clips.every(clip => clip === "text");
  const background = !clippedToText && (style.backgroundImage !== "none" || !transparentColor(style.backgroundColor));
  if (background) return {
    start: true,
    end: true
  };
  return shadowPaintedEdges(style.boxShadow, direction);
}
function hardBreakBailReason(elStyle) {
  if (elStyle.clear !== "none") return `<br> with clear: ${elStyle.clear}`;
  if (elStyle.display !== "inline" || elStyle.float !== "none" || elStyle.position !== "static" && elStyle.position !== "relative") {
    return "non-inline-flow <br> (display/float/position)";
  }
  return null;
}
function inlineInsets(elStyle, direction) {
  const rtl = direction === "rtl";
  return {
    start: (parseFloat(rtl ? elStyle.paddingRight : elStyle.paddingLeft) || 0) + (parseFloat(rtl ? elStyle.borderRightWidth : elStyle.borderLeftWidth) || 0),
    end: (parseFloat(rtl ? elStyle.paddingLeft : elStyle.paddingRight) || 0) + (parseFloat(rtl ? elStyle.borderLeftWidth : elStyle.borderRightWidth) || 0)
  };
}
function supportedTextTransform(value) {
  return value === "none" || value === "uppercase" || value === "lowercase";
}
function atomicFontSamples(el) {
  const view = el.ownerDocument.defaultView;
  if (view === null) return [];
  const textByFont = /* @__PURE__ */new Map();
  const styles = /* @__PURE__ */new Map();
  const walker = el.ownerDocument.createTreeWalker(el, 4
  /* SHOW_TEXT */);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    if (text.length === 0) continue;
    const parent = node.parentElement;
    if (parent === null) continue;
    let font = styles.get(parent);
    if (font === void 0) {
      font = ctxFontOf(fontSpecOf(view.getComputedStyle(parent)));
      styles.set(parent, font);
    }
    textByFont.set(font, (textByFont.get(font) ?? "") + text);
  }
  return [...textByFont].map(_ref1 => {
    let font = _ref1[0],
      text = _ref1[1];
    return {
      font,
      text
    };
  });
}
function readAtomicBox(el, elStyle) {
  const outOfFlow = elStyle.position === "absolute" || elStyle.position === "fixed";
  const inFlowAtomic = !outOfFlow && (ATOMIC_DISPLAYS.has(elStyle.display) || el.tagName.toUpperCase() === "MATH");
  if (!outOfFlow && !inFlowAtomic) return null;
  const name = el.tagName.toLowerCase();
  if (elStyle.float !== "none") return "floated element is not a leading direct child";
  if (el.shadowRoot !== null) return `atomic <${name}> hosts a shadow root`;
  if (el.querySelector(UNCLONEABLE) !== null) {
    return `atomic <${name}> contains content a clone would not reproduce`;
  }
  if (outOfFlow) {
    return {
      source: el,
      widthPx: 0,
      inFlow: false,
      fonts: [],
      rendered: null,
      style: []
    };
  }
  if (boxTransformed(elStyle)) return `transformed atomic <${name}>`;
  const rect = el.getBoundingClientRect();
  const margins = (parseFloat(elStyle.marginLeft) || 0) + (parseFloat(elStyle.marginRight) || 0);
  return {
    source: el,
    widthPx: Math.max(0, rect.width + margins),
    inFlow: true,
    fonts: atomicFontSamples(el),
    rendered: null,
    style: ATOMIC_PINNED_PROPERTIES.map(property => [property, elStyle.getPropertyValue(property)]).filter(_ref10 => {
      let value = _ref10[1];
      return value !== "";
    })
  };
}
function inlineBailReason(el, elStyle, paragraphStyle, padded) {
  const name = el.tagName.toLowerCase();
  if (elStyle.float !== "none") return "floated element is not a leading direct child";
  if (elStyle.display !== "inline" || elStyle.position !== "static" && elStyle.position !== "relative") {
    return `non-inline-flow <${name}> (display/float/position)`;
  }
  if (MARGIN_PROPS.some(prop => (parseFloat(elStyle[prop]) || 0) !== 0)) {
    return `inline <${name}> has a horizontal margin`;
  }
  const decorationBreak = elStyle.getPropertyValue("box-decoration-break") || elStyle.getPropertyValue("-webkit-box-decoration-break");
  if (padded && decorationBreak === "clone") {
    return `box-decoration-break: clone on padded <${name}>`;
  }
  if (!supportedTextTransform(elStyle.textTransform)) {
    return `text-transform: ${elStyle.textTransform} on <${name}>`;
  }
  if (elStyle.direction !== paragraphStyle.direction || elStyle.unicodeBidi !== "normal" && elStyle.unicodeBidi !== "isolate") {
    return `direction/unicode-bidi override on <${name}>`;
  }
  if (elStyle.whiteSpace !== "normal" && elStyle.whiteSpace !== "nowrap") {
    return `white-space: ${elStyle.whiteSpace} on <${name}>`;
  }
  return null;
}
function readParagraph(p, batch) {
  const view = p.ownerDocument.defaultView;
  if (view === null) return "detached from its document";
  const cs = view.getComputedStyle(p);
  if (cs.display === "none") return "display: none";
  if (cs.whiteSpace !== "normal") return `white-space: ${cs.whiteSpace} on the paragraph`;
  if (!supportedTextTransform(cs.textTransform)) return `text-transform: ${cs.textTransform}`;
  if (cs.writingMode !== "horizontal-tb") return `writing-mode: ${cs.writingMode}`;
  const direction = cs.direction === "rtl" ? "rtl" : "ltr";
  if (p.isContentEditable) return "content-editable";
  if (p.shadowRoot !== null) return "element hosts a shadow root";
  const fragments = fragmentBoxesOf(p, cs);
  if (!fragments.ok) return fragments.reason;
  const elementFloat = leadingElementFloatOf(p, cs, fragments.rects.length);
  if (typeof elementFloat === "string") return elementFloat;
  const omittedNodes = new Set(elementFloat?.leadingTrivia ?? []);
  if (elementFloat !== null) omittedNodes.add(elementFloat.source);
  const specs = [];
  const keyToIndex = /* @__PURE__ */new Map();
  const indexSpec = style => {
    const spec = fontSpecOf(style);
    const dedupeKey = `${spec.key}|${spec.hyphens}`;
    const existing = keyToIndex.get(dedupeKey);
    if (existing !== void 0) return existing;
    specs.push(spec);
    keyToIndex.set(dedupeKey, specs.length - 1);
    return specs.length - 1;
  };
  const baseSpec = indexSpec(cs);
  for (const pseudo of ["::before", "::after"]) {
    const generated = readGeneratedText(view.getComputedStyle(p, pseudo), cs, indexSpec);
    if (generated !== null) return `generated content on the paragraph ${pseudo}`;
  }
  const runs = [];
  const hardBreaks = [];
  const generatedByElement = /* @__PURE__ */new Map();
  let skip = null;
  let nextAtomicKey = 0;
  const attachInlineExtras = (el, before, insets, padded, painted) => {
    if (!padded && !painted.start && !painted.end) return null;
    const inside = runs.slice(before);
    let firstBoxAt = -1;
    let lastBoxAt = -1;
    for (let i = 0; i < inside.length; i++) {
      const run = inside[i];
      if (run.atomic === void 0 && !textMakesBox(run.text)) continue;
      if (firstBoxAt < 0) firstBoxAt = i;
      lastBoxAt = i;
    }
    if (padded) {
      if (firstBoxAt < 0) return `padded <${el.tagName.toLowerCase()}> with no text content`;
      const first = runs[before];
      const last = runs[runs.length - 1];
      first.padStartPx = (first.padStartPx ?? 0) + insets.start;
      last.padEndPx = (last.padEndPx ?? 0) + insets.end;
      last.padEndOwner = el;
    }
    if ((painted.start || painted.end) && firstBoxAt >= 0) {
      if (painted.start) {
        let startInset = 0;
        for (let i = 0; i <= firstBoxAt; i++) {
          startInset += inside[i].padStartPx ?? 0;
        }
        const firstBoxRun = inside[firstBoxAt];
        firstBoxRun.boxStartProtrusionPx = startInset;
        firstBoxRun.boxStartProtrusionOwner = el;
      }
      if (painted.end) {
        let endInset = 0;
        for (let i = lastBoxAt; i < inside.length; i++) {
          endInset += inside[i].padEndPx ?? 0;
        }
        inside[inside.length - 1].boxEndProtrusionPx = endInset;
        inside[lastBoxAt].boxEndProtrusionOwner = el;
      }
    }
    return null;
  };
  const walk = (node, chain, spec, atomicKey, floatInnerStyle) => {
    let adjacentTextRun = null;
    for (let child = node.firstChild; child !== null; child = child.nextSibling) {
      if (skip !== null) return;
      if (node === p && omittedNodes.has(child)) continue;
      if (child.nodeType === 3) {
        const text2 = child.nodeValue ?? "";
        if (text2.length > 0) {
          if (adjacentTextRun === null) {
            adjacentTextRun = {
              text: text2,
              spec,
              ancestors: chain,
              atomicKey,
              floatInnerStyle: floatInnerStyle.length > 0 ? floatInnerStyle : void 0
            };
            runs.push(adjacentTextRun);
          } else {
            adjacentTextRun.text += text2;
          }
        }
      } else if (child.nodeType === 1) {
        adjacentTextRun = null;
        const el = child;
        const tag = el.tagName.toUpperCase();
        if (tag === "BR") {
          const elStyle2 = view.getComputedStyle(el);
          if (elStyle2.display === "none") continue;
          skip = hardBreakBailReason(elStyle2);
          if (skip !== null) return;
          hardBreaks.push({
            source: el,
            ancestors: chain,
            afterRun: runs.length
          });
          continue;
        }
        if (REJECT_TAGS.has(tag)) {
          skip = `<${el.tagName.toLowerCase()}> content`;
          return;
        }
        const elStyle = view.getComputedStyle(el);
        const atomic = readAtomicBox(el, elStyle);
        if (typeof atomic === "string") {
          skip = atomic;
          return;
        }
        if (atomic !== null) {
          runs.push({
            text: "",
            spec,
            ancestors: chain,
            atomicKey,
            atomic
          });
          continue;
        }
        const pseudoStyles = ["::before", "::after"].map(pseudo => view.getComputedStyle(el, pseudo));
        const generated = pseudoStyles.map(style => readGeneratedText(style, elStyle, indexSpec));
        const unsupported = generated.find(value => typeof value === "string");
        if (typeof unsupported === "string") {
          skip = `${unsupported} on <${el.tagName.toLowerCase()}>`;
          return;
        }
        generatedByElement.set(el, generated);
        const insets = inlineInsets(elStyle, direction);
        const padded = insets.start > 0 || insets.end > 0;
        skip = inlineBailReason(el, elStyle, cs, padded);
        if (skip !== null) return;
        const childKey = elStyle.whiteSpace === "nowrap" ? atomicKey ?? nextAtomicKey++ : atomicKey;
        const before = runs.length;
        const paintedHere = paintedInlineEdges(elStyle, direction);
        walk(el, [...chain, el], indexSpec(elStyle), childKey, firstLetterInnerStyle(elStyle, cs));
        if (skip !== null) return;
        if (runs.length === before && pseudoStyles.some(style => style.display !== "none" && style.content !== "none" && style.content !== "normal" && style.content !== '""')) {
          skip = "generated content on an empty inline element";
          return;
        }
        if (generated.some(value => value !== null)) {
          const first = runs[before];
          const last = runs[runs.length - 1];
          if (first === void 0 || last === void 0 || runs.length === before || !textMakesBox(first.text) || !textMakesBox(last.text) || /^\s/.test(first.text) || /\s$/.test(last.text) || hardBreaks.some(br => br.ancestors.includes(el))) {
            skip = "generated content around empty, spaced or hard-broken inline content";
            return;
          }
          const start = generated[0];
          const end = generated[1];
          if (start !== null && typeof start === "object") {
            (first.generatedStart ?? (first.generatedStart = [])).unshift(start);
          }
          if (end !== null && typeof end === "object") {
            (last.generatedEnd ?? (last.generatedEnd = [])).push(end);
            last.padEndOwner = el;
          }
        }
        skip = attachInlineExtras(el, before, insets, padded, paintedHere);
        if (skip !== null) return;
      }
    }
  };
  walk(p, [], baseSpec, void 0, []);
  if (skip !== null) return skip;
  if (runs.length === 0 && hardBreaks.length === 0) return "no text content";
  const text = runs.map(r => r.text).join("");
  if (text.length > 0 && !textSupported(text, direction)) {
    return "unsupported text (forced separators, bidi controls, mixed direction, or a script without break support)";
  }
  const textWithGenerated = runs.map(run => [...(run.generatedStart ?? []).map(generated => generated.text), run.text, ...(run.generatedEnd ?? []).map(generated => generated.text)].join("")).join("");
  if (textWithGenerated !== text && !textSupported(textWithGenerated, direction)) {
    return "unsupported generated text direction or script";
  }
  const floatDetails = floatDetailsOf(p, elementFloat === null ? text : p.textContent ?? "", cs, fragments.rects.length, batch);
  if (typeof floatDetails === "string") return floatDetails;
  if (elementFloat !== null && floatDetails !== null) {
    return "leading floated element conflicts with ::first-letter";
  }
  if (floatDetails !== null && runs.some(run => run.generatedStart !== void 0 || run.generatedEnd !== void 0)) {
    return "generated inline content with a floated ::first-letter";
  }
  const floatIntrusion = elementFloat ?? floatDetails?.intrusion ?? null;
  if (floatDetails !== null && elementFloat === null) {
    const firstSpan = floatDetails.span;
    let offset = 0;
    for (const run of runs) {
      const runEnd = offset + run.text.length;
      const start = Math.max(firstSpan.start, offset);
      const end = Math.min(firstSpan.end, runEnd);
      if (start < end) {
        run.flowExclusion = {
          start: start - offset,
          end: end - offset
        };
      }
      offset = runEnd;
    }
  }
  const contentWidth = fragments.contentWidth;
  let textIndent = parseFloat(cs.textIndent) || 0;
  const textIndentPct = cs.textIndent.endsWith("%") ? textIndent / 100 : null;
  if (textIndentPct !== null) textIndent = textIndentPct * contentWidth;
  const lineHeightPx = parseFloat(cs.lineHeight);
  const styles = cs;
  const cis = styles.containIntrinsicBlockSize ?? styles.containIntrinsicHeight ?? "";
  const pinIntrinsicSize = (styles.contentVisibility ?? "") === "auto" || cis !== "" && cis !== "none";
  return {
    runs,
    hardBreaks,
    generated: generatedByElement,
    specs,
    baseSpec,
    contentWidth,
    textIndent,
    textIndentPct,
    lineHeightPx: Number.isFinite(lineHeightPx) ? lineHeightPx : null,
    pinIntrinsicSize,
    justifyAll: cs.textAlign === "justify-all" || cs.textAlignLast === "justify",
    direction,
    floatIntrusion,
    authorHasNbsp: /[\u00A0\u202F]/.test(p.textContent ?? "")
  };
}
function contentWidthOf(p) {
  const view = p.ownerDocument.defaultView;
  if (view === null) return "zero content width";
  const cs = view.getComputedStyle(p);
  const fragments = fragmentBoxesOf(p, cs);
  return fragments.ok ? fragments.contentWidth : fragments.reason;
}

// src/dom/paragraph-state.ts
var states = /* @__PURE__ */new WeakMap();
function restoreStyleAttribute(el, style) {
  if (style === null) {
    el.setAttribute("style", "");
    el.removeAttribute("style");
  } else {
    el.setAttribute("style", style);
  }
}
var KEY_PROPERTIES = /* @__PURE__ */new Set(["hyphens", "-webkit-hyphens", "text-indent", "min-width", "contain"]);
var NO_TRANSITION_CLASS = "justif-no-transition";
function maskAuthorStyle(p, state, property, value, priority) {
  if (priority === void 0) {
    priority = "";
  }
  maskAuthorStyles(p, state, [[property, value]], priority);
}
function maskAuthorStyles(p, state, declarations, priority) {
  if (priority === void 0) {
    priority = "";
  }
  const authored = declarations.map(_ref11 => {
    let property = _ref11[0];
    return {
      author: p.style.getPropertyValue(property),
      authorPriority: p.style.getPropertyPriority(property)
    };
  });
  for (const _ref12 of declarations.entries()) {
    const index = _ref12[0];
    var _ref12$ = _ref12[1];
    const property = _ref12$[0];
    const value = _ref12$[1];
    const existing = state.masked.find(mask => mask.property === property);
    if (existing === void 0) {
      state.masked.push({
        property,
        inKey: KEY_PROPERTIES.has(property),
        ours: value,
        oursPriority: priority,
        ...authored[index]
      });
    } else {
      existing.ours = value;
      existing.oursPriority = priority;
    }
    p.style.setProperty(property, value, priority);
  }
}
function authorRewroteStyleAttribute(p, saved) {
  const probe = p.ownerDocument.createElement("span");
  if (saved !== null) probe.setAttribute("style", saved);
  return declarationSet(probe.style) !== declarationSet(p.style);
}
function declarationSet(style) {
  const declarations = [];
  for (let index = 0; index < style.length; index++) {
    const property = style.item(index);
    declarations.push(`${property}:${style.getPropertyValue(property)}:${style.getPropertyPriority(property)}`);
  }
  return declarations.sort().join(";");
}
function unmaskAuthorStyle(p, state, property) {
  const kept = [];
  for (const mask of state.masked) {
    if (property && mask.property !== property) {
      kept.push(mask);
      continue;
    }
    if (p.style.getPropertyValue(mask.property) !== mask.ours) continue;
    if (mask.author === "") p.style.removeProperty(mask.property);else p.style.setProperty(mask.property, mask.author, mask.authorPriority);
  }
  state.masked = kept;
}
function firstLineIndentPx(state) {
  return state.scan.textIndentPct !== null ? state.scan.textIndentPct * state.width : state.scan.textIndent;
}
function forgetNativeHang(state) {
  if (state.nativeIndent === null) return false;
  state.nativeIndent = null;
  return true;
}
function clearNativeHang(p, state) {
  if (!forgetNativeHang(state)) return false;
  state.masked = [];
  restoreStyleAttribute(p, state.originalStyleAttr);
  return true;
}
function nativeHangIndent(state, hangPx) {
  if (hangPx < state.scan.specs[state.scan.baseSpec].sizePx * 0.04) {
    return null;
  }
  return Number((firstLineIndentPx(state) - hangPx).toFixed(3));
}
function applyNativeHang(p, state, indent) {
  if (indent === null) return clearNativeHang(p, state);
  if (indent === state.nativeIndent) return false;
  state.nativeIndent = indent;
  maskAuthorStyle(p, state, "text-indent", `${indent}px`);
  maskAuthorStyle(p, state, "hanging-punctuation", "none");
  return true;
}
function withInlineSizeContainment(authorContain) {
  if (authorContain === "strict" || authorContain.includes("size")) return authorContain;
  if (authorContain === "content") return "inline-size layout style paint";
  return !authorContain || authorContain === "none" ? "inline-size" : `${authorContain} inline-size`;
}
function restoreManagedOutput(p, state, styleAttribute) {
  if (styleAttribute === void 0) {
    styleAttribute = "restore";
  }
  const clearedHang = styleAttribute === "restore" ? clearNativeHang(p, state) : forgetNativeHang(state);
  if (!state.enhanced) return clearedHang;
  p.replaceChildren(state.original);
  clearAtomicRendered(state.scan);
  if (styleAttribute === "restore") {
    restoreStyleAttribute(p, state.originalStyleAttr);
    state.masked = [];
  }
  p.removeAttribute("data-justif");
  p.removeAttribute("data-justif-dropcap");
  state.lastPatch = "";
  state.enhanced = false;
  state.renderedFloat = null;
  return true;
}
function beginEnhancement(p, state) {
  state.original.append(...p.childNodes);
  state.enhanced = true;
  p.setAttribute("data-justif", "");
  if (state.scan.floatIntrusion?.kind === "first-letter") {
    p.setAttribute("data-justif-dropcap", "");
  }
  maskAuthorStyles(p, state, TEXT_AUTOSIZING_DECLARATIONS, "important");
  maskAuthorStyle(p, state, "text-align", state.scan.direction === "rtl" ? "right" : "left");
  if (state.scan.justifyAll) {
    const last = state.scan.direction === "rtl" ? "right" : "left";
    maskAuthorStyle(p, state, "text-align-last", last);
  }
  maskAuthorStyle(p, state, "hanging-punctuation", "none");
  maskAuthorStyle(p, state, "overflow-wrap", "normal");
  maskAuthorStyle(p, state, "word-break", "normal");
  maskAuthorStyle(p, state, "line-break", "auto");
  if (state.scan.specs[state.scan.baseSpec].hyphens === "auto") {
    maskAuthorStyles(p, state, [["hyphens", "manual"], ["-webkit-hyphens", "manual"]]);
  }
}

// src/dom/whitespace.ts
function leadingCollapsibleSpaces(text) {
  let count = 0;
  while (count < text.length && text.charCodeAt(count) === 32) count++;
  return count;
}
function trailingCollapsibleSpaces(text) {
  let count = 0;
  while (count < text.length && text.charCodeAt(text.length - count - 1) === 32) count++;
  return count;
}
function endWithoutCollapsibleSpaces(text) {
  return text.length - trailingCollapsibleSpaces(text);
}

// src/dom/line-corrections.ts
function fragmentForLine(rects, lineRect, rtl) {
  const x = rtl ? lineRect.right : lineRect.left;
  const y = lineRect.top + lineRect.height / 2;
  let best = rects[0];
  let bestDistance = Infinity;
  for (const rect of rects) {
    const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      best = rect;
      bestDistance = distance;
    }
  }
  return best;
}
function foreignMutated(entries) {
  return entries.some(_ref13 => {
    let el = _ref13.el,
      seg = _ref13.seg;
    if (seg === null) return false;
    if (seg.atomic !== void 0) {
      let elements = 0;
      for (const node of el.childNodes) {
        if (node.nodeType === 1) elements++;else if (node.nodeType !== 3 || node.data !== "\u2060") return true;
      }
      return elements !== 1;
    }
    const singleText = el.childNodes.length === 1 && el.firstChild?.nodeType === 3 && el.firstChild.data === seg.text;
    if (hangCarrierShed(seg) <= 0) {
      return !singleText;
    }
    const mid = el.childNodes[1];
    const hangShape = el.childNodes.length === 3 && el.firstChild?.nodeType === 3 && mid?.nodeType === 1 && mid.className === "justif-hanging-end" && el.lastChild?.nodeType === 3 && el.textContent === seg.text;
    return !(singleText || hangShape);
  });
}
function segmentTextPoint(el, index) {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let remaining = index;
  let last = null;
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const text = n;
    if (remaining <= text.length) return {
      node: text,
      offset: remaining
    };
    remaining -= text.length;
    last = text;
  }
  return last === null ? null : {
    node: last,
    offset: last.length
  };
}
function sharesLineBox(rect, lineRect, rtl) {
  if (rect.width === 0 && rect.height === 0) return true;
  const startsAtLineStart = lineRect.width > LINE_START_TOLERANCE_PX && (rtl ? rect.right >= lineRect.right - LINE_START_TOLERANCE_PX : rect.left <= lineRect.left + LINE_START_TOLERANCE_PX);
  const below = rect.top > lineRect.top + LINE_START_TOLERANCE_PX;
  return !(startsAtLineStart && below);
}
var LINE_START_TOLERANCE_PX = 1;
function measureLineExtent(entries, range, rtl) {
  let rectPx = 0;
  let modelPx = 0;
  let ownMargins = 0;
  let lineRect = null;
  let unmeasurable = false;
  let split = false;
  for (let index = 0; index < entries.length; index++) {
    const _entries$index = entries[index],
      el = _entries$index.el,
      seg = _entries$index.seg,
      marginEndEl = _entries$index.marginEndEl;
    let elRect;
    if (lineRect === null) {
      elRect = el.getBoundingClientRect();
      lineRect = elRect;
    }
    const later = index > 0;
    if (seg === null || seg.edgeTrim.lead === 0 && seg.edgeTrim.trail === 0) {
      const rect = elRect ?? el.getBoundingClientRect();
      rectPx += rect.width;
      if (later && !sharesLineBox(rect, lineRect, rtl)) split = true;
    } else {
      if (seg.transformChangesLength === true) unmeasurable = true;
      const start = segmentTextPoint(el, seg.edgeTrim.lead);
      const end = segmentTextPoint(el, seg.text.length - seg.edgeTrim.trail);
      if (start === null || end === null) {
        unmeasurable = true;
      } else {
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        const rect = range.getBoundingClientRect();
        rectPx += rect.width;
        if (later && !sharesLineBox(rect, lineRect, rtl)) split = true;
        modelPx += seg.edgeTrim.modelPx;
      }
    }
    if (seg !== null && seg.decorPx !== void 0) modelPx += seg.decorPx;
    modelPx += seg?.marginStartPx ?? 0;
    const me = parseFloat(marginEndEl.style.marginInlineEnd) || 0;
    modelPx += me;
    ownMargins += me;
  }
  return {
    rectPx,
    modelPx,
    ownMargins,
    lineRect,
    unmeasurable,
    split
  };
}
function contentEndOf(fragment, paragraphStyle, rtl) {
  return rtl ? fragment.left + (parseFloat(paragraphStyle?.borderLeftWidth ?? "") || 0) + (parseFloat(paragraphStyle?.paddingLeft ?? "") || 0) : fragment.right - (parseFloat(paragraphStyle?.borderRightWidth ?? "") || 0) - (parseFloat(paragraphStyle?.paddingRight ?? "") || 0);
}
function paintedEndOf(entries, endText, range, rtl) {
  const paintEndEntry = entries[entries.length - 1];
  let paintRect;
  if (paintEndEntry.paintEndEl !== void 0) {
    paintRect = paintEndEntry.paintEndEl.getBoundingClientRect();
  } else if (paintEndEntry.seg !== null && paintEndEntry.seg.marginEndOwner !== void 0 && paintEndEntry.marginEndEl !== paintEndEntry.el) {
    paintRect = paintEndEntry.marginEndEl.getBoundingClientRect();
  } else if (paintEndEntry.seg === null) {
    paintRect = paintEndEntry.el.getBoundingClientRect();
  } else {
    const node = endText?.el.firstChild;
    const end = endText === void 0 ? 0 : endWithoutCollapsibleSpaces(endText.seg.text);
    if (node?.nodeType === 3 && end > 0) {
      if (end === node.length && node === endText.el.lastChild) {
        paintRect = endText.el.getBoundingClientRect();
      } else {
        if (endText.seg.transformChangesLength === true) return null;
        const endPoint = segmentTextPoint(endText.el, end);
        if (endPoint === null) return null;
        range.setStart(node, 0);
        range.setEnd(endPoint.node, endPoint.offset);
        paintRect = range.getBoundingClientRect();
      }
    } else paintRect = paintEndEntry.el.getBoundingClientRect();
  }
  let value = rtl ? -paintRect.left : paintRect.right;
  if (paintEndEntry.paintEndEl !== void 0 && paintEndEntry.marginEndEl !== paintEndEntry.paintEndEl && paintEndEntry.paintEndEl.contains(paintEndEntry.marginEndEl)) {
    value -= parseFloat(paintEndEntry.marginEndEl.style.marginInlineEnd) || 0;
  }
  return {
    value,
    rect: paintRect
  };
}
function distributeAdjustment(textEntries, adjustmentPx) {
  if (Math.abs(adjustmentPx) <= 1e-3) return [];
  const spaceCounts = textEntries.map((entry, entryIndex) => Math.max(0, entry.seg.adjustableSpaceCount - (entryIndex === 0 ? entry.seg.edgeTrim.lead : 0)));
  const spacing = [];
  const spaces = spaceCounts.reduce((sum, count) => sum + count, 0);
  if (spaces > 0) {
    const delta2 = adjustmentPx / spaces;
    for (let entryIndex = 0; entryIndex < textEntries.length; entryIndex++) {
      if (spaceCounts[entryIndex] === 0) continue;
      const entry = textEntries[entryIndex];
      spacing.push({
        el: entry.el,
        property: "word-spacing",
        px: (parseFloat(entry.el.style.wordSpacing) || 0) - delta2
      });
    }
    return spacing;
  }
  const charCounts = textEntries.map((entry, entryIndex) => entry.seg.allowLetterCorrection ? Array.from(entry.seg.text.slice(entryIndex === 0 ? entry.seg.edgeTrim.lead : 0)).length : 0);
  const chars = charCounts.reduce((sum, count) => sum + count, 0);
  if (chars === 0) return spacing;
  const delta = adjustmentPx / chars;
  for (let entryIndex = 0; entryIndex < textEntries.length; entryIndex++) {
    if (charCounts[entryIndex] === 0) continue;
    const entry = textEntries[entryIndex];
    const computed = entry.el.ownerDocument.defaultView?.getComputedStyle(entry.el);
    spacing.push({
      el: entry.el,
      property: "letter-spacing",
      px: (parseFloat(computed?.letterSpacing ?? "") || 0) - delta
    });
  }
  return spacing;
}
function measureCorrections(pending, detailed) {
  const outcomes = [];
  let range = null;
  for (let i = 0; i < pending.length; i++) {
    try {
      const _pending$i = pending[i],
        doc = _pending$i.doc,
        paragraph = _pending$i.paragraph,
        lineElements = _pending$i.lineElements,
        lineWidths = _pending$i.lineWidths,
        contentWidth = _pending$i.contentWidth,
        physicalFitLines = _pending$i.physicalFitLines,
        generatedOwners = _pending$i.generatedOwners;
      const firstEntry = lineElements.find(l => l.length > 0)?.[0];
      if (firstEntry === void 0 || !firstEntry.el.isConnected) {
        outcomes.push({
          status: "stale"
        });
        continue;
      }
      range ?? (range = doc.createRange());
      const paragraphStyle = doc.defaultView?.getComputedStyle(paragraph);
      const rtl = paragraphStyle?.direction === "rtl";
      const fragments = fragmentBoxesOf(paragraph, paragraphStyle);
      if (!fragments.ok) {
        outcomes.push(fragments.reason === "not rendered" ? {
          status: "hidden"
        } : fragments.reason === "zero content width" ? {
          status: "collapsed"
        } : {
          status: "invalid",
          reason: fragments.reason
        });
        continue;
      }
      if (Math.abs(fragments.contentWidth - contentWidth) > FRAGMENT_WIDTH_TOLERANCE_PX) {
        outcomes.push({
          status: "resized",
          width: fragments.contentWidth,
          minWidth: paragraphStyle?.minWidth ?? "auto",
          contain: paragraphStyle?.contain ?? "none"
        });
        continue;
      }
      let generatedChanged = false;
      for (const _ref14 of generatedOwners) {
        const clone = _ref14.clone;
        const snapshots = _ref14.snapshots;
        for (let side = 0; side < 2; side++) {
          const actual = doc.defaultView.getComputedStyle(clone, side === 0 ? "::before" : "::after");
          const snapshot = snapshots[side];
          if (snapshot === null) {
            if (actual.content !== "none" && actual.content !== "normal") {
              generatedChanged = true;
              break;
            }
          } else if (GENERATED_STYLE_PROPERTIES.some((property, index) => actual.getPropertyValue(property) !== snapshot.style[index])) {
            generatedChanged = true;
            break;
          }
        }
        if (generatedChanged) break;
      }
      if (generatedChanged) {
        outcomes.push({
          status: "invalid",
          reason: "generated content changed after enhancement"
        });
        continue;
      }
      let atomicResized = false;
      let seen = null;
      for (const line of lineElements) {
        for (const entry of line) {
          const box = entry.seg?.atomic?.box;
          if (box === void 0) continue;
          seen ?? (seen = /* @__PURE__ */new Set());
          if (seen.has(box)) continue;
          seen.add(box);
          if (atomicWidthStale(box)) atomicResized = true;
        }
      }
      if (atomicResized) {
        outcomes.push({
          status: "atomic-resized"
        });
        continue;
      }
      if (detailed?.[i] === false) {
        outcomes.push({
          status: "hidden"
        });
        continue;
      }
      let sawInk = false;
      const paraCorrections = [];
      for (let li = 0; li < lineElements.length; li++) {
        const entries = lineElements[li];
        if (entries.length === 0) continue;
        if (foreignMutated(entries)) {
          if (!sawInk) {
            sawInk = entries.some(_ref15 => {
              let el = _ref15.el;
              return el.getBoundingClientRect().width > 0;
            });
          }
          continue;
        }
        const availableWidth = lineWidths[li] ?? lineWidths[lineWidths.length - 1] ?? 0;
        const _measureLineExtent = measureLineExtent(entries, range, rtl === true),
          rectPx = _measureLineExtent.rectPx,
          modelPx = _measureLineExtent.modelPx,
          ownMargins = _measureLineExtent.ownMargins,
          lineRect = _measureLineExtent.lineRect,
          unmeasurable = _measureLineExtent.unmeasurable,
          split = _measureLineExtent.split;
        if (rectPx !== 0) sawInk = true;
        if (unmeasurable) continue;
        const layout = rectPx + modelPx;
        const overflow = layout - availableWidth;
        const textEntries = entries.filter(entry => entry.seg !== null);
        const endText = textEntries[textEntries.length - 1];
        const objectTighten = endText?.seg.objectTightenPx ?? 0;
        if (overflow > CORRECTION_WINDOW_PX - objectTighten) {
          const rightHang = endText?.seg.rightHangPx ?? 0;
          const physicalEndHang = textEntries.reduce((sum, entry) => sum + (entry.seg.physicalEndHangPx ?? 0), 0) + (endText?.seg.hyphenEndHangPx ?? 0);
          const physicalPad = textEntries.reduce((sum, entry) => sum + (entry.seg.physicalPadPx ?? 0), 0);
          const deliberateOverflow = endText?.seg.overflowPx ?? 0;
          const besideFloat = li < physicalFitLines;
          const physicalFit = besideFloat || split;
          const objectSpare = entries.some(entry => entry.seg?.atomic !== void 0) ? OBJECT_WRAP_SPARE_PX : 0;
          const physicalLayout = layout - ownMargins;
          let adjustmentPx;
          if (physicalFit) {
            adjustmentPx = physicalLayout - (availableWidth - FLOAT_WRAP_SPARE_PX - objectSpare + rightHang - physicalEndHang - physicalPad + deliberateOverflow);
          } else {
            const fragment = fragmentForLine(fragments.rects, lineRect, rtl === true);
            const contentEnd = contentEndOf(fragment, paragraphStyle, rtl === true);
            const paintEndEntry = entries[entries.length - 1];
            const painted = paintedEndOf(entries, endText, range, rtl === true);
            if (painted === null) continue;
            const paintRect = painted.rect;
            if (paintEndEntry.seg === null && endText !== void 0) {
              const textRect = endText.el.getBoundingClientRect();
              if (Math.abs(paintRect.top - textRect.top) > 0.5 || fragmentForLine(fragments.rects, paintRect, rtl === true) !== fragment) {
                continue;
              }
            }
            const desiredEnd = (rtl ? -contentEnd : contentEnd) + rightHang + deliberateOverflow - objectSpare;
            adjustmentPx = painted.value - desiredEnd;
          }
          const spacing = distributeAdjustment(textEntries, adjustmentPx);
          if (Math.abs(adjustmentPx) > 1e-3 && spacing.length === 0) continue;
          const lineEndEntry = entries[entries.length - 1];
          paraCorrections.push({
            el: lineEndEntry.el,
            marginEl: lineEndEntry.marginEndEl,
            // Spacing now puts the measured painted edge at the requested
            // optical position. Its matching layout exclusion is therefore
            // exactly the intentional hang/overfull amount; deriving this
            // margin again from summed DOM widths lets engine-specific inline
            // rounding leak back in (notably Firefox's persistent 1.5px).
            // The object spare is NOT part of this: the spacing above already
            // set the line that much short, so the advance this excludes is the
            // intentional hang alone. Counting the spare here too would take
            // the same slack out twice.
            marginPx: -(rightHang - (besideFloat ? physicalEndHang : 0) + deliberateOverflow),
            spacing: spacing.length > 0 ? spacing : void 0
          });
        }
      }
      outcomes.push(sawInk ? {
        status: "corrected",
        corrections: paraCorrections
      } : {
        status: "hidden"
      });
    } catch (error) {
      range = null;
      outcomes.push({
        status: "invalid",
        reason: `threw while measuring: ${describeError(error)}`
      });
    }
  }
  return outcomes;
}
function applyCorrections(corrections) {
  for (const c of corrections) {
    for (const spacing of c.spacing ?? []) {
      spacing.el.style.setProperty(spacing.property, px(spacing.px));
    }
    let target = c.el;
    for (let parent = target.parentElement; parent !== null && !parent.hasAttribute("data-justif") && parent.lastChild === target; parent = target.parentElement) {
      target = parent;
    }
    if (c.marginEl !== target) c.marginEl.style.marginInlineEnd = "0px";
    target.style.marginInlineEnd = px(c.marginPx);
  }
}

// src/dom/corrections.ts
function createCorrectionPass(host) {
  const SETTLE_PASSES = 5;
  const rejectPatch = (entry, reason, note) => {
    if (host.ownedState(entry.p) === void 0) return;
    host.queues.drop(entry.p);
    if (host.bailToNative(entry.p, reason)) note(entry.p);
  };
  const flushPatches = (batch, changed) => {
    if (batch.length === 0) return;
    const noteRelayout = p => {
      if (changed === void 0) host.emitRelayout(p);else changed.add(p);
    };
    if (host.tracksViewport && !host.viewportReady()) host.seedNearViewport(batch);
    let active = batch.filter(entry => entry.p.isConnected);
    for (let pass = 0; active.length > 0; pass++) {
      const detailed = active.map(entry => !host.tracksViewport || host.queues.nearViewport.has(entry.p));
      let outcomes;
      try {
        outcomes = measureCorrections(active.map(entry => entry.pending), detailed);
      } catch (error) {
        console.error("justif: correction measurement threw", error);
        const reason = `correction measurement failed: ${describeError(error)}`;
        for (const entry of active) rejectPatch(entry, reason, noteRelayout);
        return;
      }
      let wrote = false;
      const corrections = [];
      const park = [];
      const measured = [];
      for (let i = 0; i < active.length; i++) {
        const entry = active[i];
        const outcome = outcomes[i];
        switch (outcome.status) {
          case "stale":
            break;
          case "hidden":
            park.push(entry);
            break;
          case "corrected":
            corrections.push(...outcome.corrections);
            measured.push(entry);
            break;
          case "atomic-resized":
            {
              const state = host.ownedState(entry.p);
              if (state === void 0) {
                wrote = true;
                break;
              }
              if (pass >= SETTLE_PASSES) break;
              wrote = true;
              refreshAtomicWidths(state.scan);
              host.rebuildMetrics(state);
              state.lastPatch = "";
              const patched = host.safePatch(entry.p);
              if (patched.pending !== null) entry.pending = patched.pending;
              if (patched.changed) noteRelayout(entry.p);
              break;
            }
          case "invalid":
            rejectPatch(entry, outcome.reason, noteRelayout);
            wrote = true;
            break;
          case "collapsed":
            wrote = true;
            if (entry.guard === "live") {
              revertGuard(entry);
            } else {
              rejectPatch(entry, "content width collapsed to zero", noteRelayout);
            }
            break;
          case "resized":
            {
              const state = host.ownedState(entry.p);
              if (state === void 0) {
                wrote = true;
                break;
              }
              if (pass >= SETTLE_PASSES) {
                break;
              }
              wrote = true;
              settleWidth(entry, state, outcome.width, outcome.minWidth, outcome.contain, noteRelayout);
              break;
            }
        }
      }
      if (wrote) {
        active = active.filter(entry => entry.p.isConnected && host.ownedState(entry.p)?.enhanced === true);
        continue;
      }
      try {
        applyCorrections(corrections);
        for (const entry of park) host.queues.hiddenCorrections.set(entry.p, entry.pending);
        host.verifyElementFloats(measured);
      } catch (error) {
        console.error("justif: correction write threw", error);
      }
      return;
    }
  };
  const intrinsicRepair = (minWidth, contain) => {
    if (minWidth === "auto") return {
      property: "min-width",
      value: "0px"
    };
    const guarded = withInlineSizeContainment(contain);
    return guarded === contain ? null : {
      property: "contain",
      value: guarded
    };
  };
  const revertGuard = entry => {
    const state = host.ownedState(entry.p);
    if (state !== void 0 && entry.guardProperty !== void 0) {
      unmaskAuthorStyle(entry.p, state, entry.guardProperty);
    }
    entry.guard = "cleared";
  };
  const settleWidth = (entry, state, width, minWidth, contain, note) => {
    if (entry.guard === void 0) {
      if (width > entry.pending.contentWidth) {
        const repair = intrinsicRepair(minWidth, contain);
        if (repair !== null) {
          maskAuthorStyle(entry.p, state, repair.property, repair.value);
          entry.guard = "live";
          entry.guardProperty = repair.property;
          return;
        }
      }
    } else if (entry.guard === "live") {
      revertGuard(entry);
      return;
    }
    state.width = width;
    state.lastPatch = "";
    const outcome = host.safePatch(entry.p);
    if (outcome.pending !== null) entry.pending = outcome.pending;
    if (outcome.changed) note(entry.p);
  };
  return {
    flushPatches
  };
}

// src/dom/drain.ts
function createDrainQueues() {
  const pendingWidths = /* @__PURE__ */new Map();
  const pendingFloatRelayout = /* @__PURE__ */new Set();
  const pendingCorrections = /* @__PURE__ */new Map();
  const hiddenCorrections = /* @__PURE__ */new Map();
  const nearViewport = /* @__PURE__ */new Set();
  return {
    pendingWidths,
    pendingFloatRelayout,
    pendingCorrections,
    hiddenCorrections,
    nearViewport,
    drop(p) {
      pendingWidths.delete(p);
      pendingFloatRelayout.delete(p);
      pendingCorrections.delete(p);
      hiddenCorrections.delete(p);
    }
  };
}
function createDrain(queues, host) {
  const hiddenCorrections = queues.hiddenCorrections,
    nearViewport = queues.nearViewport,
    pendingCorrections = queues.pendingCorrections,
    pendingFloatRelayout = queues.pendingFloatRelayout,
    pendingWidths = queues.pendingWidths;
  let pendingOrder = [];
  let pendingCursor = 0;
  let sliceQueued = false;
  const SLICE_BUDGET_MS = 10;
  const CORRECTION_CHUNK = 100;
  let viewObserverReady = false;
  const seedNearViewport = batch => {
    const root = document.documentElement;
    const width = root.clientWidth || window.innerWidth;
    const height = root.clientHeight || window.innerHeight;
    const margin = width / 2;
    for (const _ref16 of batch) {
      const p = _ref16.p;
      const r = p.getBoundingClientRect();
      if (r.bottom >= -margin && r.top <= height + margin && r.right >= -margin && r.left <= width + margin) {
        nearViewport.add(p);
      } else nearViewport.delete(p);
    }
  };
  const viewObserver = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
    viewObserverReady = true;
    let promoted = false;
    for (const e of entries) {
      if (e.isIntersecting) {
        nearViewport.add(e.target);
        if (promoteParked(e.target)) promoted = true;
      } else {
        nearViewport.delete(e.target);
        if (!e.target.isConnected) {
          const t = e.target;
          hiddenCorrections.delete(t);
          pendingCorrections.delete(t);
          pendingWidths.delete(t);
        }
      }
    }
    if (promoted) scheduleSlice();
  }, {
    rootMargin: "50%"
  });
  const revealObserver = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
    let revealed = false;
    for (const e of entries) {
      if (e.isIntersecting && promoteParked(e.target)) revealed = true;
    }
    if (revealed) scheduleSlice();
  });
  const promoteParked = el => {
    const parked = hiddenCorrections.get(el);
    if (parked === void 0) return false;
    hiddenCorrections.delete(el);
    const s = host.ownedState(el);
    if (s === void 0 || !s.enhanced) return false;
    pendingCorrections.set(el, parked);
    return true;
  };
  const scheduleSlice = () => {
    if (sliceQueued) return;
    sliceQueued = true;
    requestAnimationFrame(drainPending);
  };
  const visibleFirst = els => {
    if (els.length > 1) {
      const rank = p => (viewObserver !== null && !nearViewport.has(p) ? 2 : 0) + ((host.ownedState(p)?.scan.floatIntrusion ?? null) !== null ? 0 : 1);
      els.sort((a, b) => rank(a) - rank(b));
    }
    return els;
  };
  const restartPendingOrder = () => {
    pendingOrder = visibleFirst([... /* @__PURE__ */new Set([...pendingWidths.keys(), ...pendingFloatRelayout])]);
    pendingCursor = 0;
    scheduleSlice();
  };
  const drainPending = () => {
    sliceQueued = false;
    if (host.destroyed()) {
      reset();
      return;
    }
    const start = performance.now();
    let anchor = null;
    let anchorTop = 0;
    if (pendingCursor < pendingOrder.length) {
      let above = null;
      let below = null;
      for (const p of host.paragraphs) {
        if (!nearViewport.has(p)) continue;
        const top = p.getBoundingClientRect().top;
        if (top >= 0 && top < window.innerHeight) {
          anchor = p;
          anchorTop = top;
          break;
        }
        if (top < 0) above = p;else below ?? (below = p);
      }
      if (anchor === null) {
        anchor = above ?? below;
        if (anchor !== null) anchorTop = anchor.getBoundingClientRect().top;
      }
    }
    let wrote = false;
    while (pendingCursor < pendingOrder.length) {
      if (wrote && performance.now() - start > SLICE_BUDGET_MS) break;
      const el = pendingOrder[pendingCursor++];
      const width = pendingWidths.get(el);
      const floatRelayout = pendingFloatRelayout.delete(el);
      if (width === void 0 && !floatRelayout) continue;
      if (width !== void 0) pendingWidths.delete(el);
      const state = host.ownedState(el);
      if (state === void 0) continue;
      if (width !== void 0) {
        if (Math.abs(width - state.width) < 0.05 && !floatRelayout) continue;
        state.width = width;
      }
      if (floatRelayout) state.lastPatch = "";
      const outcome = host.safePatch(el);
      if (outcome.changed) {
        if (outcome.pending !== null) pendingCorrections.set(el, outcome.pending);
        wrote = true;
        host.emitRelayout(el);
        if (host.destroyed()) return;
      }
    }
    if (wrote && anchor !== null) {
      const delta = anchor.getBoundingClientRect().top - anchorTop;
      if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
    }
    if (wrote) {
      const floats = [...pendingCorrections.keys()].filter(el => (host.ownedState(el)?.scan.floatIntrusion ?? null) !== null);
      if (floats.length > 0) {
        const batch = floats.map(el => {
          const pending = pendingCorrections.get(el);
          pendingCorrections.delete(el);
          return {
            p: el,
            pending
          };
        });
        host.flushPatches(batch);
        if (host.destroyed()) return;
      }
    }
    if (pendingCursor < pendingOrder.length) {
      scheduleSlice();
      return;
    }
    if (!wrote && pendingCorrections.size > 0) {
      const els = visibleFirst([...pendingCorrections.keys()]);
      const batch = [];
      for (const el of els.slice(0, CORRECTION_CHUNK)) {
        batch.push({
          p: el,
          pending: pendingCorrections.get(el)
        });
        pendingCorrections.delete(el);
      }
      host.flushPatches(batch);
    }
    if (pendingCorrections.size > 0 || pendingWidths.size > 0 || pendingFloatRelayout.size > 0) {
      scheduleSlice();
    }
  };
  const onWidths = widths => {
    for (const _ref17 of widths) {
      const el = _ref17[0];
      const observed = _ref17[1];
      const state = host.ownedState(el);
      if (state === void 0 || state.observedInline === observed) continue;
      state.observedInline = observed;
      const width = contentWidthOf(el);
      if (typeof width === "string") continue;
      if (Math.abs(width - state.width) < 0.05) {
        pendingWidths.delete(el);
        continue;
      }
      pendingWidths.set(el, width);
      host.suspendWidthObservation(el);
    }
    if (pendingWidths.size > 0) {
      for (const p of pendingFloatRelayout) host.suspendWidthObservation(p);
      pendingOrder = visibleFirst([... /* @__PURE__ */new Set([...pendingWidths.keys(), ...pendingFloatRelayout])]);
      pendingCursor = 0;
      if (!sliceQueued) drainPending();
    }
  };
  const reset = () => {
    pendingWidths.clear();
    pendingFloatRelayout.clear();
    pendingCorrections.clear();
    hiddenCorrections.clear();
    pendingOrder = [];
  };
  return {
    /** False when the environment has no IntersectionObserver, in which case
     * nothing is ever parked and every paragraph is corrected in full. */
    tracksViewport: viewObserver !== null,
    /** False until the observers have supplied the passive viewport state. */
    viewportReady: () => viewObserverReady,
    seedNearViewport,
    restartPendingOrder,
    onWidths,
    /** Track `p`'s viewport proximity. Both observers, always together: the
     * 50% one drives drain ordering and the first promotion stage, the
     * margin-0 one is the guaranteed reveal for parked corrections. */
    observe: p => {
      viewObserver?.observe(p);
      revealObserver?.observe(p);
    },
    unobserve: p => {
      viewObserver?.unobserve(p);
      revealObserver?.unobserve(p);
    },
    disconnect: () => {
      viewObserver?.disconnect();
      revealObserver?.disconnect();
    },
    reset
  };
}

// src/dom/floats.ts
function floatGeometryEquals(a, b) {
  return Math.abs(a.inlineSize - b.inlineSize) <= 0.05 && a.lines === b.lines;
}
function createFloatTracking(host) {
  let floatObserver = null;
  const observedFloat = /* @__PURE__ */new Map();
  const floatParagraph = /* @__PURE__ */new WeakMap();
  const refreshElementFloat = (p, state, intrusion, source, verify) => {
    if (host.queues.pendingWidths.has(p)) return "stale";
    const widthNow = contentWidthOf(p);
    if (typeof widthNow !== "number" || Math.abs(widthNow - state.width) > 0.05) {
      return "stale";
    }
    const rendered = source ?? state.renderedFloat ?? intrusion.source;
    const direction = state.scan.direction === "rtl" ? "rtl" : "ltr";
    if (physicalFloatSide(getComputedStyle(rendered).float, direction) === null) {
      return "unfloated";
    }
    const next = renderedElementFloatIntrusionOf(p, rendered, intrusion, verify);
    if (next === null) return "unmeasurable";
    if (floatGeometryEquals(next, intrusion)) return "unchanged";
    state.scan.floatIntrusion = next;
    state.lastPatch = "";
    return "changed";
  };
  const declineUnfloated = p => {
    host.queues.drop(p);
    const changed = host.bailToNative(p, "leading floated element is no longer floated");
    rebind(p);
    if (changed) host.emitRelayout(p);
  };
  const verifyElementFloats = batch => {
    let queued = false;
    for (const _ref18 of batch) {
      const p = _ref18.p;
      const pending = _ref18.pending;
      const state = host.ownedState(p);
      const intrusion = state?.scan.floatIntrusion;
      if (state === void 0 || intrusion === null || intrusion === void 0) continue;
      const source = intrusion.kind === "element" ? state.renderedFloat : pending.floatSource;
      if (intrusion.kind === "first-letter" && source !== null) {
        const inlineSize = floatInlineSizeOf(p);
        if (inlineSize !== null && Math.abs(inlineSize - intrusion.inlineSize) > 0.05) {
          state.scan.floatIntrusion = {
            ...intrusion,
            inlineSize
          };
          state.lastPatch = "";
          host.queues.pendingFloatRelayout.add(p);
          queued = true;
          continue;
        }
      }
      if (source !== null && !host.queues.pendingWidths.has(p) && displacedFloatLines(p, source, pending.lineElements, intrusion.lines)) {
        host.queues.drop(p);
        const changed = host.bailToNative(p, "corrected lines do not fit beside the float");
        rebind(p);
        if (changed) host.emitRelayout(p);
        continue;
      }
      if (intrusion.kind !== "element") continue;
      if (refreshElementFloat(p, state, intrusion, void 0, true) !== "changed") continue;
      host.queues.pendingFloatRelayout.add(p);
      queued = true;
    }
    if (queued) host.restartPendingOrder();
  };
  const refreshIntrusions = () => {
    let changed = false;
    for (const p of host.paragraphs) {
      const state = host.ownedState(p);
      if (state === void 0 || state.scan.floatIntrusion === null) continue;
      if (state.scan.floatIntrusion.kind === "element") {
        const verdict = refreshElementFloat(p, state, state.scan.floatIntrusion, void 0, false);
        if (verdict === "unfloated") declineUnfloated(p);else if (verdict === "changed") changed = true;
        continue;
      }
      const nextInlineSize = floatInlineSizeOf(p);
      if (nextInlineSize === null) continue;
      if (Math.abs(nextInlineSize - state.scan.floatIntrusion.inlineSize) > 0.05) {
        state.scan.floatIntrusion = {
          kind: "first-letter",
          inlineSize: nextInlineSize,
          lines: state.scan.floatIntrusion.lines,
          style: state.scan.floatIntrusion.style
        };
        changed = true;
      }
    }
    return changed;
  };
  const refreshNativeIntrusions = () => {
    if (host.destroyed()) return false;
    const candidates = host.paragraphs.flatMap(p => {
      const state = host.ownedState(p);
      return state !== void 0 && state.scan.floatIntrusion !== null ? [{
        p,
        state
      }] : [];
    });
    let changed = false;
    for (const _ref19 of candidates) {
      const p = _ref19.p;
      const state = _ref19.state;
      host.queues.drop(p);
      if (restoreManagedOutput(p, state)) changed = true;
    }
    for (const _ref20 of candidates) {
      const p = _ref20.p;
      const state = _ref20.state;
      const next = floatIntrusionOf(p, state.scan.runs.map(run => run.text).join(""), state.scan.floatIntrusion ?? void 0);
      if (next === null) {
        host.declineRestored(p, "could not remeasure paragraph float after font change");
        continue;
      }
      if (!floatGeometryEquals(next, state.scan.floatIntrusion)) changed = true;
      state.scan.floatIntrusion = next;
    }
    return changed;
  };
  const rebind = function (p, state) {
    if (state === void 0) {
      state = host.ownedState(p);
    }
    const prior = observedFloat.get(p);
    const intrusion = state?.scan.floatIntrusion;
    const next = intrusion?.kind === "element" ? state?.renderedFloat ?? intrusion.source : void 0;
    if (prior === next) return;
    if (prior !== void 0) {
      floatObserver?.unobserve(prior);
      observedFloat.delete(p);
    }
    if (next !== void 0) {
      observedFloat.set(p, next);
      floatParagraph.set(next, p);
      floatObserver?.observe(next);
    }
  };
  const attachObserver = () => {
    if (typeof ResizeObserver === "undefined") return;
    floatObserver = new ResizeObserver(onFloatResize);
    for (const source of observedFloat.values()) floatObserver.observe(source);
  };
  const onFloatResize = entries => {
    let queued = false;
    for (const entry of entries) {
      const p = floatParagraph.get(entry.target);
      if (p === void 0 || observedFloat.get(p) !== entry.target) continue;
      const state = host.ownedState(p);
      const intrusion = state?.scan.floatIntrusion;
      if (state === void 0 || intrusion?.kind !== "element") {
        floatObserver?.unobserve(entry.target);
        observedFloat.delete(p);
        continue;
      }
      const verdict = refreshElementFloat(p, state, intrusion, entry.target, false);
      if (verdict === "unfloated") {
        declineUnfloated(p);
        continue;
      }
      if (verdict === "unmeasurable") {
        const box = entry.contentBoxSize?.[0];
        const painted = box !== void 0 ? box.inlineSize > 0 || box.blockSize > 0 : entry.contentRect.width > 0 || entry.contentRect.height > 0;
        if (!painted) continue;
        host.queues.drop(p);
        const changed = host.bailToNative(p, "could not remeasure leading floated element after resize");
        rebind(p);
        if (changed) host.emitRelayout(p);
        continue;
      }
      if (verdict !== "changed") continue;
      host.queues.pendingFloatRelayout.add(p);
      queued = true;
    }
    if (queued) host.restartPendingOrder();
  };
  const disconnect = () => {
    floatObserver?.disconnect();
    floatObserver = null;
    observedFloat.clear();
  };
  return {
    refreshElementFloat,
    verifyElementFloats,
    refreshIntrusions,
    refreshNativeIntrusions,
    rebind,
    attachObserver,
    disconnect
  };
}

// src/dom/font-probes.ts
var KERN_SAMPLE_MAX = 256;
function collectFontProbes(scans, hyphenating) {
  const fontSample = /* @__PURE__ */new Map();
  const sampleFor = font => {
    let sample = fontSample.get(font);
    if (sample === void 0) {
      sample = {
        chars: /* @__PURE__ */new Set(),
        ascii: new Uint8Array(128),
        kern: ""
      };
      fontSample.set(font, sample);
    }
    return sample;
  };
  const addText = (font, text) => {
    const s = sampleFor(font);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 128) {
        if (s.ascii[code] === 1) continue;
        s.ascii[code] = 1;
        s.chars.add(text[i]);
      } else {
        const cp = String.fromCodePoint(text.codePointAt(i));
        s.chars.add(cp);
        i += cp.length - 1;
      }
    }
    if (s.kern.length < KERN_SAMPLE_MAX) {
      s.kern += text.slice(0, KERN_SAMPLE_MAX - s.kern.length);
    }
  };
  for (const scan of scans) {
    for (const spec of scan.specs) {
      sampleFor(ctxFontOf(spec));
    }
    for (const run of scan.runs) {
      const font = ctxFontOf(scan.specs[run.spec]);
      addText(font, run.text);
      for (const generated of [...(run.generatedStart ?? []), ...(run.generatedEnd ?? [])]) {
        addText(ctxFontOf(scan.specs[generated.spec]), generated.text);
      }
      for (const atomic of run.atomic?.fonts ?? []) addText(atomic.font, atomic.text);
      if (hyphenating || run.text.includes("\xAD")) sampleFor(font).chars.add("-");
    }
  }
  return [...fontSample].map(_ref21 => {
    let font = _ref21[0],
      s = _ref21[1];
    return {
      font,
      sample: s.chars.size === 0 ? " " : [...s.chars].join(""),
      kernSample: s.kern,
      baseline: 0,
      kernBaseline: 0
    };
  });
}
function reprobeBaselines(probes) {
  for (const f of probes) {
    f.baseline = probeAdvance(f.font, f.sample);
    f.kernBaseline = probeAdvance(f.font, f.kernSample);
  }
}
function probesChanged(probes) {
  return probes.some(f => Math.abs(probeAdvance(f.font, f.sample) - f.baseline) > 0.01 || Math.abs(probeAdvance(f.font, f.kernSample) - f.kernBaseline) > 0.01);
}

// src/dom/observe.ts
function createWidthObserver(onWidths) {
  const suspended = /* @__PURE__ */new Set();
  let frame = 0;
  const resume = () => {
    frame = 0;
    for (const el of suspended) observer.observe(el, {
      box: "content-box"
    });
    suspended.clear();
  };
  const observer = new ResizeObserver(entries => {
    const batch = /* @__PURE__ */new Map();
    for (const entry of entries) {
      const size = entry.contentBoxSize?.[0];
      batch.set(entry.target, size !== void 0 ? size.inlineSize : entry.contentRect.width);
    }
    onWidths(batch);
  });
  return {
    observe: el => {
      suspended.delete(el);
      observer.observe(el, {
        box: "content-box"
      });
    },
    unobserve: el => {
      observer.unobserve(el);
      suspended.delete(el);
    },
    suspend: el => {
      observer.unobserve(el);
      suspended.add(el);
      if (frame === 0) frame = requestAnimationFrame(resume);
    },
    disconnect: () => {
      observer.disconnect();
      suspended.clear();
      if (frame !== 0) cancelAnimationFrame(frame);
    }
  };
}

// src/dom/protrusion-tables.ts
var composedBySettings = /* @__PURE__ */new WeakMap();
function clearComposedProtrusionCache() {
  composedBySettings = /* @__PURE__ */new WeakMap();
}
var unmeasured;
function unmeasuredProtrusion() {
  if (unmeasured !== void 0) return unmeasured;
  const considered = new Set(opticalCandidates);
  unmeasured = Object.fromEntries(Object.entries(latinProtrusion).filter(_ref22 => {
    let ch = _ref22[0];
    return !considered.has(ch);
  }));
  return unmeasured;
}
function composedForFamily(spec, settings) {
  if (settings === void 0 || !settings.enabled) return null;
  let composedCache = composedBySettings.get(settings);
  if (composedCache === void 0) {
    composedCache = /* @__PURE__ */new Map();
    composedBySettings.set(settings, composedCache);
  }
  const family = spec.family;
  const key = opticalFontKey(spec);
  const hit = composedCache.get(key);
  if (hit !== void 0) return hit;
  let base = {};
  if (settings.model) {
    const measured = settings.measured && spec.direction !== "rtl" ? opticalProtrusion(spec) : void 0;
    base = measured !== void 0 ? {
      ...unmeasuredProtrusion(),
      ...measured
    } : {
      ...latinProtrusion,
      ...fontProtrusion(family)
    };
  }
  const composed = composeProtrusion(base, settings.user, settings.hang, settings.characters);
  const tables = {
    rest: composed.rest,
    first: composed.first !== composed.rest ? composed.first : void 0,
    credit: composed.credit
  };
  composedCache.set(key, tables);
  return tables;
}

// src/dom/run-metrics.ts
function spaceWidthIn(spec, context2) {
  return separatorWidthIn(spec, context2, " ");
}
function separatorWidthIn(spec, context2, separator) {
  let text;
  const runText = () => text ?? (text = context2());
  if (spec.direction === "rtl") {
    const probe = /\p{Script=Arabic}/u.test(runText()) ? "\u0644" : /\p{Script=Hebrew}/u.test(runText()) ? "\u05D0" : null;
    if (probe !== null) {
      return measureWidth(`${probe}${separator}${probe}`, spec) - 2 * measureWidth(probe, spec);
    }
  }
  if (requiresDomMeasurement(spec) && spec.variantPosition === "normal") {
    const letter = /\p{L}/u.exec(runText())?.[0] ?? "n";
    return measureWidth(`${letter}${separator}${letter}`, spec) - 2 * measureWidth(letter, spec);
  }
  return measureWidth(separator, spec);
}
function measureFor(specByKey) {
  return {
    width: (text, run) => measureWidth(text, specByKey.get(run.fontKey)),
    charAdvance: (ch, run) => measureWidth(ch, specByKey.get(run.fontKey)),
    inkBearings: (ch, run) => measureInkBearings(ch, specByKey.get(run.fontKey))
  };
}
function runTexts(scan) {
  for (const side of ["start", "end"]) {
    let advance = 0;
    let painted = false;
    let generated = false;
    let present = false;
    let owner;
    const order = side === "start" ? scan.runs : [...scan.runs].reverse();
    for (const run of order) {
      if (side === "start") {
        run.startEdge = void 0;
      } else {
        run.endEdge = void 0;
        run.endEdgeOwner = void 0;
      }
      const pad = side === "start" ? run.padStartPx : run.padEndPx;
      const hang = side === "start" ? run.boxStartProtrusionPx : run.boxEndProtrusionPx;
      const content = side === "start" ? run.generatedStart : run.generatedEnd;
      present || (present = pad !== void 0 || hang !== void 0 || content !== void 0);
      advance += pad ?? 0;
      painted || (painted = hang !== void 0);
      generated || (generated = content !== void 0);
      for (const value of content ?? []) {
        advance += measureWidth(value.text, scan.specs[value.spec]) + value.insetPx;
      }
      if (owner === void 0) owner = run.padEndOwner;
      if (run.atomic === void 0 && !textMakesBox(run.text)) continue;
      const fixedBoundary = generated || painted;
      if (present && fixedBoundary) {
        const edge = {
          advancePx: advance,
          protrusionPx: painted && !generated ? advance : 0
        };
        if (side === "start") run.startEdge = edge;else {
          run.endEdge = edge;
          run.endEdgeOwner = owner;
          run.boxEndProtrusionOwner ?? (run.boxEndProtrusionOwner = owner);
        }
      }
      advance = 0;
      painted = generated = present = false;
      owner = void 0;
    }
  }
  return scan.runs.map((r, i) => ({
    text: r.text,
    run: i,
    flowExclusion: r.flowExclusion,
    startEdge: r.startEdge,
    endEdge: r.endEdge,
    boxStartProtrusionPx: r.boxStartProtrusionPx,
    boxEndProtrusionPx: r.boxEndProtrusionPx,
    padStartPx: r.padStartPx,
    padEndPx: r.padEndPx,
    atomicKey: r.atomicKey,
    // The core needs the object's advance and nothing else about it; its
    // element and styling stay on the scan, where the writer reads them.
    atomic: r.atomic === void 0 ? void 0 : {
      widthPx: r.atomic.widthPx
    }
  }));
}
function buildRunMetrics(scan, expansion, spacing, protrusion) {
  const baseSpec = scan.specs[scan.baseSpec];
  const baseSpaceWidth = spaceWidthIn(baseSpec, () => scan.runs.map(r => r.text).join(" "));
  const pull = spacing.pull ?? 0.7;
  const samplePcts = [];
  if (expansion !== false && expansion.step > 0) {
    const stepPct = 100 * expansion.step;
    for (let q = stepPct; q <= 100 * expansion.max + 1e-9; q += stepPct) {
      samplePcts.push(Math.round((100 + q) * 1e3) / 1e3);
    }
    for (let q = stepPct; q <= 100 * expansion.shrink + 1e-9; q += stepPct) {
      samplePcts.push(Math.round((100 - q) * 1e3) / 1e3);
    }
  }
  return scan.runs.map(run => {
    const spec = scan.specs[run.spec];
    const perFontTables = composedForFamily(spec, protrusion);
    const perFont = perFontTables?.rest;
    const perFontFirst = perFontTables?.first;
    const perFontCredit = perFontTables?.credit;
    const naturalSpace = spaceWidthIn(spec, () => run.text);
    const spaceWidth = naturalSpace > baseSpaceWidth ? naturalSpace + (baseSpaceWidth - naturalSpace) * pull : naturalSpace;
    const flexWidth = naturalSpace + (Math.min(naturalSpace, baseSpaceWidth) - naturalSpace) * pull;
    const calibration = expansion === false ? NO_EXPANSION : calibrateStretch(spec, 100 + 100 * expansion.max, 100 - 100 * expansion.shrink, samplePcts, run.text);
    return {
      fontKey: spec.key,
      space: {
        width: spaceWidth,
        stretch: flexWidth * spacing.stretch,
        shrink: flexWidth * spacing.shrink
      },
      hyphenWidth: measureWidth("-", spec),
      ratioAtMax: calibration.ratioAtMax,
      ratioAtMin: calibration.ratioAtMin,
      expansionRatios: calibration.ratios,
      // RTL paragraphs never hyphenate: Arabic cursive joining makes the
      // prefix-incremental fragment measurement in buildItems invalid
      // (splitting changes the glyphs on both sides of the cut), and
      // Hebrew convention breaks without hyphens if at all. noHyphens
      // also strips soft hyphens and keeps the hyphenate callback from
      // ever being called for these runs.
      noHyphens: spec.hyphens === "none" || scan.direction === "rtl",
      // Word spaces between different font FAMILIES lose their shrink
      // (BuildOptions.boundaryShrink): chips and pills live at those
      // boundaries. Style/weight/size changes within a family (<em>,
      // <strong>) are not boundaries.
      familyKey: spec.family,
      // Monospace cells carry huge side bearings; advance-relative protrusion
      // codes would hang the ink visibly past the margin — but only when the
      // mono run sits INSIDE another font's prose (inline code), where the
      // hang reads as overflow against the base font's margin rhythm. A
      // paragraph set in a mono font owns its margin: it protrudes like any
      // other font (full cells hang under a hanging-punctuation mode — the
      // typewriter-tradition grid behavior).
      protrudeInkOnly: isMonospace(spec) && spec.key !== baseSpec.key,
      // Glyph identity for protrusion lookups only; every width this run
      // carries was already measured with the property applied.
      textTransform: spec.textTransform === "uppercase" || spec.textTransform === "lowercase" ? spec.textTransform : void 0,
      protrusion: perFont,
      protrusionFirst: perFontFirst,
      protrusionCredit: perFontCredit
    };
  });
}

// src/dom/metrics.ts
function createMetricsPass(record, host) {
  const buildParts = (scan, runsMetrics, specByKey) => {
    const _host$layoutOptions = host.layoutOptions(),
      buildOpts = _host$layoutOptions.buildOpts;
    const opts = scan.direction === "rtl" ? {
      ...buildOpts,
      tracking: false
    } : buildOpts;
    const texts = runTexts(scan);
    const measure2 = measureFor(specByKey);
    const parts = [];
    let startRun = 0;
    const append = (endRun, breakAfter) => {
      const para = buildItems(texts.slice(startRun, endRun), runsMetrics, opts, measure2);
      if (parts.length > 0) {
        for (const item of para.items) {
          if (item.type === ItemType.Box) item.lpFirst = item.lp;
        }
      }
      parts.push({
        para,
        breakAfter
      });
      startRun = endRun;
    };
    for (const hardBreak of scan.hardBreaks) {
      append(hardBreak.afterRun, hardBreak);
    }
    append(texts.length, null);
    return parts;
  };
  const rebuildMetrics = state => {
    const _host$layoutOptions2 = host.layoutOptions(),
      expansion = _host$layoutOptions2.expansion,
      spacing = _host$layoutOptions2.spacing,
      protrusionCtx = _host$layoutOptions2.protrusionCtx;
    state.runsMetrics = buildRunMetrics(state.scan, expansion, spacing, protrusionCtx);
    state.parts = buildParts(state.scan, state.runsMetrics, state.specByKey);
  };
  const warmDomWidths = entries => {
    const _host$layoutOptions3 = host.layoutOptions(),
      expansion = _host$layoutOptions3.expansion,
      spacing = _host$layoutOptions3.spacing,
      protrusionCtx = _host$layoutOptions3.protrusionCtx;
    collectDomMeasurements(() => {
      for (const _ref23 of entries) {
        const scan = _ref23.scan;
        const specByKey = _ref23.specByKey;
        if (!scan.specs.some(requiresDomMeasurement)) continue;
        try {
          buildParts(scan, buildRunMetrics(scan, expansion, spacing, protrusionCtx), specByKey);
        } catch {}
      }
    });
  };
  const domWidthEntriesFor = scannable => scannable.flatMap(p => {
    const scan = record.scanned.get(p);
    return scan === void 0 || !scan.specs.some(requiresDomMeasurement) ? [] : [{
      scan,
      specByKey: new Map(scan.specs.map(spec => [spec.key, spec]))
    }];
  });
  const prepare = p => {
    if (states.get(p)?.enhanced) {
      record.scanned.delete(p);
      return true;
    }
    const scan = record.scanned.get(p);
    if (scan === void 0) return false;
    record.scanned.delete(p);
    try {
      const specByKey = /* @__PURE__ */new Map();
      for (const spec of scan.specs) specByKey.set(spec.key, spec);
      const state = {
        owner: host.owner,
        original: document.createDocumentFragment(),
        originalStyleAttr: record.carriedStyleAttr.has(p) ? record.carriedStyleAttr.get(p) ?? null : p.getAttribute("style"),
        scan,
        runsMetrics: [],
        specByKey,
        parts: [],
        width: scan.contentWidth,
        lastPatch: "",
        enhanced: false,
        renderedFloat: null,
        nativeIndent: null,
        masked: []
      };
      rebuildMetrics(state);
      states.set(p, state);
    } catch (error) {
      record.bailed.add(p);
      host.emitSkip(p, `threw while measuring: ${describeError(error)}`);
      return false;
    }
    return true;
  };
  return {
    domWidthEntriesFor,
    prepare,
    rebuildMetrics,
    warmDomWidths
  };
}

// src/dom/segments.ts
var AUTHOR_NO_BREAK_SPACE = /[\u00A0\u202F]/;
var DASH_JUNCTION = /[\u002D\u2010-\u2015]/;
var LIGA_EXPLICITLY_OFF = /["']liga["']\s*(?:0|off)\b/i;
var CLIG_EXPLICITLY_OFF = /["']clig["']\s*(?:0|off)\b/i;
function trackingFeatureSettings(spec, active) {
  if (!active || spec.letterSpacingPx !== 0) return void 0;
  if (spec.ligatures === "none" || /\bno-common-ligatures\b/.test(spec.ligatures)) {
    return void 0;
  }
  const settings = spec.featureSettings === "normal" ? [] : [spec.featureSettings];
  if (!LIGA_EXPLICITLY_OFF.test(spec.featureSettings)) settings.push('"liga" 1');
  if (!CLIG_EXPLICITLY_OFF.test(spec.featureSettings)) settings.push('"clig" 1');
  return settings.length > 0 ? settings.join(", ") : void 0;
}
function shedCapacity(advance) {
  return Math.max(0, advance - Math.max(0.5, advance * 0.1));
}
function terminalClusterAdvance(segment, endBox, scan) {
  if (endBox === void 0) return 0;
  const _terminalSplit2 = terminalSplit(segment.text),
    terminal = _terminalSplit2.terminal;
  if (terminal === void 0 || terminal === " ") return 0;
  const spec = scan.specs[scan.runs[endBox.run].spec];
  return Math.max(0, measureWidth(terminal, spec) *
  // A condensed line renders narrower than the spec measures.
  Math.min(1, segment.fontStretchPct / 100) + segment.resolvedLetterSpacingPx);
}
var KERN_EPSILON = 0.01;
function terminalPairKern(segment, endBox, scan) {
  if (endBox === void 0) return void 0;
  if (segment.cjk === true) return void 0;
  const spec = scan.specs[scan.runs[endBox.run].spec];
  if (spec.textTransform !== "none") return void 0;
  const _terminalSplit3 = terminalSplit(segment.text),
    prev = _terminalSplit3.prev,
    terminal = _terminalSplit3.terminal;
  if (prev === void 0 || terminal === void 0) return void 0;
  const kern = measureWidth(prev + terminal, spec) - measureWidth(prev, spec) - measureWidth(terminal, spec);
  return Math.abs(kern) > KERN_EPSILON ? kern : void 0;
}
function hasObjectJunction(segments, first) {
  for (let i = first; i < segments.length; i++) {
    if (segments[i].atomic !== void 0) return true;
  }
  return false;
}
function tightenLine(segments, first, px2) {
  if (px2 <= 1e-3) return 0;
  const countAt = index => Math.max(0, segments[index].adjustableSpaceCount - (index === first ? segments[index].edgeTrim.lead : 0));
  let remaining = px2;
  const spaces = segments.slice(first).reduce((sum, _segment, offset) => sum + countAt(first + offset), 0);
  const delta = spaces > 0 ? remaining / spaces : 0;
  for (let i = first; i < segments.length; i++) {
    const segment = segments[i];
    const count = countAt(i);
    if (count === 0) continue;
    const next = Math.max(segment.minimumWordSpacingPx, segment.wordSpacingPx - delta);
    remaining -= (segment.wordSpacingPx - next) * count;
    segment.wordSpacingPx = next;
  }
  if (remaining <= 1e-3) return px2;
  const charCounts = segments.slice(first).map(segment => segment.allowLetterCorrection ? Array.from(segment.text).filter(char => char.trim()).length : 0);
  const chars = charCounts.reduce((sum, count) => sum + count, 0);
  if (chars === 0) return px2 - remaining;
  const tracking = remaining / chars;
  for (let i = first; i < segments.length; i++) {
    const segment = segments[i];
    if (charCounts[i - first] === 0) continue;
    segment.resolvedLetterSpacingPx -= tracking;
    segment.letterSpacingPx = segment.resolvedLetterSpacingPx;
    if (countAt(i) > 0) {
      segment.wordSpacingPx += tracking;
      segment.minimumWordSpacingPx += tracking;
    }
  }
  return px2;
}
function buildRenderSegments(scan, runsMetrics, para, lines, lineOffset) {
  if (lineOffset === void 0) {
    lineOffset = 0;
  }
  const segments = [];
  let pendingJoint = "none";
  let pendingJointBesideFloat = false;
  let pendingJointVoid = false;
  const decorStartSeen = /* @__PURE__ */new Set();
  const lastSegForRun = /* @__PURE__ */new Map();
  let floatStyleEmitted = false;
  const nbspExcessByKey = /* @__PURE__ */new Map();
  const nbspExcessIn = (spec, runIndex) => {
    let excess = nbspExcessByKey.get(spec.key);
    if (excess === void 0) {
      const context2 = () => scan.runs[runIndex].text;
      excess = separatorWidthIn(spec, context2, "\xA0") - separatorWidthIn(spec, context2, " ");
      nbspExcessByKey.set(spec.key, excess);
    }
    return excess;
  };
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const besideFloat = lineOffset + lineIndex < (scan.floatIntrusion?.lines ?? 0);
    const letterCorrectionAllowed = scan.direction !== "rtl" && para.items.slice(line.start, line.end).some(item => item.type === ItemType.Box && (item.trackStretch > 0 || item.trackShrink > 0));
    const lineFirstSegment = segments.length;
    const raggedEnding = lineIndex === lines.length - 1 && line.glueRatio === 0;
    let floorOverflowPx = 0;
    const desired = (runIndex, flexOf) => {
      const metrics = runsMetrics[runIndex];
      const spec = scan.specs[scan.runs[runIndex].spec];
      const widthOffset = metrics.space.width - spaceWidthIn(spec, () => scan.runs[runIndex].text);
      const pool = flexOf ?? metrics.space;
      const flex = line.glueRatio >= 0 ? pool.stretch : pool.shrink;
      return spec.wordSpacingPx + widthOffset + line.glueRatio * flex;
    };
    let joint = pendingJoint;
    let jointFlat = pendingJoint === "space" && pendingJointBesideFloat;
    let jointVoid = pendingJointVoid;
    let first = true;
    let text = "";
    let run = -1;
    let trackY = 0;
    let trackZ = 0;
    let cjkY = 0;
    let cjkZ = 0;
    let hasCJK = false;
    let boxChars = 0;
    let adjustableSpaceCount = 0;
    let fixedSpaceBox = false;
    let weldFixedSeparator = false;
    let leadingSyntheticNbsp = false;
    let fixedBoundary;
    let afterObject = false;
    let flowExclusion;
    let rigidFlex = null;
    const flush = () => {
      if (run < 0 || text.length === 0) return;
      const floatedPrefix = flowExclusion === void 0 ? void 0 : text.slice(0, flowExclusion.end);
      const flowText = flowExclusion === void 0 ? text : text.slice(flowExclusion.end);
      const trackFlex = line.trackRatio >= 0 ? trackY : trackZ;
      const cjkFlex = line.glueRatio >= 0 ? cjkY : cjkZ;
      const extraPx = (trackFlex > 0 ? line.trackRatio * trackFlex : 0) + (cjkFlex > 0 ? line.glueRatio * cjkFlex : 0);
      const ls = boxChars > 0 && extraPx !== 0 ? extraPx / boxChars : 0;
      const lead = leadingCollapsibleSpaces(flowText);
      const trail = lead < flowText.length ? trailingCollapsibleSpaces(flowText) : 0;
      const spec = scan.specs[scan.runs[run].spec];
      const table = runsMetrics[run].expansionRatios;
      const key = Math.round(line.fontStretch * 1e3) / 1e3;
      const ratio = table?.get(key) ?? 1;
      const wordSpacing = fixedSpaceBox ? spec.wordSpacingPx : desired(run, rigidFlex ?? void 0);
      const spaceGlyphPx = spaceWidthIn(spec, () => scan.runs[run].text) * ratio;
      const spacePx = spaceGlyphPx + wordSpacing;
      const minimumWordSpacingPx = besideFloat && letterCorrectionAllowed ? Math.max(0, (spaceGlyphPx + spec.wordSpacingPx) * 4 / 5) - spaceGlyphPx - ls : Number.NEGATIVE_INFINITY;
      const renderedWordSpacingPx = fixedSpaceBox ? wordSpacing : Math.max(wordSpacing - ls, minimumWordSpacingPx);
      const unclampedWordSpacingPx = fixedSpaceBox ? wordSpacing : wordSpacing - ls;
      const correctionSpaceCount = Math.max(0, adjustableSpaceCount - (segments.length === lineFirstSegment ? lead : 0));
      floorOverflowPx += (renderedWordSpacingPx - unclampedWordSpacingPx) * correctionSpaceCount;
      const nbspExcessPx = leadingSyntheticNbsp && flowText.charCodeAt(0) === 160 ? nbspExcessIn(spec, run) * ratio : 0;
      const srcRun = scan.runs[run];
      let decorPx;
      let generatedWeldStart = false;
      const startEdgePx = srcRun.startEdge?.advancePx ?? srcRun.padStartPx;
      if (startEdgePx !== void 0 && !decorStartSeen.has(run)) {
        decorStartSeen.add(run);
        decorPx = startEdgePx;
        generatedWeldStart = srcRun.generatedStart !== void 0;
      }
      segments.push({
        text: flowText,
        floatedPrefix,
        floatedStyle: floatedPrefix !== void 0 && !floatStyleEmitted ? scan.floatIntrusion?.kind === "first-letter" ? scan.floatIntrusion.style : void 0 : void 0,
        floatedInnerStyle: floatedPrefix !== void 0 ? srcRun.floatInnerStyle : void 0,
        ancestors: srcRun.ancestors,
        wordSpacingPx: renderedWordSpacingPx,
        adjustableSpaceCount,
        minimumWordSpacingPx,
        allowLetterCorrection: !fixedSpaceBox,
        weldEnd: weldFixedSeparator,
        generatedWeldStart: generatedWeldStart ? true : void 0,
        letterSpacingPx: ls !== 0 ? spec.letterSpacingPx + ls : null,
        resolvedLetterSpacingPx: spec.letterSpacingPx + ls,
        fontFeatureSettings: trackingFeatureSettings(spec, ls !== 0 || besideFloat && letterCorrectionAllowed),
        isolateShaping: spec.variantPosition !== "normal",
        fontStretchPct: line.fontStretch,
        marginStartPx: (first ? -line.leftHang : 0) - nbspExcessPx,
        marginEndPx: 0,
        // the line's last segment is patched after the loop
        edgeTrim: {
          lead,
          trail,
          modelPx: (lead + trail) * spacePx
        },
        transformChangesLength: transformedText(flowText, spec).length !== flowText.length,
        decorPx,
        cjk: hasCJK,
        joint,
        jointFlat: jointFlat ? true : void 0,
        jointVoid: jointVoid ? true : void 0,
        marginStartOwner: first && line.leftHang > 0 ? srcRun.boxStartProtrusionOwner : void 0,
        // Assigned only to the line's actual final segment below. Pointing
        // multiple entries at one clone would make correction measurement
        // count the clone's single margin more than once.
        marginEndOwner: void 0
      });
      if (floatedPrefix !== void 0) floatStyleEmitted = true;
      if ((srcRun.endEdge?.advancePx ?? srcRun.padEndPx) !== void 0) {
        lastSegForRun.set(run, segments.length - 1);
      }
      if (flowText.length > 0) {
        joint = "none";
        jointFlat = false;
        jointVoid = false;
        first = false;
      }
      text = "";
      run = -1;
      trackY = 0;
      trackZ = 0;
      cjkY = 0;
      cjkZ = 0;
      hasCJK = false;
      boxChars = 0;
      adjustableSpaceCount = 0;
      fixedSpaceBox = false;
      weldFixedSeparator = false;
      leadingSyntheticNbsp = false;
      flowExclusion = void 0;
    };
    const fixedSegmentWidth = /* @__PURE__ */new Map();
    let trailingHangGlue = -1;
    const lineEndBox = breakEndBox(para, line.end);
    if (lineEndBox !== void 0 && (lineEndBox.hangStretch > 0 || lineEndBox.hangShrink > 0)) {
      let i = line.end - 1;
      let candidate = para.items[i];
      while (i >= line.start && candidate?.type === ItemType.Box && candidate.otherSpace === true) {
        i--;
        candidate = para.items[i];
      }
      if (i >= line.start && candidate?.type === ItemType.Glue && candidate.fixedSpaceInitial === true) {
        trailingHangGlue = i;
      }
    }
    for (let i = line.start; i < line.end; i++) {
      const it = para.items[i];
      if (it.type === ItemType.Box && it.atomic === true) {
        flush();
        fixedBoundary = void 0;
        const srcRun = scan.runs[it.run];
        let decorPx;
        const startEdgePx = srcRun.startEdge?.advancePx ?? srcRun.padStartPx;
        if (startEdgePx !== void 0 && !decorStartSeen.has(it.run)) {
          decorStartSeen.add(it.run);
          decorPx = startEdgePx;
        }
        segments.push({
          text: "",
          atomic: {
            box: srcRun.atomic,
            // A weld at the line's own edge would forbid the break the joint
            // there depends on. The trailing one is withdrawn below, once
            // the line's last segment is known.
            weldStart: !first,
            weldEnd: true
          },
          ancestors: srcRun.ancestors,
          wordSpacingPx: 0,
          adjustableSpaceCount: 0,
          minimumWordSpacingPx: 0,
          // Nothing about an object is spacing, so no correction may be
          // distributed onto it; the line's text carries the whole
          // adjustment. Its own measured rect still enters the line extent,
          // which is what makes a drifted object width self-correcting.
          allowLetterCorrection: false,
          letterSpacingPx: null,
          resolvedLetterSpacingPx: 0,
          fontStretchPct: 100,
          // An object protrudes nothing of its own, but a painted inline
          // opening on it still hangs its decoration into the margin.
          marginStartPx: first ? -line.leftHang : 0,
          marginStartOwner: first && line.leftHang > 0 ? srcRun.boxStartProtrusionOwner : void 0,
          marginEndPx: 0,
          // the line's last segment is patched after the loop
          edgeTrim: {
            lead: 0,
            trail: 0,
            modelPx: 0
          },
          decorPx,
          joint,
          jointFlat: jointFlat ? true : void 0,
          jointVoid: jointVoid ? true : void 0,
          marginEndOwner: void 0
        });
        if ((srcRun.endEdge?.advancePx ?? srcRun.padEndPx) !== void 0) {
          lastSegForRun.set(it.run, segments.length - 1);
        }
        joint = "none";
        jointFlat = false;
        jointVoid = false;
        first = false;
        afterObject = true;
        continue;
      }
      if (it.type === ItemType.Box) {
        afterObject = false;
        const ownFixedSegment = it.otherSpace === true || AUTHOR_NO_BREAK_SPACE.test(it.text);
        const firstChar = it.text[0] ?? "";
        if (fixedBoundary !== void 0) {
          const junction = fixedBoundary.lastChar + firstChar;
          if (fixedBoundary.run !== it.run && DASH_JUNCTION.test(junction)) {
            text = "\u2060";
          }
          fixedBoundary = void 0;
        }
        if (ownFixedSegment && run !== -1) {
          const junction = text.slice(-1) + firstChar;
          const protect = run !== it.run && DASH_JUNCTION.test(junction);
          flush();
          if (protect) text = "\u2060";
        }
        if (run !== -1 && run !== it.run) {
          const junction = text.slice(-1) + firstChar;
          const risky = DASH_JUNCTION.test(junction);
          flush();
          text = risky ? "\u2060" : "";
        }
        run = it.run;
        const textOffset = text.length;
        text += it.text;
        if (it.flowExclusion !== void 0) {
          const shifted = {
            start: textOffset + it.flowExclusion.start,
            end: textOffset + it.flowExclusion.end
          };
          if (flowExclusion === void 0) flowExclusion = shifted;else flowExclusion.end = shifted.end;
        }
        trackY += it.trackStretch;
        trackZ += it.trackShrink;
        boxChars += it.flowChars ?? Array.from(it.text).length;
        if (!hasCJK && CJK_CHAR.test(it.text)) hasCJK = true;
        if (ownFixedSegment) {
          const boundary = {
            lastChar: it.text.slice(-1),
            run: it.run
          };
          fixedSpaceBox = true;
          weldFixedSeparator = it.otherSpace === true;
          flush();
          if (it.otherSpace === true) fixedSegmentWidth.set(segments.length - 1, it.width);
          fixedBoundary = boundary;
        }
      } else if (it.type === ItemType.Glue) {
        fixedBoundary = void 0;
        if (i === trailingHangGlue) {
          flush();
          run = it.run;
          text = " ";
          fixedSpaceBox = true;
          flush();
          fixedSegmentWidth.set(segments.length - 1, it.width);
          continue;
        }
        if (it.cjk === true) {
          cjkY += it.stretch;
          cjkZ += it.shrink;
          continue;
        }
        const glueSpec = scan.specs[scan.runs[it.run].spec];
        if (glueSpec.variantPosition !== "normal") {
          flush();
          run = it.run;
          text = " ";
          adjustableSpaceCount = 1;
          flush();
          continue;
        }
        if (it.rigid === true && line.glueRatio < 0) {
          flush();
          run = it.run;
          text = "\xA0";
          adjustableSpaceCount = 1;
          leadingSyntheticNbsp = true;
          rigidFlex = {
            stretch: it.stretch,
            shrink: it.shrink
          };
          flush();
          rigidFlex = null;
          continue;
        }
        if (!afterObject && (run === -1 || run === it.run)) {
          run = it.run;
          text += " ";
          adjustableSpaceCount++;
        } else {
          flush();
          run = it.run;
          text = "\xA0";
          adjustableSpaceCount = 1;
          leadingSyntheticNbsp = true;
          afterObject = false;
        }
      }
    }
    flush();
    const last = segments[segments.length - 1];
    if (last !== void 0) {
      last.weldEnd = false;
      if (last.atomic !== void 0) last.atomic.weldEnd = false;
      let endBox;
      for (let i = line.end - 1; i >= line.start; i--) {
        const candidate = para.items[i];
        if (candidate.type === ItemType.Box) {
          endBox = candidate;
          break;
        }
      }
      const requestedHang = besideFloat && !line.hyphenated && endBox?.paintedEnd !== true && line.rightHang > 0 && endWithoutCollapsibleSpaces(last.text) > 0 ? line.rightHang : 0;
      let padCapacity = 0;
      let unshed = 0;
      if (requestedHang > 0) {
        if (fixedSegmentWidth.has(segments.length - 1)) {
          let remaining = requestedHang;
          for (let index = segments.length - 1; remaining > 1e-3 && fixedSegmentWidth.has(index); index--) {
            const hung = segments[index];
            const width = fixedSegmentWidth.get(index);
            const share = Math.min(remaining, width);
            hung.physicalEndHangPx = share;
            remaining -= share;
            if (index === segments.length - 1) padCapacity = width - share;
            if (leadingCollapsibleSpaces(hung.text) === hung.text.length) {
              hung.edgeTrim = {
                ...hung.edgeTrim,
                modelPx: Math.max(0, hung.edgeTrim.modelPx - share)
              };
            }
          }
          unshed = remaining;
        } else {
          const capacity = shedCapacity(terminalClusterAdvance(last, endBox, scan));
          const share = Math.min(requestedHang, capacity);
          if (share > 0) last.physicalEndHangPx = share;
          unshed = requestedHang - share;
          padCapacity = capacity - share;
        }
      } else if (besideFloat && !line.hyphenated && endBox?.paintedEnd !== true) {
        padCapacity = shedCapacity(terminalClusterAdvance(last, endBox, scan));
      }
      const physicalEndHang = requestedHang - unshed;
      const hyphenEndHang = besideFloat && line.hyphenated && line.rightHang > 0 && endBox !== void 0 ? line.rightHang : 0;
      if (hyphenEndHang > 0) {
        last.hyphenEndHangPx = hyphenEndHang;
        const endSpec = scan.specs[scan.runs[endBox.run].spec];
        last.hyphenLetterSpacingPx = endSpec.letterSpacingPx - hyphenEndHang;
      }
      if (besideFloat) {
        const endSpec = endBox === void 0 ? void 0 : scan.specs[scan.runs[endBox.run].spec];
        const capacity = line.hyphenated && endBox !== void 0 && endSpec !== void 0 ? shedCapacity(runsMetrics[endBox.run].hyphenWidth + endSpec.letterSpacingPx) - hyphenEndHang : padCapacity;
        const pad = Math.max(0, Math.min(WRAP_SAFETY_PAD_PX, capacity));
        if (pad > 1e-3) {
          last.physicalPadPx = pad;
          if (line.hyphenated && endSpec !== void 0) {
            last.hyphenLetterSpacingPx = (last.hyphenLetterSpacingPx ?? endSpec.letterSpacingPx) - pad;
          }
        }
        tightenLine(segments, lineFirstSegment, floorOverflowPx + unshed + (WRAP_SAFETY_PAD_PX - pad));
      }
      if (!raggedEnding && hasObjectJunction(segments, lineFirstSegment)) {
        const slack = tightenLine(segments, lineFirstSegment, WRAP_SAFETY_PAD_PX);
        if (slack > 1e-3) last.objectTightenPx = slack;
      }
      if (hangCarrierShed(last) > 0) {
        const kern = terminalPairKern(last, endBox, scan);
        if (kern !== void 0) last.terminalKernPx = kern;
      }
      last.marginEndPx = -(line.rightHang - unshed - physicalEndHang - hyphenEndHang + line.overflowPx + WRAP_SAFETY_PAD_PX);
      last.rightHangPx = line.rightHang - unshed;
      last.overflowPx = line.overflowPx;
      if (endBox?.type === ItemType.Box && endBox.paintedEnd === true) {
        last.marginEndOwner = scan.runs[endBox.run]?.boxEndProtrusionOwner;
      }
    }
    const brk = para.items[line.end];
    pendingJointBesideFloat = lineOffset + lineIndex < (scan.floatIntrusion?.lines ?? 0);
    pendingJointVoid = false;
    if (line.hyphenated) pendingJoint = "hyphen";else if (brk !== void 0 && brk.type === ItemType.Glue) pendingJoint = "space";else if (brk !== void 0 && brk.type === ItemType.Penalty && brk.width === 0 && !brk.flagged) {
      if (brk.atomic === true) {
        pendingJoint = "space";
        pendingJointVoid = true;
      } else {
        pendingJoint = brk.cjk === true || brk.fixedSpace === true ? "wbr" : "space";
      }
    } else pendingJoint = "wbr";
  }
  for (const _ref24 of lastSegForRun) {
    const runIndex = _ref24[0];
    const segIndex = _ref24[1];
    const seg = segments[segIndex];
    const run = scan.runs[runIndex];
    const endEdge = run.endEdge;
    seg.decorPx = (seg.decorPx ?? 0) + (endEdge?.advancePx ?? run.padEndPx);
    seg.decorEndOwner = run.endEdgeOwner ?? run.padEndOwner;
    if (run.generatedEnd !== void 0) seg.generatedWeldEnd = true;
  }
  return segments;
}

// src/dom/patch.ts
var MIN_FLOAT_LINE_WIDTH_PX = 1;
function createPatchPass(host) {
  const lineWidthsFor = state => {
    const indentPx = firstLineIndentPx(state);
    const intrusion = state.scan.floatIntrusion;
    const varyingLines = Math.max(indentPx !== 0 ? 1 : 0, intrusion?.lines ?? 0);
    if (varyingLines === 0) return state.width;
    const widths = Array.from({
      length: varyingLines + 1
    }, (_, line) => state.width - (line === 0 ? indentPx : 0) - (intrusion !== null && line < intrusion.lines ? intrusion.inlineSize : 0));
    if (intrusion !== null && widths.slice(0, intrusion.lines).some(width => width < MIN_FLOAT_LINE_WIDTH_PX)) {
      return null;
    }
    return widths.map(width => Math.max(0, width));
  };
  const layoutParts = (state, widths, paragraphMinWidth) => {
    const _host$layoutOptions4 = host.layoutOptions(),
      breakOpts = _host$layoutOptions4.breakOpts,
      buildOpts = _host$layoutOptions4.buildOpts,
      lastLineMinWidth = _host$layoutOptions4.lastLineMinWidth;
    const paragraphBreakOpts = paragraphMinWidth === lastLineMinWidth ? breakOpts : {
      ...breakOpts,
      lastLineMinWidth: paragraphMinWidth
    };
    const paragraphBuildOpts = paragraphMinWidth === lastLineMinWidth ? buildOpts : {
      ...buildOpts,
      lastLineMinWidth: paragraphMinWidth
    };
    const widthAt = line => typeof widths === "number" ? widths : widths[Math.min(line, widths.length - 1)] ?? 0;
    const widthsFrom = line => typeof widths === "number" ? widths : widths.slice(Math.min(line, widths.length - 1));
    const rendered = [];
    const lineWidths = [];
    const fingerprintParts = [];
    const priorLastLineFit = {
      sum: 0,
      count: 0
    };
    let visualLineCount = 0;
    let modeledLineCount = 0;
    let onlyLine = null;
    let onlyResult = null;
    for (let partIndex = 0; partIndex < state.parts.length; partIndex++) {
      const part = state.parts[partIndex];
      const partLineOffset = visualLineCount;
      const partWidths = widthsFrom(partLineOffset);
      const isFinal = part.breakAfter === null;
      let lines = [];
      if (part.para.firstBoxAfter[0] !== part.para.items.length) {
        const partBuildOpts = !isFinal && paragraphBuildOpts.lastLineFit !== 0 ? {
          ...paragraphBuildOpts,
          lastLineFit: 0
        } : paragraphBuildOpts;
        const result = breakParagraph(part.para, partWidths, paragraphBreakOpts);
        lines = layoutLines(part.para, result, partWidths, partBuildOpts, isFinal ? priorLastLineFit : void 0);
        rendered.push(...buildRenderSegments(state.scan, state.runsMetrics, part.para, lines, partLineOffset));
        for (const line of lines) lineWidths.push(line.width);
        visualLineCount += lines.length;
        modeledLineCount += lines.length;
        if (modeledLineCount === 1) {
          onlyLine = lines[0] ?? null;
          onlyResult = result;
        } else {
          onlyLine = null;
          onlyResult = null;
        }
        for (let i = 0; i + 1 < lines.length; i++) {
          priorLastLineFit.sum += lines[i].glueRatio;
          priorLastLineFit.count++;
        }
        fingerprintParts.push(`${partIndex}:${result.breakpoints.join(",")}:${result.endingMinWidth ?? ""}:${lines.map(line => `${line.glueRatio.toFixed(4)}:${line.trackRatio.toFixed(4)}:${line.fontStretch}`).join(",")}`);
      } else {
        fingerprintParts.push(`${partIndex}:empty`);
      }
      if (part.breakAfter !== null) {
        if (lines.length === 0) {
          lineWidths.push(widthAt(visualLineCount));
          visualLineCount++;
        }
        rendered.push({
          kind: "hard-break",
          source: part.breakAfter.source,
          ancestors: part.breakAfter.ancestors
        });
      }
    }
    return {
      rendered,
      lineWidths,
      fingerprint: fingerprintParts.join("|"),
      visualLineCount,
      onlyLine,
      onlyResult
    };
  };
  const oneLineStaysNative = (layout, paragraphMinWidth) => {
    const onlyLine = layout.onlyLine,
      onlyResult = layout.onlyResult;
    if (onlyLine === null || onlyResult === null) return false;
    const adjusted = Math.abs(onlyLine.glueRatio) > 1e-9 || Math.abs(onlyLine.trackRatio) > 1e-9 || Math.abs(onlyLine.fontStretch - 100) > 1e-9;
    const reachedFullWidth = paragraphMinWidth === 1 && (onlyResult.endingMinWidth ?? paragraphMinWidth) >= 1 - 1e-9 && onlyLine.overfull !== true && adjusted;
    return !reachedFullWidth;
  };
  const patchOne = p => {
    const state = host.ownedState(p);
    if (state === void 0) return {
      changed: false,
      pending: null
    };
    const widths = lineWidthsFor(state);
    if (widths === null) {
      host.queues.drop(p);
      return {
        changed: restoreManagedOutput(p, state),
        pending: null
      };
    }
    const paragraphMinWidth = state.scan.justifyAll ? 1 : host.layoutOptions().lastLineMinWidth;
    const layout = layoutParts(state, widths, paragraphMinWidth);
    if (layout.visualLineCount === 1 && state.scan.hardBreaks.length === 0 && oneLineStaysNative(layout, paragraphMinWidth)) {
      host.queues.drop(p);
      const nativeIndent = nativeHangIndent(state, layout.onlyLine?.leftHang ?? 0);
      if (!state.enhanced && nativeIndent === state.nativeIndent) {
        return {
          changed: false,
          pending: null
        };
      }
      let changed = restoreManagedOutput(p, state);
      if (applyNativeHang(p, state, nativeIndent)) changed = true;
      return {
        changed,
        pending: null
      };
    }
    if (layout.fingerprint === state.lastPatch) return {
      changed: false,
      pending: null
    };
    state.lastPatch = layout.fingerprint;
    clearNativeHang(p, state);
    if (!state.enhanced) beginEnhancement(p, state);
    if (state.scan.pinIntrinsicSize && state.scan.lineHeightPx !== null) {
      const height = Math.round(layout.visualLineCount * state.scan.lineHeightPx * 1e3) / 1e3;
      maskAuthorStyle(p, state, "contain-intrinsic-block-size", `auto ${height}px`);
    }
    host.queues.pendingCorrections.delete(p);
    host.queues.hiddenCorrections.delete(p);
    const elementFloat = state.scan.floatIntrusion?.kind === "element" ? state.scan.floatIntrusion : void 0;
    const pending = writeParagraph(p, layout.rendered, layout.lineWidths, state.width, state.scan.floatIntrusion?.lines ?? 0, elementFloat, state.renderedFloat, state.scan.generated);
    state.renderedFloat = pending.renderedFloat;
    return {
      changed: true,
      pending
    };
  };
  return {
    lineWidthsFor,
    layoutParts,
    oneLineStaysNative,
    patchOne
  };
}

// src/dom/reread.ts
function styleKeyNow(p) {
  const style = getComputedStyle(p);
  return `${paragraphStyleKey(style)} ${style.textIndent}`;
}
function suppressTransitions(targets) {
  for (const p of targets) p.classList.add(NO_TRANSITION_CLASS);
  return () => {
    for (const p of targets) {
      p.classList.remove(NO_TRANSITION_CLASS);
      if (p.classList.length === 0 && p.getAttribute("class") === "") {
        p.removeAttribute("class");
      }
    }
  };
}
function suppressAutosizingForScan(paragraphs) {
  const saved = [];
  const seen = /* @__PURE__ */new WeakSet();
  const disable = el => {
    if (seen.has(el)) return;
    seen.add(el);
    saved.push({
      el,
      style: el.getAttribute("style")
    });
    disableTextAutosizing(el);
  };
  for (const p of paragraphs) {
    if (states.get(p)?.enhanced) continue;
    disable(p);
    for (const el of p.querySelectorAll("*")) {
      if (el instanceof HTMLElement) disable(el);
    }
  }
  return () => {
    for (const _ref25 of saved) {
      const el = _ref25.el;
      const style = _ref25.style;
      restoreStyleAttribute(el, style);
    }
  };
}
function createAdoptionRecord() {
  return {
    scanned: /* @__PURE__ */new Map(),
    bailed: /* @__PURE__ */new WeakSet(),
    decidedStyleKey: /* @__PURE__ */new WeakMap(),
    floatDecisions: /* @__PURE__ */new WeakSet(),
    carriedStyleAttr: /* @__PURE__ */new WeakMap()
  };
}
function createRereadPass(record, host) {
  const authorStyleKeys = targets => {
    const undo = [];
    for (const p of targets) {
      const lifting = (host.ownedState(p)?.masked ?? []).filter(
      // Not ours any more: the author (or a script, or the inspector) has
      // written this property since, so what computes IS their current value.
      mask => mask.inKey && p.style.getPropertyValue(mask.property) === mask.ours);
      if (lifting.length === 0) continue;
      for (const _ref26 of lifting) {
        const property = _ref26.property;
        const ours = _ref26.ours;
        const oursPriority = _ref26.oursPriority;
        const author = _ref26.author;
        const authorPriority = _ref26.authorPriority;
        if (author === "") p.style.removeProperty(property);else p.style.setProperty(property, author, authorPriority);
        undo.push(() => p.style.setProperty(property, ours, oursPriority));
      }
    }
    const keys = new Map(targets.map(p => [p, styleKeyNow(p)]));
    for (const restoreMask of undo) restoreMask();
    return keys;
  };
  const reread = considered => {
    const lifted = considered.filter(p => (host.ownedState(p)?.masked ?? []).some(mask => mask.inKey));
    const restoreLifted = suppressTransitions(lifted);
    let current;
    try {
      current = authorStyleKeys(considered);
    } finally {
      restoreLifted();
    }
    const atomicChanged = new Set(considered.filter(p => {
      const state = host.ownedState(p);
      return state !== void 0 && refreshAtomicWidths(state.scan);
    }));
    const stale = considered.filter(p => record.floatDecisions.has(p) || atomicChanged.has(p) || record.decidedStyleKey.get(p) !== current.get(p));
    if (stale.length === 0) return [];
    const restoreStale = suppressTransitions(stale);
    try {
      return readapt(stale);
    } finally {
      restoreStale();
    }
  };
  const readapt = stale => {
    const wasEnhanced = /* @__PURE__ */new Set();
    for (const p of stale) {
      const state = host.ownedState(p);
      if (state !== void 0) {
        if (state.enhanced) wasEnhanced.add(p);
        const saved = state.originalStyleAttr;
        unmaskAuthorStyle(p, state);
        if (authorRewroteStyleAttribute(p, saved)) {
          record.carriedStyleAttr.delete(p);
        } else {
          restoreStyleAttribute(p, saved);
          record.carriedStyleAttr.set(p, saved);
        }
        restoreManagedOutput(p, state, "keep");
        states.delete(p);
        host.queues.drop(p);
      }
      record.bailed.delete(p);
      record.floatDecisions.delete(p);
      record.scanned.delete(p);
    }
    host.adopt(stale);
    for (const p of stale) {
      record.carriedStyleAttr.delete(p);
      host.resyncObservation(p);
      if (host.ownedState(p) === void 0 && wasEnhanced.has(p)) host.emitRelayout(p);
    }
    host.reprobeBaselines();
    return stale;
  };
  return {
    reread
  };
}

// src/options.ts
var LAYOUT_OPTION_KEYS = ["hangingPunctuation", "protrusion", "expansion", "tracking", "spacing", "lastLineMinWidth", "lastLineFit"];
var DEFAULT_EXPANSION = {
  max: 0.02,
  shrink: 0.02,
  step: 5e-3
};
var DEFAULT_SPACING = {
  stretch: 0.5,
  shrink: 1 / 3,
  pull: 0.7,
  boundaryShrink: 0
};
var DEFAULT_TRACKING = {
  max: 0.03,
  shrink: 0.03
};
var DEFAULT_LAST_LINE_MIN_WIDTH = 0.33;
var DEFAULT_LAST_LINE_FIT = 0;
var DEFAULT_HANGING_PUNCTUATION = "line-end-only";
var layoutDefaults = Object.freeze({
  hangingPunctuation: DEFAULT_HANGING_PUNCTUATION,
  protrusion: true,
  expansion: DEFAULT_EXPANSION,
  tracking: DEFAULT_TRACKING,
  spacing: DEFAULT_SPACING,
  lastLineMinWidth: DEFAULT_LAST_LINE_MIN_WIDTH,
  lastLineFit: DEFAULT_LAST_LINE_FIT
  // `satisfies`, not an annotation: this keeps the exact shapes, so
  // `layoutDefaults.expansion.max` reads as a number instead of forcing callers
  // to narrow away the `false` and `true` the option types also permit.
});
function withOverrides(defaults, overrides) {
  const merged = {
    ...defaults
  };
  for (const key of Object.keys(defaults)) {
    const value = overrides[key];
    if (value !== void 0) merged[key] = value;
  }
  return merged;
}
function resolveOptions(options) {
  const breakOpts = withOverrides(defaultBreakOptions, options);
  const lastLineMinWidth = Math.max(0, Math.min(1, options.lastLineMinWidth ?? DEFAULT_LAST_LINE_MIN_WIDTH));
  breakOpts.lastLineMinWidth = lastLineMinWidth;
  const protrusionUser = typeof options.protrusion === "object" ? Object.fromEntries(Object.entries(options.protrusion).map(_ref27 => {
    let character = _ref27[0],
      codes = _ref27[1];
    return [character, {
      ...codes
    }];
  })) : null;
  const requestedHang = options.hangingPunctuation;
  const isHangObject = typeof requestedHang === "object" && requestedHang !== null;
  const hangObject = isHangObject ? requestedHang : null;
  const requestedEdges = isHangObject ? requestedHang.edges : requestedHang;
  const hangMode = requestedEdges === void 0 || requestedEdges === true ? DEFAULT_HANGING_PUNCTUATION : normalizeHangingPunctuation(requestedEdges);
  const hangChars = hangObject?.characters === void 0 ? hangingCharacters : {
    start: hangObject.characters.start ?? hangingCharacters.start,
    end: hangObject.characters.end ?? hangingCharacters.end
  };
  const protrusionModel = options.protrusion !== false;
  const hanging = hangMode !== "none";
  const measuredProtrusion = options.protrusion === void 0 || options.protrusion === true;
  const composed = !protrusionModel && !hanging ? null : composeProtrusion(protrusionModel ? latinProtrusion : {}, protrusionUser, hangMode, hangChars);
  const protrusion = composed === null ? false : composed.rest;
  const protrusionFirst = composed !== null && composed.first !== composed.rest ? composed.first : void 0;
  const protrusionCredit = composed === null ? void 0 : composed.credit;
  const expansion = options.expansion === false ? false : withOverrides(DEFAULT_EXPANSION, options.expansion ?? {});
  const spacing = withOverrides(DEFAULT_SPACING, options.spacing ?? {});
  const tracking = options.tracking === false ? false : options.tracking === true || options.tracking === void 0 ? DEFAULT_TRACKING : withOverrides(DEFAULT_TRACKING, options.tracking);
  let hyphenate = options.hyphenate;
  if (hyphenate !== void 0) {
    const inner = hyphenate;
    const cache3 = /* @__PURE__ */new Map();
    hyphenate = word => {
      let pieces = cache3.get(word);
      if (pieces === void 0) {
        pieces = inner(word);
        cache3.set(word, pieces);
      }
      return pieces;
    };
  }
  return {
    breakOpts,
    // NOTE: JustifyOptions.protrusion/tracking are wider than BuildOptions',
    // so withOverrides(defaultBuildOptions, options) does NOT typecheck —
    // keep these explicit.
    buildOpts: {
      ...defaultBuildOptions,
      hyphenate,
      lastLineFit: Math.max(0, Math.min(1, options.lastLineFit ?? DEFAULT_LAST_LINE_FIT)),
      lastLineMinWidth,
      hyphenPenalty: options.hyphenPenalty ?? defaultBuildOptions.hyphenPenalty,
      exHyphenPenalty: options.exHyphenPenalty ?? defaultBuildOptions.exHyphenPenalty,
      protrusion,
      protrusionFirst,
      protrusionCredit,
      expansion,
      tracking,
      boundaryShrink: spacing.boundaryShrink
    },
    lastLineMinWidth,
    expansion,
    spacing,
    protrusionCtx: {
      enabled: composed !== null,
      model: protrusionModel,
      measured: measuredProtrusion,
      user: protrusionUser,
      hang: hangMode,
      characters: hangChars
    },
    hyphenate
  };
}

// src/index.ts
function noopController() {
  return {
    ready: Promise.resolve(),
    refresh() {},
    rescan: () => [],
    applyLayoutOptions() {},
    destroy() {},
    paragraphs: [],
    managed: []
  };
}
function justify(targets, options) {
  if (options === void 0) {
    options = {};
  }
  if (typeof document === "undefined" || typeof window === "undefined") {
    return noopController();
  }
  const paragraphs = [];
  for (const el of targets instanceof Element ? [targets] : targets) {
    if (el instanceof HTMLElement) paragraphs.push(el);
  }
  const owner = /* @__PURE__ */Symbol("justif-controller");
  const record = createAdoptionRecord();
  const bailed = record.bailed,
    decidedStyleKey = record.decidedStyleKey,
    floatDecisions = record.floatDecisions,
    scanned = record.scanned;
  const owned = new Set(paragraphs);
  let destroyed = false;
  const initialResolution = resolveOptions(options);
  const hyphenate = initialResolution.hyphenate;
  let breakOpts = initialResolution.breakOpts,
    buildOpts = initialResolution.buildOpts,
    lastLineMinWidth = initialResolution.lastLineMinWidth,
    expansion = initialResolution.expansion,
    spacing = initialResolution.spacing,
    protrusionCtx = initialResolution.protrusionCtx;
  const fixedOptions = {
    ...options
  };
  for (const key of LAYOUT_OPTION_KEYS) delete fixedOptions[key];
  const pendingSkips = [];
  const scanParagraph = (p, batch) => {
    if (states.get(p)?.enhanced) return true;
    if (bailed.has(p)) return false;
    if (scanned.has(p)) return true;
    let scan;
    try {
      scan = readParagraph(p, batch);
      if (typeof scan !== "string") {
        if (scan.floatIntrusion?.kind === "element") floatDecisions.add(p);
        const bad = scan.specs.find(sp => !supportsSpec(sp));
        if (bad !== void 0) {
          scan = bad.stretch !== "100%" && bad.stretch !== "normal" ? `author font-stretch: ${bad.stretch} on a run` : "font-variation-settings on a run";
        }
      }
    } catch (error) {
      scan = `threw while scanning: ${describeError(error)}`;
    }
    decidedStyleKey.set(p, styleKeyNow(p));
    if (typeof scan === "string") {
      if (/float|shape-outside/i.test(scan)) floatDecisions.add(p);
      bailed.add(p);
      pendingSkips.push({
        p,
        reason: scan
      });
      return false;
    }
    scanned.set(p, scan);
    return true;
  };
  const safePatch = p => {
    try {
      const outcome = patchOne(p);
      floats.rebind(p, ownedState(p));
      return outcome;
    } catch (error) {
      const outcome = {
        changed: bailToNative(p, `threw while rendering: ${describeError(error)}`),
        pending: null
      };
      floats.rebind(p, ownedState(p));
      return outcome;
    }
  };
  const emitSkip = (p, reason) => {
    try {
      options.onSkip?.(p, reason);
    } catch (err) {
      console.error("justif: onSkip callback threw", err);
    }
  };
  const emitRelayout = p => {
    try {
      options.onRelayout?.(p);
    } catch (err) {
      console.error("justif: onRelayout callback threw", err);
    }
  };
  const ownedState = p => {
    const state = states.get(p);
    return state !== void 0 && state.owner === owner ? state : void 0;
  };
  const queues = createDrainQueues();
  const bailToNative = (p, reason) => {
    const changed = states.get(p)?.enhanced === true;
    restore(p);
    bailed.add(p);
    emitSkip(p, reason);
    return changed;
  };
  const commit = scannable => {
    warmDomWidths(domWidthEntriesFor(scannable));
    const batch = [];
    const changed = /* @__PURE__ */new Set();
    for (const p of scannable) {
      if (!prepare(p)) continue;
      const outcome = safePatch(p);
      if (outcome.pending !== null) batch.push({
        p,
        pending: outcome.pending
      });
      if (outcome.changed) changed.add(p);
    }
    flushPatches(batch, changed);
    for (const p of changed) emitRelayout(p);
  };
  let fontProbes = [];
  let fontsConverged = false;
  const remeasureAll = function (floatGeometryFresh, fontsStale) {
    if (floatGeometryFresh === void 0) {
      floatGeometryFresh = false;
    }
    if (fontsStale === void 0) {
      fontsStale = true;
    }
    if (destroyed) return;
    for (const p of paragraphs) {
      const state = ownedState(p);
      if (state !== void 0) refreshAtomicWidths(state.scan);
    }
    if (!floatGeometryFresh) floats.refreshIntrusions();
    if (fontsStale) {
      clearMeasureCache();
      clearCalibrationCache();
      clearOpticalCache();
      clearComposedProtrusionCache();
      reprobeBaselines(fontProbes);
    }
    const mine = paragraphs.filter(p => ownedState(p) !== void 0);
    const widths = new Map(mine.map(p => [p, contentWidthOf(p)]));
    warmDomWidths(mine.map(p => states.get(p)));
    const batch = [];
    const changed = /* @__PURE__ */new Set();
    for (const p of mine) {
      const state = states.get(p);
      const width = widths.get(p);
      if (typeof width === "string") {
        queues.drop(p);
        if (bailToNative(p, width)) changed.add(p);
        continue;
      }
      rebuildMetrics(state);
      state.width = width;
      state.lastPatch = "";
      const outcome = safePatch(p);
      if (outcome.pending !== null) batch.push({
        p,
        pending: outcome.pending
      });
      if (outcome.changed) changed.add(p);
    }
    flushPatches(batch, changed);
    for (const p of changed) emitRelayout(p);
  };
  const _createMetricsPass = createMetricsPass(record, {
      layoutOptions: () => ({
        buildOpts,
        expansion,
        spacing,
        protrusionCtx
      }),
      owner,
      emitSkip: (p, reason) => emitSkip(p, reason)
    }),
    domWidthEntriesFor = _createMetricsPass.domWidthEntriesFor,
    prepare = _createMetricsPass.prepare,
    rebuildMetrics = _createMetricsPass.rebuildMetrics,
    warmDomWidths = _createMetricsPass.warmDomWidths;
  const _createPatchPass = createPatchPass({
      ownedState: p => ownedState(p),
      layoutOptions: () => ({
        breakOpts,
        buildOpts,
        lastLineMinWidth
      }),
      queues
    }),
    patchOne = _createPatchPass.patchOne;
  const drain = createDrain(queues, {
    destroyed: () => destroyed,
    paragraphs,
    ownedState: p => ownedState(p),
    safePatch: p => safePatch(p),
    emitRelayout: p => emitRelayout(p),
    flushPatches: batch => flushPatches(batch),
    suspendWidthObservation: p => observer?.suspend(p)
  });
  const floats = createFloatTracking({
    destroyed: () => destroyed,
    paragraphs,
    ownedState: p => ownedState(p),
    bailToNative: (p, reason) => bailToNative(p, reason),
    declineRestored: (p, reason) => {
      states.delete(p);
      floats.rebind(p);
      bailed.add(p);
      emitSkip(p, reason);
      emitRelayout(p);
    },
    emitRelayout: p => emitRelayout(p),
    queues,
    restartPendingOrder: () => drain.restartPendingOrder()
  });
  const _createRereadPass = createRereadPass(record, {
      ownedState: p => ownedState(p),
      adopt: targets2 => adopt(targets2),
      emitRelayout: p => emitRelayout(p),
      resyncObservation: p => {
        const state = ownedState(p);
        floats.rebind(p, state);
        if (state === void 0) {
          observer?.unobserve(p);
          drain.unobserve(p);
        } else {
          observer?.observe(p);
          drain.observe(p);
        }
      },
      reprobeBaselines: () => reprobeBaselines(fontProbes),
      queues
    }),
    reread = _createRereadPass.reread;
  const _createCorrectionPass = createCorrectionPass({
      ownedState: p => ownedState(p),
      bailToNative: (p, reason) => bailToNative(p, reason),
      emitRelayout: p => emitRelayout(p),
      safePatch: p => safePatch(p),
      rebuildMetrics: state => rebuildMetrics(state),
      seedNearViewport: batch => drain.seedNearViewport(batch),
      restartPendingOrder: () => drain.restartPendingOrder(),
      verifyElementFloats: batch => floats.verifyElementFloats(batch),
      queues,
      tracksViewport: drain.tracksViewport,
      viewportReady: () => drain.viewportReady()
    }),
    flushPatches = _createCorrectionPass.flushPatches;
  const leaveClipboardCleanup = options.cleanClipboard === false ? null : joinClipboardCleanup({
    *enhanced() {
      for (const p of paragraphs) {
        const state = ownedState(p);
        if (state !== void 0 && state.enhanced) yield [p, state.scan];
      }
    }
  });
  let observer = null;
  const onFontsLoading = () => {
    document.fonts.ready.then(() => {
      if (!destroyed) onFontsLoaded();
    }, () => {});
  };
  const onFontsLoaded = () => {
    const metricsChanged = probesChanged(fontProbes);
    let atomicChanged = false;
    for (const p of paragraphs) {
      const state = ownedState(p);
      if (state !== void 0 && refreshAtomicWidths(state.scan)) atomicChanged = true;
    }
    const floatChanged = metricsChanged ? floats.refreshNativeIntrusions() : floats.refreshIntrusions();
    if (metricsChanged || atomicChanged || floatChanged) remeasureAll(true);
  };
  const attachObservers = () => {
    for (const p of paragraphs) {
      if (ownedState(p) !== void 0) drain.observe(p);
    }
    if (options.observeResize !== false) {
      floats.attachObserver();
      observer = createWidthObserver(drain.onWidths);
      for (const p of paragraphs) {
        const state = ownedState(p);
        if (state !== void 0) {
          observer.observe(p);
          floats.rebind(p, state);
        }
      }
    }
    document.fonts.addEventListener("loadingdone", onFontsLoaded);
    document.fonts.addEventListener("loading", onFontsLoading);
  };
  const adopt = targets2 => {
    const restoreScanStyles = suppressAutosizingForScan(targets2);
    let scannable;
    const scanBatch = beginScanBatch(targets2.length);
    try {
      scannable = targets2.filter(p => scanParagraph(p, scanBatch));
    } finally {
      endScanBatch(scanBatch);
      restoreScanStyles();
    }
    for (const _ref28 of pendingSkips.splice(0)) {
      const p = _ref28.p;
      const reason = _ref28.reason;
      emitSkip(p, reason);
    }
    commit(scannable);
    fontProbes = collectFontProbes(paragraphs.flatMap(p => ownedState(p)?.scan ?? []), hyphenate !== void 0);
  };
  let ready;
  try {
    adopt(paragraphs);
    reprobeBaselines(fontProbes);
    attachObservers();
    if (fontProbes.length === 0) {
      fontsConverged = true;
      ready = Promise.resolve();
    } else {
      ready = Promise.all(fontProbes.map(f => document.fonts.load(f.font, f.sample + f.kernSample).catch(() => {}))).then(() => {
        fontsConverged = true;
        if (!destroyed) onFontsLoaded();
      });
    }
  } catch (error) {
    ready = Promise.reject(error instanceof Error ? error : new Error(describeError(error)));
  }
  ready.catch(() => {});
  return {
    ready,
    paragraphs,
    get managed() {
      return paragraphs.filter(p => {
        const state = ownedState(p);
        if (state === void 0) return false;
        return !state.enhanced || p.hasAttribute("data-justif");
      });
    },
    refresh() {
      floats.refreshNativeIntrusions();
      remeasureAll(true);
    },
    rescan(targets2) {
      if (destroyed) return [];
      const candidates = targets2 === void 0 ? paragraphs : [...targets2].filter(el => el instanceof HTMLElement && owned.has(el));
      const considered = candidates.filter(p => ownedState(p) !== void 0 || bailed.has(p));
      return reread(considered);
    },
    applyLayoutOptions(config) {
      if (destroyed) return;
      const resolved = resolveOptions({
        ...fixedOptions,
        ...config
      });
      resolved.buildOpts.hyphenate = hyphenate;
      breakOpts = resolved.breakOpts;
      buildOpts = resolved.buildOpts;
      lastLineMinWidth = resolved.lastLineMinWidth;
      expansion = resolved.expansion;
      spacing = resolved.spacing;
      protrusionCtx = resolved.protrusionCtx;
      floats.refreshNativeIntrusions();
      remeasureAll(true, false);
    },
    destroy() {
      destroyed = true;
      if (!fontsConverged) {
        clearMeasureCache();
        clearCalibrationCache();
        clearOpticalCache();
        clearComposedProtrusionCache();
      }
      drain.reset();
      leaveClipboardCleanup?.();
      document.fonts.removeEventListener("loadingdone", onFontsLoaded);
      document.fonts.removeEventListener("loading", onFontsLoading);
      drain.disconnect();
      observer?.disconnect();
      observer = null;
      floats.disconnect();
      for (const p of paragraphs) {
        if (ownedState(p) !== void 0) restore(p);
      }
    }
  };
}
function unjustify(targets) {
  for (const el of targets instanceof Element ? [targets] : targets) {
    if (el instanceof HTMLElement) restore(el);
  }
}
function restore(p) {
  const state = states.get(p);
  if (state === void 0) return;
  restoreManagedOutput(p, state);
  states.delete(p);
}
export { justify, layoutDefaults, unjustify };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map