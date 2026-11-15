"""MIDI をピアノロールの画像にする。音を聞けないエージェントが、書いたものを目で確かめるための道具。

横が時間（小節の区切りに縦線）、縦が音の高さ（C の位置に横線）。トラックごとに色を変え、
上の帯に、どの core-theme・motiv をどこに置いたかを書く。良し悪しの判定はしない。
"""

from __future__ import annotations

from pathlib import Path

import mido
from PIL import Image, ImageDraw, ImageFont

COLORS = [
    (220, 70, 60), (60, 120, 220), (60, 170, 90), (230, 160, 40), (160, 80, 200),
    (40, 170, 180), (200, 90, 150), (120, 120, 60), (90, 90, 90), (200, 120, 80),
    (80, 160, 220), (150, 200, 70), (220, 200, 60), (120, 70, 140), (70, 110, 90), (180, 60, 60),
]
PX_PER_BEAT = 24
ROW = 4  # 半音 1 つの高さ
LABEL_H = 16


def _font(size: int):
    for p in ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _notes(mid: mido.MidiFile):
    out = []  # (track index, start beat, end beat, pitch, velocity, drum)
    for ti, tr in enumerate(mid.tracks):
        now, on = 0, {}
        for msg in tr:
            now += msg.time
            if msg.type == "note_on" and msg.velocity > 0:
                on.setdefault((msg.channel, msg.note), []).append((now, msg.velocity))
            elif msg.type in ("note_off", "note_on"):
                stack = on.get((msg.channel, msg.note))
                if stack:
                    s, v = stack.pop(0)
                    out.append((ti, s / mid.ticks_per_beat, now / mid.ticks_per_beat, msg.note, v, msg.channel == 9))
    return out


def draw(midi_path: Path, png_path: Path, meta: dict, motifs: dict | None = None, theme=None) -> None:
    mid = mido.MidiFile(midi_path, charset="utf-8")
    notes = _notes(mid)
    num, den = (int(x) for x in meta["meter"].split("/"))
    bar = num * 4 / den
    total = max([meta["length_beats"]] + [e for _, _, e, *_ in notes])
    pitched = [p for _, _, _, p, _, drum in notes if not drum] or [60]
    lo, hi = min(pitched) - 2, max(pitched) + 2
    names = [t["name"] for t in meta["tracks"]]
    label_rows = len(meta["tracks"]) + (1 if motifs else 0)
    drum_h = 40 if any(n[5] for n in notes) else 0
    top = LABEL_H * label_rows + 4
    w = int(total * PX_PER_BEAT) + 60
    h = top + (hi - lo + 1) * ROW + drum_h + 30
    img = Image.new("RGB", (w, h), (250, 248, 242))
    d = ImageDraw.Draw(img)
    f = _font(11)
    x0 = 50
    roll_bottom = top + (hi - lo + 1) * ROW

    def y_of(p: int) -> int:
        return top + (hi - p) * ROW

    for p in range(lo, hi + 1):
        if p % 12 == 0:
            d.line([(x0, y_of(p) + ROW), (w, y_of(p) + ROW)], fill=(205, 200, 190))
            d.text((4, y_of(p) - 4), f"C{p // 12 - 1}", fill=(120, 110, 100), font=f)
    b, n = 0.0, 1
    while b <= total + 1e-9:
        x = x0 + b * PX_PER_BEAT
        d.line([(x, top), (x, roll_bottom + drum_h)], fill=(170, 165, 155) if n % 4 == 1 else (220, 215, 205))
        d.text((x + 2, roll_bottom + drum_h + 4), str(n), fill=(120, 110, 100), font=f)
        b += bar
        n += 1
    if meta.get("loop"):
        x = x0 + meta["length_beats"] * PX_PER_BEAT
        d.line([(x, 0), (x, h)], fill=(200, 40, 40), width=2)

    for ti, s, e, p, v, drum in notes:
        c = COLORS[(ti - 1) % len(COLORS)]
        shade = tuple(int(255 - (255 - ch) * (0.45 + 0.55 * v / 127)) for ch in c)
        xa, xb = x0 + s * PX_PER_BEAT, max(x0 + e * PX_PER_BEAT - 1, x0 + s * PX_PER_BEAT + 2)
        if drum:
            y = roll_bottom + 4 + (p % 9) * 4
            d.rectangle([xa, y, xa + 3, y + 3], fill=shade)
        else:
            d.rectangle([xa, y_of(p), xb, y_of(p) + ROW - 1], fill=shade, outline=c)

    # 上の帯: トラックごとに、置いた素材の範囲と名前
    for i, t in enumerate(meta["tracks"]):
        y = 2 + i * LABEL_H
        c = COLORS[i % len(COLORS)]
        d.text((2, y), names[i][:6], fill=c, font=f)
        for u in t["uses"]:
            xa = x0 + u["at"] * PX_PER_BEAT
            xb = xa + max(u["length"], 0.5) * PX_PER_BEAT - 2
            d.rectangle([xa, y, xb, y + LABEL_H - 3], outline=c)
            d.text((xa + 3, y + 1), u["source"], fill=c, font=f)
    if motifs and theme is not None:
        y = 2 + len(meta["tracks"]) * LABEL_H
        starts = theme.melody.bar_starts + [theme.melody.length]
        for mid_, e in motifs.items():
            if not e["bars"]:
                continue
            a, b2 = e["bars"]
            xa = x0 + float(starts[a - 1]) * PX_PER_BEAT
            xb = x0 + float(starts[b2]) * PX_PER_BEAT - 2
            d.rectangle([xa, y, xb, y + LABEL_H - 3], outline=(80, 80, 80))
            d.text((xa + 3, y + 1), mid_, fill=(60, 60, 60), font=f)
    png_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(png_path)
