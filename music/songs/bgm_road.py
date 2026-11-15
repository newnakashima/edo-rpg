# ワールドマップ。篠笛が流れ者の主題を軽やかに吹き、間に三味線が新しい旋律で歩みを刻む。
from musiclib import *

song = Song("bgm_road", tempo=112, meter="4/4", loop=True, title="街道",
            about="軽快な三味線と篠笛。旅の歩み")
fue = song.track("篠笛", program=73, role="main", volume=100, reverb=50)
shami = song.track("三味線", program=106, role="main", volume=95, pan=80, reverb=30)
koto = song.track("琴", program=107, role="other", volume=70, pan=44, reverb=40)
bass = song.track("低弦", program=43, role="other", volume=75, reverb=30)
drum = song.track("締太鼓", program=117, role="other", volume=70, reverb=30)

walk = {"D": "| D4:1/2 A4:1/2 D5:1/2 A4:1/2 ", "Bb": "| Bb3:1/2 F4:1/2 Bb4:1/2 F4:1/2 ",
        "F": "| F4:1/2 C5:1/2 F5:1/2 C5:1/2 ", "C": "| C4:1/2 G4:1/2 C5:1/2 G4:1/2 ",
        "G": "| G3:1/2 D4:1/2 G4:1/2 D4:1/2 ", "A": "| A3:1/2 E4:1/2 A4:1/2 E4:1/2 "}
def strum(chords):
    return parse("".join(walk[c] + walk[c][2:] for c in chords) + "|")
def low(chords):
    names = {"D": "D2", "Bb": "Bb1", "F": "F2", "C": "C2", "G": "G1", "A": "A1"}
    return parse("".join(f"| {names[c]}:1 r:1/2 {names[c]}:1/2 {names[c]}:2 " for c in chords) + "|")

A = ["D", "Bb", "F", "C", "D", "G", "A", "D"]
B = ["Bb", "F", "Bb", "A", "Bb", "G", "A", "D"]
N = ["D", "D", "Bb", "C", "D", "D", "G", "A"]

# A（1〜8）: 篠笛が主題の前半
fue.put(0, theme("main").bars(1, 8).map(lambda n: Note(n.start, n.dur, n.pitches, 92)))
koto.put(0, strum(A).velocity(value=62))
# 間（9〜16）: 三味線の新しい旋律。街道を行く足取り
shami.put(song.bar(9), parse(
    "| D5:1/2 D5:1/2 F5:1/2 G5:1/2 A5:1 G5:1/2 F5:1/2 | E5:1/2 F5:1/2 D5:1 A4:2 |"
    "| Bb4:1/2 C5:1/2 D5:1/2 F5:1/2 E5:1 D5:1/2 C5:1/2 | D5:1 C5:1/2 A4:1/2 G4:2 |"
    "| D5:1/2 D5:1/2 F5:1/2 G5:1/2 A5:1 C6:1/2 A5:1/2 | G5:1/2 A5:1/2 F5:1 D5:2 |"
    "| G5:1/2 F5:1/2 D5:1/2 C5:1/2 D5:1 F5:1 | E5:1 C5:1/2 D5:1/2 E5:1 A4:1 |"))
koto.put(song.bar(9), strum(N).velocity(value=55))
# A'（17〜24）: 主題の後半を篠笛で。三味線が下で刻む
fue.put(song.bar(17), theme("main").bars(9, 16).velocity(value=100))
shami.put(song.bar(17), strum(B).velocity(value=60))
for i, ch in enumerate([A, N, B]):
    bass.put(song.bar(1 + 8 * i), low(ch))
drum.put(0, parse("| D3:1@70 D3:1/2@50 D3:1/2@50 D3:1@65 D3:1/2@50 D3:1/2@50 |").repeat(24))
song.end(song.bar(25))
