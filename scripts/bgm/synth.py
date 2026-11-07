"""スーパーファミコン（S-DSP）風の音源。numpy だけで動く。

本物の S-DSP にならって、次のように音を作る。
- 楽器ごとに短い波形（サンプル）を 1 つ作り、BRR（4 bit の ADPCM）で圧縮・展開して粗さを出す
- 音の高さは、サンプルの読み出し速度を変えて作る（ガウス補間の 4 点補間。高域が少し丸まる）
- 持続する楽器は、サンプルの後ろの部分をくり返し読む（ループ）
- 音量の変化は ADSR、ビブラートは音源ドライバ風に一定の遅れの後でかける
- 出力は 32000 Hz。エコー（遅延・フィードバック・8 タップの FIR）を全体にかける

楽器の音はすべてこのファイルの中で数式から作る。外部の音色データ（SoundFont など）は使わない。
"""
from dataclasses import dataclass

import numpy as np

SR = 32000


@dataclass
class Sample:
    data: np.ndarray
    loop_start: int | None  # None はループしない（1 回読み切り）
    base_freq: float  # 読み出し速度 1 のときの音の高さ（Hz）。打楽器は 0


@dataclass
class Patch:
    sample: Sample
    attack: float = 0.005
    decay: float = 0.0
    sustain: float = 1.0
    sustain_decay: float = 0.0  # 持続部分の減衰の時定数（秒）。0 は減衰しない
    release: float = 0.1  # 消音後の減衰の時定数（秒）
    vib_delay: float = 0.0
    vib_rate: float = 5.0
    vib_depth: float = 0.0  # セント
    gain: float = 1.0
    echo: float = 0.4  # エコーへ送る量
    pitched: bool = True


# ---- 波形を作る道具 ----

def _rng(seed: int):
    return np.random.default_rng(seed)


def fft_filter(x: np.ndarray, gain_fn) -> np.ndarray:
    n = len(x)
    pad = np.concatenate([x, np.zeros(n)])
    spec = np.fft.rfft(pad)
    freqs = np.fft.rfftfreq(len(pad), 1 / SR)
    spec *= gain_fn(freqs)
    return np.fft.irfft(spec, len(pad))[:n]


def lowpass(cut):
    return lambda f: 1 / np.sqrt(1 + (f / cut) ** 4)


def highpass(cut):
    return lambda f: 1 / np.sqrt(1 + (cut / np.maximum(f, 1e-3)) ** 4)


def bandpass(center, width):
    return lambda f: np.exp(-((f - center) / width) ** 2)


def periodic(L: int, k0: int, amps, noise=0.0, noise_shape=None, seed=0, detune_bins=(0,)) -> np.ndarray:
    """長さ L でぴったりくり返す波形。k0 は基音が L の中で何周期あるか。
    noise は息・弓の雑音の大きさ（音の成分に対する実効値の比）。detune_bins で少しずつずらした波を重ねる（合奏の広がり）。"""
    rng = _rng(seed)
    tone = np.zeros(L // 2 + 1, dtype=complex)
    for d in detune_bins:
        for n, a in enumerate(amps, 1):
            k = (k0 + d) * n
            if 0 < k < L // 2 - 1 and a:
                tone[k] += a * np.exp(1j * rng.uniform(0, 2 * np.pi))
    x = np.fft.irfft(tone, L)
    if noise:
        freqs = np.arange(L // 2 + 1) * SR / L
        shape = noise_shape(freqs) if noise_shape else np.ones_like(freqs)
        nspec = shape * np.exp(1j * rng.uniform(0, 2 * np.pi, L // 2 + 1))
        nspec[0] = 0
        nz = np.fft.irfft(nspec, L)
        x = x + nz / (np.sqrt(np.mean(nz ** 2)) + 1e-12) * np.sqrt(np.mean(x ** 2)) * noise
    return x / (np.max(np.abs(x)) + 1e-9)


def sustained(loop: np.ndarray, k0: int, attack_len: int, transient=None, bright_loop=None, bright_len=0) -> Sample:
    """立ち上がり（ループしない）+ ループの部分でできたサンプル。"""
    L = len(loop)
    attack_len = (attack_len // 16) * 16
    reps = attack_len // L + 2
    tiled = np.tile(loop, reps)[:attack_len]
    head = tiled.copy()
    if bright_loop is not None and bright_len:
        bt = np.tile(bright_loop, reps)[:attack_len]
        w = np.clip(np.arange(attack_len) / max(1, bright_len), 0, 1)
        head = bt * (1 - w) + tiled * w
    if transient is not None:
        n = min(len(transient), attack_len)
        head[:n] += transient[:n]
    start = attack_len % L
    loop_rot = np.roll(loop, -start)
    data = np.concatenate([head, loop_rot])
    return Sample(data, attack_len, k0 * SR / L)


def karplus(period: int, length: float, loss: float, excite: np.ndarray, buzz=0.0, blend=0.5) -> Sample:
    """弦を弾いた音（Karplus-Strong）。blend を 0.5 より大きくすると高い倍音が長く残る（明るい音）。"""
    n = int(length * SR)
    out = np.zeros(n + period + 2)
    out[: period + 1] = excite[: period + 1]
    k = period + 1
    while k < len(out):
        m = min(period, len(out) - k)
        out[k:k + m] = loss * (blend * out[k - period:k - period + m] + (1 - blend) * out[k - period - 1:k - period - 1 + m])
        k += m
    x = out[:n]
    x = x - np.mean(x)
    if buzz:
        # 三味線のさわりのような、高い倍音のうなり
        b = fft_filter(np.sign(x) * x * x, highpass(1800))
        x = x + buzz * b / (np.max(np.abs(b)) + 1e-9) * np.max(np.abs(x))
    x = x / (np.max(np.abs(x)) + 1e-9)
    return Sample(x, None, SR / (period + 1 - blend))


def one_shot(x: np.ndarray) -> Sample:
    return Sample(x / (np.max(np.abs(x)) + 1e-9), None, 0.0)


def decay_env(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def sweep_sine(f_start, f_end, sweep_tau, n, phase=0.0):
    t = np.arange(n) / SR
    f = f_end + (f_start - f_end) * np.exp(-t / sweep_tau)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def partials(freqs, taus, amps, n, seed=0):
    rng = _rng(seed)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f, tau, a in zip(freqs, taus, amps):
        if f < SR / 2:
            x += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    return x


def noise(n, seed):
    return _rng(seed).standard_normal(n)


# ---- BRR ----

BRR_FILTERS = [(0.0, 0.0), (15 / 16, 0.0), (61 / 32, -15 / 16), (115 / 64, -13 / 16)]


def brr_roundtrip(x: np.ndarray) -> np.ndarray:
    """BRR に圧縮して展開した波形を返す（S-DSP の 4 bit 圧縮の粗さを出す）。"""
    n = (len(x) + 15) // 16 * 16
    pcm = np.zeros(n)
    pcm[: len(x)] = np.clip(x, -1, 1) * 32767 * 0.5  # S-DSP の展開は 15 bit 相当なので半分で扱う
    out = np.zeros(n)
    s1 = s2 = 0.0
    for b in range(0, n, 16):
        block = pcm[b:b + 16]
        best = None
        for fi, (c1, c2) in enumerate(BRR_FILTERS):
            if b == 0 and fi:
                continue
            # 予測の誤差の大きさからシフトを見積もる
            p1, p2 = s1, s2
            est = 0.0
            for v in block:
                pred = c1 * p1 + c2 * p2
                est = max(est, abs(v - pred))
                p1, p2 = v, p1
            shift = 0
            while shift < 12 and est > 7 * (1 << shift) / 2:
                shift += 1
            for sh in (shift, min(12, shift + 1)):
                p1, p2 = s1, s2
                err = 0.0
                dec = np.empty(16)
                for j, v in enumerate(block):
                    pred = c1 * p1 + c2 * p2
                    q = int(round((v - pred) / ((1 << sh) / 2)))
                    q = max(-8, min(7, q))
                    y = pred + q * (1 << sh) / 2
                    y = max(-16384, min(16383, y))
                    dec[j] = y
                    err += (y - v) ** 2
                    p1, p2 = y, p1
                if best is None or err < best[0]:
                    best = (err, dec, p1, p2)
        _, dec, s1, s2 = best
        out[b:b + 16] = dec
    return out[: len(x)] / (32767 * 0.5)


# ---- 楽器 ----

def _shakuhachi(seed):
    L, k0 = 8192, 128
    loop = periodic(L, k0, [1, 0.32, 0.12, 0.06, 0.03, 0.015], noise=0.22,
                    noise_shape=lambda f: bandpass(500, 200)(f) + 0.7 * bandpass(1000, 300)(f) + 0.25 * highpass(1500)(f),
                    seed=seed)
    n = 4096
    chiff = fft_filter(noise(n, seed + 1), bandpass(1700, 900)) * decay_env(n, 0.04) * 0.5
    return Patch(sustained(loop, k0, 3200, chiff), attack=0.07, decay=0.25, sustain=0.8, release=0.16,
                 vib_delay=0.32, vib_rate=4.8, vib_depth=22, gain=0.87, echo=0.55)


def _shinobue(seed):
    L, k0 = 8192, 256
    loop = periodic(L, k0, [1, 0.42, 0.18, 0.08, 0.04], noise=0.12,
                    noise_shape=lambda f: bandpass(1000, 400)(f) + 0.25 * highpass(2500)(f), seed=seed)
    n = 2048
    chiff = fft_filter(noise(n, seed + 1), bandpass(3000, 1200)) * decay_env(n, 0.02) * 0.4
    return Patch(sustained(loop, k0, 1600, chiff), attack=0.025, decay=0.2, sustain=0.85, release=0.1,
                 vib_delay=0.25, vib_rate=5.6, vib_depth=16, gain=0.67, echo=0.5)


def _hichiriki(seed):
    L, k0 = 8192, 128
    f0 = k0 * SR / L
    amps = []
    for n in range(1, 40):
        f = n * f0
        a = n ** -0.5 * (0.35 + bandpass(1300, 500)(f) + 0.6 * bandpass(2700, 600)(f)) * lowpass(4500)(f)
        amps.append(float(a))
    loop = periodic(L, k0, amps, noise=0.05, noise_shape=bandpass(1500, 800), seed=seed)
    return Patch(sustained(loop, k0, 1024), attack=0.04, decay=0.2, sustain=0.9, release=0.09,
                 vib_delay=0.3, vib_rate=5.0, vib_depth=12, gain=0.7, echo=0.45)


def _kokyu(seed):
    L, k0 = 8192, 128
    f0 = k0 * SR / L
    amps = [float((1 / n) * lowpass(3000)(n * f0) * (0.6 + bandpass(1000, 400)(n * f0) + 0.5 * bandpass(2400, 500)(n * f0)))
            for n in range(1, 40)]
    loop = periodic(L, k0, amps, noise=0.06, noise_shape=bandpass(2000, 1500), seed=seed)
    return Patch(sustained(loop, k0, 2048), attack=0.11, decay=0.2, sustain=0.9, release=0.22,
                 vib_delay=0.16, vib_rate=5.5, vib_depth=28, gain=0.78, echo=0.55)


def _sho(seed):
    L, k0 = 8192, 128
    f0 = k0 * SR / L
    amps = [float(((n ** -0.5) if n % 2 else 0.35 / n) * lowpass(3500)(n * f0)) for n in range(1, 30)]
    loop = periodic(L, k0, amps, seed=seed)
    return Patch(sustained(loop, k0, 512), attack=0.35, decay=0.0, sustain=1.0, release=0.4,
                 gain=0.54, echo=0.6)


def _strings(seed):
    L, k0 = 32768, 256
    f0 = k0 * SR / L
    amps = [float((1 / n) * lowpass(3200)(n * f0)) for n in range(1, 50)]
    loop = periodic(L, k0, amps, seed=seed, detune_bins=(-1, 0, 1))
    return Patch(sustained(loop, k0, 1024), attack=0.18, decay=0.0, sustain=1.0, release=0.38,
                 vib_delay=0.4, vib_rate=5.0, vib_depth=8, gain=0.65, echo=0.6)


def _brass(seed):
    L, k0 = 8192, 64
    f0 = k0 * SR / L
    soft = periodic(L, k0, [float((1 / n) * lowpass(1800)(n * f0)) for n in range(1, 60)], seed=seed)
    bright = periodic(L, k0, [float((1 / n) * lowpass(4500)(n * f0)) for n in range(1, 60)], seed=seed)
    return Patch(sustained(soft, k0, 4096, bright_loop=bright, bright_len=4000), attack=0.03, decay=0.3, sustain=0.85,
                 release=0.12, vib_delay=0.35, vib_rate=5.0, vib_depth=10, gain=0.7, echo=0.4)


def _pluck_excite(period, seed, smooth, click=0.0):
    x = noise(period + 2, seed)
    if smooth > 1:
        x = np.convolve(x, np.ones(smooth) / smooth, mode="same")
    x[0] += click
    return x - x.mean()


def _shamisen(seed):
    p = 96
    s = karplus(p, 1.0, 0.994, _pluck_excite(p, seed, 1, 3.0), buzz=0.35, blend=0.82)
    n = 160
    s.data[:n] += fft_filter(noise(n, seed + 2), bandpass(3500, 1500)) * decay_env(n, 0.002) * 0.5
    return Patch(s, attack=0.001, release=0.05, gain=3.1, echo=0.35)


def _koto(seed):
    p = 96
    s = karplus(p, 2.2, 0.9985, _pluck_excite(p, seed, 2, 1.0), buzz=0.08, blend=0.62)
    return Patch(s, attack=0.002, release=0.25, gain=1.55, echo=0.5)


def _biwa(seed):
    p = 192
    s = karplus(p, 1.8, 0.997, _pluck_excite(p, seed, 2, 3.0), buzz=0.6, blend=0.72)
    return Patch(s, attack=0.001, release=0.12, gain=2.6, echo=0.4)


def _bass(seed):
    p = 256
    s = karplus(p, 1.8, 0.9985, _pluck_excite(p, seed, 10, 0.5))
    return Patch(s, attack=0.002, release=0.06, gain=0.95, echo=0.08)


def _bell(seed):
    n = int(3.0 * SR)
    f = 500.0
    x = partials([f, f * 2.0, f * 2.76, f * 4.07, f * 5.4], [1.6, 0.9, 0.6, 0.35, 0.2], [1, 0.25, 0.45, 0.15, 0.2], n, seed)
    x[: 64] *= np.linspace(0, 1, 64)
    s = Sample(x / np.max(np.abs(x)), None, f)
    return Patch(s, attack=0.001, release=0.6, gain=0.55, echo=0.6)


def _drum(name, seed):
    n_of = lambda sec: int(sec * SR)  # noqa: E731
    if name == "odaiko":
        n = n_of(1.4)
        x = sweep_sine(110, 52, 0.12, n) * decay_env(n, 0.45) + 0.3 * sweep_sine(190, 105, 0.1, n) * decay_env(n, 0.12)
        x += fft_filter(noise(n, seed), lowpass(600)) * decay_env(n, 0.03) * 0.6
        return Patch(one_shot(x), gain=1.15, echo=0.15, pitched=False)
    if name == "okedo":
        n = n_of(0.7)
        x = sweep_sine(190, 130, 0.05, n) * decay_env(n, 0.17)
        x += fft_filter(noise(n, seed), bandpass(900, 600)) * decay_env(n, 0.02) * 0.5
        return Patch(one_shot(x), gain=0.85, echo=0.2, pitched=False)
    if name == "shime":
        n = n_of(0.3)
        x = sweep_sine(470, 400, 0.01, n) * decay_env(n, 0.06)
        x += fft_filter(noise(n, seed), bandpass(3000, 1500)) * decay_env(n, 0.012) * 0.9
        return Patch(one_shot(x), gain=0.65, echo=0.25, pitched=False)
    if name == "kane":
        n = n_of(0.5)
        x = partials([1450, 2320, 3340, 4510, 5900], [0.2, 0.15, 0.1, 0.07, 0.05], [1, 0.8, 0.6, 0.4, 0.3], n, seed)
        x += fft_filter(noise(n, seed), highpass(4000)) * decay_env(n, 0.01) * 0.5
        return Patch(one_shot(x), gain=0.45, echo=0.3, pitched=False)
    if name == "hyoshigi":
        n = n_of(0.25)
        x = partials([1850, 2950, 4400], [0.05, 0.03, 0.02], [1, 0.6, 0.3], n, seed)
        x[:40] += fft_filter(noise(40, seed), highpass(3000)) * 1.5
        return Patch(one_shot(x), gain=0.9, echo=0.45, pitched=False)
    if name == "woodblock":
        n = n_of(0.2)
        x = partials([820, 1290], [0.06, 0.03], [1, 0.4], n, seed)
        return Patch(one_shot(x), gain=0.55, echo=0.3, pitched=False)
    if name == "kick":
        n = n_of(0.5)
        x = sweep_sine(150, 48, 0.03, n) * decay_env(n, 0.18)
        x[:80] += noise(80, seed) * 0.3
        return Patch(one_shot(x), gain=1.0, echo=0.05, pitched=False)
    if name == "snare":
        n = n_of(0.4)
        x = sweep_sine(220, 185, 0.02, n) * decay_env(n, 0.07) * 0.6
        x += fft_filter(noise(n, seed), bandpass(4000, 3000)) * decay_env(n, 0.11)
        return Patch(one_shot(x), gain=0.65, echo=0.25, pitched=False)
    if name == "rim":
        n = n_of(0.15)
        x = partials([520, 1700], [0.02, 0.015], [1, 0.7], n, seed) + fft_filter(noise(n, seed), highpass(2500)) * decay_env(n, 0.01)
        return Patch(one_shot(x), gain=0.5, echo=0.3, pitched=False)
    if name in ("hat", "openhat"):
        n = n_of(0.15 if name == "hat" else 0.6)
        x = fft_filter(noise(n, seed), highpass(7000)) * decay_env(n, 0.035 if name == "hat" else 0.22)
        return Patch(one_shot(x), gain=0.6, echo=0.2, pitched=False)
    if name == "crash":
        n = n_of(2.0)
        x = fft_filter(noise(n, seed), highpass(4500)) * decay_env(n, 0.7)
        return Patch(one_shot(x), gain=0.5, echo=0.3, pitched=False)
    raise KeyError(name)


BUILDERS = {
    "shakuhachi": _shakuhachi, "shinobue": _shinobue, "hichiriki": _hichiriki, "kokyu": _kokyu, "sho": _sho,
    "strings": _strings, "brass": _brass, "shamisen": _shamisen, "koto": _koto, "biwa": _biwa, "bass": _bass,
    "bell": _bell,
}
DRUM_NAMES = ["odaiko", "okedo", "shime", "kane", "hyoshigi", "woodblock", "kick", "snare", "rim", "hat", "openhat", "crash"]

_cache = {}


def get_patch(name: str, brr: bool = True) -> Patch:
    key = (name, brr)
    if key not in _cache:
        seed = sum(ord(c) for c in name)
        patch = _drum(name, seed) if name in DRUM_NAMES else BUILDERS[name](seed)
        x = patch.sample.data
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.95
        if brr:
            x = brr_roundtrip(x)
        patch.sample = Sample(x.astype(np.float64), patch.sample.loop_start, patch.sample.base_freq)
        _cache[key] = patch
    return _cache[key]


# ---- 鳴らす ----

def _gauss_table():
    # S-DSP のガウス補間に近い 4 点の重み。frac を 256 段階に分ける
    fr = np.arange(256) / 256
    d = np.stack([fr + 1, fr, 1 - fr, 2 - fr], axis=1)
    w = np.exp(-(d ** 2) / (2 * 0.62 ** 2))
    return w / w.sum(axis=1, keepdims=True)


GAUSS = _gauss_table()


def envelope(p: Patch, n_on: int, n_total: int) -> np.ndarray:
    t = np.arange(n_total) / SR
    a = max(p.attack, 1e-4)
    env = np.minimum(t / a, 1.0)
    after = np.maximum(t - a, 0)
    if p.decay > 0:
        env = np.where(t < a, env, p.sustain + (1 - p.sustain) * np.exp(-after / p.decay))
    else:
        env = np.where(t < a, env, 1.0)
    if p.sustain_decay > 0:
        env *= np.exp(-after / p.sustain_decay)
    if n_on < n_total:
        level = env[n_on - 1] if n_on > 0 else 0.0
        rel_t = np.arange(n_total - n_on) / SR
        env[n_on:] = level * np.exp(-rel_t / max(p.release, 1e-3))
    return env


def voice(p: Patch, freq: float, n_on: int, vel: int, max_len: int | None = None) -> np.ndarray:
    """1 つの音を鳴らした波形（モノラル）。n_on は鍵盤を押している長さ（サンプル数）。"""
    s = p.sample
    data = s.data
    ln = len(data)
    if not p.pitched:
        n_total = ln
        rate = np.ones(n_total)
    else:
        tail = int(p.release * SR * 6.9)
        n_total = n_on + tail
        if s.loop_start is None:
            n_total = min(n_total, int(ln * s.base_freq / freq) + 4)
        rate = np.full(n_total, freq / s.base_freq)
        if p.vib_depth:
            t = np.arange(n_total) / SR
            ramp = np.clip((t - p.vib_delay) / 0.3, 0, 1)
            cents = p.vib_depth * np.sin(2 * np.pi * p.vib_rate * np.maximum(t - p.vib_delay, 0)) * ramp
            rate = rate * 2 ** (cents / 1200)
    if max_len is not None:
        n_total = min(n_total, max_len)
        rate = rate[:n_total]
    if n_total <= 0:
        return np.zeros(0)
    pos = np.concatenate([[0.0], np.cumsum(rate[:-1])])
    idx = np.floor(pos).astype(np.int64)
    frac = ((pos - idx) * 256).astype(np.int64).clip(0, 255)
    w = GAUSS[frac]
    out = np.zeros(n_total)
    valid = np.ones(n_total, dtype=bool)
    for tap in range(4):
        j = idx + tap - 1
        if s.loop_start is not None:
            ls = s.loop_start
            loop_len = ln - ls
            j = np.where(j >= ln, ls + (j - ls) % loop_len, j)
        else:
            valid &= j < ln
            j = np.minimum(j, ln - 1)
        j = np.maximum(j, 0)
        out += w[:, tap] * data[j]
    out *= valid
    env = envelope(p, min(n_on, n_total), n_total) if p.pitched else np.ones(n_total)
    if max_len is not None and n_total == max_len and n_total > 64:
        env[-64:] *= np.linspace(1, 0, 64)  # 次の音に切り替わる所でぷつっと鳴らないように
    return out * env * p.gain * (vel / 127) ** 1.3


def echo(x: np.ndarray, delay_ms: float, feedback: float, fir=None) -> np.ndarray:
    """S-DSP のエコー。x はエコーへ送る信号（片チャンネル）。エコーの出力だけを返す。"""
    if fir is None:
        fir = np.array([0.06, 0.12, 0.2, 0.24, 0.2, 0.12, 0.06, 0.0])
    D = max(16, int(round(delay_ms / 16)) * 16 * SR // 1000)
    n = len(x)
    taps = len(fir)
    stored = np.zeros(n + D + taps)
    off = D + taps  # stored[off + i] が時刻 i
    outp = np.zeros(n)
    for n0 in range(0, n, D):
        n1 = min(n0 + D, n)
        src = stored[off + n0 - D - (taps - 1): off + n1 - D]
        F = np.convolve(src, fir[::-1], mode="valid")
        stored[off + n0: off + n1] = x[n0:n1] + feedback * F
        outp[n0:n1] = F
    return outp
