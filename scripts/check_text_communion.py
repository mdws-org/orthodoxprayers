#!/usr/bin/env python3
"""Check the three Communion pages against Gutenberg #34981, word for word.

Every difference between page and source must be one of the EXPECTED edits
below; anything else fails.
"""
import difflib
import html
import re
import sys
from pathlib import Path

WT = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else Path(__file__).resolve().parent.parent
SRC = Path(__file__).with_name("pg34981.txt").read_text().splitlines()

PAGES = {
    "communion/canon/index.html": (2773, 3025),
    "communion/index.html": (3033, 3673),
    "communion/thanksgiving/index.html": (3681, 3849),
}
# (source tokens, page tokens) for each expected edit, per page.
EXPECTED = {
    "communion/canon/index.html": [(["ODE"], ["Ode"])] * 8 + [(["Irmos:"], ["Irmos"])] * 8
                                  + [(["2:"], ["2"])],  # "Kontakion, Tone 2" set as a label
    "communion/index.html": [
        (["Great."], ["Great"]),              # 1st Prayer head: trailing stop dropped
        (["salvation"], ["salvation."]),      # sentence ends the paragraph with no stop in the source
    ],
    "communion/thanksgiving/index.html": [],
}


def norm(s):
    s = s.replace("’", "'").replace("—", "--").replace("“", '"').replace("”", '"')
    s = s.replace("_", "")
    s = re.sub(r"(?m)^\s*(\* )+\*\s*$", "", s)  # asterisms between the Liturgy troparia
    return re.sub(r"\s+", " ", s).strip()


fails = []
for page, (a, b) in PAGES.items():
    text = (WT / page).read_text()
    body = re.search(r'<div class="prayer">\n(.*?)\n        </div>\n\n(?:        <nav class="knav">.*?</nav>\n)?        <div class="finis">', text, re.S).group(1)
    blocks = [html.unescape(re.sub(r"<[^>]+>", "", m)).strip()
              for m in re.findall(r"<(?:p|h2|div class=\"(?:rubric-line|inscription)\")[^>]*>(.*?)</(?:p|h2|div)>", body)]
    src = norm("\n".join(SRC[a - 1:b])).split(" ")
    got = norm(" ".join(blocks)).split(" ")
    diffs = [(src[i1:i2], got[j1:j2]) for op, i1, i2, j1, j2 in
             difflib.SequenceMatcher(None, src, got, autojunk=False).get_opcodes() if op != "equal"]
    if sorted(map(str, diffs)) != sorted(map(str, EXPECTED[page])):
        extra = [d for d in diffs if d not in EXPECTED[page]]
        missing = [e for e in EXPECTED[page] if e not in diffs]
        fails.append(f"{page}: unexpected {extra[:5]} missing {missing[:5]}")
    print(f"{page}: {len(blocks)} blocks, {len(got)} words, {len(diffs)} expected edits")

index = (WT / "index.html").read_text()
sw = (WT / "sw.js").read_text()
for route in ("communion/canon/", "communion/", "communion/thanksgiving/"):
    if f'href="{route}"' not in index:
        fails.append(f"index does not link {route}")
    if f'BASE + "{route}"' not in sw:
        fails.append(f"{route} not precached")
    if f"https://orthodoxprayers.net/{route}<" not in (WT / "sitemap.xml").read_text():
        fails.append(f"{route} not in sitemap")
if 'href="canon/"' not in (WT / "communion/index.html").read_text():
    fails.append("the preparation page does not link the canon")
if fails:
    sys.exit("FAIL:\n  " + "\n  ".join(fails))
print("OK: every word of the three sources present, in order; only the expected edits")
