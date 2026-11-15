# 最終ボス・からくり大権現。金管がからくりの主題を、弦と尺八が流れ者の呼びかけを鳴らし合い、
# 最後に声が子守唄の揺りかごを歌って、閉じ込められた魂の光がさす。
from musiclib import *

song = Song("bgm_last_boss", tempo=132, meter="4/4", loop=True, title="からくり大権現",
            about="和楽器とオーケストラ、からくりの音。鷲尾の企みと旅の主題がぶつかり、最後に魂が光る")
brass = song.track("金管", program=61, role="main", volume=100, pan=50, reverb=60)
flute = song.track("尺八", program=77, role="main", volume=105, pan=70, reverb=60)
choir = song.track("声", program=52, role="main", volume=95, reverb=90)
strings = song.track("弦", program=48, role="sub", volume=85, pan=40, reverb=60)
box = song.track("オルゴール", program=10, role="sub", volume=70, pan=90, reverb=70)
koto = song.track("琴", program=107, role="sub", volume=70, pan=30, reverb=40)
timp = song.track("ティンパニ", program=47, role="other", volume=85, reverb=60)
taiko = song.track("大太鼓", program=116, role="other", volume=85, reverb=60)
block = song.track("拍子木", program=115, role="other", volume=60, pan=80, reverb=30)
bass = song.track("低弦", program=43, role="other", volume=90, reverb=40)

def low(notes, bars):
    return parse("".join(f"| {n}:1/2 {n}:1/2 r:1/2 {n}:1/2 {n}:1/2 r:1/2 {n}:1 " for n in notes) + "|")

# 前奏（1〜2）
taiko.put(0, parse("| E1:1@110 r:1 E1:1@110 r:1 | E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1 |"))
brass.put(0, parse("| E3+B3+E4:2@100 r:2 | E3+Bb3+E4:2@100 r:2 |"))
song.loop_from(song.bar(3))
# A（3〜10）: 金管がからくりの主題。琴が刻む
brass.put(song.bar(3), theme("karakuri").velocity(value=95))
koto.put(song.bar(3), motif("karakuri.haguruma").octave(-1).repeat(8).velocity(value=60))
bass.put(song.bar(3), low(["E1", "E1", "F1", "E1", "E1", "C2", "Bb1", "E1"], 8))
# B（11〜18）: 尺八が流れ者の呼びかけで立ち向かい、弦が後半の開けで支える。下で金管がゼンマイを巻く
flute.put(song.bar(11), motif("main.call").transpose(2) + motif("main.call").transpose(5))
strings.put(song.bar(15), motif("main.wide").transpose(2).octave(-1))
flute.put(song.bar(15), parse("| B5:2 A5:1 G5:1 | F#5:1 E5:1 D5:1 B4:1 | E5:4 | r:4 |"))
brass.put(song.bar(17), motif("karakuri.zenmai").octave(-1).velocity(value=90) + parse("| E3+B3:2@100 r:2 |"))
bass.put(song.bar(11), low(["E1", "E1", "G1", "G1", "C2", "D2", "E1", "E1"], 8))
# C（19〜26）: 声が子守唄の揺りかごを歌い、魂の光がさす。オルゴールが重なる
choir.put(song.bar(19), motif("komoriuta.yurikago").stretch(Fraction(4, 3)).transpose(-5).velocity(value=95))
choir.put(song.bar(21), motif("komoriuta.yurikago").stretch(Fraction(4, 3)).transpose(-3).velocity(value=100))
box.put(song.bar(23), motif("komoriuta.nemure").stretch(Fraction(4, 3)).transpose(7).velocity(value=75))
flute.put(song.bar(23), motif("main.sigh").transpose(2))
strings.put(song.bar(19), parse("| E3+B3+E4:4 | C3+G3+E4:4 | D3+A3+F#4:4 | E3+B3+G4:4 | C3+G3+E4:4 | D3+A3+F#4:4 | E3+B3+E4:4 | E3+Bb3+E4:4 |"))
bass.put(song.bar(19), low(["E1", "C2", "D2", "E1", "C2", "D2", "E1", "E1"], 8))
timp.put(song.bar(3), parse("| E2:1@90 r:1 B1:1@70 r:1 |").repeat(24))
taiko.put(song.bar(3), parse("| E1:1@95 r:1/2 E1:1/2@70 r:1 E1:1/2@80 E1:1/2@80 |").repeat(23)
          + parse("| E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1 |"))
block.put(song.bar(3), parse("| 76:1/2@80 76:1/2@50 76:1/2@60 76:1/2@50 |").repeat(48))
song.end(song.bar(27))
