# 潜入（一座の工房、与力・黒田の屋敷）。はじく弦が抜き足のように小刻みに歩き、ときどき足を止める。中ほどで琴がからくりの歯車の刻みをひそかに鳴らす（鷲尾の手の者の屋敷）。
from musiclib import *

song = Song("bgm_sneak", tempo=100, meter="4/4", loop=True, title="潜入",
            about="抜き足の小刻みな拍。見つかれば終わりの緊張")
pizz = song.track("はじく弦", program=45, role="main", volume=100, pan=60, reverb=40)
koto = song.track("琴", program=107, role="sub", volume=65, pan=30, reverb=50)
flute = song.track("尺八", program=77, role="main", volume=70, reverb=90)
strings = song.track("弦", program=49, role="other", volume=45, reverb=80)
bass = song.track("最低弦", program=43, role="other", volume=70, reverb=50)
block = song.track("足音", program=115, role="other", volume=45, pan=80, reverb=40)

P1 = ("| E4:1/2 r:1/2 G4:1/2 r:1/2 F#4:1/2 r:1/2 E4:1/2 r:1/2 | B3:1/2 r:1/2 B3:1/2 r:1/2 r:2 |"
      "| E4:1/2 r:1/2 G4:1/2 r:1/2 A4:1/2 r:1/2 B4:1/2 r:1/2 | A4:1/2 G4:1/2 F#4:1/2 r:1/2 r:2 |")
P2 = ("| G4:1/2 r:1/2 B4:1/2 r:1/2 C5:1/2 r:1/2 B4:1/2 r:1/2 | A4:1/2 r:1/2 F#4:1/2 r:1/2 r:2 |"
      "| E4:1/2 r:1/2 F#4:1/2 G4:1/2 A4:1/2 r:1/2 B4:1/2 r:1/2 | E4:1/2 r:1/2 r:3 |")
pizz.put(0, parse(P1 + P2))
# 9〜12: 足を止め、琴の歯車の刻みだけがひそかに鳴る
koto.put(song.bar(9), motif("karakuri.haguruma").octave(-1).velocity(value=60) + parse("| r:4 |")
         + motif("karakuri.haguruma").octave(-1).velocity(value=65) + parse("| r:4 |"))
pizz.put(song.bar(10), parse("| r:2 B3:1/2 r:1/2 B3:1/2 r:1/2 | r:4 | r:2 E4:1/2 r:1/2 G4:1/2 r:1/2 |"))
# 13〜16: また歩き出し、尺八が低く息を吐く
pizz.put(song.bar(13), parse(P2).velocity(scale=0.9))
flute.put(song.bar(13), parse("| E4:4~ | E4:2 r:2 | B3:4~ | B3:2 r:2 |"))
strings.put(0, parse("| E3+B3:4~@40 | E3+B3:4@35 |").repeat(8))
bass.put(0, parse("| E1:1@80 r:1/2 E1:1/2@60 r:2 |").repeat(16))
block.put(0, parse("| r:1/2 77:1/4@50 r:1/4 r:1 r:1/2 77:1/4@40 r:1/4 r:1 |").repeat(16))
song.end(song.bar(17))
