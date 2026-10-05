#!/usr/bin/env python3
"""Check typika/index.html against the Reader's Service booklet, word for word.

The source is scripts/obednitsa.txt. The page departs from it in four ways,
each applied to the source here and then required of the page: the Beatitudes
and Psalm 33 are Hapgood's (scripts/hapgood.txt), not the booklet's Revised
Standard Version; the chant marks are gone; the paragraph on who may read the
Gospel in church is gone; the notes after the booklet's end mark are gone.
Any other difference fails. Run with --show to print the differences found.
"""
import difflib
import html
import re
import sys
from pathlib import Path

WT = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else Path(__file__).resolve().parent.parent
SHOW = "--show" in sys.argv
SRC = Path(__file__).with_name("obednitsa.txt").read_text().splitlines()
HAPGOOD = Path(__file__).with_name("hapgood.txt").read_text().splitlines()

HEADS = {
    "FIRST ANTIPHON. Psalm 102": "First Antiphon. Psalm 102",
    "SECOND ANTIPHON. Psalm 145": "Second Antiphon. Psalm 145",
    "THIRD ANTIPHON. The Beatitudes.": "Third Antiphon. The Beatitudes",
    "THE INTROIT. Entrance Hymn": "The Introit. Entrance Hymn",
    "THE TRISAGION": "The Trisagion",
    "THE PROKEIMENON": "The Prokeimenon",
    "THE EPISTLE": "The Epistle",
    "THE GOSPEL": "The Gospel",
    "PRAYER TO THE LORD OF HOSTS": "Prayer to the Lord of Hosts",
    "THE SYMBOL OF FAITH": "The Symbol of Faith",
    "PRAYER OF FORGIVENESS": "Prayer of Forgiveness",
    "THE LORD'S PRAYER": "The Lord's Prayer",
    "PSALM 33": "Psalm 33",
    "THE ZADOSTOYNIK. Tone 8": "The Zadostoynik. Tone 8",
    "THE DISMISSAL": "The Dismissal",
}
CUT = ("_According to custom, ONLY the Subdea-_", "_Pastor specifically for this._")
END = "[End of Obednitsa]"
SWAPS = [
    (("Blessed are the poor in spirit:/", "for great is your reward in heaven."), "THE BEATITUDES"),
    (("Reader: I will bless the Lord at all times;", "refuge in Him will be condemned."), "PSALM XXXIV"),
]
# Words of the booklet's RSV passages and of the cut paragraph that must not
# survive on the page, and words of Hapgood's that must.
ABSENT = ["Happy is the man who takes refuge", "those who mourn", "Tonsured Reader", "A bell is tolled"]
PRESENT = ["alway give thanks", "exceeding glad", "Blessed are they that mourn"]


def hapgood(section):
    lines, take = [], False
    for line in HAPGOOD:
        if line.startswith(section + " ("):
            take = True
        elif take and re.match(r"^[A-Z][A-Z ]+\(", line):
            break
        elif take and line.strip():
            lines.append(line.strip())
    assert lines, section
    return lines


def expected():
    lines = [l for l in SRC[SRC.index("[p. 2b]") + 1:] if not l.startswith("[p. ")][2:]
    lines = lines[:lines.index(END) + 1]
    a, b = lines.index(CUT[0]), lines.index(CUT[1])
    del lines[a:b + 1]
    for (start, end), section in SWAPS:
        a, b = lines.index(start), lines.index(end)
        new = hapgood(section)
        if start.startswith("Reader: "):
            new[0] = "Reader: " + new[0]
        lines[a:b + 1] = new
    lines = [HEADS.get(l, l) for l in lines if l.strip() and l != "* * *"]
    # Hyphens that only break a printed line close up; God-bearing keeps its own.
    text = "\n".join(lines).replace("God-\n", "God-")
    text = re.sub(r"-_?\n_?([a-z])", r"\1", text)
    return text


def norm(s):
    s = s.replace("’", "'").replace("—", "--").replace("“", '"').replace("”", '"')
    s = s.replace("_", "").replace("/", "")
    return re.sub(r"\s+", " ", s).strip()


fails = []
page = (WT / "typika/index.html").read_text()
body = re.search(r'<div class="prayer">\n(.*?)\n        </div>\n\n        <div class="finis">', page, re.S).group(1)
blocks = [html.unescape(re.sub(r"<[^>]+>", "", m)).strip()
          for m in re.findall(r'<(?:p|h2|div class="(?:rubric-line|inscription|speaker)")[^>]*>(.*?)</(?:p|h2|div)>', body)]
src = norm(expected()).split(" ")
got = norm(" ".join(blocks)).split(" ")
diffs = [(src[i1:i2], got[j1:j2]) for op, i1, i2, j1, j2 in
         difflib.SequenceMatcher(None, src, got, autojunk=False).get_opcodes() if op != "equal"]
if SHOW:
    for d in diffs:
        print(d)
if diffs:
    fails.append(f"typika: {len(diffs)} differences from the source, first {diffs[:4]}")
plain = html.unescape(re.sub(r"<[^>]+>", "", body))
if "/" in plain:
    fails.append("typika: a chant mark survives")
for words in ABSENT:
    if words in plain:
        fails.append(f"typika: {words!r} should not be on the page")
for words in PRESENT:
    if words not in plain:
        fails.append(f"typika: {words!r} missing")
print(f"typika/index.html: {len(blocks)} blocks, {len(got)} words, {len(diffs)} edits")

index, sw, sitemap = ((WT / f).read_text() for f in ("index.html", "sw.js", "sitemap.xml"))
if 'href="typika/"' not in index:
    fails.append("index does not link typika/")
if 'BASE + "typika/"' not in sw:
    fails.append("typika/ not precached")
if "https://orthodoxprayers.net/typika/<" not in sitemap:
    fails.append("typika/ not in sitemap")
if fails:
    sys.exit("FAIL:\n  " + "\n  ".join(fails))
print("OK: every word of the booklet present, in order, with only the four declared departures")
