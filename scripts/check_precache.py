#!/usr/bin/env python3
"""Fail when sw.js's precache list and the site's pages disagree, or when a
precached file changed and VERSION did not.

The service worker precaches the ASSETS list in sw.js. A page missing from it
stays online-only, and the miss is silent: the site works at the desk and
fails off-grid, which is the one place the feature exists for. A precached
file that changes under the same VERSION is just as silent: returning readers
keep the old copy. This check makes both loud:

  1. the page entries in ASSETS are the ones the page tree gives, in order
  2. every ASSETS entry resolves to a real file
  3. CONTENT in sw.js is the hash of the precached files as they are

With --write it writes the page entries from the page tree, and when the
precached files no longer match CONTENT it raises VERSION by one and writes
the new CONTENT. Run it after any change to a page or a precached file;
scripts/build_pages.py runs it last.

The files every page uses (stylesheet, scripts, fonts, ornaments, icons) are
listed by hand in sw.js below the page entries; this check only requires each
one to resolve. 404.html is excluded by design -- it is not a route, and an
offline 404 has nothing to show anyway. art/icons/ is excluded by design --
the Not Found page's dealt icons are deliberately not precached (see sw.js
history).

No dependencies; run from the repository root:
    python3 scripts/check_precache.py            # check
    python3 scripts/check_precache.py --write    # write sw.js
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW = ROOT / "sw.js"
EXCLUDED_PAGES = {"404.html"}
PAGES_START = "    // Pages: written from the page tree by scripts/check_precache.py --write.\n"
PAGES_END = "    // Files every page uses, listed by hand.\n"


def page_routes():
    """Every page route in the tree, the home page first, then in path order
    with numbers compared as numbers (kathisma-2 before kathisma-10)."""
    routes = []
    for page in ROOT.rglob("index.html"):
        rel = page.relative_to(ROOT)
        if str(rel) in EXCLUDED_PAGES or any(p.startswith(".") or p == "node_modules" for p in rel.parts):
            continue
        routes.append("/" if str(rel) == "index.html" else "/" + rel.parent.as_posix() + "/")
    key = lambda r: (r != "/", [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", r)])
    return sorted(routes, key=key)


def page_block(routes):
    return "".join("    BASE,\n" if r == "/" else f'    BASE + "{r[1:]}",\n' for r in routes)


def assets(sw):
    m = re.search(r"const ASSETS = \[(.*?)\];", sw, re.S)
    if not m:
        sys.exit("check_precache: could not find ASSETS in sw.js")
    found = ["/" + e for e in re.findall(r'^\s*BASE \+ "([^"]*)"', m.group(1), re.M)]
    if re.search(r"^\s*BASE,", m.group(1), re.M):
        found.insert(0, "/")
    return found


def target(entry):
    path = ROOT / entry.lstrip("/")
    return path / "index.html" if entry.endswith("/") else path


def content_hash(entries):
    """SHA-256 over each precached entry's address and bytes, in sorted order."""
    h = hashlib.sha256()
    for entry in sorted(entries):
        h.update(entry.encode() + b"\0" + target(entry).read_bytes() + b"\0")
    return h.hexdigest()[:16]


def split_pages(sw):
    start, end = sw.find(PAGES_START), sw.find(PAGES_END)
    if start < 0 or end < start:
        sys.exit("check_precache: sw.js has lost the page markers in ASSETS")
    return sw[:start + len(PAGES_START)], sw[start + len(PAGES_START):end], sw[end:]


def stored(sw, name):
    m = re.search(rf'^const {name} = "([^"]*)";$', sw, re.M)
    if not m:
        sys.exit(f"check_precache: could not find {name} in sw.js")
    return m


def write():
    sw = SW.read_text()
    head, _, tail = split_pages(sw)
    sw = head + page_block(page_routes()) + tail
    digest = content_hash(assets(sw))
    if digest != stored(sw, "CONTENT").group(1):
        version = stored(sw, "VERSION")
        bumped = re.sub(r"\d+$", lambda n: str(int(n.group()) + 1), version.group(1))
        sw = sw[:version.start(1)] + bumped + sw[version.end(1):]
        sw = re.sub(r'^const CONTENT = "[^"]*";$', f'const CONTENT = "{digest}";', sw, flags=re.M)
        print(f"check_precache: precached files changed; VERSION {version.group(1)} -> {bumped}")
    SW.write_text(sw)


def check():
    sw = SW.read_text()
    entries = assets(sw)
    problems = []

    # 1. the page entries are the page tree's
    _, pages, _ = split_pages(sw)
    if pages != page_block(page_routes()):
        listed = set(assets("const ASSETS = [" + pages + "];"))
        tree = set(page_routes())
        for route in sorted(tree - listed):
            problems.append(f"page {route} has no precache entry")
        for route in sorted(listed - tree):
            problems.append(f"precache entry {route} is not a page in the tree")
        if listed == tree:
            problems.append("the page entries are out of order")
    for page in sorted(ROOT.glob("*.html")):
        if page.name in EXCLUDED_PAGES or page.name == "index.html":
            continue
        problems.append(f"page {page.name} is neither precached nor excluded")

    # 2. every precached entry resolves to a file
    for entry in sorted(set(entries)):
        if not target(entry).is_file():
            problems.append(f"ASSETS entry {entry} resolves to no file ({target(entry).relative_to(ROOT)})")

    # 3. the precached files are the ones VERSION was set for
    if not problems:
        digest = content_hash(entries)
        if digest != stored(sw, "CONTENT").group(1):
            problems.append(f"a precached file changed but VERSION ({stored(sw, 'VERSION').group(1)}) did not "
                            f"(CONTENT {stored(sw, 'CONTENT').group(1)}, files {digest})")

    if problems:
        print("check_precache: sw.js and the site disagree:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        print("  run: python3 scripts/check_precache.py --write", file=sys.stderr)
        sys.exit(1)
    print(f"check_precache: {len(entries)} entries, all pages covered, all entries resolve, CONTENT matches")


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if argv == ["--write"]:
        write()
    elif not argv:
        check()
    else:
        sys.exit("usage: check_precache.py [--write]")


if __name__ == "__main__":
    main()
