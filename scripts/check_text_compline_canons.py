#!/usr/bin/env python3
"""Check Compline and the Three Canons against Gutenberg #34981, word for word.

Every difference between page and source must be one of the EXPECTED edits;
anything else fails. Run with --show to print the differences found.
"""
import difflib
import html
import re
import sys
from pathlib import Path

WT = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else Path(__file__).resolve().parent.parent
SHOW = "--show" in sys.argv
SRC = Path(__file__).with_name("pg34981.txt").read_text().splitlines()

PAGES = {
    "compline/index.html": (844, 1539),
    "canons/index.html": (1935, 2763),
}
EXPECTED = {
    # The book's printed-page cross-references, replaced by links here.
    "compline/index.html": [
        (["before", "(See", "page", "89)."], ["before."]),
        (["point", "(See", "page", "119)."], ["point."]),
        (['us...."', "(page", "68)."], ['us....".']),
        (["(See", "the", "BOOK", "OF", "HOURS)"], []),   # a printed volume the site does not serve
    ],
    # The same, plus the running head repeated above Ode 1, "ODE" set "Ode",
    # and "Irmos:" set as a label without its colon.
    "canons/index.html": [
        # The introduction's sentence about the limits of a pocket-sized book.
        (["not", "attempted", "to", "publish", "a", "large", "selection", "of", "Canons", "in", "the",
          "limited", "space", "of", "what", "is,", "essentially,", "a", '"pocket"', "Prayer", "Book.",
          "We", "have"], []),
        (["Compline", "(p.", "37),"], ["Compline,"]),
        (["printed"], ["set"]),                          # the book's voice about itself, one word
        (["50", "(pp.", "37", "to", "41).", "THE", "THREE", "CANONS", "ODE"], ["50.", "Ode"]),
    ] + [(["ODE"], ["Ode"])] * 7 + [(["Irmos:"], ["Irmos"])] * 8,
}
LINKS = {
    "compline/index.html": ["/canons/", "/communion/canon/", "/evening/rule/#troparia", "#tuesday"],
    "canons/index.html": ["/compline/"],
}


def norm(s):
    s = s.replace("’", "'").replace("—", "--").replace("“", '"').replace("”", '"')
    s = s.replace("_", "")
    return re.sub(r"\s+", " ", s).strip()


fails = []
for page, (a, b) in PAGES.items():
    text = (WT / page).read_text()
    body = re.search(r'<div class="prayer">\n(.*?)\n        </div>\n\n(?:        <nav class="knav">.*?</nav>\n)?        <div class="finis">', text, re.S).group(1)
    blocks = [html.unescape(re.sub(r"<[^>]+>", "", m)).strip()
              for m in re.findall(r"<(?:p|h2|h3|div class=\"(?:rubric-line|inscription)\")[^>]*>(.*?)</(?:p|h2|h3|div)>", body)]
    src = norm("\n".join(SRC[a - 1:b])).split(" ")
    got = norm(" ".join(blocks)).split(" ")
    diffs = [(src[i1:i2], got[j1:j2]) for op, i1, i2, j1, j2 in
             difflib.SequenceMatcher(None, src, got, autojunk=False).get_opcodes() if op != "equal"]
    if SHOW:
        for d in diffs:
            print(page, d)
    if sorted(map(str, diffs)) != sorted(map(str, EXPECTED[page])):
        extra = [d for d in diffs if d not in EXPECTED[page]]
        missing = [e for e in EXPECTED[page] if e not in diffs]
        fails.append(f"{page}: unexpected {extra[:6]} missing {missing[:6]}")
    for href in LINKS[page]:
        if f'href="{href}"' not in body:
            fails.append(f"{page}: no link to {href}")
    print(f"{page}: {len(blocks)} blocks, {len(got)} words, {len(diffs)} edits")

index, sw, sitemap = ((WT / f).read_text() for f in ("index.html", "sw.js", "sitemap.xml"))
for route in ("compline/", "canons/"):
    if f'href="{route}"' not in index:
        fails.append(f"index does not link {route}")
    if f'BASE + "{route}"' not in sw:
        fails.append(f"{route} not precached")
    if f"https://orthodoxprayers.net/{route}<" not in sitemap:
        fails.append(f"{route} not in sitemap")
if fails:
    sys.exit("FAIL:\n  " + "\n  ".join(fails))
print("OK: every word of both sources present, in order; only the expected edits")
