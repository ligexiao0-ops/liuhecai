#!/usr/bin/env python3
"""Back up and reconcile Supabase lottery_records with the audited snapshots."""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
URL = re.search(r"const SUPABASE_URL='([^']+)'", HTML).group(1)
KEY = re.search(r"const SUPABASE_KEY='([^']+)'", HTML).group(1)
ENDPOINT = URL.rstrip("/") + "/rest/v1/lottery_records"
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def request(method: str, query: str = "", payload=None, prefer: str | None = None):
    headers = dict(HEADERS)
    if prefer:
        headers["Prefer"] = prefer
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(ENDPOINT + ("?" + query if query else ""), data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=45) as response:
        raw = response.read()
        return json.loads(raw.decode("utf-8")) if raw else None


def parse_snapshot(lot: str):
    match = re.search(rf"const INIT_DR_{lot.upper()}=\[(.*?)\n\];", HTML, re.S)
    if not match:
        raise RuntimeError(f"missing {lot} snapshot")
    rows = []
    for p, d, normal, special in re.findall(r'\{p:(\d+),d:"([^"]+)",n:\[([^]]+)\],t:(\d+)\}', match.group(1)):
        nums = [int(value) for value in normal.split(",")]
        rows.append({
            "lot_type": lot,
            "period": int(p),
            "date": d,
            **{f"n{i + 1}": value for i, value in enumerate(nums)},
            "t": int(special),
        })
    return rows


def main() -> None:
    before = request("GET", "select=lot_type,period,date,n1,n2,n3,n4,n5,n6,t&order=lot_type,period") or []
    backup_dir = ROOT / "backups"
    backup_dir.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = backup_dir / f"supabase-records-before-{stamp}.json"
    backup.write_text(json.dumps(before, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = {"backup": str(backup), "lots": {}}
    for lot in ("xa", "la", "gc"):
        seed = parse_snapshot(lot)
        periods = {row["period"] for row in seed}
        max_period = max(periods)
        request("POST", "on_conflict=lot_type,period", seed, "resolution=merge-duplicates")
        extras = sorted(
            row["period"] for row in before
            if row.get("lot_type") == lot and int(row.get("period", 0)) <= max_period and int(row.get("period", 0)) not in periods
        )
        for start in range(0, len(extras), 50):
            values = ",".join(str(value) for value in extras[start:start + 50])
            query = urllib.parse.urlencode({"lot_type": f"eq.{lot}", "period": f"in.({values})"}, safe=".,()")
            request("DELETE", query)
        summary["lots"][lot] = {"upserted": len(seed), "deleted_extra_periods": extras}

    after = request("GET", "select=lot_type,period,date,n1,n2,n3,n4,n5,n6,t&order=lot_type,period") or []
    for lot in ("xa", "la", "gc"):
        seed = parse_snapshot(lot)
        expected = {(row["period"], row["date"], *(row[f"n{i}"] for i in range(1, 7)), row["t"]) for row in seed}
        actual = {
            (row["period"], row["date"], *(row[f"n{i}"] for i in range(1, 7)), row["t"])
            for row in after if row.get("lot_type") == lot and row["period"] <= max(item["period"] for item in seed)
        }
        summary["lots"][lot]["verified"] = actual == expected
        summary["lots"][lot]["cloud_rows_total"] = sum(1 for row in after if row.get("lot_type") == lot)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not all(item["verified"] for item in summary["lots"].values()):
        sys.exit(2)


if __name__ == "__main__":
    main()
