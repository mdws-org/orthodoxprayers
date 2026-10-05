#!/usr/bin/env python3
"""Render the Typika from the Reader's Service booklet, scripts/obednitsa.txt.

  typika/  The Typika (the Reader's Service of Obednitsa)

The page keeps the booklet's words and order, with four departures that
check_text_typika.py asserts: the Beatitudes and Psalm 33, which the booklet
takes from the Revised Standard Version, are set from Hapgood's Service Book
(scripts/hapgood.txt); the chant marks (/ and ///) go, their line breaks
kept; the paragraph on who may read the Gospel in church is left out; and
the booklet's notes for a church (bells, the Gospel book), after its own end
mark, are left out. Run through build_pages.py, which adds glossary notes
afterwards.
"""
import html
import re
from pathlib import Path

from book import write_page

SRC = Path(__file__).with_name("obednitsa.txt").read_text().splitlines()
HAPGOOD = Path(__file__).with_name("hapgood.txt").read_text().splitlines()

ROUTE = "typika/"
PAGE = dict(
    rotate=34, bar="bar20", label="Through the Day",
    h1="The Typika", attribution="The Reader\u2019s Service of Obednitsa",
    description="The Typika, the Reader\u2019s Service read in place of the Liturgy when there is no priest.",
)

# The booklet's section heads, set in the site's case.
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
# The paragraph on who may read the Gospel in church, left out: at home it
# reads as a bar on reading scripture, which is not its meaning.
CUT = ("_According to custom, ONLY the Subdea-_", "_Pastor specifically for this._")
# The booklet's own end mark; its notes for a church follow it.
END = "[End of Obednitsa]"
# The two passages the booklet takes from the Revised Standard Version,
# still in copyright, and the section of hapgood.txt that stands in for each.
SWAPS = [
    (("Blessed are the poor in spirit:/", "for great is your reward in heaven."), "THE BEATITUDES"),
    (("Reader: I will bless the Lord at all times;", "refuge in Him will be condemned."), "PSALM XXXIV"),
]

SPEAKER = re.compile(r"^(Reader|Choir):(?: (.*))?$")
# A bracketed line of its own is a label ([Sundays], [End of Obednitsa]); the
# bracketed "[or from ...]" alternatives belong to the Reader's line before them.
LABEL = re.compile(r"^\[(?!or ).*\]$")
LIST_ITEM = re.compile(r"^\d\. ")
TERMINAL = (".", ")", "]", "!", "?")


def hapgood(section):
    """The lines of one passage in hapgood.txt, by its heading."""
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


def source():
    """The booklet's lines with the departures applied, page marks and title gone."""
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
    return [l for l in lines if l.strip()]


def italic(line):
    return line.startswith("_") and line.endswith("_")


def join(a, b):
    """Join two printed lines; a hyphen at the line end closes up, except in God-bearing."""
    if a.endswith("God-"):
        return a + b
    if a.endswith("-") and b[:1].islower():
        return a[:-1] + b
    return a + " " + b


def breaks(a, b):
    """A line that closes a sentence, followed by one that opens with a capital.

    A line holding only "Amen." closes the paragraph before it instead.
    """
    return a.rstrip("/_").rstrip().endswith(TERMINAL) and b[:1].isupper() and b != "Amen."


def paragraphs(lines):
    """Group plain lines into paragraphs; a Reader or Choir label opens one."""
    paras = []
    for line in lines:
        m = SPEAKER.match(line)
        speaker, text = (m.group(1), m.group(2) or "") if m else (None, line)
        if paras and not speaker and not breaks(paras[-1]["last"], text):
            paras[-1]["text"] = join(paras[-1]["text"], text)
        else:
            paras.append({"speaker": speaker, "text": text})
        paras[-1]["last"] = text
    return paras


def phrases(text):
    """A sung text's lines, which the booklet marks with slashes."""
    return [p.strip() for p in re.split(r"/+", text) if p.strip()]


def blocks():
    """Yield (kind, payload) in page order.

    A run is the plain lines between rubrics, heads and labels; a Reader or
    Choir line starts a new one. A run with slashes is one sung text, set
    line by line; any other run is paragraphs.
    """
    run, rubric, started = [], [], False

    def flush():
        if not run:
            return
        m = SPEAKER.match(run[0])
        if m:
            # The label stands above a sung text, and above the opening
            # paragraph; elsewhere it opens the paragraph.
            if not m.group(2) or any("/" in l for l in run):
                yield "speaker", m.group(1)
                if m.group(2):
                    run[0] = m.group(2)
                else:
                    run.pop(0)
        if any("/" in l for l in run):
            # Phrases end at the slashes, and where a line closes a sentence
            # and the next opens with a capital.
            text = ""
            for line in run:
                if not text:
                    text = line
                elif breaks(text, line) and not text.rstrip().endswith("/"):
                    text = text + "/" + line
                else:
                    text = join(text, line)
            yield "verse", phrases(text)
        else:
            for para in paragraphs(run):
                yield "p", (para["speaker"], para["text"])
        run.clear()

    def flush_rubric():
        for para in paragraphs(rubric):
            yield "rubric-line", para["text"]
        rubric.clear()

    note = False
    for line in source():
        m = SPEAKER.match(line)
        label = LABEL.match(line) or (m and m.group(2) and LABEL.match(m.group(2)))
        special = line == "* * *" or line in HEADS or label or LIST_ITEM.match(line)
        if italic(line) or line.startswith("NOTE: ") or (note and not (m or special)):
            # A rubric: italic lines, and a NOTE with the lines that carry it on.
            yield from flush()
            note = not italic(line)
            rubric.append(line[1:-1] if italic(line) else line)
            continue
        note = False
        yield from flush_rubric()
        if special:
            yield from flush()
            if line == "* * *":
                if started:
                    yield "break", ""
            elif line in HEADS:
                yield "psalm-head", HEADS[line]
            elif m:
                yield "speaker", m.group(1)
                yield "inscription", m.group(2)
            elif label:
                yield "inscription", line
            else:
                yield "rubric-line", line
        else:
            if m:
                yield from flush()
            run.append(line)
        started = True
    yield from flush()
    yield from flush_rubric()


def typeset(s):
    s = s.replace("--", "\u2014").replace("'", "\u2019")
    s = re.sub(r'(^|[\s(\u2014])"', "\\1\u201c", s)
    s = s.replace('"', "\u201d")
    s = html.escape(s, quote=False)
    s = re.sub(r"_(\([^)]*\))_", r'<span class="rubric">\1</span>', s)
    return re.sub(r"(?<!>)(\(\d+\))$", r'<span class="rubric">\1</span>', s)


def label(speaker):
    return f'<span class="speaker">{speaker}:</span>'


def render():
    out, opened = [], False
    for kind, payload in blocks():
        if kind == "break":
            out.append('<hr class="rule" />')
        elif kind == "speaker":
            out.append(f'<div class="speaker">{payload}:</div>')
        elif kind == "verse":
            out.append('<div class="verse">')
            out.extend(f"    <p>{typeset(p)}</p>" for p in payload)
            out.append("</div>")
        elif kind == "p":
            speaker, text = payload
            if not opened:
                # The first paragraph takes the drop capital, so its label
                # stands above it rather than inside it.
                if speaker:
                    out.append(f'<div class="speaker">{speaker}:</div>')
                out.append(f'<p class="opening">{typeset(text)}</p>')
                opened = True
            else:
                lead = label(speaker) + " " if speaker else ""
                out.append(f"<p>{lead}{typeset(text)}</p>")
        elif kind == "psalm-head":
            out.append(f'<h2 class="psalm-head">{typeset(payload)}</h2>')
        else:
            out.append(f'<div class="{kind}">{typeset(payload)}</div>')
    return "\n".join(" " * 12 + line for line in out)


def main():
    print(write_page(ROUTE, PAGE, render()))


if __name__ == "__main__":
    main()
