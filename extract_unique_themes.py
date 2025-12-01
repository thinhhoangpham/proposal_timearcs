#!/usr/bin/env python3
"""Extract unique themes from publication.tsv.

Usage:
    python extract_unique_themes.py [--file pubJavascripts/publication.tsv] [--normalize] [--json] [--map-lines]

Options:
    --file PATH        Path to TSV file (default: pubJavascripts/publication.tsv)
    --normalize        Apply basic normalization (strip, collapse spaces, title-case slashes/hyphens)
    --json             Output JSON with: list, counts, and mapping if themeColors.json present
    --map-lines        Output each theme as either:
                      "Theme Name": "#hex"   (if color known)
                      Theme Name              (if color unknown)

This script:
  1. Reads the TSV assuming a header row and a 'theme' column.
  2. Collects unique non-empty themes.
  3. Optionally normalizes them.
  4. Prints them sorted, or emits JSON if --json.

Normalization rules (if --normalize):
  - Strip leading/trailing whitespace
  - Replace multiple internal spaces with single space
  - Preserve case for acronyms (AI, IoT, CPS) but title-case other words
  - Standardize separators: around '/' or '-' ensure single spaces

If themeColors.json exists, colors for themes already defined will be included.
"""
import argparse
import csv
import json
import os
import re
from collections import Counter

DEFAULT_PATH = os.path.join( 'data', 'publication.tsv')
THEME_COL_NAME = 'sponsor'
THEME_COLOR_PATH = os.path.join('pubJavascripts', 'myscripts', 'themeColors.json')

ACRONYMS = {"AI", "CPS", "IoT", "VR", "AR", "ML"}

def normalize_theme(theme: str) -> str:
    t = theme.strip()
    # Collapse whitespace
    t = re.sub(r"\s+", " ", t)
    # Ensure spaces around slashes and hyphens (not inside URLs)
    t = re.sub(r"\s*/\s*", " / ", t)
    t = re.sub(r"\s*-\s*", " - ", t)
    # Title-case non-acronym words
    parts = []
    for token in re.split(r"( / | - )", t):
        if token in {" / ", " - "}:  # keep separators
            parts.append(token)
            continue
        word_parts = []
        for w in token.split():
            if w.upper() in ACRONYMS:
                word_parts.append(w.upper())
            else:
                word_parts.append(w[:1].upper() + w[1:].lower())
        parts.append(" ".join(word_parts))
    t = "".join(parts)
    # Final cleanup: collapse multiple spaces created during processing
    t = re.sub(r"\s+", " ", t).strip()
    return t

def load_theme_colors():
    if not os.path.isfile(THEME_COLOR_PATH):
        return {}
    try:
        with open(THEME_COLOR_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('themeColors', {}) or {}
    except Exception:
        return {}

def extract_themes(path: str, do_normalize: bool):
    if not os.path.isfile(path):
        raise FileNotFoundError(f"TSV file not found: {path}")
    themes = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        if not reader.fieldnames or THEME_COL_NAME not in reader.fieldnames:
            raise ValueError(f"Column '{THEME_COL_NAME}' not found in TSV header: {reader.fieldnames}")
        for row in reader:
            raw = row.get(THEME_COL_NAME, '')
            if raw is None:
                continue
            raw = raw.strip()
            if not raw:
                continue
            theme = normalize_theme(raw) if do_normalize else raw
            themes.append(theme)
    counts = Counter(themes)
    unique = sorted(counts.keys())
    return unique, counts

def main():
    ap = argparse.ArgumentParser(description="Extract unique themes from TSV")
    ap.add_argument('--file', default=DEFAULT_PATH, help='Path to publication TSV file')
    ap.add_argument('--normalize', action='store_true', help='Apply normalization to themes')
    ap.add_argument('--json', action='store_true', help='Output JSON instead of plain list')
    ap.add_argument('--map-lines', action='store_true', help='Output mapping-style lines for themeColors.json')
    args = ap.parse_args()

    unique, counts = extract_themes(args.file, args.normalize)
    color_map = load_theme_colors()

    if args.map_lines:
        for t in unique:
            col = color_map.get(t)
            if col:
                print(f'"{t}": "{col}"')
            else:
                print(t)
    elif args.json:
        # Provide color if already defined; else None
        enriched = [
            {
                'theme': t,
                'count': counts[t],
                'color': color_map.get(t)
            } for t in unique
        ]
        print(json.dumps({
            'file': args.file,
            'normalized': args.normalize,
            'total_unique': len(unique),
            'themes': enriched
        }, indent=2))
    else:
        print(f"Total unique themes: {len(unique)}\n")
        for t in unique:
            col = color_map.get(t)
            color_info = f" (color: {col})" if col else ""
            print(f"{t}{color_info}")

if __name__ == '__main__':
    main()
