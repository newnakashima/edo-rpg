# 洞窟・廃墟。低い太鼓が遠くで鳴り、尺八が闇の中で途切れ途切れに吹く。場所が多様なので主題は使わず新しく書く。
from musiclib import *

song = Song("bgm_dungeon", tempo=66, meter="4/4", loop=True, title="洞窟・廃墟",
            about="太鼓の低音、不気味。闇の奥で尺八が途切れ途切れに鳴る")
flute = song.track("尺八", program=77, role="main", volume=95, reverb=100)
taiko = song.track("太鼓", program=116, role="other", volume=90, reverb=90)
drone = song.track("低い持続", program=89, role="other", volume=60, reverb=90)
bass = song.track("低弦", program=43, role="other", volume=70, reverb=80)
bell = song.track("鈴", program=112, role="other", volume=45, pan=90, reverb=100)

flute.put(song.bar(2), parse(
    "| r:1 E4:2 F4:1~ | F4:2 r:2 | r:2 B4:1 A4:1 | F4:3 r:1 |"
    "| r:1 E4:1/2 F4:1/2 A4:2 | B4:1 C5:1 B4:2 | r:2 A4:1 F4:1 | E4:4 |"
    "| r:4 | r:1 B4:2 C5:1 | E5:3 r:1 | D5:1/2 C5:1/2 B4:1 A4:2 |"
    "| r:2 F4:1 E4:1 | r:4 |"))
taiko.put(0, parse("| E1:1@100 r:1 r:1/2 E1:1/2@60 r:1 | E1:1@90 r:3 |").repeat(8))
drone.put(0, parse("| E2+B2:4~ | E2+B2:4~ | E2+B2:4~ | E2+B2:4 | F2+C3:4~ | F2+C3:4 | E2+B2:4~ | E2+B2:4 |").repeat(2))
bass.put(0, parse("| E1:4@70 | r:4 | E1:4@60 | r:2 F1:2@60 |").repeat(4))
bell.put(song.bar(5), parse("| r:3 B6:1@40 |"))
bell.put(song.bar(12), parse("| r:1 F6:1@35 r:2 |"))
song.end(song.bar(17))
