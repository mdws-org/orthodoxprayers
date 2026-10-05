#!/usr/bin/env python3
"""Write sitemap.xml for every page route, lastmod from each page's last commit."""
import datetime
import subprocess
import sys
from pathlib import Path

WT = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else Path(__file__).resolve().parent.parent
ORDER = ["", "morning/rule/", "morning/", "morning/daybreak/", "commemorations/", "hours/", "typika/", "table/",
         "common/", "compline/", "evening/rule/", "evening/", "evening/sleep/",
         "canons/", "communion/canon/", "communion/", "communion/thanksgiving/", "psalter/"]
ORDER += [f"psalter/kathisma-{n}/" for n in range(1, 21)] + ["about/"]

pages = {("" if p.parent == WT else str(p.parent.relative_to(WT)) + "/")
         for p in WT.rglob("index.html") if not p.relative_to(WT).parts[0].startswith(".")}
assert pages == set(ORDER), (pages ^ set(ORDER))

entries = []
for route in ORDER:
    date = subprocess.run(["git", "-C", str(WT), "log", "-1", "--format=%cs", "--", route + "index.html"],
                          capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", str(WT), "status", "--porcelain", "--", route + "index.html"],
                           capture_output=True, text=True, check=True).stdout.strip()
    if dirty or not date:
        date = datetime.date.today().isoformat()
    entries.append(f"<url>\n  <loc>https://orthodoxprayers.net/{route}</loc>\n  <lastmod>{date}T00:00:00+00:00</lastmod>\n</url>\n")

(WT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                + "\n".join(entries) + "\n</urlset>\n")
print(len(entries), "urls")
