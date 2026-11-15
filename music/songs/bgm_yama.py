# 野山の道。尺八が人里を離れた心細さを歌い、後半は琴が受ける。空いた響きの弦と、ときどき鳥の声。山道の曲なので主題は使わず、新しく書く。
from musiclib import *

song = Song("bgm_yama", tempo=80, meter="4/4", loop=True, title="野山",
            about="風と鳥の声。人里を離れた心細さ")
flute = song.track("尺八", program=77, role="main", volume=100, reverb=90)
koto = song.track("琴", program=107, role="main", volume=95, pan=44, reverb=70)
strings = song.track("弦", program=49, role="other", volume=50, reverb=90)
bass = song.track("低弦", program=43, role="other", volume=55, reverb=70)
harp = song.track("つま弾き", program=46, role="other", volume=50, pan=80, reverb=80)
bird = song.track("鳥", program=123, role="other", volume=35, pan=100, reverb=80)

flute.add(parse(
    "| E5:2 G5:1 A5:1 | C6:3 A5:1 | G5:2 E5:1 D5:1 | E5:4 |"
    "| D5:2 E5:1 G5:1 | A5:2 G5:1 E5:1 | D5:1 C5:1 D5:1 E5:1 | A4:4 |"))
koto.put(song.bar(9), parse(
    "| A4:1 C5:1 D5:1 E5:1 | G5:2 E5:2 | D5:1 E5:1 C5:1 A4:1 | G4:4 |"
    "| A4:1 C5:1 E5:1 G5:1 | A5:3 G5:1 | E5:2 D5:1 C5:1 | A4:4 |"))
flute.put(song.bar(10), parse("| r:4 | r:4 | r:2 D5:2@55 | r:4 | r:4 | r:4 | r:4 |"))
# 空いた響き（根音と 5 度）。旋律の 5 音とこすれない
CH = ["A", "A", "A", "A", "D", "A", "D", "A", "A", "A", "A", "G", "A", "A", "A", "A"]
FIF = {"A": "E", "D": "A", "G": "D"}
strings.put(0, parse("".join(f"| {c}3+{FIF[c]}4:4@45 " for c in CH) + "|"))
bass.put(0, parse("".join(f"| {c}1:4 " for c in CH) + "|"))
harp.put(0, parse("".join(f"| {c}2:1 {FIF[c]}3:1 {c}3:2 " for c in CH) + "|"))
bird.put(0, parse("| r:4 | r:2 C6:1/2@60 r:1/2 C6:1/2@40 r:1/2 | r:4 | r:4 | r:4 | r:4 | r:3 G6:1/2@50 r:1/2 | r:4 |").repeat(2))
song.end(song.bar(17))
