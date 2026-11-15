"""曲を MIDI に組み立て、Ogg Opus に書き出す。

  python3 scripts/music/build.py bgm_title          # music/songs/bgm_title.py → MIDI → Ogg Opus → ピアノロール
  python3 scripts/music/build.py bgm_title --midi-only
  python3 scripts/music/build.py --all              # music/songs/ のすべての曲
  python3 scripts/music/build.py --theme main       # core-theme を試聴用に書き出す（ゲームには入れない）
  python3 scripts/music/build.py --catalog          # music/catalog.md を作り直す

出力:
  music/midi/<id>.mid, music/midi/<id>.json        曲の MIDI と、素材の使い方などの記録（コミットする）
  public/assets/audio/bgm/<id>.ogg                  ゲームで鳴らす音（コミットする）
  music/.preview/<id>.png, <id>.wav                 確認用のピアノロールと書き出し前の音（コミットしない）
"""

from __future__ import annotations

import argparse
import json
import re
import runpy
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import musiclib as ml  # noqa: E402
import pianoroll  # noqa: E402

ROOT = ml.ROOT
SONG_DIR = ml.MUSIC_DIR / "songs"
PREVIEW_DIR = ml.MUSIC_DIR / ".preview"
OUT_DIR = ROOT / "public" / "assets" / "audio" / "bgm"
SOUNDFONT_CANDIDATES = [
    Path("/usr/share/sounds/sf2/FluidR3_GM.sf2"),
    Path("/usr/share/soundfonts/FluidR3_GM.sf2"),
]
RATE = 48000
TAIL_SECONDS = 4.0  # 残響が消えるまで書き出す長さ
TARGET_LUFS = -16.0  # 曲の間で聞こえる音量をそろえる目標（ラウドネス）
PEAK_DBFS = -1.0  # ラウドネスをそろえても、ピークはこれを超えないようにする
OPUS_BITRATE = "128k"


def soundfont() -> Path:
    for p in SOUNDFONT_CANDIDATES:
        if p.exists():
            return p
    sys.exit("音色ファイル（FluidR3_GM.sf2）がありません。SKILL.md の「準備」を見て入れてください。")


def need(cmd: str) -> None:
    if shutil.which(cmd) is None:
        sys.exit(f"{cmd} がありません。SKILL.md の「準備」を見て入れてください。")


def build_song(song_id: str) -> tuple[Path, dict]:
    script = SONG_DIR / f"{song_id}.py"
    if not script.exists():
        sys.exit(f"{script.relative_to(ROOT)} がありません")
    env = runpy.run_path(str(script), run_name="__song__")
    song = env.get("song")
    if not isinstance(song, ml.Song):
        sys.exit(f"{script.name} に song = Song(...) がありません")
    if song.id != song_id:
        sys.exit(f"{script.name} の Song の id（{song.id}）がファイル名と違います")
    path = song.write()
    meta = json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
    return path, meta


def render_wav(midi_path: Path, wav_path: Path, gain: float = 0.6) -> np.ndarray:
    """fluidsynth で WAV にする。残響が切れないよう、MIDI の終わりを TAIL_SECONDS 延ばしてから書き出す。"""
    need("fluidsynth")
    mid = ml.mido.MidiFile(midi_path, charset="utf-8")
    padded = PREVIEW_DIR / f"{midi_path.stem}.padded.mid"
    tail_ticks = int(ml.mido.second2tick(TAIL_SECONDS, mid.ticks_per_beat, _last_tempo(mid)))
    conductor = mid.tracks[0]
    if conductor and conductor[-1].type == "end_of_track":
        conductor[-1] = conductor[-1].copy(time=conductor[-1].time + tail_ticks)
    else:
        conductor.append(ml.mido.MetaMessage("end_of_track", time=tail_ticks))
    mid.save(padded)
    wav_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["fluidsynth", "-ni", "-q", "-g", str(gain), "-r", str(RATE), "-O", "s16", "-T", "wav",
         "-F", str(wav_path), str(soundfont()), str(padded)],
        check=True, stdout=subprocess.DEVNULL,
    )
    padded.unlink()
    with wave.open(str(wav_path)) as w:
        if w.getsampwidth() != 2 or w.getframerate() != RATE:
            sys.exit(f"fluidsynth の書き出しが 16 bit・{RATE} Hz ではありません"
                     f"（{w.getsampwidth() * 8} bit・{w.getframerate()} Hz）")
        ch = w.getnchannels()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    return data.reshape(-1, ch)


def _last_tempo(mid) -> int:
    tempo = 500000
    for msg in mid.tracks[0]:
        if msg.type == "set_tempo":
            tempo = msg.tempo
    return tempo


def shape_audio(audio: np.ndarray, meta: dict) -> np.ndarray:
    """ループする曲は、継ぎ目の後ろの残響をループの頭に重ね、ちょうどループの長さで切る。"""
    end = int(round(meta["length_seconds"] * RATE))
    if meta["loop"]:
        start = int(round(meta["loop_start_seconds"] * RATE))
        body = audio[:end].copy()
        if len(body) < end:
            body = np.vstack([body, np.zeros((end - len(body), audio.shape[1]))])
        tail = audio[end:]
        span = end - start
        for i in range(0, len(tail), span):  # 残響がループより長くても重ね切る
            chunk = tail[i:i + span]
            body[start:start + len(chunk)] += chunk
        return body
    # ループしない曲は残響が消えるまで残し、最後の無音を削る
    loud = np.where(np.abs(audio).max(axis=1) > 10 ** (-60 / 20))[0]
    last = max(end, (loud[-1] + 1) if len(loud) else end)
    out = audio[:last].copy()
    fade = min(int(0.05 * RATE), len(out))
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return out


def loudness(audio: np.ndarray) -> float | None:
    """ffmpeg の ebur128 で、曲全体のラウドネス（LUFS）を測る。測れない（短すぎる・無音）ときは None。"""
    need("ffmpeg")
    tmp = PREVIEW_DIR / "_loudness.wav"
    write_wav(tmp, audio)
    res = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(tmp), "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True, check=True)
    tmp.unlink()
    found = re.findall(r"I:\s+(-?[\d.]+|-inf) LUFS", res.stderr)
    if not found or found[-1] == "-inf" or float(found[-1]) < -70:
        return None
    return float(found[-1])


def normalize(audio: np.ndarray) -> tuple[np.ndarray, dict]:
    """曲の間で聞こえる音量がそろうよう、ラウドネスを TARGET_LUFS にそろえる。ピークが PEAK_DBFS を超えるなら、そこまで下げる。"""
    peak = float(np.abs(audio).max())
    # -60 dBFS より小さいものは無音として扱い、持ち上げない（雑音を目標の音量まで上げないため）
    audible = peak > 10 ** (-60 / 20)
    info = {"raw_peak_db": 20 * np.log10(peak) if audible else None, "lufs": None, "limited_by_peak": False}
    if not audible:
        return audio, info
    lufs = loudness(audio)
    gain_db = (TARGET_LUFS - lufs) if lufs is not None else (PEAK_DBFS - info["raw_peak_db"])
    if info["raw_peak_db"] + gain_db > PEAK_DBFS:
        gain_db = PEAK_DBFS - info["raw_peak_db"]
        info["limited_by_peak"] = True
    out = audio * 10 ** (gain_db / 20)
    info["lufs"] = (lufs + gain_db) if lufs is not None else None
    return out, info


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = np.clip(audio, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(audio.shape[1])
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((pcm * 32767).astype(np.int16).tobytes())


def encode_opus(wav: Path, out: Path, meta: dict) -> None:
    need("ffmpeg")
    out.parent.mkdir(parents=True, exist_ok=True)
    tags = ["-metadata", f"title={meta['title']}"]
    if meta["loop"]:
        tags += ["-metadata", f"LOOPSTART={int(round(meta['loop_start_seconds'] * RATE))}",
                 "-metadata", f"LOOPLENGTH={int(round((meta['length_seconds'] - meta['loop_start_seconds']) * RATE))}"]
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libopus", "-b:a", OPUS_BITRATE,
         "-vbr", "on", "-application", "audio", *tags, str(out)],
        check=True,
    )


def report(audio: np.ndarray, meta: dict, info: dict) -> None:
    secs = len(audio) / RATE
    rms = 20 * np.log10(float(np.sqrt((audio ** 2).mean())) or 1e-9)
    print(f"  長さ: {secs:.2f} 秒（{meta['length_beats']:g} 拍）  ループ: {'あり' if meta['loop'] else 'なし'}")
    if info["raw_peak_db"] is None:
        print("  [注意] 無音です。音を置いたトラック、打楽器の音の番号、強さを見直す")
        return
    peak_now = 20 * np.log10(float(np.abs(audio).max()))
    lufs = f"{info['lufs']:.1f} LUFS" if info["lufs"] is not None else "測れない（短すぎる）"
    print(f"  ラウドネス: {lufs}（目標 {TARGET_LUFS} LUFS）  ピーク: {peak_now:.1f} dBFS  平均音量（RMS）: {rms:.1f} dBFS")
    if info["limited_by_peak"]:
        print(f"  [注意] ピークが {PEAK_DBFS} dBFS を超えないよう、目標より小さくした。ほかの曲より小さく聞こえる"
              "おそれがある（一瞬だけ大きい音があれば、その強さを下げる）")
    if info["raw_peak_db"] > -0.1:
        print("  [注意] 書き出し時に音が割れている可能性があります。トラックの volume か強さを下げる")
    if meta["loop"]:
        start = int(round(meta["loop_start_seconds"] * RATE))
        w = int(0.02 * RATE)
        a = audio[-w:]
        b = audio[start:start + w]
        jump = float(np.abs(audio[-1] - audio[start]).max())
        print(f"  ループの継ぎ目: 末尾 20ms の RMS {_db(a)} / 頭 20ms の RMS {_db(b)} / 継ぎ目の段差 {jump:.3f}")
        if jump > 0.2:
            print("  [注意] 継ぎ目で波形が大きく跳んでいます。プツッと鳴るおそれがある")
    for t in meta["tracks"]:
        used = ", ".join(sorted({u["source"] for u in t["uses"]})) or "—"
        print(f"  トラック {t['name']}（{t['role']}、音色 {t['program']}{'、打楽器' if t['drum'] else ''}）: {used}")


def _db(x: np.ndarray) -> str:
    v = float(np.sqrt((x ** 2).mean()))
    return f"{20 * np.log10(v):.1f} dB" if v > 0 else "無音"


def build(song_id: str, midi_only: bool) -> None:
    print(f"■ {song_id}")
    midi, meta = build_song(song_id)
    print(f"  MIDI: {midi.relative_to(ROOT)}")
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    png = PREVIEW_DIR / f"{song_id}.png"
    pianoroll.draw(midi, png, meta)
    print(f"  ピアノロール: {png.relative_to(ROOT)}")
    if midi_only:
        return
    out = OUT_DIR / f"{song_id}.ogg"
    audio, info = render_song(midi, meta, out)
    print(f"  音: {out.relative_to(ROOT)}（{out.stat().st_size // 1024} KB）")
    report(audio, meta, info)


def render_song(midi: Path, meta: dict, out: Path) -> tuple[np.ndarray, dict]:
    """MIDI → WAV → ループの処理 → 音量をそろえる → Ogg Opus。曲と core-theme の試聴で同じ流れを使う。"""
    wav = PREVIEW_DIR / f"{midi.stem}.wav"
    audio = shape_audio(render_wav(midi, wav), meta)
    audio, info = normalize(audio)
    write_wav(wav, audio)
    encode_opus(wav, out, meta)
    return audio, info


def preview_theme(theme_id: str) -> None:
    """core-theme を、旋律（と参考の和音）だけで試聴用に書き出す。ゲームには入れない。"""
    themes = ml.load_themes()
    if theme_id not in themes:
        sys.exit(f"core-theme {theme_id!r} がありません")
    t = themes[theme_id]
    song = ml.Song(f"theme_{theme_id}", tempo=t.tempo or 90, meter=t.meter, loop=False, title=t.title)
    song.track("旋律", program=0, role="main").put(0, t.melody)
    if t.harmony:
        song.track("参考の和音", program=48, role="other", volume=70).put(0, t.harmony)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    midi = song.write(PREVIEW_DIR / f"theme_{theme_id}.mid")
    meta = json.loads(midi.with_suffix(".json").read_text(encoding="utf-8"))
    pianoroll.draw(midi, PREVIEW_DIR / f"theme_{theme_id}.png", meta, motifs=t.motifs, theme=t)
    ogg = PREVIEW_DIR / f"theme_{theme_id}.ogg"
    render_song(midi, meta, ogg)
    print(f"■ core-theme {theme_id}（{t.title}）: {len(t.melody.bar_starts)} 小節")
    for mid_, e in t.motifs.items():
        where = f"{e['bars'][0]}-{e['bars'][1]} 小節" if e["bars"] else "書き直した断片"
        print(f"  motiv {mid_}: {where} {e['about']}")
    print(f"  試聴: {ogg.relative_to(ROOT)}  ピアノロール: {(PREVIEW_DIR / f'theme_{theme_id}.png').relative_to(ROOT)}")


def catalog() -> None:
    """core-theme・motiv の一覧と、どの曲がどの素材をどこで使っているかを music/catalog.md に書く。"""
    themes = ml.load_themes()
    lines = ["# 曲の素材の一覧", "", "`python3 scripts/music/build.py --catalog` で作り直す。手で書き換えない。", ""]
    lines += ["## core-theme", "", "| ID | 名前 | 拍子 | 小節数 | どんな主題か |", "| --- | --- | --- | --- | --- |"]
    for t in themes.values():
        lines.append(f"| {t.id} | {t.title} | {t.meter} | {len(t.melody.bar_starts)} | {' '.join(t.about)} |")
    lines += ["", "## motiv", "", "| ID | 元の core-theme | 範囲 | どんな断片か |", "| --- | --- | --- | --- |"]
    for t in themes.values():
        for mid_, e in t.motifs.items():
            where = f"{e['bars'][0]}-{e['bars'][1]} 小節" if e["bars"] else "書き直した断片"
            lines.append(f"| {mid_} | {t.id} | {where} | {e['about']} |")
    lines += ["", "## 曲", "", "| ID | 名前 | ループ | 主旋律（main） | 副旋律（sub） |", "| --- | --- | --- | --- | --- |"]
    for meta_path in sorted(ml.MIDI_DIR.glob("*.json")):
        if not (SONG_DIR / f"{meta_path.stem}.py").exists():
            print(f"[注意] {meta_path.relative_to(ROOT)} の曲のスクリプト（music/songs/{meta_path.stem}.py）がありません。"
                  "カタログに載せない。曲を消したのなら、MIDI・JSON・ogg も消す")
            continue
        m = json.loads(meta_path.read_text(encoding="utf-8"))
        by_role = {"main": set(), "sub": set()}
        for t in m["tracks"]:
            if t["role"] in by_role:
                by_role[t["role"]] |= {re.match(r"[a-z]+:[\w.-]+", u["source"]).group(0) for u in t["uses"]}
        fmt = lambda s: ", ".join(sorted(s)) or "新しく書いた旋律だけ"  # noqa: E731
        lines.append(f"| {m['id']} | {m['title']} | {'あり' if m['loop'] else 'なし'} | {fmt(by_role['main'])} | {fmt(by_role['sub'])} |")
    path = ml.MUSIC_DIR / "catalog.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{path.relative_to(ROOT)} を書いた")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("songs", nargs="*", help="曲の ID（music/songs/<ID>.py）")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--midi-only", action="store_true", help="MIDI とピアノロールだけ作る")
    ap.add_argument("--theme", action="append", default=[], help="core-theme を試聴用に書き出す")
    ap.add_argument("--catalog", action="store_true", help="music/catalog.md を作り直す")
    args = ap.parse_args()
    ids = sorted(p.stem for p in SONG_DIR.glob("*.py")) if args.all else args.songs
    for tid in args.theme:
        preview_theme(tid)
    for sid in ids:
        build(sid, args.midi_only)
    if args.catalog or ids:
        catalog()
    if not (ids or args.theme or args.catalog):
        ap.print_help()


if __name__ == "__main__":
    main()
