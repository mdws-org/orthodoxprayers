"""Shared pieces for the scripts that set pages from the prayer book.

The book is Project Gutenberg #34981, "Orthodox Daily Prayers" (St. Tikhon's
Seminary Press, 1982), kept beside this file as pg34981.txt. Line numbers in
the page scripts are 1-indexed lines of that file.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(__file__).with_name("pg34981.txt").read_text().splitlines()


def frame(route, page):
    """Head and tail of a page, taken from /morning/rule/ as the model.

    `page` names what differs: rotate, bar, label, h1, attribution,
    description. Glossary notes on the model page are left out; each page
    gets its own from add_glossary.py.
    """
    lines = [l for l in (ROOT / "morning/rule/index.html").read_text().splitlines() if "gloss-note" not in l]
    head, tail = "\n".join(lines[:40]), "\n".join(lines[115:])
    for old, new in [
        ('data-rotate="4"', f'data-rotate="{page["rotate"]}"'),
        ("The morning rule: the whole order of prayers on rising.", page["description"]),
        ("/morning/rule/", "/" + route),
        ("The Morning Rule &middot;", page["h1"] + " &middot;"),
        ("bar12.svg", page["bar"] + ".svg"),
        ("Prayers in the Morning", page["label"]),
        ("<h1>The Morning Rule</h1>", f'<h1>{page["h1"]}</h1>'),
        ('"attribution">The Whole Order on Rising', f'"attribution">{page["attribution"]}'),
    ]:
        assert head.count(old) == 1, old
        head = head.replace(old, new)
    up = "../" * route.count("/")
    return head.replace("../../", up), tail.replace("../../", up)


def write_page(route, page, body):
    """Write ROOT/<route>/index.html from the model frame and a rendered body."""
    head, tail = frame(route, page)
    out = ROOT / route / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(head + "\n" + body + "\n" + tail + "\n")
    return out.relative_to(ROOT)
