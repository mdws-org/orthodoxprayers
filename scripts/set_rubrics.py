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

prayers.css sets .rubric and .rubric-line roman, a line with data-rubric
italic, and .sc in small caps. The class stays "rubric-line" alone, which
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


def main():
    for page in sorted(ROOT.glob("**/index.html")):
        if "vendor" in page.parts:
            continue
        text = page.read_text()
        # Start from the page without this script's own spans, so a second run changes nothing.
        new = INLINE.sub(mark_inline, LINE.sub(mark_line, SC.sub(r"\1", text)))
        if new != text:
            page.write_text(new)
            print(page.parent.relative_to(ROOT).as_posix() + "/")


if __name__ == "__main__":
    main()
