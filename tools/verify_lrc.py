"""Verify an LRC's timestamps against the audio by measuring onset strength at
each lyric time, and report the beat grid implied by consecutive lyric lines.

Usage: python verify_lrc.py <audio> <lyrics.lrc> [--window 0.35]
"""
import re
import subprocess
import sys

import numpy as np


def decode(path, sr=22050):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32), sr


def onset_env(x, sr, n_fft=2048, hop=256):
    win = np.hanning(n_fft).astype(np.float32)
    n = 1 + (len(x) - n_fft) // hop
    prev = None
    flux = np.empty(n, dtype=np.float32)
    for i in range(n):
        seg = x[i * hop:i * hop + n_fft] * win
        mag = np.abs(np.fft.rfft(seg))
        flux[i] = 0.0 if prev is None else np.maximum(mag - prev, 0).sum()
        prev = mag
    return flux, hop / sr


def parse_lrc(path):
    out = []
    for line in open(path, encoding="utf-8"):
        m = re.match(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)", line.strip())
        if not m:
            continue
        t = int(m.group(1)) * 60 + float(m.group(2))
        text = m.group(3).strip()
        out.append((t, text))
    return out


def main():
    audio, lrc = sys.argv[1], sys.argv[2]
    window = 0.35
    if "--window" in sys.argv:
        window = float(sys.argv[sys.argv.index("--window") + 1])

    x, sr = decode(audio)
    flux, dt = onset_env(x, sr)
    peak = float(flux.max())

    entries = parse_lrc(lrc)
    print(f"# {len(entries)} timed lines; onset peak={peak:.1f}")
    print(f"{'time':>9}  {'hit':>6}  {'IOI':>6}  text")
    prev = None
    iois = []
    for t, text in entries:
        a = max(0, int((t - window) / dt))
        b = min(len(flux), int((t + window) / dt) + 1)
        local = flux[a:b]
        # is there an onset near this timestamp?
        hit = float(local.max() / peak) if len(local) else 0.0
        ioi = "" if prev is None else f"{t - prev:6.3f}"
        if prev is not None and t - prev < 30:
            iois.append(t - prev)
        print(f"{t:9.3f}  {hit:6.3f}  {ioi:>6}  {text[:40]}")
        prev = t

    if iois:
        arr = np.array(iois)
        print()
        print(f"# inter-line intervals: n={len(arr)} mean={arr.mean():.3f}s median={np.median(arr):.3f}s")
        for bpm in (100.0, 112.5, 120.0, 133.75, 150.0):
            p = 60.0 / bpm
            err = np.abs(arr / p - np.round(arr / p))
            print(f"  vs {bpm:6.2f} BPM ({p:.4f}s/beat): mean |err| = {err.mean():.4f} beats "
                  f"= {err.mean()*p*1000:.0f} ms")


if __name__ == "__main__":
    main()
