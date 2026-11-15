# 通常戦闘。速い三味線と太鼓。何度も聞く曲なので主題を擦り減らさないよう新しく書く。
# 斬り結ぶ A → 篠笛が高く舞う B → 太鼓が引いて下から押し上げる C → 全員でぶつかる A' と展開し、A へ戻る。
from musiclib import *

song = Song("bgm_battle", tempo=152, meter="4/4", loop=True, title="戦闘",
            about="速い三味線と太鼓。斬り結ぶ勢いから、溜めて、全員でぶつかる山場へ")
shami = song.track("三味線", program=106, role="main", volume=105, pan=60, reverb=30)
fue = song.track("篠笛", program=73, role="main", volume=95, pan=80, reverb=40)
koto = song.track("琴", program=107, role="other", volume=75, pan=40, reverb=30)
strings = song.track("弦", program=48, role="other", volume=80, reverb=50)
taiko = song.track("太鼓", program=116, role="other", volume=90, reverb=40)
drum = song.track("締太鼓", program=117, role="other", volume=65, reverb=20)
bass = song.track("低弦", program=43, role="other", volume=90, reverb=20)
cym = song.track("シンバル", program=0, role="other", drum=True, volume=70, reverb=60)

# 和音は旋律の音に合わせて選ぶ
CH = {"Dm": ("D", "F", "A"), "F": ("F", "A", "C"), "C": ("C", "E", "G"), "Gm": ("G", "Bb", "D"),
      "Bb": ("Bb", "D", "F"), "A": ("A", "C#", "E")}

def block(chords, octave, vel, beats=4):
    return parse("".join(f"| {'+'.join(n + str(octave) for n in CH[c])}:{beats}@{vel} " for c in chords) + "|")

def stab(chords, vel):
    return parse("".join(f"| {CH[c][0]}4+{CH[c][2]}4:1@{vel} r:1 {CH[c][0]}4+{CH[c][2]}4:1/2@{vel} {CH[c][0]}4+{CH[c][2]}4:1/2@{vel - 10} r:1 " for c in chords) + "|")

def drive(chords, vel):
    return parse("".join(f"| {CH[c][0]}2:1/2@{vel} {CH[c][0]}2:1/2@{vel - 20} r:1/2 {CH[c][0]}2:1/2@{vel - 10} {CH[c][0]}2:1/2@{vel} r:1/2 {CH[c][0]}3:1/2@{vel - 15} {CH[c][0]}2:1/2@{vel - 15} " for c in chords) + "|")

def eighths(chords, vel):
    return parse("".join(f"| {CH[c][0]}2:1/2@{vel} " + f"{CH[c][0]}2:1/2@{vel - 25} " * 7 for c in chords) + "|")

MEL_A = ("| D5:1/2 D5:1/2 F5:1/2 D5:1/2 G5:1 F5:1/2 D5:1/2 | C5:1/2 D5:1/2 F5:1/2 G5:1/2 A5:2 |"
         "| C6:1/2 A5:1/2 G5:1/2 F5:1/2 G5:1/2 A5:1/2 G5:1/2 E5:1/2 | D5:1 C5:1/2 A4:1/2 D5:2 |"
         "| A5:1 G5:1/2 A5:1/2 C6:1 A5:1 | G5:1/2 F5:1/2 G5:1/2 A5:1/2 D5:2 |"
         "| F5:1/2 G5:1/2 A5:1/2 F5:1/2 Bb5:1/2 A5:1/2 G5:1/2 F5:1/2 | D5:1/2 r:1/2 D5:1/2 r:1/2 D5:1 r:1 |")
CH_A = ["Dm", "F", "C", "Dm", "F", "Gm", "Bb", "Dm"]

# 前奏（1〜2）
taiko.put(0, parse("| D2:1/2@80 D2:1/2@60 D2:1/2@70 D2:1/2@60 D2:1/2@90 D2:1/2@60 D2:1@100 | D2:1/2 D2:1/2 D2:1 D2:1/2 D2:1/2 D2:1@110 |"))
shami.put(0, parse("| r:4 | D4:1/2 F4:1/2 G4:1/2 A4:1/2 C5:1/2 A4:1/2 D5:1 |"))
song.loop_from(song.bar(3))

# A（3〜10）: 三味線が斬り結ぶ
A = song.bar(3)
shami.put(A, parse(MEL_A))
koto.put(A, stab(CH_A, 70))
bass.put(A, drive(CH_A, 85))
taiko.put(A, parse("| D2:1@90 r:1 D2:1/2@70 D2:1/2@70 r:1 |").repeat(8))
drum.put(A, parse("| D3:1/2@60 D3:1/2@40 D3:1/2@70 D3:1/2@40 D3:1/2@60 D3:1/2@40 D3:1/2@70 D3:1/2@50 |").repeat(8))

# B（11〜18）: 篠笛が高く舞い、三味線は下で刻む
B = song.bar(11)
CH_B = ["F", "Gm", "F", "C", "Bb", "F", "Gm", "A"]
fue.put(B, parse("| F5:2 A5:1 C6:1 | Bb5:2 G5:1 Bb5:1 | A5:3 F5:1 | G5:4 |"
                 "| Bb5:2 C6:1 D6:1 | C6:2 A5:1 C6:1 | G5:1 Bb5:1 D6:1 Bb5:1 | A5:3 r:1 |").velocity(value=100))
shami.put(B, parse("".join(f"| {CH[c][0]}4:1/2 {CH[c][2]}4:1/2 {CH[c][1]}5:1/2 {CH[c][2]}4:1/2 {CH[c][0]}4:1/2 {CH[c][2]}4:1/2 {CH[c][1]}5:1/2 {CH[c][2]}4:1/2 " for c in CH_B) + "|").velocity(value=70))
strings.put(B, block(CH_B, 4, 60))
bass.put(B, drive(CH_B, 80))
taiko.put(B, parse("| D2:1@85 r:1/2 D2:1/2@60 D2:1@75 r:1 |").repeat(8))
drum.put(B, parse("| D3:1/2@55 D3:1/2@40 D3:1/2@65 D3:1/2@40 |").repeat(16))
cym.put(B, parse("| 49:1@80 r:3 |"))

# C（19〜26）: 太鼓が引き、低い弦と三味線が段を上がって押し上げる
C = song.bar(19)
CH_C = ["Bb", "Bb", "C", "C", "Dm", "Dm", "A", "A"]
climb = ""
for i, c in enumerate(CH_C):
    r, t, f = CH[c]
    v = 55 + i * 8
    top = "5" if c != "A" else "5"
    climb += f"| {t}{4 if r in ('Bb','C') else 4}:1/2@{v} {f}4:1/2@{v - 10} {r}5:1/2@{v} {f}4:1/2@{v - 10} {t}5:1/2@{v} {f}4:1/2@{v - 10} {r}5:1/2@{v} {f}4:1/2@{v - 10} "
shami.put(C, parse(climb + "|"))
fue.put(C, parse("| F5:4~ | F5:4 | G5:4~ | G5:4 | A5:4~ | A5:4 | C#6:4 | E6:4 |").map(
    lambda n: Note(n.start, n.dur, n.pitches, 55 + int(n.start) * 2)))
strings.put(C, parse("| Bb2+F3:4@50 | Bb2+F3:4@55 | C3+G3:4@60 | C3+G3:4@65 | D3+A3:4@70 | D3+A3:4@78 | A2+E3+C#4:4@88 | A2+E3+C#4:4@100 |"))
bass.put(C, eighths(CH_C, 70).map(lambda n: Note(n.start, n.dur, n.pitches, min(110, n.vel + int(n.start) // 2))))
taiko.put(C, parse("| D2:1@70 r:3 | r:4 | D2:1@75 r:3 | r:4 | D2:1@80 r:1 D2:1@80 r:1 | D2:1@85 r:1 D2:1@85 r:1 |"
                   "| D2:1/2@85 D2:1/2@70 D2:1/2@85 D2:1/2@70 D2:1/2@90 D2:1/2@75 D2:1/2@90 D2:1/2@75 |"
                   "| D2:1/4@90 D2:1/4@80 D2:1/4@95 D2:1/4@85 D2:1/4@100 D2:1/4@90 D2:1/4@105 D2:1/4@95 D2:1/4@110 D2:1/4@100 D2:1/4@115 D2:1/4@105 D2:1@120 |"))

# A'（27〜34）: 三味線と篠笛が同じ旋律でぶつかる。いちばん厚く
D = song.bar(27)
shami.put(D, parse(MEL_A).velocity(scale=1.1))
fue.put(D, parse(MEL_A).octave(1).velocity(value=95))
strings.put(D, block(CH_A, 4, 72))
koto.put(D, stab(CH_A, 80))
bass.put(D, drive(CH_A, 95))
taiko.put(D, parse("| D2:1@105 D2:1/2@75 D2:1/2@75 D2:1@95 D2:1/2@75 D2:1/2@80 |").repeat(8))
drum.put(D, parse("| D3:1/2@70 D3:1/2@50 D3:1/2@80 D3:1/2@50 |").repeat(16))
cym.put(D, parse("| 49:1@100 r:3 |") + parse("| r:4 |").repeat(3) + parse("| 49:1@90 r:3 |"))

# E（35〜42）: 三味線と篠笛が掛け合い、最後は二人で駆け上がって A へ戻る
E = song.bar(35)
CH_E = ["Gm", "Gm", "A", "A", "Gm", "Gm", "A", "A"]
shami.put(E, parse("| G4:1/2 Bb4:1/2 D5:1/2 Bb4:1/2 G5:1 F5:1 | r:4 | A4:1/2 C#5:1/2 E5:1/2 C#5:1/2 A5:1 G5:1 | r:4 |"))
fue.put(E, parse("| r:4 | D6:1/2 C6:1/2 Bb5:1/2 A5:1/2 G5:2 | r:4 | E6:1/2 D6:1/2 C#6:1/2 B5:1/2 A5:2 |").velocity(value=95))
RUN = ("| Bb5:1/2 A5:1/2 G5:1/2 F5:1/2 E5:1/2 F5:1/2 G5:1/2 A5:1/2 | Bb5:1 G5:1 D5:1 G5:1 |"
       "| E5:1/2 F5:1/2 G5:1/2 A5:1/2 C#6:1/2 D6:1/2 E6:1 | A5:1/2 r:1/2 A5:1/2 r:1/2 A5:1 r:1 |")
shami.put(song.bar(39), parse(RUN).octave(-1).velocity(value=100))
fue.put(song.bar(39), parse(RUN).velocity(value=100))
strings.put(E, block(CH_E, 3, 65))
koto.put(E, stab(CH_E, 75))
bass.put(E, drive(CH_E, 90))
taiko.put(E, parse("| D2:1@95 r:1 D2:1@80 r:1 | D2:1/2@85 D2:1/2@70 D2:1/2@85 D2:1/2@70 D2:1@95 r:1 |").repeat(3)
          + parse("| D2:1/2@90 D2:1/2@80 D2:1/2@95 D2:1/2@85 D2:1/2@100 D2:1/2@90 D2:1@110 | D2:1@115 r:1 D2:1@110 r:1 |"))
drum.put(E, parse("| D3:1/2@60 D3:1/2@45 D3:1/2@70 D3:1/2@45 |").repeat(16))
cym.put(E, parse("| 49:1@85 r:3 |"))
song.end(song.bar(43))
