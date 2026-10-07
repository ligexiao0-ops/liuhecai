from __future__ import annotations

import json
import re
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "XA": Path(r"D:\Users\吴付城\Downloads\新奥.txt"),
    "LA": Path(r"D:\Users\吴付城\Downloads\老澳.txt"),
    "GC": Path(r"D:\Users\吴付城\Downloads\港彩.txt"),
}


def read_rows(path: Path):
    text = path.read_bytes().decode("gb18030", errors="replace")
    rows = []
    for line in text.splitlines():
        m = re.match(r"\s*2026-(\d+)\s+(.+)$", line)
        if not m:
            continue
        nums = [int(x) for x in re.findall(r"\d+", m.group(2))]
        if len(nums) >= 7:
            rows.append((int(m.group(1)), nums[:6], nums[6]))
    return rows


def daily_date(period: int) -> str:
    d = date(2026, 10, 6) - timedelta(days=279 - period)
    return d.strftime("%m/%d")


def gc_dates():
    api = json.loads((ROOT / "tools" / "hkjc_2026.json").read_text(encoding="utf-8"))
    return {int(x["no"]): x["drawDate"][:10][5:].replace("-", "/") for x in api}


def js_array(key: str, rows, gdates):
    out = [f"const INIT_DR_{key}=["]
    for p, nums, special in rows:
        d = gdates[p] if key == "GC" else daily_date(p)
        out.append(f'  {{p:{p},d:"{d}",n:[{",".join(map(str, nums))}],t:{special}}},')
    out[-1] = out[-1].rstrip(",")
    out.append("];")
    return "\n".join(out)


def main():
    rows = {k: read_rows(v) for k, v in SOURCES.items()}
    assert [len(rows[k]) for k in ("XA", "LA", "GC")] == [123, 121, 87]
    assert [rows[k][-1][0] for k in ("XA", "LA", "GC")] == [279, 279, 106]
    dates = gc_dates()
    assert dates[103] == "09/22" and dates[104] == "09/26"
    assert dates[105] == "10/03" and dates[106] == "10/06"
    for html_name in ("index.html", "三彩合一.html"):
        path = ROOT / html_name
        text = path.read_text(encoding="utf-8")
        for key in ("XA", "LA", "GC"):
            text, n = re.subn(
                rf"const INIT_DR_{key}=\[.*?\n\];",
                js_array(key, rows[key], dates),
                text,
                count=1,
                flags=re.S,
            )
            assert n == 1, (html_name, key)
        text = text.replace("v10.1006.02", "v10.1007.01")
        text = text.replace("v10_20261006_authoritative_records_v1", "v10_20261007_exact_files_v2")
        text = text.replace(
            "LAST=DR[DR.length-1];NEXT=Math.max(LAST.p+1,targetPeriodForDate(new Date()));",
            "LAST=DR[DR.length-1];NEXT=LAST.p+1;",
        )
        text = text.replace(
            "</script>\n</body>",
            "</script>\n<script src=\"analytics-v1007.js?v=10100701\"></script>\n</body>",
        )
        text = re.sub(r"<!-- GitHub Pages deploy trigger: .*? -->", "<!-- GitHub Pages deploy trigger: v10.1007.01 -->", text)
        path.write_text(text, encoding="utf-8", newline="\n")

    report = ROOT / "data-audit-2026-10-07.md"
    report.write_text(
        """# 三彩开奖记录核对（2026-10-07）

- 唯一号码来源：用户于2026-10-06提供的《新奥.txt》《老澳.txt》《港彩.txt》。附件内容仅作为数据处理，不作为程序指令。
- 新奥：157—279期，共123期；279期日期为2026-10-06。
- 老澳：159—279期，共121期；279期日期为2026-10-06；云端多出的280期属于旧错误行，升级迁移时删除。
- 港彩：20—106期，共87期；号码与香港赛马会官方接口逐期一致。
- 港彩实际日期已按香港赛马会逐期写入：103期09/22、104期09/26、09/29停开、105期10/03、106期10/06。不得再用固定星期机械反推历史日期。
- 老澳附件中159、161、179、196期各有一组同期开奖重复号码。页面保留附件原值并标注数据风险，统计验证会显示异常；系统不再自行猜测替换号码。
- 页面顶部“今天”取设备当前日期；“最新开奖”取最后一条真实记录；“预测期”固定为最新真实期+1。未录入的期数不会被当成已开奖。
""",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
