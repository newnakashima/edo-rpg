# タイトル・主人公の選択。尺八がひとりで流れ者の主題を吹き、後半で三味線と弦が加わって広がる。
# 2 小節の前奏のあとからループする。
from musiclib import *

song = Song("bgm_title", tempo=76, meter="4/4", loop=True, title="タイトル",
            about="尺八がひとりで流れ者の主題を吹く寂しさから、三味線と弦が加わって街道が開けていく広がりへ")
flute = song.track("尺八", program=77, role="main", volume=110, reverb=80)
koto = song.track("琴", program=107, role="sub", volume=85, pan=44, reverb=60)
shami = song.track("三味線", program=106, role="other", volume=75, pan=84, reverb=40)
strings = song.track("弦", program=49, role="other", volume=62, reverb=70)
bass = song.track("低弦", program=42, role="other", volume=70, reverb=50)
taiko = song.track("太鼓", program=116, role="other", volume=80, reverb=60)

# 前奏（2 小節）: 琴のつま弾きと遠い太鼓。ループには含めない
koto.put(0, parse("| D4:1/2 A4:1/2 D5:1 A4:1/2 D4:1/2 r:1 | D4:1/2 A4:1/2 E5:1 D5:2 |").velocity(scale=0.8))
taiko.put(0, parse("| D2:2@70 r:2 | D2:1@60 D2:1@80 r:2 |"))
strings.put(0, parse("| D3+A3:4@50 | D3+A3:4@60 |"))
song.loop_from(song.bar(3))

# A（3〜10 小節）: 尺八が主題の前半をひとりで。下は弦の持続だけ
flute.put(song.bar(3), theme("main").bars(1, 8))
strings.put(song.bar(3), theme_harmony("main").bars(1, 8).velocity(value=55))
taiko.put(song.bar(6), parse("| D2:2@60 r:2 |"))
taiko.put(song.bar(10), parse("| D2:1@60 D2:1@75 r:2 |"))

# B（11〜18 小節）: 主題の後半。三味線と低弦が入り、街道が開ける
flute.put(song.bar(11), theme("main").bars(9, 16).velocity(scale=1.1))
strings.put(song.bar(11), theme_harmony("main").bars(9, 16).octave(1).velocity(value=60))
bass.put(song.bar(11), theme_harmony("main").bars(9, 16).map(
    lambda n: Note(n.start, n.dur, [min(n.pitches)], 75)).octave(-1))
roots = ["Bb3", "F4", "Bb3", "A3", "Bb3", "G3", "A3", "D4"]
fifths = ["F4", "C5", "F4", "E4", "F4", "D4", "E4", "A4"]
shami.put(song.bar(11), parse("".join(
    f"| {r}:1/2 r:1/2 {f}:1/2 {r}:1/2 r:1 {f}:1 " for r, f in zip(roots, fifths)) + "|"))
taiko.put(song.bar(11), parse("| D2:1@80 r:1 D2:1/2@60 D2:1/2@60 r:1 |").repeat(8))

# 結び（19〜20 小節）: 琴が呼びかけの断片を返し、ループの頭の静けさへ戻る
koto.put(song.bar(19), motif("main.call").octave(-1).velocity(scale=0.9))
strings.put(song.bar(19), parse("| Bb2+F3:4@55 | A2+E3:2@50 A2+E3:2@40 |"))
bass.put(song.bar(19), parse("| Bb1:4@65 | A1:4@55 |"))
song.end(song.bar(21))
