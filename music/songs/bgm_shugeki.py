# 「終劇」の黒い画面。拍子木が二つ鳴り、尺八が流れ者の主題の結びを吹く。最後は柝の刻みが速まって、強い一打で幕を引く。ループしない。
# 和音は主題の参考の和音（15 小節 A、16 小節 D）を、3 度を抜いた 5 度だけで鳴らす。
from musiclib import *

song = Song("bgm_shugeki", tempo=66, meter="4/4", loop=False, title="終劇",
            about="拍子木と、主題の最後の一節。旅の幕が下りる")
flute = song.track("尺八", program=77, role="main", volume=105, reverb=90)
strings = song.track("弦", program=49, role="other", volume=70, reverb=90)
bass = song.track("低弦", program=43, role="other", volume=70, reverb=80)
koto = song.track("琴", program=107, role="other", volume=60, pan=44, reverb=70)
ki = song.track("拍子木", drum=True, volume=110, reverb=60)

# 1 小節目: チョン、チョン
ki.put(0, parse("| 75:1@120 r:1 75:1@120 r:1 |"))
# 2〜3 小節目: 結びの一節。最後の D は 4 小節目の半ばまで伸ばす
sigh = motif("main.sigh").map(lambda n: (setattr(n, "dur", n.dur + 2) or n) if n.start == 4 else n)
flute.put(song.bar(2), sigh)
strings.put(song.bar(2), parse("| A2+E3+A3:4@60 | D3+A3+D4:4@65 | D3+A3+D4:2@55 r:2 |"))
bass.put(song.bar(2), parse("| A1:4@70 | D1:4~ | D1:2 r:2 |"))
koto.put(song.bar(3), parse("| D4:1/2@70 A4:1/2@60 D5:3@65 | r:4 |"))
# 3〜4 小節目: 柝の刻み。だんだん速く強く、最後に一打
ki.put(song.bar(3), parse(
    "| 75:1@60 75:1@65 75:1/2@70 75:1/2@72 75:1/2@75 75:1/2@78 |"
    "| 75:1/4@82 75:1/4@85 75:1/4@88 75:1/4@91 75:1/4@94 75:1/4@97 75:1/4@100 75:1/4@103 75:1@127 r:1 |"))
song.end(song.bar(5))
