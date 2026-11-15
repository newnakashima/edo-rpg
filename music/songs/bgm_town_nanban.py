# 長崎・出島。オルゴールの旋律にチェンバロの分散和音が付く異国の響きに、後半は琴が和の節で答える。港町の人々の曲なので主題は使わず、新しく書く。
from musiclib import *

song = Song("bgm_town_nanban", tempo=96, meter="4/4", loop=True, title="長崎",
            about="和楽器にオルゴールやチェンバロの響きが混じる、異国の風")
box = song.track("オルゴール", program=10, role="main", volume=95, reverb=60)
koto = song.track("琴", program=107, role="main", volume=95, pan=40, reverb=50)
harpsi = song.track("チェンバロ", program=6, role="other", volume=65, pan=80, reverb=40)
strings = song.track("弦", program=49, role="other", volume=50, reverb=70)
bass = song.track("低弦", program=43, role="other", volume=65, reverb=40)
tambo = song.track("鈴", program=0, role="other", drum=True, volume=45, reverb=40)

box.add(parse(
    "| F#5:1 A5:1 D6:1 E6:1 | B5:2 A5:2 | G5:1 B5:1 E6:1 D6:1 | C#6:3 r:1 |"
    "| D6:1 B5:1 A5:1 F#5:1 | G5:1 B5:1 E5:2 | F#5:1 A5:1 G5:1 E5:1 | D5:3 r:1 |"))
koto.put(song.bar(9), parse(
    "| B4:1 D5:1 E5:1 F#5:1 | A5:2 F#5:2 | E5:1 F#5:1 D5:1 B4:1 | A4:3 r:1 |"
    "| B4:1 D5:1 F#5:1 A5:1 | B5:2 A5:1 F#5:1 | E5:1 D5:1 E5:1 F#5:1 | D5:3 r:1 |"))
box.put(song.bar(9), parse("| r:4 | r:2 D6:1 A5:1 | r:4 | r:2 E6:1 C#6:1 | r:4 | r:2 F#6:2 | r:4 | r:4 |").velocity(value=60))
# 和音は旋律の音から。"E5" は 3 度を抜いた響き
CH = ["D", "G", "Em", "A", "D", "Em", "A", "D", "Bm", "D", "Bm", "A", "Bm", "Bm", "E5", "D"]
TRI = {"D": ("D", "F#", "A"), "G": ("G", "B", "D"), "Em": ("E", "G", "B"), "A": ("A", "C#", "E"),
       "Bm": ("B", "D", "F#"), "E5": ("E", "B", "E")}
def arp(c):
    r, t, f = TRI[c]
    return f"| {r}3:1/2 {t}3:1/2 {f}3:1/2 {t}3:1/2 {r}4:1/2 {t}3:1/2 {f}3:1/2 {t}3:1/2 " if c != "E5" else "| E3:1/2 B3:1/2 E4:1/2 B3:1/2 E3:1/2 B3:1/2 E4:1/2 B3:1/2 "
harpsi.put(0, parse("".join(arp(c) for c in CH) + "|"))
strings.put(0, parse("".join(f"| {TRI[c][0]}3+{TRI[c][2]}3:4@50 " for c in CH) + "|"))
bass.put(0, parse("".join(f"| {TRI[c][0]}2:2 {TRI[c][0]}2:1 {TRI[c][2]}1:1 " for c in CH) + "|"))
tambo.put(0, parse("| r:1 54:1@60 r:1 54:1/2@50 54:1/2@50 |").repeat(16))
song.end(song.bar(17))
