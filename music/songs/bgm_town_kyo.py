# 京。篠笛が都のみやびな音（E・F・A・B・C）で歌い、後半は琴が受ける。低音は A を据え、後半の終わりで F へ沈んで鬼の噂の翳りをのぞかせる。
# 都の町の人々の曲なので主題は使わず、新しく書く。
from musiclib import *

song = Song("bgm_town_kyo", tempo=88, meter="4/4", loop=True, title="京",
            about="雅な琴と篠笛。都の華やかさの陰に、鬼の噂の翳り")
fue = song.track("篠笛", program=73, role="main", volume=95, reverb=70)
koto = song.track("琴", program=107, role="main", volume=95, pan=44, reverb=60)
harp = song.track("つま弾き", program=46, role="other", volume=60, pan=80, reverb=60)
bass = song.track("低弦", program=43, role="other", volume=60, reverb=60)
bell = song.track("鈴", program=112, role="other", volume=45, pan=64, reverb=80)
tsuzumi = song.track("鼓", program=117, role="other", volume=55, pan=30, reverb=50)

fue.add(parse(
    "| E5:1 F5:1 A5:2 | B5:1 A5:1/2 F5:1/2 E5:2 | A5:1 B5:1 C6:1 B5:1 | A5:3 r:1 |"
    "| C6:1 B5:1/2 A5:1/2 F5:1 E5:1 | F5:1 A5:1 B5:2 | A5:1 F5:1 E5:1 C5:1 | E5:3 r:1 |"))
koto.put(song.bar(9), parse(
    "| A4:1/2 B4:1/2 C5:1 E5:1 F5:1 | E5:1 C5:1 B4:2 | A4:1 B4:1/2 C5:1/2 E5:1 B4:1 | A4:3 r:1 |"
    "| F4:1 A4:1 B4:1 C5:1 | B4:1 A4:1/2 F4:1/2 E4:2 | F4:1 A4:1 B4:1 F4:1 | E4:3 r:1 |"))
fue.put(song.bar(9), parse("| r:4 | r:2 E6:2~ | E6:2 r:2 | r:4 | r:4 | r:4 | r:4 | r:4 |").velocity(value=55))
# 低音: 旋律の音とこすれないよう、A（と結びの E）だけを鳴らす。13・15 小節目は F に沈む
ROOTS = ["A", "A", "A", "A", "A", "A", "A", "E", "A", "A", "A", "A", "F", "E", "F", "E"]
bass.put(0, parse("".join(f"| {r}1:4 " for r in ROOTS) + "|"))
harp.put(0, parse("".join(f"| {r}2:1/2 {r}3:1/2 r:1 {r}2:1/2 {r}3:1/2 r:1 " for r in ROOTS) + "|"))
bell.put(0, parse("| r:3 A6:1@50 | r:4 | r:4 | r:4 |").repeat(4))
tsuzumi.put(0, parse("| E4:1@70 r:1 r:1/2 E4:1/2@50 E4:1@60 | r:4 |").repeat(8))
song.end(song.bar(17))
