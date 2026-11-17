#!/usr/bin/env python3
"""Mark the rubrics on every page the way the current service books set them.

The St. Tikhon's Monastery Press books set a direction in red roman and keep
italic for a note and for a passage that explains a service. A word they
emphasise inside a rubric is in small caps, never full capitals, and a role
is in small caps only where the rubric names who says the words that follow
("The READER continues:").

This script adds to each page, without changing a word of it:

  data-rubric="note"     on a .rubric-line that begins NOTE
  data-rubric="preface"  on a .rubric-line that explains and does not
                         direct (PREFACES below: the opening words of each)
  <span class="sc"> around words the source sets in capitals, and around a
                   role in a rubric that cues a speaker

  data-leaf="open"   on the .rubric-line that introduces a passage said
                     only in some cases, and an empty <span class="leaf">
                     at the end of the last paragraph of that passage,
                     tied to the paragraph's last word so the leaf is
                     never alone on a line (OPTIONAL below)

prayers.css sets .rubric and .rubric-line roman, a line with data-rubric
italic, .sc in small caps, and a red leaf before an opening mark and after
a closing one, as the service books bracket such a passage. The class stays "rubric-line" alone, which
is how the text checks and the glossary step find a rubric. Running the script again leaves a page as it is.

Run from anywhere: python3 scripts/set_rubrics.py (build_pages.py runs it
after the glossary step, whose buttons sit inside rubric lines).
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# A rubric line that explains the service or the page: it stays italic.
PREFACES = (
    "A tradition has developed in the Church",
    "It is the tradition of the Russian Church",
    "To be read daily by every monastic",
    "N. marks where a name is supplied",
    "Where a prayer is named in the text",
    "Where the Hours mark",
    "Said three times, or twelve, or forty",
    "Named as one in the Psalter",
    "Those beginning with a modest rule",
    "Prayers of Supplication, corresponding",
)
# A passage said only in some cases: the page, the opening words of the
# rubric line that introduces it, and how many blocks after that line belong
# to it. A block is one element at the rubric line's own depth.
OPTIONAL = (
    ("typika", "In some parishes it is the custom", 3),
    ("typika", "Then on every day except Saturday", 2),
    ("compline", "NOTE: In the absence of a priest, laymen begin", 1),
    ("compline", "When a priest is serving, the Reader concludes", 3),
    ("compline", "In the absence of a priest, a layman says", 1),
    ("communion", "A priest uses the following", 1),
    ("communion", "NOTE: On Great and Holy Thursday", 1),
    ("commemorations", "(In Monasteries)", 1),
    ("commemorations", "(In Parishes)", 1),
    ("morning/rule", "Some pious Christians use the following", 5),
)
CLOSE = '<span class="leaf" aria-hidden="true"></span>'
TIE = '<span class="nw leaf-tie">'
OPEN_MARK = re.compile(r' data-leaf="open"')
CLOSE_MARK = re.compile(re.escape(TIE) + r"(.*?)" + re.escape(CLOSE) + r"</span>")
# The end of a paragraph: its last word, or the inline element it ends with.
LAST = re.compile(r"(<span\b[^>]*>[^<]*</span>|[^\s<>]+)</p>$")
ROLES = r"Reader|Choir|Priest|Deacon|Singers|People|Congregation"
CAPITALS = re.compile(r"\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b")
CUE = re.compile(r"\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b|\b(?:" + ROLES + r")\b")
LINE = re.compile(r'<div class="rubric-line"(?: data-rubric="[a-z]+")?>(.*?)</div>', re.S)
INLINE = re.compile(r'<span class="rubric">(.*?)</span>', re.S)
SC = re.compile(r'<span class="sc">(.*?)</span>', re.S)
# Text outside tags and outside a glossary button.
PIECE = re.compile(r"(<button\b.*?</button>|<[^>]+>)", re.S)
BUTTON = re.compile(r"(<button\b[^>]*>)(.*?)(</button>)", re.S)


def plain(inner):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", inner))).strip()


def small_caps(inner, cue):
    pattern = CUE if cue else CAPITALS

    def wrap(m):
        return m.group(0) if m.group(0) == "NOTE" else f'<span class="sc">{m.group(0)}</span>'

    def piece(i, p):
        if not i % 2:
            return pattern.sub(wrap, p)
        # A glossary button keeps its tag; the word on it is marked like any other.
        m = BUTTON.fullmatch(p)
        return m.group(1) + pattern.sub(wrap, m.group(2)) + m.group(3) if m else p

    return "".join(piece(i, p) for i, p in enumerate(PIECE.split(inner)))


def mark_line(m):
    inner = m.group(1)
    text = plain(inner)
    if re.match(r"\[?NOTE\b", text):
        return f'<div class="rubric-line" data-rubric="note">{inner}</div>'
    if text.startswith(PREFACES):
        return f'<div class="rubric-line" data-rubric="preface">{inner}</div>'
    cue = text.endswith(":") and re.search(r"\b(?:" + ROLES + r")\b", text) is not None
    return f'<div class="rubric-line">{small_caps(inner, cue)}</div>'


def mark_inline(m):
    return f'<span class="rubric">{small_caps(m.group(1), False)}</span>'


def depth(line):
    return len(line) - len(line.lstrip())


def mark_leaves(text, route):
    """Mark the opening line and the closing paragraph of each optional passage on this page."""
    lines = text.split("\n")
    for page, opens, blocks in OPTIONAL:
        if page != route:
            continue
        found = [i for i, line in enumerate(lines) if '<div class="rubric-line"' in line and plain(line).startswith(opens)]
        if len(found) != 1:
            raise SystemExit(f"set_rubrics: {route}: {len(found)} rubric lines begin {opens!r}, expected 1")
        first = found[0]
        level = depth(lines[first])
        # Walk to the line that starts the last block of the passage.
        last = first
        for _ in range(blocks):
            last += 1
            while depth(lines[last]) != level or lines[last].lstrip().startswith("</"):
                last += 1
        # A block that runs over several lines (a verse) closes on its last paragraph.
        if not re.search(r"</(?:p|div|h2|h3)>\s*$", lines[last]):
            while not (depth(lines[last + 1]) == level and lines[last + 1].lstrip().startswith("</")):
                last += 1
        if not lines[last].lstrip().startswith("<p"):
            raise SystemExit(f"set_rubrics: {route}: the passage after {opens!r} does not end in a paragraph")
        lines[first] = lines[first].replace('<div class="rubric-line"', '<div class="rubric-line" data-leaf="open"', 1)
        if not lines[last].rstrip().endswith("</p>"):
            raise SystemExit(f"set_rubrics: {route}: the last paragraph after {opens!r} does not end on its own line")
        tied, n = LAST.subn(lambda m: TIE + m.group(1) + CLOSE + "</span></p>", lines[last].rstrip())
        if n != 1:
            raise SystemExit(f"set_rubrics: {route}: no last word to tie the leaf to after {opens!r}")
        lines[last] = tied
    return "\n".join(lines)


def main():
    for page in sorted(ROOT.glob("**/index.html")):
        if "vendor" in page.parts:
            continue
        text = page.read_text()
        route = page.parent.relative_to(ROOT).as_posix()
        # Start from the page without this script's own marks, so a second run changes nothing.
        new = INLINE.sub(mark_inline, LINE.sub(mark_line, SC.sub(r"\1", CLOSE_MARK.sub(r"\1", OPEN_MARK.sub("", text)))))
        new = mark_leaves(new, route)
        if new != text:
            page.write_text(new)
            print(page.parent.relative_to(ROOT).as_posix() + "/")


if __name__ == "__main__":
    main()
