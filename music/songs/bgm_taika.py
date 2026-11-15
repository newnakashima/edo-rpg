# 神田の大火。半鐘がせわしなく打ち鳴らされ、三味線と篠笛が炎に追われるように駆ける。後半は尺八が高く叫び、最後は半鐘と太鼓だけが迫る。
# 火事場の曲なので主題は使わず、新しく書く。旋律は D・F・G・A・C の 5 音で、低音は D・A と C・G だけにする。
from musiclib import *

song = Song("bgm_taika", tempo=150, meter="4/4", loop=True, title="大火",
            about="半鐘が急き立てる。炎に追われる焦り")
fue = song.track("篠笛", program=73, role="main", volume=100, reverb=40)
shami = song.track("三味線", program=106, role="sub", volume=90, pan=75, reverb=30)
flute = song.track("尺八", program=77, role="main", volume=105, reverb=60)
strings = song.track("弦", program=48, role="other", volume=70, reverb=50)
bass = song.track("低弦", program=43, role="other", volume=85, reverb=30)
bell = song.track("半鐘", program=14, role="other", volume=70, pan=30, reverb=60)
taiko = song.track("大太鼓", program=116, role="other", volume=90, reverb=50)
drum = song.track("締太鼓", program=117, role="other", volume=65, reverb=30)

fue.add(parse(
    "| D5:1/2 F5:1/2 G5:1/2 A5:1/2 C6:1 A5:1 | G5:1/2 F5:1/2 D5:1 F5:2 | D5:1/2 F5:1/2 G5:1/2 A5:1/2 C6:1/2 D6:1/2 C6:1 | A5:3 r:1 |"
    "| D6:1 C6:1/2 A5:1/2 G5:1 A5:1 | F5:1 G5:1/2 F5:1/2 D5:2 | C5:1/2 D5:1/2 F5:1/2 G5:1/2 A5:1 G5:1 | D5:3 r:1 |"))
flute.put(song.bar(9), parse("| D6:4 | C6:4 | A5:4 | G5:2 A5:2 | D6:4 | F6:2 D6:2 | C6:4 | A5:4 |"))
shami.put(song.bar(9), parse("| D4:1/2 D4:1/2 F4:1/2 D4:1/2 G4:1/2 D4:1/2 A4:1/2 D4:1/2 |").repeat(8))
CH = ["D", "D", "D", "D", "D", "D", "C", "D", "D", "C", "D", "C", "D", "D", "C", "D", "D", "D", "D", "D"]
FIF = {"D": "A", "C": "G"}
strings.put(0, parse("".join(f"| {c}3+{FIF[c]}3:4@60 " for c in CH[:16]) + "|"))
strings.put(song.bar(17), parse("| D3+A3:4@55 | D3+A3:4@65 | D3+A3+D4:4@75 | D3+A3+D4:4@90 |"))
bass.put(0, parse("".join("| " + f"{c}2:1/2 " * 8 for c in CH) + "|"))
bell.put(0, parse("| D6:1/2@100 D6:1/2@80 D6:1/2@95 r:1/2 r:2 |").repeat(16)
         + parse("| D6:1/2@105 D6:1/2@85 D6:1/2@100 D6:1/2@85 D6:1/2@105 D6:1/2@85 D6:1/2@100 D6:1/2@85 |").repeat(4))
taiko.put(0, parse("| D1:1@100 r:1 D1:1/2@70 D1:1/2@70 D1:1@90 |").repeat(16)
          + parse("| D1:1/2@90 D1:1/2@70 D1:1/2@90 D1:1/2@70 D1:1/2@95 D1:1/2@75 D1:1/2@95 D1:1/2@75 |").repeat(3)
          + parse("| D1:1/4@100 D1:1/4@85 D1:1/4@105 D1:1/4@90 D1:1/4@110 D1:1/4@95 D1:1/4@115 D1:1/4@100 D1:1@120 D1:1@120 |"))
drum.put(0, parse("| A3:1/2@60 A3:1/2@45 A3:1/2@70 A3:1/2@45 |").repeat(40))
song.end(song.bar(21))
