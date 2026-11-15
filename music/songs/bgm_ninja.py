# 伊賀者の里。尺八が低く、長く息を止めるような休みを挟んで吹く。琴がまばらにはじき、風が抜け、遠くで小さく太鼓。
# 霞の師・朧の里だが、人物の主題はないので新しく書く。音は D・E・F・A・Bb。低音は D だけにして、A と Bb のこすれを伴奏で作らない。
from musiclib import *

song = Song("bgm_ninja", tempo=66, meter="4/4", loop=True, title="伊賀者の里",
            about="忍びの里の、息を殺した静けさ")
flute = song.track("尺八", program=77, role="main", volume=105, reverb=90)
koto = song.track("琴", program=107, role="sub", volume=70, pan=36, reverb=70)
wind = song.track("風", program=121, role="other", volume=50, reverb=90)
strings = song.track("弦", program=49, role="other", volume=40, reverb=90)
bass = song.track("最低弦", program=43, role="other", volume=60, reverb=70)
taiko = song.track("太鼓", program=116, role="other", volume=50, reverb=90)
step = song.track("足音", program=115, role="other", volume=35, pan=90, reverb=50)

flute.add(parse(
    "| A4:3 r:1 | Bb4:1 A4:1 r:2 | D5:2 E5:1 F5:1 | E5:3 r:1 |"
    "| r:4 | F5:1 E5:1 D5:1 Bb4:1 | A4:4~ | A4:2 r:2 |"
    "| D5:2 r:1 E5:1 | F5:3 E5:1 | D5:1 E5:1/2 D5:1/2 Bb4:2 | A4:3 r:1 |"
    "| r:4 | E4:2 F4:1 E4:1 | D4:4~ | D4:2 r:2 |"))
# 琴: 尺八が休むところで、低くはじいて答える
koto.put(song.bar(5), parse("| D4:1/2@70 r:1/2 A4:1/2@60 r:1/2 Bb4:1/2@65 A4:1/2@60 r:1 |"))
koto.put(song.bar(8), parse("| r:2 F4:1/2@55 E4:1/2@55 D4:1 |"))
koto.put(song.bar(13), parse("| A4:1/2@70 r:1/2 F4:1/2@60 r:1/2 E4:1/2@65 D4:1/2@60 r:1 |"))
koto.put(song.bar(16), parse("| r:2 D4:1/2@55 E4:1/2@55 A3:1 |"))
wind.put(0, parse("| r:2 D4:2@40 | D4:4@50 | r:4 | r:4 |").repeat(4))
strings.put(0, parse("| D3:4~@40 | D3:4@35 |").repeat(8))
bass.put(0, parse("| D1:4~@60 | D1:4@50 |").repeat(8))
taiko.put(0, parse("| D2:1@60 r:3 | r:4 | r:2 D2:1/2@40 D2:1/2@50 r:1 | r:4 |").repeat(4))
step.put(0, parse("| r:4 | r:4 | r:4 | r:1 77:1/4@40 r:3/4 77:1/4@35 r:3/4 r:1 |").repeat(4))
song.end(song.bar(17))
