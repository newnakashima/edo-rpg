# からくりのダンジョン。琴がからくりの主題を刻み、拍子木と締太鼓が機械のリズムを打つ。後半は尺八が上で嘆く。
from musiclib import *

song = Song("bgm_karakuri", tempo=120, meter="4/4", loop=True, title="からくり屋敷",
            about="和楽器と機械的なリズムの混在。冷たく規則正しい歯車の刻みに、人の息が混じる")
koto = song.track("琴", program=107, role="main", volume=100, pan=50, reverb=40)
flute = song.track("尺八", program=77, role="main", volume=90, reverb=70)
box = song.track("オルゴール", program=10, role="sub", volume=70, pan=90, reverb=50)
block = song.track("拍子木", program=115, role="other", volume=75, pan=30, reverb=30)
drum = song.track("締太鼓", program=117, role="other", volume=65, reverb=30)
bass = song.track("低弦", program=43, role="other", volume=80, reverb=30)

koto.put(0, theme("karakuri"))
koto.put(song.bar(9), motif("karakuri.haguruma").repeat(2) + motif("karakuri.haguruma").transpose(1).repeat(2))
koto.put(song.bar(13), motif("karakuri.haguruma").transpose(3).repeat(2) + motif("karakuri.haguruma").repeat(2))
flute.put(song.bar(9), parse("| B4:3 C5:1 | Bb4:4 | C5:3 Db5:1 | E5:4 | D5:2 Db5:2 | C5:2 B4:2 | Bb4:4 | E4:4 |"))
koto.put(song.bar(17), theme("karakuri").bars(1, 7))
box.put(song.bar(17), motif("karakuri.zenmai").octave(1) + parse("| r:4 |"))
box.put(song.bar(21), motif("karakuri.zenmai").octave(1).transpose(-2))
koto.put(song.bar(24), parse("| E4:1 r:1 E4:1/2 E4:1/2 G4:1/2 Bb4:1/2 |"))
block.put(0, parse("| 76:1/2@90 r:1/2 76:1/4@50 76:1/4@50 r:1/2 76:1/2@80 r:1/2 76:1/2@60 76:1/2@60 |").repeat(24))
drum.put(0, parse("| E3:1@70 r:1 E3:1@60 E3:1/2@50 E3:1/2@50 |").repeat(24))
bass.put(0, parse("| E1:1/2 r:1/2 E1:1/2 r:1/2 E1:1/2 r:1/2 Bb1:1/2 r:1/2 |").repeat(8)
         + parse("| F1:1/2 r:1/2 F1:1/2 r:1/2 F1:1/2 r:1/2 B1:1/2 r:1/2 |").repeat(4)
         + parse("| E1:1/2 r:1/2 E1:1/2 r:1/2 E1:1/2 r:1/2 Bb1:1/2 r:1/2 |").repeat(12))
song.end(song.bar(25))
