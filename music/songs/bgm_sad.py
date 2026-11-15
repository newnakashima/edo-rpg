# 悲しい場面・別れ。胡弓がひとりでお凛の慕う心の断片をゆっくり弾き、琴がそっと子守唄の結びを添える。
from musiclib import *

song = Song("bgm_sad", tempo=60, meter="4/4", loop=True, title="別れ",
            about="胡弓の独奏に、琴がそっと寄り添う。失ったものへの静かな弔い")
kokyu = song.track("胡弓", program=110, role="main", volume=100, reverb=90)
koto = song.track("琴", program=107, role="sub", volume=75, pan=40, reverb=80)
strings = song.track("弦", program=49, role="other", volume=50, reverb=90)

kokyu.add(parse("| A4:2 C5:1 B4:1 | A4:3 E4:1 | F4:1 A4:1 G4:1 E4:1 | D4:4 |"))
kokyu.add(motif("heroine.shitau").transpose(-10).map(lambda n: Note(n.start, n.dur, n.pitches, 85)))
kokyu.add(parse("| G4:1 A4:1 C5:1 B4:1 | A4:4 |"))
koto.put(song.bar(9), motif("komoriuta.nemure").stretch(Fraction(4, 3)).velocity(value=70))
kokyu.put(song.bar(11), parse("| r:2 E5:1 D5:1 | C5:2 B4:1 G#4:1 |"))
strings.put(0, parse("| A2+E3+C4:4 | F2+C3+A3:4 | D3+A3+F4:4 | D3+F3+A3:4 | F2+C3+A3:4 | A2+E3+C4:4 | D3+A3+F4:4 | A2+E3+C4:4 | A2+E3+C4:4 | D3+A3+F4:4 | A2+E3+C4:4 | E2+B2+G#3:4 |"))
koto.put(0, parse("| A3:1 r:3 | F3:1 r:3 | D3:1 r:3 | D3:1 r:3 | F3:1 r:3 | A3:1 r:3 | D3:1 r:3 | A3:1 r:3 |"))
song.end(song.bar(13))
