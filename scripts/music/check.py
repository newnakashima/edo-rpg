"""書き出した曲の MIDI を読み、調と和音のずれを探す。

  python3 scripts/music/check.py bgm_sad        # 1 曲
  python3 scripts/music/check.py --all          # music/midi/ のすべての曲

次の 2 つを、警告（Warning）として挙げる。誤りの判定ではない。

- 挙がった箇所は「聞いて濁るかもしれない場所」の手がかりで、必ず直すものではない。
- 意図した不協和音（からくりの主題の半音の動き、妖しさや緊張を出すためのぶつかりなど）なら、そのまま残してよい。
- 直すのは、意図していないずれ（短調の和音に長調の主題が乗る、違う調の主題を重ねる、など）だけである。
- 警告が何件あっても、終了コードは 0 で、書き出しも止めない。

1. 半音のぶつかり: 主旋律・副旋律（role が main・sub）の 1 拍以上の音が、同時に鳴っている別のトラックの音と
   半音（または長 7 度）離れている箇所。和音が旋律の音と合っていないときに出る。
2. 音階に収まらない小節: 小節の中で鳴る 8 分音符以上の音（打楽器を除く）が、1 つの長音階・自然短音階・
   和声短音階に収まらない小節。違う調の主題や、半音ずらした断片を同じ低音の上に重ねたときに出る。

打楽器（打楽器のトラックと、和太鼓・拍子木・ティンパニなど音程のある打楽器の音色）は数えない。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import mido

ROOT = Path(__file__).resolve().parents[2]
MIDI_DIR = ROOT / "music" / "midi"
NAMES = "C C# D D# E F F# G G# A A# B".split()
# 音程のある打楽器の音色（General MIDI の 0 始まりの番号）: ティンパニと 112〜119
PERCUSSIVE = {47, *range(112, 120)}
SCALES = [
    (f"{NAMES[root]}{kind}", {(root + s) % 12 for s in steps})
    for root in range(12)
    for kind, steps in (("長調", (0, 2, 4, 5, 7, 9, 11)),
                        ("短調", (0, 2, 3, 5, 7, 8, 10)),
                        ("和声短音階", (0, 2, 3, 5, 7, 8, 11)))
]


def name_of(pitch: int) -> str:
    return f"{NAMES[pitch % 12]}{pitch // 12 - 1}"


def track_name(raw: str) -> str:
    # mido はトラック名を latin-1 として読むので、UTF-8 に直す
    try:
        return raw.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return raw


def read_notes(mid: mido.MidiFile) -> dict[str, list[tuple[int, int, int]]]:
    """トラック名 → [(始まりの tick, 終わりの tick, 音の高さ)]。打楽器のチャンネルは除く。"""
    out: dict[str, list[tuple[int, int, int]]] = {}
    for t in mid.tracks:
        name = track_name(t.name)
        tick = 0
        on: dict[int, int] = {}
        for m in t:
            tick += m.time
            if m.type == "note_on" and m.velocity > 0 and m.channel != 9:
                on[m.note] = tick
            elif m.type in ("note_off", "note_on") and m.note in on:
                out.setdefault(name, []).append((on.pop(m.note), tick, m.note))
    return out


def check(song_id: str, min_beats: float = 1.0) -> int:
    mid = mido.MidiFile(MIDI_DIR / f"{song_id}.mid")
    meta = json.loads((MIDI_DIR / f"{song_id}.json").read_text(encoding="utf-8"))
    tracks = {t["name"]: t for t in meta["tracks"]}
    tpb = mid.ticks_per_beat
    bar_ticks = tpb * 4  # 小節の長さは 4/4 以外でも 4 拍区切りで数える（拍子が違う曲は目安として読む）
    if meta.get("meter"):
        num, den = (int(x) for x in meta["meter"].split("/"))
        bar_ticks = tpb * num * 4 // den
    notes = read_notes(mid)
    pitched = {n: v for n, v in notes.items()
               if n in tracks and not tracks[n]["drum"] and tracks[n]["program"] not in PERCUSSIVE}

    def where(tick: int) -> str:
        return f"{tick / bar_ticks + 1:.2f} 小節"

    print(f"■ {song_id}")
    # 1. 半音のぶつかり
    clashes = []
    for name, ns in pitched.items():
        if tracks[name]["role"] not in ("main", "sub"):
            continue
        for start, end, pitch in ns:
            if end - start < tpb * min_beats:
                continue
            mid_tick = (start + end) // 2
            for other, ons in pitched.items():
                if other == name:
                    continue
                for s2, e2, p2 in ons:
                    if s2 <= mid_tick < e2 and (pitch - p2) % 12 in (1, 11):
                        clashes.append((start, f"  [警告] {where(start)}  {name} {name_of(pitch)}  と  {other} {name_of(p2)}"))
    for _, line in sorted(clashes):
        print(line)
    print(f"  半音のぶつかり（警告）: {len(clashes)} 件")

    # 2. 音階に収まらない小節
    bars: dict[int, set[int]] = {}
    for ns in pitched.values():
        for start, end, pitch in ns:
            if end - start >= tpb // 2:
                bars.setdefault(start // bar_ticks + 1, set()).add(pitch % 12)
    outside = [b for b in sorted(bars) if not any(bars[b] <= sc for _, sc in SCALES)]
    for b in outside:
        print(f"  [警告] {b} 小節: {' '.join(NAMES[p] for p in sorted(bars[b]))}")
    print(f"  音階に収まらない小節（警告）: {len(outside)} / {len(bars)}")
    if clashes or outside:
        print("  警告は濁るかもしれない場所の手がかりです。意図した不協和音なら残してかまいません。")
    return len(clashes) + len(outside)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("songs", nargs="*", help="曲の ID（music/midi/<ID>.mid）")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--min-beats", type=float, default=1.0, help="半音のぶつかりを数える旋律の音の長さ（拍、既定 1）")
    args = ap.parse_args()
    ids = sorted(p.stem for p in MIDI_DIR.glob("*.mid")) if args.all else args.songs
    if not ids:
        ap.error("曲の ID か --all を指定してください")
    for sid in ids:
        if not (MIDI_DIR / f"{sid}.mid").exists():
            sys.exit(f"{sid} の MIDI がありません。先に python3 scripts/music/build.py {sid} で書き出してください")
        check(sid, args.min_beats)


if __name__ == "__main__":
    main()
