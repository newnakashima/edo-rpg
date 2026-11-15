# 最終ボス・からくり大権現。作品の中でいちばん盛り上がる曲。
#
#   前奏    歯車の音だけが鳴り、金管が膨らんで、大権現が立ち上がる（ループしない）
#   S1      金管がからくりの主題。冷たく重い
#   S2      主題が半音上へずれ、弦が高く鳴らす。追い詰められる
#   S3      尺八と弦が流れ者の主題で立ち向かう（短調のまま、熱く）
#   S4      篠笛がお凛の主題を明るく吹き、仲間がそろう（長調）
#   S5      すべてが引き、歯車の音と夜叉丸の嘆きだけ。そこから一気に溜める
#   S6      声が子守唄を大きく歌い、閉じ込められた魂が解き放たれる。いちばんの山場。最後は明るい和音で光る
#   S7      ゼンマイがふたたび巻かれ、S1 へ戻る
#
# 和音は旋律の音から選ぶ。からくりの部分は低音を同じ音で鳴らし続け、半音でうごめく冷たさは旋律に任せる。
from musiclib import *

song = Song("bgm_last_boss", tempo=144, meter="4/4", loop=True, title="からくり大権現",
            about="和楽器とオーケストラ、からくりの音。企みと旅の主題がぶつかり、仲間がそろい、静まり、魂の解放で最高潮に達する")
brass = song.track("金管", program=61, role="main", volume=100, pan=50, reverb=60)
flute = song.track("尺八", program=77, role="main", volume=105, pan=70, reverb=60)
fue = song.track("篠笛", program=73, role="main", volume=100, pan=80, reverb=60)
choir = song.track("声", program=52, role="main", volume=100, reverb=90)
strings = song.track("弦", program=48, role="main", volume=90, pan=40, reverb=60)
kokyu = song.track("胡弓", program=110, role="main", volume=90, pan=60, reverb=90)
box = song.track("オルゴール", program=10, role="sub", volume=70, pan=90, reverb=70)
koto = song.track("琴", program=107, role="sub", volume=75, pan=30, reverb=40)
horns = song.track("ホルン", program=60, role="sub", volume=85, pan=55, reverb=70)
pad = song.track("和音の弦", program=49, role="other", volume=75, reverb=80)
timp = song.track("ティンパニ", program=47, role="other", volume=90, reverb=60)
taiko = song.track("大太鼓", program=116, role="other", volume=90, reverb=60)
block = song.track("拍子木", program=115, role="other", volume=60, pan=80, reverb=30)
bass = song.track("低弦", program=43, role="other", volume=95, reverb=40)
cym = song.track("シンバル", program=0, role="other", drum=True, volume=80, reverb=70)


def pedal(roots, vel):
    """1 小節ずつ、根音を 8 分で刻む（からくりの部分は和音を付けず、同じ音で押す）。"""
    return parse("".join("| " + f"{r}1:1/2@{vel} {r}2:1/2@{vel - 20} " * 4 for r in roots) + "|")


def gallop(roots, vel):
    return parse("".join("| " + f"{r}1:1/2@{vel} {r}1:1/4@{vel - 25} {r}1:1/4@{vel - 25} " * 4 for r in roots) + "|")


def chords(voicings, vel):
    return parse("".join(f"| {v}:4@{vel} " for v in voicings) + "|")


def crescendo(phrase, start, end):
    total = float(phrase.length) or 1
    return phrase.map(lambda n: Note(n.start, n.dur, n.pitches, int(start + (end - start) * float(n.start) / total)))


def crash(at, vel=110):
    cym.put(at, parse(f"| 49:1@{vel} r:3 |"))


# ---------------------------------------------------------------- 前奏（1〜4）
box.put(0, motif("karakuri.haguruma").octave(1).velocity(value=50).repeat(2))
bass.put(0, parse("| E1:4~@50 | E1:4@50 | E1:4~@70 | E1:4@70 |"))
timp.put(song.bar(3), crescendo(parse("| " + "E2:1/4 " * 16 + "| " + "E2:1/4 " * 12 + "E2:1@120 |"), 40, 115))
brass.put(song.bar(3), crescendo(parse("| E3+B3:4~ | E3+B3:3 r:1 |"), 50, 110))
taiko.put(song.bar(4), parse("| r:3 E1:1@120 |"))
song.loop_from(song.bar(5))

# ---------------------------------------------------------------- S1（5〜12）金管がからくりの主題
S1 = song.bar(5)
brass.put(S1, theme("karakuri").velocity(value=100))
koto.put(S1, motif("karakuri.haguruma").octave(-1).repeat(8).velocity(value=60))
bass.put(S1, pedal(["E", "E", "F", "E", "E", "C", "E", "E"], 95))
taiko.put(S1, parse("| E1:1@100 r:1/2 E1:1/2@70 r:1 E1:1/2@80 E1:1/2@80 |").repeat(8))
timp.put(S1, parse("| E2:1@90 r:1 E2:1@70 r:1 |").repeat(8))
block.put(S1, parse("| 76:1/2@80 76:1/2@50 76:1/2@60 76:1/2@50 |").repeat(16))
crash(S1)

# ---------------------------------------------------------------- S2（13〜20）主題が半音上へ。弦が高く、金管がゼンマイを巻く
S2 = song.bar(13)
strings.put(S2, theme("karakuri").transpose(1).octave(1).velocity(value=100))
koto.put(S2, motif("karakuri.haguruma").octave(-1).transpose(1).repeat(8).velocity(value=65))
brass.put(song.bar(15), motif("karakuri.zenmai").transpose(1).octave(-1).stretch(2).velocity(value=95))
brass.put(song.bar(19), motif("karakuri.zenmai").transpose(1).octave(-1).stretch(2).velocity(value=105))
bass.put(S2, gallop(["F", "F", "F#", "F", "F", "C#", "F", "B"], 100))
taiko.put(S2, parse("| E1:1@105 E1:1/2@75 E1:1/2@75 E1:1@100 E1:1/2@75 E1:1/2@75 |").repeat(7)
          + parse("| B1:1/2@100 B1:1/2@90 B1:1/2@105 B1:1/2@95 B1:1/2@110 B1:1/2@100 B1:1@120 |"))
timp.put(S2, parse("| F2:1@95 r:1 F2:1@80 r:1 |").repeat(7) + parse("| " + "B1:1/4@90 " * 12 + "B1:1@120 |"))
block.put(S2, parse("| 76:1/2@85 76:1/2@55 76:1/2@70 76:1/2@55 |").repeat(16))
crash(S2, 105)

# ---------------------------------------------------------------- S3（21〜28）尺八と弦が流れ者の主題で立ち向かう
S3 = song.bar(21)
HERO = ["E3+B3+E4", "B2+F#3+B3", "G3+B3+D4", "D3+F#3+A3", "E3+B3+E4", "A2+E3+A3", "G3+B3+D4", "E3+B3+E4"]
ROOT3 = ["E", "B", "G", "D", "E", "A", "G", "E"]
flute.put(S3, theme("main").bars(1, 8).transpose(2).velocity(value=110))
strings.put(S3, theme("main").bars(1, 8).transpose(2).octave(-1).velocity(value=95))
horns.put(S3, chords(HERO, 75))
pad.put(S3, chords(HERO, 70))
bass.put(S3, gallop(ROOT3, 100))
taiko.put(S3, parse("| E1:1@105 r:1/2 E1:1/2@80 E1:1@100 E1:1/2@80 E1:1/2@80 |").repeat(8))
timp.put(S3, parse("".join(f"| {r}2:1@95 r:1 {r}2:1@80 r:1 " for r in ROOT3) + "|"))
crash(S3, 115)

# ---------------------------------------------------------------- S4（29〜36）篠笛がお凛の主題。仲間がそろい、長調に開ける
S4 = song.bar(29)
ALLY = ["G3+B3+D4", "C4+E4+G4", "E3+B3+E4", "D3+F#3+A3", "A3+E4+A4", "E3+B3+E4", "C4+E4+G4", "G3+B3+D4"]
ROOT4 = ["G", "C", "E", "D", "A", "E", "C", "G"]
fue.put(S4, theme("heroine").bars(1, 8).velocity(value=105))
strings.put(S4, theme("heroine").bars(1, 8).octave(-1).velocity(value=85))
horns.put(S4, chords(ALLY, 80))
pad.put(S4, chords(ALLY, 75))
koto.put(S4, parse("".join("| " + " ".join(f"{n}:1/2" for n in [v.split("+")[i % len(v.split("+"))] for i in range(8)]) + " " for v in ALLY) + "|").velocity(value=65))
bass.put(S4, gallop(ROOT4, 100))
taiko.put(S4, parse("| E1:1@110 E1:1/2@80 E1:1/2@80 E1:1@105 E1:1/2@85 E1:1/2@85 |").repeat(7)
          + parse("| E1:1/2@105 E1:1/2@95 E1:1/2@110 E1:1/2@100 E1:1@120 r:1 |"))
timp.put(S4, parse("".join(f"| {r}2:1@100 r:1 {r}2:1@85 r:1 " for r in ROOT4) + "|"))
crash(S4, 115)
crash(song.bar(33), 100)

# ---------------------------------------------------------------- S5（37〜44）すべてが引く。歯車の音と夜叉丸の嘆き。そこから一気に溜める
S5 = song.bar(37)
box.put(S5, motif("karakuri.haguruma").octave(1).velocity(value=45) + parse("| r:4 |")
        + motif("karakuri.haguruma").octave(1).velocity(value=40) + parse("| r:4 |"))
bass.put(S5, parse("| E1:4~@55 | E1:4@55 | E1:4~@50 | E1:4@50 |"))
kokyu.put(song.bar(38), motif("yashamaru.kage").transpose(-7).velocity(value=80) + parse("| r:2 |"))
# 41〜44: 弦が細かく刻みながら上がり、声と金管が膨らんで、魂の解放へ押し上げる
TREM = [("A4", "C5"), ("B4", "D5"), ("G#4", "B4"), ("B4", "E5")]
strings.put(song.bar(41), crescendo(parse("".join("| " + f"{a}:1/4 {b}:1/4 " * 8 for a, b in TREM) + "|"), 45, 120))
choir.put(song.bar(41), crescendo(chords(["F3+A3+C4", "G3+B3+D4", "E3+G#3+B3", "E3+G#3+B3+E4"], 80), 45, 115))
brass.put(song.bar(43), crescendo(parse("| E3+B3+E4:4~ | E3+G#3+B3+E4:4 |"), 60, 125))
bass.put(song.bar(41), crescendo(parse("| " + "F1:1/2 " * 8 + "| " + "G1:1/2 " * 8 + "| " + "E1:1/2 " * 8 + "| " + "E1:1/2 " * 8 + "|"), 60, 115))
timp.put(song.bar(41), crescendo(parse("| " + "E2:1/4 " * 16 + "| " + "E2:1/4 " * 16 + "| " + "E2:1/4 " * 16 + "| " + "E2:1/4 " * 12 + "E2:1 |"), 40, 127))
taiko.put(song.bar(43), parse("| E1:1/2@90 E1:1/2@80 E1:1/2@95 E1:1/2@85 E1:1/2@100 E1:1/2@90 E1:1/2@105 E1:1/2@95 |"
                              "| E1:1/4@105 E1:1/4@95 E1:1/4@110 E1:1/4@100 E1:1/4@115 E1:1/4@105 E1:1/4@120 E1:1/4@110 E1:1@127 r:1 |"))

# ---------------------------------------------------------------- S6（45〜52）声が子守唄を大きく歌う。いちばんの山場
S6 = song.bar(45)
lullaby = theme("komoriuta").stretch(Fraction(4, 3))        # 3 拍子の 1 小節を、4 拍子の 1 小節に
choir.put(S6, lullaby.velocity(value=120))
# 子守唄の音とこすれないよう、3 度や 5 度を抜いた和音を選ぶ。最後の小節だけ明るい和音で光る
SOUL = ["A2+A3+A4", "E3+B3+E4", "C3+G3+C4", "C3+G3+E4", "A2+E3+C4", "D3+A3+D4", "E3+B3+E4", "A2+E3+A3+C#4+E4"]
ROOT6 = ["A", "E", "C", "C", "A", "D", "E", "A"]
pad.put(S6, chords(SOUL, 95))
horns.put(S6, chords(SOUL, 95))
strings.put(S6, motif("main.call").transpose(7).octave(-1).velocity(value=105))
brass.put(song.bar(47), motif("main.wide").transpose(7).octave(-1).velocity(value=115))
brass.put(song.bar(49), lullaby.bars(5, 8).octave(-1).velocity(value=120))
box.put(song.bar(49), lullaby.bars(5, 8).octave(1).velocity(value=80))
strings.put(song.bar(49), lullaby.bars(5, 8).velocity(value=110))
bass.put(S6, gallop(ROOT6, 110))
taiko.put(S6, parse("| E1:1@120 E1:1/2@90 E1:1/2@90 E1:1@115 E1:1/2@95 E1:1/2@95 |").repeat(7) + parse("| E1:1@127 r:3 |"))
timp.put(S6, parse("".join(f"| {r}2:1@110 r:1 {r}2:1@95 r:1 " for r in ROOT6[:-1]) + "| " + "A2:1/4@100 " * 1 + "A2:1/4@105 " * 7 + "A2:2@127 |"))
crash(S6, 127)
crash(song.bar(49), 120)
crash(song.bar(52), 127)

# ---------------------------------------------------------------- S7（53〜56）ゼンマイがふたたび巻かれ、S1 へ戻る
S7 = song.bar(53)
brass.put(S7, motif("karakuri.zenmai").octave(-1).velocity(value=100) + motif("karakuri.zenmai").octave(-1).transpose(-1).velocity(value=105)
          + motif("karakuri.tomaru").velocity(value=110) + parse("| E3+Bb3+E4:1@120 E3+Bb3+E4:1@120 E3+Bb3+E4:1@125 r:1 |"))
box.put(S7, motif("karakuri.haguruma").octave(1).velocity(value=60).repeat(2))
bass.put(S7, pedal(["E", "E", "E", "E"], 95))
taiko.put(S7, parse("| E1:1@100 r:3 | E1:1@100 r:3 | E1:1/2@100 E1:1/2@90 E1:1/2@105 E1:1/2@95 E1:1/2@110 E1:1/2@100 E1:1/2@115 E1:1/2@105 | E1:1@120 E1:1@120 E1:1@125 r:1 |"))
timp.put(song.bar(56), parse("| E2:1@120 E2:1@120 E2:1@125 r:1 |"))
song.end(song.bar(57))
