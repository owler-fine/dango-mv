"""Measure tempo, onsets, section boundaries and energy for an audio file.

Usage: python analyze_song.py <audio> <out.json> [--sr 22050]

numpy-only (no scipy). Decodes via ffmpeg to f32le mono.
Emits: bpm, beat grid, onset list, RMS envelope, section map.
"""
import json
import subprocess
import sys

import numpy as np

FFMPEG = "ffmpeg"


def decode(path, sr):
    cmd = [FFMPEG, "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr),
           "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def spectral_flux(x, sr, n_fft=1024, hop=512):
    win = np.hanning(n_fft).astype(np.float32)
    n_frames = 1 + (len(x) - n_fft) // hop
    mags = np.empty((n_frames, n_fft // 2 + 1), dtype=np.float32)
    for i in range(n_frames):
        seg = x[i * hop:i * hop + n_fft] * win
        mags[i] = np.abs(np.fft.rfft(seg))
    diff = np.diff(mags, axis=0)
    flux = np.maximum(diff, 0).sum(axis=1)
    times = np.arange(len(flux)) * hop / sr
    return flux, times


def rms_envelope(x, sr, win_s=0.25):
    w = int(sr * win_s)
    n = len(x) // w
    frames = x[:n * w].reshape(n, w)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    return rms, np.arange(n) * win_s


def pick_peaks(flux, times, min_gap_s=0.06):
    thresh = flux.mean() + 0.6 * flux.std()
    peaks = []
    last = -1e9
    for i in range(1, len(flux) - 1):
        if flux[i] > thresh and flux[i] >= flux[i - 1] and flux[i] > flux[i + 1]:
            t = times[i]
            if t - last >= min_gap_s:
                peaks.append((t, float(flux[i])))
                last = t
    return peaks


def estimate_bpm(peaks, lo=60.0, hi=200.0):
    if len(peaks) < 8:
        return None, None, []
    ts = np.array([p[0] for p in peaks])
    iois = np.diff(ts)
    iois = iois[(iois > 0.12) & (iois < 2.0)]
    if len(iois) < 8:
        return None, None, []
    # fold every IOI into the target range, then histogram
    best = (None, -1, None)
    for bpm in np.arange(lo, hi, 0.1):
        period = 60.0 / bpm
        errs = np.abs(iois / period - np.round(iois / period))
        score = float(np.mean(np.exp(-(errs ** 2) / (2 * 0.06 ** 2))))
        if score > best[1]:
            best = (bpm, score, period)
    bpm, score, period = best
    beats = np.arange(ts[0], ts[-1], period)
    return float(bpm), float(score), beats.tolist()


def find_sections(rms, rms_t, win=4.0):
    """Segment by RMS novelty: report contiguous low-energy (interlude) spans."""
    if len(rms) < 8:
        return []
    smooth = np.convolve(rms, np.ones(4) / 4, mode="same")
    med = float(np.median(smooth))
    quiet = smooth < med * 0.35
    spans = []
    start = None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = rms_t[i]
        elif not q and start is not None:
            if rms_t[i] - start >= 3.0:
                spans.append([round(float(start), 2), round(float(rms_t[i]), 2)])
            start = None
    if start is not None and rms_t[-1] - start >= 3.0:
        spans.append([round(float(start), 2), round(float(rms_t[-1]), 2)])
    return spans


def main():
    path, out = sys.argv[1], sys.argv[2]
    sr = 22050
    if "--sr" in sys.argv:
        sr = int(sys.argv[sys.argv.index("--sr") + 1])

    x = decode(path, sr)
    dur = len(x) / sr
    flux, ftimes = spectral_flux(x, sr)
    peaks = pick_peaks(flux, ftimes)
    bpm, conf, beats = estimate_bpm(peaks)
    rms, rms_t = rms_envelope(x, sr)
    sections = find_sections(rms, rms_t)

    quietest = None
    if len(rms):
        i = int(np.argmin(rms))
        quietest = [round(float(rms_t[i]), 2), round(float(rms[i]), 5)]

    report = {
        "duration": round(dur, 3),
        "sample_rate": sr,
        "bpm": round(bpm, 2) if bpm else None,
        "bpm_confidence": round(conf, 4) if conf else None,
        "beat_period_s": round(60.0 / bpm, 4) if bpm else None,
        "n_beats": len(beats),
        "beats": [round(b, 3) for b in beats],
        "n_onsets": len(peaks),
        "onsets_per_sec": round(len(peaks) / dur, 2) if dur else None,
        "onsets": [round(p[0], 3) for p in peaks],
        "rms_t": [round(float(t), 2) for t in rms_t],
        "rms": [round(float(v), 5) for v in rms],
        "quiet_spans": sections,
        "quietest_moment": quietest,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    print(f"duration={report['duration']}s")
    print(f"bpm={report['bpm']} conf={report['bpm_confidence']} period={report['beat_period_s']}s")
    print(f"onsets={report['n_onsets']} ({report['onsets_per_sec']}/s)")
    print(f"quiet_spans={report['quiet_spans']}")
    print(f"quietest={report['quietest_moment']}")


if __name__ == "__main__":
    main()
