"""cover_render.py — 用本地 Edge 抓取封面 Canvas，输出 PNG。

用法:
  python tools/cover_render.py                  # 渲染到 out/cover.png
  python tools/cover_render.py --thumb          # 额外导出 320px 缩略图用于可读性自检
  python tools/cover_render.py --size 1146x717  # 自定义画布尺寸（须与 src/cover.js 一致）

外部依赖路径通过 tools/env.py 解析（环境变量 EDGE / FFMPEG 优先）。
"""
import argparse
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import OUT, browser_path, ffmpeg_path, file_url  # noqa: E402

CW, CH = 1146, 717
URL = file_url("src", "cover.html")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--thumb", action="store_true", help="同时导出 320px 缩略图")
    ap.add_argument("--out", default="cover.png")
    ap.add_argument("--size", default="%dx%d" % (CW, CH), help="画布尺寸，如 1146x717")
    a = ap.parse_args()

    cw, ch = (int(x) for x in a.size.lower().split("x"))

    OUT.mkdir(exist_ok=True)
    png = OUT / a.out

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=browser_path(),
            args=["--force-device-scale-factor=1", "--hide-scrollbars",
                  "--disable-lcd-text", "--font-render-hinting=none"],
        )
        page = browser.new_page(viewport={"width": cw, "height": ch}, device_scale_factor=1)
        page.goto(URL, wait_until="load")
        page.wait_for_function("() => window.__coverReady === true", timeout=30000)
        ok = page.evaluate("() => window.__renderCover()")
        errs = page.evaluate("() => window.__coverErrors")
        if not ok or errs:
            print("!! render failed:", errs)
            browser.close()
            return 1
        page.screenshot(path=str(png), clip={"x": 0, "y": 0, "width": cw, "height": ch})
        browser.close()

    print("OK  %s  %d B" % (png, png.stat().st_size))

    if a.thumb:
        ff = ffmpeg_path()
        if not ff:
            print("提示: 找不到 ffmpeg，跳过缩略图导出。")
            return 0
        th = OUT / "cover_thumb320.png"
        r = subprocess.run([ff, "-y", "-v", "error", "-i", str(png),
                            "-vf", "scale=320:-1", str(th)], capture_output=True)
        if r.returncode != 0:
            print(r.stderr.decode("utf-8", "replace")[-800:])
            return 1
        print("OK  %s  (list-page thumbnail)" % th)
    return 0


if __name__ == "__main__":
    sys.exit(main())
