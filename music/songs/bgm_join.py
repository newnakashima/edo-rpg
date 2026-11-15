# 仲間が加わる・戻る。篠笛が流れ者の主題の「開け」を明るく吹き、三味線と琴、太鼓の合奏で頼もしく結ぶ。ループしない。
from musiclib import *

song = Song("bgm_join", tempo=120, meter="4/4", loop=False, title="仲間",
            about="短く明るい合奏。旅の道連れが増える頼もしさ")
fue = song.track("篠笛", program=73, role="main", volume=110, reverb=50)
shami = song.track("三味線", program=106, role="other", volume=80, pan=80, reverb=30)
koto = song.track("琴", program=107, role="other", volume=70, pan=40, reverb=40)
strings = song.track("弦", program=48, role="other", volume=80, reverb=60)
taiko = song.track("太鼓", program=116, role="other", volume=60, reverb=50)

# 主題の 9〜10 小節（F の長調の明るい開け）。和音は F → C → Dm・C → F
fue.add(motif("main.wide").velocity(scale=1.05))
fue.add(parse("| F5:1/2 G5:1/2 A5:1/2 C6:1/2 D6:1 C6:1 | F6:3@105 r:1 |"))
strings.add(parse("| F3+A3+C4:4 | C3+G3+E4:4 | D3+A3+F4:2 C3+G3+E4:2 | F3+C4+A4:3 r:1 |"))
koto.add(parse("| F3:1/2 C4:1/2 F4:1/2 A4:1/2 F3:1/2 C4:1/2 F4:1/2 A4:1/2 | C3:1/2 G3:1/2 C4:1/2 E4:1/2 C3:1/2 G3:1/2 C4:1/2 E4:1/2 |"
               "| D3:1/2 A3:1/2 D4:1/2 F4:1/2 C3:1/2 G3:1/2 C4:1/2 E4:1/2 | F3+C4+F4:3 r:1 |"))
shami.add(parse("| r:1 F4:1/2 A4:1/2 r:1 F4:1/2 A4:1/2 | r:1 E4:1/2 G4:1/2 r:1 E4:1/2 G4:1/2 | r:1 F4:1/2 A4:1/2 r:1 E4:1/2 G4:1/2 | F4+C5:1 r:3 |"))
taiko.add(parse("| F2:1@80 r:1 F2:1/2 F2:1/2 r:1 | C2:1 r:1 C2:1/2 C2:1/2 r:1 | D2:1/2 D2:1/2 D2:1 C2:1/2 C2:1/2 C2:1 | F2:1@95 r:3 |"))
song.end(song.bar(5))
