# ひと月のちの日本橋。仲間がそれぞれの道へ去る。琴が流れ者の主題を穏やかに弾き、後半は尺八が受け継ぐ。結びに篠笛が新しい短い旋律で名残を惜しむ。
# 和音は街道（bgm_road）と同じく旋律の音から選ぶ。戦いの後の安堵なので、太鼓は使わない。
from musiclib import *

song = Song("bgm_epilogue", tempo=68, meter="4/4", loop=True, title="日本橋",
            about="穏やかな主題。安堵と、少しの名残惜しさ")
koto = song.track("琴", program=107, role="main", volume=100, pan=50, reverb=70)
flute = song.track("尺八", program=77, role="main", volume=95, reverb=80)
fue = song.track("篠笛", program=73, role="main", volume=85, pan=78, reverb=80)
harp = song.track("つま弾き", program=46, role="other", volume=55, pan=30, reverb=80)
strings = song.track("弦", program=49, role="other", volume=55, reverb=90)
bass = song.track("低弦", program=42, role="other", volume=60, reverb=70)

FIF = {"D": ("D", "A"), "A": ("A", "E"), "F": ("F", "C"), "C": ("C", "G"), "G": ("G", "D")}
CH_A = ["D", "A", "F", "C", "D", "G", "F", "D"]
CH_B = ["F", "C", "D", "A", "D", "G", "A", "D"]
CH_C = ["D", "G", "A", "D"]
def pad(chords, vel):
    return parse("".join(f"| {FIF[c][0]}3+{FIF[c][1]}3+{FIF[c][0]}4:4@{vel} " for c in chords) + "|")
def arp(chords, vel):
    return parse("".join(f"| {FIF[c][0]}2:1@{vel} {FIF[c][1]}2:1@{vel - 8} {FIF[c][0]}3:1@{vel - 4} {FIF[c][1]}2:1@{vel - 10} " for c in chords) + "|")
def low(chords):
    return parse("".join(f"| {FIF[c][0]}2:4 " for c in chords) + "|")

# 前奏（1〜2）: つま弾きだけ
harp.put(0, arp(["D", "D"], 55))
strings.put(0, pad(["D", "D"], 40))
song.loop_from(song.bar(3))
# A（3〜10）: 琴が主題の前半を穏やかに
koto.put(song.bar(3), theme("main").bars(1, 8).velocity(value=82))
# B（11〜18）: 尺八が主題の後半を受け継ぐ
flute.put(song.bar(11), theme("main").bars(9, 16).velocity(value=88))
koto.put(song.bar(11), arp(CH_B, 60).octave(2))
# 結び（19〜22）: 篠笛の新しい旋律で名残を惜しむ
fue.put(song.bar(19), parse("| D5:2 F5:1 A5:1 | G5:3 F5:1 | E5:2 D5:1 C5:1 | D5:4 |"))
CH = CH_A + CH_B + CH_C
harp.put(song.bar(3), arp(CH_A, 58))
harp.put(song.bar(19), arp(CH_C, 55))
strings.put(song.bar(3), pad(CH, 50))
bass.put(song.bar(3), low(CH))
song.end(song.bar(23))
