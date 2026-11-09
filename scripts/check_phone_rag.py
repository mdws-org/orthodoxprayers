#!/usr/bin/env python3
"""Fail when prayer text on a phone would be justified.

At a phone's ~40-character measure, justified prose stretched a word space
past twice its width on one line in six (measured 2026-11-08 at 390px, Safari
and Chrome). Phones get ragged right. This check reads prayers.css and
requires that the phone query (max-width of at least 430px, the widest common
phone) sets `.prayer p` to `text-align: left` and that nothing inside a phone
query sets it to justify again.

No dependencies; run from the repository root: python3 scripts/check_phone_rag.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHONE = 430


def blocks(css):
    """Yield (prelude, body) for each top-level {...} block."""
    i = 0
    while True:
        start = css.find("{", i)
        if start < 0:
            return
        depth, j = 1, start + 1
        while depth:
            depth += {"{": 1, "}": -1}.get(css[j], 0)
            j += 1
        yield css[i:start].strip(), css[start + 1:j - 1]
        i = j


def align(body):
    """text-align values set on a selector list that includes `.prayer p`."""
    out = []
    for selectors, decls in blocks(body):
        if ".prayer p" in [s.strip() for s in selectors.split(",")]:
            out += re.findall(r"text-align:\s*([a-z-]+)", decls)
    return out


def main():
    css = re.sub(r"/\*.*?\*/", "", (ROOT / "prayers.css").read_text(), flags=re.S)
    phone = []
    for prelude, body in blocks(css):
        m = re.match(r"@media\s*\(max-width:\s*(\d+)px\)\s*$", prelude)
        if m and int(m.group(1)) >= PHONE:
            phone += align(body)
    if not phone or phone[-1] not in ("left", "start"):
        sys.exit(f"check_phone_rag: no phone query (max-width >= {PHONE}px) sets .prayer p to text-align: left")
    if "justify" in phone:
        sys.exit("check_phone_rag: a phone query sets .prayer p to text-align: justify")
    print("check_phone_rag: phone prose is ragged right")


if __name__ == "__main__":
    main()
