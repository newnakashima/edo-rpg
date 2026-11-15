# 因縁の相手との決闘（朧、蛇骨の権六、夜叉丸、鬼塚典膳）。尺八の鋭い叫びと太鼓。
# 太鼓だけの前奏 → 尺八の A → 間合いを測る B（張り詰めた静けさ）→ 刃を交える C（三味線が刻み、金管が流れ者の主題の呼びかけで主人公の覚悟を鳴らす）→ 全員でぶつかる D と展開し、A へ戻る。
# 相手が 4 人いるので、特定の相手の主題は使わない。
from musiclib import *

song = Song("bgm_duel", tempo=126, meter="4/4", loop=True, title="決闘",
            about="尺八の鋭い叫びと太鼓。一対一の張り詰め")
flute = song.track("尺八", program=77, role="main", volume=110, reverb=60)
shami = song.track("三味線", program=106, role="main", volume=95, pan=72, reverb=30)
brass = song.track("金管", program=61, role="sub", volume=85, pan=40, reverb=50)
choir = song.track("声", program=52, role="other", volume=65, reverb=80)
strings = song.track("弦", program=48, role="other", volume=72, reverb=60)
bass = song.track("低弦", program=43, role="other", volume=88, reverb=30)
taiko = song.track("大太鼓", program=116, role="other", volume=95, reverb=60)
drum = song.track("締太鼓", program=117, role="other", volume=65, reverb=30)
cym = song.track("シンバル", program=0, role="other", drum=True, volume=70, reverb=60)

CH = {"Em": ("E", "G", "B"), "D": ("D", "F#", "A"), "C": ("C", "E", "G"), "Am": ("A", "C", "E"),
      "Bm": ("B", "D", "F#"), "E5": ("E", "B", "E"), "B5": ("B", "F#", "B"), "D5": ("D", "A", "D")}
def pad(chords, octave, vel):
    def voice(c):
        r, t, f = CH[c]
        return f"{r}{octave}+{f}{octave}+{t}{octave + 1}"
    return parse("".join(f"| {voice(c)}:4@{vel} " for c in chords) + "|")
def gallop(chords, vel):
    return parse("".join("| " + f"{CH[c][0]}1:1/2@{vel} {CH[c][0]}1:1/2@{vel - 25} {CH[c][0]}2:1/2@{vel - 10} {CH[c][0]}1:1/2@{vel - 25} " * 2 for c in chords) + "|")

MEL = ("| E5:3 G5:1 | F#5:2 E5:1 D5:1 | B4:2 E5:1 F#5:1 | G5:4 |"
       "| A5:3 G5:1 | F#5:2 D5:1 E5:1 | B4:1 D5:1 E5:1 F#5:1 | E5:4 |")
CH_MEL = ["Em", "D", "E5", "C", "Am", "D", "Bm", "E5"]

# 前奏（1〜2）: 太鼓が間を詰める。ループには含めない
taiko.put(0, parse("| E1:1@90 r:2 E1:1@85 | E1:1/2@90 E1:1/2@80 E1:1/2@95 E1:1/2@85 E1:1@110 r:1 |"))
strings.put(song.bar(2), parse("| E3+B3:4@60 |"))
song.loop_from(song.bar(3))

# A（3〜10）: 尺八が叫ぶ
A = song.bar(3)
flute.put(A, parse(MEL))
strings.put(A, pad(CH_MEL, 3, 62))
bass.put(A, gallop(CH_MEL, 88))
taiko.put(A, parse("| E1:1@100 r:1/2 E1:1/2@70 E1:1@90 r:1 |").repeat(8))
drum.put(A, parse("| B3:1/2@55 B3:1/2@40 B3:1/2@70 B3:1/2@40 |").repeat(16))
cym.put(A, parse("| 49:1@90 r:3 |"))

# B（11〜18）: 間合いを測る。太鼓は一打ずつ、弦が低く震え、尺八は高い音を引き延ばす
B = song.bar(11)
CH_B = ["E5", "E5", "B5", "B5", "E5", "E5", "E5", "E5"]
flute.put(B, parse("| B5:4~ | B5:2 A5:1 G5:1 | F#5:4~ | F#5:4 | G5:4~ | G5:2 A5:1 B5:1 | E6:4~ | E6:4 |").map(
    lambda n: Note(n.start, n.dur, n.pitches, 75 + int(n.start) // 2)))
strings.put(B, parse("".join("| " + f"{CH[c][0]}2:1/4 {CH[c][1]}2:1/4 " * 8 for c in CH_B) + "|").map(
    lambda n: Note(n.start, n.dur, n.pitches, 45 + int(n.start)))) 
bass.put(B, parse("".join(f"| {CH[c][0]}1:4@75 " for c in CH_B) + "|"))
taiko.put(B, parse("| E1:1@95 r:3 | r:4 | B0:1@90 r:3 | r:4 | E1:1@95 r:3 | r:2 E1:1@85 r:1 |"
                   "| E1:1/2@90 E1:1/2@75 E1:1/2@95 E1:1/2@80 E1:1/2@100 E1:1/2@85 E1:1/2@105 E1:1/2@90 |"
                   "| E1:1/4@100 E1:1/4@85 E1:1/4@105 E1:1/4@90 E1:1/4@110 E1:1/4@95 E1:1/4@115 E1:1/4@100 E1:1@110 |"))

# C（19〜26）: 刃を交える。三味線が刻み、金管が流れ者の呼びかけ（E の短調の高さへ）で覚悟を鳴らし、尺八が答える
C = song.bar(19)
CH_C = ["E5", "E5", "E5", "E5", "E5", "E5", "D5", "B5"]
RIFF = "| E4:1/2 E4:1/2 G4:1/2 E4:1/2 B4:1/2 E4:1/2 A4:1/2 G4:1/2 | E4:1/2 E4:1/2 G4:1/2 E4:1/2 B4:1/2 A4:1/2 G4:1/2 F#4:1/2 |"
shami.put(C, parse(RIFF).repeat(3) + parse("| D4:1/2 D4:1/2 F#4:1/2 D4:1/2 A4:1/2 D4:1/2 F#4:1/2 A4:1/2 | B3:1/2 B3:1/2 D4:1/2 B3:1/2 F#4:1/2 B3:1/2 D4:1/2 F#4:1/2 |"))
brass.put(C, motif("main.call").transpose(2).velocity(value=95))
flute.put(song.bar(21), parse("| B5:2 A5:1 G5:1 | F#5:2 E5:2 |"))
brass.put(song.bar(23), motif("main.call").transpose(2).velocity(value=105))
flute.put(song.bar(25), parse("| A5:2 F#5:1 A5:1 | B5:4 |"))
strings.put(C, pad(CH_C, 3, 70))
bass.put(C, gallop(CH_C, 95))
taiko.put(C, parse("| E1:1@105 E1:1/2@75 E1:1/2@75 E1:1@100 E1:1/2@75 E1:1/2@75 |").repeat(8))
drum.put(C, parse("| B3:1/2@65 B3:1/2@45 B3:1/2@75 B3:1/2@45 |").repeat(16))
cym.put(C, parse("| 49:1@95 r:3 |") + parse("| r:4 |").repeat(3) + parse("| 49:1@95 r:3 |"))

# D（27〜34）: 尺八と金管が同じ旋律で、声と弦が厚く支える
D = song.bar(27)
flute.put(D, parse(MEL).velocity(value=112))
brass.put(D, parse(MEL).octave(-1).velocity(value=92))
shami.put(D, parse("".join("| " + f"{CH[c][0]}4:1/2 {CH[c][2]}4:1/2 {CH[c][0]}5:1/2 {CH[c][2]}4:1/2 " * 2 for c in CH_MEL) + "|").velocity(value=72))
strings.put(D, pad(CH_MEL, 3, 75))
choir.put(D, pad(CH_MEL, 4, 58))
bass.put(D, gallop(CH_MEL, 100))
taiko.put(D, parse("| E1:1@110 E1:1/2@80 E1:1/2@80 E1:1@105 E1:1/2@80 E1:1/2@85 |").repeat(7)
          + parse("| E1:1/2@100 E1:1/2@90 E1:1/2@105 E1:1/2@95 E1:1@108 r:1 |"))
drum.put(D, parse("| B3:1/2@70 B3:1/2@50 B3:1/2@80 B3:1/2@50 |").repeat(16))
cym.put(D, parse("| 49:1@95 r:3 |") + parse("| r:4 |").repeat(3) + parse("| 49:1@100 r:3 |"))
song.end(song.bar(35))
