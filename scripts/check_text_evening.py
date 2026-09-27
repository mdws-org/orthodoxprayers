#!/usr/bin/env python3
"""Check evening/rule/index.html against Gutenberg #34981 lines 1547-1927, word for word."""
import difflib
import html
import re
import sys
from pathlib import Path

WT = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else Path(__file__).resolve().parent.parent
MODEST = "Those beginning with a modest rule may end here; the numbered prayers are added as the rule grows."
src = "\n".join(Path(__file__).with_name("pg34981.txt").read_text().splitlines()[1546:1927])
# The one reading the site takes from practice rather than the book: the book prints
# "O Christ God" everywhere else and "Christ--God" only here.
SRC_READING, SITE_READING = "Enlighten my eyes, Christ--God,", "Enlighten my eyes, O Christ God,"
assert src.count(SRC_READING) == 1
src = src.replace(SRC_READING, SITE_READING)
page = (WT / "evening/rule/index.html").read_text()
body = re.search(r'<div class="prayer">(.*?)\n        </div>', page, re.S).group(1)
blocks = [html.unescape(re.sub(r"<[^>]+>", "", b)).strip() for b in re.findall(r"<(?:p|h2|div)[^>]*>(.*?)</(?:p|h2|div)>", body)]

fails = []
if blocks.count(MODEST) != 1:
    fails.append("modest-rule line missing or repeated")
mi = blocks.index(MODEST)
if not blocks[mi + 1].startswith("1st Prayer") or not blocks[mi - 1].startswith("Lord, have mercy! (12"):
    fails.append("modest-rule line is not between the troparia and the 1st Prayer")
rendered = " ".join(b for b in blocks if b != MODEST)
if rendered.count(SITE_READING) != 1 or "Christ—God" in rendered:
    fails.append("the O Christ God reading is missing or the dash survives")


def norm(s):
    s = s.replace("’", "'").replace("—", "--").replace("_", "")
    return re.sub(r"\s+", " ", s).strip()


a, b = norm(src).split(" "), norm(rendered).split(" ")
words = lambda xs: [re.sub(r"[^\w']", "", x) for x in xs]
if words(a) != words(b):
    fails.append("word sequence differs from the source")
punct = [(a[i1:i2], b[j1:j2]) for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if op != "equal"]
for pair in punct:
    print("punctuation diff:", pair)
if punct != [(["Christ"], ["Christ,"])]:  # the 2nd Prayer's head gains a comma where the source breaks the line
    fails.append(f"unexpected punctuation diffs: {punct}")
for name in ("sw.js",):
    if 'BASE + "evening/rule/"' not in (WT / name).read_text():
        fails.append("evening/rule/ not precached")
if 'href="evening/rule/"' not in (WT / "index.html").read_text():
    fails.append("index does not link evening/rule/")
if "evening" in (WT / "about/index.html").read_text().split("Still to Come")[1]:
    fails.append("About still lists evening prayers as still to come")
print(f"{len(blocks)} blocks, {len(b)} words")
if fails:
    sys.exit("FAIL: " + "; ".join(fails))
print("OK: every word of the source present, in order, unchanged")
