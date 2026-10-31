"""PixelLab のキャラクターの ZIP（rotations と歩行アニメーション）を、ゲーム用の 1 枚のスプライトシートにまとめる。

使い方: python3 scripts/pack_character.py <展開したフォルダ> <出力 PNG>
必要なもの: Pillow

シートの並び:
- 行: 下・左・右・上（src/data/sprites.ts の FACINGS と同じ順）
- 列: 0 = 立ち、1〜4 = 歩行（名前に walk を含むアニメーションのコマ）
- 1 コマの大きさは、立ち姿と歩行のうち大きいキャンバスに合わせる（今は 40 × 40）。
- 左右はコマの中央に置く。上下は、どの行も足元（行の中でいちばん下の不透明ピクセル）が同じ高さ（FOOT_Y）にそろうように置く。
  src/data/sprites.ts の CHAR_DISPLAY_ORIGIN.y は、この FOOT_Y をタイルの下端に合わせる値にしている。
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROWS = ["south", "west", "east", "north"]
WALK_FRAMES = 4
# 足元をそろえる高さ（コマの上端からのピクセル。40 × 40 のコマで、下に 6px の余白を残す）
FOOT_Y = 33


def fail(message: str) -> None:
    raise SystemExit(f"エラー: {message}")


def load(root: Path, rel: str) -> Image.Image:
    path = root / rel
    if not path.is_file():
        fail(f"画像がありません: {path}")
    return Image.open(path).convert("RGBA")


def main(src: str, out: str) -> None:
    root = Path(src)
    meta_path = root / "metadata.json"
    if not meta_path.is_file():
        fail(f"{meta_path} がありません（PixelLab の ZIP を展開したフォルダを指定してください）")
    meta = json.loads(meta_path.read_text())
    states = meta.get("states") or []
    if not states:
        fail("metadata.json に states がありません")
    frames = states[0].get("frames", {})
    rotations = frames.get("rotations", {})
    walks = [k for k in frames.get("animations", {}) if "walk" in k]
    if len(walks) != 1:
        fail(f"名前に walk を含むアニメーションがちょうど 1 つ必要です（見つかったもの: {walks}）")
    walk = frames["animations"][walks[0]]

    grid: list[list[Image.Image]] = []
    for d in ROWS:
        if d not in rotations:
            fail(f"{d} の立ち姿がありません")
        paths = walk.get(d)
        if paths is None or len(paths) != WALK_FRAMES:
            fail(f"{d} の歩行のコマ数が {0 if paths is None else len(paths)} です（{WALK_FRAMES} を想定）")
        grid.append([load(root, p) for p in [rotations[d], *paths]])

    w = max(im.width for row in grid for im in row)
    h = max(im.height for row in grid for im in row)
    if FOOT_Y >= h:
        fail(f"コマの高さ {h} が足元の高さ FOOT_Y = {FOOT_Y} に足りません")
    sheet = Image.new("RGBA", (w * (1 + WALK_FRAMES), h * len(ROWS)), (0, 0, 0, 0))
    for r, row in enumerate(grid):
        # 行の中では上下の位置関係（歩行の上下動）を保ったまま、行全体の足元を FOOT_Y にそろえる
        tops = [(h - im.height) // 2 for im in row]
        boxes = [im.getbbox() for im in row]
        bottoms = [t + b[3] for t, b in zip(tops, boxes) if b]
        if not bottoms:
            fail(f"{ROWS[r]} の行がすべて透明です")
        shift = FOOT_Y - max(bottoms)
        for c, (im, top, box) in enumerate(zip(row, tops, boxes)):
            if box is None:
                continue  # 透明なコマは置かない
            # コマからはみ出す分は切り落とす。透明な余白でなければ（絵が切れるなら）止める
            y = top + shift
            if y + box[1] < 0 or y + box[3] > h:
                fail(f"{ROWS[r]} の {c} 列目の絵が、足元をそろえるとコマからはみ出します")
            im = im.crop((0, max(0, -y), im.width, min(im.height, h - y)))
            sheet.alpha_composite(im, (c * w + (w - im.width) // 2, r * h + max(0, y)))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"{out}: {w}x{h} x {1 + WALK_FRAMES} cols x {len(ROWS)} rows")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
