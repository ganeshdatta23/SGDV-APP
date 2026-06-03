#!/usr/bin/env python3
"""Find the screen-center (x y) of the first uiautomator node whose text or
content-desc contains the given substring (case-insensitive).

Usage: _uia_center.py <ui-dump.xml> "<substring>"
Prints "<x> <y>" on success; exits 2 if not found.
"""
import re
import sys


def main() -> int:
    xml = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
    needle = sys.argv[2].lower()

    for tag in re.finditer(r"<node [^>]*?/?>", xml):
        t = tag.group(0)
        text = (re.search(r'\btext="([^"]*)"', t) or [None, ""])[1]
        desc = (re.search(r'\bcontent-desc="([^"]*)"', t) or [None, ""])[1]
        label = f"{text} {desc}".lower()
        if needle in label:
            b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', t)
            if b:
                x1, y1, x2, y2 = map(int, b.groups())
                print((x1 + x2) // 2, (y1 + y2) // 2)
                return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
