"""PixelLab のキャラクターの ZIP（rotations と歩行アニメーション）を、ゲーム用の 1 枚のスプライトシートにまとめる。

使い方: python3 scripts/pack_character.py <展開したフォルダ> <出力 PNG>
必要なもの: Pillow

シートの並び（立ち姿と歩行でキャンバスの大きさが違うときは、大きいほうに合わせて中央に置く）:
- 行: 下・左・右・上（src/systems/gameState.ts の Facing の順）
- 列: 0 = 立ち、1〜4 = 歩行（walk アニメーションのコマ）
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROWS = ["south", "west", "east", "north"]
WALK_FRAMES = 4


def main(src: str, out: str) -> None:
    root = Path(src)
    meta = json.loads((root / "metadata.json").read_text())
    state = meta["states"][0]
    frames = state["frames"]
    walk = next(iter(frames["animations"].values()), None)
    if walk is None:
        raise SystemExit("歩行アニメーションがありません")
    grid: list[list[Image.Image]] = []
    for d in ROWS:
        paths = walk[d]
        if len(paths) != WALK_FRAMES:
            raise SystemExit(f"{d} の歩行のコマ数が {len(paths)} です（{WALK_FRAMES} を想定）")
        grid.append([Image.open(root / p).convert("RGBA") for p in [frames["rotations"][d], *paths]])
    w = max(im.width for row in grid for im in row)
    h = max(im.height for row in grid for im in row)
    sheet = Image.new("RGBA", (w * (1 + WALK_FRAMES), h * len(ROWS)), (0, 0, 0, 0))
    for r, row in enumerate(grid):
        for c, im in enumerate(row):
            sheet.alpha_composite(im, (c * w + (w - im.width) // 2, r * h + (h - im.height) // 2))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"{out}: {w}x{h} x {1 + WALK_FRAMES} cols x {len(ROWS)} rows")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
