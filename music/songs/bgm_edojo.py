# 江戸城。篳篥と笙の雅楽風の重々しい旋律に、後半はからくりの歯車の刻みが小さく忍び込む。最後の道のり。
from musiclib import *

song = Song("bgm_edojo", tempo=60, meter="4/4", loop=True, title="江戸城",
            about="雅楽の重厚さに、からくりの音が忍び込む。最後の道のり")
hichi = song.track("篳篥", program=111, role="main", volume=95, reverb=80)
sho = song.track("笙", program=109, role="other", volume=55, reverb=90)
koto = song.track("琴", program=107, role="other", volume=65, pan=40, reverb=70)
box = song.track("からくりの刻み", program=8, role="sub", volume=60, pan=90, reverb=60)
taiko = song.track("太鼓", program=116, role="other", volume=85, reverb=90)
bass = song.track("低弦", program=43, role="other", volume=60, reverb=80)

hichi.add(parse(
    "| E5:2 F#5:1 A5:1~ | A5:3 B5:1 | A5:1 F#5:1 E5:2~ | E5:4 |"
    "| B4:2 D5:1 E5:1 | F#5:2 E5:1 D5:1 | B4:3 A4:1 | B4:4 |"
    "| E5:2 F#5:1 B5:1~ | B5:2 A5:2 | F#5:1 A5:1 F#5:1 E5:1 | D5:4 |"
    "| B4:2 E5:2 | D5:1 B4:1 A4:2 | B4:3 A4:1 | E4:4 |"))
sho.put(0, parse("| E4+F#4+B4+E5:4~ | E4+F#4+B4+E5:4 | A4+B4+E5+F#5:4~ | A4+B4+E5+F#5:4 | B3+E4+F#4+B4:4~ | B3+E4+F#4+B4:4 | E4+F#4+B4+E5:4~ | E4+F#4+B4+E5:4 |").repeat(2))
koto.put(0, parse("| E3:1 r:3 | r:2 B3:1 E4:1 |").repeat(8))
taiko.put(0, parse("| E1:1@95 r:3 | r:2 E1:1@60 E1:1@75 |").repeat(8))
bass.put(0, parse("| E1:4~ | E1:4 | A1:4~ | A1:4 | B1:4~ | B1:4 | E1:4~ | E1:4 |").repeat(2))
# 後半（9〜16）: からくりの刻みが忍び込む
hg = motif("karakuri.haguruma").transpose(12).velocity(value=55)
box.put(song.bar(9), hg.stretch(Fraction(1, 2)) + parse("| r:2 |") + hg.stretch(Fraction(1, 2)).transpose(2) + parse("| r:2 |"))
box.put(song.bar(13), hg + hg.transpose(1) + hg.transpose(3) + motif("karakuri.tomaru").transpose(12).velocity(value=50))
song.end(song.bar(17))
