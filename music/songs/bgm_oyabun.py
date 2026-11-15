# 親分の屋敷。低い三味線が一家の主題（短調）を腰を据えて弾き、後半は尺八が受け継ぐ。清水湊（bgm_home）より遅く、重く、太鼓を一打ずつ置く。
from musiclib import *

song = Song("bgm_oyabun", tempo=76, meter="4/4", loop=True, title="親分の屋敷",
            about="低い三味線。任侠の義理と、腰を据えた重み")
shami = song.track("三味線", program=106, role="main", volume=105, pan=55, reverb=40)
flute = song.track("尺八", program=77, role="main", volume=95, reverb=80)
strings = song.track("弦", program=49, role="other", volume=55, reverb=70)
bass = song.track("低弦", program=43, role="other", volume=75, reverb=50)
taiko = song.track("大太鼓", program=116, role="other", volume=60, reverb=70)
block = song.track("拍子木", program=115, role="other", volume=45, pan=25, reverb=60)

# 和音は一家の主題の旋律の音から（bgm_home と同じ選び方）。"E5"・"D5" は 3 度を抜いた響き、"D/E" は前半 D・後半 E
CH = ["A", "E5", "D5", "A", "A", "C", "D/E", "A"]
PADS = {"E5": "E3+B3+E4", "D5": "D3+A3+D4", "A": "A2+E3+A3", "E": "E3+G#3+B3", "D": "D3+F3+A3", "C": "C3+G3+C4"}
LOWS = {"E5": "E1", "D5": "D1", "A": "A1", "E": "E1", "D": "D1", "C": "C2"}
def halves(c):
    return c.split("/") if "/" in c else [c]
def pad(cs, v):
    return parse("".join("| " + " ".join(f"{PADS[h]}:{4 // len(halves(c))}@{v}" for h in halves(c)) + " " for c in cs) + "|")
def low(cs):
    return parse("".join("| " + " ".join(f"{LOWS[h]}:{4 // len(halves(c))}" for h in halves(c)) + " " for c in cs) + "|")

# 前奏（1〜2）: 太鼓と、低い三味線の足取り
taiko.put(0, parse("| A1:1@80 r:3 | A1:1@70 r:1 A1:1@60 r:1 |"))
shami.put(0, parse("| r:4 | r:2 E3:1 A3:1 |"))
strings.put(0, pad(["A", "A"], 40))
song.loop_from(song.bar(3))
# A（3〜10）: 三味線が 1 オクターブ下で一家の主題
shami.put(song.bar(3), theme("ikka").octave(-1))
# B（11〜18）: 尺八が受け継ぎ、三味線は和音をつま弾く
flute.put(song.bar(11), theme("ikka").velocity(scale=0.95))
def pluck(cs):
    out = ""
    for c in cs:
        a, b = (PADS[h].split("+") for h in (halves(c)[0], halves(c)[-1]))
        out += f"| r:1 {a[1]}:1/2 {a[2]}:1/2 r:1 {b[1]}:1 "
    return parse(out + "|")
shami.put(song.bar(11), pluck(CH).velocity(value=65))
# 結び（19〜20）: 三味線が結びを低く返す
shami.put(song.bar(19), motif("ikka.irori").octave(-1).velocity(scale=0.9))
for at in (3, 11):
    strings.put(song.bar(at), pad(CH, 50))
    bass.put(song.bar(at), low(CH))
strings.put(song.bar(19), pad(["D/E", "A"], 45))
bass.put(song.bar(19), low(["D/E", "A"]))
taiko.put(song.bar(3), parse("| A1:1@75 r:3 | r:4 |").repeat(9))
block.put(song.bar(3), parse("| r:4 | r:4 | r:4 | r:2 76:1/2@70 r:1/2 76:1/2@55 r:1/2 |").repeat(4) + parse("| r:4 | r:4 |"))
song.end(song.bar(21))
