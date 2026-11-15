# エンディング。浜松でお凛が待ち、二人で西へ歩き出す。尺八が流れ者の主題を、篠笛がお凛の主題を吹き、最後に二つが重なる。
from musiclib import *

song = Song("bgm_ending", tempo=72, meter="4/4", loop=True, title="ふたたび街道へ",
            about="主題の変奏。ひとり旅の寂しさに、隣を歩く人の温かさが重なる")
flute = song.track("尺八", program=77, role="main", volume=105, reverb=80)
fue = song.track("篠笛", program=73, role="main", volume=95, pan=80, reverb=70)
koto = song.track("琴", program=107, role="other", volume=70, pan=40, reverb=60)
strings = song.track("弦", program=49, role="other", volume=60, reverb=80)
bass = song.track("低弦", program=42, role="other", volume=65, reverb=60)
fue_sub = song.track("篠笛（副）", program=73, role="sub", volume=80, pan=90, reverb=70)

def arp(roots):
    return parse("".join(f"| {r}:1/2 r:1/2 {r}:1/2 r:1/2 {r}:1/2 r:1/2 {r}:1/2 r:1/2 " for r in roots) + "|")

# 前奏（1〜2）: 琴のつま弾き
koto.put(0, parse("| D4:1 A4:1 D5:1 A4:1 | F4:1 A4:1 E5:1 D5:1 |").velocity(value=65))
song.loop_from(song.bar(3))
# A（3〜10）: 尺八がひとりで流れ者の主題の前半
flute.put(song.bar(3), theme("main").bars(1, 8))
strings.put(song.bar(3), theme_harmony("main").bars(1, 8).velocity(value=50))
koto.put(song.bar(3), arp(["D4+A4", "Bb3+F4", "F4+C5", "C4+G4", "D4+A4", "G3+D4", "A3+E4", "D4+A4"]).velocity(value=55))
# B（11〜18）: 篠笛がお凛の主題の前半で答える
fue.put(song.bar(11), theme("heroine").bars(1, 8).transpose(-5))
strings.put(song.bar(11), parse("| D3+A3:4 | D3+A3:4 | G2+D3:4 | A2+E3:4 | D3+A3:4 | Bb2+F3:4 | C3+G3:4 | D3+A3:4 |").velocity(value=55))
koto.put(song.bar(11), arp(["D4+A4", "D4+A4", "G3+D4", "A3+E4", "D4+A4", "Bb3+F4", "C4+G4", "D4+A4"]).velocity(value=60))
# C（19〜26）: 尺八が主題の後半、篠笛がお凛の結びで寄り添う
flute.put(song.bar(19), theme("main").bars(9, 16))
fue_sub.put(song.bar(21), motif("heroine.omoi").transpose(-5).velocity(value=75))
fue_sub.put(song.bar(25), motif("heroine.kiai").transpose(-5).velocity(value=70) + parse("| D5:4 |"))
strings.put(song.bar(19), theme_harmony("main").bars(9, 16).octave(1).velocity(value=58))
bass.put(song.bar(3), theme_harmony("main").bars(1, 8).map(lambda n: Note(n.start, n.dur, [min(n.pitches)], 65)).octave(-1))
bass.put(song.bar(19), theme_harmony("main").bars(9, 16).map(lambda n: Note(n.start, n.dur, [min(n.pitches)], 70)).octave(-1))
koto.put(song.bar(19), arp(["Bb3+F4", "F4+C5", "Bb3+F4", "A3+E4", "Bb3+F4", "G3+D4", "A3+E4", "D4+A4"]).velocity(value=60))
song.end(song.bar(27))
