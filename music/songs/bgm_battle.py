# 通常戦闘。速い三味線と太鼓。何度も聞く曲なので主題を擦り減らさないよう新しく書く。
from musiclib import *

song = Song("bgm_battle", tempo=152, meter="4/4", loop=True, title="戦闘",
            about="速い三味線と太鼓。斬り結ぶ勢い")
shami = song.track("三味線", program=106, role="main", volume=105, pan=60, reverb=30)
fue = song.track("篠笛", program=73, role="sub", volume=90, pan=80, reverb=40)
koto = song.track("琴", program=107, role="other", volume=70, pan=40, reverb=30)
taiko = song.track("太鼓", program=116, role="other", volume=85, reverb=40)
drum = song.track("締太鼓", program=117, role="other", volume=65, reverb=20)
bass = song.track("低弦", program=43, role="other", volume=85, reverb=20)

# 前奏（1〜2）
taiko.put(0, parse("| D2:1/2 D2:1/2 D2:1/2 D2:1/2 D2:1/2 D2:1/2 D2:1 | D2:1/2 D2:1/2 D2:1 D2:1/2 D2:1/2 D2:1 |"))
shami.put(0, parse("| r:4 | D4:1/2 F4:1/2 G4:1/2 A4:1/2 C5:1/2 A4:1/2 D5:1 |"))
song.loop_from(song.bar(3))
A = ("| D5:1/2 D5:1/2 F5:1/2 D5:1/2 G5:1 F5:1/2 D5:1/2 | C5:1/2 D5:1/2 F5:1/2 G5:1/2 A5:2 |"
     "| C6:1/2 A5:1/2 G5:1/2 F5:1/2 G5:1/2 A5:1/2 G5:1/2 F5:1/2 | D5:1 C5:1/2 A4:1/2 D5:2 |")
B = ("| A5:1 G5:1/2 A5:1/2 C6:1 A5:1 | G5:1/2 F5:1/2 G5:1/2 A5:1/2 D5:2 |"
     "| F5:1/2 G5:1/2 A5:1/2 F5:1/2 G5:1/2 F5:1/2 D5:1/2 C5:1/2 | D5:1/2 r:1/2 D5:1/2 r:1/2 D5:1 r:1 |")
shami.put(song.bar(3), parse(A + B))
fue.put(song.bar(11), parse(A).octave(1).velocity(value=85))
shami.put(song.bar(11), parse(
    "| D4:1/2 A4:1/2 D5:1/2 A4:1/2 D4:1/2 A4:1/2 D5:1/2 A4:1/2 | C4:1/2 G4:1/2 C5:1/2 G4:1/2 C4:1/2 G4:1/2 C5:1/2 G4:1/2 |"
    "| Bb3:1/2 F4:1/2 Bb4:1/2 F4:1/2 Bb3:1/2 F4:1/2 Bb4:1/2 F4:1/2 | A3:1/2 E4:1/2 A4:1/2 E4:1/2 A3:1/2 E4:1/2 A4:1/2 C5:1/2 |"))
shami.put(song.bar(15), parse(B))
koto.put(song.bar(3), parse("| D4+A4:1 r:1 D4+A4:1 r:1 | C4+G4:1 r:1 C4+G4:1 r:1 | Bb3+F4:1 r:1 Bb3+F4:1 r:1 | A3+E4:1 r:1 A3+E4:1 r:1 |").repeat(4))
bass.put(song.bar(3), parse("| D2:1/2 D2:1/2 r:1/2 D2:1/2 D2:1/2 r:1/2 D2:1 | C2:1/2 C2:1/2 r:1/2 C2:1/2 C2:1/2 r:1/2 C2:1 |"
                            "| Bb1:1/2 Bb1:1/2 r:1/2 Bb1:1/2 Bb1:1/2 r:1/2 Bb1:1 | A1:1/2 A1:1/2 r:1/2 A1:1/2 A1:1/2 r:1/2 A1:1 |").repeat(4))
taiko.put(song.bar(3), parse("| D2:1@90 r:1 D2:1/2@70 D2:1/2@70 r:1 |").repeat(16))
drum.put(song.bar(3), parse("| D3:1/2@60 D3:1/2@40 D3:1/2@70 D3:1/2@40 D3:1/2@60 D3:1/2@40 D3:1/2@70 D3:1/2@50 |").repeat(16))
song.end(song.bar(19))
