"""曲の設計図（.song）を検査し、MIDI とピアノロールの画像に書き出す。

使い方:
  python3 scripts/bgm/song.py check <曲.song>            検査だけ（エラーがあれば終了コード 1）
  python3 scripts/bgm/song.py midi  <曲.song> [-o 出力.mid]  検査してエラーがなければ MIDI に書き出す
  python3 scripts/bgm/song.py roll  <曲.song> [-o 出力.png]  ピアノロールの画像を書き出す（Pillow が必要）
  python3 scripts/bgm/song.py patterns                     伴奏のパターンと楽器の一覧

書式は .claude/skills/bgm-composition/format.md を参照。
"""
import argparse
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from check import Checker, harmony_chart  # noqa: E402
from instruments import DRUM_TOKENS, INSTRUMENTS  # noqa: E402
from smf import TPQ, Track, write_smf  # noqa: E402
from songfile import PATTERNS, Song, SongError, parse_song  # noqa: E402
from theory import classify  # noqa: E402


def load(path: str) -> Song:
    try:
        return parse_song(Path(path))
    except SongError as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(2)


def report(song: Song, verbose: bool) -> int:
    issues = Checker(song).run()
    errors = [i for i in issues if i.level == "error"]
    warns = [i for i in issues if i.level == "warn"]
    infos = [i for i in issues if i.level == "info"]
    secs = float(song.length) * 60 / song.tempo
    loop_secs = float(song.length - song.loop_start) * 60 / song.tempo
    print(f"曲: {song.title}（{song.id}） 調: {song.key.describe()} テンポ: {song.tempo:g} 拍子: {song.meter[0]}/{song.meter[1]}")
    print(f"長さ: {len(song.bars)} 小節 / {secs:.1f} 秒" + (f"（ループ部分 {loop_secs:.1f} 秒）" if song.loop else "（ループしない）"))
    print("コード進行:")
    print(harmony_chart(song))
    print()
    for i in errors + warns + (infos if verbose else [i for i in infos if i.where == "曲全体"]):
        print(i.format())
    print()
    print(f"エラー {len(errors)} 件 / 警告 {len(warns)} 件 / 情報 {len(infos)} 件" + ("" if verbose else "（情報をすべて見るには -v）"))
    return len(errors)


def write_midi(song: Song, out: Path) -> None:
    def tick(t: Fraction) -> int:
        return round(t * TPQ)

    conductor = Track()
    conductor.text(0, 0x03, song.title or song.id)
    conductor.meta(0, 0x51, round(60_000_000 / song.tempo).to_bytes(3, "big"))
    n, d = song.meter
    conductor.meta(0, 0x58, bytes([n, d.bit_length() - 1, 24, 8]))
    conductor.text(0, 0x01, f"snes:echo={song.echo[0]},{song.echo[1]},{song.echo[2]}")
    if song.loop:
        conductor.text(tick(song.loop_start), 0x06, "loopStart")
        conductor.text(tick(song.length), 0x06, "loopEnd")
    else:
        conductor.text(tick(song.length), 0x06, "end")
    tracks = [conductor]
    ch = 0
    for pname, pd in song.parts.items():
        tr = Track()
        if pd.kind == "drums":
            channel = 9
            tr.text(0, 0x03, f"drums:{pname}")
        else:
            channel = ch
            ch += 1
            if ch == 9:
                ch += 1
            if channel > 15:
                raise SystemExit("パートが多すぎる（打楽器以外は 15 パートまで）")
            tr.text(0, 0x03, f"{pd.instrument}:{pname}")
            tr.msg(0, bytes([0xC0 | channel, INSTRUMENTS[pd.instrument][0]]), order=1)
        tr.msg(0, bytes([0xB0 | channel, 7, max(0, min(127, pd.vol))]), order=1)
        tr.msg(0, bytes([0xB0 | channel, 10, max(0, min(127, 64 + pd.pan))]), order=1)
        for e in song.events:
            if e.part != pname:
                continue
            on = tick(e.start)
            off = max(on + 1, tick(e.start + e.dur * Fraction(e.gate).limit_denominator(100)))
            tr.msg(on, bytes([0x90 | channel, e.pitch, max(1, min(127, e.vel))]), order=6)
            tr.msg(off, bytes([0x80 | channel, e.pitch, 0]), order=3)
        tracks.append(tr)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_smf(out, tracks)


def draw_roll(song: Song, out: Path) -> None:
    from PIL import Image, ImageDraw

    key = song.key
    pitched = [e for e in song.events if song.parts[e.part].kind != "drums"]
    if not pitched:
        raise SystemExit("音程のある音がない")
    lo = min(e.pitch for e in pitched) - 1
    hi = max(e.pitch for e in pitched) + 1
    px_beat, px_semi = 28, 7
    bars_per_row = 8
    bar_len = song.bar_len
    row_w = int(bars_per_row * bar_len * px_beat)
    head = 18
    row_h = (hi - lo + 1) * px_semi + head + 16
    nrows = -(-len(song.bars) // bars_per_row)
    left = 40
    img = Image.new("RGB", (row_w + left + 10, nrows * row_h + 10), (250, 250, 247))
    dr = ImageDraw.Draw(img)
    colors = {"CT": (40, 150, 60), "TN": (40, 110, 200), "AV": (220, 60, 50), "CHR": (200, 40, 160)}
    part_names = list(song.parts)

    def xy(t: Fraction, pitch: int):
        bar_i = int(t // bar_len)
        row = bar_i // bars_per_row
        x = left + float(t - row * bars_per_row * bar_len) * px_beat
        y = row * row_h + head + (hi - pitch) * px_semi
        return x, y

    for row in range(nrows):
        y0 = row * row_h + head
        for p in range(lo, hi + 1):
            if p % 12 == 0:
                dr.text((2, y0 + (hi - p) * px_semi - 4), f"C{p // 12 - 1}", fill=(120, 120, 120))
                dr.line([(left, y0 + (hi - p) * px_semi + px_semi), (left + row_w, y0 + (hi - p) * px_semi + px_semi)], fill=(225, 225, 220))
    # コードトーンの段を薄く塗る
    for cs in song.chords:
        if cs.chord is None:
            continue
        t = cs.start
        while t < cs.end:
            row_end = (int(t // (bars_per_row * bar_len)) + 1) * bars_per_row * bar_len
            seg_end = min(cs.end, row_end)
            x0, _ = xy(t, lo)
            x1 = x0 + float(seg_end - t) * px_beat
            for p in range(lo, hi + 1):
                if p % 12 in cs.chord.pcs:
                    _, y = xy(t, p)
                    dr.rectangle([x0, y, x1, y + px_semi - 1], fill=(250, 238, 200) if p % 12 != cs.chord.root else (245, 222, 170))
            _, ytop = xy(t, hi)
            dr.text((x0 + 2, ytop - head + 2), cs.chord.symbol, fill=(90, 60, 20))
            t = seg_end
    for b in song.bars:
        x, y = xy(b[0], hi)
        dr.line([(x, y - 4), (x, y + (hi - lo + 1) * px_semi)], fill=(160, 160, 160))
        if b[2] == 1:
            dr.text((x + 2, y + (hi - lo + 1) * px_semi + 2), f"[{b[1]}]", fill=(0, 0, 0))
    draw_order = {"harmony": 0, "bass": 1, "counter": 2, "melody": 3}
    for e in sorted(pitched, key=lambda e: draw_order.get(song.parts[e.part].role, 0)):
        pd = song.parts[e.part]
        x0, y = xy(e.start, e.pitch)
        x1 = x0 + max(2, float(e.dur) * px_beat - 1)
        if pd.kind != "notes" or pd.role in ("bass", "harmony"):
            fill = (175, 175, 175) if pd.role != "bass" else (90, 90, 90)
        else:
            cs = next((c for c in song.chords if c.start <= e.start < c.end), None)
            kind = classify(e.pitch % 12, cs.chord, key).kind if cs and cs.chord else "CT"
            fill = colors[kind]
            if pd.role == "counter":
                fill = tuple(int(c * 0.6 + 255 * 0.4) for c in fill)
        dr.rectangle([x0, y + 1, x1, y + px_semi - 1], fill=fill, outline=(30, 30, 30) if pd.role == "melody" else None)
    # 日本語のフォントがない環境もあるので、凡例は英語で書く
    legend = "green=chord tone  blue=tension  red=avoid  purple=out of key  grey=accompaniment  dark=bass  outlined=melody  pale=counter"
    dr.text((left, img.height - 12), legend, fill=(0, 0, 0))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(f"ピアノロール: {out}（パート: {', '.join(part_names)}）")


def main():
    ap = argparse.ArgumentParser(description="曲の設計図を検査して MIDI に書き出す")
    ap.add_argument("command", choices=["check", "midi", "roll", "patterns"])
    ap.add_argument("song", nargs="?")
    ap.add_argument("-o", "--output")
    ap.add_argument("-v", "--verbose", action="store_true", help="情報（倚音の解決など）もすべて表示する")
    ap.add_argument("--force", action="store_true", help="エラーがあっても MIDI を書き出す（試しに聞く時だけ）")
    args = ap.parse_args()
    if args.command == "patterns":
        print("伴奏のパターン:")
        for k, v in PATTERNS.items():
            print(f"  {k:16} {v}")
        print("楽器:")
        for k, (gm, lo, hi, label, desc) in INSTRUMENTS.items():
            from theory import pitch_name
            print(f"  {k:11} {label:5} {pitch_name(lo)}〜{pitch_name(hi)}  {desc}")
        print("打楽器の記号（大文字 = 強く、小文字 = 弱く）:")
        for k, (_n, _s, label) in DRUM_TOKENS.items():
            print(f"  {k} {label}")
        return
    if not args.song:
        ap.error("曲のファイルを指定する")
    song = load(args.song)
    if args.command == "check":
        sys.exit(1 if report(song, args.verbose) else 0)
    if args.command == "midi":
        n = report(song, args.verbose)
        if n and not args.force:
            print("エラーがあるので MIDI は書き出さない", file=sys.stderr)
            sys.exit(1)
        out = Path(args.output) if args.output else Path(args.song).with_suffix(".mid")
        write_midi(song, out)
        print(f"MIDI: {out}")
    if args.command == "roll":
        out = Path(args.output) if args.output else Path(args.song).with_suffix(".png")
        draw_roll(song, out)


if __name__ == "__main__":
    main()
