"""env.py — 统一解析外部可执行文件路径与渲染参数。

优先级：环境变量 > 常见安装位置探测。
这样在别人机器上 clone 下来就能跑，不必改源码。
"""
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
STILLS = ROOT / "stills"
FRAMES = ROOT / "frames"
OUT = ROOT / "out"
SHOTS = ROOT / "shots"

# ── 浏览器：优先环境变量 EDGE / CHROME，其次常见安装路径，最后 PATH ──

_BROWSER_CANDIDATES = {
    "win32": [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ],
    "darwin": [
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ],
    "linux": [
        "/usr/bin/microsoft-edge",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ],
}


def _first_existing(paths):
    for p in paths:
        if p and Path(p).exists():
            return str(p)
    return None


def browser_path():
    """返回 Edge / Chrome 可执行文件路径；找不到则抛错并给出修复提示。"""
    env = os.environ.get("EDGE") or os.environ.get("CHROME")
    if env:
        if Path(env).exists():
            return env
        raise RuntimeError(
            "环境变量 EDGE/CHROME 指向的文件不存在: %s" % env
        )

    plat = "win32" if sys.platform.startswith("win") else (
        "darwin" if sys.platform == "darwin" else "linux")
    found = _first_existing(_BROWSER_CANDIDATES[plat])
    if found:
        return found

    for name in ("msedge", "microsoft-edge", "google-chrome", "chrome", "chromium"):
        p = shutil.which(name)
        if p:
            return p

    raise RuntimeError(
        "找不到 Edge / Chrome。请任选一种方式指定：\n"
        "  1) 设置环境变量 EDGE=<浏览器可执行文件路径>\n"
        "  2) 或安装 Edge / Chrome 到默认位置\n"
        "Windows 示例: set EDGE=\"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe\""
    )


def ffmpeg_path():
    """返回 ffmpeg 可执行文件路径；找不到则返回 None（调用方决定是否必需）。"""
    env = os.environ.get("FFMPEG")
    if env:
        if Path(env).exists():
            return env
        raise RuntimeError("环境变量 FFMPEG 指向的文件不存在: %s" % env)
    return shutil.which("ffmpeg")


def ffmpeg_required():
    p = ffmpeg_path()
    if not p:
        raise RuntimeError(
            "找不到 ffmpeg。请设置环境变量 FFMPEG=<ffmpeg 路径> 或把它加入 PATH。"
        )
    return p


# ── 画布尺寸（与 src/lib.js 里的 W/H 必须一致）──
CANVAS_W = 1920
CANVAS_H = 1080

# ── 参考片时长；换歌时改这里，或命令行 --to 覆盖 ──
DEFAULT_DURATION = 273.031825


def file_url(*parts, query=""):
    """构造 file:// URL（跨平台）。

    路径按 URL 规则做 percent-encode：目录名含空格、#、?、% 时
    交给浏览器的宽松解析会出错，必须显式转义。
    """
    p = ROOT.joinpath(*parts).resolve()
    posix = p.as_posix()
    # 逐段转义，保留路径分隔符；safe='/:@' 让 Windows 盘符与 POSIX 根原样保留
    from urllib.parse import quote
    encoded = quote(posix, safe="/:~")
    return "file:///" + encoded.lstrip("/") + query

