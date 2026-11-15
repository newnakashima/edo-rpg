# 陰謀・緊迫した会話。低い弦の刻みと拍子木。低い尺八が夜叉丸の妖しい出だしを、はじく弦がゼンマイの下りを鳴らす。
from musiclib import *

song = Song("bgm_tension", tempo=80, meter="4/4", loop=True, title="陰謀",
            about="低い弦と拍子木。息を潜める緊迫と、背後でうごめく企み")
flute = song.track("尺八", program=77, role="main", volume=95, reverb=80)
pizz = song.track("はじく弦", program=45, role="sub", volume=85, pan=80, reverb=50)
cello = song.track("低弦", program=42, role="other", volume=85, reverb=50)
contra = song.track("最低弦", program=43, role="other", volume=80, reverb=50)
block = song.track("拍子木", program=115, role="other", volume=80, pan=40, reverb=60)

cello.put(0, parse("| B2:1/2 B2:1/2 r:1/2 B2:1/2 C3:1/2 B2:1/2 r:1 |").repeat(16))
contra.put(0, parse("| B1:4~ | B1:4 | B1:4~ | B1:4 |").repeat(4))
block.put(0, parse("| 76:1@90 r:3 | r:2 76:1/2@60 76:1/2@60 r:1 |").repeat(8))
flute.put(song.bar(3), motif("yashamaru.kage").octave(-1) + parse("| r:4 | r:4 |"))
flute.put(song.bar(7), motif("yashamaru.kage").octave(-1).velocity(scale=1.1))  # 低音と同じ調のまま、強く繰り返す
pizz.put(song.bar(9), motif("karakuri.zenmai").octave(-1).velocity(value=80) + parse("| r:4 |")
         + motif("karakuri.zenmai").octave(-1).transpose(-1).velocity(value=85) + parse("| r:4 |"))
flute.put(song.bar(13), parse("| r:2 B3:1 C4:1 | F#4:3 E4:1 | D4:1 C4:1 B3:2~ | B3:4 |"))
song.end(song.bar(17))
