"""効果音の測定と確認用の画像。build.py と check.py が使う（効果音のスクリプトからは使わない）。

- docs/audio.md の「効果音（SE）」の表を読み、ID ごとの場面・聞こえ方・長さの目安・優先を返す。
- 聞こえる大きさ（K 特性を掛けた 100 ms ごとの大きさの最大、LUFS に近い値）を測る。
- 波形とスペクトログラムを 1 枚の画像にする。
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import signal as sig

from sfxlib import RATE, ROOT

DOC = ROOT / "docs" / "audio.md"
BATTLE_MAX = 0.6  # 戦闘の音の上限（1 出来事 650 ms）
WINDOW = 0.1  # 大きさを測る窓（秒）


@dataclass
class Spec:
    id: str
    group: str  # システム・メニュー / フィールド / 戦闘 / 場面
    scene: str
    hearing: str
    length: float | None
    priority: str


def load_specs() -> dict[str, Spec]:
    """docs/audio.md の効果音の表を読む。"""
    text = DOC.read_text(encoding="utf-8")
    start = text.find("## 効果音（SE）")
    if start < 0:
        raise SystemExit("docs/audio.md に「## 効果音（SE）」がありません")
    specs: dict[str, Spec] = {}
    group = ""
    for line in text[start:].splitlines():
        if line.startswith("### "):
            group = line[4:].split("（")[0].strip()
        m = re.match(r"\|\s*(se_\w+)\s*\|(.*)\|\s*$", line)
        if not m:
            continue
        cols = [c.strip() for c in m.group(2).split("|")]
        if len(cols) < 4:
            continue
        lm = re.match(r"([\d.]+)\s*秒", cols[2])
        specs[m.group(1)] = Spec(m.group(1), group, cols[0], cols[1], float(lm.group(1)) if lm else None, cols[3])
    return specs


def max_length(spec: Spec | None) -> float | None:
    """長さの上限。目安の 1.5 倍（短い音は +0.05 秒まで）。戦闘の音は 0.6 秒（se_levelup を除く）。"""
    if spec is None or spec.length is None:
        return None
    limit = max(spec.length * 1.5, spec.length + 0.05)
    if spec.group == "戦闘" and spec.id != "se_levelup":
        limit = min(limit, BATTLE_MAX)
    return limit


# ---------------------------------------------------------------- 大きさ


def _k_weight(x: np.ndarray) -> np.ndarray:
    """ITU-R BS.1770 の K 特性（48 kHz の係数）。"""
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return sig.lfilter(b2, a2, sig.lfilter(b1, a1, x, axis=0), axis=0)


def loudness(audio: np.ndarray) -> float | None:
    """100 ms の窓（10 ms ずつ動かす）で測った大きさの最大（LUFS と同じ尺度）。無音なら None。

    短い音も長い音も「いちばん大きく聞こえる瞬間」でそろえるための値。100 ms より短い音は、窓の残りを無音として測るので、
    短いほど小さく出る（耳でも短い音は小さく聞こえる）。
    """
    # モノラルは再生のときに左右へ同じ音で鳴るので、左右に複製して測る（ステレオの音と同じ尺度にする）
    x = audio if audio.ndim == 2 else np.stack([audio, audio], axis=1)
    win = int(WINDOW * RATE)
    k = _k_weight(np.vstack([x, np.zeros((win, x.shape[1]))]))
    power = (k ** 2).sum(axis=1)
    csum = np.concatenate([[0], np.cumsum(power)])
    hop = int(0.01 * RATE)
    starts = np.arange(0, max(len(power) - win, 0) + 1, hop)
    ms = (csum[starts + win] - csum[starts]) / win
    top = float(ms.max()) if len(ms) else 0.0
    if top <= 1e-12:
        return None
    return -0.691 + 10 * np.log10(top)


def peak_db(audio: np.ndarray) -> float | None:
    p = float(np.abs(audio).max()) if audio.size else 0.0
    return 20 * np.log10(p) if p > 0 else None


def head_silence(audio: np.ndarray, rel_db: float = -30) -> float:
    """頭の無音（ピークから rel_db より小さい部分）の長さ（秒）。押してから鳴るまでの遅れになる。"""
    a = np.abs(audio).max(axis=1) if audio.ndim == 2 else np.abs(audio)
    if not a.size or a.max() == 0:
        return 0.0
    idx = np.where(a > a.max() * 10 ** (rel_db / 20))[0]
    return idx[0] / RATE if len(idx) else 0.0


def tail_level(audio: np.ndarray, seconds: float = 0.003) -> float | None:
    """終わりの seconds 秒の大きさ（ピークに対する dB）。大きいと、切れ目でプツッと鳴る。"""
    a = audio if audio.ndim == 2 else audio[:, None]
    n = max(1, int(seconds * RATE))
    peak = float(np.abs(a).max())
    if peak == 0:
        return None
    rms = float(np.sqrt((a[-n:] ** 2).mean()))
    return 20 * np.log10(rms / peak) if rms > 0 else -120.0


def decode(path: Path) -> np.ndarray:
    """Ogg を ffmpeg で 48 kHz の float に戻す（モノラルは 1 次元）。"""
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels",
                            "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    ch = int(probe.stdout.strip() or 1)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", str(ch), "-ar", str(RATE), "-"],
                         capture_output=True, check=True).stdout
    data = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return data if ch == 1 else data.reshape(-1, ch)


# ---------------------------------------------------------------- 画像


def _font(size: int):
    for p in ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw(audio: np.ndarray, path: Path, title: str, target: float | None = None) -> None:
    """上に波形（音量の形）、下にスペクトログラム（縦が周波数、対数で 50 Hz〜20 kHz、明るいほど強い）を描く。

    横は時間で、細い線と、その 5 本ごとに秒の付いた太い線を引く（目盛りは長さで 10・50・100 ms）。target（長さの目安）があれば赤い縦線を引く。
    """
    mono = audio.mean(axis=1) if audio.ndim == 2 else audio
    secs = max(len(mono) / RATE, 0.01)
    span = max(secs, (target or 0) * 1.1, 0.1)
    w = 900
    px = w / span
    head, wave_h, spec_h = 22, 120, 260
    img = Image.new("RGB", (w + 50, head + wave_h + spec_h + 24), (18, 18, 22))
    d = ImageDraw.Draw(img)
    f = _font(12)
    d.text((4, 3), title, fill=(230, 230, 230), font=f)
    x0 = 46
    # 時間の目盛り
    step = 0.01 if span <= 0.3 else 0.05 if span <= 1.2 else 0.1
    for i in range(int(span / step) + 1):
        t = i * step
        x = x0 + int(t * px)
        major = i % 5 == 0
        d.line([(x, head), (x, head + wave_h + spec_h)], fill=(70, 70, 80) if major else (36, 36, 44))
        if major:
            d.text((x + 2, head + wave_h + spec_h + 4), f"{t:.2f}s", fill=(160, 160, 170), font=f)
    # 波形（列ごとの最大・最小）
    mid = head + wave_h // 2
    cols = max(1, int(secs * px))
    for c in range(cols):
        a, b = int(c / px * RATE), int((c + 1) / px * RATE)
        seg = mono[a:max(b, a + 1)]
        if seg.size:
            hi, lo = float(seg.max()), float(seg.min())
            d.line([(x0 + c, mid - hi * wave_h / 2), (x0 + c, mid - lo * wave_h / 2)], fill=(90, 200, 160))
    d.line([(x0, mid), (x0 + w, mid)], fill=(60, 60, 70))
    # スペクトログラム
    nper = 512 if secs > 0.08 else 256
    if len(mono) >= nper:
        fr, tt, sx = sig.spectrogram(mono, RATE, nperseg=nper, noverlap=nper * 7 // 8, scaling="spectrum")
        sdb = 10 * np.log10(sx + 1e-12)
        sdb = np.clip((sdb - (sdb.max() - 80)) / 80, 0, 1)
        top = head + wave_h
        lf = np.log10([50, 20000])
        for r in range(spec_h):
            freq = 10 ** (lf[1] - (lf[1] - lf[0]) * r / spec_h)
            fi = min(int(freq / (RATE / 2) * (len(fr) - 1)), len(fr) - 1)
            row = sdb[fi]
            for c in range(cols):
                ti = min(int((c / px) / secs * len(tt)), len(tt) - 1)
                v = row[ti]
                if v > 0:
                    img.putpixel((x0 + c, top + r), (int(255 * v ** 0.8), int(200 * v ** 1.6), int(255 * (1 - v) * v * 2)))
        for hz in (100, 1000, 10000):
            y = top + int((lf[1] - np.log10(hz)) / (lf[1] - lf[0]) * spec_h)
            d.line([(x0 - 4, y), (x0, y)], fill=(160, 160, 170))
            d.text((2, y - 7), f"{hz // 1000}k" if hz >= 1000 else str(hz), fill=(160, 160, 170), font=f)
    if target:
        x = x0 + int(target * px)
        d.line([(x, head), (x, head + wave_h + spec_h)], fill=(220, 70, 60), width=2)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
