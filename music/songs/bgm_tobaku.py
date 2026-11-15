# 賭場（丁半）。壺を振る音、伏せる乾いた音、息を呑む間、太鼓。三味線が詰めた短い句で熱気を煽る。
# 後半は尺八が一家の主題の掛け声を「丁か半か」の張り声のように吹く（賭場は各町の一家が開く）。一家の主題と同じ A の短調で書く。
from musiclib import *

song = Song("bgm_tobaku", tempo=100, meter="4/4", loop=True, title="賭場",
            about="壺を振る間合い。張り詰めた熱気")
shami = song.track("三味線", program=106, role="main", volume=105, pan=70, reverb=35)
flute = song.track("尺八", program=77, role="sub", volume=95, pan=50, reverb=70)
strings = song.track("弦", program=49, role="other", volume=45, reverb=70)
bass = song.track("低弦", program=43, role="other", volume=80, reverb=40)
taiko = song.track("太鼓", program=116, role="other", volume=70, reverb=50)
tsubo = song.track("壺", drum=True, volume=80, reverb=40)

# 1〜8: 三味線が詰めて煽る
shami.add(parse(
    "| A4:1/2 C5:1/2 r:1/2 D5:1/2 E5:1 r:1 | G5:1/2 E5:1/2 D5:1/2 C5:1/2 A4:1 r:1 |"
    "| A4:1/2 C5:1/2 r:1/2 D5:1/2 E5:1 G5:1 | A5:1/2 G5:1/2 E5:1 r:2 |"
    "| E5:1/2 E5:1/2 r:1/2 D5:1/2 C5:1 D5:1 | E5:1/2 G5:1/2 E5:1/2 D5:1/2 C5:1 A4:1 |"
    "| C5:1/2 D5:1/2 E5:1/2 G5:1/2 A5:1 G5:1/2 E5:1/2 | A4:3 r:1 |"))
# 9〜16: 三味線は低く刻み、その合間に尺八の張り声
shami.put(song.bar(9), parse(
    "| A3:1/2 A3:1/2 r:1 A3:1/2 C4:1/2 r:1 | r:4 | E4:1/2 E4:1/2 r:1 E4:1/2 G4:1/2 r:1 | r:4 |"
    "| A3:1/2 A3:1/2 r:1 A3:1/2 C4:1/2 r:1 | r:4 | D4:1/2 D4:1/2 r:1 D4:1/2 E4:1/2 r:1 |"
    "| E4:1/2 G4:1/2 A4:1/2 C5:1/2 D5:1/2 E5:1/2 G5:1/2 E5:1/2 |"))
kakegoe = motif("ikka.kakegoe")
flute.put(song.bar(10), kakegoe.velocity(value=100))
flute.put(song.bar(12), parse("| E5:1 D5:1/2 C5:1/2 A4:2 |"))
flute.put(song.bar(14), kakegoe.velocity(value=105))
# 壺: 振る（マラカスの刻み）→ 伏せる（低い木）→ 間
SHAKE = "70:1/4@50 70:1/4@55 70:1/4@60 70:1/4@65 70:1/4@70 70:1/4@75 70:1/4@80 70:1/4@85 77:1@92 r:1"
tsubo.put(0, parse(f"| {SHAKE} | r:4 | {SHAKE} | r:4 |").repeat(4))
taiko.put(0, parse("| r:4 | D2:1@80 r:3 | r:4 | D2:1@85 r:1 D2:1/2@60 D2:1/2@65 D2:1@78 |").repeat(4))
bass.put(0, parse("| A1:1@85 r:1/2 A1:1/2@60 r:2 |").repeat(16))
strings.put(0, parse("| A2+E3:4~@40 | A2+E3:4@35 |").repeat(8))
song.end(song.bar(17))
