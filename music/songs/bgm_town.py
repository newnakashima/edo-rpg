# 城下町。祭り囃子を抑えた、にぎやかで穏やかな曲。町の人々の曲なので主題は使わず新しく書く。
from musiclib import *

song = Song("bgm_town", tempo=104, meter="4/4", loop=True, title="城下町",
            about="祭り囃子を抑えた、にぎやかで穏やかな町。篠笛・三味線・鉦")
fue = song.track("篠笛", program=73, role="main", volume=95, reverb=50)
shami = song.track("三味線", program=106, role="sub", volume=85, pan=80, reverb=30)
koto = song.track("琴", program=107, role="other", volume=60, pan=40, reverb=40)
kane = song.track("鉦", program=113, role="other", volume=55, pan=64, reverb=30)
drum = song.track("締太鼓", program=117, role="other", volume=60, reverb=30)

fue.add(parse(
    "| G5:1 A5:1/2 G5:1/2 E5:1 D5:1 | E5:1/2 G5:1/2 A5:1 G5:2 | C6:1 A5:1/2 G5:1/2 A5:1 G5:1/2 E5:1/2 | D5:3 r:1 |"
    "| E5:1 G5:1 A5:1/2 C6:1/2 A5:1 | G5:1/2 A5:1/2 G5:1/2 E5:1/2 D5:2 | E5:1/2 D5:1/2 C5:1 D5:1 E5:1 | G4:3 r:1 |"))
shami.put(song.bar(9), parse(
    "| C5:1/2 D5:1/2 E5:1 G5:1 E5:1 | D5:1/2 E5:1/2 D5:1/2 C5:1/2 A4:2 | C5:1 D5:1 E5:1/2 G5:1/2 A5:1 | G5:3 r:1 |"
    "| A5:1/2 G5:1/2 E5:1 D5:1 E5:1 | G5:1 E5:1/2 D5:1/2 C5:2 | D5:1 E5:1/2 D5:1/2 C5:1 A4:1 | G4:3 r:1 |"))
fue.put(song.bar(13), parse("| r:2 E6:1/2 D6:1/2 C6:1 | r:2 A5:1/2 G5:1/2 E5:1 | r:4 | r:2 D5:1 G5:1 |").velocity(value=70))
koto.put(0, parse("| G3+D4:1 r:1 G3+D4:1 r:1 | C4+G4:1 r:1 C4+G4:1 r:1 | A3+E4:1 r:1 A3+E4:1 r:1 | D4+A4:1 r:1 D4+A4:1 r:1 |").repeat(4))
kane.put(0, parse("| 80:1@70 r:1/2 80:1/2@50 80:1@60 r:1 |").repeat(16))
drum.put(0, parse("| D3:1/2@70 D3:1/2@45 r:1/2 D3:1/2@50 D3:1@60 r:1 |").repeat(16))
song.end(song.bar(17))
