"""建物などの 1 枚の絵を 16 px ごとに切り、辺の自動タイル（edge）の 4 × 4 枚のシートを作る。

使い方:
  python3 scripts/mapkit/slice_parts.py <絵.png> <出力.png> --cols L,M,R --rows T,M,B [--preview <確認用.png>]

--cols は 9 分割の左・中・右の列、--rows は上・中・下の行の、それぞれ左上のピクセル座標（各 16 px を切り出す）。
生成した絵は屋根と壁の境目が 16 px の格子にそろわないことが多いので、マス単位でなくピクセルで選ぶ。
例: 64 × 48 の家で屋根が y = 0〜23 なら、屋根は --rows 0,4,8（上は棟、下は軒先で終わる 16 px）。
壁が 1 段だけなら、上・中・下に同じ行を指定する（--rows 28,28,28）。中の列と行は、並べて継ぎ目が出ない所を選ぶ。
上下左右のつながり（N=1, E=2, S=4, W=8）ごとに、4 つの 8 × 8 の四分の一を 9 分割から選んで 16 枚を組む。
出力は src/data/mapParts.ts の edge が読む並び（マスク m を (m % 4, m // 4) に置く）。
"""
import argparse

from PIL import Image

T = 16
H = T // 2


def slices(img: Image.Image, cols, rows):
    cx = dict(zip('LMR', cols))
    ry = dict(zip('TMB', rows))
    return {(r, c): img.crop((cx[c], ry[r], cx[c] + T, ry[r] + T)) for r in ry for c in cx}


def compose(s, n: bool, e: bool, so: bool, w: bool) -> Image.Image:
    out = Image.new('RGBA', (T, T))
    # 四分の一ごとに、そのそばの 2 辺がつながっているかで 9 分割のどれから取るかを決める
    quarters = [
        ((0, 0), 'M' if n else 'T', 'M' if w else 'L'),
        ((H, 0), 'M' if n else 'T', 'M' if e else 'R'),
        ((0, H), 'M' if so else 'B', 'M' if w else 'L'),
        ((H, H), 'M' if so else 'B', 'M' if e else 'R'),
    ]
    for (qx, qy), r, c in quarters:
        out.paste(s[(r, c)].crop((qx, qy, qx + H, qy + H)), (qx, qy))
    return out


def build(img: Image.Image, cols, rows) -> Image.Image:
    s = slices(img, cols, rows)
    sheet = Image.new('RGBA', (T * 4, T * 4))
    for m in range(16):
        tile = compose(s, bool(m & 1), bool(m & 2), bool(m & 4), bool(m & 8))
        sheet.paste(tile, ((m % 4) * T, (m // 4) * T))
    return sheet


def preview(sheet: Image.Image, pattern, scale: int = 4) -> Image.Image:
    h, w = len(pattern), len(pattern[0])
    img = Image.new('RGBA', (w * T, h * T), (60, 60, 60, 255))
    on = lambda x, y: 0 <= y < h and 0 <= x < w and pattern[y][x] == '1'
    for y in range(h):
        for x in range(w):
            if not on(x, y):
                continue
            m = on(x, y - 1) * 1 + on(x + 1, y) * 2 + on(x, y + 1) * 4 + on(x - 1, y) * 8
            t = sheet.crop(((m % 4) * T, (m // 4) * T, (m % 4 + 1) * T, (m // 4 + 1) * T))
            img.paste(t, (x * T, y * T), t)
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('image')
    p.add_argument('out')
    p.add_argument('--cols', required=True, help='左・中・右の列の x（ピクセル）')
    p.add_argument('--rows', required=True, help='上・中・下の行の y（ピクセル）')
    p.add_argument('--preview')
    p.add_argument('--pattern', default='0000000000,0111101110,0111101110,0000000000,0111111100,0111111100,0111111100,0000000000',
                   help='確認用の並び（1 = この部品のマス。カンマで行を区切る）')
    a = p.parse_args()
    src = Image.open(a.image).convert('RGBA')
    ints = lambda v: [int(n) for n in v.split(',')]
    cols, rows = ints(a.cols), ints(a.rows)
    if len(cols) != 3 or len(rows) != 3:
        p.error('--cols と --rows は 3 つずつ（左・中・右、上・中・下）')
    if any(c < 0 or c + T > src.width for c in cols) or any(r < 0 or r + T > src.height for r in rows):
        p.error(f'切り出す 16 px が絵（{src.width} × {src.height}）からはみ出す')
    sheet = build(src, cols, rows)
    sheet.save(a.out)
    if a.preview:
        preview(sheet, a.pattern.split(',')).save(a.preview)
