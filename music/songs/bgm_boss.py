# 章のボス・中ボス。激しい和太鼓に、尺八と三味線が鋭く斬り込む。副旋律でからくりのゼンマイの断片が鳴る（ボスの多くが鷲尾の手先）。
from musiclib import *

song = Song("bgm_boss", tempo=138, meter="4/4", loop=True, title="ボス戦",
            about="激しい和太鼓、緊張感。からくりの企みの影")
flute = song.track("尺八", program=77, role="main", volume=105, reverb=50)
shami = song.track("三味線", program=106, role="main", volume=100, pan=70, reverb=30)
brass = song.track("金管", program=61, role="sub", volume=75, pan=40, reverb=50)
strings = song.track("弦", program=48, role="other", volume=65, reverb=50)
taiko = song.track("大太鼓", program=116, role="other", volume=95, reverb=60)
drum = song.track("締太鼓", program=117, role="other", volume=70, reverb=30)
bass = song.track("低弦", program=43, role="other", volume=90, reverb=30)

taiko.put(0, parse("| E1:1 E1:1 E1:1 E1:1 | E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1 E1:1 |"))
song.loop_from(song.bar(3))
flute.put(song.bar(3), parse(
    "| E5:2 G5:1 F#5:1 | E5:1 D5:1 B4:2 | E5:2 B5:1 A5:1 | G5:3 F#5:1 |"
    "| E5:2 G5:1 A5:1 | B5:2 C6:1 B5:1 | A5:1 G5:1 F#5:1 D5:1 | E5:4 |"))
shami.put(song.bar(11), parse(
    "| E4:1/2 E4:1/2 G4:1/2 E4:1/2 B4:1/2 E4:1/2 A4:1/2 G4:1/2 | F#4:1/2 G4:1/2 A4:1/2 B4:1/2 D5:2 |"
    "| E5:1/2 D5:1/2 B4:1/2 A4:1/2 G4:1/2 A4:1/2 B4:1 | E4:1/2 r:1/2 E4:1/2 r:1/2 E4:1 r:1 |"))
brass.put(song.bar(11), motif("karakuri.zenmai").octave(-1).stretch(2).velocity(value=80))
flute.put(song.bar(15), parse("| B5:2 C6:1 B5:1 | A5:2 G5:2 | F#5:1 G5:1 A5:1 B5:1 | E5:4 |"))
brass.put(song.bar(15), motif("karakuri.zenmai").octave(-1).stretch(2).transpose(-2).velocity(value=85))
strings.put(song.bar(3), parse("| E3+B3:4 | E3+B3:4 | C3+G3:4 | D3+A3:4 |").repeat(4))
bass.put(song.bar(3), parse("| E1:1/2 E1:1/2 E2:1/2 E1:1/2 E1:1/2 E1:1/2 E2:1/2 E1:1/2 |").repeat(2)
         + parse("| C1:1/2 C1:1/2 C2:1/2 C1:1/2 C1:1/2 C1:1/2 C2:1/2 C1:1/2 | D1:1/2 D1:1/2 D2:1/2 D1:1/2 D1:1/2 D1:1/2 D2:1/2 D1:1/2 |"))
bass.put(song.bar(7), parse("| E1:1/2 E1:1/2 E2:1/2 E1:1/2 E1:1/2 E1:1/2 E2:1/2 E1:1/2 |").repeat(2)
         + parse("| C1:1/2 C1:1/2 C2:1/2 C1:1/2 C1:1/2 C1:1/2 C2:1/2 C1:1/2 | D1:1/2 D1:1/2 D2:1/2 D1:1/2 D1:1/2 D1:1/2 D2:1/2 D1:1/2 |"))
bass.put(song.bar(11), parse("| E1:1/2 E1:1/2 E2:1/2 E1:1/2 E1:1/2 E1:1/2 E2:1/2 E1:1/2 |").repeat(8))
taiko.put(song.bar(3), parse("| E1:1@100 r:1/2 E1:1/2@70 E1:1@90 E1:1/2@60 E1:1/2@60 |").repeat(15)
          + parse("| E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1/2 E1:1 |"))
drum.put(song.bar(3), parse("| B3:1/2@50 B3:1/2@40 B3:1/2@70 B3:1/2@40 |").repeat(32))
song.end(song.bar(19))
