"""measure_headroom.py — 量每个尾奏镜头里「主体（团子排）最低墨线」与「字幕纸条顶 y=944」的余量。

团子排是水平居中、有粗黑描边的一排圆；用「每列最深墨线的最大行」在中央 x 带内取众数，
避开四角 confetti / 山脉。
"""
import io
import sys
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

STRIP_TOP = 944
FILES = [
    ("f_0242.430.png", "だんご×4 (尾) @242.43"),
    ("f_0247.210.png", "大家族 (尾) @247.21"),
    ("f_0251.910.png", "大家族 (尾) @251.91"),
    ("f_0256.820.png", "だんご×4 (尾2) @256.82"),
    ("f_0261.640.png", "だんご×4 (尾2) @261.64"),
]

print("镜头                                主体底边 y   纸条顶 y   余量(px)")
print("-" * 68)
for f, label in FILES:
    im = Image.open("stills/" + f).convert("L")
    W, H = im.size
    px = im.load()
    # 中央 60% 横向带，逐列找该列最深的墨线行（y 在 150..940）
    bottoms = []
    for x in range(int(W * 0.20), int(W * 0.80), 4):
        last = None
        for y in range(150, 940):
            if px[x, y] < 90:
                last = y
        if last:
            bottoms.append(last)
    if not bottoms:
        print("%-32s %s" % (label, "未找到主体"))
        continue
    bottoms.sort()
    # 取 90 分位，代表主体下缘（排除个别 confetti 拖尾）
    body = bottoms[int(len(bottoms) * 0.90)]
    print("%-32s %8d %8d %9d" % (label, body, STRIP_TOP, STRIP_TOP - body))
