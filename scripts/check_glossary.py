#!/usr/bin/env python3
"""Every glossary note on a page has a button that opens it, and every button has its note."""
import re
import sys
from pathlib import Path

bad = []
ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else Path(__file__).resolve().parent.parent
for page in sorted(ROOT.rglob("index.html")):
    if page.relative_to(ROOT).parts[0].startswith("."):
        continue
    t = page.read_text()
    notes = re.findall(r'id="g-([a-z]+)" class="gloss-note"', t)
    used = set(re.findall(r'popovertarget="g-([a-z]+)"', t))
    if len(notes) != len(set(notes)) or set(notes) != used:
        bad.append(f"{page}: notes {sorted(notes)} buttons {sorted(used)}")
print("\n".join(bad) if bad else "gloss: every note has a button, every button a note, no duplicates")
sys.exit(1 if bad else 0)
