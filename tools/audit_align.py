"""核对：每条歌词字幕落在哪一镜里，与原曲歌词内容是否对得上。

输出 idx / 歌词时间 / 日文歌词 / 所在镜名 / 该镜起始时间。
凡是「镜名与歌词明显无关」的行，就是字幕-画面对不上的地方。
"""
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

shots = json.load(open("shots/manifest.json", encoding="utf-8"))
# lyrics.js 是多行 JSON 对象数组，直接抓 "t"/"text" 相邻配对
txt = open("src/lyrics.js", encoding="utf-8").read()
pairs = re.findall(r'"t":\s*([0-9.]+),\s*\n\s*"text":\s*"([^"]*)"', txt)

print("idx  lyric_t   shot_t0   shot_name                       | lyric")
print("-" * 100)
for i, (t, s) in enumerate(pairs):
    t = float(t)
    hit = [x for x in shots if x["t0"] <= t < x["t1"]]
    nm = hit[0]["name"] if hit else "--"
    t0 = hit[0]["t0"] if hit else float("nan")
    print("%2d  %7.3f  %8.2f  %-30s | %s" % (i, t, t0, nm, s))
