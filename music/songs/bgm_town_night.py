# 夜・夜明け前（鍵屋の辻）。篠笛がみやびの音（A・B・C・E・F）でぽつりぽつりと吹き、虫の音のような高いつま弾きと、遠い拍子木。
# 低音は A だけを据え、旋律とこすれさせない。夜の町の曲なので主題は使わず、新しく書く。
from musiclib import *

song = Song("bgm_town_night", tempo=66, meter="4/4", loop=True, title="夜",
            about="虫の音と篠笛。静かで少し不穏")
fue = song.track("篠笛", program=73, role="main", volume=90, reverb=90)
koto = song.track("琴", program=107, role="main", volume=85, pan=40, reverb=80)
bass = song.track("低弦", program=43, role="other", volume=55, reverb=80)
strings = song.track("弦", program=49, role="other", volume=40, reverb=90)
mushi = song.track("虫", program=108, role="other", volume=35, pan=90, reverb=60)
block = song.track("拍子木", program=115, role="other", volume=45, pan=20, reverb=100)
taiko = song.track("遠い太鼓", program=116, role="other", volume=40, reverb=100)

fue.add(parse(
    "| E5:3 F5:1 | E5:2 C5:1 B4:1 | A4:3 B4:1 | A4:4 |"
    "| C5:2 E5:1 F5:1 | A5:3 F5:1 | E5:2 C5:1 B4:1 | E5:4 |"))
koto.put(song.bar(9), parse(
    "| A5:2 F5:1 E5:1 | C5:3 B4:1 | C5:1 B4:1 A4:1 F4:1 | E4:4 |"
    "| F4:2 A4:1 B4:1 | C5:3 E5:1 | F5:2 E5:1 C5:1 | B4:2 A4:2 |"))
fue.put(song.bar(13), parse("| r:4 | r:2 A5:2@50 | r:4 | r:4 |"))
bass.put(0, parse("| A1:4~ | A1:4 |").repeat(8))
strings.put(0, parse("| A2+A3:4~@40 | A2+A3:4@35 |").repeat(8))
mushi.put(0, parse("| A6:1/4@40 A6:1/4@30 A6:1/4@40 A6:1/4@30 r:3 | r:2 E6:1/4@35 E6:1/4@25 E6:1/4@35 r:5/4 |").repeat(8))
block.put(0, parse("| r:4 | r:4 | r:4 | 76:1/2@70 r:1/2 76:1/2@60 r:5/2 |").repeat(4))
taiko.put(0, parse("| r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | A1:1@60 r:3 |").repeat(2))
song.end(song.bar(17))
