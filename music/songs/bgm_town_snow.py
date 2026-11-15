# 加賀金沢・会津若松。雪の静けさ。澄んだ琴がゆっくり歌い、後半は尺八が受ける。和音は 3 度を抜いた空いた響き（澄んだ冷たさ）で、遠い鐘が鳴る。
# 雪の町の人々の曲なので主題は使わず、新しく書く。
from musiclib import *

song = Song("bgm_town_snow", tempo=72, meter="4/4", loop=True, title="雪の町",
            about="雪の静けさ。澄んだ琴と、遠い鐘")
koto = song.track("琴", program=107, role="main", volume=100, pan=50, reverb=80)
flute = song.track("尺八", program=77, role="main", volume=90, reverb=90)
harp = song.track("つま弾き", program=46, role="other", volume=55, pan=78, reverb=80)
strings = song.track("弦", program=49, role="other", volume=50, reverb=90)
bell = song.track("鐘", program=14, role="other", volume=40, pan=30, reverb=100)
celesta = song.track("雪", program=8, role="other", volume=35, pan=90, reverb=100)

koto.add(parse(
    "| B4:2 E5:1 F#5:1 | G5:3 A5:1 | E5:2 D5:1 B4:1 | E5:4 |"
    "| G5:2 A5:1 B5:1 | D6:3 B5:1 | A5:2 G5:1 F#5:1 | E5:4 |"))
flute.put(song.bar(9), parse(
    "| E5:2 G5:1 A5:1 | B5:4 | A5:1 G5:1 E5:1 D5:1 | E5:4 |"
    "| C6:2 B5:1 A5:1 | G5:3 A5:1 | B5:2 A5:1 G5:1 | E5:4 |"))
# 空いた響き（根音と 5 度）を旋律の音から選ぶ
FIFTH = {"E": ("E", "B"), "C": ("C", "G"), "G": ("G", "D"), "D": ("D", "A"), "A": ("A", "E")}
CH = ["E", "C", "E", "E", "G", "G", "D", "E", "E", "E", "A", "E", "A", "C", "E", "E"]
strings.put(0, parse("".join(f"| {FIFTH[c][0]}3+{FIFTH[c][1]}3:4@45 " for c in CH) + "|"))
harp.put(0, parse("".join(f"| {FIFTH[c][0]}2:1 {FIFTH[c][1]}2:1 {FIFTH[c][0]}3:1 {FIFTH[c][1]}2:1 " for c in CH) + "|"))
harp.put(song.bar(9), parse("".join(f"| {FIFTH[c][0]}2:2 {FIFTH[c][1]}2:2 " for c in CH[8:]) + "|").velocity(value=60))
bell.put(0, parse("| E3:4@60 | r:4 | r:4 | r:4 |").repeat(4))
celesta.put(0, parse("| r:4 | r:2 B6:1/2@40 r:3/2 | r:4 | r:3 E7:1/2@35 r:1/2 |").repeat(4))
song.end(song.bar(17))
