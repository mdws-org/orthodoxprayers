#!/usr/bin/env python3
"""Add previous/next links through the Communion pages, in the order they are read.

The Psalter's .knav line, placed the same way: after the prayer, before the
closing cross. A page that already has the line is left alone.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEQUENCE = [
    ("canons/", "The Three Canons"),
    ("communion/canon/", "The Canon of Preparation"),
    ("communion/", "Before Communion"),
    ("communion/thanksgiving/", "After Communion"),
]
FINIS = '        <div class="finis">&#10016;</div>'


def main():
    for i, (route, _) in enumerate(SEQUENCE):
        page = ROOT / route / "index.html"
        text = page.read_text()
        if 'class="knav"' in text:
            continue
        prev = f'<a href="/{SEQUENCE[i - 1][0]}">&larr; {SEQUENCE[i - 1][1]}</a>' if i > 0 else "<span></span>"
        nxt = f'<a href="/{SEQUENCE[i + 1][0]}">{SEQUENCE[i + 1][1]} &rarr;</a>' if i + 1 < len(SEQUENCE) else "<span></span>"
        assert text.count(FINIS) == 1, route
        page.write_text(text.replace(FINIS, f'        <nav class="knav">{prev}{nxt}</nav>\n{FINIS}'))
        print(route)


if __name__ == "__main__":
    main()
