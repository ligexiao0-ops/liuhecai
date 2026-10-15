#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
六合彩资料站正文提取工具
支持提取：标题、号码、期数、验证结果等
"""

import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin

def extract_page(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.encoding = resp.apparent_encoding  # 自动识别编码
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        return {"error": str(e)}

    result = {
        "url": url,
        "title": soup.title.string.strip() if soup.title else "",
        "main_texts": [],
        "links": [],
        "numbers": [],
        "raw_text": ""
    }

    # 1. 提取所有表格文字（这个站点主要信息都在表格里）
    for table in soup.find_all("table"):
        text = table.get_text(separator="\n", strip=True)
        if text:
            result["main_texts"].append(text)

    # 2. 提取所有链接（含相对路径转绝对路径）
    for a in soup.find_all("a", href=True):
        href = a["href"]
        full_url = urljoin(url, href)
        title = a.get_text(strip=True)
        if title:
            result["links"].append({
                "title": title,
                "url": full_url
            })

    # 3. 提取看起来像号码的内容（正则）
    full_text = soup.get_text(separator="\n", strip=True)
    result["raw_text"] = full_text

    # 匹配类似 09.40.17.46.37.16.47.30.02 或 【07+41】 这种
    number_patterns = [
        r"\d{2}(?:\.\d{2}){3,}",           # 09.40.17.46...
        r"【\d{2}\+\d{2}】",               # 【07+41】
        r"\d{2}\.\d{2}",                   # 单个 02.26
        r"[蛇猴虎牛鼠狗羊兔马龙鸡猪]\s*[:：]\s*\d{2}\.\d{2}",  # 蛇:02.26
    ]
    
    for pattern in number_patterns:
        matches = re.findall(pattern, full_text)
        result["numbers"].extend(matches)

    # 去重
    result["numbers"] = list(dict.fromkeys(result["numbers"]))

    return result


def print_result(data: dict):
    if "error" in data:
        print("错误:", data["error"])
        return

    print("=" * 60)
    print(f"页面标题: {data['title']}")
    print(f"来源: {data['url']}")
    print("=" * 60)

    print("\n【主要正文内容】")
    for i, text in enumerate(data["main_texts"][:15], 1):  # 只显示前15段，避免太长
        print(f"\n--- 段落 {i} ---")
        print(text[:800] + ("..." if len(text) > 800 else ""))

    print("\n【提取到的号码】")
    for num in data["numbers"]:
        print("  ", num)

    print("\n【相关链接】")
    for link in data["links"][:20]:
        print(f"  {link['title'][:50]} → {link['url']}")


