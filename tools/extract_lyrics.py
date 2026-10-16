"""Extract embedded USLT lyrics from an mp3 into a clean LRC file.

Usage: python extract_lyrics.py <in.mp3> <out.lrc>
Reads the raw ID3v2 frames directly (no mutagen dependency).
"""
import re
import struct
import sys
from pathlib import Path


def read_id3_frames(path):
    data = Path(path).read_bytes()
    if data[:3] != b"ID3":
        return {}
    major = data[3]
    size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14) | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F)
    body = data[10:10 + size]
    frames = {}
    i = 0
    idlen = 3 if major == 2 else 4
    while i + 10 < len(body):
        fid = body[i:i + idlen]
        if not re.fullmatch(rb"[A-Z0-9]{3,4}", fid):
            break
        if major == 2:
            fsize = struct.unpack(">I", b"\x00" + body[i + 3:i + 6])[0]
            hdr = 6
        elif major == 3:
            fsize = struct.unpack(">I", body[i + 4:i + 8])[0]
            hdr = 10
        else:
            fsize = ((body[i + 4] & 0x7F) << 21) | ((body[i + 5] & 0x7F) << 14) | \
                    ((body[i + 6] & 0x7F) << 7) | (body[i + 7] & 0x7F)
            hdr = 10
        if fsize <= 0 or i + hdr + fsize > len(body):
            break
        frames[fid.decode("latin-1")] = body[i + hdr:i + hdr + fsize]
        i += hdr + fsize
    return frames


def decode_uslt(raw):
    enc = raw[0]
    payload = raw[1:]
    if enc == 0:
        text = payload.decode("latin-1")
    elif enc == 1:
        text = payload.decode("utf-16")
    elif enc == 2:
        text = payload.decode("utf-16-be")
    else:
        text = payload.decode("utf-8", "replace")
    # drop the 3 NUL-separated descriptor fields (language, descriptor, "")
    text = text.replace("\x00", "\n", 2)
    parts = text.split("\n", 2)
    return parts[2] if len(parts) == 3 else text


def main():
    src, dst = sys.argv[1], sys.argv[2]
    frames = read_id3_frames(src)
    blob = None
    for fid in ("USLT", "ULT", "LYR", "SYLT"):
        if fid in frames:
            blob = decode_uslt(frames[fid]) if fid in ("USLT", "ULT") else frames[fid].decode("utf-8", "replace")
            break
    if not blob:
        print("NO_LYRICS_FRAME")
        return 1

    lines = []
    for line in blob.splitlines():
        line = line.strip()
        if not line:
            continue
        # strip furigana annotations: 大家族(だいかぞく) -> 大家族
        line = re.sub(r"([\u4e00-\u9fff\u3005])\s*[（(][\u3040-\u30ffー]+[）)]", r"\1", line)
        line = re.sub(r"[（(][\u3040-\u30ffー]{2,}[）)]", "", line)
        line = re.sub(r"\s{2,}", " ", line).strip()
        lines.append(line)

    Path(dst).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"WROTE {dst} lines={len(lines)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
