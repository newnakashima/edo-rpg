# エンディング。浜松でお凛が待ち、二人で西へ歩き出す。尺八が流れ者の主題を、篠笛がお凛の主題を吹き、最後に二つが重なる。
# 和音は旋律の音から選ぶ。流れ者の主題の部分は短調、お凛の主題の部分は長調（同じ D の上で、寂しさから温かさへ明るくなる）。
from musiclib import *

song = Song("bgm_ending", tempo=72, meter="4/4", loop=True, title="ふたたび街道へ",
            about="主題の変奏。ひとり旅の寂しさに、隣を歩く人の温かさが重なる")
flute = song.track("尺八", program=77, role="main", volume=105, reverb=80)
fue = song.track("篠笛", program=73, role="main", volume=95, pan=80, reverb=70)
koto = song.track("琴", program=107, role="other", volume=70, pan=40, reverb=60)
strings = song.track("弦", program=49, role="other", volume=60, reverb=80)
bass = song.track("低弦", program=42, role="other", volume=65, reverb=60)
fue_sub = song.track("篠笛（副）", program=73, role="sub", volume=80, pan=90, reverb=70)

CH = {"Dm": ("D", "F", "A"), "Am": ("A", "C", "E"), "F": ("F", "A", "C"), "C": ("C", "E", "G"),
      "Gm": ("G", "Bb", "D"), "Bb": ("Bb", "D", "F"), "D": ("D", "F#", "A"), "G": ("G", "B", "D"),
      "Bm": ("B", "D", "F#"), "A": ("A", "C#", "E"), "Em": ("E", "G", "B")}

# 旋律が 3 度の音と半音でこすれる小節は、3 度を抜いた空虚な響きにする
OPEN = {"Dm": "D3+A3+D4", "Bb": "Bb2+D3+Bb3"}

def pad(chords, vel):
    return parse("".join(f"| {OPEN.get(c, f'{CH[c][0]}3+{CH[c][2]}3+{CH[c][1]}4')}:4@{vel} " for c in chords) + "|")

def arp(chords, vel):
    return parse("".join(f"| {CH[c][0]}4:1/2@{vel} r:1/2 {CH[c][2]}4:1/2@{vel - 8} r:1/2 {CH[c][1]}5:1/2@{vel - 4} r:1/2 {CH[c][2]}4:1/2@{vel - 10} r:1/2 " for c in chords) + "|")

def low(chords, vel):
    return parse("".join(f"| {CH[c][0]}2:4@{vel} " for c in chords) + "|")

MAIN_A = ["Dm", "Am", "F", "C", "Dm", "Gm", "F", "Dm"]      # 流れ者の主題 1〜8 小節
HEROINE = ["D", "G", "Bm", "A", "Em", "Bm", "G", "D"]       # お凛の主題 1〜8 小節（5 度下げて D）
MAIN_B = ["F", "C", "Bb", "Am", "Dm", "Gm", "Am", "Dm"]     # 流れ者の主題 9〜16 小節


# 前奏（1〜2）: 琴のつま弾き
koto.put(0, parse("| D4:1 A4:1 D5:1 A4:1 | F4:1 A4:1 D5:1 A4:1 |").velocity(value=65))
song.loop_from(song.bar(3))
# A（3〜10）: 尺八がひとりで流れ者の主題の前半
flute.put(song.bar(3), theme("main").bars(1, 8))
strings.put(song.bar(3), pad(MAIN_A, 48))
koto.put(song.bar(3), arp(MAIN_A, 55))
bass.put(song.bar(3), low(MAIN_A, 62))
# B（11〜18）: 篠笛がお凛の主題の前半で答える。和音も長調に明るくなる
fue.put(song.bar(11), theme("heroine").bars(1, 8).transpose(-5))
strings.put(song.bar(11), pad(HEROINE, 55))
koto.put(song.bar(11), arp(HEROINE, 60))
bass.put(song.bar(11), low(HEROINE, 66))
# C（19〜26）: 尺八が主題の後半。篠笛がお凛の結びのリズムで、尺八の下に音を選び直して寄り添い、最後は二人で D に落ち着く
flute.put(song.bar(19), theme("main").bars(9, 16))
fue_sub.put(song.bar(23), motif("heroine.omoi").with_pitches(["F4", "G4", "A4", "C5", "D5", "Bb4"]).velocity(value=75))
fue_sub.put(song.bar(25), parse("| C5:2 E5:2 | F5:4 |").velocity(value=70))
strings.put(song.bar(19), pad(MAIN_B, 55))
koto.put(song.bar(19), arp(MAIN_B, 58))
bass.put(song.bar(19), low(MAIN_B, 68))
song.end(song.bar(27))
