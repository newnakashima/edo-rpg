"""書き出した効果音（public/assets/audio/se/*.ogg）を読み戻して調べる。

  python3 scripts/sfx/check.py              # すべて
  python3 scripts/sfx/check.py se_ok se_cancel

調べること（どれも [注意] で知らせる。音の良し悪しは判定しない。聞いて決めるのはユーザー）:
  - docs/audio.md の表にある ID か、スクリプト（sfx/sounds/<ID>.py）と音がそろっているか
  - 長さが目安から外れていないか（目安の 1.5 倍まで、戦闘の音は 0.6 秒まで、短すぎるのは目安の半分まで）
  - 鳴り始めの遅れ（頭の無音が 10 ms を超える）、終わりの切れ目（最後の 3 ms がピークから -40 dB より大きい）
  - 音割れ（ピークが -0.3 dBFS を超える。Opus にすると少し上がることがある）
  - 大きさのそろい具合（スクリプトの level を差し引いて、全体の中央から 4 dB 以上ずれる）
最後に、表の効果音のうち、まだ作っていないものを優先ごとに数える。

検査そのものができなかったとき（音が読めない）は 1、[注意] があっても 0 で終える。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build as bd  # noqa: E402
import sfxcheck as chk  # noqa: E402


def level_of(se_id: str) -> float:
    """スクリプトの Sound(level=...) を読む（スクリプトは実行しない）。"""
    p = bd.SOUND_DIR / f"{se_id}.py"
    if not p.exists():
        return 0.0
    m = re.search(r"level\s*=\s*(-?[\d.]+)", p.read_text(encoding="utf-8"))
    return float(m.group(1)) if m else 0.0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ids", nargs="*")
    args = ap.parse_args()
    specs = chk.load_specs()
    oggs = {p.stem for p in bd.OUT_DIR.glob("se_*.ogg")}
    scripts = {p.stem for p in bd.SOUND_DIR.glob("se_*.py")}
    ids = args.ids or sorted(oggs | scripts)
    failed = False
    rows = []
    for se_id in ids:
        warn = []
        spec = specs.get(se_id)
        if spec is None:
            warn.append("docs/audio.md の表にない")
        if se_id not in scripts:
            warn.append("スクリプトがない（音だけある）")
        if se_id not in oggs:
            warn.append("まだ書き出していない（build.py で書き出す）")
            rows.append((se_id, None, None, None, warn))
            continue
        try:
            a = chk.decode(bd.OUT_DIR / f"{se_id}.ogg")
        except Exception as e:  # noqa: BLE001
            print(f"■ {se_id}: 読めない（{e}）")
            failed = True
            continue
        secs = len(a) / chk.RATE
        lufs = chk.loudness(a)
        peak = chk.peak_db(a)
        limit = chk.max_length(spec)
        if limit is not None and secs > limit:
            warn.append(f"長い（{secs:.2f} 秒、{limit:.2f} 秒まで）")
        if spec and spec.length and secs < spec.length * 0.5:
            warn.append(f"短い（{secs:.3f} 秒、目安 {spec.length:g} 秒）")
        hs = chk.head_silence(a)
        if hs > 0.01:
            warn.append(f"鳴り始めまで {hs * 1000:.0f} ms")
        tl = chk.tail_level(a)
        if tl is not None and tl > -40:
            warn.append(f"終わりが急に切れている（最後の 3 ms が {tl:.0f} dB）")
        if peak is not None and peak > -0.3:
            warn.append(f"音割れのおそれ（ピーク {peak:.1f} dBFS）")
        rows.append((se_id, secs, lufs, peak, warn))

    made = [r for r in rows if r[2] is not None]
    if made:
        mid = float(np.median([r[2] - level_of(r[0]) for r in made]))
        for r in made:
            off = r[2] - level_of(r[0]) - mid
            if abs(off) >= 4:
                r[4].append(f"ほかの音より {'大きい' if off > 0 else '小さい'}（level を除いて {off:+.1f} dB）")
    for se_id, secs, lufs, peak, warn in rows:
        spec = specs.get(se_id)
        tgt = f"目安 {spec.length:g} 秒" if spec and spec.length else "目安なし"
        if secs is None:
            print(f"■ {se_id}")
        else:
            lu = f"{lufs:.1f} LUFS" if lufs is not None else "無音"
            print(f"■ {se_id}  {secs:.3f} 秒（{tgt}）  {lu}  ピーク {peak:.1f} dBFS  level {level_of(se_id):+g}")
        for w in warn:
            print(f"  [注意] {w}")

    todo: dict[str, list[str]] = {}
    for s in specs.values():
        if s.id not in oggs:
            todo.setdefault(s.priority, []).append(s.id)
    done = sum(1 for s in specs if s in oggs)
    print(f"\n表の {len(specs)} 個のうち {done} 個を書き出した。")
    for pr in sorted(todo):
        print(f"  まだの優先 {pr}（{len(todo[pr])} 個）: {', '.join(todo[pr])}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
