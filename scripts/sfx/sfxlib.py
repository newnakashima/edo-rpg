"""効果音を波形から合成する部品。効果音のスクリプト（sfx/sounds/<ID>.py）は `from sfxlib import *` で読み込む。

音はすべて numpy の配列（float、-1〜1、48 kHz）で扱う。1 次元はモノラル、(サンプル数, 2) はステレオ。
部品は「音の素（発振・ノイズ・叩いた物の響き）」→「形（エンベロープ）」→「色（フィルタ・ひずみ・残響）」→「組み合わせ（mix）」の順に使う。

  from sfxlib import *
  body = sine(sweep(1800, 900, 0.05)) * env_exp(0.05, 0.012)
  click = bandpass(noise(0.01), 2500, 6000) * env_exp(0.01, 0.002)
  sound = Sound("se_cursor", mix(body, click * 0.5), title="カーソル移動")

乱数は rng（numpy の Generator）を使う。build.py が効果音の ID から種を決めて作り直すので、何度書き出しても同じ音になる。
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy import signal as _sig

RATE = 48000
ROOT = Path(__file__).resolve().parents[2]
SFX_DIR = ROOT / "sfx"

rng = np.random.default_rng(0)


def reseed(key: str) -> None:
    """乱数の種を key（効果音の ID）から決め直す。build.py がスクリプトを読む前に呼ぶ。"""
    global rng
    seed = int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], "little")
    rng = np.random.default_rng(seed)


# ---------------------------------------------------------------- 時間


def n_of(seconds: float) -> int:
    return max(0, int(round(seconds * RATE)))


def times(seconds: float) -> np.ndarray:
    """0 秒から seconds 秒までの時刻の配列（標準ライブラリの time と重ならない名前にしてある）。"""
    return np.arange(n_of(seconds)) / RATE


def silence(seconds: float) -> np.ndarray:
    return np.zeros(n_of(seconds))


def length(x: np.ndarray) -> float:
    return len(x) / RATE


# ---------------------------------------------------------------- 高さの動き


def _freq_array(freq, seconds: float | None) -> np.ndarray:
    if np.ndim(freq) == 0:
        if seconds is None:
            raise ValueError("高さを数で渡すときは seconds も渡す")
        return np.full(n_of(seconds), float(freq))
    return np.asarray(freq, dtype=float)


def sweep(f0: float, f1: float, seconds: float, curve: str = "exp") -> np.ndarray:
    """f0 から f1 へ動く高さ（Hz の配列）。curve は "exp"（耳に均等）か "lin"。"""
    n = n_of(seconds)
    if curve == "exp":
        return f0 * (f1 / f0) ** (np.arange(n) / max(n - 1, 1))
    return np.linspace(f0, f1, n)


def glide(points: list[tuple[float, float]], seconds: float) -> np.ndarray:
    """(秒, Hz) の点を指数的に結んだ高さの配列。点の外側は端の値のまま。"""
    ts, fs = zip(*points)
    return np.exp(np.interp(times(seconds), ts, np.log(fs)))


def vibrato(freq, seconds: float | None = None, rate: float = 6.0, depth: float = 0.01) -> np.ndarray:
    """高さを rate Hz で揺らす（depth は割合。0.01 で ±1 %）。"""
    f = _freq_array(freq, seconds)
    return f * (1 + depth * np.sin(2 * np.pi * rate * np.arange(len(f)) / RATE))


# ---------------------------------------------------------------- 発振


def _phase(freq, seconds) -> np.ndarray:
    f = _freq_array(freq, seconds)
    return 2 * np.pi * np.cumsum(f) / RATE


def sine(freq, seconds: float | None = None, phase: float = 0.0) -> np.ndarray:
    """正弦波。freq は Hz の数（seconds も渡す）か、sweep などで作った配列。"""
    return np.sin(_phase(freq, seconds) + phase)


def saw(freq, seconds: float | None = None) -> np.ndarray:
    """のこぎり波（帯域を制限していないので、高い音では lowpass を掛けると耳に優しい）。"""
    p = _phase(freq, seconds) / (2 * np.pi)
    return 2 * (p - np.floor(p + 0.5))


def square(freq, seconds: float | None = None, duty: float = 0.5) -> np.ndarray:
    p = (_phase(freq, seconds) / (2 * np.pi)) % 1
    return np.where(p < duty, 1.0, -1.0)


def triangle(freq, seconds: float | None = None) -> np.ndarray:
    return 2 * np.abs(saw(freq, seconds)) - 1


def fm(carrier, ratio: float, index, seconds: float | None = None) -> np.ndarray:
    """FM 合成。carrier の高さに ratio 倍の変調を index（数か配列。大きいほど金属的・濁る）の深さで掛ける。"""
    fc = _freq_array(carrier, seconds)
    mod = np.sin(_phase(fc * ratio, None))
    idx = index if np.ndim(index) == 0 else np.asarray(index)
    return np.sin(_phase(fc, None) + idx * mod)


def partials(freq, ratios: list[float], amps: list[float] | None = None, seconds: float | None = None) -> np.ndarray:
    """倍音を足した音。ratios は基音に対する倍率（整数でなくてよい。鐘や金物は非整数）。"""
    f = _freq_array(freq, seconds)
    if not len(f):
        return np.zeros(0)
    amps = [1.0 / (i + 1) for i in range(len(ratios))] if amps is None else list(amps)
    _same_length(ratios=ratios, amps=amps)
    out = np.zeros(len(f))
    for r, a in zip(ratios, amps):
        if np.max(f) * r < RATE / 2:
            out += a * sine(f * r)
    return out


# ---------------------------------------------------------------- ノイズ


def noise(seconds: float, color: str = "white") -> np.ndarray:
    """ノイズ。color は "white"（シャー）・"pink"（ザー）・"brown"（ゴー、低く丸い）。"""
    n = n_of(seconds)
    if n == 0:
        return np.zeros(0)
    w = rng.standard_normal(n)
    if color == "white":
        out = w
    elif color == "pink":
        spec = np.fft.rfft(w)
        f = np.fft.rfftfreq(n, 1 / RATE)
        f[0] = f[1] if n > 1 else 1
        out = np.fft.irfft(spec / np.sqrt(f), n)
    elif color == "brown":
        out = np.cumsum(w)
        out = highpass(out - out.mean(), 20)
    else:
        raise ValueError(f"ノイズの色 {color!r} はない（white・pink・brown）")
    peak = np.abs(out).max() or 1
    return out / peak


def crackle(seconds: float, density: float = 200, decay: float = 0.002) -> np.ndarray:
    """ぱちぱちと散る細かな粒（火がはぜる、砂利、賽が転がる）。density は 1 秒あたりの粒の数。"""
    n = n_of(seconds)
    out = np.zeros(n)
    k = rng.poisson(density * seconds)
    grain = env_exp(decay * 6, decay) * rng.standard_normal(n_of(decay * 6))
    for at in rng.integers(0, max(n, 1), k):
        g = grain * rng.uniform(0.2, 1.0) * rng.choice([-1, 1])
        end = min(n, at + len(g))
        out[at:end] += g[: end - at]
    return out


# ---------------------------------------------------------------- 叩いた物・はじいた物


def modal(freqs: list[float], decays: list[float], amps: list[float] | None = None, seconds: float | None = None,
          strike: np.ndarray | None = None) -> np.ndarray:
    """叩いた物の響き（木・金物・鐘・鈴）。周波数ごとに減衰の時間（秒、振幅が 1/e になるまで）を決めて足す。

    strike を渡すと、その音（短いノイズなど）で共鳴させる（打った瞬間の手ざわりが出る）。渡さなければ打った瞬間から鳴る。
    """
    amps = [1.0] * len(freqs) if amps is None else list(amps)
    _same_length(freqs=freqs, decays=decays, amps=amps)
    seconds = seconds or max(decays) * 5
    t = times(seconds)
    if strike is None:
        out = np.zeros(len(t))
        for f, d, a in zip(freqs, decays, amps):
            if f < RATE / 2:
                out += a * np.sin(2 * np.pi * f * t) * np.exp(-t / d)
        return out
    x = np.zeros(len(t))
    x[: min(len(strike), len(x))] = strike[: len(x)]
    out = np.zeros(len(t))
    for f, d, a in zip(freqs, decays, amps):
        if f < RATE / 2:
            out += a * resonator(x, f, decay=d)
    return out


def resonator(x: np.ndarray, freq: float, decay: float = 0.05) -> np.ndarray:
    """x を freq Hz で共鳴させる（2 次の共鳴フィルタ）。decay は響きが 1/e になるまでの秒。"""
    r = np.exp(-1 / (decay * RATE))
    w = 2 * np.pi * freq / RATE
    b = [(1 - r * r) / 2, 0, -(1 - r * r) / 2]
    a = [1, -2 * r * np.cos(w), r * r]
    return _sig.lfilter(b, a, x) * 2


def pluck(freq: float, seconds: float, brightness: float = 0.5, decay: float = 0.996) -> np.ndarray:
    """はじいた弦（Karplus-Strong）。brightness は 0〜1（大きいほど硬い）、decay は 1 周ごとの減衰（1 に近いほど長く鳴る）。

    2 点の平均で入る 0.5 サンプルの遅れは差し引くが、1 周の長さを整数のサンプル数に丸めるので、高い音ほど音程が
    ずれる（最大で 1000 Hz で約 ±18 セント、3500 Hz で約 ±63 セント）。高い音には modal を使う。
    """
    period = max(2, int(round(RATE / freq - (0.5 if brightness < 1 else 0))))
    buf = rng.uniform(-1, 1, period)
    buf = lowpass(buf, 500 + brightness * 12000) if period > 12 else buf
    n = n_of(seconds)
    out = np.empty(n)
    prev = 0.0
    for i in range(n):
        j = i % period
        v = buf[j]
        out[i] = v
        buf[j] = decay * (0.5 * v + 0.5 * prev) if brightness < 1 else decay * v
        prev = v
    return out


# ---------------------------------------------------------------- エンベロープ（音量の形）


def env_exp(seconds: float, decay: float, attack: float = 0.0005) -> np.ndarray:
    """すぐ立ち上がって指数的に消える形（打つ・はじく）。decay は 1/e になるまでの秒。"""
    t = times(seconds)
    e = np.exp(-t / decay)
    if attack > 0:
        e *= np.clip(t / attack, 0, 1)
    return e


def env_adsr(seconds: float, attack: float = 0.005, decay: float = 0.05, sustain: float = 0.6,
             release: float = 0.1) -> np.ndarray:
    """立ち上がり・減衰・保持・余韻の形。保持の長さは seconds から残りを引いたもの。

    attack + decay + release が seconds より長いときは、3 つを同じ割合で縮めて seconds に収める（最後は必ず 0 になる）。
    """
    total = attack + decay + release
    if total > seconds:
        k = seconds / total
        attack, decay, release = attack * k, decay * k, release * k
    # 浮動小数点の誤差で点の順が入れ替わらないよう、前の点より前に戻さない
    t1 = min(attack, seconds)
    t2 = min(max(attack + decay, t1), seconds)
    t3 = min(max(seconds - release, t2), seconds)
    pts = [(0, 0), (t1, 1), (t2, sustain), (t3, sustain), (seconds, 0)]
    return env_points(pts, seconds)


def env_points(points: list[tuple[float, float]], seconds: float, curve: str = "lin") -> np.ndarray:
    """(秒, 音量) の点を結んだ形。curve="db" で音量を dB で結ぶ（消え際が自然になる）。"""
    ts, vs = zip(*points)
    if any(b < a for a, b in zip(ts, ts[1:])):
        raise ValueError(f"env_points の点の時刻が増えていく順になっていない: {ts}")
    t = times(seconds)
    if curve == "db":
        db = np.interp(t, ts, [20 * np.log10(max(v, 1e-5)) for v in vs])
        return 10 ** (db / 20) * (np.interp(t, ts, vs) > 0)
    return np.interp(t, ts, vs)


def tremolo(x: np.ndarray, rate: float, depth: float = 0.5) -> np.ndarray:
    """音量を rate Hz で揺らす（depth は 0〜1）。"""
    t = np.arange(len(x)) / RATE
    m = 1 - depth * (0.5 - 0.5 * np.cos(2 * np.pi * rate * t))
    return x * (m if x.ndim == 1 else m[:, None])


# ---------------------------------------------------------------- フィルタ・色


def _sos(kind: str, freq, order: int):
    nyq = RATE / 2
    f = np.clip(np.asarray(freq, dtype=float), 10, nyq * 0.99) / nyq
    if kind == "bandpass" and not f[0] < f[1]:
        raise ValueError(f"bandpass の帯域が空になる（{freq} Hz。low < high で、どちらも 10〜{nyq * 0.99:.0f} Hz に収める）")
    return _sig.butter(order, f, btype=kind, output="sos")


def _apply(sos, x: np.ndarray) -> np.ndarray:
    return _sig.sosfilt(sos, x, axis=0)


def lowpass(x: np.ndarray, freq: float, order: int = 2) -> np.ndarray:
    return _apply(_sos("lowpass", freq, order), x)


def highpass(x: np.ndarray, freq: float, order: int = 2) -> np.ndarray:
    return _apply(_sos("highpass", freq, order), x)


def bandpass(x: np.ndarray, low: float, high: float, order: int = 2) -> np.ndarray:
    return _apply(_sos("bandpass", [low, high], order), x)


def sweep_filter(x: np.ndarray, freqs, kind: str = "lowpass", q: float = 0.9, block: int = 64) -> np.ndarray:
    """時間とともに動く周波数でフィルタを掛ける（風が巻く、ゴウッと燃え上がる）。freqs は sweep などで作った配列か数。

    kind は "lowpass"・"highpass"・"bandpass"。block サンプルごとに係数を替える（状態変数フィルタ）。
    """
    x = np.asarray(x, dtype=float)
    mono = x.ndim == 1
    xs = x[:, None] if mono else x
    f = np.broadcast_to(np.asarray(freqs, dtype=float), (len(xs),)) if np.ndim(freqs) == 0 else np.asarray(freqs)
    if len(f) < len(xs):
        f = np.concatenate([f, np.full(len(xs) - len(f), f[-1] if len(f) else 1000)])
    out = np.zeros_like(xs)
    low = np.zeros(xs.shape[1])
    band = np.zeros(xs.shape[1])
    damp = 1 / q
    for s in range(0, len(xs), block):
        fc = min(float(f[s]), RATE / 6)
        g = 2 * np.sin(np.pi * fc / RATE)
        for i in range(s, min(s + block, len(xs))):
            high = xs[i] - low - damp * band
            band = band + g * high
            low = low + g * band
            out[i] = low if kind == "lowpass" else band if kind == "bandpass" else high
    return out[:, 0] if mono else out


def drive(x: np.ndarray, amount: float = 2.0) -> np.ndarray:
    """やわらかくひずませる（tanh）。amount（0 より大きい）が大きいほど荒く、太く聞こえる。"""
    if amount <= 0:
        raise ValueError("drive の amount は 0 より大きくする")
    return np.tanh(x * amount) / np.tanh(amount)


def bitcrush(x: np.ndarray, bits: int = 8, hold: int = 1) -> np.ndarray:
    """ビット数を落とし、hold サンプルごとに値を保つ（からくりの機械らしさ）。"""
    q = 2 ** (bits - 1)
    y = np.round(x * q) / q
    if hold > 1:
        idx = (np.arange(len(y)) // hold) * hold
        y = y[idx]
    return y


def echo(x: np.ndarray, delay: float = 0.08, feedback: float = 0.35, repeats: int = 4) -> np.ndarray:
    """やまびこ。delay 秒ごとに feedback 倍で repeats 回くり返す（長さは伸びる）。"""
    d = n_of(delay)
    out = pad(x, d * repeats)
    for k in range(1, repeats + 1):
        out = place(out, x * feedback ** k, d * k / RATE)
    return out


def reverb(x: np.ndarray, seconds: float = 0.4, wet: float = 0.25, brightness: float = 6000) -> np.ndarray:
    """残響。seconds は響きの長さ（-60 dB まで）、wet は響きの割合。響きのぶん長さが伸びる。

    減衰するノイズを畳み込むだけの簡単なもので、部屋の大きさや明るさを変えたいときは seconds と brightness で調える。
    """
    ir_len = n_of(seconds)
    if ir_len < 2 or wet <= 0:
        return x
    ir = rng.standard_normal(ir_len) * np.exp(-6.9 * np.arange(ir_len) / ir_len)
    ir = lowpass(ir, brightness)
    ir /= np.sqrt((ir ** 2).sum())
    if x.ndim == 1:
        tail = _sig.fftconvolve(x, ir)
    else:
        ir2 = np.stack([ir, np.roll(ir, 37)], axis=1)
        tail = np.stack([_sig.fftconvolve(x[:, c], ir2[:, c]) for c in range(x.shape[1])], axis=1)
    dry = pad(x, len(tail) - len(x))
    return dry * (1 - wet) + tail * wet


# ---------------------------------------------------------------- 組み合わせ


def pad(x: np.ndarray, samples: int) -> np.ndarray:
    """後ろに samples サンプルの無音を足す。"""
    if samples <= 0:
        return x
    z = np.zeros((samples,) + x.shape[1:])
    return np.concatenate([x, z])


def place(dst: np.ndarray, src: np.ndarray, at: float = 0.0, gain: float = 1.0) -> np.ndarray:
    """dst の at 秒の位置から src を重ねた新しい配列を返す（足りなければ dst を伸ばす）。モノラルとステレオは合わせる。"""
    dst, src = _match(dst, src)
    s = n_of(at)
    need = s + len(src) - len(dst)
    out = pad(dst.copy(), need)
    out[s:s + len(src)] += src * gain
    return out


def mix(*layers, at: list[float] | None = None) -> np.ndarray:
    """音を重ねる。layers は配列か (配列, 秒) の組（その秒から鳴らす）。長さは最も長いものに合わせる。"""
    out = np.zeros(0)
    for i, layer in enumerate(layers):
        if isinstance(layer, tuple):
            x, start = layer
        else:
            x, start = layer, (at[i] if at else 0.0)
        out = place(out, x, start)
    return out


def concat(*parts: np.ndarray) -> np.ndarray:
    """音を順につなぐ。"""
    out = np.zeros(0)
    for p in parts:
        out = place(out, p, length(out))
    return out


def _same_length(**lists) -> None:
    sizes = {k: len(v) for k, v in lists.items()}
    if len(set(sizes.values())) > 1:
        raise ValueError(f"数をそろえる: {sizes}")


def _match(a: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if a.ndim == b.ndim:
        return a, b
    if a.ndim == 1:
        a = np.stack([a, a], axis=1) if len(a) else np.zeros((0, 2))
    if b.ndim == 1:
        b = np.stack([b, b], axis=1)
    return a, b


def stereo(x: np.ndarray, pan: float = 0.0) -> np.ndarray:
    """モノラルをステレオにする。pan は -1（左）〜 1（右）。"""
    if x.ndim == 2:
        return x
    ang = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(ang), x * np.sin(ang)], axis=1) * np.sqrt(2)


def widen(x: np.ndarray, delay: float = 0.012) -> np.ndarray:
    """左右で少しずらしてステレオに広げる（残響・群れ・風）。"""
    if x.ndim == 2:
        return x
    d = n_of(delay)
    return np.stack([pad(x, d), np.concatenate([np.zeros(d), x])], axis=1)


def fade(x: np.ndarray, fade_in: float = 0.0, fade_out: float = 0.0) -> np.ndarray:
    """頭と終わりを滑らかにする（プツッという音を防ぐ）。"""
    y = x.copy()
    for secs, rev in ((fade_in, False), (fade_out, True)):
        n = min(n_of(secs), len(y))
        if n:
            ramp = np.linspace(0, 1, n) ** 2
            ramp = ramp[::-1] if rev else ramp
            sl = slice(len(y) - n, None) if rev else slice(0, n)
            y[sl] *= ramp if y.ndim == 1 else ramp[:, None]
    return y


def trim(x: np.ndarray, seconds: float) -> np.ndarray:
    """seconds 秒で切る（終わりは 5 ms で消す）。"""
    return fade(x[: n_of(seconds)], fade_out=0.005)


def db(value: float) -> float:
    """dB を倍率にする（-6 → 約 0.5）。"""
    return 10 ** (value / 20)


def note(name: str) -> float:
    """音名を Hz にする（"A4" → 440、"C#5"、"Bb3"）。"""
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    base = names[name[0].upper()]
    rest = name[1:]
    while rest and rest[0] in "#b":
        base += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    midi = base + 12 * (int(rest) + 1)
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---------------------------------------------------------------- 書き出す音


@dataclass
class Sound:
    """書き出す効果音。スクリプトの最後で `sound = Sound("se_cursor", audio, ...)` と作る。

    - level: 音量の目安からの差（dB）。build.py は効果音の間で聞こえる大きさをそろえる。そろえた上で、小さく鳴らしたい音
      （se_cursor・se_message など何度も鳴る音）は -6 のように下げ、大きく鳴らしたい音（se_cannon・se_explode）は上げる。
    - title: 何の音か（Ogg のタイトルと画像に出る）。
    - notes: 書き出しのたびに表示しておきたいメモ（ユーザーの感想で直した点など）。
    """

    id: str
    audio: np.ndarray
    title: str = ""
    level: float = 0.0
    notes: list[str] = field(default_factory=list)


__all__ = [n for n in dir() if not n.startswith("_")
           and n not in {"annotations", "hashlib", "dataclass", "field", "Path", "ROOT", "SFX_DIR", "reseed"}]
__all__ += ["np"]
