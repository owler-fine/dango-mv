"""sheet.py — 把一堆 PNG 拼成联系表（contact sheet），用于快速目检。
用法: python tools/sheet.py <glob_dir> <pattern> <out.jpg> [cols] [cell_w]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

d = Path(sys.argv[1])
pat = sys.argv[2]
out = sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
cellw = int(sys.argv[5]) if len(sys.argv) > 5 else 480

files = sorted(d.glob(pat))
if not files:
    print("no files for", d / pat)
    sys.exit(1)

cells = []
for f in files:
    im = Image.open(f).convert("RGB")
    h = int(im.height * cellw / im.width)
    im = im.resize((cellw, h), Image.LANCZOS)
    lab = Image.new("RGB", (cellw, h + 22), (20, 20, 20))
    lab.paste(im, (0, 22))
    dr = ImageDraw.Draw(lab)
    dr.text((6, 5), f.stem, fill=(240, 235, 220))
    cells.append(lab)

cw, ch = cells[0].size
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cw * cols, ch * rows), (12, 12, 12))
for i, c in enumerate(cells):
    sheet.paste(c, ((i % cols) * cw, (i // cols) * ch))

sheet.save(out, quality=88)
print("sheet %s  %dx%d  %d cells" % (out, sheet.width, sheet.height, len(cells)))
