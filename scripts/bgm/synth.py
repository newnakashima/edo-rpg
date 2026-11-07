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
    pan: float = 0.0  # 楽器そのものの定位（-1〜1。打楽器のキットの並びなど）。パートの pan に足す


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


def room(x: np.ndarray, tau: float, mix: float, seed: int, tone: float = 5000.0) -> np.ndarray:
    """録音した部屋の響きをサンプルに焼き込む（SNES のサンプルは、響きごと録った生の音が多い）。
    tau は響きの減衰の時定数（秒）、mix は響きの量。サンプルは響きの分だけ長くなる。"""
    n_ir = int(tau * 5 * SR)
    t = np.arange(n_ir) / SR
    ir = noise(n_ir, seed + 99) * np.exp(-t / tau)
    gap = int(0.004 * SR)
    ir[:gap] *= np.linspace(0, 1, gap)  # 初期反射の前のすきま
    ir = fft_filter(ir, lowpass(tone))
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-12
    n = len(x) + n_ir
    wet = np.fft.irfft(np.fft.rfft(x, 2 * n) * np.fft.rfft(ir, 2 * n), 2 * n)[:n]
    dry = np.concatenate([x, np.zeros(n_ir)])
    wet *= np.sqrt(np.sum(dry ** 2)) / (np.sqrt(np.sum(wet ** 2)) + 1e-12)
    return dry * (1 - mix * 0.5) + wet * mix


def metal(freqs, n, seed):
    """矩形波を重ねた金属音（ハイハット・シンバルの芯）。"""
    t = np.arange(n) / SR
    rng = _rng(seed)
    return sum(np.sign(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))) for f in freqs) / len(freqs)


def membrane(f0, n, taus, amps, seed, drop=1.0, drop_tau=0.03):
    """太鼓の膜の振動（円形の膜の倍音 1, 1.59, 2.14, 2.30, 2.65）。drop は打った直後の音程の上がり方。"""
    t = np.arange(n) / SR
    rng = _rng(seed)
    x = np.zeros(n)
    for ratio, tau, a in zip((1.0, 1.59, 2.14, 2.30, 2.65), taus, amps):
        f = f0 * ratio * (1 + (drop - 1) * np.exp(-t / drop_tau))
        x += a * np.sin(2 * np.pi * np.cumsum(f) / SR + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    return x


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

    def body(f):
        return 0.7 + 0.5 * bandpass(450, 200)(f) + 0.4 * bandpass(1500, 500)(f) + 0.3 * bandpass(3000, 700)(f)

    amps = [float((1 / n) * lowpass(4500)(n * f0) * body(n * f0)) for n in range(1, 60)]
    loop = periodic(L, k0, amps, seed=seed, detune_bins=(-2, -1, 0, 1, 2), noise=0.03, noise_shape=highpass(2000))
    return Patch(sustained(loop, k0, 1024), attack=0.05, decay=0.0, sustain=1.0, release=0.32,
                 vib_delay=0.35, vib_rate=5.2, vib_depth=9, gain=0.65, echo=0.65)


def _brass(seed):
    # 金管の合奏。ラッパの共鳴（1200 Hz 付近）を持ち、吹き始めが明るい。3 本分ずらして重ねる
    L, k0 = 32768, 256
    f0 = k0 * SR / L

    def horn(f):
        return 0.6 + bandpass(1200, 450)(f) + 0.4 * bandpass(2600, 600)(f)

    soft = periodic(L, k0, [float((1 / n) * lowpass(2400)(n * f0) * horn(n * f0)) for n in range(1, 60)], seed=seed,
                    detune_bins=(-1, 0, 1))
    bright = periodic(L, k0, [float((1 / n ** 0.8) * lowpass(6000)(n * f0) * horn(n * f0)) for n in range(1, 60)],
                      seed=seed, detune_bins=(-1, 0, 1))
    return Patch(sustained(soft, k0, 4096, bright_loop=bright, bright_len=3600), attack=0.025, decay=0.35, sustain=0.85,
                 release=0.12, vib_delay=0.35, vib_rate=5.0, vib_depth=10, gain=0.7, echo=0.45)


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
    # 指弾きのベース。丸い弦の音に、基音を支える低い正弦波を重ねる
    p = 256
    s = karplus(p, 2.0, 0.9988, _pluck_excite(p, seed, 6, 0.8), blend=0.6)
    t = np.arange(len(s.data)) / SR
    sub = np.sin(2 * np.pi * s.base_freq * t) * np.exp(-t / 0.9)
    s.data = np.tanh(1.4 * (s.data / np.max(np.abs(s.data)) + 0.55 * sub))  # 少し歪ませて輪郭を出す
    return Patch(s, attack=0.002, release=0.07, gain=0.369, echo=0.06)


def _pickbass(seed):
    # ピック弾きのベース。明るく硬い。戦闘の刻み向き
    p = 256
    s = karplus(p, 1.6, 0.9982, _pluck_excite(p, seed, 2, 2.0), blend=0.78)
    t = np.arange(len(s.data)) / SR
    sub = np.sin(2 * np.pi * s.base_freq * t) * np.exp(-t / 0.6)
    s.data = np.tanh(1.8 * (s.data / np.max(np.abs(s.data)) + 0.45 * sub))
    return Patch(s, attack=0.001, release=0.05, gain=0.352, echo=0.06)


def _harp(seed):
    p = 64
    s = karplus(p, 2.6, 0.9993, _pluck_excite(p, seed, 2, 0.5), blend=0.6)
    s.data = room(s.data, 0.25, 0.35, seed)
    return Patch(s, attack=0.001, release=0.4, gain=1.5, echo=0.55)


def _pizz(seed):
    p = 128
    s = karplus(p, 0.7, 0.992, _pluck_excite(p, seed, 4, 0.5), blend=0.55)
    s.data = room(s.data, 0.2, 0.45, seed)
    return Patch(s, attack=0.001, release=0.15, gain=1.2, echo=0.5)


def _timpani(seed):
    n = int(2.2 * SR)
    f0 = 110.0
    x = membrane(f0, n, (0.9, 0.7, 0.5, 0.35, 0.25), (1, 0.55, 0.35, 0.2, 0.12), seed, drop=1.04, drop_tau=0.05)
    x += fft_filter(noise(n, seed), lowpass(1200)) * decay_env(n, 0.012) * 0.6
    x = room(x, 0.35, 0.4, seed)
    return Patch(Sample(x / np.max(np.abs(x)), None, f0), attack=0.001, release=0.5, gain=0.85, echo=0.35)


def _choir(seed):
    # 「あー」と歌う合唱。声帯の音を母音の共鳴（800・1150・2900 Hz）で形づくり、3 人分ずらして重ねる
    L, k0 = 32768, 256
    f0 = k0 * SR / L

    def form(f):
        return bandpass(800, 180)(f) + 0.6 * bandpass(1150, 200)(f) + 0.25 * bandpass(2900, 400)(f) + 0.08

    amps = [float(n ** -1.0 * form(n * f0) * lowpass(4000)(n * f0)) for n in range(1, 60)]
    loop = periodic(L, k0, amps, noise=0.04, noise_shape=bandpass(2500, 1500), seed=seed, detune_bins=(-1, 0, 1))
    return Patch(sustained(loop, k0, 1024), attack=0.28, decay=0.0, sustain=1.0, release=0.5,
                 vib_delay=0.3, vib_rate=5.2, vib_depth=10, gain=0.75, echo=0.7)


def _bell(seed):
    n = int(3.0 * SR)
    f = 500.0
    x = partials([f, f * 2.0, f * 2.76, f * 4.07, f * 5.4], [1.6, 0.9, 0.6, 0.35, 0.2], [1, 0.25, 0.45, 0.15, 0.2], n, seed)
    x[: 64] *= np.linspace(0, 1, 64)
    s = Sample(x / np.max(np.abs(x)), None, f)
    return Patch(s, attack=0.001, release=0.6, gain=0.55, echo=0.6)


def _drum(name, seed):
    """打楽器。どれも部屋の響きを焼き込み、キットの中の位置（定位）を持つ。"""
    def n_of(sec):
        return int(sec * SR)

    def stick(n, cut, tau):
        return fft_filter(noise(n, seed + 7), highpass(cut)) * decay_env(n, tau)

    if name == "odaiko":
        n = n_of(1.6)
        x = membrane(62, n, (0.75, 0.4, 0.25, 0.2, 0.15), (1, 0.5, 0.3, 0.2, 0.15), seed, drop=1.5, drop_tau=0.04)
        x += fft_filter(noise(n, seed), lowpass(1800)) * decay_env(n, 0.02) * 0.7
        return Patch(one_shot(room(x, 0.32, 0.45, seed, 3000)), gain=0.562, echo=0.2, pitched=False)
    if name == "okedo":
        n = n_of(0.8)
        x = membrane(120, n, (0.3, 0.2, 0.14, 0.12, 0.1), (1, 0.6, 0.4, 0.3, 0.2), seed, drop=1.25, drop_tau=0.03)
        x += fft_filter(noise(n, seed), bandpass(1200, 800)) * decay_env(n, 0.015) * 0.6
        return Patch(one_shot(room(x, 0.22, 0.4, seed)), gain=0.45, echo=0.25, pitched=False, pan=0.15)
    if name == "shime":
        n = n_of(0.35)
        x = membrane(430, n, (0.07, 0.05, 0.04, 0.03, 0.03), (1, 0.7, 0.5, 0.4, 0.3), seed, drop=1.08, drop_tau=0.01)
        x += fft_filter(noise(n, seed), bandpass(3200, 1500)) * decay_env(n, 0.018) * 1.1
        return Patch(one_shot(room(x, 0.16, 0.35, seed)), gain=0.585, echo=0.3, pitched=False, pan=-0.2)
    if name == "kane":
        n = n_of(0.6)
        x = partials([1450, 2320, 3340, 4510, 5900], [0.25, 0.18, 0.12, 0.08, 0.06], [1, 0.8, 0.6, 0.4, 0.3], n, seed)
        x += stick(n, 4000, 0.008) * 0.6
        return Patch(one_shot(room(x, 0.15, 0.3, seed, 8000)), gain=0.225, echo=0.3, pitched=False, pan=0.3)
    if name == "hyoshigi":
        n = n_of(0.3)
        x = partials([1850, 2950, 4400], [0.06, 0.035, 0.02], [1, 0.6, 0.3], n, seed)
        x[:40] += fft_filter(noise(40, seed), highpass(3000)) * 1.5
        return Patch(one_shot(room(x, 0.3, 0.5, seed, 7000)), gain=0.405, echo=0.45, pitched=False)
    if name == "woodblock":
        n = n_of(0.25)
        x = partials([820, 1290], [0.06, 0.03], [1, 0.4], n, seed)
        return Patch(one_shot(room(x, 0.15, 0.3, seed)), gain=0.27, echo=0.3, pitched=False, pan=0.25)
    if name == "kick":
        n = n_of(0.6)
        x = sweep_sine(170, 50, 0.035, n) * decay_env(n, 0.3)
        x += np.sin(2 * np.pi * 1600 * np.arange(n) / SR) * decay_env(n, 0.004) * 0.4  # ビーターの当たり
        x += stick(n, 2500, 0.003) * 0.4
        return Patch(one_shot(room(x, 0.12, 0.25, seed, 2500)), gain=0.562, echo=0.05, pitched=False)
    if name == "snare":
        n = n_of(0.5)
        x = membrane(185, n, (0.08, 0.06, 0.05, 0.04, 0.03), (1, 0.6, 0.4, 0.3, 0.2), seed, drop=1.1, drop_tau=0.01) * 0.7
        x += fft_filter(noise(n, seed), bandpass(5000, 3500)) * decay_env(n, 0.15)  # 響き線
        x += fft_filter(noise(n, seed + 1), bandpass(1500, 700)) * decay_env(n, 0.05) * 0.6
        return Patch(one_shot(room(x, 0.2, 0.45, seed)), gain=0.765, echo=0.3, pitched=False, pan=-0.08)
    if name == "rim":
        n = n_of(0.2)
        x = partials([520, 1700], [0.02, 0.015], [1, 0.7], n, seed) + stick(n, 2500, 0.01)
        return Patch(one_shot(room(x, 0.15, 0.35, seed)), gain=0.54, echo=0.3, pitched=False, pan=-0.08)
    if name in ("tom_hi", "tom_mid", "tom_low"):
        f0, pan = {"tom_hi": (190, -0.35), "tom_mid": (140, 0.0), "tom_low": (95, 0.35)}[name]
        n = n_of(0.9)
        x = membrane(f0, n, (0.3, 0.15, 0.1, 0.08, 0.06), (1, 0.45, 0.3, 0.2, 0.12), seed, drop=1.35, drop_tau=0.04)
        x += stick(n, 2000, 0.006) * 0.5
        return Patch(one_shot(room(x, 0.22, 0.4, seed)), gain=0.45, echo=0.25, pitched=False, pan=pan)
    hat_freqs = [205.3 * 2.5, 304.4 * 2.5, 369.6 * 2.5, 522.7 * 2.5, 540 * 2.5, 800 * 2.5]
    if name in ("hat", "openhat"):
        n = n_of(0.2 if name == "hat" else 0.7)
        tau = 0.04 if name == "hat" else 0.28
        x = fft_filter(metal(hat_freqs, n, seed) + 0.5 * noise(n, seed), bandpass(9000, 3500)) * decay_env(n, tau)
        return Patch(one_shot(room(x, 0.12, 0.25, seed, 10000)), gain=0.473, echo=0.2, pitched=False, pan=0.35)
    if name == "crash":
        n = n_of(2.4)
        x = fft_filter(metal(hat_freqs, n, seed) + 0.8 * noise(n, seed), highpass(3500)) * decay_env(n, 0.9)
        x[: n_of(0.004)] *= np.linspace(0, 1, n_of(0.004))
        return Patch(one_shot(room(x, 0.3, 0.3, seed, 10000)), gain=0.338, echo=0.3, pitched=False, pan=-0.3)
    if name == "ride":
        n = n_of(1.4)
        x = fft_filter(metal(hat_freqs, n, seed) + 0.3 * noise(n, seed), highpass(5000)) * decay_env(n, 0.6) * 0.6
        x += partials([3100, 4700], [0.5, 0.3], [0.5, 0.3], n, seed)
        return Patch(one_shot(room(x, 0.2, 0.25, seed, 10000)), gain=0.225, echo=0.2, pitched=False, pan=0.4)
    raise KeyError(name)


BUILDERS = {
    "shakuhachi": _shakuhachi, "shinobue": _shinobue, "hichiriki": _hichiriki, "kokyu": _kokyu, "sho": _sho,
    "strings": _strings, "brass": _brass, "shamisen": _shamisen, "koto": _koto, "biwa": _biwa, "bass": _bass,
    "bell": _bell, "pickbass": _pickbass, "harp": _harp, "pizz": _pizz, "timpani": _timpani, "choir": _choir,
}
DRUM_NAMES = ["odaiko", "okedo", "shime", "kane", "hyoshigi", "woodblock", "kick", "snare", "rim", "hat", "openhat", "crash",
              "ride", "tom_hi", "tom_mid", "tom_low"]

_cache = {}


def get_patch(name: str, brr: bool = True) -> Patch:
    key = (name, brr)
    if key not in _cache:
        seed = sum(ord(c) for c in name)
        patch = _drum(name, seed) if name in DRUM_NAMES else BUILDERS[name](seed)
        x = patch.sample.data
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.95
        if patch.sample.loop_start is None and patch.sample.base_freq > 0:
            # 音程のある 1 回読み切りのサンプル（撥弦など）は、最後の 25% でなめらかに 0 まで下げる。
            # 鳴り切る前にサンプルが終わると、長い音の終わりで「ぷつっ」と切れて聞こえるため
            n_f = len(x) // 4
            x = x.copy()
            x[-n_f:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_f))
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
