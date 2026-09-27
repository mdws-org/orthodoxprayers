#!/usr/bin/env python3
"""Render the Communion sections of Gutenberg #34981 as three pages.

  communion/canon/         Canon in Preparation for Holy Communion   (lines 2773-3025)
  communion/               Prayers in Preparation for Holy Communion (lines 3033-3673)
  communion/thanksgiving/  Prayers of Thanksgiving After Communion   (lines 3681-3849)

Run through build_pages.py, which adds glossary notes and page links afterwards.
"""
import html
import re

from book import SOURCE, write_page

PAGES = {
    "communion/canon/": dict(
        lines=(2773, 3025), rotate=29, bar="bar13", label="Holy Communion",
        h1="The Canon of Preparation", attribution="For Holy Communion",
        description="The Canon in Preparation for Holy Communion, read the evening before.",
    ),
    "communion/": dict(
        lines=(3033, 3673), rotate=30, bar="bar2", label="Holy Communion",
        h1="Before Communion", attribution="Prayers in Preparation for Holy Communion",
        description="The prayers read in preparation for Holy Communion.",
    ),
    "communion/thanksgiving/": dict(
        lines=(3681, 3849), rotate=31, bar="bar19", label="Holy Communion",
        h1="After Communion", attribution="Prayers of Thanksgiving",
        description="The prayers of thanksgiving after Holy Communion.",
    ),
}

# Readings where the page departs from the book, each asserted by check_text_communion.py.
CORRECTIONS = {
    # The sentence ends the paragraph with no stop in the source.
    "place in the Lord the hope of\nmy salvation": "place in the Lord the hope of\nmy salvation.",
}
# A line of St. Simeon's poem that the source breaks across two lines.
VERSE_JOINS = {"  that neither the greatness of my": "transgressions"}
HEAD = re.compile(r"^(\d+(st|nd|rd|th) Prayer|Another Prayer|A Prayer|At the Liturgy)")
CANON_LINK = "Canon of Preparation for Holy Communion"


def typeset(s):
    s = s.replace("--", "\u2014").replace("'", "\u2019")
    s = re.sub(r'(^|[\s(\u2014])"', "\\1\u201c", s)
    s = s.replace('"', "\u201d")
    s = html.escape(s, quote=False)
    s = re.sub(r"_(\([^)]*\))_", r'<span class="rubric">\1</span>', s)
    return re.sub(r"(?<!>)(\(\d+ times\))$", r'<span class="rubric">\1</span>', s)


def paragraphs(a, b):
    """Yield (lines, blank lines before) for the source's blank-separated paragraphs."""
    text = "\n".join(SOURCE[a - 1:b])
    for old, new in CORRECTIONS.items():
        text = text.replace(old, new)
    buf, blanks, gap = [], 0, 2
    for line in text.split("\n") + [""]:
        if line.strip():
            if not buf:
                gap = blanks
            buf.append(line)
            blanks = 0
        else:
            if buf:
                yield buf, gap
                buf = []
            blanks += 1


def verse_lines(para):
    out = []
    for line in para:
        if out and VERSE_JOINS.get(out[-1][1]) == line.strip():
            out[-1] = (out[-1][0], out[-1][1] + " " + line.strip())
            continue
        out.append((line.startswith("      "), line.rstrip()))
    return [(indented, line.strip()) for indented, line in out]


def blocks(a, b):
    in_psalm = False
    for para, gap in paragraphs(a, b):
        first = para[0].strip()
        text = " ".join(l.strip() for l in para)
        centered = para[0].startswith(" " * 10)
        if set(text) <= {"*", " "}:
            # The book's asterism closes each Liturgy's troparia, so the
            # ending after the last one belongs to all three.
            yield "break", ""
            continue
        if centered:
            head = re.sub(r"^ODE ", "Ode ", first)
            in_psalm = head.startswith("Psalm")
            yield "psalm-head", head
        elif text.startswith("_") and text.endswith("_"):
            in_psalm = False
            yield "rubric-line", text[1:-1]
        elif all(l.startswith("  ") for l in para) and len(para) > 1:
            if in_psalm:
                yield "p", text
            else:
                yield "verse", verse_lines(para)
        elif gap >= 2 and HEAD.match(first):
            in_psalm = False
            yield "psalm-head", first.rstrip(".")
            if len(para) == 2:
                yield "inscription", para[1].strip()
        elif gap >= 2 and re.fullmatch(r"Kontakion, Tone \d:", text):
            yield "inscription", text.rstrip(":")
        elif gap >= 2 and text.endswith(":") and len(text) < 40:
            yield "rubric-line", text
        elif text.startswith("Irmos: "):
            yield "inscription", "Irmos"
            yield "p", text[len("Irmos: "):]
        else:
            in_psalm = False
            yield "p", text


# The two verses of Psalm 50 said before the canon's troparia, and the
# doxology lines before its last ones.
REFRAIN = re.compile(r"(Create in me a clean heart, O God, and put a new and right spirit within me\."
                     r"|Cast me not away from Thy presence, and take not Thy Holy Spirit from me\."
                     r"|(Glory to|Let us bless) the Father.*|Now and ever.*)")


def render(a, b, refrains=False):
    out, opened = [], False
    for kind, text in blocks(a, b):
        if kind == "verse":
            out.append('<div class="verse">')
            out.extend(f'    <p{" class=\"in\"" if indented else ""}>{typeset(t)}</p>' for indented, t in text)
            out.append("</div>")
            continue
        if kind == "break":
            out.append('<hr class="rule" />')
            continue
        body = typeset(text)
        if CANON_LINK in body:
            body = body.replace(CANON_LINK, f'<a href="canon/">{CANON_LINK}</a>')
        if kind == "p" and opened and refrains and REFRAIN.fullmatch(text):
            out.append(f'<p class="refrain">{body}</p>')
        elif kind == "p":
            out.append(f'<p{"" if opened else " class=\"opening\""}>{body}</p>')
            opened = True
        elif kind == "psalm-head":
            out.append(f'<h2 class="psalm-head">{body}</h2>')
        else:
            out.append(f'<div class="{kind}">{body}</div>')
    return "\n".join(" " * 12 + line for line in out)


def main():
    for route, page in PAGES.items():
        print(write_page(route, page, render(*page["lines"], refrains=route == "communion/canon/")))


if __name__ == "__main__":
    main()
