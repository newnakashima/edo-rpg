"""MIDI をスーパーファミコン風の音源で鳴らし、Ogg Opus（.opus）に書き出す。

使い方:
  python3 scripts/bgm/render.py <曲.mid> [-o public/assets/bgm/<id>.opus] [--wav 確認用.wav]

- ループ: MIDI のマーカー loopStart / loopEnd（song.py が書く）の間をループにする。ループの最後で鳴り残る
  音（余韻・エコー）はループの頭に重ねるので、ファイルの最後から loopStart に戻るとつなぎ目なく聞こえる。
  ループの位置は Opus のタグ LOOPSTART / LOOPLENGTH（48000 Hz のサンプル数）に書く。
  イントロがない曲は LOOPSTART = 0 で、ファイル全体をそのままくり返せばよい。
- ループしない曲（マーカーが end か、マーカーがない）は、最後の音の余韻を残してフェードアウトする。
- 楽器はトラック名（song.py が「楽器名:パート名」で書く）で選ぶ。ほかの MIDI は GM のプログラム番号で近い楽器を選ぶ。
必要なもの: numpy、ffmpeg（libopus 付き）
"""
import argparse
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from instruments import GM_DRUM_SOUNDS, INSTRUMENTS, MAX_VOICES, instrument_for_program  # noqa: E402
from smf import read_smf  # noqa: E402
from synth import SR, echo, get_patch, voice  # noqa: E402

OUT_SR = 48000
TAIL_SEC = 6.0


def track_instrument(mid, note) -> str:
    name = mid.track_names.get(note.track, "")
    if note.channel == 9 or name.startswith("drums"):
        return "drums"
    head = name.split(":")[0].strip().lower()
    if head in INSTRUMENTS:
        return head
    return instrument_for_program(note.program)


PART_ENERGY = {}  # トラック名 → 鳴らした音を K 特性で重み付けした二乗和（パートごとの音量の報告に使う）


def k_weight(x: np.ndarray) -> np.ndarray:
    """耳の感じ方に近づける重み付け（ITU-R BS.1770 の K 特性に近い形）。1.5 kHz より上を 4 dB 持ち上げ、
    40 Hz より下を削る。素の実効値で比べると、高い音域の楽器（三味線・篠笛など）が実際より小さく、
    低い音（ベース・大太鼓）が実際より大きく出るため、パートの音量はこの重みで比べる。"""
    spec = np.fft.rfft(x)
    f = np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1e-3)
    s = (f / 1500) ** 2
    spec *= np.sqrt((1 + s * 10 ** 0.4) / (1 + s)) * f ** 2 / np.sqrt(f ** 4 + 38.0 ** 4)
    return np.fft.irfft(spec, len(x))


def render_notes(notes, total: int, mid, brr: bool, echo_cfg):
    """音を鳴らして (左, 右) を返す。"""
    dl, dr = np.zeros(total), np.zeros(total)
    el, er = np.zeros(total), np.zeros(total)
    by_track = {}
    for n in notes:
        by_track.setdefault((n.track, n.channel), []).append(n)
    for (_tr, _ch), lst in by_track.items():
        lst.sort(key=lambda n: n.start)
        inst = track_instrument(mid, lst[0])
        tname = mid.track_names.get(_tr, f"track{_tr}")
        tbuf = np.zeros(total)
        # 1 音ずつのパート（旋律など）は、次の音が鳴ったら前の音の余韻を切る（SNES の 1 チャンネル 1 音と同じ）
        mono = inst != "drums" and all(lst[i + 1].start >= lst[i].end for i in range(len(lst) - 1))
        for i, n in enumerate(lst):
            if inst == "drums":
                sound = GM_DRUM_SOUNDS.get(n.pitch)
                if sound is None:
                    continue
                patch = get_patch(sound, brr)
                freq = 0.0
            else:
                patch = get_patch(inst, brr)
                freq = 440.0 * 2 ** ((n.pitch - 69) / 12)
            s0 = int(round(mid.seconds(n.start) * SR))
            s1 = int(round(mid.seconds(n.end) * SR))
            max_len = None
            if mono and i + 1 < len(lst):
                max_len = int(round(mid.seconds(lst[i + 1].start) * SR)) - s0
            if s0 >= total:
                continue
            sig = voice(patch, freq, max(1, s1 - s0), n.vel, max_len)
            sig = sig[: total - s0]
            vol = (n.volume / 127) ** 2 * (n.expression / 127) ** 2
            p = np.clip((n.pan - 64) / 63 + patch.pan, -1, 1)
            gl, gr = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
            seg = slice(s0, s0 + len(sig))
            tbuf[seg] += sig * vol
            dl[seg] += sig * vol * gl
            dr[seg] += sig * vol * gr
            el[seg] += sig * vol * gl * patch.echo
            er[seg] += sig * vol * gr * patch.echo
        PART_ENERGY[tname] = PART_ENERGY.get(tname, 0.0) + float(np.sum(k_weight(tbuf) ** 2))
    delay, fb, mix = echo_cfg
    if mix > 0:
        # 右のエコーだけ 16 ms 遅らせて、左右に少し広げる
        el = echo(el, delay, fb) * mix
        er = echo(er, delay + 16, fb) * mix
    else:
        el[:] = 0
        er[:] = 0
    return dl + el, dr + er


def fft_resample(x: np.ndarray, n_out: int) -> np.ndarray:
    n = len(x)
    spec = np.fft.rfft(x)
    out_spec = np.zeros(n_out // 2 + 1, dtype=complex)
    m = min(len(spec), len(out_spec))
    out_spec[:m] = spec[:m]
    return np.fft.irfft(out_spec, n_out) * (n_out / n)


def resample_segment(seg: np.ndarray, before: np.ndarray, after: np.ndarray) -> np.ndarray:
    """前後の文脈をつけて 32000 → 48000 Hz に変え、seg の部分だけ返す。長さはすべて偶数にしておく。"""
    x = np.concatenate([before, seg, after])
    y = fft_resample(x, len(x) * 3 // 2)
    a = len(before) * 3 // 2
    return y[a: a + len(seg) * 3 // 2]


def limiter_gain(x: np.ndarray, threshold: float, release: float = 0.08) -> np.ndarray:
    """ピークだけを抑える音量の係数（1 ms ごとに計算し、5 ms 先読みして、release 秒でもとに戻す）。"""
    blk = OUT_SR // 1000
    n = len(x) // blk + 1
    pad = np.zeros(n * blk)
    pad[: len(x)] = np.max(np.abs(x), axis=1)
    peaks = pad.reshape(n, blk).max(axis=1)
    want = np.minimum(1.0, threshold / np.maximum(peaks, 1e-9))
    look = 5
    want = np.array([want[i:i + look].min() for i in range(n)])  # 先読み
    g = np.empty(n)
    cur = 1.0
    rel = np.exp(-1 / (release * 1000))
    for i in range(n):
        cur = want[i] if want[i] < cur else want[i] + (cur - want[i]) * rel
        g[i] = cur
    return np.repeat(g, blk)[: len(x)]


def master(st: np.ndarray, loudness: float, ls: int | None) -> tuple:
    """目標の実効値に合わせ、はみ出すピークはリミッターで抑える。ループ部分は輪にして処理し、つなぎ目で
    音量が跳ばないようにする。"""
    st = st - st.mean(axis=0, keepdims=True)
    rms = float(np.sqrt(np.mean(st ** 2)))
    gain = 10 ** (loudness / 20) / (rms + 1e-12)
    st = st * gain
    thr = 10 ** (-1.0 / 20)
    if ls is None:
        g = limiter_gain(st, thr)
    else:
        body = st[ls:]
        g_body = limiter_gain(np.concatenate([body, body]), thr)[len(body):]
        g_intro = limiter_gain(np.concatenate([st[:ls], body[: OUT_SR]]), thr)[:ls] if ls else np.zeros(0)
        g = np.concatenate([g_intro, g_body])
    st = st * g[:, None]
    return st, gain, float(np.min(g))


def even(n: int) -> int:
    return n - (n % 2)


def main():
    ap = argparse.ArgumentParser(description="MIDI をスーパーファミコン風の音で Ogg Opus に書き出す")
    ap.add_argument("midi")
    ap.add_argument("-o", "--output", help="出力する .opus（省略時は public/assets/bgm/<MIDI の名前>.opus）")
    ap.add_argument("--wav", help="確認用に WAV（48000 Hz）も書き出す")
    ap.add_argument("--bitrate", default="96k")
    ap.add_argument("--no-brr", action="store_true", help="BRR の粗さを出さない（比べる時だけ）")
    ap.add_argument("--echo", nargs=3, type=float, metavar=("遅延ms", "フィードバック", "量"),
                    help="エコーの設定（省略時は MIDI に書かれた値。なければ 112 0.35 0.22）")
    ap.add_argument("--loudness", type=float, default=-18.0, help="目標の実効値（dBFS）。曲ごとの音量をそろえる")
    args = ap.parse_args()

    mid = read_smf(args.midi)
    if not mid.notes:
        raise SystemExit("音がない MIDI")
    echo_cfg = (112.0, 0.35, 0.22)
    for _t, text in mid.texts:
        if text.startswith("snes:echo="):
            a, b, c = text.split("=", 1)[1].split(",")
            echo_cfg = (float(a), float(b), float(c))
    if args.echo:
        echo_cfg = tuple(args.echo)
    markers = {m.lower(): t for t, m in mid.markers}
    looping = "loopstart" in markers and "loopend" in markers
    end_tick = markers.get("loopend", markers.get("end", max(n.end for n in mid.notes)))
    ls_tick = markers.get("loopstart", 0)
    ls = even(int(round(mid.seconds(ls_tick) * SR)))
    le = even(int(round(mid.seconds(end_tick) * SR)))
    total = le + int(TAIL_SEC * SR)

    # 同時発音数
    edges = sorted([(mid.seconds(n.start), 1) for n in mid.notes] + [(mid.seconds(n.end), -1) for n in mid.notes],
                   key=lambda e: (e[0], e[1]))
    cur = peak = 0
    for _t, d in edges:
        cur += d
        peak = max(peak, cur)

    brr = not args.no_brr
    if looping:
        intro_notes = [n for n in mid.notes if n.start < ls_tick]
        loop_notes = [n for n in mid.notes if n.start >= ls_tick]
        a_l, a_r = render_notes(intro_notes, total, mid, brr, echo_cfg) if intro_notes else (np.zeros(total), np.zeros(total))
        b_l, b_r = render_notes(loop_notes, total, mid, brr, echo_cfg)
        chans = []
        loop_len = le - ls
        for a, b in ((a_l, b_l), (a_r, b_r)):
            body = b[ls:le].copy()
            tail = b[le:]
            k = 0
            while k < len(tail):  # 余韻をループの頭へ折り返して重ねる
                m = min(loop_len, len(tail) - k)
                body[:m] += tail[k:k + m]
                k += m
            intro = (a + b)[:ls]
            ctx = 2048
            loop48 = resample_segment(body, body[-ctx:], body[:ctx])
            if ls:
                intro48 = resample_segment(intro, np.zeros(ctx), body[:ctx])
                chans.append(np.concatenate([intro48, loop48]))
            else:
                chans.append(loop48)
        ls48, len48 = ls * 3 // 2, loop_len * 3 // 2
    else:
        l, r = render_notes(list(mid.notes), total, mid, brr, echo_cfg)
        # 余韻が消えた所で切る
        env = np.maximum(np.abs(l), np.abs(r))
        above = np.nonzero(env > 10 ** (-60 / 20) * env.max())[0]
        end = even(min(total, max(le, int(above[-1]) + 1 if len(above) else le)))
        fade = min(int(0.5 * SR), end - le) if end > le else 0
        chans = []
        for x in (l, r):
            y = x[:end].copy()
            if fade > 0:
                y[end - fade:end] *= np.linspace(1, 0, fade)
            chans.append(resample_segment(y, np.zeros(2048), np.zeros(2048)))
        ls48 = len48 = None

    st, gain, min_g = master(np.stack(chans, axis=1), args.loudness, ls48 if looping else None)
    rms = float(np.sqrt(np.mean(st ** 2)))
    peak_v = float(np.max(np.abs(st)))
    pcm = np.clip(np.round(st * 32767), -32768, 32767).astype("<i2")

    out = Path(args.output) if args.output else Path("public/assets/bgm") / (Path(args.midi).stem + ".opus")
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "mix.wav"
        with wave.open(str(tmp), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(OUT_SR)
            w.writeframes(pcm.tobytes())
        if args.wav:
            Path(args.wav).parent.mkdir(parents=True, exist_ok=True)
            Path(args.wav).write_bytes(tmp.read_bytes())
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-c:a", "libopus", "-b:a", args.bitrate,
               "-vbr", "on", "-application", "audio", "-map_metadata", "-1"]
        if looping:
            cmd += ["-metadata", f"LOOPSTART={ls48}", "-metadata", f"LOOPLENGTH={len48}"]
        cmd += [str(out)]
        subprocess.run(cmd, check=True)

    # 書き出したファイルを読み戻して確かめる
    dec = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(out), "-f", "s16le", "-ac", "2", "-ar", str(OUT_SR), "-"],
                         check=True, capture_output=True).stdout
    back = np.frombuffer(dec, dtype="<i2").reshape(-1, 2).astype(np.float64) / 32768
    n = len(pcm)
    print(f"書き出し: {out}（{out.stat().st_size / 1024:.0f} KB、{n / OUT_SR:.2f} 秒、{args.bitrate}）")
    print(f"読み戻した長さ: {len(back) / OUT_SR:.3f} 秒（書いた長さとの差 {len(back) - n} サンプル）")
    if looping:
        print(f"ループ: LOOPSTART={ls48} LOOPLENGTH={len48}（{ls48 / OUT_SR:.3f} 秒から {len48 / OUT_SR:.3f} 秒間）")
        a = pcm[ls48: ls48 + 1].astype(float)
        z = pcm[-1:].astype(float)
        jump = float(np.max(np.abs(a - z))) / 32768
        typical = float(np.percentile(np.abs(np.diff(pcm.astype(float), axis=0)), 99)) / 32768
        verdict = "問題なし" if jump <= max(typical * 1.5, 0.01) else "つなぎ目で音が跳ぶ。ループの最後の小節と最初の小節を見直す"
        print(f"つなぎ目の段差: {jump:.4f}（ふだんの隣り合うサンプルの差の 99 パーセンタイル {typical:.4f}）→ {verdict}")
    else:
        print("ループしない曲として書き出した")
    db = lambda v: 20 * np.log10(max(v, 1e-9))  # noqa: E731
    print(f"音量: 実効値 {db(rms):.1f} dBFS、最大 {db(peak_v):.1f} dBFS（音量の補正 {db(gain):+.1f} dB、"
          f"リミッターで最も下げた所 {db(min_g):.1f} dB）")
    if min_g < 10 ** (-6 / 20):
        print("警告: リミッターが 6 dB より大きく効いている所がある。打楽器などの一部の音が大きすぎるので、そのパートの vol= を下げる")
    if peak_v > 0.95:
        print("警告: 最大値が 0 dBFS に近い。音割れのおそれがある")
    print(f"同時発音数の最大: {peak}" + (f"（警告: SNES の {MAX_VOICES} 音を超えている）" if peak > MAX_VOICES else f"（上限 {MAX_VOICES}）"))
    insts = sorted({track_instrument(mid, n_) for n_ in mid.notes})
    print(f"使った楽器: {', '.join(insts)}")
    if PART_ENERGY:
        ref = max(PART_ENERGY.values())
        print("パートごとの音量（耳の感じ方に近い K 特性で重み付け。いちばん大きいパートとの差）:")
        for name, e in sorted(PART_ENERGY.items(), key=lambda kv: -kv[1]):
            print(f"  {name:24} {10 * np.log10(e / ref + 1e-12):6.1f} dB")
        melodic = {k: v for k, v in PART_ENERGY.items() if not k.startswith("drums")}
        mel = [k for k in melodic if k.endswith(":melody")]
        if mel and melodic:
            top = max(melodic, key=melodic.get)
            if melodic[mel[0]] < melodic[top] * 10 ** (-3 / 10):
                print(f"警告: 旋律（{mel[0]}）が {top} より 3 dB 以上小さい。旋律が埋もれている。旋律の vol= を上げるか、ほかを下げる")
            others = {k: v for k, v in PART_ENERGY.items() if k != mel[0]}
            if others:
                second = max(others, key=others.get)
                if melodic[mel[0]] > others[second] * 10 ** (3 / 10):
                    print(f"警告: 旋律（{mel[0]}）が 2 番目に大きい {second} より 3 dB 以上大きい。旋律だけが浮いて聞こえる。"
                          "旋律の vol= を下げるか、低音・打楽器を上げる")
        elif melodic:
            print("（旋律のパートの名前を melody にすると、旋律が埋もれていないかも確かめる）")
    # 無音の区間（1 小節以上ほぼ無音）が途中にないか
    frame = OUT_SR // 10
    lv = np.sqrt(np.mean((pcm[: len(pcm) // frame * frame].astype(float) / 32768) ** 2, axis=1).reshape(-1, frame).mean(axis=1))
    quiet = np.nonzero(lv < 10 ** (-50 / 20))[0]
    if len(quiet) > 15 and looping:
        print(f"警告: ほぼ無音の所が合計 {len(quiet) / 10:.1f} 秒ある（最初は {quiet[0] / 10:.1f} 秒付近）")


if __name__ == "__main__":
    main()
