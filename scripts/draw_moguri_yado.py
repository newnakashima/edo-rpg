# もぐりの旅籠（ワールドマップの街道沿いの小屋）の画像を手で描く。使い方: python3 scripts/draw_moguri_yado.py <出力の PNG>
# 16 × 16 の 1 コマ。町の印（白い城）と同じ大きさで、傾いた藁屋根の古い小屋と、戸口の脇の赤い提灯で見分ける。
import sys

from PIL import Image

P = {
    '.': (0, 0, 0, 0),
    'K': (24, 16, 12, 255),  # 輪郭
    'T': (176, 142, 84, 255),  # 藁屋根（明）
    't': (128, 96, 54, 255),  # 藁屋根（暗）
    'W': (110, 78, 50, 255),  # 板壁（明）
    'w': (78, 54, 34, 255),  # 板壁（暗）
    'D': (34, 22, 16, 255),  # 戸口の暗がり
    'R': (206, 58, 40, 255),  # 赤い提灯
    'r': (130, 30, 24, 255),  # 提灯の影
    'Y': (250, 214, 120, 255),  # 提灯の灯り
    'S': (0, 0, 0, 90),  # 影
}
HUT = [
    "................",
    "......KK........",
    "....KKTtKK......",
    "...KTtTtTtKKK...",
    "..KTtTtTtTtTtK..",
    ".KTtTtTtTtTtTtK.",
    "KtTtTtTtTtTtTtTK",
    "KKKKKKKKKKKKKKKK",
    ".KwWwKKKKwWwWwK.",
    ".KWwKDDDDKwWwWK.",
    "KRKwKDDDDKWwWwK.",
    "KYKWKDDDDKwWwWK.",
    "KrKwKDDDDKWwWwK.",
    ".KKKKKKKKKKKKKK.",
    "..SSSSSSSSSSSS..",
    "................",
]


def main(out: str) -> None:
    im = Image.new('RGBA', (16, 16))
    for y, row in enumerate(HUT):
        assert len(row) == 16, (y, row)
        for x, c in enumerate(row):
            im.putpixel((x, y), P[c])
    im.save(out)


if __name__ == '__main__':
    main(sys.argv[1])
