# 葛籠（宝箱）の画像を手で描く。使い方: python3 scripts/draw_tsuzura.py <出力の PNG>
# 列 0 が閉じた姿、列 1 が開いた姿（16 × 16 を横に 2 つ）。
import sys

from PIL import Image
P={'.':(0,0,0,0),'K':(24,16,12,255),'L':(226,184,116,255),'M':(190,136,76,255),'D':(130,84,44,255),'E':(88,54,30,255),'R':(176,52,42,255),'r':(112,32,28,255),'I':(46,30,22,255),'S':(0,0,0,90)}
closed=[
"................",
"................",
"..KKKKKKKKKKKK..",
".KLMLMLRRLMLMLK.",
".KMLMLMRRMLMLMK.",
".KLMLMLRRLMLMLK.",
".KMLMLMRRMLMLMK.",
".KKKKKKKKKKKKKK.",
".KDEDEDRrDEDEDK.",
".KEDEDErREDEDEK.",
".KDEDEDRrDEDEDK.",
".KEDEDErREDEDEK.",
".KDEDEDRrDEDEDK.",
".KKKKKKKKKKKKKK.",
"..SSSSSSSSSSSS..",
"................",
]
opened=[
"..KKKKKKKKKKKK..",
".KMLMLMLMLMLMLK.",
".KLMLMLMLMLMLMK.",
".KKKKKKKKKKKKKK.",
".KDDDDDDDDDDDDK.",
".KDIIIIIIIIIIDK.",
".KDIIIIIIIIIIDK.",
".KKKKKKKKKKKKKK.",
".KDEDEDEDEDEDEK.",
".KEDEDEDEDEDEDK.",
".KDEDEDEDEDEDEK.",
".KEDEDEDEDEDEDK.",
".KDEDEDEDEDEDEK.",
".KKKKKKKKKKKKKK.",
"..SSSSSSSSSSSS..",
"................",
]


def main(out):
    sheet=Image.new('RGBA',(32,16))
    for i,g in enumerate((closed,opened)):
        for y,row in enumerate(g):
            assert len(row)==16,(i,y)
            for x,c in enumerate(row): sheet.putpixel((16*i+x,y),P[c])
    sheet.save(out)


if __name__ == '__main__':
    main(sys.argv[1])
