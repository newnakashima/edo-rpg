"""書き出した曲の MIDI を読み、調と和音のずれを探す。

  python3 scripts/music/check.py bgm_sad        # 1 曲
  python3 scripts/music/check.py --all          # music/midi/ のすべての曲

次の 2 つを、警告（Warning）として挙げる。誤りの判定ではない。

- 挙がった箇所は「聞いて濁るかもしれない場所」の手がかりで、必ず直すものではない。
- 意図した不協和音（からくりの主題の半音の動き、妖しさや緊張を出すためのぶつかりなど）なら、そのまま残してよい。
- 直すのは、意図していないずれ（短調の和音に長調の主題が乗る、違う調の主題を重ねる、など）だけである。
- 警告が何件あっても、終了コードは 0 で、書き出しも止めない。
  検査そのものができなかったとき（MIDI や記録がない・読めない）だけ、残りの曲を調べたうえで 1 で終える。
  引数の誤り（曲の ID も --all もない、両方ある）は 2 で終える。

1. 半音のぶつかり: 主旋律・副旋律（role が main・sub）の 1 拍以上の音が、ほかのトラック（副旋律どうしも含む）の音と
   半音でこすれながら 1 拍以上重なる箇所。オクターブ離れていても数える（短 9 度・長 7 度など）。
   主旋律と副旋律どうしのぶつかりは 1 件に数える。和音が旋律の音と合っていないときに出る。
2. 音階に収まらない小節: 小節の中で鳴る 8 分音符以上の音（打楽器を除く。前の小節から続く音も含む）が、
   1 つの長音階・自然短音階・和声短音階に収まらない小節。違う調の主題や、半音ずらした断片を同じ低音の上に
   重ねたときに出る。旋律的短音階の上行や旋法の音、半音の経過音を使った小節にも出ることがある。

打楽器（打楽器のトラックと、和太鼓・拍子木・ティンパニなど音程のある打楽器の音色）は数えない。
"""

from __future__ import annotations

import argparse
import json
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import musiclib as ml  # noqa: E402
from pianoroll import _notes  # noqa: E402

NAMES = "C C# D D# E F F# G G# A A# B".split()
# 音程のある打楽器の音色（General MIDI の 0 始まりの番号）: ティンパニと 112〜119
PERCUSSIVE = {47, *range(112, 120)}
SCALES = [
    {(root + s) % 12 for s in steps}
    for root in range(12)
    for steps in ((0, 2, 4, 5, 7, 9, 11), (0, 2, 3, 5, 7, 8, 10), (0, 2, 3, 5, 7, 8, 11))
]


def name_of(pitch: int) -> str:
    return f"{NAMES[pitch % 12]}{pitch // 12 - 1}"


def check(song_id: str, min_beats: float = 1.0) -> None:
    """1 曲を調べて警告を表示する。読めないときは例外を出す（呼び出し側がまとめて扱う）。"""
    mid = ml.mido.MidiFile(ml.MIDI_DIR / f"{song_id}.mid", charset="utf-8")
    meta = json.loads((ml.MIDI_DIR / f"{song_id}.json").read_text(encoding="utf-8"))
    bar_beats = ml.meter_beats(meta["meter"])
    min_len = Fraction(min_beats).limit_denominator(64)

    # MIDI のトラックと記録（JSON）のトラックを名前で対応づける。対応しないトラックは調べられないので知らせる
    names = [t.name for t in mid.tracks]
    tracks = {t["name"]: t for t in meta["tracks"]}
    dup = sorted({n for n in names if n and names.count(n) > 1})
    if dup:
        print(f"  [注意] 同じ名前のトラックがあり、区別できません: {', '.join(dup)}（名前を変えると正しく調べられます）")
    notes = []  # (トラック名, 始まり, 終わり, 音の高さ)。拍で表す
    skipped = set()
    for ti, start, end, pitch, _vel, drum in _notes(mid):
        name = names[ti]
        if drum:
            continue
        if name not in tracks:
            skipped.add(name)
            continue
        if tracks[name]["drum"] or tracks[name]["program"] in PERCUSSIVE:
            continue
        notes.append((name, Fraction(start).limit_denominator(960), Fraction(end).limit_denominator(960), pitch))
    if skipped:
        print(f"  [注意] 記録（{song_id}.json）にないトラックは調べていません: {', '.join(sorted(skipped))}")

    def where(beat: Fraction) -> str:
        return f"{float(beat / bar_beats) + 1:.2f} 小節"

    # 1. 半音のぶつかり
    melodic = [n for n in notes if tracks[n[0]]["role"] in ("main", "sub") and n[2] - n[1] >= min_len]
    seen = set()
    clashes = []
    for name, start, end, pitch in melodic:
        for other, s2, e2, p2 in notes:
            if other == name or (pitch - p2) % 12 not in (1, 11):
                continue
            overlap = min(end, e2) - max(start, s2)
            if overlap < min_len:
                continue
            key = frozenset([(name, start, pitch), (other, s2, p2)])
            if key in seen:  # 主旋律と副旋律どうしは、向きを変えて 2 度数えない
                continue
            seen.add(key)
            at = max(start, s2)
            clashes.append((at, f"  [警告] {where(at)}  {name} {name_of(pitch)}  と  {other} {name_of(p2)}"))
    for _, line in sorted(clashes):
        print(line)
    print(f"  半音のぶつかり（警告）: {len(clashes)} 件")

    # 2. 音階に収まらない小節（小節をまたぐ音は、またぐ小節ごとに数える）
    bars: dict[int, set[int]] = {}
    for _name, start, end, pitch in notes:
        if end - start < Fraction(1, 2):
            continue
        first = int(start // bar_beats)
        last = int((end - Fraction(1, 960)) // bar_beats)
        for b in range(first, last + 1):
            bars.setdefault(b + 1, set()).add(pitch % 12)
    outside = [b for b in sorted(bars) if not any(bars[b] <= sc for sc in SCALES)]
    for b in outside:
        print(f"  [警告] {b} 小節: {' '.join(NAMES[p] for p in sorted(bars[b]))}")
    print(f"  音階に収まらない小節（警告）: {len(outside)}（音のある小節 {len(bars)} のうち）")
    if clashes or outside:
        print("  警告は濁るかもしれない場所の手がかりです。意図した不協和音なら残してかまいません。")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("songs", nargs="*", help="曲の ID（music/midi/<ID>.mid）")
    ap.add_argument("--all", action="store_true", help="music/midi/ のすべての曲（曲の ID と一緒には使えない）")
    ap.add_argument("--min-beats", type=float, default=1.0,
                    help="半音のぶつかりを数える、旋律の音の長さと重なりの長さ（拍、既定 1）")
    args = ap.parse_args()
    if args.all and args.songs:
        ap.error("--all と曲の ID は一緒に使えません")
    ids = sorted(p.stem for p in ml.MIDI_DIR.glob("*.mid")) if args.all else args.songs
    if not ids:
        ap.error("曲の ID か --all を指定してください")
    failed = []
    for sid in ids:
        print(f"■ {sid}")
        if not (ml.MIDI_DIR / f"{sid}.mid").exists():
            print(f"  [検査できません] MIDI がありません。先に python3 scripts/music/build.py {sid} で書き出してください")
            failed.append(sid)
            continue
        try:
            check(sid, args.min_beats)
        except Exception as e:  # noqa: BLE001  壊れた MIDI・記録の欠けなど。ほかの曲は続けて調べる
            print(f"  [検査できません] {sid} を読めません（{type(e).__name__}: {e}）。build.py で書き出し直してください")
            failed.append(sid)
    if failed:
        sys.stdout.flush()
        sys.exit(f"検査できなかった曲: {', '.join(failed)}")


if __name__ == "__main__":
    main()
