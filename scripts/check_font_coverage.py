#!/usr/bin/env python3
"""Fail when a page uses a character the bundled fonts cannot draw.

The site ships EB Garamond subsets. A character outside them is drawn from
whatever system font has it, in another face and weight, and nothing looks
broken enough to notice: the head cross (U+2720) and the page-link arrows ran
in a fallback font on every page until 2026-11-08. This check reads every
page's visible text and every CSS `content:` string and requires each
character to be in both faces.

The .head-cross and .finis elements are exempt: they carry ✠ only as a
hidden fallback and draw the cross from art/icons/ (see prayers.css).

To add a character, put it in EXTRA in scripts/subset_fonts.py and rebuild.

Needs fontTools and brotli (CI installs them); run from the repository root:
python3 scripts/check_font_coverage.py
"""
import html
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FACES = ["fonts/ebgaramond-var.woff2", "fonts/ebgaramond-italic-var.woff2"]
EXEMPT = re.compile(r'<div class="(?:head-cross|finis)"[^>]*>[^<]*</div>')
STRIP = re.compile(r"<(script|style|noscript)\b[^>]*>.*?</\1>|<!--.*?-->", re.S)
ATTR = re.compile(r'\b(?:alt|title|aria-label)="([^"]*)"')


def page_text(raw):
    raw = STRIP.sub(" ", EXEMPT.sub(" ", raw))
    body = raw.split("<body", 1)[-1]
    text = re.sub(r"<[^>]+>", " ", body)
    return html.unescape(text) + " " + " ".join(html.unescape(a) for a in ATTR.findall(body))


def main():
    cmaps = {face: set(TTFont(ROOT / face).getBestCmap()) for face in FACES}
    sources = {p.relative_to(ROOT): page_text(p.read_text()) for p in ROOT.rglob("*.html")
               if not p.relative_to(ROOT).parts[0].startswith(".")}
    css = (ROOT / "prayers.css").read_text()
    sources[Path("prayers.css")] = " ".join(re.findall(r'content:\s*"([^"]*)"', css))

    problems = []
    for where, text in sorted(sources.items()):
        for ch in sorted({c for c in text if ord(c) > 0x20 and not c.isspace()}):
            lacking = [face for face, cmap in cmaps.items() if ord(ch) not in cmap]
            if lacking:
                problems.append(f"{where}: U+{ord(ch):04X} {ch!r} not in {', '.join(lacking)}")
    if problems:
        print("\n".join(problems))
        sys.exit(f"check_font_coverage: {len(problems)} character(s) the fonts cannot draw")
    print(f"check_font_coverage: {len(sources)} sources, every character in both faces")


if __name__ == "__main__":
    main()
