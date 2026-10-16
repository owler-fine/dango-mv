"""render_frames.py — 用本地 Edge 逐帧抓取 Canvas，再用 ffmpeg 编码成片。

用法:
  python tools/render_frames.py check                 # 冒烟测试：抓若干帧存 stills/，检查场景异常
  python tools/render_frames.py stills 10,30,60       # 抓指定时间点
  python tools/render_frames.py shots                 # 每个分镜抓中点位图 + manifest.json
  python tools/render_frames.py full                  # 全片抓帧 + 编码（慢）
  python tools/render_frames.py full --fps 30 --from 0 --to 30

外部依赖路径通过 tools/env.py 解析（环境变量 EDGE / FFMPEG 优先）。
已存在的帧会被跳过，中断后可重跑续渲。
"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import (  # noqa: E402
    CANVAS_H, CANVAS_W, DEFAULT_DURATION, FRAMES, OUT, SHOTS, STILLS,
    browser_path, ffmpeg_required, file_url,
)

URL = file_url("src", "index.html", query="?nopreview")


def open_page(pw, w=CANVAS_W, h=CANVAS_H):
    browser = pw.chromium.launch(
        executable_path=browser_path(),
        args=["--force-device-scale-factor=1", "--hide-scrollbars",
              "--disable-lcd-text", "--font-render-hinting=none"],
    )
    page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    page.goto(URL, wait_until="load")
    page.wait_for_function("() => window.__ready === true", timeout=30000)
    return browser, page


def errors(page):
    return page.evaluate("() => window.__errors")


def shoot(page, t, path):
    page.evaluate("(t) => window.__seek(t)", t)
    page.screenshot(path=str(path),
                    clip={"x": 0, "y": 0, "width": CANVAS_W, "height": CANVAS_H})
    return path


def _report(prefix, errs):
    if not errs:
        return 0
    print("!! %s%d render errors:" % (prefix, len(errs)))
    for e in errs[:40]:
        print("   " + e)
    return 1


def cmd_check():
    STILLS.mkdir(exist_ok=True)
    d = DEFAULT_DURATION
    times = [d * f for f in (0.01, 0.03, 0.10, 0.15, 0.23, 0.29, 0.37, 0.43,
                             0.53, 0.62, 0.73, 0.78, 0.85, 0.89, 0.95, 0.98)]
    with sync_playwright() as pw:
        browser, page = open_page(pw)
        t0 = time.time()
        for t in times:
            shoot(page, t, STILLS / ("check_%06.2f.png" % t))
        errs = errors(page)
        browser.close()
    print("grabbed %d stills in %.1fs -> %s" % (len(times), time.time() - t0, STILLS))
    return _report("", errs)


def cmd_stills(spec):
    STILLS.mkdir(exist_ok=True)
    times = [float(x) for x in spec.split(",") if x.strip()]
    if not times:
        print("用法: python tools/render_frames.py stills 10,30,60")
        return 1
    with sync_playwright() as pw:
        browser, page = open_page(pw)
        for t in times:
            p = STILLS / ("f_%08.3f.png" % t)
            shoot(page, t, p)
            print("  %.3f -> %s" % (t, p.name))
        errs = errors(page)
        browser.close()
    return _report("", errs)


def cmd_shots():
    """每个分镜抓一张中点位图，用于逐镜审图。文件名只用序号，名称写入 manifest.json。"""
    SHOTS.mkdir(exist_ok=True)
    manifest = []
    with sync_playwright() as pw:
        browser, page = open_page(pw)
        lst = page.evaluate("() => window.__shotList()")
        for i, s in enumerate(lst):
            t = (s["t0"] + s["t1"]) / 2.0
            page.evaluate("(t) => window.__seek(t)", t)
            p = SHOTS / ("s%03d.png" % i)
            page.screenshot(path=str(p),
                            clip={"x": 0, "y": 0, "width": CANVAS_W, "height": CANVAS_H})
            manifest.append({"i": i, "name": s["name"], "t0": s["t0"],
                             "t1": s["t1"], "t": round(t, 3)})
        errs = errors(page)
        browser.close()
    (SHOTS / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print("%d shots -> %s" % (len(manifest), SHOTS))
    return _report("", errs)


def cmd_full(fps, t_from, t_to):
    if t_to <= t_from:
        print("!! --to 必须大于 --from（收到 from=%.3f to=%.3f）" % (t_from, t_to))
        return 1
    if fps <= 0:
        print("!! --fps 必须为正整数")
        return 1

    FRAMES.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)

    # 帧号用全局帧号 round(t*fps)，不用循环计数。否则 --from 10 会把 t=10s
    # 写成 f_000000.jpg，与全片 t=0s 撞名，续渲时静默错位。
    i_from = int(round(t_from * fps))
    i_to = int(round(t_to * fps))
    total = i_to - i_from + 1

    with sync_playwright() as pw:
        browser, page = open_page(pw)
        t0 = time.time()
        done = 0
        for i in range(i_from, i_to + 1):
            t = i / fps
            p = FRAMES / ("f_%06d.jpg" % i)
            if p.exists():
                done += 1
                continue
            page.evaluate("(t) => window.__seek(t)", t)
            page.screenshot(path=str(p), type="jpeg", quality=92,
                            clip={"x": 0, "y": 0, "width": CANVAS_W, "height": CANVAS_H})
            if (i - i_from) % 30 == 0:
                el = time.time() - t0
                got = i - i_from + 1 - done
                rate = got / el if el > 0 else 0
                left = total - (i - i_from + 1)
                eta = left / rate if rate > 0 else 0
                print("  %d/%d  t=%.2fs  %.1f fps  eta %.0fs"
                      % (i - i_from, total - 1, t, rate, eta))
        errs = errors(page)
        browser.close()
    if done:
        print("skipped %d existing frames" % done)
    print("frames done in %.0fs" % (time.time() - t0))
    rc = _report("", errs)

    song = None
    for cand in ("song.mp3", "song.wav", "song.m4a", "song.flac"):
        if (ROOT_INPUT / cand).exists():
            song = ROOT_INPUT / cand
            break

    # 成片时长比音频长就告警：-shortest 会把画面截断
    dur = (i_to - i_from + 1) / fps
    if song and abs(dur - DEFAULT_DURATION) > 1.0:
        print("提示: 渲染 %.1fs，DEFAULT_DURATION 为 %.1fs。"
              "若音频更短，混流会用 -shortest 截断画面。" % (dur, DEFAULT_DURATION))

    name = "mv"
    if t_from > 0 or t_to < DEFAULT_DURATION:
        name += "_%.0f_%.0f" % (t_from, t_to)
    mp4 = OUT / (name + ".mp4")

    cmd = [ffmpeg_required(), "-y", "-v", "error",
           "-framerate", str(fps), "-start_number", str(i_from),
           "-i", str(FRAMES / "f_%06d.jpg")]
    if song:
        cmd += ["-i", str(song), "-map", "0:v:0", "-map", "1:a:0",
                "-c:a", "aac", "-b:a", "192k", "-shortest"]
    else:
        print("提示: input/ 下没有音频文件，只出无声视频。")
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-pix_fmt", "yuv420p", "-r", str(fps),
            "-movflags", "+faststart", str(mp4)]

    print("encoding ->", mp4)
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        print(r.stderr.decode("utf-8", "replace")[-2000:])
        return 1
    print("OK  %s  %.1f MB" % (mp4, mp4.stat().st_size / 1e6))
    return rc


ROOT_INPUT = Path(__file__).resolve().parent.parent / "input"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["check", "stills", "shots", "full"])
    ap.add_argument("spec", nargs="?", default="")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--from", dest="t_from", type=float, default=0.0)
    ap.add_argument("--to", dest="t_to", type=float, default=DEFAULT_DURATION)
    a = ap.parse_args()
    if a.cmd == "check":
        sys.exit(cmd_check())
    if a.cmd == "stills":
        sys.exit(cmd_stills(a.spec))
    if a.cmd == "shots":
        sys.exit(cmd_shots())
    sys.exit(cmd_full(a.fps, a.t_from, a.t_to))


if __name__ == "__main__":
    main()
