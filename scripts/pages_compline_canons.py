#!/usr/bin/env python3
"""Render Compline and the Three Canons from Gutenberg #34981.

  compline/  The Order of Compline  (lines 844-1539)
  canons/    The Three Canons       (lines 1935-2763)

Run through build_pages.py, which adds glossary notes afterwards.
"""
import html
import re

from book import SOURCE, write_page

PAGES = {
    "compline/": dict(
        lines=(844, 1539), rotate=32, bar="bar8", label="Prayers in the Evening",
        h1="Compline", attribution="The Order of Compline",
        description="The Order of Compline, with the troparia for each evening of the week.",
    ),
    "canons/": dict(
        lines=(1935, 2763), rotate=33, bar="bar12", label="Prayers in the Evening",
        h1="The Three Canons", attribution="Of Repentance, to the Theotokos, and to the Guardian Angel",
        description="The Canon of Repentance, the Canon to the Theotokos and the Canon to the Guardian Angel, read together ode by ode.",
    ),
}

# The book's cross-references by printed page number give way to links to the
# pages here: (source text, replacement text, link target, linked words).
XREFS = [
    ("Akathist Hymn the evening before (See page 89).", "Akathist Hymn the evening before.", "/canons/", "three Canons"),
    ("Preparation at this point (See page 119).", "Preparation at this point.", "/communion/canon/", "Canon of Preparation"),
    ("have mercy on us....\" (page\n68).", "have mercy on us....\".", "/evening/rule/#troparia", "PRAYERS BEFORE SLEEP"),
    ("read during Compline (p. 37), they", "read during Compline, they", "/compline/", "during Compline"),
    ("and Psalm 50 (pp. 37 to 41).", "and Psalm 50.", None, None),
]
# Sentences about the printed book itself that mean nothing on a website.
DROPS = [
    'We have not attempted to publish a large selection of\nCanons in the limited space of what is, essentially, a "pocket" Prayer\nBook. ',
    " (See the BOOK OF HOURS)",
]
# One word of the book's voice about itself, changed rather than cut: the
# next sentence ("This order can also serve as a model") depends on this one.
REWORDS = [("Canons and printed\nthem", "Canons and set\nthem")]
RUNNING_HEAD = "THE THREE CANONS"
HEAD = re.compile(r"^(\d+(st|nd|rd|th) Prayer|Another Prayer|A Prayer|Prayer of)")
LABEL = re.compile(r"^(Sessional Hymn, Tone \d|Kontakion, Tone \d|Ikos|Tone \d)$")
PSALMS = re.compile(r"^(Psalm \d+|The Doxology)$")


def typeset(s):
    s = s.replace("--", "\u2014").replace("'", "\u2019")
    s = re.sub(r'(^|[\s(\u2014])"', "\\1\u201c", s)
    s = s.replace('"', "\u201d")
    s = html.escape(s, quote=False)
    s = re.sub(r"_(\([^)]*\))_", r'<span class="rubric">\1</span>', s)
    return re.sub(r"(?<!>)(\((?:\d+ times|twice)\))$", r'<span class="rubric">\1</span>', s)


def paragraphs(a, b):
    """Yield (lines, blank lines before) for the source's blank-separated paragraphs."""
    text = "\n".join(SOURCE[a - 1:b])
    for old, new, _, _ in XREFS:
        text = text.replace(old, new)
    for drop in DROPS:
        text = text.replace(drop, "")
    for old, new in REWORDS:
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


def list_items(para):
    """A compact indented list: a line at two spaces starts an item, deeper lines continue it."""
    items = []
    for line in para:
        if re.match(r"^  \S", line):
            items.append(line.strip())
        else:
            items[-1] += " " + line.strip()
    return items


def blocks(a, b):
    in_psalm = False
    for para, gap in paragraphs(a, b):
        first = para[0].strip()
        text = " ".join(l.strip() for l in para)
        if para[0].startswith(" " * 10):
            heads = [l.strip() for l in para if l.strip() != RUNNING_HEAD]
            head = re.sub(r"^ODE ", "Ode ", heads[0])
            in_psalm = bool(PSALMS.match(head))
            if head.startswith("Canon ") and len(heads) == 1:
                yield "canon-head", head
            else:
                yield "psalm-head", head
                for extra in heads[1:]:
                    yield "inscription", extra
        elif text.startswith("_") and text.endswith("_"):
            in_psalm = False
            yield "rubric-line", text[1:-1].replace("_", "")
            if text.startswith("_The Sunday Troparia and Kontakia"):
                yield "tone-jump", ""

        elif para[0].startswith("  "):
            if in_psalm:
                yield "p", text
            else:
                for item in list_items(para):
                    yield "p", item
        elif gap >= 2 and re.fullmatch(r"Tone \d", text):
            yield "tone-head", text
        elif gap >= 2 and LABEL.match(text):
            in_psalm = False
            yield "inscription", text
        elif gap >= 2 and HEAD.match(first):
            in_psalm = False
            yield "psalm-head", first.rstrip(".")
        elif text.startswith("Irmos: "):
            yield "inscription", "Irmos"
            yield "p", text[len("Irmos: "):]
        else:
            in_psalm = False
            yield "p", text


# Thursday's troparia are "the same as Tuesday evening": link the words to
# Tuesday's heading on the same page.
IN_PAGE = [("#tuesday", "Tuesday evening")]
HEAD_IDS = {"Tuesday Evening": "tuesday"}


def link(body):
    for _, _, href, words in XREFS:
        if href and words in body:
            body = body.replace(words, f'<a href="{href}">{words}</a>', 1)
    for href, words in IN_PAGE:
        if words in body:
            body = body.replace(words, f'<a href="{href}">{words}</a>', 1)
    return body


# The refrain said before each troparion of a canon, and the doxology lines
# before its last troparia.
REFRAIN = re.compile(r"(Have mercy on me, O God, have mercy on me!|Most Holy Theotokos, save us!"
                     r"|Holy Angel of the Lord, my [Gg]uardian, pray to God for me, a sinner!"
                     r"|Lord Jesus Christ, my God, have mercy on me!|(Glory to|Let us bless|We bless) the Father.*"
                     r"|Now and ever.*)")


def render(a, b, refrains=False):
    out, opened = [], False
    for kind, text in blocks(a, b):
        if kind == "tone-jump":
            tones = " \u00b7 ".join(f'<a href="#tone-{n}">{n}</a>' for n in range(1, 9))
            out.append(f'<div class="inscription tone-jump">Tone {tones}</div>')
            continue
        body = link(typeset(text))
        if kind == "tone-head":
            out.append(f'<h3 class="canon-head" id="tone-{text[-1]}">{body}</h3>')
            continue
        if kind == "p" and opened and refrains and REFRAIN.fullmatch(text):
            out.append(f'<p class="refrain">{body}</p>')
        elif kind == "p":
            out.append(f'<p{"" if opened else " class=\"opening\""}>{body}</p>')
            opened = True
        elif kind == "psalm-head":
            anchor = f' id="{HEAD_IDS[text]}"' if text in HEAD_IDS else ""
            out.append(f'<h2 class="psalm-head"{anchor}>{body}</h2>')
        elif kind == "canon-head":
            out.append(f'<h3 class="canon-head">{body}</h3>')
        else:
            out.append(f'<div class="{kind}">{body}</div>')
    return "\n".join(" " * 12 + line for line in out)


def main():
    for route, page in PAGES.items():
        print(write_page(route, page, render(*page["lines"], refrains=route == "canons/")))


if __name__ == "__main__":
    main()
