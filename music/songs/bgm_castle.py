# 大名の城と庭（名古屋城の天守、兼六園）。雅楽のように、篳篥がゆっくり歌い、笙が 4 度と 5 度を重ねた持続音で包む。太鼓と鞨鼓が間を置いて打つ。
# 城の曲なので主題は使わず、新しく書く。笙の和音は E・A・B と D・A・B から選び、旋律の音とこすれないようにする。
from musiclib import *

song = Song("bgm_castle", tempo=60, meter="4/4", loop=True, title="城",
            about="雅楽風、重厚。張り詰めた城内の格式")
hichi = song.track("篳篥", program=111, role="main", volume=100, reverb=90)
fue = song.track("龍笛", program=73, role="sub", volume=75, pan=78, reverb=90)
sho = song.track("笙", program=109, role="other", volume=50, reverb=100)
strings = song.track("弦", program=49, role="other", volume=50, reverb=90)
bass = song.track("低弦", program=43, role="other", volume=70, reverb=80)
taiko = song.track("大太鼓", program=116, role="other", volume=75, reverb=100)
kakko = song.track("鞨鼓", program=117, role="other", volume=50, pan=30, reverb=70)

MEL = ("| E5:3 F#5:1 | A5:2 B5:2 | A5:1 F#5:1 E5:2 | E5:4 |"
       "| B5:3 A5:1 | B5:2 D6:2 | B5:1 A5:1 F#5:2 | E5:4 |"
       "| A5:2 B5:1 A5:1 | F#5:2 E5:2 | D5:2 E5:1 F#5:1 | E5:4 |"
       "| B4:2 D5:2 | E5:3 F#5:1 | E5:1 D5:1 B4:2 | E5:4 |")
hichi.add(parse(MEL))
fue.put(song.bar(5), parse("| r:4 | F#6:4 | E6:4~ | E6:4 |"))
fue.put(song.bar(13), parse("| r:4 | B5:4 | A5:4~ | A5:4 |"))
SHO = ["E4+A4+B4+E5", "D4+A4+B4+E5"]
CH = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0]
sho.put(0, parse("".join(f"| {SHO[c]}:4 " for c in CH) + "|"))
strings.put(0, parse("".join(f"| {'E2+B2' if c == 0 else 'D2+A2'}:4@50 " for c in CH) + "|"))
bass.put(0, parse("".join(f"| {'E1' if c == 0 else 'D1'}:4 " for c in CH) + "|"))
taiko.put(0, parse("| E1:1@95 r:3 | r:4 | r:2 E1:1@70 r:1 | r:4 |").repeat(4))
kakko.put(0, parse("| r:4 | r:3 E4:1/4@50 E4:1/4@55 E4:1/4@60 E4:1/4@70 | r:4 | r:2 E4:1@60 r:1 |").repeat(4))
song.end(song.bar(17))
