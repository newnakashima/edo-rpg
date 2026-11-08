# 施設の看板（16 × 16）を手で描く。使い方: python3 scripts/draw_signs.py <出力のフォルダ>（public/assets/signs）
# 板の色と 1 字の漢字で施設を見分ける（src/data/signs.ts の SIGN_KINDS と同じ並び・同じ字）。
# 字は IPA ゴシック（fonts-ipafont-gothic）の 12px を、ぼかさずに 1 ビットで描く（16px の板に収まり、2〜3 倍に拡大して読める大きさ）。
import os
import sys

from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
OUTLINE = (28, 18, 12, 255)
SHADOW = (0, 0, 0, 90)
WOOD = (214, 176, 112)
DARK = (34, 24, 18)
WHITE = (244, 236, 214)
GOLD = (236, 196, 84)
# 種類: (字, 板の色, 字の色)
SIGNS = {
    'yado': ('宿', (44, 58, 104), WHITE),  # 旅籠: 藍の板に白
    'chaya': ('茶', (172, 46, 40), WHITE),  # 茶屋: 緋毛氈の赤に白
    'yorozu': ('万', WOOD, DARK),  # よろず屋（万屋）: 白木に墨。「萬」は 12px でつぶれて読めなかった
    'kaji': ('刀', (40, 36, 36), WHITE),  # 刀鍛冶: 黒の板に白
    'hikyaku': ('飛', WOOD, (176, 30, 30)),  # 飛脚屋: 白木に朱
    'tera': ('寺', (74, 46, 28), GOLD),  # 寺: 焦げ茶の額に金
    'yashiro': ('社', (74, 46, 28), GOLD),  # 神社: 焦げ茶の額に金
    'shokan': ('商', (52, 92, 70), WHITE),  # 出島の商館: 緑の板に白
    'kinpaku': ('金', GOLD, DARK),  # 金箔屋: 金の板に墨
    'renkon': ('蓮', WOOD, DARK),  # 辛子蓮根の店: 白木に墨
    'yuya': ('ゆ', (38, 108, 122), WHITE),  # 湯屋: 浅葱の暖簾に白の「ゆ」（江戸の湯屋の印）。「湯」は 12px でつぶれた
    'tobaku': ('賭', (40, 36, 36), (220, 60, 50)),  # 賭場: 黒の板に赤
    'izakaya': ('酒', (120, 74, 36), WHITE),  # 居酒屋: 杉玉の茶に白
    'gyoro': ('楼', (150, 32, 48), GOLD),  # 妓楼: 紅殻の赤に金
    'oyabun': ('親', (72, 40, 88), WHITE),  # 親分の屋敷: 江戸紫の提灯の色に白
}


def lighter(c, d):
    return tuple(min(255, v + d) for v in c) + (255,)


def draw(glyph, board, ink):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = im.load()
    # 板は x 1〜14・y 0〜14。外側 1px の輪郭、上と左の内側 1px は明るく、下と右の内側 1px は暗く
    for y in range(0, 15):
        for x in range(1, 15):
            edge = x in (1, 14) or y in (0, 14)
            if edge:
                px[x, y] = OUTLINE
            elif y == 1 or x == 2:
                px[x, y] = lighter(board, 36)
            elif y == 13 or x == 13:
                px[x, y] = lighter(board, -28)
            else:
                px[x, y] = board + (255,)
    # 右と下の影（壁に掛けた板の影）
    for x in range(2, 16):
        px[x, 15] = SHADOW
    for y in range(1, 15):
        px[15, y] = SHADOW
    # 字（12px、1 ビット）
    mask = Image.new('1', (16, 16), 0)
    d = ImageDraw.Draw(mask)
    d.fontmode = '1'
    d.text((8, 7), glyph, font=ImageFont.truetype(FONT, 12), fill=1, anchor='mm')
    m = mask.load()
    for y in range(1, 14):
        for x in range(2, 14):
            if m[x, y]:
                px[x, y] = ink + (255,)
    return im


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for kind, (glyph, board, ink) in SIGNS.items():
        draw(glyph, board, ink).save(os.path.join(out, f'{kind}.png'))


if __name__ == '__main__':
    main()
