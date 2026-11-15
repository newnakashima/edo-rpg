# 鷲尾但馬守宗衡との戦い。黒幕の威圧。金管が低くからくりの主題を鳴らし、尺八が抗う。
# 前奏 → 金管のからくりの主題 A → 尺八が抗う B（琴が歯車を刻む）→ ゼンマイが静かに巻かれる C（篠笛が流れ者の「開け」を E の長調で吹き、押し返す）→ 声と全員で主題を押し付ける D と展開し、A へ戻る。
# からくりの主題の半音の動きは、冷たさのために残す（からくり系の曲と同じ）。
from musiclib import *

song = Song("bgm_washio", tempo=108, meter="4/4", loop=True, title="鷲尾",
            about="黒幕の威圧。からくりの主題が重く鳴る")
brass = song.track("金管", program=61, role="main", volume=105, pan=50, reverb=60)
flute = song.track("尺八", program=77, role="main", volume=108, reverb=70)
fue = song.track("篠笛", program=73, role="sub", volume=95, pan=80, reverb=70)
koto = song.track("琴", program=107, role="sub", volume=75, pan=30, reverb=40)
choir = song.track("声", program=52, role="other", volume=75, reverb=90)
strings = song.track("弦", program=48, role="other", volume=72, reverb=60)
bass = song.track("最低弦", program=43, role="other", volume=90, reverb=40)
timp = song.track("ティンパニ", program=47, role="other", volume=85, reverb=70)
taiko = song.track("大太鼓", program=116, role="other", volume=90, reverb=70)
block = song.track("拍子木", program=115, role="other", volume=65, pan=25, reverb=40)

# からくり屋敷（bgm_karakuri）と同じ低音の刻み。E の小節は E と Bb、F の小節は F と B
UPPER = {"E": "Bb1", "F": "B1"}
def kbass(roots):
    return parse("".join(f"| {r}1:1/2 r:1/2 {r}1:1/2 r:1/2 {r}1:1/2 r:1/2 {UPPER[r]}:1/2 r:1/2 " for r in roots) + "|")
ROOTS_THEME = ["E", "E", "F", "E", "E", "E", "E", "E"]

# 前奏（1〜2）: ティンパニと低い声
timp.put(0, parse("| E2:1/4@90 E2:1/4@80 E2:1/4@90 E2:1/4@85 E2:1/4@95 E2:1/4@85 E2:1/4@100 E2:1/4@90 r:2 | E2:1/4@95 E2:1/4@85 E2:1/4@100 E2:1/4@90 E2:1/4@105 E2:1/4@95 E2:1/4@110 E2:1/4@100 E2:1@120 r:1 |"))
choir.put(0, parse("| E3+E4:4@60 | E3+E4:4@80 |"))
song.loop_from(song.bar(3))

# A（3〜10）: 金管が低くからくりの主題
A = song.bar(3)
brass.put(A, theme("karakuri").octave(-1))
bass.put(A, kbass(ROOTS_THEME))
taiko.put(A, parse("| E1:1@105 r:1 E1:1@90 r:1 |").repeat(8))
block.put(A, parse("| 76:1/2@80 r:1/2 76:1/2@55 r:1/2 76:1/2@75 r:1/2 76:1/2@55 r:1/2 |").repeat(8))
choir.put(A, parse("| E3+E4:4@55 | E3+E4:4@55 | F3+F4:4@60 | E3+E4:4@60 | E3+E4:4@55 | E3+E4:4@55 | E3+E4:4@60 | E3+E4:4@65 |"))

# B（11〜18）: 尺八が抗い、琴が歯車を刻む。和音は旋律の音から（"5" は 3 度を抜いた響き）
B = song.bar(11)
MEL_B = ("| E5:2 G5:1 B5:1 | A5:2 G5:1 F#5:1 | G5:2 E5:1 G5:1 | F#5:4 |"
         "| E5:2 G5:1 B5:1 | C6:2 B5:1 A5:1 | B5:2 A5:1 F#5:1 | E5:4 |")
CH_B = [("E", "B", "G"), ("A", "E", "C"), ("E", "B", "G"), ("B", "F#", None), ("E", "B", "G"), ("A", "E", None), ("B", "F#", None), ("E", "B", None)]
flute.put(B, parse(MEL_B))
# 歯車（Bb を含む）は E の和音の小節だけに置き、その小節の和音から B を抜いて、半音で並ばないようにする
for i, (r, f, t) in enumerate(CH_B):
    if r == "E":
        koto.put(B + 4 * i, motif("karakuri.haguruma").octave(-1).velocity(value=70))
strings.put(B, parse("".join((f"| E3+E4+G4:4@65 " if r == "E" else f"| {r}3+{f}3" + (f"+{t}4" if t else "") + ":4@65 ") for r, f, t in CH_B) + "|"))
bass.put(B, parse("".join(f"| {r}1:1/2 r:1/2 {r}1:1/2 r:1/2 {r}1:1/2 {r}1:1/2 {r}2:1/2 r:1/2 " for r, f, t in CH_B) + "|"))
taiko.put(B, parse("| E1:1@100 r:1/2 E1:1/2@75 E1:1@90 E1:1/2@70 E1:1/2@70 |").repeat(8))

# C（19〜26）: 静まり、低い声がゼンマイを巻く。篠笛が流れ者の「開け」を E の長調で吹いて押し返す
C = song.bar(19)
brass.put(C, motif("karakuri.zenmai").octave(-1).stretch(2).velocity(value=80) + parse("| r:4 | r:4 |"))
choir.put(C, parse("| E3+E4:4@45 | E3+E4:4@40 | r:4 | r:4 |"))
timp.put(C, parse("| E2:1@80 r:3 | r:4 | E2:1@70 r:3 | r:2 E2:1/2@70 E2:1/2@75 E2:1@85 |"))
strings.put(C, parse(("| " + "E2+E3:1/4 " * 16) * 4 + "|").map(lambda n: Note(n.start, n.dur, n.pitches, 40 + int(n.start) * 2)))
bass.put(C, parse("| E1:4~@70 | E1:4@70 | E1:4~@75 | E1:4@80 |"))
fue.put(song.bar(23), motif("main.wide").transpose(-1).velocity(value=95))
strings.put(song.bar(23), parse("| E3+B3+G#4:4@60 | B2+F#3+D#4:4@65 |"))
bass.put(song.bar(23), parse("| E1:4@75 | B0:4@80 |"))
flute.put(song.bar(25), parse("| B5:4~ | B5:4 |").map(lambda n: Note(n.start, n.dur, n.pitches, 90)))
strings.put(song.bar(25), parse("| B2+F#3+B3:4@70 | B2+F#3+B3:4@85 |"))
timp.put(song.bar(25), parse("| B1:1/2@85 B1:1/2@75 B1:1/2@90 B1:1/2@80 B1:1/2@95 B1:1/2@85 B1:1/2@100 B1:1/2@90 |"
                             "| B1:1/4@100 B1:1/4@90 B1:1/4@105 B1:1/4@95 B1:1/4@110 B1:1/4@100 B1:1/4@115 B1:1/4@105 B1:1@125 r:1 |"))

# D（27〜34）: 金管と琴が、声と弦の厚みの上でからくりの主題を押し付ける
D = song.bar(27)
brass.put(D, theme("karakuri").octave(-1).velocity(scale=1.1))
koto.put(D, theme("karakuri").velocity(value=80))  # 琴が 1 オクターブ上で金管をなぞる
strings.put(D, parse("| E2+E3:4@65 | E2+E3:4@65 | F2+F3:4@70 | E2+E3:4@70 | E2+E3:4@65 | E2+E3:4@65 | E2+E3:4@70 | E2+E3:4@75 |"))
choir.put(D, parse("| E3+E4:4@70 | E3+E4:4@70 | F3+F4:4@75 | E3+E4:4@75 | E3+E4:4@70 | E3+E4:4@70 | E3+E4:4@75 | E3+E4:4@80 |"))
bass.put(D, kbass(ROOTS_THEME))
taiko.put(D, parse("| E1:1@115 E1:1/2@85 E1:1/2@85 E1:1@105 E1:1/2@85 E1:1/2@85 |").repeat(8))
block.put(D, parse("| 76:1/2@85 r:1/2 76:1/2@60 r:1/2 76:1/2@80 r:1/2 76:1/2@60 r:1/2 |").repeat(8))
song.end(song.bar(35))
