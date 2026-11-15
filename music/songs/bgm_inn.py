# 親分の屋敷・もぐりの宿で一泊。オルゴールが子守唄の頭と結びだけを鳴らす。ループしない。
from musiclib import *

song = Song("bgm_inn", tempo=66, meter="3/4", loop=False, title="一泊",
            about="短い子守唄。オルゴールのように小さく鳴って、眠りに落ちる")
box = song.track("オルゴール", program=10, role="main", volume=100, reverb=70)
koto = song.track("琴", program=107, role="other", volume=60, pan=50, reverb=70)

box.add(theme("komoriuta").bars(1, 2) + motif("komoriuta.nemure"))
koto.put(0, parse("| A3+E4:3 | D4+A4:3 | A3+E4:3 | A3+E4:3@50 |", meter="3/4"))
song.end(song.bar(5))
