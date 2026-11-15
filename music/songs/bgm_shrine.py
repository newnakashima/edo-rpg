# 寺社（お祓い）。龍笛がゆっくり歌い、笙の持続音が包む。鈴が鳴り、遠くで読経と木魚が続く。
# 寺社の曲なので主題は使わず新しく書く。音は D・E・G・A・B だけにして、半音のこすれを作らない。
from musiclib import *

song = Song("bgm_shrine", tempo=60, meter="4/4", loop=True, title="寺社",
            about="鈴と笙、遠い読経。静かで清らか")
fue = song.track("龍笛", program=73, role="main", volume=95, reverb=100)
sho = song.track("笙", program=109, role="other", volume=45, reverb=100)
chant = song.track("読経", program=53, role="other", volume=45, pan=40, reverb=100)
mokugyo = song.track("木魚", program=115, role="other", volume=35, pan=40, reverb=80)
suzu = song.track("鈴", program=112, role="other", volume=55, pan=84, reverb=90)
bass = song.track("低弦", program=43, role="other", volume=45, reverb=90)

fue.add(parse(
    "| A5:3 B5:1 | A5:2 G5:1 E5:1 | D5:4~ | D5:2 r:2 |"
    "| E5:2 G5:2 | A5:3 B5:1 | D6:2 B5:1 A5:1 | A5:3 r:1 |"
    "| B5:3 A5:1 | G5:2 E5:2 | G5:1 A5:1 G5:1 E5:1 | D5:3 r:1 |"
    "| E5:2 D5:1 B4:1 | D5:4~ | D5:2 E5:2 | D5:3 r:1 |"))
# 笙: D・A・E と G・D・A の 2 つの響きを、ゆっくり入れ替える
sho.put(0, parse("| D4+A4+E5:4~@50 | D4+A4+E5:4@45 | G4+D5+A5:4~@50 | G4+D5+A5:4@45 |").repeat(4))
chant.put(0, parse("| D3:1@50 D3:1@45 D3:1@48 D3:1/2@44 D3:1/2@42 | D3:1@48 D3:1@44 A2:2@46 |").repeat(8))
mokugyo.put(0, parse("| 72:1@50 72:1@40 72:1@45 72:1@40 |").repeat(16))
suzu.put(0, parse("| A6:1/4@60 A6:1/4@50 A6:1/4@55 A6:1/4@45 r:3 | r:4 | r:4 | r:4 |").repeat(4))
bass.put(0, parse("| D2:4~@50 | D2:4@45 | G1:4~@50 | G1:4@45 |").repeat(4))
song.end(song.bar(17))
