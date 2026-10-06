#!/usr/bin/env python3
"""Build the bundled lottery snapshots from the three user-supplied records files.

The text files are treated as data only.  Four impossible Lao Ao rows contain a
duplicate number in the same draw; those cells are repaired from the previously
bundled row and recorded in the audit report.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path


SOURCES = {
    "xa": Path(r"D:\Users\吴付城\Downloads\新奥.txt"),
    "la": Path(r"D:\Users\吴付城\Downloads\老澳.txt"),
    "gc": Path(r"D:\Users\吴付城\Downloads\港彩.txt"),
}

# The supplied Lao Ao file repeats one number in each of these rows.  The old
# bundled snapshot has a valid single-cell value in the same position.
LA_REPAIRS = {
    159: ([35, 36, 41, 39, 37, 46], 12, "第二个35修复为36"),
    161: ([16, 15, 2, 36, 48, 1], 35, "重复特码16修复为35"),
    179: ([38, 29, 4, 39, 23, 11], 32, "第四个38修复为39"),
    196: ([46, 19, 48, 49, 17, 43], 12, "第四个19修复为49"),
}


@dataclass
class Draw:
    period: int
    normal: list[int]
    special: int
    draw_date: date | None = None


def read_draws(path: Path) -> list[Draw]:
    text = path.read_bytes().decode("gb18030", errors="replace")
    rows: list[Draw] = []
    for line in text.splitlines():
        match = re.match(r"\s*2026-(\d+)\s+(.+)$", line)
        if not match:
            continue
        numbers = [int(value) for value in re.findall(r"\d+", match.group(2))]
        if len(numbers) < 7:
            continue
        rows.append(Draw(int(match.group(1)), numbers[:6], numbers[6]))
    return rows


def daily_date(period: int) -> date:
    return date(2026, 10, 6) - timedelta(days=279 - period)


def gangcai_date(period: int) -> date:
    anchor_period, current = 46, date(2026, 5, 5)
    step = 1 if period >= anchor_period else -1
    while anchor_period != period:
        current += timedelta(days=step)
        if current.weekday() in (1, 3, 5):  # Tuesday, Thursday, Saturday
            anchor_period += step
    return current


def validate(name: str, rows: list[Draw]) -> list[str]:
    issues: list[str] = []
    periods = [row.period for row in rows]
    if len(periods) != len(set(periods)):
        issues.append("存在重复期号")
    expected = list(range(min(periods), max(periods) + 1))
    if periods != expected:
        missing = sorted(set(expected) - set(periods))
        issues.append(f"缺少期号：{missing}")
    for row in rows:
        values = row.normal + [row.special]
        if len(set(values)) != 7:
            issues.append(f"{row.period}期同期开奖含重复号码：{values}")
        if any(value < 1 or value > 49 for value in values):
            issues.append(f"{row.period}期含越界号码：{values}")
    return issues


def as_js(name: str, rows: list[Draw]) -> str:
    labels = {"xa": "新奥", "la": "老澳", "gc": "港彩"}
    lines = [
        f"// ===== 权威开奖记录快照：{labels[name]}（用户于2026-10-06提供并完成完整性校验） =====",
        f"const INIT_DR_{name.upper()}=[",
    ]
    for row in rows:
        d = row.draw_date.strftime("%m/%d")
        normal = ",".join(str(value) for value in row.normal)
        lines.append(f'  {{p:{row.period},d:"{d}",n:[{normal}],t:{row.special}}},')
    lines[-1] = lines[-1].rstrip(",")
    lines.append("];\n")
    return "\n".join(lines)


def replace_array(source: str, key: str, replacement: str) -> str:
    pattern = rf"const INIT_DR_{key}=\[.*?\n\];+"
    # Keep the existing section comment and replace only the array declaration.
    declaration = replacement[replacement.index(f"const INIT_DR_{key}=") :].rstrip()
    updated, count = re.subn(pattern, declaration, source, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"cannot locate INIT_DR_{key}")
    return updated


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate only")
    parser.add_argument("--html", type=Path, default=Path("index.html"))
    parser.add_argument("--report", type=Path, default=Path("data-audit-2026-10-06.md"))
    args = parser.parse_args()

    data = {name: read_draws(path) for name, path in SOURCES.items()}
    raw_la_issues = validate("la", data["la"])
    for row in data["la"]:
        if row.period in LA_REPAIRS:
            row.normal, row.special, _ = LA_REPAIRS[row.period]

    for name, rows in data.items():
        for row in rows:
            row.draw_date = daily_date(row.period) if name in ("xa", "la") else gangcai_date(row.period)
        issues = validate(name, rows)
        if issues:
            raise SystemExit(f"{name} still invalid: {issues}")

    summary = {
        name: {
            "rows": len(rows),
            "first_period": rows[0].period,
            "last_period": rows[-1].period,
            "first_date": rows[0].draw_date.isoformat(),
            "last_date": rows[-1].draw_date.isoformat(),
        }
        for name, rows in data.items()
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if args.check:
        return

    html = args.html.read_text(encoding="utf-8")
    for key in ("XA", "LA", "GC"):
        html = replace_array(html, key, as_js(key.lower(), data[key.lower()]))
    args.html.write_text(html, encoding="utf-8", newline="\n")

    repairs = "\n".join(
        f"- 老澳第{period}期：{note}；修复后7个号码唯一。"
        for period, (_, _, note) in LA_REPAIRS.items()
    )
    report = f"""# 三彩开奖记录数据质量核对（2026-10-06）

## 数据粒度与口径

- 每行是一种彩票的一期开奖，主键为“彩种 + 期号”。
- 每期包含6个正码和1个特码；7个号码必须互不重复，且均在1–49。
- 新奥、老澳以第279期=2026-10-06为日期锚点逐日回推。
- 港彩以第46期=2026-05-05为锚点，按周二、周四、周六回推/前推。

## 核对结果

| 彩种 | 有效期数 | 期号范围 | 日期范围 | 缺期 | 重复期号 | 修复后无效行 |
|---|---:|---|---|---:|---:|---:|
| 新奥 | {summary['xa']['rows']} | {summary['xa']['first_period']}–{summary['xa']['last_period']} | {summary['xa']['first_date']}–{summary['xa']['last_date']} | 0 | 0 | 0 |
| 老澳 | {summary['la']['rows']} | {summary['la']['first_period']}–{summary['la']['last_period']} | {summary['la']['first_date']}–{summary['la']['last_date']} | 0 | 0 | 0 |
| 港彩 | {summary['gc']['rows']} | {summary['gc']['first_period']}–{summary['gc']['last_period']} | {summary['gc']['first_date']}–{summary['gc']['last_date']} | 0 | 0 | 0 |

## 已修复的原始异常

老澳原文件有4行违反“同一期7码唯一”的硬规则；这些行若进入统计，会污染冷热、遗漏、三中三及连肖回测。

{repairs}

原始检查信息：`{json.dumps(raw_la_issues, ensure_ascii=False)}`

## 数据新鲜度说明

- 新奥、老澳已到第279期（2026-10-06）。
- 港彩文件只到第106期（按开奖日映射为2026-09-22）。系统以文件为权威快照，不虚构第107期之后的开奖号码；页面会把这一点标成数据滞后。

## 自动质量规则

1. 彩种+期号必须唯一。
2. 每期必须有6个正码和1个特码。
3. 7个号码必须互不重复且在1–49。
4. 权威快照范围内，以本次文件覆盖旧缓存和旧云端值；快照末期以后允许继续录入新开奖。
5. 相邻两期7个号码完全相同时给出疑似重复录入警告，不自动删除真实开奖。
"""
    args.report.write_text(report, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
