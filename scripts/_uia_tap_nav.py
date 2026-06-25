#!/usr/bin/env python3
"""Print the tap center "X Y" of a bottom-nav tab button.

The SGDV bottom tabs are clickable nodes with empty text and a content-desc like
", Darshan". The visible "Darshan" text node is NOT clickable, so matching
on text taps a no-op. This finds the clickable node whose content-desc contains
the requested label, preferring the bottom-most match (the nav bar).

usage: _uia_tap_nav.py <ui.xml> <label>
"""
import re
import sys


def center(bounds):
    m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', bounds)
    if not m:
        return None
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2


def main():
    xml = open(sys.argv[1]).read()
    label = sys.argv[2].lower()
    candidates = []  # (clickable_priority, y, x)
    for tag in re.finditer(r'<node\b[^>]*>', xml):
        t = tag.group(0)
        txt = (re.search(r'text="([^"]*)"', t) or [None, ''])[1]
        desc = (re.search(r'content-desc="([^"]*)"', t) or [None, ''])[1]
        clk = (re.search(r'clickable="([^"]*)"', t) or [None, ''])[1] == 'true'
        bounds = (re.search(r'bounds="([^"]*)"', t) or [None, ''])[1]
        if label in (txt + ' ' + desc).lower():
            c = center(bounds)
            if c:
                # prefer clickable nodes, then bottom-most (nav bar)
                candidates.append((1 if clk else 0, c[1], c[0]))
    if not candidates:
        return
    # highest clickable-priority, then largest y (bottom-most)
    best = sorted(candidates, key=lambda r: (r[0], r[1]))[-1]
    print(best[2], best[1])


if __name__ == '__main__':
    main()
