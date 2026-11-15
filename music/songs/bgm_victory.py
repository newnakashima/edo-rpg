# 戦闘の勝利。三味線が流れ者の主題の呼びかけを速く弾く、短いファンファーレ。ループしない。
from musiclib import *

song = Song("bgm_victory", tempo=132, meter="4/4", loop=False, title="勝利",
            about="三味線の短いファンファーレ。勝つたびに旅の主題の呼びかけを思い出させる")
shami = song.track("三味線", program=106, role="main", volume=115, reverb=40)
koto = song.track("琴", program=107, role="other", volume=55, pan=44, reverb=50)
strings = song.track("弦", program=48, role="other", volume=85, reverb=60)
taiko = song.track("太鼓", program=116, role="other", volume=50, reverb=50)

shami.add(motif("main.call").stretch(Fraction(1, 2)).velocity(scale=1.05))
shami.add(parse("| F5:1/2 E5:1/2 F5:1/2 A5:1/2 D6:2@100 | D6:3@95 r:1 |"))
koto.put(0, parse("| D4+A4:2 F4+C5:2 | F4+C5:2 A3+E4+A4:2 | Bb3+F4+Bb4:2 A3+E4+A4:2 | D4+A4+D5:3 r:1 |"))
taiko.put(0, parse("| D2:1@85 r:1 D2:1/2 D2:1/2 r:1 | D2:1 r:1 D2:1 r:1 | D2:1/2 D2:1/2 D2:1 D2:1/2 D2:1/2 D2:1 | D2:1@90 r:3 |"))
strings.put(0, parse("| D4+A4+D5:4 | F4+C5+F5:4 | Bb3+F4+D5:2 A3+E4+C#5:2 | D4+A4+D5:3 r:1 |"))
song.end(song.bar(5))
