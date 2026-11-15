# 清水湊。港町の朝に、一家の主題（短調）を琴が弾き、後半は尺八が受け継ぐ。お凛の出だしが副旋律でのぞく。
from musiclib import *

song = Song("bgm_home", tempo=88, meter="4/4", loop=True, title="清水湊",
            about="港町の朝。日陰者の一家の温かさと、帰る場所の懐かしさ")
koto = song.track("琴", program=107, role="main", volume=100, pan=50, reverb=50)
flute = song.track("尺八", program=77, role="main", volume=100, reverb=70)
fue = song.track("篠笛", program=73, role="sub", volume=80, pan=80, reverb=60)
shami = song.track("三味線", program=106, role="other", volume=70, pan=30, reverb=30)
strings = song.track("弦", program=49, role="other", volume=55, reverb=70)
bass = song.track("低弦", program=43, role="other", volume=70, reverb=40)

# 和音は一家の主題の旋律の音から選ぶ。"D/E" は小節の前半が D、後半が E。"E5"・"D5" は 3 度を抜いた響き（旋律とこすれないように）
chords = ["A", "E5", "D5", "A", "A", "C", "D/E", "A"]
pads = {"E5": "E3+B3+E4", "D5": "D3+A3+D4", "A": "A3+C4+E4", "E": "E3+G#3+B3", "D": "D3+F3+A3", "C": "C3+E3+G3", "F": "F3+A3+C4"}
lows = {"E5": "E2", "D5": "D2", "A": "A1", "E": "E2", "D": "D2", "C": "C2", "F": "F2"}
def halves(c):
    return c.split("/") if "/" in c else [c]
def pad(cs, v):
    out = ""
    for c in cs:
        hs = halves(c)
        out += "| " + " ".join(f"{pads[h]}:{4 // len(hs)}@{v}" for h in hs) + " "
    return parse(out + "|")
def walk(cs):
    out = ""
    for c in cs:
        hs = halves(c)
        out += ("| " + " ".join(f"{lows[h]}:1 {lows[h]}:1" for h in hs) + " ") if len(hs) == 2 else f"| {lows[c]}:3/2 {lows[c]}:1/2 {lows[c]}:1 r:1 "
    return parse(out + "|")
def pluck(cs):
    out = ""
    for c in cs:
        hs = halves(c)
        if len(hs) == 2:
            a, b = (pads[h].split("+") for h in hs)
            out += f"| r:1 {a[1]}:1/2 {a[2]}:1/2 r:1 {b[1]}:1 "
        else:
            n = pads[c].split("+")
            out += f"| r:1 {n[1]}:1/2 {n[2]}:1/2 r:1 {n[1]}:1 "
    return parse(out + "|")

# 前奏（1〜2）: 波のような弦と、三味線のつま弾き
strings.put(0, pad(["A", "A"], 45))
shami.put(0, pluck(["A", "A"]))
song.loop_from(song.bar(3))
# A（3〜10）: 琴が一家の主題
koto.put(song.bar(3), theme("ikka"))
strings.put(song.bar(3), pad(chords, 50))
bass.put(song.bar(3), walk(chords))
shami.put(song.bar(3), pluck(chords))
# B（11〜18）: 尺八が主題を受け継ぎ、篠笛がお凛の出だしで答える
flute.put(song.bar(11), theme("ikka").bars(1, 4))
fue.put(song.bar(15), motif("heroine.kiai").transpose(-7).velocity(scale=0.85))
flute.put(song.bar(16), parse("| A5:2 G5:1 E5:1 |"))
flute.put(song.bar(17), motif("ikka.irori"))
koto.put(song.bar(11), pluck(chords).octave(1).velocity(scale=0.8))
strings.put(song.bar(11), pad(chords, 58))
bass.put(song.bar(11), walk(chords))
# 結び（19〜20）: 琴が足取りを返して前奏の静けさへ
koto.put(song.bar(19), motif("ikka.ashidori").velocity(scale=0.8) + parse("| A4:2 E4:2 |"))
strings.put(song.bar(19), pad(["A", "A"], 45))
bass.put(song.bar(19), parse("| A1:4 | A1:4 |"))
song.end(song.bar(21))
