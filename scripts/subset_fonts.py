#!/opt/homebrew/bin/uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools==4.60.1", "brotli==1.1.0"]
# ///
"""Rebuild the two EB Garamond subsets in fonts/ from the upstream sources.

    scripts/subset_fonts.py <EBGaramond[wght].ttf> <EBGaramond-Italic[wght].ttf>

Sources: the OFL variable fonts in google/fonts, ofl/ebgaramond/. The character
list and the layout features are read back off the shipped subsets and kept,
so a rebuild changes only what EXTRA adds. Add a character here before a page
uses it; scripts/check_font_coverage.py fails the build otherwise.

After a rebuild, raise VERSION in sw.js: the fonts are precached and served
immutable, and the version bump is what makes installed copies fetch them
again.
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FACES = [ROOT / "fonts/ebgaramond-var.woff2", ROOT / "fonts/ebgaramond-italic-var.woff2"]

# Characters the shipped subsets did not carry, with the reason each is needed.
EXTRA = {
    0x2190: "← in the previous-page links (scripts/add_page_nav.py, Psalter)",
    0x2192: "→ in the next-page links",
}


def features(font):
    tags = set()
    for table in ("GSUB", "GPOS"):
        if table in font:
            tags |= {r.FeatureTag for r in font[table].table.FeatureList.FeatureRecord}
    return sorted(tags)


def rebuild(source, shipped):
    old = TTFont(shipped)
    unicodes = set(old.getBestCmap()) | set(EXTRA)
    tags = features(old)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = tags
    options.name_IDs = ["*"]
    options.notdef_outline = True
    font = subset.load_font(source, options)
    sub = subset.Subsetter(options)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    missing = sorted(u for u in unicodes if u not in font.getBestCmap())
    if missing:
        sys.exit(f"{source}: source lacks {', '.join(f'U+{u:04X}' for u in missing)}")
    if features(font) != tags:
        sys.exit(f"{source}: features changed {tags} -> {features(font)}")
    before = (len(old.getGlyphOrder()), shipped.stat().st_size)
    subset.save_font(font, shipped, options)
    after = (len(TTFont(shipped).getGlyphOrder()), shipped.stat().st_size)
    print(f"{shipped.name}: glyphs {before[0]} -> {after[0]}, bytes {before[1]:,} -> {after[1]:,}")


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    for source, shipped in zip(sys.argv[1:], FACES):
        rebuild(source, shipped)


if __name__ == "__main__":
    main()
