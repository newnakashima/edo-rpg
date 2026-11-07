"""PixelLab の Wang タイルセット（create_topdown_tileset）を、ゲームが読む並びの 4 × 4 のシートに並べ替える。

使い方:
  python3 scripts/mapkit/wang_sheet.py <タイルセットID> <出力PNG> [--preview <確認用PNG>] [--keep-lower]

出力のシートは、マスク m = NW*8 + NE*4 + SW*2 + SE*1（その角が upper の地形なら 1）の
タイルを (m % 4, m // 4) の位置に置く。src/data/mapParts.ts の dual（角の自動タイル）がこの並びを読む。

lower の地形の部分は透明にする（ゲームではマスの地面の上に重ねるため、隣が道でも草でもつながる）。
透明にするのは、lower の角の側からつながっている lower の地形のピクセル（cutout を参照）。境目の影や縁取りは残る。
--keep-lower を付けると透明にしない（確かめる用）。
--preview を付けると、テスト用の模様に並べて 4 倍に拡大した画像も書き出す（目で継ぎ目を確かめる用）。
"""
import argparse
import io
import json
import sys
import urllib.error
import urllib.request

from PIL import Image

API = 'https://api.pixellab.ai/mcp/tilesets'
BIT = {'NW': 8, 'NE': 4, 'SW': 2, 'SE': 1}


def fetch(url: str) -> bytes:
    try:
        with urllib.request.urlopen(url) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 423:
            sys.exit('まだ生成中（423）。mcp__PixelLab__wait_for_jobs で待ってからやり直す')
        raise


def cutout(tile: Image.Image, lower: Image.Image, upper: Image.Image, mask: int) -> Image.Image:
    """lower の角の側から、lower の地形のピクセルをたどって透明にする。

    lower の地形のピクセルとは、lower のタイルと同じ位置・同じ色のもの、または lower のタイルにだけ使われている色のもの
    （pro は境目のそばの lower を描き直すので、位置だけで比べると地面の点が縁に残るため）。
    影など、どちらのタイルにもない色は残す。
    """
    size = tile.width
    px, lo = tile.load(), lower.load()
    lower_only = set(lower.getdata()) - set(upper.getdata())
    is_lower = lambda x, y: px[x, y] == lo[x, y] or px[x, y] in lower_only
    half = size // 2
    corners = {8: (0, 0), 4: (half, 0), 2: (0, half), 1: (half, half)}
    stack = []
    for bit, (cx, cy) in corners.items():
        if not mask & bit:
            stack += [(x, y) for y in range(cy, cy + half) for x in range(cx, cx + half)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < size and 0 <= y < size) or not is_lower(x, y):
            continue
        seen.add((x, y))
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    out = tile.copy()
    op = out.load()
    for x, y in seen:
        op[x, y] = (0, 0, 0, 0)
    return out


def build(tileset_id: str, keep_lower: bool = False) -> Image.Image:
    meta = json.loads(fetch(f'{API}/{tileset_id}/metadata'))
    sheet = Image.open(io.BytesIO(fetch(f'{API}/{tileset_id}/image?inline=true'))).convert('RGBA')
    size = meta['tile_size']['width']
    out = Image.new('RGBA', (size * 4, size * 4))
    seen = set()
    for tile in meta['tileset_data']['tiles']:
        corners = tile['corners']
        if any(v not in ('upper', 'lower') for v in corners.values()):
            continue  # transition の角を持つタイル（transition_size > 0 の 25 枚の組）は使わない
        mask = sum(BIT[k] for k, v in corners.items() if v == 'upper')
        if mask in seen:
            continue
        seen.add(mask)
        b = tile['bounding_box']
        piece = sheet.crop((b['x'], b['y'], b['x'] + b['width'], b['y'] + b['height']))
        out.paste(piece, ((mask % 4) * size, (mask // 4) * size))
    missing = sorted(set(range(16)) - seen)
    if missing:
        sys.exit(f'角の組み合わせが足りない: {missing}（transition_size は 0 で作る）')
    if keep_lower:
        return out
    tile = lambda m: out.crop(((m % 4) * size, (m // 4) * size, (m % 4 + 1) * size, (m // 4 + 1) * size))
    lower, upper = tile(0), tile(15)
    cut = Image.new('RGBA', out.size)
    for m in range(1, 16):
        cut.paste(cutout(tile(m), lower, upper, m), ((m % 4) * size, (m // 4) * size))
    return cut


# 確認用の模様（1 = upper）。島・細い帯・入り江・斜めの角を含む
PATTERN = [
    '000000000000',
    '011110000110',
    '011111001110',
    '011111001100',
    '001100000000',
    '000000111110',
    '011000100010',
    '011000111110',
    '000000000000',
]


def preview(sheet: Image.Image, scale: int = 4, background=(200, 60, 200, 255)) -> Image.Image:
    """テスト用の模様に並べる。透明な部分は目立つ色（既定は赤紫）で塗り、抜けすぎ・残りすぎを見つけやすくする。"""
    size = sheet.width // 4
    h, w = len(PATTERN), len(PATTERN[0])
    # 角の自動タイル（dual grid）: 表示のタイルはマスの境目に半マスずらして置き、その 4 隅は 4 つのマス
    img = Image.new('RGBA', ((w - 1) * size, (h - 1) * size), background)
    cell = lambda x, y: PATTERN[y][x] == '1'
    for y in range(h - 1):
        for x in range(w - 1):
            m = cell(x, y) * 8 + cell(x + 1, y) * 4 + cell(x, y + 1) * 2 + cell(x + 1, y + 1)
            t = sheet.crop(((m % 4) * size, (m // 4) * size, (m % 4 + 1) * size, (m // 4 + 1) * size))
            img.paste(t, (x * size, y * size), t)
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('tileset_id')
    p.add_argument('out')
    p.add_argument('--preview')
    p.add_argument('--keep-lower', action='store_true')
    a = p.parse_args()
    s = build(a.tileset_id, a.keep_lower)
    s.save(a.out)
    if a.preview:
        preview(s).save(a.preview)
