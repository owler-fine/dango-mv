"""Refine tempo via autocorrelation of the onset-strength envelope.

Usage: python tempo_refine.py <audio> [--sr 22050] [--lo 60] [--hi 200]
Prints the top BPM candidates with their autocorrelation scores, plus the
implied bar length for common meters so a human/agent can pick the right one.
"""
import subprocess
import sys

import numpy as np


def decode(path, sr):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def onset_envelope(x, sr, n_fft=2048, hop=256):
    win = np.hanning(n_fft).astype(np.float32)
    n = 1 + (len(x) - n_fft) // hop
    prev = None
    flux = np.empty(n, dtype=np.float32)
    for i in range(n):
        seg = x[i * hop:i * hop + n_fft] * win
        mag = np.abs(np.fft.rfft(seg))
        if prev is None:
            flux[i] = 0.0
        else:
            flux[i] = np.maximum(mag - prev, 0).sum()
        prev = mag
    # subtract a moving median -> onset strength, then half-wave rectify
    k = 21
    pad = np.pad(flux, k // 2, mode="edge")
    med = np.array([np.median(pad[i:i + k]) for i in range(len(flux))])
    env = np.maximum(flux - med, 0)
    return env, hop / sr


def autocorr_tempo(env, dt, lo, hi):
    env = env - env.mean()
    ac = np.correlate(env, env, mode="full")[len(env) - 1:]
    ac /= ac[0] + 1e-12
    lags = np.arange(len(ac)) * dt
    results = []
    for bpm in np.arange(lo, hi, 0.25):
        period = 60.0 / bpm
        # combine the lag at this period and its 2nd/3rd/4th harmonics
        score = 0.0
        weight = 0.0
        for mult, w in ((1, 1.0), (2, 0.6), (3, 0.4), (4, 0.3)):
            lag = period * mult
            idx = int(round(lag / dt))
            if 0 < idx < len(ac):
                score += w * ac[idx]
                weight += w
        results.append((bpm, score / weight))
    return results, lags, ac


def main():
    path = sys.argv[1]
    sr = 22050
    lo, hi = 60.0, 200.0
    if "--sr" in sys.argv:
        sr = int(sys.argv[sys.argv.index("--sr") + 1])
    if "--lo" in sys.argv:
        lo = float(sys.argv[sys.argv.index("--lo") + 1])
    if "--hi" in sys.argv:
        hi = float(sys.argv[sys.argv.index("--hi") + 1])

    x = decode(path, sr)
    env, dt = onset_envelope(x, sr)
    results, lags, ac = autocorr_tempo(env, dt, lo, hi)

    # local maxima only
    peaks = []
    for i in range(1, len(results) - 1):
        b, s = results[i]
        if s >= results[i - 1][1] and s > results[i + 1][1]:
            peaks.append((b, s))
    peaks.sort(key=lambda p: -p[1])

    print(f"# onset envelope: {len(env)} frames, hop {dt*1000:.1f} ms")
    print("# top BPM candidates (score = harmonic-weighted autocorrelation)")
    seen = []
    for bpm, score in peaks:
        if any(abs(bpm - s) < 3 for s in seen):
            continue
        seen.append(bpm)
        bar4 = 4 * 60.0 / bpm
        bar3 = 3 * 60.0 / bpm
        print(f"  {bpm:7.2f} BPM  score={score:.4f}  period={60.0/bpm:.4f}s  "
              f"4/4 bar={bar4:.3f}s  3/4 bar={bar3:.3f}s")
        if len(seen) >= 6:
            break


if __name__ == "__main__":
    main()
