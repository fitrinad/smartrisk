#!/usr/bin/env python3
"""
Convert portfolio.csv -> data/projects.yaml

Grouping/order rules:
  - Years: descending (most recent first)
  - Categories within a year: ascending by number of items (fewest first)
  - Items within a category: kept in the CSV's original row order

CSV columns expected: Year,Category,Name,Location,Province,Coordinates
Coordinates column is a "[lat, lng]" literal, copied through as-is.
`country` is derived from the province code prefix (ID- -> Indonesia,
VN- -> Vietnam); extend PROVINCE_COUNTRY_PREFIXES if new countries appear.
"""

from __future__ import annotations

import csv
import sys
from ast import literal_eval
from collections import defaultdict

INPUT_CSV = "scripts/portfolio.csv"
OUTPUT_YAML = "data/projects.yaml"

PROVINCE_COUNTRY_PREFIXES = {
    "BN": "Brunei",
    "KH": "Cambodia",
    "ID": "Indonesia",
    "LA": "Laos",
    "MY": "Malaysia",
    "MM": "Myanmar",
    "PH": "Philippines",
    "SG": "Singapore",
    "TH": "Thailand",
    "TL": "Timor-Leste",
    "VN": "Vietnam",
}


def country_from_province(province: str) -> str:
    prefix = province.split("-")[0]
    try:
        return PROVINCE_COUNTRY_PREFIXES[prefix]
    except KeyError:
        sys.exit(f"Unknown province prefix '{prefix}' (province={province!r}). "
                  f"Add it to PROVINCE_COUNTRY_PREFIXES.")


def load_rows(path: str) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def unique_rows(rows: list[dict]) -> list[dict]:
    """Drops rows that are exact duplicates within the same year, keeping the
    first occurrence. Duplicate = same Year, Category, Name, Location, Province.
    Different Coordinates will be dropped (in case they are just slightly different)."""
    seen = set()
    deduped = []
    n_dupes = 0
    for row in rows:
        key = (
            row["Year"].strip(),
            row["Category"].strip(),
            row["Name"].strip(),
            row["Location"].strip(),
            row["Province"].strip(),
        )
        if key in seen:
            n_dupes += 1
            continue
        seen.add(key)
        deduped.append(row)
    if n_dupes:
        print(f"Skipped {n_dupes} duplicate row(s)")
    return deduped


def group_rows(rows: list[dict]) -> dict:
    # year -> category -> list of item dicts
    grouped = defaultdict(lambda: defaultdict(list))
    for row in rows:
        year = int(row["Year"])
        category = row["Category"].strip()
        province = row["Province"].strip()
        item = {
            "name": row["Name"].strip(),
            "location": row["Location"].strip(),
            "province": province,
            "country": country_from_province(province),
            "coords": literal_eval(row["Coordinates"].strip()),
        }
        grouped[year][category].append(item)
    return grouped


def yaml_escape(value: str) -> str:
    """Quote a scalar only if YAML would otherwise misparse it."""
    needs_quoting = (
        value == ""
        or value[0] in "!&*-?|>%@`\"'#,[]{}:"
        or value.strip() != value
        or ": " in value
        or value.lower() in {"true", "false", "null", "yes", "no"}
    )
    if needs_quoting:
        escaped = value.replace('"', '\\"')
        return f'"{escaped}"'
    return value


def render_yaml(grouped: dict) -> str:
    lines = ["years:"]
    years_desc = sorted(grouped.keys(), reverse=True)

    for yi, year in enumerate(years_desc):
        categories = grouped[year]
        # ascending by item count; stable, so ties keep first-seen CSV order
        categories_sorted = sorted(categories.items(), key=lambda kv: len(kv[1]))

        lines.append(f"  - year: {year}")
        lines.append("    projects:")
        for category, items in categories_sorted:
            lines.append(f"      - category: {yaml_escape(category)}")
            lines.append("        items:")
            for item in items:
                lat, lng = item["coords"]
                lines.append(f"          - name: {yaml_escape(item['name'])}")
                lines.append(f"            location: {yaml_escape(item['location'])}")
                lines.append(f"            province: {item['province']}")
                lines.append(f"            country: {item['country']}")
                lines.append(f"            coords: [{lat}, {lng}]")
        if yi != len(years_desc) - 1:
            lines.append("")  # blank line between years, matches existing file

    return "\n".join(lines) + "\n"


def main():
    rows = load_rows(INPUT_CSV)
    rows = unique_rows(rows)
    grouped = group_rows(rows)
    yaml_text = render_yaml(grouped)
    with open(OUTPUT_YAML, "w", encoding="utf-8") as f:
        f.write(yaml_text)
    n_items = sum(len(items) for cats in grouped.values() for items in cats.values())
    print(f"Wrote {OUTPUT_YAML}: {len(grouped)} years, {n_items} items")


if __name__ == "__main__":
    main()