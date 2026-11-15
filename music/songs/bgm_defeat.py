# 全滅。尺八がひとりで下りていき、低い弦と太鼓の一打で重く沈む。主題は使わない（旅の主題の響きを敗北に重ねないため）。ループしない。
from musiclib import *

song = Song("bgm_defeat", tempo=60, meter="4/4", loop=False, title="全滅",
            about="尺八の短い下降。力尽きて重く沈む")
flute = song.track("尺八", program=77, role="main", volume=105, reverb=90)
strings = song.track("弦", program=49, role="other", volume=75, reverb=90)
bass = song.track("低弦", program=43, role="other", volume=80, reverb=80)
taiko = song.track("大太鼓", program=116, role="other", volume=80, reverb=90)

# 和音は旋律の音から: 1 小節目 Dm（A・F）、2 小節目 Am（E・C）、3〜4 小節目 Dm
flute.add(parse("| A4:2 G4:1 F4:1 | E4:2 D4:1 C4:1 | D4:4~ | D4:3 r:1 |"))
strings.add(parse("| D3+A3+F4:4@70 | A2+E3+C4:4@65 | D3+A3+D4:4@60 | D3+A3+D4:3@50 r:1 |"))
bass.add(parse("| D2:4 | A1:4 | D1:4~ | D1:3 r:1 |"))
taiko.add(parse("| D1:1@100 r:3 | r:4 | D1:1@90 r:3 | r:4 |"))
song.end(song.bar(5))
