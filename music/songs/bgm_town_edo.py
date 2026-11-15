# 江戸（第 8 章）。大江戸のにぎわいを篠笛と三味線が弾むように奏でるが、下では低い弦が落ち着かなく刻み、拍子木が見回りのように鳴る。
# 手配されて身を潜める一行の曲で、旅の主題を明るく鳴らす場面ではないので、主題は使わず新しく書く。
from musiclib import *

song = Song("bgm_town_edo", tempo=112, meter="4/4", loop=True, title="江戸",
            about="大江戸のにぎわいの下に、手配されて身を潜める落ち着かなさ")
fue = song.track("篠笛", program=73, role="main", volume=95, reverb=50)
shami = song.track("三味線", program=106, role="main", volume=95, pan=78, reverb=30)
cello = song.track("低弦", program=42, role="other", volume=70, reverb=40)
contra = song.track("最低弦", program=43, role="other", volume=60, reverb=40)
block = song.track("拍子木", program=115, role="other", volume=60, pan=30, reverb=70)
drum = song.track("締太鼓", program=117, role="other", volume=55, pan=50, reverb=30)
kane = song.track("鉦", program=113, role="other", volume=45, pan=70, reverb=30)

fue.add(parse(
    "| A5:1/2 G5:1/2 E5:1 D5:1 E5:1 | G5:1 A5:1/2 C6:1/2 A5:2 | G5:1/2 E5:1/2 D5:1 C5:1 D5:1 | E5:3 r:1 |"
    "| A5:1/2 G5:1/2 E5:1 D5:1 E5:1 | C6:1 D6:1/2 C6:1/2 A5:2 | G5:1/2 A5:1/2 G5:1/2 E5:1/2 D5:1 C5:1 | A4:3 r:1 |"))
shami.put(song.bar(9), parse(
    "| E5:1/2 D5:1/2 C5:1 A4:1 C5:1 | D5:1 E5:1/2 G5:1/2 E5:2 | D5:1/2 C5:1/2 A4:1 G4:1 A4:1 | C5:3 r:1 |"
    "| E5:1 G5:1 A5:1/2 G5:1/2 E5:1 | D5:1 C5:1/2 D5:1/2 E5:2 | G5:1/2 E5:1/2 D5:1/2 C5:1/2 D5:1 E5:1 | A4:3 r:1 |"))
fue.put(song.bar(9), parse("| r:4 | r:2 A5:2@60 | r:4 | r:2 E5:2@60 | r:4 | r:4 | r:4 | r:2 A5:1@60 r:1 |"))
# 低音は旋律の 5 音とこすれない A・E と G・D だけで、裏拍に食い込む落ち着かない刻み
ROOT = ["A", "A", "A", "A", "A", "A", "G", "A", "A", "A", "A", "A", "G", "G", "A", "A"]
FIF = {"A": "E", "G": "D"}
cello.put(0, parse("".join(f"| {r}2:1/2 r:1/2 {r}2:1/2 {FIF[r]}3:1/2 r:1/2 {r}2:1/2 {FIF[r]}3:1/2 r:1/2 " for r in ROOT) + "|"))
contra.put(0, parse("".join(f"| {r}1:2 r:2 " for r in ROOT) + "|"))
block.put(0, parse("| r:4 | r:4 | r:4 | 76:1/2@80 76:1/2@60 r:3 |").repeat(4))
drum.put(0, parse("| D3:1/2@60 r:1/2 D3:1/2@45 D3:1/2@55 r:1/2 D3:1/2@45 D3:1/2@55 r:1/2 |").repeat(16))
kane.put(0, parse("| 80:1/2@55 r:1 80:1/2@40 r:2 |").repeat(16))
song.end(song.bar(17))
