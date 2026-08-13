#!/usr/bin/env python3
"""Fail when sw.js's precache list and the site's pages disagree.

The service worker precaches a hand-maintained ASSETS list. A page added
without a matching entry stays online-only, and the miss is silent: the site
works at the desk and fails off-grid, which is the one place the feature
exists for. This check makes the miss loud, in both directions:

  1. every page route in the tree must appear in ASSETS
  2. every ASSETS entry must resolve to a real file

404.html is excluded by design -- it is not a route, and an offline 404 has
nothing to show anyway. art/icons/ is excluded by design -- the Not Found
page's dealt icons are deliberately not precached (see sw.js history).

No dependencies; run from the repository root: python3 scripts/check_precache.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED_PAGES = {"404.html"}

sw = (ROOT / "sw.js").read_text()
m = re.search(r"const ASSETS = \[(.*?)\];", sw, re.S)
if not m:
    sys.exit("check_precache: could not find ASSETS in sw.js")

assets = set()
for entry in re.findall(r'BASE \+ "([^"]*)"|^\s*BASE,', m.group(1), re.M):
    assets.add("/" + entry)
if re.search(r"^\s*BASE,", m.group(1), re.M):
    assets.add("/")

problems = []

# 1. every page route must be precached
for page in sorted(ROOT.rglob("index.html")):
    rel = page.relative_to(ROOT)
    if str(rel) in EXCLUDED_PAGES:
        continue
    route = "/" if str(rel) == "index.html" else "/" + str(rel.parent) + "/"
    if route not in assets:
        problems.append(f"page {rel} has no precache entry for {route}")
for page in sorted(ROOT.glob("*.html")):
    if page.name in EXCLUDED_PAGES or page.name == "index.html":
        continue
    problems.append(f"page {page.name} is neither precached nor excluded")

# 2. every precached entry must resolve to a file
for entry in sorted(assets):
    target = ROOT / entry.lstrip("/")
    if entry.endswith("/") or entry == "/":
        target = target / "index.html"
    if not target.is_file():
        problems.append(f"ASSETS entry {entry} resolves to no file ({target.relative_to(ROOT)})")

if problems:
    print("check_precache: sw.js and the page tree disagree:", file=sys.stderr)
    for p in problems:
        print(f"  - {p}", file=sys.stderr)
    sys.exit(1)

print(f"check_precache: {len(assets)} entries, all pages covered, all entries resolve")
