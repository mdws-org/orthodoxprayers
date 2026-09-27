#!/usr/bin/env python3
"""Set /evening/rule/ from the book's Before Sleep section (lines 1547-1927).

Run through build_pages.py, which adds the glossary notes afterwards.
"""
import html
import re

from book import SOURCE, write_page

ROUTE = "evening/rule/"
PAGE = dict(rotate=28, bar="bar20", label="Prayers in the Evening", h1="The Evening Rule",
            attribution="The Whole Order Before Sleep",
            description="The evening rule: the whole order of prayers before sleep.")
START, END = 1547, 1927  # "Lord Jesus Christ..." through the last Amen
# The site's own line, not the book's (the same line stands in the morning rule).
MODEST = "Those beginning with a modest rule may end here; the numbered prayers are added as the rule grows."
# Compline ends by sending the reader here, "beginning with the Troparia".
ANCHORS = {"After the AMEN, the following Troparia are sung (Tone 6) or read:": "troparia"}
RUBRIC_HEADS = ("Then this Kontakion", "Also the Prayer of St. Ioannikios")
# The book prints "O Christ God" everywhere else and "Christ--God" only here.
CORRECTIONS = {"Enlighten my eyes, Christ--God,": "Enlighten my eyes, O Christ God,"}


def typeset(s):
    for old, new in CORRECTIONS.items():
        s = s.replace(old, new)
    s = s.replace("--", "—").replace("'", "’")
    s = html.escape(s, quote=False)
    return re.sub(r"_(\([^)]*\))_", r'<span class="rubric">\1</span>', s)


def paragraphs():
    buf = []
    for line in SOURCE[START - 1:END] + [""]:
        if line.strip():
            buf.append(line)
        elif buf:
            yield buf
            buf = []


def blocks():
    """Yield (kind, text) with the source's words, joined across line breaks."""
    for para in paragraphs():
        first = para[0].strip()
        if first in ("For the Day", "For the Night"):
            yield "inscription", first
            continue
        if para[0].startswith("  Lord"):  # Chrysostom petitions: each starts at 2 spaces, wraps at 12
            petitions = []
            for line in para:
                if line.startswith("  Lord"):
                    petitions.append(line.strip())
                else:
                    petitions[-1] += " " + line.strip()
            yield "petitions", petitions
            continue
        text = " ".join(line.strip() for line in para)
        if text.startswith("_") and text.endswith("_"):
            yield "rubric-line", text[1:-1]
        elif re.match(r"\d+(st|nd|rd|th) Prayer", text) or text.startswith("A Prayer of St. John"):
            yield "psalm-head", ", ".join(line.strip().rstrip(",") for line in para)
        elif text.startswith(RUBRIC_HEADS):
            yield "rubric-line", text
        else:
            yield "p", text


def render():
    out, opened = [], False
    for kind, text in blocks():
        if kind == "psalm-head" and text.startswith("1st Prayer"):
            out.append(f'<div class="rubric-line">{MODEST}</div>')
        if kind == "petitions":
            out.append('<div class="prayer indented">')
            out.extend(f"    <p>{typeset(t)}</p>" for t in text)
            out.append("</div>")
            continue
        body = typeset(text)
        if kind == "p":
            cls = "" if opened else ' class="opening"'
            opened = True
            out.append(f"<p{cls}>{body}</p>")
        elif kind == "psalm-head":
            out.append(f'<h2 class="psalm-head">{body}</h2>')
        else:
            anchor = f' id="{ANCHORS[text]}"' if text in ANCHORS else ""
            out.append(f'<div class="{kind}"{anchor}>{body}</div>')
    return "\n".join(" " * 12 + b for b in out)


def main():
    print(write_page(ROUTE, PAGE, render()))


if __name__ == "__main__":
    main()
