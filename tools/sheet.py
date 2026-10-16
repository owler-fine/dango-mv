"""sheet.py — 把一堆图拼成联系表（contact sheet），用于快速目检。

用法:
  python tools/sheet.py <目录> <glob 模式> <输出.jpg> [列数] [单元宽]
  python tools/sheet.py stills "check_*.png" stills/_sheet.jpg 4 380

目录为相对路径时按仓库根目录解析（与 env.py 一致），不受当前 cwd 影响。
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import ROOT  # noqa: E402


def _resolve(p):
    """相对路径按仓库根解析，绝对路径原样返回。"""
    q = Path(p)
    return q if q.is_absolute() else ROOT / q


def main():
    if len(sys.argv) < 4:
        print(__doc__.strip())
        return 2

    d = _resolve(sys.argv[1])
    pat = sys.argv[2]
    out = _resolve(sys.argv[3])
    cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    cellw = int(sys.argv[5]) if len(sys.argv) > 5 else 480

    if not d.is_dir():
        print("!! 目录不存在: %s" % d)
        return 1

    files = sorted(d.glob(pat))
    if not files:
        print("!! 没有匹配文件: %s" % (d / pat))
        return 1
    if cols < 1 or cellw < 16:
        print("!! 列数需 >=1，单元宽需 >=16")
        return 1

    cells = []
    for f in files:
        im = Image.open(f).convert("RGB")
        h = max(1, int(im.height * cellw / im.width))
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

    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=88)
    print("sheet %s  %dx%d  %d cells" % (out, sheet.width, sheet.height, len(cells)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
