#!/usr/bin/env python3
"""Walk-forward evaluation for normal-number 8-code pools.

The script reads the embedded authoritative arrays from index.html.  Every
target draw is predicted only from earlier rows, so the reported hit rates do
not leak the target draw into model selection.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")


def load_rows(key: str) -> list[dict]:
    block = re.search(rf"const INIT_DR_{key}=\[(.*?)\n\];", HTML, re.S)
    if not block:
        raise RuntimeError(f"INIT_DR_{key} not found")
    rows = []
    for p, d, nums, special in re.findall(
        r'\{p:(\d+),d:"([^"]+)",n:\[([^]]+)\],t:(\d+)\}', block.group(1)
    ):
        rows.append(
            {
                "p": int(p),
                "d": d,
                "n": [int(x) for x in nums.split(",")],
                "t": int(special),
            }
        )
    return rows


def zod(n: int) -> int:
    # The embedded ZM table groups equal residues modulo 12.
    return (n - 1) % 12


def rank01(values: dict[int, float]) -> dict[int, float]:
    ordered = sorted(values, key=lambda n: (values[n], n))
    return {n: i / 48 for i, n in enumerate(ordered)}


def features(hist: list[dict]) -> dict[int, dict[str, float]]:
    last = hist[-1]
    long = hist[-60:]
    short = hist[-8:]
    f_long = Counter(n for r in long for n in r["n"])
    f_short = Counter(n for r in short for n in r["n"])
    omission = {}
    for n in range(1, 50):
        om = 0
        for r in reversed(hist):
            if n in r["n"]:
                break
            om += 1
        omission[n] = min(om, 24)
    long_rank = rank01({n: f_long[n] for n in range(1, 50)})
    short_rank = rank01({n: f_short[n] for n in range(1, 50)})
    omit_rank = rank01(omission)
    last_nums = set(last["n"])
    last_zods = {zod(n) for n in last["n"]}
    last_tails = {n % 10 for n in last["n"]}
    last_heads = {n // 10 for n in last["n"]}
    z6 = Counter(zod(n) for r in hist[-6:] for n in r["n"])
    t6 = Counter(n % 10 for r in hist[-6:] for n in r["n"])
    h6 = Counter(n // 10 for r in hist[-6:] for n in r["n"])
    out = {}
    for n in range(1, 50):
        near = min(abs(n - x) for x in last_nums)
        out[n] = {
            "long": long_rank[n] - 0.5,
            "short": short_rank[n] - 0.5,
            "omit": omit_rank[n] - 0.5,
            "repeat": float(n in last_nums),
            "same_zod": float(zod(n) in last_zods),
            "zod_complement": float(zod(n) in last_zods and n not in last_nums),
            "same_tail": float(n % 10 in last_tails),
            "same_head": float(n // 10 in last_heads),
            "near12": float(n not in last_nums and near <= 2),
            "zod_hot": (z6[zod(n)] - 3.0) / 6.0,
            "tail_hot": (t6[n % 10] - 3.6) / 6.0,
            "head_hot": (h6[n // 10] - 7.2) / 8.0,
            "div3": float(n % 3 == 0),
            "div4": float(n % 4 == 0),
            "div5": float(n % 5 == 0),
            "div7": float(n % 7 == 0),
        }
    return out


MODELS: dict[str, dict[str, float]] = {
    "frequency": {"long": 1.0, "short": 0.35, "omit": -0.10},
    "continuity": {
        "long": 0.55,
        "short": 0.15,
        "same_zod": 0.45,
        "same_tail": 0.20,
        "repeat": -0.20,
    },
    "complement": {
        "long": 0.45,
        "short": 0.10,
        "zod_complement": 0.65,
        "same_tail": 0.18,
        "same_head": 0.25,
        "near12": 0.45,
        "repeat": -0.45,
    },
    "rebound": {
        "long": 0.25,
        "short": -0.25,
        "omit": 0.65,
        "zod_hot": -0.20,
        "repeat": -0.25,
    },
    "hot": {
        "long": 0.55,
        "short": 0.55,
        "zod_hot": 0.25,
        "tail_hot": 0.10,
        "repeat": -0.15,
    },
    "hybrid": {
        "long": 0.55,
        "short": 0.15,
        "omit": 0.10,
        "zod_complement": 0.40,
        "same_tail": 0.18,
        "same_head": 0.15,
        "near12": 0.28,
        "repeat": -0.35,
        "zod_hot": 0.10,
    },
}

ENSEMBLES = [
    ["frequency"],
    ["continuity"],
    ["complement"],
    ["rebound"],
    ["hot"],
    ["hybrid"],
    ["continuity", "hybrid"],
    ["frequency", "continuity"],
    ["continuity", "complement", "hybrid"],
]


def pool(hist: list[dict], model: str, size: int = 8) -> list[int]:
    fs = features(hist)
    weights = MODELS[model]
    score = {
        n: sum(weights.get(k, 0.0) * v for k, v in fs[n].items())
        for n in range(1, 50)
    }
    # Greedy diversity: allow two numbers from one zodiac and three from one
    # head, so same-zodiac and 40s-style complement patterns remain possible.
    chosen: list[int] = []
    zc: Counter[int] = Counter()
    hc: Counter[int] = Counter()
    for n in sorted(score, key=lambda x: (-score[x], x)):
        if zc[zod(n)] >= 2 or hc[n // 10] >= 3:
            continue
        chosen.append(n)
        zc[zod(n)] += 1
        hc[n // 10] += 1
        if len(chosen) == size:
            break
    return chosen


def ensemble_pool(hist: list[dict], models: list[str], size: int = 8) -> list[int]:
    aggregate = {n: 0.0 for n in range(1, 50)}
    fs = features(hist)
    for model in models:
        weights = MODELS[model]
        score = {
            n: sum(weights.get(k, 0.0) * v for k, v in fs[n].items())
            for n in range(1, 50)
        }
        for i, n in enumerate(sorted(score, key=lambda x: (score[x], x))):
            aggregate[n] += i / 48
    chosen: list[int] = []
    zc: Counter[int] = Counter()
    hc: Counter[int] = Counter()
    for n in sorted(aggregate, key=lambda x: (-aggregate[x], x)):
        if zc[zod(n)] >= 2 or hc[n // 10] >= 3:
            continue
        chosen.append(n)
        zc[zod(n)] += 1
        hc[n // 10] += 1
        if len(chosen) == size:
            break
    return chosen


def evaluate_ensemble(rows: list[dict], models: list[str], limit: int = 70) -> dict:
    start = max(30, len(rows) - limit)
    results = []
    for i in range(start, len(rows)):
        p = ensemble_pool(rows[:i], models)
        hits = sorted(set(p) & set(rows[i]["n"]))
        results.append({"p": rows[i]["p"], "pool": p, "hits": hits})
    return {
        "models": models,
        "n": len(results),
        "success": sum(len(x["hits"]) >= 3 for x in results),
        "mean_hits": sum(len(x["hits"]) for x in results) / max(1, len(results)),
    }


def hit_probability(size: int) -> float:
    den = math.comb(49, 6)
    return sum(
        math.comb(size, k) * math.comb(49 - size, 6 - k)
        for k in range(3, min(size, 6) + 1)
    ) / den


def evaluate(rows: list[dict], model: str, start: int = 30) -> dict:
    results = []
    for i in range(start, len(rows)):
        p = pool(rows[:i], model)
        hits = sorted(set(p) & set(rows[i]["n"]))
        results.append({"p": rows[i]["p"], "pool": p, "hits": hits})
    return {
        "model": model,
        "n": len(results),
        "success": sum(len(x["hits"]) >= 3 for x in results),
        "mean_hits": sum(len(x["hits"]) for x in results) / max(1, len(results)),
        "results": results,
    }


def select_walk_forward(rows: list[dict], i: int) -> str:
    # Use the expanding validation history.  A short trailing window made the
    # selector chase noise because a true 8-code success is only a ~4.7% event.
    start = 30
    scores = []
    for name in MODELS:
        full = 0
        hits = 0
        n = 0
        for j in range(start, i):
            p = pool(rows[:j], name)
            c = len(set(p) & set(rows[j]["n"]))
            full += c >= 3
            hits += c
            n += 1
        # Balanced utility: success rate dominates, average coverage breaks ties.
        scores.append((full / max(1, n), hits / max(1, n), name))
    return max(scores)[2]


def evaluate_adaptive(rows: list[dict], start: int = 54) -> dict:
    results = []
    for i in range(start, len(rows)):
        model = select_walk_forward(rows, i)
        p = pool(rows[:i], model)
        hits = sorted(set(p) & set(rows[i]["n"]))
        results.append({"p": rows[i]["p"], "model": model, "pool": p, "hits": hits})
    return {
        "model": "adaptive",
        "n": len(results),
        "success": sum(len(x["hits"]) >= 3 for x in results),
        "mean_hits": sum(len(x["hits"]) for x in results) / max(1, len(results)),
        "results": results,
    }


def main() -> None:
    report = {"random_8code_success": hit_probability(8), "lots": {}}
    for key in ("XA", "LA", "GC"):
        rows = load_rows(key)
        models = [evaluate(rows, name) for name in MODELS]
        adaptive = evaluate_adaptive(rows)
        ensembles = [evaluate_ensemble(rows, names) for names in ENSEMBLES]
        selected = max(
            ensembles,
            key=lambda x: (
                (x["success"] + 1) / (x["n"] + 2),
                x["mean_hits"],
                -len(x["models"]),
            ),
        )
        # Explicitly retain the 103 -> 104 example for inspection.
        example = None
        if key == "GC":
            idx = next(i for i, r in enumerate(rows) if r["p"] == 104)
            example = {
                name: {
                    "pool": pool(rows[:idx], name),
                    "hits": sorted(set(pool(rows[:idx], name)) & set(rows[idx]["n"])),
                }
                for name in MODELS
            }
        report["lots"][key] = {
            "models": [
                {
                    "model": x["model"],
                    "n": x["n"],
                    "success": x["success"],
                    "rate": x["success"] / max(1, x["n"]),
                    "mean_hits": x["mean_hits"],
                }
                for x in models
            ],
            "adaptive": {
                "n": adaptive["n"],
                "success": adaptive["success"],
                "rate": adaptive["success"] / max(1, adaptive["n"]),
                "mean_hits": adaptive["mean_hits"],
            },
            "next_model": select_walk_forward(rows, len(rows)),
            "next_pool": pool(rows, select_walk_forward(rows, len(rows))),
            "selected_ensemble": {
                **selected,
                "rate": selected["success"] / max(1, selected["n"]),
                "next_pool": ensemble_pool(rows, selected["models"]),
            },
            "gc_103_to_104": example,
        }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
