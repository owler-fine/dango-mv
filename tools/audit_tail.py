"""audit_tail.py — 只查尾奏段：每条字幕落在哪一镜、距镜尾还剩多久、切点相对歌词起唱的偏移。

用法: D:\\python\\python.exe tools\\audit_tail.py
"""
import io
import json
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

shots = json.load(open("shots/manifest.json", encoding="utf-8"))
txt = open("src/lyrics.js", encoding="utf-8").read()
pairs = [(float(t), s) for t, s in
         re.findall(r'"t":\s*([0-9.]+),\s*\n\s*"text":\s*"([^"]*)"', txt)]

print("=== 尾奏 236..273：每条字幕 vs 所在镜 ===")
for t, s in pairs:
    if t < 236:
        continue
    hit = [x for x in shots if x["t0"] <= t < x["t1"]]
    if not hit:
        print("%7.2f  (无镜)  | %s" % (t, s))
        continue
    h = hit[0]
    print("t=%7.2f  shot#%02d %-14s [%7.2f..%7.2f]  距镜尾 %5.2fs | %s"
          % (t, h["i"], h["name"], h["t0"], h["t1"], h["t1"] - t, s))

print()
print("=== 尾奏镜头边界 vs 最近歌词起唱时刻 ===")
lyr = [t for t, _ in pairs if t >= 236]
for x in shots:
    if x["t0"] < 236:
        continue
    near = sorted(lyr, key=lambda L: abs(L - x["t0"]))[:2]
    print("#%02d t0=%7.2f %-16s 最近歌词起唱 %s"
          % (x["i"], x["t0"], x["name"],
             ", ".join("%7.2f(d%+.2f)" % (L, L - x["t0"]) for L in near)))
