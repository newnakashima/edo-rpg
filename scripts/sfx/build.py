"""効果音のスクリプトを実行し、Ogg Opus に書き出す。

  python3 scripts/sfx/build.py se_cursor se_ok      # sfx/sounds/<ID>.py → WAV → Ogg Opus → 確認用の画像
  python3 scripts/sfx/build.py --all                # sfx/sounds/ のすべて
  python3 scripts/sfx/build.py --sheet se_cursor se_ok   # 書き出したうえで、試聴用に並べて 1 つの音にする（--all と組み合わせてもよい）

[注意] があった、または書き出せなかった効果音があれば、終了コードは 1 になる（ほかの効果音は最後まで書き出す）。
同じスクリプトからは、何度書き出しても同じバイト列の .ogg ができる（音を変えていなければ git の差分に出ない）。

書き出しでは次を行う。
  1. 直流分を除き、終わりの無音（ピークから -60 dB 未満）を削って、終わりを 5 ms で消す
  2. 効果音の間で聞こえる大きさをそろえる（100 ms ごとの大きさの最大を TARGET_LUFS に。Sound の level で上下できる）。
     ピークは PEAK_DBFS を超えないようにする
  3. Ogg Opus（48 kHz）にする。モノラルの音はモノラルのまま書く。ストリームの番号などを固定して、同じ音なら同じバイト列にする

出力:
  public/assets/audio/se/<ID>.ogg          ゲームで鳴らす音（コミットする）
  sfx/.preview/<ID>.png, <ID>.wav          波形とスペクトログラムの画像、書き出し前の音（コミットしない）
  sfx/.preview/sheet.ogg                    --sheet で作る試聴用の音（コミットしない）
"""

from __future__ import annotations

import argparse
import runpy
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal as sig

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sfxcheck as chk  # noqa: E402
import sfxlib as sl  # noqa: E402

ROOT = sl.ROOT
SOUND_DIR = sl.SFX_DIR / "sounds"
PREVIEW_DIR = sl.SFX_DIR / ".preview"
OUT_DIR = ROOT / "public" / "assets" / "audio" / "se"
RATE = sl.RATE
TARGET_LUFS = -14.0  # 効果音の間でそろえる大きさ（100 ms ごとの最大）
PEAK_DBFS = -1.0
OPUS_BITRATE = {1: "64k", 2: "96k"}
SHEET_GAP = 0.6  # 試聴用に並べるときの間（秒）


def need(cmd: str) -> None:
    if shutil.which(cmd) is None:
        sys.exit(f"{cmd} がありません。SKILL.md の「準備」を見て入れてください。")


class BuildError(Exception):
    """1 つの効果音を書き出せなかった（ほかの効果音の書き出しは続ける）。"""


def load_sound(se_id: str) -> sl.Sound:
    script = SOUND_DIR / f"{se_id}.py"
    if not script.exists():
        raise BuildError(f"{script.relative_to(ROOT)} がありません")
    sl.reseed(se_id)
    try:
        env = runpy.run_path(str(script), run_name="__sfx__")
    except Exception as e:  # noqa: BLE001  スクリプトの誤りは、その効果音だけの失敗として知らせる
        raise BuildError(f"{script.name} の実行で {type(e).__name__}: {e}") from e
    sound = env.get("sound")
    if not isinstance(sound, sl.Sound):
        raise BuildError(f"{script.name} に sound = Sound(...) がありません")
    if sound.id != se_id:
        raise BuildError(f"{script.name} の Sound の id（{sound.id}）がファイル名と違います")
    audio = np.asarray(sound.audio, dtype=np.float64)
    if audio.ndim not in (1, 2) or (audio.ndim == 2 and audio.shape[1] != 2):
        raise BuildError(f"{se_id}: 音の配列の形が {audio.shape} です（1 次元か、(サンプル数, 2)）")
    if not np.isfinite(audio).all():
        raise BuildError(f"{se_id}: 音に NaN か無限大が入っています（0 で割る・大きすぎる値など）")
    sound.audio = audio
    return sound


def shape(audio: np.ndarray) -> np.ndarray:
    """直流分を除き、終わりの無音を削って、終わりを滑らかにする。"""
    if not audio.size:
        return audio
    audio = sig.sosfilt(sig.butter(1, 15, "highpass", fs=RATE, output="sos"), audio, axis=0)
    a = np.abs(audio).max(axis=1) if audio.ndim == 2 else np.abs(audio)
    peak = a.max()
    if peak == 0:
        return audio
    loud = np.where(a > peak * 10 ** (-60 / 20))[0]
    audio = audio[: loud[-1] + 1]
    return sl.fade(audio, fade_out=min(0.005, len(audio) / RATE / 4))


def normalize(audio: np.ndarray, level: float) -> tuple[np.ndarray, dict]:
    raw_peak = chk.peak_db(audio)
    info = {"raw_peak_db": raw_peak, "lufs": None, "limited_by_peak": False}
    if raw_peak is None or raw_peak < -80:
        return audio, info
    lufs = chk.loudness(audio)
    gain = (TARGET_LUFS + level - lufs) if lufs is not None else (PEAK_DBFS - raw_peak)
    if raw_peak + gain > PEAK_DBFS:
        gain = PEAK_DBFS - raw_peak
        info["limited_by_peak"] = True
    info["lufs"] = lufs + gain if lufs is not None else None
    return audio * 10 ** (gain / 20), info


def write_wav(path: Path, audio: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    x = audio if audio.ndim == 2 else audio[:, None]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def encode_opus(wav: Path, out: Path, title: str, channels: int) -> None:
    need("ffmpeg")
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-map_metadata", "-1",
         "-fflags", "+bitexact", "-flags:a", "+bitexact", "-c:a", "libopus", "-b:a", OPUS_BITRATE[channels],
         "-vbr", "on", "-application", "audio", "-metadata", f"title={title}", str(out)],
        check=True,
    )


def build(se_id: str, specs: dict[str, chk.Spec]) -> bool:
    """1 つ書き出して結果を表示する。[注意] があれば False。"""
    print(f"■ {se_id}")
    sound = load_sound(se_id)
    spec = specs.get(se_id)
    ok = True
    if spec is None:
        print("  [注意] docs/audio.md の効果音の表にない ID です。先に表に足す")
        ok = False
    audio = shape(sound.audio)
    if not audio.size or chk.peak_db(audio) is None:
        raise BuildError("無音です（音を書き出していない）")
    audio, info = normalize(audio, sound.level)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    wav = PREVIEW_DIR / f"{se_id}.wav"
    write_wav(wav, audio)
    out = OUT_DIR / f"{se_id}.ogg"
    channels = 2 if audio.ndim == 2 else 1
    encode_opus(wav, out, sound.title or se_id, channels)
    png = PREVIEW_DIR / f"{se_id}.png"
    target = spec.length if spec else None
    chk.draw(audio, png, f"{se_id}  {sound.title}", target)

    secs = len(audio) / RATE
    tgt = f"（目安 {target:g} 秒）" if target else ""
    print(f"  音: {out.relative_to(ROOT)}（{out.stat().st_size / 1024:.1f} KB、{'ステレオ' if channels == 2 else 'モノラル'}）"
          f"  画像: {png.relative_to(ROOT)}")
    lufs = f"{info['lufs']:.1f}" if info["lufs"] is not None else "測れない"
    print(f"  長さ: {secs:.3f} 秒{tgt}  大きさ: {lufs} LUFS（目標 {TARGET_LUFS + sound.level:g}、level {sound.level:+g}）"
          f"  ピーク: {chk.peak_db(audio):.1f} dBFS")
    limit = chk.max_length(spec)
    if limit is not None and secs > limit:
        why = "（戦闘の音は 0.6 秒まで）" if spec.group == "戦闘" and limit == chk.BATTLE_MAX else ""
        print(f"  [注意] 目安より長い（{limit:.2f} 秒まで）{why}。余韻を短くするか、目安を見直す")
        ok = False
    if target and secs < target * 0.5:
        print(f"  [注意] 目安の半分より短い。意図したものか確かめる")
        ok = False
    hs = chk.head_silence(audio)
    if hs > 0.01:
        print(f"  [注意] 鳴り始めまで {hs * 1000:.0f} ms の無音がある。押してから鳴るまで遅れて聞こえる")
        ok = False
    if info["limited_by_peak"]:
        print(f"  [注意] ピークが {PEAK_DBFS} dBFS を超えないよう、目標より小さくした（一瞬だけ大きい音があれば、そこを抑える）")
        ok = False
    for n in sound.notes:
        print(f"  メモ: {n}")
    return ok


def sheet(ids: list[str]) -> Path:
    """書き出した音を SHEET_GAP 秒ずつ空けて並べ、試聴用の 1 つの音にする。"""
    parts = []
    for se_id in ids:
        a = chk.decode(OUT_DIR / f"{se_id}.ogg")
        parts.append(np.stack([a, a], axis=1) if a.ndim == 1 else a)  # モノラルは左右に同じ音（大きさを変えない）
        parts.append(np.zeros((sl.n_of(SHEET_GAP), 2)))
    audio = np.vstack(parts)
    wav = PREVIEW_DIR / "sheet.wav"
    write_wav(wav, audio)
    out = PREVIEW_DIR / "sheet.ogg"
    encode_opus(wav, out, "試聴: " + " ".join(ids), 2)
    wav.unlink()
    t = 0.0
    print("■ 試聴用: " + str(out.relative_to(ROOT)))
    for se_id, p in zip(ids, parts[::2]):
        print(f"  {t:5.2f} 秒〜 {se_id}")
        t += len(p) / RATE + SHEET_GAP
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ids", nargs="*", help="効果音の ID（sfx/sounds/<ID>.py）")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--sheet", action="store_true", help="書き出した音を並べた試聴用の音を作る")
    args = ap.parse_args()
    if args.all and args.ids:
        ap.error("--all と ID は一緒に指定できません")
    ids = sorted(p.stem for p in SOUND_DIR.glob("se_*.py")) if args.all else args.ids
    if not ids:
        ap.print_help()
        sys.exit(2)
    specs = chk.load_specs()
    bad, failed = [], []
    for se_id in ids:
        try:
            if not build(se_id, specs):
                bad.append(se_id)
        except (BuildError, subprocess.CalledProcessError, OSError) as e:
            print(f"  [失敗] {e}")
            failed.append(se_id)
    if args.sheet:
        built = [i for i in ids if i not in failed and (OUT_DIR / f"{i}.ogg").exists()]
        if built:
            sheet(built)
    if bad:
        print(f"[注意] があった: {', '.join(bad)}")
    if failed:
        print(f"[失敗] 書き出せなかった（試聴用の音にも入れていない）: {', '.join(failed)}")
    sys.exit(1 if bad or failed else 0)


if __name__ == "__main__":
    main()
