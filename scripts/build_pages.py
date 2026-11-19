#!/usr/bin/env python3
"""Rebuild every page set from the prayer book, in the order the steps need.

1. pages_evening, pages_communion, pages_compline_canons write the six
   book pages fresh from pg34981.txt; pages_typika writes the Typika from
   obednitsa.txt and hapgood.txt.
2. add_glossary adds the tap-to-read notes to those pages and rewrites the
   notes on every other page that has them.
3. add_page_nav adds the previous/next line through the Three Canons and the
   Communion pages.
4. set_rubrics marks notes, prefaces and small caps in the rubrics of every
   page.
5. check_precache --write writes the page entries of sw.js's precache list
   and raises VERSION if any precached file changed.

Run from anywhere: python3 scripts/build_pages.py. Then run the checks
(check_text_*.py, check_glossary.py, check_precache.py).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import add_glossary  # noqa: E402
import add_page_nav  # noqa: E402
import check_precache  # noqa: E402
import pages_communion  # noqa: E402
import pages_compline_canons  # noqa: E402
import pages_evening  # noqa: E402
import pages_typika  # noqa: E402
import set_rubrics  # noqa: E402

if __name__ == "__main__":
    sys.argv = sys.argv[:1]
    for step in (pages_evening, pages_communion, pages_compline_canons, pages_typika, add_glossary, add_page_nav, set_rubrics):
        step.main()
    check_precache.write()
