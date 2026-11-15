# 章のボス・中ボス。激しい和太鼓に、尺八と三味線が斬り込む。ボスの多くが鷲尾の手先なので、からくりのゼンマイの断片が影のように鳴る。
# 太鼓だけの前奏 → 尺八の A → 三味線が刻み、半音上へずれて追い詰められる B → 静まって溜める C → 全員でぶつかる D と展開し、A へ戻る。
from musiclib import *

song = Song("bgm_boss", tempo=138, meter="4/4", loop=True, title="ボス戦",
            about="激しい和太鼓、緊張感。追い詰められ、溜めて、全員でぶつかる")
flute = song.track("尺八", program=77, role="main", volume=105, reverb=50)
shami = song.track("三味線", program=106, role="main", volume=100, pan=70, reverb=30)
brass = song.track("金管", program=61, role="sub", volume=85, pan=40, reverb=50)
choir = song.track("声", program=52, role="other", volume=70, reverb=80)
strings = song.track("弦", program=48, role="other", volume=75, reverb=50)
taiko = song.track("大太鼓", program=116, role="other", volume=95, reverb=60)
drum = song.track("締太鼓", program=117, role="other", volume=70, reverb=30)
bass = song.track("低弦", program=43, role="other", volume=90, reverb=30)
cym = song.track("シンバル", program=0, role="other", drum=True, volume=75, reverb=60)

CH = {"Em": ("E", "G", "B"), "Am": ("A", "C", "E"), "D": ("D", "F#", "A"), "G": ("G", "B", "D"),
      "B": ("B", "D#", "F#"), "C": ("C", "E", "G"), "F": ("F", "A", "C"), "E5": ("E", "B", "E")}

# 旋律の経過音が 3 度とこすれる和音は、3 度を抜いて根音と 5 度だけにする
OPEN = {"Em", "Am", "D"}

def pad(chords, octave, vel):
    def voice(c):
        r, t, f = CH[c]
        return f"{r}{octave}+{f}{octave}+{r}{octave + 1}" if c in OPEN else f"{r}{octave}+{f}{octave}+{t}{octave + 1}"
    return parse("".join(f"| {voice(c)}:4@{vel} " for c in chords) + "|")

def gallop(chords, vel):
    return parse("".join("| " + f"{CH[c][0]}1:1/2@{vel} {CH[c][0]}1:1/2@{vel - 25} {CH[c][0]}2:1/2@{vel - 10} {CH[c][0]}1:1/2@{vel - 25} " * 2 for c in chords) + "|")

MEL = ("| E5:2 G5:1 F#5:1 | E5:1 D5:1 B4:2 | E5:2 B5:1 A5:1 | G5:3 A5:1 |"
       "| E5:2 G5:1 A5:1 | B5:2 D6:1 B5:1 | A5:1 G5:1 F#5:1 D5:1 | E5:4 |")
CH_MEL = ["Em", "Em", "Am", "C", "Em", "G", "D", "Em"]

# 前奏（1〜4）: 太鼓だけで、だんだん詰めていく。ループには含めない
taiko.put(0, parse("| E1:1@80 r:1 E1:1@85 r:1 | E1:1@90 E1:1@80 E1:1@95 E1:1@85 |"
                   "| E1:1/2@95 E1:1/2@75 E1:1/2@95 E1:1/2@75 E1:1/2@100 E1:1/2@80 E1:1/2@100 E1:1/2@80 |"
                   "| E1:1/4@100 E1:1/4@80 E1:1/4@100 E1:1/4@80 E1:1/4@105 E1:1/4@85 E1:1/4@105 E1:1/4@85 E1:1/4@110 E1:1/4@90 E1:1/4@110 E1:1/4@90 E1:1@120 |"))
strings.put(song.bar(3), parse("| E3+B3:4@50 | E3+B3+E4:4@75 |"))
song.loop_from(song.bar(5))

# A（5〜12）: 尺八が斬り込む
A = song.bar(5)
flute.put(A, parse(MEL))
strings.put(A, pad(CH_MEL, 3, 62))
bass.put(A, gallop(CH_MEL, 90))
taiko.put(A, parse("| E1:1@100 r:1/2 E1:1/2@70 E1:1@90 E1:1/2@60 E1:1/2@60 |").repeat(8))
drum.put(A, parse("| B3:1/2@50 B3:1/2@40 B3:1/2@70 B3:1/2@40 |").repeat(16))
cym.put(A, parse("| 49:1@95 r:3 |"))

# B（13〜20）: 三味線が刻み、金管がゼンマイを巻く。後半は半音上（F）へずれて、追い詰められる
B = song.bar(13)
RIFF = ("| E4:1/2 E4:1/2 G4:1/2 E4:1/2 B4:1/2 E4:1/2 A4:1/2 G4:1/2 | F#4:1/2 G4:1/2 A4:1/2 B4:1/2 D5:2 |"
        "| E5:1/2 D5:1/2 B4:1/2 A4:1/2 G4:1/2 A4:1/2 B4:1 | E4:1/2 r:1/2 E4:1/2 r:1/2 E4:1 r:1 |")
shami.put(B, parse(RIFF) + parse(RIFF).transpose(1))
brass.put(B, motif("karakuri.zenmai").octave(-1).stretch(2).velocity(value=80))
brass.put(song.bar(17), motif("karakuri.zenmai").octave(-1).stretch(2).transpose(1).velocity(value=90))
strings.put(B, parse("| E3+B3:4@60 | E3+B3:4@62 | E3+B3:4@64 | E3+B3:4@66 | F3+C4:4@70 | F3+C4:4@72 | F3+C4:4@75 | F3+C4:4@78 |"))
bass.put(B, gallop(["E5"] * 4, 90) + gallop(["F"] * 4, 95))
taiko.put(B, parse("| E1:1@100 E1:1/2@70 E1:1/2@70 E1:1@95 E1:1/2@70 E1:1/2@70 |").repeat(4)
          + parse("| F1:1@105 F1:1/2@75 F1:1/2@75 F1:1@100 F1:1/2@75 F1:1/2@75 |").repeat(4))
drum.put(B, parse("| B3:1/2@60 B3:1/2@45 B3:1/2@75 B3:1/2@45 |").repeat(16))
cym.put(song.bar(17), parse("| 49:1@95 r:3 |"))

# C（21〜28）: 太鼓が引き、声と弦が静かに溜める。尺八が高く叫び、最後の 2 小節で一気に押し上げる
C = song.bar(21)
CH_C = ["Em", "Em", "Am", "Am", "G", "Am", "B", "B"]
flute.put(C, parse("| B5:4~ | B5:4 | C6:4~ | C6:4 | D6:4 | C6:4 | B5:4~ | B5:4 |").map(
    lambda n: Note(n.start, n.dur, n.pitches, 70 + int(n.start) // 2)))
choir.put(C, pad(CH_C, 3, 55).map(lambda n: Note(n.start, n.dur, n.pitches, 50 + int(n.start) // 2)))
strings.put(C, parse("".join("| " + f"{CH[c][0]}2:1/4 {CH[c][2]}2:1/4 " * 8 for c in CH_C) + "|").map(
    lambda n: Note(n.start, n.dur, n.pitches, 45 + int(n.start * 2) // 2)))
bass.put(C, parse("| E1:4@70 | E1:4@70 | A1:4@72 | A1:4@74 | G1:4@76 | A1:4@80 | B1:4@90 | B1:4@100 |"))
taiko.put(C, parse("| E1:1@80 r:3 | r:4 | A1:1@80 r:3 | r:4 | G1:1@85 r:3 | A1:1@85 r:1 A1:1@85 r:1 |"
                   "| B1:1/2@90 B1:1/2@75 B1:1/2@90 B1:1/2@75 B1:1/2@95 B1:1/2@80 B1:1/2@95 B1:1/2@80 |"
                   "| B1:1/4@95 B1:1/4@85 B1:1/4@100 B1:1/4@90 B1:1/4@105 B1:1/4@95 B1:1/4@110 B1:1/4@100 B1:1/4@115 B1:1/4@105 B1:1/4@120 B1:1/4@110 B1:1@125 |"))
brass.put(song.bar(27), parse("| B3+D#4+F#4:4@80 | B3+D#4+F#4:2@95 B3+D#4+F#4:1@105 B3+D#4+F#4:1@115 |"))

# D（29〜36）: 尺八と金管が同じ旋律で、三味線が刻み、全員でぶつかる。いちばん厚く
D = song.bar(29)
flute.put(D, parse(MEL).velocity(value=110))
brass.put(D, parse(MEL).octave(-1).velocity(value=95))
shami.put(D, parse("".join("| " + f"{CH[c][0]}4:1/2 {CH[c][2]}4:1/2 {CH[c][0]}5:1/2 {CH[c][2]}4:1/2 " * 2 for c in CH_MEL) + "|").velocity(value=75))
strings.put(D, pad(CH_MEL, 3, 75))
choir.put(D, pad(CH_MEL, 4, 60))
bass.put(D, gallop(CH_MEL, 100))
taiko.put(D, parse("| E1:1@110 E1:1/2@80 E1:1/2@80 E1:1@105 E1:1/2@80 E1:1/2@85 |").repeat(7)
          + parse("| E1:1/2@100 E1:1/2@90 E1:1/2@105 E1:1/2@95 E1:1@115 r:1 |"))
drum.put(D, parse("| B3:1/2@70 B3:1/2@50 B3:1/2@80 B3:1/2@50 |").repeat(16))
cym.put(D, parse("| 49:1@110 r:3 |") + parse("| r:4 |").repeat(3) + parse("| 49:1@100 r:3 |"))
song.end(song.bar(37))
