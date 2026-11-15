# 浜松の凧揚げ合戦。篠笛・締太鼓・大太鼓・鉦の祭り囃子。中ほどで初凧が空高く揚がるところに、流れ者の主題の開けを篠笛が吹く。
# 主題の開け（main.wide）は 2 半音上げて、曲と同じ G の 5 音（G A B D E）に収める。伴奏は G と D だけ。
from musiclib import *

song = Song("bgm_matsuri", tempo=132, meter="4/4", loop=True, title="凧揚げ合戦",
            about="祭り囃子。にぎやかで晴れやか。空に揚がる凧")
fue = song.track("篠笛", program=73, role="main", volume=100, reverb=50)
fue2 = song.track("篠笛（二番）", program=72, role="sub", volume=70, pan=84, reverb=50)
shami = song.track("三味線", program=106, role="other", volume=60, pan=40, reverb=30)
bass = song.track("低弦", program=43, role="other", volume=60, reverb=40)
shime = song.track("締太鼓", program=117, role="other", volume=70, pan=70, reverb=30)
odaiko = song.track("大太鼓", program=116, role="other", volume=80, reverb=50)
kane = song.track("鉦", program=113, role="other", volume=60, pan=30, reverb=30)

# 1〜8: 町じゅうが繰り出すにぎわい
fue.add(parse(
    "| G5:1/2 A5:1/2 B5:1 D6:1 B5:1 | A5:1/2 B5:1/2 A5:1/2 G5:1/2 E5:1 G5:1 | A5:1 B5:1/2 A5:1/2 G5:1 E5:1 | D5:2 E5:1 G5:1 |"
    "| B5:1/2 D6:1/2 E6:1 D6:1 B5:1 | A5:1/2 B5:1/2 D6:1/2 B5:1/2 A5:1 G5:1 | E5:1 G5:1/2 A5:1/2 B5:1 A5:1 | G5:3 r:1 |"))
# 9〜16: 初凧が空高く揚がる。流れ者の主題の開け
wide = motif("main.wide").transpose(2)
fue.add(wide + parse("| B5:1 D6:1 E6:1/2 D6:1/2 B5:1 | A5:3 r:1 |")
        + wide + parse("| E5:1 G5:1/2 A5:1/2 B5:1 A5:1 | G5:3 r:1 |"))
# 二番の笛が下で開けを追う
fue2.put(song.bar(13), wide.octave(-1).velocity(value=70))
# 17〜24: 糸の擦り合い。太鼓が前に出て、笛は短く掛け合う
fue.add(parse(
    "| r:2 D6:1/2 B5:1/2 D6:1 | r:2 E6:1/2 D6:1/2 B5:1 | r:2 D6:1/2 B5:1/2 A5:1 | G5:1/2 A5:1/2 B5:1/2 A5:1/2 G5:2 |"
    "| r:2 D6:1/2 E6:1/2 D6:1 | r:2 B5:1/2 D6:1/2 B5:1 | A5:1/2 B5:1/2 A5:1/2 G5:1/2 E5:1 G5:1 | D5:2 E5:1 G5:1 |"))
fue2.put(song.bar(17), parse(
    "| B4:1/2 D5:1/2 B4:1 r:2 | G4:1/2 A4:1/2 B4:1 r:2 | B4:1/2 D5:1/2 E5:1 r:2 | r:4 |"
    "| B4:1/2 D5:1/2 B4:1 r:2 | D5:1/2 E5:1/2 D5:1 r:2 | r:4 | r:4 |"))
shami.put(0, parse("| G3+D4:1/2 r:1/2 G3+D4:1/2 G3+D4:1/2 r:1/2 G3+D4:1/2 G3+D4:1 |").repeat(24))
bass.put(0, parse("| G2:1@80 r:1 D2:1@70 r:1 |").repeat(24))
SHIME = "| D4:1/2@80 D4:1/2@55 D4:1/4@60 D4:1/4@55 D4:1/2@70 D4:1/2@80 D4:1/2@55 D4:1/4@60 D4:1/4@55 D4:1/2@70 |"
shime.put(0, parse(SHIME).repeat(16) + parse(
    "| D4:1/4@80 D4:1/4@60 D4:1/4@65 D4:1/4@60 D4:1/2@85 D4:1/2@60 D4:1/4@80 D4:1/4@60 D4:1/4@65 D4:1/4@60 D4:1@90 |").repeat(8))
odaiko.put(0, parse("| D2:1@90 r:1 D2:1@75 r:1 |").repeat(16)
           + parse("| D2:1@100 r:1/2 D2:1/2@80 D2:1@95 D2:1/2@80 D2:1/2@85 |").repeat(8))
kane.put(0, parse("| 80:1/2@75 80:1/2@50 r:1/2 80:1/2@55 80:1/2@70 80:1/2@50 r:1/2 80:1/2@55 |").repeat(24))
song.end(song.bar(25))
