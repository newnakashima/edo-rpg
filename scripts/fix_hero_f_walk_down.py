"""女主人公（hero_f）の下向きの歩行で、足が動くように描き直す。

PixelLab の歩行（v3）は、下向きだと合羽が揺れるだけで 4 コマとも足が同じ形だった（テストプレイで「足が動いておらず歩いているように
見えない」と指摘された）。AI に作り直させると人物の形が崩れたため、採用済みのコマの足だけを動かす。

使い方: python3 scripts/fix_hero_f_walk_down.py public/assets/chars/hero_f.png
  scripts/pack_character.py でシートを作り直したあとに 1 回だけ実行する（2 回目は、足がすでに動いているので止まる）。
必要なもの: Pillow

- 列 1: 左足（画面の左）を 1px 上げて裾に隠し、右足を 1px 前（下）に出す。列 3: その逆。列 2・4: 両足をそろえたまま
- 前に出した足と裾の間は、元の脚絆の行で埋める
"""
import sys

from PIL import Image

FRAME = 40
# 足（輪郭を含む）が見えているコマの中の範囲。x は左足・右足、y は裾のすぐ下からつま先まで
FEET = {"L": (15, 18), "R": (21, 24)}
TOP, BOT = 30, 32
PLAN = {1: {"L": -1, "R": 1}, 3: {"L": 1, "R": -1}}


def shoes(frame: Image.Image) -> list:
    """靴の 2 行と、その下の 1 行（脚絆の行はコマごとに少し違うので見ない）。"""
    return [frame.getpixel((x, y)) for x0, x1 in FEET.values() for x in range(x0, x1 + 1) for y in range(BOT - 1, BOT + 2)]


def move(frame: Image.Image, side: str, dy: int) -> None:
    x0, x1 = FEET[side]
    px = {(x, y): frame.getpixel((x, y)) for x in range(x0, x1 + 1) for y in range(TOP, BOT + 1)}
    for x, y in px:
        if not (dy > 0 and y == TOP):
            frame.putpixel((x, y), (0, 0, 0, 0))
    for (x, y), c in px.items():
        ny = y + dy
        # 上げた足は裾（TOP より上）に隠れる分を切る
        if c[3] and TOP <= ny <= BOT + 1:
            frame.putpixel((x, ny), c)


def main(path: str) -> None:
    sheet = Image.open(path).convert("RGBA")
    row = [sheet.crop((c * FRAME, 0, c * FRAME + FRAME, FRAME)) for c in range(5)]
    # 描き直さない列 2 と比べる（立ち姿の列 0 とは輪郭の黒がわずかに違う）
    if any(shoes(row[c]) != shoes(row[2]) for c in (1, 3, 4)):
        raise SystemExit("エラー: 下向きの歩行の 4 コマで足が同じではありません（すでに描き直したか、シートの形が変わっています）")
    for col, moves in PLAN.items():
        frame = row[col]
        for side, dy in moves.items():
            move(frame, side, dy)
        sheet.paste(frame, (col * FRAME, 0))
    sheet.save(path)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("使い方: python3 scripts/fix_hero_f_walk_down.py <hero_f のシート>")
    main(sys.argv[1])
