#!/usr/bin/env python3
"""Validate the three user-supplied record files against the v10.1007 release."""

from __future__ import annotations

import argparse
import json
from build_v1007 import SOURCES, gc_dates, read_rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rows = {key: read_rows(path) for key, path in SOURCES.items()}
    expected = {"XA": (123, 157, 279), "LA": (121, 159, 279), "GC": (87, 20, 106)}
    summary = {}
    for key, data in rows.items():
        count, first, last = expected[key]
        assert len(data) == count and data[0][0] == first and data[-1][0] == last
        periods = [r[0] for r in data]
        assert len(periods) == len(set(periods))
        summary[key] = {"rows": len(data), "first_period": first, "last_period": last}
    dates = gc_dates()
    assert dates[103] == "09/22" and dates[104] == "09/26"
    assert dates[105] == "10/03" and dates[106] == "10/06"
    summary["GC"]["verified_dates"] = {str(p): dates[p] for p in (103, 104, 105, 106)}
    summary["LA"]["duplicate_number_rows_preserved_from_source"] = [
        p for p, nums, special in rows["LA"] if len(set(nums + [special])) != 7
    ]
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.check:
        from build_v1007 import main as build
        build()


if __name__ == "__main__":
    main()
