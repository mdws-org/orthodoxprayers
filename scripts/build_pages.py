#!/usr/bin/env python3
"""Rebuild every page set from the prayer book, in the order the steps need.

1. pages_evening, pages_communion, pages_compline_canons write the seven
   book pages fresh from pg34981.txt; pages_typika writes the Typika from
   obednitsa.txt and hapgood.txt.
2. add_glossary adds the tap-to-read notes to those pages and rewrites the
   notes on every other page that has them.
3. add_page_nav adds the previous/next line through the Communion pages.

Run from anywhere: python3 scripts/build_pages.py. Then run the checks
(check_text_*.py, check_glossary.py, check_precache.py) and raise VERSION in
sw.js if any page changed.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import add_glossary  # noqa: E402
import add_page_nav  # noqa: E402
import pages_communion  # noqa: E402
import pages_compline_canons  # noqa: E402
import pages_evening  # noqa: E402
import pages_typika  # noqa: E402

if __name__ == "__main__":
    sys.argv = sys.argv[:1]
    for step in (pages_evening, pages_communion, pages_compline_canons, pages_typika, add_glossary, add_page_nav):
        step.main()
