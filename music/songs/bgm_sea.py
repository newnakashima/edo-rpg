# 北前船の甲板・屋形。3 拍子で揺れる船歌を尺八が歌い、櫓の拍子と波の音。後半は琴が流れ者の主題の呼びかけを 3 拍子に組み直して弾く（旅の続き）。
from musiclib import *

song = Song("bgm_sea", tempo=76, meter="3/4", loop=True, title="北前船",
            about="波と櫓の拍子、船歌。広い海と少しの心細さ")
flute = song.track("尺八", program=77, role="main", volume=100, reverb=80)
koto = song.track("琴", program=107, role="sub", volume=85, pan=44, reverb=60)
strings = song.track("弦", program=49, role="other", volume=55, reverb=80)
bass = song.track("低弦", program=43, role="other", volume=65, reverb=60)
ro = song.track("櫓", program=115, role="other", volume=55, pan=84, reverb=50)
wave = song.track("波", program=122, role="other", volume=55, reverb=40)

def refit(p, durs):
    """音の並びを残して、リズムを 3 拍子に組み直す。"""
    p = p.copy()
    t = Fraction(0)
    for n, d in zip(p.notes, durs):
        n.start, n.dur = t, Fraction(d)
        t += Fraction(d)
    p.length = t
    p.sources = [[name, Fraction(0), t, src, k] for name, a, ln, src, k in p.sources]
    p.bar_starts = []
    return p

SONG1 = ("| D5:2 F5:1 | G5:2 A5:1 | C6:2 A5:1 | G5:3 |"
         "| A5:2 G5:1 | F5:1 G5:1 F5:1 | D5:3~ | D5:3 |")
SONG2 = ("| F5:2 G5:1 | A5:2 C6:1 | D6:2 C6:1 | A5:3 |"
         "| G5:2 A5:1 | F5:1 D5:1 C5:1 | D5:3~ | D5:3 |")
# 和音は旋律の音から（3 度を抜いた響きにして、旋律の経過音とこすれないようにする）
CH1 = ["D", "D", "F", "C", "D", "D", "D", "D"]
CH2 = ["D", "F", "D", "A", "C", "D", "D", "D"]
CH3 = ["D", "D", "D", "D", "D", "D", "C", "D"]
VO = {"D": "D3+A3+D4", "F": "F3+C4+F4", "C": "C3+G3+C4", "A": "A2+E3+A3"}
LO = {"D": "D2", "F": "F2", "C": "C2", "A": "A1"}
def pad(cs, v):
    return parse("".join(f"| {VO[c]}:3@{v} " for c in cs) + "|", "3/4")
def low(cs):
    return parse("".join(f"| {LO[c]}:2 {LO[c]}:1 " for c in cs) + "|", "3/4")

flute.put(0, parse(SONG1, "3/4"))
flute.put(song.bar(9), parse(SONG2, "3/4"))
call = refit(motif("main.call"), [1, 1, 1, 2, 1, 2, 1])  # A4 D5 E5 F5 E5 D5 A4
koto.put(song.bar(17), call + parse("| D5:3 |", "3/4"))
koto.put(song.bar(21), call.octave(1).velocity(scale=0.9) + parse("| D6:2 r:1 |", "3/4"))
flute.put(song.bar(17), parse("| r:3 | r:3 | A4:3~ | A4:3 | r:3 | r:3 | D5:3~ | D5:3 |", "3/4").velocity(value=60))
strings.put(0, pad(CH1 + CH2 + CH3, 50))
bass.put(0, low(CH1 + CH2 + CH3))
ro.put(0, parse("| 72:1@80 r:1 72:1/2@50 r:1/2 |", "3/4").repeat(24))
wave.put(0, parse("| 60:3~@50 | 60:3@40 | 60:3~@55 | 60:3@40 |", "3/4").repeat(6))
song.end(song.bar(25))
