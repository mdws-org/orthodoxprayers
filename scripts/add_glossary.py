#!/usr/bin/env python3
"""Add tap-to-read notes for liturgical terms in rubrics and labels.

Each term found in a .rubric-line, an .inscription or a .psalm-head becomes
a <button popovertarget> that opens a native popover holding the note; no
script. Labels and heads get a button at every occurrence; rubrics only at
the first occurrence of each term on a page. Text inside links and inside the
prayers themselves is never touched. A page that already carries notes keeps
its buttons and has its notes rewritten from GLOSS, so an edit here reaches
every page on the next run.

The notes were checked against the 1982 book, oca.org and other Orthodox
sources and by an outside review on 2026-09-27; change the wording only with
a source.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP = {"index.html", "about/index.html", "404.html"}

GLOSS = {
    "irmos": (r"\bIrmos\b", "Irmos",
              "The model stanza that opens each ode of a canon. The verses after it are sung to its melody, and its words recall the scriptural song the ode is built on."),
    "canon": (r"\bCanons?\b", "Canon",
              "A hymn in odes, each modeled on one of nine biblical songs. The second is kept for Lent, so most canons go from Ode 1 to Ode 3. A short refrain comes before each troparion; “Glory…” and “Now and ever…” take its place before the last ones."),
    "troparion": (r"\b(?:Troparia|TROPARIA|Troparion|TROPARION|troparia)\b", "Troparion",
                  "A short hymn stanza (plural troparia). In a canon it is each verse after the irmos; elsewhere it is the hymn of a feast, a saint or a day."),
    "kontakion": (r"\bKontak(?:ion|ia)\b", "Kontakion",
                  "A short hymn (plural kontakia) that sums up a feast or theme."),
    "ikos": (r"\bIkos\b", "Ikos",
             "The stanza read after a kontakion. The two are what remains of a once-long poem: the kontakion was its prelude, the ikos its first stanza."),
    "sessional": (r"\bSessional Hymn\b", "Sessional Hymn",
                  "A short hymn sung after the third ode of a canon, and at Matins after each reading from the Psalter. The name comes from sitting: the faithful could sit at these points."),
    "tone": (r"\b(?:Tone|TONE)(?: \d)?\b", "Tone",
             "One of the eight modes of Orthodox chant, each a family of melodies. The number beside a hymn tells singers which to use; reading, you may pass over it. Sunday hymns follow the tone of the week, which moves through all eight."),
    "octoechos": (r"\bOctoechos\b", "Octoechos",
                  "The book of hymns in the eight tones, used in weekly rotation."),
    "akathist": (r"\bAkathist Hymn\b", "Akathist Hymn",
                 "A long hymn of praise to Christ, the Theotokos or a saint; the first and best known is to the Theotokos. It is prayed standing: akathistos means “not sitting.”"),
    "exclamation": (r"\busual exclamation\b", "The usual exclamation",
                    "The priest’s closing words after the Lord’s Prayer: “For Thine is the Kingdom, and the power, and the glory…” Without a priest, go on to what follows."),
    "kathisma": (r"\bkathisma\b", "Kathisma",
                 "One of the twenty sections of the Psalter, read in turn. The word means “sitting.”"),
    "obednitsa": (r"\bObednitsa\b", "Obednitsa",
                  "The Slavonic name of the Typika: the Reader’s Service, read in place of the Divine Liturgy when there is no priest to serve it. It keeps the Liturgy’s shape, the antiphons, the readings, the Creed and the Lord’s Prayer, without the Eucharist."),
    "antiphon": (r"\bAntiphon\b", "Antiphon",
                 "A psalm or hymn sung in alternation, verse by verse, between two choirs or reader and choir. The three that open the Liturgy, and the Typika, are Psalms 102 and 145 and the Beatitudes."),
    "trisagion": (r"\bTrisagion\b", "Trisagion",
                  "The thrice-holy hymn: “Holy God, Holy Mighty, Holy Immortal, have mercy on us.” The Trisagion Prayers are this hymn and the prayers that follow it, through the Lord’s Prayer, which open most services; at the Liturgy and the Typika it is sung before the readings."),
    "prokeimenon": (r"\b(?:Prokeimenon|PROKEIMENON)\b", "Prokeimenon",
                    "A verse from the Psalms sung before the Epistle, with a second verse answering it. Its words and tone change with the day."),
    "zadostoynik": (r"\bZadostoynik\b", "Zadostoynik",
                    "The hymn to the Theotokos sung after the consecration at the Liturgy, usually “It is truly meet.” On great feasts another hymn takes its place; the name means “in place of It is truly meet.”"),
    "theotokion": (r"\bTheotokion\b", "Theotokion",
                   "A hymn to the Theotokos (plural theotokia) sung to close a set of troparia or kontakia."),
    "analoy": (r"\bAnaloy\b", "Analoy",
               "A tall stand with a sloped top, set in the nave, that holds an icon or the Gospel book for veneration and reading. The Greek name is analogion."),
}
BLOCK = re.compile(r'(<(?:div|h2) class="(inscription|rubric-line|psalm-head)"[^>]*>)(.*?)(</(?:div|h2)>)')
NOTE = re.compile(r'<div id="g-([a-z]+)" class="gloss-note" popover>.*?</div>')


def note(key):
    return f'<div id="g-{key}" class="gloss-note" popover><dfn>{GLOSS[key][1]}</dfn> {GLOSS[key][2]}</div>'


def wrap_text(inner, every, used):
    """Wrap glossary terms in the text of one block, outside any <a>."""
    parts = re.split(r"(<[^>]+>)", inner)
    in_link = 0
    for i, part in enumerate(parts):
        if part.startswith("<"):
            if re.match(r"<a[\s>]", part):
                in_link += 1
            elif part == "</a>":
                in_link -= 1
            continue
        if in_link:
            continue
        for key, (pattern, _, _) in GLOSS.items():
            if not every and key in used:
                continue

            def button(m, key=key):
                used.add(key)
                return f'<button type="button" class="gloss" popovertarget="g-{key}">{m.group(0)}</button>'

            new, n = re.subn(pattern, button, part, count=0 if every else 1)
            if n:
                part = new
                if not every:
                    used.add(key)
        parts[i] = part
    return "".join(parts)


def process(page):
    """Add notes to a page, or rewrite the ones it has. Returns the keys it carries."""
    text = page.read_text()
    if "</main>" not in text:
        return None
    if 'class="gloss"' in text:
        page.write_text(NOTE.sub(lambda m: note(m.group(1)), text))
        return sorted(set(NOTE.findall(text)))
    used = set()

    def block(m):
        return m.group(1) + wrap_text(m.group(3), m.group(2) != "rubric-line", used) + m.group(4)

    text = BLOCK.sub(block, text)
    if not used:
        return None
    notes = "\n".join("        " + note(key) for key in GLOSS if key in used)
    page.write_text(text.replace("    </main>", notes + "\n    </main>", 1))
    return sorted(used)


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT
    for page in sorted(root.rglob("index.html")):
        rel = page.relative_to(root)
        if rel.parts[0].startswith(".") or str(rel) in SKIP:
            continue
        used = process(page)
        if used:
            print(f"{rel}: {', '.join(used)}")


if __name__ == "__main__":
    main()
