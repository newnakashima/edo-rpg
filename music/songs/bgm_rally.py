# 味方が駆けつける・反撃に転じる（終章の御金蔵・大奥の口・将軍の間の手前）。太鼓が高まり、流れ者の主題が力強く鳴る。
# 太鼓の前奏 → 尺八が主題の前半 A → 金管と声が主題の後半 B と高まり、A へ戻る。和音は街道（bgm_road）と同じく旋律の音から選び、根音と 5 度の力強い響きにする。
from musiclib import *

song = Song("bgm_rally", tempo=116, meter="4/4", loop=True, title="反撃",
            about="太鼓が高まり、主題が力強く鳴る。仲間が駆けつける頼もしさ")
flute = song.track("尺八", program=77, role="main", volume=110, reverb=60)
brass = song.track("金管", program=61, role="main", volume=100, pan=45, reverb=60)
shami = song.track("三味線", program=106, role="other", volume=75, pan=78, reverb=30)
choir = song.track("声", program=52, role="other", volume=65, reverb=80)
strings = song.track("弦", program=48, role="other", volume=72, reverb=60)
bass = song.track("低弦", program=43, role="other", volume=88, reverb=30)
taiko = song.track("大太鼓", program=116, role="other", volume=95, reverb=60)
drum = song.track("締太鼓", program=117, role="other", volume=70, reverb=30)
cym = song.track("シンバル", program=0, role="other", drum=True, volume=70, reverb=60)

FIF = {"D": ("D", "A"), "A": ("A", "E"), "F": ("F", "C"), "C": ("C", "G"), "G": ("G", "D"), "Bb": ("Bb", "F")}
CH_A = ["D", "A", "F", "C", "D", "G", "F", "D"]
CH_B = ["F", "C", "D", "A", "D", "G", "A", "D"]
def power(chords, octave, vel):
    return parse("".join(f"| {FIF[c][0]}{octave}+{FIF[c][1]}{octave}+{FIF[c][0]}{octave + 1}:4@{vel} " for c in chords) + "|")
def drive(chords, vel):
    return parse("".join("| " + f"{FIF[c][0]}1:1/2@{vel} {FIF[c][0]}2:1/2@{vel - 20} " * 4 for c in chords) + "|")
def riff(chords):
    return parse("".join("| " + f"{FIF[c][0]}4:1/2 {FIF[c][1]}4:1/2 {FIF[c][0]}5:1/2 {FIF[c][1]}4:1/2 " * 2 for c in chords) + "|")

# 前奏（1〜2）: 太鼓が駆け上がる
taiko.put(0, parse("| D1:1/2@80 D1:1/2@70 D1:1/2@85 D1:1/2@75 D1:1/2@90 D1:1/2@80 D1:1/2@95 D1:1/2@85 |"
                   "| D1:1/4@95 D1:1/4@85 D1:1/4@100 D1:1/4@90 D1:1/4@105 D1:1/4@95 D1:1/4@110 D1:1/4@100 D1:1@120 r:1 |"))
strings.put(0, parse("| D3+A3:4@55 | D3+A3+D4:4@75 |"))
song.loop_from(song.bar(3))

# A（3〜10）: 尺八が主題の前半を力強く
A = song.bar(3)
flute.put(A, theme("main").bars(1, 8).velocity(value=108))
strings.put(A, power(CH_A, 3, 68))
shami.put(A, riff(CH_A).velocity(value=62))
bass.put(A, drive(CH_A, 92))
taiko.put(A, parse("| D1:1@105 r:1/2 D1:1/2@75 D1:1@95 D1:1/2@75 D1:1/2@75 |").repeat(8))
drum.put(A, parse("| A3:1/2@60 A3:1/2@45 A3:1/2@70 A3:1/2@45 |").repeat(16))
cym.put(A, parse("| 49:1@95 r:3 |"))

# B（11〜18）: 金管と声が主題の後半。いちばん高まる
B = song.bar(11)
brass.put(B, theme("main").bars(9, 16).velocity(value=110))
flute.put(B, theme("main").bars(9, 16).octave(1).velocity(value=95))
strings.put(B, power(CH_B, 3, 78))
choir.put(B, power(CH_B, 4, 62))
shami.put(B, riff(CH_B).velocity(value=70))
bass.put(B, drive(CH_B, 100))
taiko.put(B, parse("| D1:1@115 D1:1/2@85 D1:1/2@85 D1:1@105 D1:1/2@85 D1:1/2@90 |").repeat(7)
          + parse("| D1:1/2@100 D1:1/2@90 D1:1/2@105 D1:1/2@95 D1:1@115 r:1 |"))
drum.put(B, parse("| A3:1/2@70 A3:1/2@50 A3:1/2@80 A3:1/2@50 |").repeat(16))
cym.put(B, parse("| 49:1@105 r:3 |") + parse("| r:4 |").repeat(3) + parse("| 49:1@100 r:3 |"))
song.end(song.bar(19))
