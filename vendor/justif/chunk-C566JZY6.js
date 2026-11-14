// src/core/types.ts
var ItemType = {
  Box: 0,
  Glue: 1,
  Penalty: 2
};
var defaultBuildOptions = {
  hyphenPenalty: 50,
  exHyphenPenalty: 50,
  protrusion: false,
  expansion: false,
  tracking: false,
  lastLineFit: 0,
  lastLineMinWidth: 0,
  boundaryShrink: 0
};
var defaultBreakOptions = {
  tolerance: 200,
  pretolerance: 100,
  linePenalty: 10,
  adjDemerits: 1e4,
  doubleHyphenDemerits: 1e4,
  finalHyphenDemerits: 5e3,
  emergencyStretch: "auto",
  lastLineMinWidth: 0
};
function lineWidthAt(widths, line) {
  if (typeof widths === "number") return widths;
  return widths[Math.min(line, widths.length - 1)] ?? 0;
}
function caseTransformedText(text, transform) {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  return text;
}

// src/core/cjk.ts
var CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303F\u30A0\u30FB\u30FC\u31F0-\u31FF\uFF00-\uFF65\uFFE0-\uFFE6]/u;
var kinsokuNotAtLineStart = "\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF1F\uFF01\u309B\u309C\xB4\xA8\u2010\u2013\u2014\u301C\u30A0\u2026\u2025\u300D\u300F\uFF09\u3015\uFF3D\uFF5D\u3009\u300B\u3011\u3019\u3017\u301F\u2019\u201D\uFF60\xBB\u203A\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u3095\u3096\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE\u30F5\u30F6\u31F0\u31F1\u31F2\u31F3\u31F4\u31F5\u31F6\u31F7\u31F8\u31F9\u31FA\u31FB\u31FC\u31FD\u31FE\u31FF\u30FC\u30FD\u30FE\u309D\u309E\u3005\u303B\uFF61\uFF63\uFF64\uFF65\uFF70!?,.:;)]}\u203C\u2047\u2048\u2049%\u2030\xB0\u2032\u2033\u2103-";
var kinsokuNotAtLineEnd = "\u300C\u300E\uFF08\u3014\uFF3B\uFF5B\u3008\u300A\u3010\u3018\u3016\u301D\u2018\u201C\uFF5F\xAB\u2039\uFF62([{";
var NOT_AT_START = new Set(kinsokuNotAtLineStart);
var NOT_AT_END = new Set(kinsokuNotAtLineEnd);
function cjkBreakAllowed(before, after) {
  return !NOT_AT_END.has(before) && !NOT_AT_START.has(after);
}
var CJK_GLUE_STRETCH = 0.1;
var CJK_GLUE_SHRINK = 0.02;
var segmenter;
function graphemes(text) {
  if (segmenter === void 0) {
    const ctor = typeof Intl !== "undefined" ? Intl.Segmenter : void 0;
    segmenter = ctor === void 0 ? null : new ctor(void 0, {
      granularity: "grapheme"
    });
  }
  if (segmenter !== null) {
    return Array.from(segmenter.segment(text), s => s.segment);
  }
  const out = [];
  for (const cp of text) {
    if (out.length > 0 && /\p{M}/u.test(cp)) out[out.length - 1] += cp;else out.push(cp);
  }
  return out;
}

// src/core/badness.ts
var INF_BAD = 1e4;
var UNDERFULL_RATIO = Math.cbrt(10);
function maxEndingStretch(minWidth) {
  return minWidth * UNDERFULL_RATIO;
}
var INF_PENALTY = 1e4;
var Fitness = {
  Tight: 0,
  Decent: 1,
  Loose: 2,
  VeryLoose: 3
};
function badness(t, s) {
  if (t <= 0) return 0;
  if (s <= 0) return INF_BAD;
  const r = Math.floor(297 * t / s);
  if (r > 1290) return INF_BAD;
  return Math.floor((r * r * r + 131072) / 262144);
}
function fitness(shrinking, b) {
  if (b <= 12) return Fitness.Decent;
  if (shrinking) return Fitness.Tight;
  return b < 100 ? Fitness.Loose : Fitness.VeryLoose;
}
function demerits(linePenalty, b, p) {
  const base = linePenalty + b;
  let d = Math.abs(base) >= 1e4 ? 1e8 : base * base;
  if (p > 0) d += p * p;else if (p > -INF_PENALTY) d -= p * p;
  return d;
}
function demeritsUncapped(linePenalty, b, p) {
  const base = linePenalty + b;
  let d = base * base;
  if (p > 0) d += p * p;else if (p > -INF_PENALTY) d -= p * p;
  return d;
}

// src/core/protrusion.ts
var SHAPE_BASE = {
  // Latin, not decomposable.
  Ł: "L",
  ł: "l",
  Đ: "D",
  đ: "d",
  Ð: "D",
  Ø: "O",
  ø: "o",
  Ŧ: "T",
  ŧ: "t",
  Ħ: "H",
  ħ: "h",
  Œ: "O",
  œ: "o",
  ı: "i",
  "\u0237": "j",
  // Cyrillic capitals sharing Latin edge shapes.
  А: "A",
  В: "B",
  С: "C",
  Е: "E",
  Ѕ: "S",
  І: "I",
  Ј: "J",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  Т: "T",
  Х: "X",
  У: "Y",
  // Cyrillic lowercase homoglyphs.
  а: "a",
  с: "c",
  е: "e",
  о: "o",
  р: "p",
  х: "x",
  у: "y",
  ѕ: "s",
  і: "i",
  ј: "j",
  // Greek capitals sharing Latin edge shapes.
  Α: "A",
  Β: "B",
  Ε: "E",
  Ζ: "Z",
  Η: "H",
  Ι: "I",
  Κ: "K",
  Μ: "M",
  Ν: "N",
  Ο: "O",
  Ρ: "P",
  Τ: "T",
  Υ: "Y",
  Χ: "X",
  // Greek lowercase homoglyph.
  ο: "o"
};
var HAS_MARKS = /^\P{M}\p{M}+$/u;
var baseCache = /* @__PURE__ */new Map();
function baseOf(ch) {
  const hit = baseCache.get(ch);
  if (hit !== void 0) return hit;
  let base = SHAPE_BASE[ch] ?? null;
  if (base === null) {
    const d = ch.normalize("NFD");
    if (d !== ch && HAS_MARKS.test(d)) base = d[0];
  }
  baseCache.set(ch, base);
  return base;
}
function protrusionCodes(table, ch) {
  let cur = ch;
  for (let i = 0; i < 3 && cur !== null; i++) {
    const entry = table[cur];
    if (entry !== void 0) return entry;
    cur = baseOf(cur);
  }
  return void 0;
}
var latinProtrusion = {
  // Sentence punctuation — the biggest optical wins.
  ".": {
    r: 700
  },
  ",": {
    r: 500
  },
  ":": {
    r: 500
  },
  ";": {
    r: 300
  },
  "!": {
    r: 100
  },
  "?": {
    r: 100
  },
  // Hyphens and dashes.
  "-": {
    l: 500,
    r: 500
  },
  "\u2010": {
    l: 500,
    r: 500
  },
  "\u2013": {
    l: 200,
    r: 200
  },
  "\u2014": {
    l: 150,
    r: 150
  },
  // Quotes. Left AND right values on each: some languages mirror their use.
  "\u2018": {
    l: 300,
    r: 400
  },
  "\u2019": {
    l: 300,
    r: 400
  },
  "\u201C": {
    l: 300,
    r: 300
  },
  "\u201D": {
    l: 300,
    r: 300
  },
  "\u201A": {
    l: 400,
    r: 400
  },
  "\u201E": {
    l: 400,
    r: 400
  },
  "\u2039": {
    l: 400,
    r: 300
  },
  "\u203A": {
    l: 300,
    r: 400
  },
  "\xAB": {
    l: 200,
    r: 200
  },
  "\xBB": {
    l: 200,
    r: 200
  },
  // Straight quotes are not in microtype's defaults (rare in TeX documents,
  // common on the web); values mirror their curly equivalents.
  "'": {
    l: 300,
    r: 400
  },
  '"': {
    l: 300,
    r: 300
  },
  // Brackets, symbols, digits with visual slack.
  "(": {
    l: 100
  },
  ")": {
    r: 200
  },
  "{": {
    l: 400,
    r: 200
  },
  "}": {
    l: 200,
    r: 400
  },
  "<": {
    l: 200,
    r: 100
  },
  ">": {
    l: 100,
    r: 200
  },
  "/": {
    l: 100,
    r: 200
  },
  "\\": {
    l: 100,
    r: 200
  },
  _: {
    l: 100,
    r: 100
  },
  "@": {
    l: 50,
    r: 50
  },
  "~": {
    l: 200,
    r: 250
  },
  "%": {
    l: 50,
    r: 50
  },
  "*": {
    l: 200,
    r: 200
  },
  "+": {
    l: 250,
    r: 250
  },
  "\xA1": {
    l: 100
  },
  "\xBF": {
    l: 100
  },
  "1": {
    l: 50,
    r: 50
  },
  "4": {
    l: 50,
    r: 50
  },
  "7": {
    l: 50,
    r: 50
  },
  // Diagonal / overhanging capitals.
  A: {
    l: 50,
    r: 50
  },
  Æ: {
    l: 50
  },
  F: {
    r: 50
  },
  J: {
    l: 50
  },
  K: {
    r: 50
  },
  L: {
    r: 50
  },
  T: {
    l: 50,
    r: 50
  },
  V: {
    l: 50,
    r: 50
  },
  W: {
    l: 50,
    r: 50
  },
  X: {
    l: 50,
    r: 50
  },
  Y: {
    l: 50,
    r: 50
  },
  // Lowercase with overhanging terminals.
  k: {
    r: 50
  },
  r: {
    r: 50
  },
  v: {
    l: 50,
    r: 50
  },
  w: {
    l: 50,
    r: 50
  },
  x: {
    l: 50,
    r: 50
  },
  y: {
    r: 50
  },
  // RTL punctuation (pure-RTL paragraph support). Hebrew and Arabic share
  // most ASCII punctuation, which the entries above already cover — table
  // lookup is per character and `l`/`r` are logical line-start/line-end,
  // so a Hebrew period hangs into the LEFT margin automatically. These are
  // the script-specific marks, mirroring their Latin counterparts' values.
  "\u060C": {
    r: 500
  },
  // Arabic comma ~ ","
  "\u061B": {
    r: 300
  },
  // Arabic semicolon ~ ";"
  "\u061F": {
    r: 100
  },
  // Arabic question mark ~ "?"
  "\u06D4": {
    r: 700
  },
  // Arabic full stop ~ "."
  "\u05BE": {
    l: 500,
    r: 500
  },
  // Hebrew maqaf ~ "-"
  "\u05F3": {
    l: 300,
    r: 400
  },
  // Hebrew geresh ~ "'"
  "\u05F4": {
    l: 300,
    r: 300
  },
  // Hebrew gershayim ~ '"'
  // Round capitals: a curve meets the margin at one tangent point, so
  // flush-set rounds read as slightly indented. microtype's generic
  // default omits them, but its hand-tuned Garalde configs (EB Garamond,
  // Minion, URW Garamond, Charter) all protrude these. Lowercase rounds
  // are deliberately NOT included: no microtype config protrudes them,
  // and at x-height the corners are below the visibility threshold —
  // adding them measurably worsened break quality in testing.
  O: {
    l: 50,
    r: 50
  },
  C: {
    l: 50
  },
  G: {
    l: 50
  },
  Q: {
    l: 50,
    r: 70
  }
};
var groups = {
  quotes: `'"\u2018\u2019\u201C\u201D\u201A\u201E\u2039\u203A\xAB\xBB`,
  stops: ".,",
  cjk: "\u3001\u3002\uFF0C\uFF0E"
};
var hangingCharacters = {
  start: groups.quotes,
  end: groups.quotes + groups.stops + groups.cjk
};
var HANG = 1e3;
var FLUSH = 0;
function classify(base, chars, side, code) {
  const out = {
    ...base
  };
  for (const ch of chars) out[ch] = {
    ...out[ch],
    [side]: code
  };
  return out;
}
var hangingPunctuation = classify(classify({}, hangingCharacters.end, "r", HANG), hangingCharacters.start, "l", HANG);
function normalizeHangingPunctuation(hang) {
  switch (hang) {
    case false:
      return "none";
    case "first-line":
      return "first-line-and-line-ends";
    case "all-lines":
      return "all-line-edges";
    default:
      return hang;
  }
}
function composeProtrusion(base, user, hang, chars) {
  if (chars === void 0) {
    chars = hangingCharacters;
  }
  const mode = normalizeHangingPunctuation(hang);
  let rest = base;
  let first = base;
  if (mode !== "none") {
    rest = classify(base, chars.end, "r", HANG);
    first = rest;
    if (mode !== "line-end-only") {
      first = classify(rest, chars.start, "l", HANG);
      if (mode === "all-line-edges") rest = first;else rest = classify(rest, chars.start, "l", FLUSH);
    }
  }
  const credit = mode === "none" ? void 0 : user !== null ? {
    ...base,
    ...user
  } : base;
  if (user !== null) {
    const same = first === rest;
    rest = {
      ...rest,
      ...user
    };
    first = same ? rest : {
      ...first,
      ...user
    };
  }
  return {
    rest,
    first,
    credit
  };
}

// src/core/items.ts
var SOFT_HYPHEN = "\xAD";
var WORD_CORE = /^(\P{L}*)(\p{L}+)(\P{L}*)$/u;
var MIN_HYPHENATION_LENGTH = 5;
function isBreakingDash(code) {
  return code === 45 || code === 8208 || code === 8211 || code === 8212;
}
function isAnyDash(code) {
  return code === 45 || code >= 8208 && code <= 8213;
}
var NO_LINE_START = /[,.;:!?%)\]}\u00BB\u203A\u2019\u201D\u2026\u2030\u203C\u2047\u2048\u2049]/;
var NO_LINE_END = /[([{\u00AB\u2039\u2018\u201C\u00BF\u00A1]/;
var DIGIT = /\p{Nd}/u;
var NEAR_PROHIBITIVE_PENALTY = 9999;
var FIXED_SPACE_BREAK_PENALTY = 0;
var ATOMIC_BREAK_PENALTY = 500;
var TEXT_SEPARATOR_SPLIT = /([\u0009\u000A\u000D\u0020]+|[\u1680\u2000-\u200A\u205F\u3000])/;
function mayBeCJK(text) {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) >= 4352) return true;
  }
  return false;
}
function textMakesBox(text) {
  return /[^\u0009\u000A\u000D\u0020\u00AD]/u.test(text);
}
function breakRp(items, b) {
  let endBox;
  for (let i = b - 1; i >= 0; i--) {
    const prev = items[i];
    if (prev.type === ItemType.Box) {
      endBox = prev;
      break;
    }
  }
  return rpAt(items[b], endBox);
}
function breakEndBox(para, b) {
  const i = para.lastBoxBefore[b];
  if (i < 0) return void 0;
  const box = para.items[i];
  return box.type === ItemType.Box ? box : void 0;
}
function rpAt(it, endBox) {
  if (it.type === ItemType.Penalty && it.width > 0) return it.rp;
  return endBox === void 0 ? 0 : endBox.rp;
}
function endingFloorRatio(need, glueY, flexY, maxRatio) {
  if (need <= 0) return 0;
  const flexCap = Math.min(maxRatio, 1);
  if (!(need <= glueY * maxRatio + flexY * flexCap)) return null;
  const pooled = need / (glueY + flexY);
  if (pooled <= flexCap) return pooled;
  return glueY > 0 ? (need - flexY * flexCap) / glueY : flexCap;
}
function firstCodePoint(text) {
  const code = text.charCodeAt(0);
  if (code >= 55296 && code <= 56319 && text.length > 1) {
    const next = text.charCodeAt(1);
    if (next >= 56320 && next <= 57343) return text.slice(0, 2);
  }
  return text[0];
}
function lastCodePoint(text) {
  const n = text.length;
  const code = text.charCodeAt(n - 1);
  if (code >= 56320 && code <= 57343 && n > 1) {
    const prev = text.charCodeAt(n - 2);
    if (prev >= 55296 && prev <= 56319) return text.slice(n - 2);
  }
  return text[n - 1];
}
function codePointLength(text) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319 && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) i++;
    }
    count++;
  }
  return count;
}
function splitAtDashes(token) {
  let dashed = false;
  for (let i = 0; i < token.length; i++) {
    if (isBreakingDash(token.charCodeAt(i))) {
      dashed = true;
      break;
    }
  }
  if (!dashed) return [token];
  const chunks = [];
  let start = 0;
  for (let i = 0; i < token.length - 1; i++) {
    if (isBreakingDash(token.charCodeAt(i)) && !isAnyDash(token.charCodeAt(i + 1))) {
      chunks.push(token.slice(start, i + 1));
      start = i + 1;
    }
  }
  chunks.push(token.slice(start));
  return chunks;
}
function beforeTrailingDashes(chunk) {
  let i = chunk.length - 1;
  while (i >= 0 && isAnyDash(chunk.charCodeAt(i))) i--;
  return i >= 0 ? chunk[i] : "";
}
function dashJunctionClass(before, after) {
  const stem = beforeTrailingDashes(before);
  if (stem === "" || NO_LINE_END.test(stem)) return 0;
  const next = after[0];
  if (NO_LINE_START.test(next)) return 0;
  return DIGIT.test(next) && DIGIT.test(stem) ? 3 : 2;
}
function clipExclusion(exclusion, start, length) {
  const end = start + length;
  if (exclusion === void 0 || exclusion.start >= exclusion.end || exclusion.start >= end || exclusion.end <= start) {
    return null;
  }
  return {
    start: Math.max(0, exclusion.start - start),
    end: Math.min(length, exclusion.end - start)
  };
}
function excludeFlow(text, start, exclusion) {
  const clipped = clipExclusion(exclusion ?? void 0, start, text.length);
  if (clipped === null) return {
    flowText: text
  };
  return {
    flowText: text.slice(0, clipped.start) + text.slice(clipped.end),
    flowExclusion: clipped
  };
}
var LAZY_ADVANCE = -1;
function protrusionTable(opts, run, firstLine) {
  if (opts.protrusion === false) return false;
  return firstLine ? run.protrusionFirst ?? opts.protrusionFirst ?? run.protrusion ?? opts.protrusion : run.protrusion ?? opts.protrusion;
}
function renderedChar(ch, run) {
  return caseTransformedText(ch, run.textTransform);
}
function protrusionHang(table, measure, ch, run, advanceOrLazy, side) {
  if (table === false) return 0;
  const code = protrusionCodes(table, renderedChar(ch, run))?.[side] ?? 0;
  return protrusionHangForCode(code, measure, ch, run, advanceOrLazy, side);
}
function protrusionHangForCode(code, measure, ch, run, advanceOrLazy, side) {
  const advCode = Math.min(1e3, code);
  if (advCode === 0) return 0;
  const advance = advanceOrLazy < 0 ? measure.charAdvance(ch, run) : advanceOrLazy;
  const advHang = advCode / 1e3 * advance;
  if (run.protrudeInkOnly === true && measure.inkBearings !== void 0) {
    return Math.min(advHang, measure.inkBearings(ch, run)[side]);
  }
  if (side === "l" && measure.inkBearings !== void 0) {
    return Math.min(advHang, Math.max(0, advance - measure.inkBearings(ch, run).r));
  }
  return advHang;
}
function leadingProtrusion(opts, measure, text, run, firstLine) {
  const table = protrusionTable(opts, run, firstLine);
  if (table === false) return 0;
  const mark = firstCodePoint(text);
  const inkOnly = run.protrudeInkOnly === true && measure.inkBearings !== void 0;
  const markCode = protrusionCodes(table, renderedChar(mark, run))?.l ?? 0;
  if (inkOnly || markCode < 1e3) {
    return protrusionHangForCode(markCode, measure, mark, run, LAZY_ADVANCE, "l");
  }
  const tail = text.slice(mark.length);
  const hang = tail.length === 0 ? measure.charAdvance(mark, run) : measure.width(text, run) - measure.width(tail, run);
  if (tail.length === 0) return hang;
  const credit = run.protrusionCredit ?? opts.protrusionCredit ?? false;
  return hang + protrusionHang(credit, measure, firstCodePoint(tail), run, LAZY_ADVANCE, "l");
}
function trailingProtrusion(opts, measure, text, run) {
  const table = protrusionTable(opts, run, false);
  if (table === false) return 0;
  const mark = lastCodePoint(text);
  const inkOnly = run.protrudeInkOnly === true && measure.inkBearings !== void 0;
  const markCode = protrusionCodes(table, renderedChar(mark, run))?.r ?? 0;
  if (inkOnly || markCode < 1e3) {
    return protrusionHangForCode(markCode, measure, mark, run, LAZY_ADVANCE, "r");
  }
  const head = text.slice(0, text.length - mark.length);
  const hang = head.length === 0 ? measure.charAdvance(mark, run) : measure.width(text, run) - measure.width(head, run);
  if (head.length === 0) return hang;
  const credit = run.protrusionCredit ?? opts.protrusionCredit ?? false;
  return hang + protrusionHang(credit, measure, lastCodePoint(head), run, LAZY_ADVANCE, "r");
}
function buildItems(texts, runs, opts, measure) {
  const items = [];
  let pendingSpaceRun = -1;
  let pendingLeadingSpace = false;
  let hasBox = false;
  let hasFlowBox = false;
  let pendingPad = 0;
  let explicitStart = false;
  let lastBox = null;
  let lastBoxRun = -1;
  let lastBoxKey;
  let pieceKey;
  let piecePaintedStart = false;
  let piecePaintedEnd = false;
  let pendingBoxStartProtrusion = 0;
  let pendingPaintedStart = false;
  let atomicBreakPending = false;
  const emitBox = (box, runIndex) => {
    if (pendingPad > 0 || pendingPaintedStart) {
      if (pendingPad > 0) {
        box.width += pendingPad;
        box.padPx = (box.padPx ?? 0) + pendingPad;
      }
      const boxHang = !pendingPaintedStart ? 0 : explicitStart ? pendingBoxStartProtrusion : Math.max(pendingBoxStartProtrusion, pendingPad);
      box.lp = boxHang;
      box.lpFirst = boxHang;
      pendingPad = 0;
      explicitStart = false;
      pendingBoxStartProtrusion = 0;
      pendingPaintedStart = false;
    }
    items.push(box);
    hasBox = true;
    if ((box.flowChars ?? box.text.length) > 0 || box.atomic === true) hasFlowBox = true;
    lastBox = box;
    lastBoxRun = runIndex;
    lastBoxKey = pieceKey;
  };
  const hyphenRp = run => piecePaintedEnd ? 0 : protrusionHang(protrusionTable(opts, run, false), measure, "-", run, run.hyphenWidth, "r");
  const makeBox = function (text, runIndex, width, flowText, flowExclusion) {
    if (flowText === void 0) {
      flowText = text;
    }
    const run = runs[runIndex];
    let lp = 0;
    let rp = 0;
    let lpFirst = 0;
    if (opts.protrusion !== false && flowText.length > 0) {
      if (!piecePaintedStart) {
        lp = leadingProtrusion(opts, measure, flowText, run, false);
        lpFirst = (run.protrusionFirst ?? opts.protrusionFirst) === void 0 ? lp : leadingProtrusion(opts, measure, flowText, run, true);
      }
      if (!piecePaintedEnd) rp = trailingProtrusion(opts, measure, flowText, run);
    }
    let expStretch = 0;
    let expShrink = 0;
    if (opts.expansion !== false) {
      if (run.ratioAtMax > 1) expStretch = width * (run.ratioAtMax - 1);
      if (run.ratioAtMin < 1) expShrink = width * (1 - run.ratioAtMin);
    }
    let trackStretch = 0;
    let trackShrink = 0;
    if (opts.tracking !== false) {
      trackStretch = width * opts.tracking.max;
      trackShrink = width * opts.tracking.shrink;
    }
    let boxFlowChars;
    if (flowText !== text) {
      const flowChars = codePointLength(flowText);
      if (flowChars !== codePointLength(text)) boxFlowChars = flowChars;
    }
    return {
      type: ItemType.Box,
      width,
      run: runIndex,
      text,
      flowChars: boxFlowChars,
      flowExclusion,
      lp,
      lpFirst,
      rp,
      hangStretch: 0,
      hangShrink: 0,
      expStretch,
      expShrink,
      trackStretch,
      trackShrink
    };
  };
  const pushPenalty = (penalty, width, flagged, hyphen, rp, runIndex) => {
    items.push({
      type: ItemType.Penalty,
      penalty,
      width,
      flagged,
      hyphen,
      rp,
      run: runIndex
    });
  };
  const pieceText = [];
  const pieceAfter = [];
  const pieceFromHyphenator = [];
  let pieceCount = 0;
  const chunkPieces = (chunk, noHyphens) => {
    if (noHyphens) {
      const text = chunk.includes(SOFT_HYPHEN) ? chunk.split(SOFT_HYPHEN).join("") : chunk;
      if (text.length > 0) pieceText[pieceCount++] = text;
      return false;
    }
    if (chunk.includes(SOFT_HYPHEN)) {
      for (const part of chunk.split(SOFT_HYPHEN)) {
        if (part.length > 0) pieceText[pieceCount++] = part;
      }
      return false;
    }
    if (opts.hyphenate && chunk.length >= MIN_HYPHENATION_LENGTH) {
      const m = WORD_CORE.exec(chunk);
      if (m && m[2].length >= MIN_HYPHENATION_LENGTH) {
        const prefix = m[1];
        const core = m[2];
        const suffix = m[3];
        const parts = opts.hyphenate(core.toLowerCase());
        let nonEmpty = 0;
        let joined = 0;
        for (const part of parts) {
          if (part.length > 0) nonEmpty++;
          joined += part.length;
        }
        if (nonEmpty > 1 && joined === core.length) {
          const first = pieceCount;
          let off = 0;
          for (const part of parts) {
            if (part.length > 0) {
              pieceText[pieceCount++] = core.slice(off, off + part.length);
            }
            off += part.length;
          }
          if (prefix.length > 0) pieceText[first] = prefix + pieceText[first];
          if (suffix.length > 0) {
            pieceText[pieceCount - 1] = pieceText[pieceCount - 1] + suffix;
          }
          return true;
        }
      }
    }
    pieceText[pieceCount++] = chunk;
    return false;
  };
  const flushPendingSpace = function (nextRun, dashInitial, fixedSpaceInitial, nextInitial, nextAtomic) {
    if (dashInitial === void 0) {
      dashInitial = false;
    }
    if (fixedSpaceInitial === void 0) {
      fixedSpaceInitial = false;
    }
    if (nextInitial === void 0) {
      nextInitial = "";
    }
    if (nextAtomic === void 0) {
      nextAtomic = false;
    }
    if (pendingSpaceRun < 0 && (atomicBreakPending || nextAtomic) && !fixedSpaceInitial) {
      const last = items[items.length - 1];
      if (last?.type === ItemType.Box && !(pieceKey !== void 0 && pieceKey === lastBoxKey) && (nextInitial === "" || !NO_LINE_START.test(nextInitial)) && (last.text.length === 0 || !NO_LINE_END.test(lastCodePoint(last.text)))) {
        items.push({
          type: ItemType.Penalty,
          penalty: ATOMIC_BREAK_PENALTY,
          width: 0,
          flagged: false,
          hyphen: false,
          rp: last.rp,
          run: nextRun,
          atomic: true
        });
      }
    }
    atomicBreakPending = false;
    if (pendingSpaceRun >= 0 && hasBox) {
      const space = runs[pendingSpaceRun].space;
      if (pendingLeadingSpace || fixedSpaceInitial || pieceKey !== void 0 && pieceKey === lastBoxKey) {
        pushPenalty(INF_PENALTY, 0, false, false, 0, pendingSpaceRun);
      } else if (dashInitial) {
        pushPenalty(NEAR_PROHIBITIVE_PENALTY, 0, false, false, 0, pendingSpaceRun);
      }
      const boundary = lastBoxRun >= 0 && runs[lastBoxRun].familyKey !== runs[nextRun].familyKey;
      items.push({
        type: ItemType.Glue,
        width: pendingLeadingSpace ? 0 : space.width,
        stretch: pendingLeadingSpace ? 0 : space.stretch,
        stretchFil: 0,
        shrink: pendingLeadingSpace ? 0 : boundary ? space.shrink * opts.boundaryShrink : space.shrink,
        run: pendingSpaceRun,
        rigid: !pendingLeadingSpace && boundary && opts.boundaryShrink < 1 ? true : void 0,
        fixedSpaceInitial: fixedSpaceInitial || void 0
      });
    }
    pendingSpaceRun = -1;
    pendingLeadingSpace = false;
  };
  const pushWord = (token, runIndex, exclusion) => {
    const run = runs[runIndex];
    pieceCount = 0;
    if (pieceKey !== void 0) {
      chunkPieces(token, true);
      if (pieceCount > 0) pieceAfter[pieceCount - 1] = 0;
    } else {
      const noHyphens = run.noHyphens === true;
      const chunks = splitAtDashes(token);
      for (let c = 0; c < chunks.length; c++) {
        const first = pieceCount;
        const fromHyphenator = chunkPieces(chunks[c], noHyphens);
        for (let q = first; q < pieceCount - 1; q++) {
          pieceAfter[q] = 1;
          pieceFromHyphenator[q] = fromHyphenator;
        }
        if (pieceCount > first) {
          pieceAfter[pieceCount - 1] = c < chunks.length - 1 ? dashJunctionClass(chunks[c], chunks[c + 1]) : 0;
        }
      }
    }
    if (pieceCount === 0) return;
    flushPendingSpace(runIndex, isAnyDash(token.charCodeAt(0)), false, firstCodePoint(token));
    if (pieceCount === 1 && pieceAfter[0] === 0 && exclusion === null) {
      const only = pieceText[0];
      emitBox(makeBox(only, runIndex, measure.width(only, run)), runIndex);
      return;
    }
    let acc = "";
    let accWidth = 0;
    let tokenOffset = 0;
    for (let q = 0; q < pieceCount; q++) {
      const text = pieceText[q];
      acc += text;
      const start = tokenOffset;
      const _excludeFlow = excludeFlow(text, start, exclusion),
        flowText = _excludeFlow.flowText,
        boxExclusion = _excludeFlow.flowExclusion;
      tokenOffset = start + text.length;
      const flowPrefix = exclusion === null ? acc : acc.slice(0, Math.max(0, exclusion.start)) + acc.slice(Math.min(acc.length, exclusion.end));
      const prefixWidth = measure.width(flowPrefix, run);
      const box = makeBox(text, runIndex, prefixWidth - accWidth, flowText, boxExclusion);
      accWidth = prefixWidth;
      emitBox(box, runIndex);
      const after = pieceAfter[q];
      if (after === 1) {
        pushPenalty(opts.hyphenPenalty, run.hyphenWidth, true, pieceFromHyphenator[q], hyphenRp(run), runIndex);
      } else if (after === 2 || after === 3) {
        pushPenalty(after === 3 ? NEAR_PROHIBITIVE_PENALTY : opts.exHyphenPenalty, 0, true, false, box.rp, runIndex);
      }
    }
  };
  const pushAtomic = (widthPx, runIndex) => {
    const occupies = widthPx > 0;
    flushPendingSpace(runIndex, false, false, "", occupies);
    emitBox({
      type: ItemType.Box,
      width: widthPx,
      run: runIndex,
      text: "",
      lp: 0,
      lpFirst: 0,
      rp: 0,
      hangStretch: 0,
      hangShrink: 0,
      expStretch: 0,
      expShrink: 0,
      trackStretch: 0,
      trackShrink: 0,
      atomic: true
    }, runIndex);
    atomicBreakPending = occupies && pieceKey === void 0;
  };
  const pushOtherSpace = (separator, runIndex, exclusion) => {
    const run = runs[runIndex];
    flushPendingSpace(runIndex, false, true);
    const precedingItem = items[items.length - 1];
    const leadingGlue = precedingItem?.type === ItemType.Glue && precedingItem.fixedSpaceInitial === true ? precedingItem : void 0;
    let chainIndex = items.length - 1;
    if (leadingGlue !== void 0) chainIndex -= 2;
    const boundary = items[chainIndex];
    const behindBoundary = items[chainIndex - 1];
    if (boundary?.type === ItemType.Penalty && boundary.fixedSpace === true && behindBoundary?.type === ItemType.Box && behindBoundary.otherSpace === true) {
      items.splice(chainIndex, 1);
      chainIndex -= 1;
    }
    const precedingBox = items[chainIndex];
    const _excludeFlow2 = excludeFlow(separator, 0, exclusion),
      flowText = _excludeFlow2.flowText,
      flowExclusion = _excludeFlow2.flowExclusion;
    const width = measure.width(flowText, run);
    const box = makeBox(separator, runIndex, width, flowText, flowExclusion);
    box.otherSpace = true;
    box.rp = width + (precedingBox?.type === ItemType.Box && precedingBox.otherSpace === true ? precedingBox.rp : 0) + (leadingGlue?.width ?? 0);
    box.hangStretch = (precedingBox?.type === ItemType.Box && precedingBox.otherSpace === true ? precedingBox.hangStretch : 0) + (leadingGlue?.stretch ?? 0);
    box.hangShrink = (precedingBox?.type === ItemType.Box && precedingBox.otherSpace === true ? precedingBox.hangShrink : 0) + (leadingGlue?.shrink ?? 0);
    emitBox(box, runIndex);
    if (pieceKey === void 0 && separator !== "\u2007") {
      items.push({
        type: ItemType.Penalty,
        penalty: FIXED_SPACE_BREAK_PENALTY,
        width: 0,
        flagged: false,
        hyphen: false,
        rp: 0,
        run: runIndex,
        fixedSpace: true
      });
    }
  };
  const pushCJKToken = (token, runIndex, exclusion) => {
    const run = runs[runIndex];
    const clean = token.split(SOFT_HYPHEN).join("");
    if (clean.length === 0) return;
    const groups2 = [];
    let tokenOffset = 0;
    for (const cluster of graphemes(clean)) {
      const cjk = CJK_CHAR.test(cluster);
      const start = tokenOffset;
      const _excludeFlow3 = excludeFlow(cluster, start, exclusion),
        flowText = _excludeFlow3.flowText,
        clusterExclusion = _excludeFlow3.flowExclusion;
      tokenOffset = start + cluster.length;
      const last = groups2[groups2.length - 1];
      if (!cjk && last !== void 0 && !last.cjk) {
        const previousLength = last.text.length;
        last.text += cluster;
        last.flowText += flowText;
        if (clusterExclusion !== void 0) {
          const shifted = {
            start: previousLength + clusterExclusion.start,
            end: previousLength + clusterExclusion.end
          };
          if (last.flowExclusion === void 0) last.flowExclusion = shifted;else last.flowExclusion.end = shifted.end;
        }
      } else groups2.push({
        cjk,
        text: cluster,
        flowText,
        flowExclusion: clusterExclusion
      });
    }
    flushPendingSpace(runIndex, isAnyDash(clean.charCodeAt(0)), false, firstCodePoint(clean));
    let prev = null;
    for (const group of groups2) {
      const width = measure.width(group.flowText, run);
      if (prev !== null) {
        const before = prev.group.cjk ? prev.group.text : graphemes(prev.group.text).pop() ?? "";
        const after = group.cjk ? group.text : graphemes(group.text)[0] ?? "";
        items.push({
          type: ItemType.Penalty,
          // Inside a nowrap element every inter-cluster boundary is
          // break-prohibited; the glue still flexes for justification.
          penalty: prev.group.flowText.length > 0 && pieceKey === void 0 && cjkBreakAllowed(before, after) ? 0 : INF_PENALTY,
          width: 0,
          flagged: false,
          hyphen: false,
          rp: 0,
          // breakRp walks back to the box, whose own rp applies
          run: runIndex,
          cjk: true
        });
        const basis = prev.group.flowText.length === 0 ? 0 : prev.group.cjk && group.cjk ? (prev.width + width) / 2 : prev.group.cjk ? prev.width : width;
        items.push({
          type: ItemType.Glue,
          width: 0,
          stretch: CJK_GLUE_STRETCH * basis,
          stretchFil: 0,
          shrink: CJK_GLUE_SHRINK * basis,
          run: runIndex,
          cjk: true
        });
      }
      emitBox(makeBox(group.text, runIndex, width, group.flowText, group.flowExclusion), runIndex);
      prev = {
        group,
        width
      };
    }
  };
  for (const piece of texts) {
    const text = piece.text,
      run = piece.run;
    pieceKey = piece.atomicKey;
    piecePaintedStart = piece.paintedBox === true || piece.paintedStart === true;
    piecePaintedEnd = piece.paintedBox === true || piece.paintedEnd === true;
    if (piece.startEdge !== void 0) {
      pendingPad += piece.startEdge.advancePx;
      pendingPaintedStart = true;
      explicitStart = true;
      pendingBoxStartProtrusion += opts.protrusion === false ? 0 : piece.startEdge.protrusionPx;
    } else if (piece.padStartPx !== void 0) pendingPad += piece.padStartPx;
    if (piece.startEdge === void 0 && opts.protrusion !== false && piece.boxStartProtrusionPx !== void 0) {
      pendingPaintedStart = true;
      pendingBoxStartProtrusion += piece.boxStartProtrusionPx;
    }
    if (piece.atomic !== void 0) {
      pushAtomic(piece.atomic.widthPx, run);
    }
    const parts = text.split(TEXT_SEPARATOR_SPLIT);
    let pieceOffset = 0;
    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi];
      if (part.length === 0) continue;
      const partStart = pieceOffset;
      pieceOffset = partStart + part.length;
      if ((pi & 1) === 1) {
        const separator = part.charCodeAt(0);
        if (separator === 9 || separator === 10 || separator === 13 || separator === 32) {
          if (hasBox) {
            pendingSpaceRun = run;
            pendingLeadingSpace = !hasFlowBox;
          }
        } else {
          const overlap2 = clipExclusion(piece.flowExclusion, partStart, part.length);
          pushOtherSpace(part, run, overlap2);
        }
        continue;
      }
      const overlap = clipExclusion(piece.flowExclusion, partStart, part.length);
      if (mayBeCJK(part) && CJK_CHAR.test(part)) {
        pushCJKToken(part, run, overlap);
      } else {
        pushWord(part, run, overlap);
      }
    }
    const lb = lastBox;
    if (piece.endEdge !== void 0 && lb !== null) {
      lb.paintedEnd = true;
      lb.width += piece.endEdge.advancePx;
      lb.padPx = (lb.padPx ?? 0) + piece.endEdge.advancePx;
      lb.rp = opts.protrusion === false ? 0 : piece.endEdge.protrusionPx;
    } else if ((piece.padEndPx !== void 0 || piece.boxEndProtrusionPx !== void 0) && lb !== null) {
      if (piece.padEndPx !== void 0) {
        lb.width += piece.padEndPx;
        lb.padPx = (lb.padPx ?? 0) + piece.padEndPx;
      }
      if (piece.boxEndProtrusionPx !== void 0) {
        lb.paintedEnd = true;
        lb.rp = opts.protrusion === false ? 0 : Math.max(piece.boxEndProtrusionPx, piece.padEndPx ?? 0);
      } else if (lb.paintedEnd === true) {
        if (opts.protrusion !== false) lb.rp += piece.padEndPx ?? 0;
      } else {
        lb.rp = 0;
      }
    }
  }
  pieceKey = void 0;
  piecePaintedStart = false;
  piecePaintedEnd = false;
  pushPenalty(INF_PENALTY, 0, false, false, 0, 0);
  items.push({
    type: ItemType.Glue,
    width: 0,
    stretch: 0,
    stretchFil: 1,
    shrink: 0,
    run: 0
  });
  pushPenalty(-INF_PENALTY, 0, false, false, 0, 0);
  return withSums(items, runs);
}
function withSums(items, runs) {
  const n = items.length;
  const cumW = new Float64Array(n + 1);
  const cumY = new Float64Array(n + 1);
  const cumYfil = new Float64Array(n + 1);
  const cumZ = new Float64Array(n + 1);
  const cumExpY = new Float64Array(n + 1);
  const cumExpZ = new Float64Array(n + 1);
  const cumTrackY = new Float64Array(n + 1);
  const firstBoxAfter = new Int32Array(n + 1);
  const lastBoxBefore = new Int32Array(n + 1);
  lastBoxBefore[0] = -1;
  for (let i = 0; i < n; i++) {
    const it = items[i];
    lastBoxBefore[i + 1] = it.type === ItemType.Box ? i : lastBoxBefore[i];
    let w = 0,
      y = 0,
      yFil = 0,
      z = 0,
      ey = 0,
      ez = 0,
      ty = 0;
    if (it.type === ItemType.Box) {
      w = it.width;
      ey = it.expStretch;
      ez = it.expShrink;
      y = ty = it.trackStretch;
      z = it.trackShrink;
    } else if (it.type === ItemType.Glue) {
      w = it.width;
      y = it.stretch;
      yFil = it.stretchFil;
      z = it.shrink;
    }
    cumW[i + 1] = cumW[i] + w;
    cumY[i + 1] = cumY[i] + y;
    cumYfil[i + 1] = cumYfil[i] + yFil;
    cumZ[i + 1] = cumZ[i] + z;
    cumExpY[i + 1] = cumExpY[i] + ey;
    cumExpZ[i + 1] = cumExpZ[i] + ez;
    cumTrackY[i + 1] = cumTrackY[i] + ty;
  }
  firstBoxAfter[n] = n;
  for (let i = n - 1; i >= 0; i--) {
    firstBoxAfter[i] = items[i].type === ItemType.Box ? i : firstBoxAfter[i + 1];
  }
  return {
    items,
    runs,
    cumW,
    cumY,
    cumYfil,
    cumZ,
    cumExpY,
    cumExpZ,
    cumTrackY,
    firstBoxAfter,
    lastBoxBefore
  };
}

// src/core/protrusion-fonts.ts
var TABLES = {
  // EB Garamond (Duffner/Pardo; mt-ebg by R. Schlicht et al.)
  ebg: {
    "1": {
      l: 50,
      r: 50
    },
    "2": {
      l: 50,
      r: 50
    },
    "4": {
      l: 50,
      r: 50
    },
    "7": {
      l: 50,
      r: 50
    },
    "A": {
      l: 50,
      r: 50
    },
    "\xC6": {
      l: 50
    },
    "C": {
      l: 50
    },
    "D": {
      r: 50
    },
    "F": {
      r: 50
    },
    "G": {
      l: 50
    },
    "J": {
      l: 50
    },
    "K": {
      r: 50
    },
    "L": {
      r: 50
    },
    "O": {
      l: 50,
      r: 50
    },
    "\u0152": {
      l: 50
    },
    "Q": {
      l: 50,
      r: 70
    },
    "R": {
      r: 70
    },
    "T": {
      l: 70,
      r: 70
    },
    "V": {
      l: 50,
      r: 50
    },
    "W": {
      l: 50,
      r: 50
    },
    "X": {
      l: 50,
      r: 50
    },
    "Y": {
      l: 50,
      r: 50
    },
    "k": {
      r: 50
    },
    "p": {
      r: 50
    },
    "q": {
      l: 50
    },
    "r": {
      r: 50
    },
    "t": {
      r: 70
    },
    "v": {
      l: 50,
      r: 50
    },
    "w": {
      l: 50,
      r: 50
    },
    "x": {
      l: 50,
      r: 50
    },
    "y": {
      r: 50
    },
    ".": {
      r: 600
    },
    ",": {
      r: 500
    },
    ":": {
      r: 400
    },
    ";": {
      r: 300
    },
    "!": {
      r: 100
    },
    "?": {
      r: 100
    },
    "@": {
      l: 50,
      r: 50
    },
    "~": {
      l: 200,
      r: 250
    },
    "&": {
      l: 50,
      r: 100
    },
    "%": {
      l: 50,
      r: 50
    },
    "*": {
      l: 300,
      r: 300
    },
    "+": {
      l: 250,
      r: 250
    },
    "(": {
      l: 100
    },
    ")": {
      r: 200
    },
    "/": {
      l: 100,
      r: 200
    },
    "-": {
      l: 300,
      r: 500
    },
    "\u2013": {
      l: 300,
      r: 300
    },
    "\u2014": {
      l: 200,
      r: 200
    },
    "\u2018": {
      l: 300,
      r: 500
    },
    "\u2019": {
      l: 400,
      r: 400
    },
    "\u201C": {
      l: 300,
      r: 300
    },
    "\u201D": {
      l: 300,
      r: 300
    },
    "_": {
      l: 100,
      r: 100
    },
    "\\": {
      l: 100,
      r: 200
    },
    "\u201A": {
      l: 400,
      r: 400
    },
    "\u201E": {
      l: 400,
      r: 400
    },
    "\u2039": {
      l: 400,
      r: 400
    },
    "\u203A": {
      l: 300,
      r: 500
    },
    "\xAB": {
      l: 300,
      r: 300
    },
    "\xBB": {
      l: 200,
      r: 300
    },
    "\xA1": {
      l: 100
    },
    "\xBF": {
      l: 100
    },
    "{": {
      l: 400,
      r: 200
    },
    "}": {
      l: 200,
      r: 400
    },
    "<": {
      l: 200,
      r: 100
    },
    ">": {
      l: 100,
      r: 200
    }
  },
  // Palatino (mt-ppl)
  ppl: {
    "1": {
      l: 100,
      r: 100
    },
    "7": {
      r: 50
    },
    "A": {
      l: 50,
      r: 50
    },
    "J": {
      l: 50
    },
    "K": {
      r: 50
    },
    "L": {
      r: 50
    },
    "T": {
      l: 50,
      r: 50
    },
    "V": {
      l: 50,
      r: 50
    },
    "W": {
      l: 50,
      r: 50
    },
    "X": {
      l: 50,
      r: 50
    },
    "Y": {
      l: 50,
      r: 50
    },
    "k": {
      r: 50
    },
    "p": {
      l: 50,
      r: 50
    },
    "q": {
      l: 50
    },
    "r": {
      r: 50
    },
    "v": {
      l: 50,
      r: 50
    },
    "w": {
      l: 50,
      r: 50
    },
    "x": {
      l: 50,
      r: 50
    },
    "y": {
      l: 50,
      r: 70
    },
    ".": {
      r: 700
    },
    ",": {
      r: 500
    },
    ":": {
      r: 500
    },
    ";": {
      r: 500
    },
    "!": {
      r: 100
    },
    "?": {
      r: 200
    },
    "@": {
      l: 50,
      r: 50
    },
    "~": {
      l: 200,
      r: 250
    },
    "&": {
      l: 50,
      r: 100
    },
    "%": {
      l: 100,
      r: 100
    },
    "*": {
      l: 200,
      r: 200
    },
    "+": {
      l: 250,
      r: 250
    },
    "(": {
      l: 100
    },
    ")": {
      r: 300
    },
    "/": {
      l: 200,
      r: 300
    },
    "-": {
      l: 400,
      r: 500
    },
    "\u2013": {
      l: 300,
      r: 300
    },
    "\u2014": {
      l: 200,
      r: 200
    },
    "\u2018": {
      l: 500,
      r: 700
    },
    "\u2019": {
      l: 500,
      r: 700
    },
    "\u201C": {
      l: 300,
      r: 400
    },
    "\u201D": {
      l: 300,
      r: 400
    },
    "_": {
      l: 100,
      r: 100
    },
    "\\": {
      l: 200,
      r: 300
    },
    "\u201A": {
      l: 400,
      r: 400
    },
    "\u201E": {
      l: 400,
      r: 400
    },
    "\u2039": {
      l: 400,
      r: 400
    },
    "\u203A": {
      l: 300,
      r: 500
    },
    "\xAB": {
      l: 300,
      r: 300
    },
    "\xBB": {
      l: 200,
      r: 400
    },
    "\xA1": {
      l: 100
    },
    "\xBF": {
      l: 100
    },
    "{": {
      l: 400,
      r: 200
    },
    "}": {
      l: 200,
      r: 400
    },
    "<": {
      l: 200,
      r: 100
    },
    ">": {
      l: 100,
      r: 200
    }
  },
  // Times (mt-ptm)
  ptm: {
    "1": {
      l: 150,
      r: 150
    },
    "4": {
      l: 70
    },
    "7": {
      l: 50,
      r: 100
    },
    "A": {
      l: 50,
      r: 50
    },
    "\xC6": {
      l: 50
    },
    "F": {
      r: 50
    },
    "J": {
      l: 50
    },
    "K": {
      r: 50
    },
    "L": {
      r: 80
    },
    "T": {
      l: 50,
      r: 50
    },
    "V": {
      l: 50,
      r: 50
    },
    "W": {
      l: 50,
      r: 50
    },
    "X": {
      l: 50,
      r: 50
    },
    "Y": {
      l: 80,
      r: 80
    },
    "k": {
      r: 50
    },
    "r": {
      r: 50
    },
    "v": {
      l: 50,
      r: 50
    },
    "w": {
      l: 50,
      r: 50
    },
    "x": {
      l: 50,
      r: 50
    },
    "y": {
      l: 50,
      r: 70
    },
    ".": {
      r: 700
    },
    ",": {
      r: 500
    },
    ":": {
      r: 500
    },
    ";": {
      r: 300
    },
    "!": {
      r: 100
    },
    "?": {
      r: 100
    },
    "@": {
      l: 100,
      r: 100
    },
    "~": {
      l: 200,
      r: 250
    },
    "&": {
      l: 50,
      r: 100
    },
    "%": {
      l: 100,
      r: 100
    },
    "*": {
      l: 200,
      r: 200
    },
    "+": {
      l: 250,
      r: 250
    },
    "(": {
      l: 100
    },
    ")": {
      r: 200
    },
    "/": {
      l: 100,
      r: 200
    },
    "-": {
      l: 500,
      r: 500
    },
    "\u2013": {
      l: 300,
      r: 300
    },
    "\u2014": {
      l: 200,
      r: 200
    },
    "\u2018": {
      l: 500,
      r: 500
    },
    "\u2019": {
      l: 300,
      r: 500
    },
    "\u201C": {
      l: 300,
      r: 400
    },
    "\u201D": {
      l: 300,
      r: 400
    },
    "_": {
      l: 100,
      r: 100
    },
    "\\": {
      l: 100,
      r: 200
    },
    "\u201A": {
      l: 400,
      r: 400
    },
    "\u201E": {
      l: 400,
      r: 400
    },
    "\u2039": {
      l: 400,
      r: 400
    },
    "\u203A": {
      l: 300,
      r: 500
    },
    "\xAB": {
      l: 300,
      r: 300
    },
    "\xBB": {
      l: 200,
      r: 400
    },
    "\xA1": {
      l: 200
    },
    "\xBF": {
      l: 200
    },
    "{": {
      l: 400,
      r: 200
    },
    "}": {
      l: 200,
      r: 400
    },
    "<": {
      l: 200,
      r: 100
    },
    ">": {
      l: 100,
      r: 200
    }
  },
  // Bitstream Charter (mt-bch)
  bch: {
    "1": {
      l: 150,
      r: 150
    },
    "2": {
      l: 50,
      r: 50
    },
    "3": {
      l: 50
    },
    "4": {
      l: 100,
      r: 50
    },
    "6": {
      l: 50
    },
    "7": {
      l: 50,
      r: 80
    },
    "9": {
      l: 50,
      r: 50
    },
    "A": {
      l: 50,
      r: 50
    },
    "C": {
      l: 50
    },
    "D": {
      r: 50
    },
    "F": {
      r: 50
    },
    "G": {
      l: 50
    },
    "J": {
      l: 100
    },
    "K": {
      r: 50
    },
    "L": {
      r: 50
    },
    "O": {
      l: 50,
      r: 50
    },
    "Q": {
      l: 50,
      r: 70
    },
    "R": {
      r: 50
    },
    "T": {
      l: 50,
      r: 50
    },
    "V": {
      l: 50,
      r: 50
    },
    "W": {
      l: 50,
      r: 50
    },
    "X": {
      l: 50,
      r: 50
    },
    "Y": {
      l: 50,
      r: 50
    },
    "k": {
      r: 50
    },
    "r": {
      r: 50
    },
    "t": {
      r: 50
    },
    "v": {
      l: 50,
      r: 50
    },
    "w": {
      l: 50,
      r: 50
    },
    "x": {
      l: 50,
      r: 50
    },
    "y": {
      r: 50
    },
    ".": {
      r: 600
    },
    ",": {
      r: 500
    },
    ":": {
      r: 400
    },
    ";": {
      r: 300
    },
    "!": {
      r: 100
    },
    "?": {
      r: 200
    },
    "@": {
      l: 50,
      r: 50
    },
    "~": {
      l: 200,
      r: 250
    },
    "%": {
      r: 50
    },
    "*": {
      l: 200,
      r: 300
    },
    "+": {
      l: 150,
      r: 250
    },
    "(": {
      l: 200
    },
    ")": {
      r: 200
    },
    "[": {
      l: 100
    },
    "]": {
      r: 100
    },
    "/": {
      r: 200
    },
    "-": {
      l: 400,
      r: 500
    },
    "\u2013": {
      l: 200,
      r: 300
    },
    "\u2014": {
      l: 150,
      r: 250
    },
    "\u2018": {
      l: 300,
      r: 400
    },
    "\u2019": {
      l: 300,
      r: 400
    },
    "\u201C": {
      l: 300,
      r: 300
    },
    "\u201D": {
      l: 300,
      r: 300
    },
    "\u0152": {
      l: 50
    },
    "_": {
      l: 100,
      r: 100
    },
    "\\": {
      l: 150,
      r: 200
    },
    "\u201A": {
      l: 400,
      r: 400
    },
    "\u201E": {
      l: 300,
      r: 300
    },
    "\u2039": {
      l: 400,
      r: 300
    },
    "\u203A": {
      l: 300,
      r: 400
    },
    "\xAB": {
      l: 200,
      r: 200
    },
    "\xBB": {
      l: 150,
      r: 300
    },
    "\xA1": {
      l: 100
    },
    "\xBF": {
      l: 100
    },
    "{": {
      l: 200
    },
    "}": {
      r: 300
    },
    "<": {
      l: 200,
      r: 100
    },
    ">": {
      l: 100,
      r: 200
    }
  },
  // Adobe Minion (mt-pmn by H. Harders & K. Karlsson)
  pmn: {
    "1": {
      r: 50
    },
    "3": {
      l: 50
    },
    "4": {
      l: 50
    },
    "7": {
      l: 50,
      r: 80
    },
    "A": {
      l: 50,
      r: 50
    },
    "C": {
      l: 50
    },
    "D": {
      r: 50
    },
    "F": {
      r: 50
    },
    "G": {
      l: 50
    },
    "J": {
      l: 50
    },
    "K": {
      r: 50
    },
    "L": {
      r: 50
    },
    "O": {
      l: 50,
      r: 50
    },
    "Q": {
      l: 50,
      r: 70
    },
    "T": {
      l: 50,
      r: 50
    },
    "V": {
      l: 50,
      r: 50
    },
    "W": {
      l: 50,
      r: 50
    },
    "X": {
      l: 50,
      r: 50
    },
    "Y": {
      l: 50,
      r: 50
    },
    "k": {
      r: 50
    },
    "l": {
      r: -50
    },
    "r": {
      r: 50
    },
    "t": {
      r: 70
    },
    "v": {
      l: 50,
      r: 50
    },
    "w": {
      l: 50,
      r: 50
    },
    "x": {
      l: 50,
      r: 50
    },
    "y": {
      r: 50
    },
    ".": {
      r: 700
    },
    ",": {
      r: 500
    },
    ":": {
      r: 500
    },
    ";": {
      r: 300
    },
    "!": {
      r: 100
    },
    "?": {
      r: 100
    },
    '"': {
      l: 300,
      r: 300
    },
    "@": {
      l: 50,
      r: 50
    },
    "~": {
      l: 200,
      r: 250
    },
    "%": {
      l: 50,
      r: 50
    },
    "*": {
      l: 200,
      r: 300
    },
    "+": {
      l: 150,
      r: 200
    },
    "(": {
      l: 100
    },
    ")": {
      r: 200
    },
    "[": {
      l: 100
    },
    "]": {
      r: 100
    },
    "/": {
      l: 100,
      r: 200
    },
    "-": {
      l: 200,
      r: 400
    },
    "\u2013": {
      l: 200,
      r: 200
    },
    "\u2014": {
      l: 150,
      r: 150
    },
    "\u2018": {
      l: 300,
      r: 400
    },
    "\u2019": {
      l: 300,
      r: 400
    },
    "\u201C": {
      l: 300,
      r: 300
    },
    "\u201D": {
      l: 300,
      r: 300
    },
    "\u0152": {
      l: 50
    },
    "_": {
      l: 100,
      r: 100
    },
    "\\": {
      l: 100,
      r: 200
    },
    "\u201A": {
      l: 400,
      r: 400
    },
    "\u201E": {
      l: 300,
      r: 300
    },
    "\u2039": {
      l: 400,
      r: 300
    },
    "\u203A": {
      l: 300,
      r: 400
    },
    "\xAB": {
      l: 200,
      r: 200
    },
    "\xBB": {
      l: 150,
      r: 300
    },
    "\xA1": {
      l: 100
    },
    "\xBF": {
      l: 100
    },
    "{": {
      l: 200
    },
    "}": {
      r: 300
    },
    "<": {
      l: 100
    },
    ">": {
      r: 100
    }
  },
  // URW Garamond (mt-ugm) — also matched for other Garamond cuts (all Garaldes)
  ugm: {
    "1": {
      l: 150,
      r: 150
    },
    "2": {
      l: 50,
      r: 50
    },
    "3": {
      l: 50,
      r: 50
    },
    "4": {
      l: 70,
      r: 70
    },
    "7": {
      l: 50,
      r: 80
    },
    "A": {
      l: 50,
      r: 100
    },
    "\xC6": {
      l: 150,
      r: 50
    },
    "B": {
      r: 50
    },
    "C": {
      l: 50
    },
    "D": {
      r: 70
    },
    "E": {
      r: 50
    },
    "F": {
      r: 70
    },
    "G": {
      l: 50,
      r: 50
    },
    "J": {
      l: 50
    },
    "K": {
      r: 50
    },
    "L": {
      r: 120
    },
    "O": {
      l: 50,
      r: 50
    },
    "\u0152": {
      l: 50,
      r: 50
    },
    "P": {
      r: 50
    },
    "Q": {
      l: 50,
      r: 50
    },
    "R": {
      r: 70
    },
    "T": {
      l: 70,
      r: 70
    },
    "V": {
      l: 70,
      r: 70
    },
    "W": {
      l: 70,
      r: 70
    },
    "X": {
      l: 50,
      r: 70
    },
    "Y": {
      l: 80,
      r: 80
    },
    "Z": {
      l: 50,
      r: 50
    },
    "k": {
      r: 70
    },
    "p": {
      r: 50
    },
    "r": {
      r: 50
    },
    "t": {
      r: 100
    },
    "v": {
      l: 50,
      r: 70
    },
    "w": {
      l: 50,
      r: 70
    },
    "x": {
      l: 50,
      r: 50
    },
    "y": {
      r: 70
    },
    ".": {
      r: 700
    },
    ",": {
      r: 500
    },
    ":": {
      r: 500
    },
    ";": {
      r: 400
    },
    "!": {
      r: 100
    },
    "?": {
      r: 200
    },
    "~": {
      l: 300,
      r: 350
    },
    "&": {
      r: 100
    },
    "%": {
      l: 50,
      r: 100
    },
    "*": {
      l: 200,
      r: 200
    },
    "+": {
      l: 250,
      r: 300
    },
    "=": {
      l: 200,
      r: 200
    },
    "(": {
      l: 200
    },
    ")": {
      r: 200
    },
    "/": {
      l: 100,
      r: 300
    },
    "-": {
      l: 500,
      r: 600
    },
    "\u2013": {
      l: 250,
      r: 300
    },
    "\u2014": {
      l: 250,
      r: 250
    },
    "\u2018": {
      l: 300,
      r: 600
    },
    "\u2019": {
      l: 300,
      r: 600
    },
    "\u201C": {
      l: 400,
      r: 400
    },
    "\u201D": {
      l: 400,
      r: 400
    },
    "_": {
      l: 100,
      r: 200
    },
    "\\": {
      l: 100,
      r: 300
    },
    "|": {
      l: 200,
      r: 200
    },
    "\u201A": {
      l: 400,
      r: 400
    },
    "\u201E": {
      l: 400,
      r: 400
    },
    "\u2039": {
      l: 400,
      r: 400
    },
    "\u203A": {
      l: 300,
      r: 600
    },
    "\xAB": {
      l: 300,
      r: 400
    },
    "\xBB": {
      l: 300,
      r: 400
    },
    "\xA1": {
      l: 100
    },
    "\xBF": {
      l: 100
    },
    "{": {
      l: 400,
      r: 200
    },
    "}": {
      l: 200,
      r: 400
    },
    "<": {
      l: 200,
      r: 100
    },
    ">": {
      l: 100,
      r: 200
    }
  }
};
var FAMILY_TO_TABLE = {
  "eb garamond": "ebg",
  "palatino": "ppl",
  "palatino linotype": "ppl",
  "urw palladio l": "ppl",
  "tex gyre pagella": "ppl",
  "book antiqua": "ppl",
  "times": "ptm",
  "times new roman": "ptm",
  "liberation serif": "ptm",
  "tex gyre termes": "ptm",
  "nimbus roman": "ptm",
  "nimbus roman no9 l": "ptm",
  "charter": "bch",
  "bitstream charter": "bch",
  "charter bt": "bch",
  "xcharter": "bch",
  "minion": "pmn",
  "minion pro": "pmn",
  "minion 3": "pmn",
  "urw garamond": "ugm",
  "garamond no 8": "ugm",
  "garamondno8": "ugm",
  "garamond": "ugm"
};
function fontProtrusion(familyList) {
  const first = familyList.split(",")[0].trim().replace(/^["']+|["']+$/g, "").toLowerCase();
  const id = FAMILY_TO_TABLE[first];
  return id === void 0 ? void 0 : TABLES[id];
}

// src/core/line-fit.ts
function lineAdjustmentRatio(naturalWidth, targetWidth, stretch, shrink, hasInfiniteStretch) {
  if (naturalWidth < targetWidth) {
    return hasInfiniteStretch ? 0 : stretch > 0 ? (targetWidth - naturalWidth) / stretch : Infinity;
  }
  if (naturalWidth > targetWidth) {
    return shrink > 0 ? (naturalWidth - targetWidth) / -shrink : -Infinity;
  }
  return 0;
}

// src/core/breaker.ts
function breakParagraph(para, widths, opts) {
  if (para.firstBoxAfter[0] === para.items.length) {
    return {
      breakpoints: [para.items.length - 1],
      pass: 1,
      overfull: [false],
      demerits: 0,
      endingMinWidth: opts.lastLineMinWidth
    };
  }
  let emergency = 0;
  if (opts.emergencyStretch === "auto") {
    for (const run of para.runs) emergency = Math.max(emergency, 12 * run.space.width);
  } else {
    emergency = opts.emergencyStretch;
  }
  let end = null;
  let pass = 1;
  let achieved = opts.lastLineMinWidth;
  const hunt = minWidth => {
    const o = {
      ...opts,
      lastLineMinWidth: minWidth
    };
    let e = null;
    let p = 1;
    if (o.pretolerance >= 0) {
      e = attempt(para, widths, o, {
        tolerance: o.pretolerance,
        hyphens: false,
        extraStretch: 0,
        rescue: false,
        strictEnding: true
      });
    }
    if (e === null) {
      p = 2;
      e = attempt(para, widths, o, {
        tolerance: o.tolerance,
        hyphens: true,
        extraStretch: 0,
        rescue: false,
        strictEnding: true
      });
    }
    return {
      end: e,
      pass: p
    };
  };
  if (opts.lastLineMinWidth > 0) {
    var _hunt = hunt(opts.lastLineMinWidth);
    end = _hunt.end;
    pass = _hunt.pass;
    if (end === null) {
      let lo = 1;
      let hi = Math.min(15, Math.ceil(opts.lastLineMinWidth * 16) - 1);
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        const r = hunt(mid / 16);
        if (r.end !== null) {
          end = r.end;
          pass = r.pass;
          achieved = mid / 16;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
    }
  }
  const ladder = o => {
    let e = null;
    let p = 1;
    if (o.pretolerance >= 0) {
      e = attempt(para, widths, o, {
        tolerance: o.pretolerance,
        hyphens: false,
        extraStretch: 0,
        rescue: false,
        strictEnding: false
      });
    }
    if (e === null) {
      p = 2;
      e = attempt(para, widths, o, {
        tolerance: o.tolerance,
        hyphens: true,
        extraStretch: 0,
        rescue: false,
        strictEnding: false
      });
    }
    if (e === null && emergency > 0) {
      p = 3;
      e = attempt(para, widths, o, {
        tolerance: o.tolerance,
        hyphens: true,
        extraStretch: emergency,
        rescue: false,
        strictEnding: false
      });
    }
    if (e === null) e = attempt(para, widths, o, {
      tolerance: INF_BAD,
      hyphens: true,
      extraStretch: emergency,
      rescue: true,
      strictEnding: false
    });
    return {
      end: e,
      pass: p
    };
  };
  if (opts.lastLineMinWidth > 0 && end !== null && achieved < opts.lastLineMinWidth) {
    const off = ladder({
      ...opts,
      lastLineMinWidth: 0
    });
    if (off.end !== null && renderedEndingWidth(para, widths, off.end, achieved) + 1e-9 >= renderedEndingWidth(para, widths, end, achieved)) {
      end = off.end;
      pass = off.pass;
    }
  } else if (end === null && opts.lastLineMinWidth > 0) {
    const bounded = attempt(para, widths, opts, {
      tolerance: opts.tolerance,
      hyphens: true,
      extraStretch: 0,
      rescue: false,
      strictEnding: false
    });
    const off = ladder({
      ...opts,
      lastLineMinWidth: 0
    });
    const v = opts.lastLineMinWidth;
    achieved = v;
    if (bounded !== null && (off.end === null || renderedEndingWidth(para, widths, bounded, v) > renderedEndingWidth(para, widths, off.end, v) + 1e-9)) {
      end = bounded;
      pass = 2;
    } else {
      end = off.end;
      pass = off.pass;
    }
  } else if (end === null) {
    var _ladder = ladder(opts);
    end = _ladder.end;
    pass = _ladder.pass;
  }
  if (end === null) throw new Error("justif: rescue pass failed (bug)");
  const breakpoints = [];
  const overfull = [];
  for (let node = end; node !== null && node.item >= 0; node = node.prev) {
    breakpoints.push(node.item);
    overfull.push(node.overfull);
  }
  breakpoints.reverse();
  overfull.reverse();
  return {
    breakpoints,
    pass,
    overfull,
    demerits: end.totalDemerits,
    endingMinWidth: achieved
  };
}
function renderedEndingWidth(para, widths, end, minWidth) {
  const items = para.items,
    cumW = para.cumW,
    cumY = para.cumY,
    cumTrackY = para.cumTrackY,
    cumExpY = para.cumExpY,
    firstBoxAfter = para.firstBoxAfter;
  const from = end.prev;
  const start = from === null ? firstBoxAfter[0] : from.start;
  const line = from === null ? 0 : from.line;
  const b = end.item;
  let L = cumW[b] - cumW[start];
  const startItem = items[start];
  if (startItem !== void 0 && startItem.type === ItemType.Box) {
    L -= line === 0 ? startItem.lpFirst : startItem.lp;
  }
  const endBox = breakEndBox(para, b);
  L -= rpAt(items[b], endBox);
  const need = minWidth * lineWidthAt(widths, line) - L;
  if (need <= 0) return L;
  const trackY = cumTrackY[b] - cumTrackY[start];
  const glueOnly = Math.max(0, cumY[b] - cumY[start] - trackY - (endBox?.hangStretch ?? 0));
  const flexY = trackY + (cumExpY[b] - cumExpY[start]);
  return endingFloorRatio(need, glueOnly, flexY, maxEndingStretch(minWidth)) !== null ? L + need : L;
}
var slotOf = new Int32Array(0);
var slotStamp = new Int32Array(0);
var stamp = 0;
function attempt(para, widths, opts, mode) {
  const tolerance = mode.tolerance,
    allowHyphens = mode.hyphens,
    extraStretch = mode.extraStretch,
    rescue = mode.rescue,
    strictEnding = mode.strictEnding;
  const items = para.items,
    cumW = para.cumW,
    cumY = para.cumY,
    cumYfil = para.cumYfil,
    cumZ = para.cumZ,
    cumExpY = para.cumExpY,
    cumExpZ = para.cumExpZ,
    cumTrackY = para.cumTrackY,
    firstBoxAfter = para.firstBoxAfter;
  const lastBoxBefore = para.lastBoxBefore;
  const n = items.length;
  const lpAdjAt = (start, line) => {
    const it = items[start];
    if (it === void 0 || it.type !== ItemType.Box) return 0;
    return line === 0 ? it.lpFirst : it.lp;
  };
  const firstStart = firstBoxAfter[0];
  let active = {
    item: -1,
    start: firstStart,
    line: 0,
    fitness: Fitness.Decent,
    flagged: false,
    overfull: false,
    totalDemerits: 0,
    prev: null,
    next: null,
    lpAdj: lpAdjAt(firstStart, 0),
    lineW: lineWidthAt(widths, 0)
  };
  const easyLine = typeof widths === "number" ? 0 : Math.max(0, widths.length - 1);
  let candN = 0;
  const candFrom = [];
  const candFit = [];
  const candDem = [];
  const candOver = [];
  const cap = 4 * (n + 2);
  if (slotOf.length < cap || stamp > 2147483647 - cap) {
    slotOf = new Int32Array(cap);
    slotStamp = new Int32Array(cap);
    stamp = 0;
  }
  for (let b = 0; b < n; b++) {
    const it = items[b];
    let p;
    let flagged;
    let penWidth;
    if (it.type === ItemType.Glue) {
      const prev = items[b - 1];
      if (prev === void 0 || prev.type !== ItemType.Box) continue;
      p = 0;
      flagged = false;
      penWidth = 0;
    } else if (it.type === ItemType.Penalty) {
      if (it.penalty >= INF_PENALTY) continue;
      if (it.hyphen && !allowHyphens) continue;
      p = it.penalty;
      flagged = it.flagged;
      penWidth = it.width;
    } else {
      continue;
    }
    const lastBox = lastBoxBefore[b];
    const endBox = lastBox < 0 ? void 0 : items[lastBox];
    const rp = rpAt(it, endBox);
    const hangStretch = endBox?.hangStretch ?? 0;
    const hangShrink = endBox?.hangShrink ?? 0;
    const forced = it.type === ItemType.Penalty && it.penalty <= -INF_PENALTY;
    const wB = cumW[b];
    const yB = cumY[b] - hangStretch;
    const yFilB = cumYfil[b];
    const zB = cumZ[b] - hangShrink;
    const eyB = cumExpY[b];
    const ezB = cumExpZ[b];
    const tyB = cumTrackY[b];
    candN = 0;
    stamp++;
    let bestDead = null;
    let bestDeadOver = Infinity;
    let prevLink = null;
    let node = active;
    while (node !== null) {
      const next = node.next;
      const start = node.start;
      let L = wB - cumW[start] + penWidth;
      L -= node.lpAdj;
      L -= rp;
      const W = node.lineW;
      const Y = yB - cumY[start] + (eyB - cumExpY[start]);
      const Yfil = yFilB - cumYfil[start];
      const Z = zB - cumZ[start] + (ezB - cumExpZ[start]);
      const r = lineAdjustmentRatio(L, W, Y, Z, Yfil > 0);
      if (r >= -1) {
        let bad;
        let filLine = false;
        let filReachable = true;
        let filFitness = null;
        if (L >= W) {
          bad = badness(L - W, Z);
        } else if (Yfil > 0) {
          filLine = true;
          const need = opts.lastLineMinWidth * W - L;
          if (need <= 0) {
            bad = 0;
          } else {
            const trackY = tyB - cumTrackY[start];
            const glueOnly = Math.max(0, yB - cumY[start] - trackY);
            const flexY = trackY + (eyB - cumExpY[start]);
            const rFloor = endingFloorRatio(need, glueOnly, flexY, maxEndingStretch(opts.lastLineMinWidth));
            filReachable = rFloor !== null;
            filFitness = rFloor !== null ? fitness(false, 100 * rFloor * rFloor * rFloor) : Fitness.Decent;
            const rFil = need / (glueOnly + flexY + extraStretch);
            bad = 100 * rFil * rFil * rFil;
            if (!strictEnding) bad = Math.min(bad, INF_BAD);
          }
        } else {
          bad = badness(W - L, Y + extraStretch);
        }
        if (bad <= tolerance || filLine && (strictEnding ? filReachable : true)) {
          const fit = filFitness ?? fitness(L > W, bad);
          let d = filLine ? demeritsUncapped(opts.linePenalty, bad, p) : demerits(opts.linePenalty, bad, p);
          if (flagged && node.flagged) d += opts.doubleHyphenDemerits;
          if (Math.abs(fit - node.fitness) > 1) d += opts.adjDemerits;
          if (forced && b === n - 1 && node.flagged) d += opts.finalHyphenDemerits;
          const total = node.totalDemerits + d;
          const key = Math.min(node.line, easyLine) * 4 + fit;
          const slot = slotStamp[key] === stamp ? slotOf[key] : -1;
          if (slot < 0) {
            slotStamp[key] = stamp;
            slotOf[key] = candN;
            candFrom[candN] = node;
            candFit[candN] = fit;
            candDem[candN] = total;
            candOver[candN] = false;
            candN++;
          } else if (total < candDem[slot] ||
          // Collapsed classes tie often in emergency and rescue passes;
          // choose a stable representative that uses fewer lines.
          total === candDem[slot] && node.line < candFrom[slot].line) {
            candFrom[slot] = node;
            candFit[slot] = fit;
            candDem[slot] = total;
            candOver[slot] = false;
          }
        }
      }
      if (r < -1 || forced) {
        if (prevLink === null) active = next;else prevLink.next = next;
        const over = L - W - Z;
        if (bestDead === null || over < bestDeadOver || over === bestDeadOver && node.totalDemerits < bestDead.totalDemerits) {
          bestDead = node;
          bestDeadOver = over;
        }
      } else {
        prevLink = node;
      }
      node = next;
    }
    if (rescue && active === null && candN === 0 && bestDead !== null) {
      candFrom[0] = bestDead;
      candFit[0] = Fitness.Decent;
      candDem[0] = bestDead.totalDemerits;
      candOver[0] = bestDeadOver > 0;
      candN = 1;
    }
    if (candN > 0) {
      const start = firstBoxAfter[b + 1];
      for (let q = 0; q < candN; q++) {
        const from = candFrom[q];
        const line = from.line + 1;
        const fresh = {
          item: b,
          start,
          line,
          fitness: candFit[q],
          flagged,
          overfull: candOver[q],
          totalDemerits: candDem[q],
          prev: from,
          next: active,
          lpAdj: lpAdjAt(start, line),
          lineW: lineWidthAt(widths, line)
        };
        active = fresh;
      }
    }
    if (active === null) return null;
  }
  let best = null;
  for (let node = active; node !== null; node = node.next) {
    if (best === null || node.totalDemerits < best.totalDemerits) best = node;
  }
  return best;
}

// src/core/layout.ts
function solveExpansion(need, glueFlex, expFlex, limit, step) {
  const frac = Math.min(need / (glueFlex + expFlex), 1);
  const limitPct = 100 * limit;
  const stepPct = 100 * step;
  const quantized = stepPct > 0 ? Math.round(frac * limitPct / stepPct) * stepPct : frac * limitPct;
  return Math.min(quantized, limitPct);
}
function expansionGainAt(para, start, end, stretchPct, limitPct) {
  const key = Math.round(stretchPct * 1e3) / 1e3;
  const deltaPct = stretchPct - 100;
  let gain = 0;
  for (let i = start; i < end; i++) {
    const it = para.items[i];
    if (it.type !== ItemType.Box) continue;
    const ratio = para.runs[it.run]?.expansionRatios?.get(key);
    if (ratio !== void 0) {
      gain += (it.width - (it.padPx ?? 0)) * (ratio - 1);
    } else if (deltaPct >= 0) {
      gain += it.expStretch * (deltaPct / limitPct);
    } else {
      gain += -it.expShrink * (-deltaPct / limitPct);
    }
  }
  return gain;
}
function layoutLines(para, breaks, widths, opts, priorLastLineFit) {
  if (priorLastLineFit === void 0) {
    priorLastLineFit = {
      sum: 0,
      count: 0
    };
  }
  const items = para.items,
    cumW = para.cumW,
    cumY = para.cumY,
    cumYfil = para.cumYfil,
    cumZ = para.cumZ,
    cumExpY = para.cumExpY,
    cumExpZ = para.cumExpZ,
    cumTrackY = para.cumTrackY,
    firstBoxAfter = para.firstBoxAfter;
  if (firstBoxAfter[0] === items.length) return [];
  const lines = [];
  const exp = opts.expansion;
  for (let i = 0; i < breaks.breakpoints.length; i++) {
    const b = breaks.breakpoints[i];
    const prev = i === 0 ? -1 : breaks.breakpoints[i - 1];
    const start = prev < 0 ? firstBoxAfter[0] : firstBoxAfter[prev + 1];
    const it = items[b];
    const isPenalty = it.type === ItemType.Penalty;
    let end = b;
    while (end > start) {
      const tail = items[end - 1];
      if (tail.type === ItemType.Penalty) end--;else if (tail.type === ItemType.Glue && tail.stretchFil > 0) end--;else break;
    }
    let leftHang = 0;
    const startItem = items[start];
    if (startItem !== void 0 && startItem.type === ItemType.Box) {
      leftHang = i === 0 ? startItem.lpFirst : startItem.lp;
    }
    const endBox = breakEndBox(para, b);
    const rightHang = rpAt(it, endBox);
    const hangStretch = endBox?.hangStretch ?? 0;
    const hangShrink = endBox?.hangShrink ?? 0;
    const penWidth = isPenalty ? it.width : 0;
    const L = cumW[b] - cumW[start] + penWidth - leftHang - rightHang;
    const W = lineWidthAt(widths, i);
    const Yg = Math.max(0, cumY[b] - cumY[start] - hangStretch);
    const Yfil = cumYfil[b] - cumYfil[start];
    const Zg = Math.max(0, cumZ[b] - cumZ[start] - hangShrink);
    const Ye = cumExpY[b] - cumExpY[start];
    const Ze = cumExpZ[b] - cumExpZ[start];
    const Yt = cumTrackY[b] - cumTrackY[start];
    const delta = W - L;
    let ratio = lineAdjustmentRatio(L, W, Yg + Ye, Zg + Ze, Yfil > 0);
    let fontStretch = 100;
    let glueRatio = 0;
    let overflowPx = 0;
    let overfull = breaks.overfull[i] ?? false;
    let paintedTokenTrackRatio = null;
    let filTrack = null;
    const glueRatioFor = need => need >= 0 ? Yg > 0 ? need / Yg : 0 : Zg > 0 ? need / Zg : 0;
    if (delta > 0 && Yfil === 0) {
      if (exp !== false && Ye > 0) {
        fontStretch = 100 + solveExpansion(delta, Yg, Ye, exp.max, exp.step);
        const gain = expansionGainAt(para, start, end, fontStretch, 100 * exp.max);
        glueRatio = glueRatioFor(delta - gain);
      } else {
        glueRatio = glueRatioFor(delta);
      }
    } else if (delta > 0 && Yfil > 0) {
      const glueOnly = Yg - Yt;
      let fitTarget = 0;
      if (opts.lastLineFit > 0 && priorLastLineFit.count + lines.length > 0) {
        let sum = priorLastLineFit.sum;
        for (const l of lines) sum += l.glueRatio;
        fitTarget = opts.lastLineFit * (sum / (priorLastLineFit.count + lines.length));
      }
      let floored = false;
      const minWidth = breaks.endingMinWidth ?? opts.lastLineMinWidth;
      if (minWidth > 0) {
        const need = minWidth * W - L;
        const maxR = maxEndingStretch(minWidth);
        if (need > 0) {
          const rFloor = endingFloorRatio(need, Math.max(0, glueOnly), Yt + Ye, maxR);
          if (rFloor !== null) {
            const flexCap = Math.min(maxR, 1);
            let gain = 0;
            if (exp !== false && Ye > 0) {
              const stepPct = exp.step * 100;
              let pct = Math.floor(Math.min(rFloor, flexCap) * exp.max * 100 / stepPct) * stepPct;
              while (pct > 0) {
                gain = expansionGainAt(para, start, end, 100 + pct, 100 * exp.max);
                if (gain <= need) break;
                pct -= stepPct;
                gain = 0;
              }
              if (pct > 0) fontStretch = 100 + pct;
            }
            const residual = need - gain;
            let rGlue = residual / (glueOnly + Yt);
            const rTrack = Math.min(Math.max(rGlue, 0), flexCap);
            if (rGlue > flexCap && glueOnly > 0) {
              rGlue = (residual - Yt * flexCap) / glueOnly;
            }
            if (rGlue <= maxR + 1e-9) {
              glueRatio = glueOnly > 0 ? Math.min(Math.max(rGlue, fitTarget), (delta - gain - rTrack * Yt) / glueOnly) : 0;
              filTrack = rTrack;
              floored = true;
            } else {
              fontStretch = 100;
            }
          }
        } else if (fitTarget < 0) {
          const Zfil = cumZ[b] - cumZ[start] - hangShrink;
          if (Zfil > 0) fitTarget = Math.max(fitTarget, need / Zfil);
        }
      }
      if (!floored && glueOnly > 0) {
        glueRatio = Math.max(-1, Math.min(fitTarget, delta / glueOnly));
      }
    } else if (delta < 0) {
      let need = delta;
      if (exp !== false && Ze > 0) {
        fontStretch = 100 - solveExpansion(-delta, Zg, Ze, exp.shrink, exp.step);
        const gain = expansionGainAt(para, start, end, fontStretch, 100 * exp.shrink);
        need = delta - gain;
      }
      glueRatio = glueRatioFor(need);
      overflowPx = Math.max(0, -need - Zg);
      if (overflowPx > 1e-6) overfull = true;
      if (overflowPx > 1e-6 && opts.protrusion === false && opts.tracking !== false) {
        let soleBox = null;
        for (let j = start; j < end; j++) {
          const candidate = items[j];
          if (candidate.type !== ItemType.Box) continue;
          if (soleBox !== null) {
            soleBox = null;
            break;
          }
          soleBox = candidate;
        }
        if (soleBox?.paintedEnd === true && soleBox.trackShrink > 0 &&
        // Never reverse/collapse a pathological token just to honor a
        // huge author inset: emergency letterfit may at most double the
        // configured shrink budget (−6% under the public default).
        overflowPx <= soleBox.trackShrink + 1e-9) {
          paintedTokenTrackRatio = -1 - overflowPx / soleBox.trackShrink;
          overflowPx = 0;
          overfull = false;
        }
      }
    }
    if (glueRatio < -1) glueRatio = -1;
    let trackRatio = paintedTokenTrackRatio ?? (Yfil > 0 ? filTrack ?? Math.min(glueRatio, 0) : glueRatio);
    if (Yfil === 0 && glueRatio > 1 && Yt > 0) {
      trackRatio = 1;
      const glueOnly = Yg - Yt;
      glueRatio = glueOnly > 0 ? (glueRatio * Yg - Yt) / glueOnly : 1;
    }
    lines.push({
      start,
      end,
      hyphenated: isPenalty && it.width > 0,
      ratio,
      fontStretch,
      glueRatio,
      trackRatio,
      leftHang,
      rightHang,
      overfull,
      overflowPx,
      width: W
    });
  }
  return lines;
}
function lineText(para, line) {
  let out = "";
  for (let i = line.start; i < line.end; i++) {
    const it = para.items[i];
    if (it.type === ItemType.Box) out += it.text;else if (it.type === ItemType.Glue && it.cjk !== true) out += " ";
  }
  if (line.hyphenated) out += "\u2010";
  return out;
}
export { CJK_CHAR, Fitness, INF_BAD, INF_PENALTY, ItemType, UNDERFULL_RATIO, badness, breakEndBox, breakParagraph, breakRp, buildItems, caseTransformedText, cjkBreakAllowed, composeProtrusion, defaultBreakOptions, defaultBuildOptions, demerits, demeritsUncapped, fitness, fontProtrusion, graphemes, hangingCharacters, hangingPunctuation, kinsokuNotAtLineEnd, kinsokuNotAtLineStart, latinProtrusion, layoutLines, lineText, lineWidthAt, maxEndingStretch, normalizeHangingPunctuation, protrusionCodes, textMakesBox, withSums };
//# sourceMappingURL=chunk-C566JZY6.js.map
//# sourceMappingURL=chunk-C566JZY6.js.map