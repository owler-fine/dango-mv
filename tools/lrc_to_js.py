"""把 LRC 转成浏览器可直接引用的 JS（file:// 下 fetch 被禁）。
输出 src/lyrics.js，形如：
  var LYRICS = [{t:0.700, text:"..."}, ...];
"""
import json
import re
import sys

src = sys.argv[1] if len(sys.argv) > 1 else "input/lyrics.lrc"
dst = sys.argv[2] if len(sys.argv) > 2 else "src/lyrics.js"

rows = []
for line in open(src, encoding="utf-8"):
    m = re.match(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)", line.strip())
    if not m:
        continue
    t = int(m.group(1)) * 60 + float(m.group(2))
    text = m.group(3).strip()
    rows.append({"t": round(t, 3), "text": text})

with open(dst, "w", encoding="utf-8") as f:
    f.write("/* 自动生成，勿手改 —— 源：%s */\n" % src.replace("\\", "/"))
    f.write("var LYRICS = ")
    f.write(json.dumps(rows, ensure_ascii=False, indent=0))
    f.write(";\n")

print("wrote %s : %d lines" % (dst, len(rows)))
for r in rows[:4]:
    print("  %.3f  %s" % (r["t"], r["text"]))
