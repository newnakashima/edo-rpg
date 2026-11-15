# 大坂。天下の台所の商いの調子はそのままに、米の値が吊り上がって飢える町の重さ。三味線がゆっくり重い足取りで歩き、後半は尺八がため息をつく。
# 町の人の曲なので主題は使わず新しく書く。音は D・F・G・A・C の 5 つだけ。低音は D と A だけにして、旋律とこすれないようにする。
from musiclib import *

song = Song("bgm_town_osaka", tempo=88, meter="4/4", loop=True, title="大坂",
            about="商都の掛け声を抑え、米の値上がりに飢える町の重さ。低い三味線と尺八")
shami = song.track("三味線", program=106, role="main", volume=100, pan=70, reverb=40)
flute = song.track("尺八", program=77, role="sub", volume=90, pan=50, reverb=80)
shami2 = song.track("三味線（刻み）", program=106, role="other", volume=55, pan=90, reverb=30)
strings = song.track("弦", program=49, role="other", volume=50, reverb=80)
bass = song.track("低弦", program=43, role="other", volume=75, reverb=50)
taiko = song.track("太鼓", program=116, role="other", volume=60, reverb=60)
ki = song.track("拍子木", program=115, role="other", volume=40, pan=30, reverb=40)

# 1〜8: 三味線が重い足取りで町を歩く
shami.add(parse(
    "| D5:1 C5:1/2 A4:1/2 G4:1 A4:1 | F4:1 G4:1/2 A4:1/2 D4:2 | F4:1 G4:1 A4:1 C5:1 | A4:3 r:1 |"
    "| D5:1 F5:1/2 D5:1/2 C5:1 A4:1 | G4:1/2 A4:1/2 G4:1/2 F4:1/2 D4:2 | F4:1 D4:1/2 F4:1/2 G4:1 A4:1 | D4:3 r:1 |"))
# 9〜16: 尺八のため息に、三味線が小さく合いの手を入れる
flute.put(song.bar(9), parse(
    "| A4:2 G4:1 F4:1 | G4:3 r:1 | C5:2 A4:1 G4:1 | A4:3 r:1 |"
    "| F4:2 G4:1 A4:1 | C5:2 A4:2 | G4:1 F4:1 D4:2~ | D4:3 r:1 |"))
shami.put(song.bar(9), parse(
    "| r:4 | r:3 A4:1/2 C5:1/2 | r:4 | r:3 G4:1/2 A4:1/2 |"
    "| r:4 | r:3 D5:1/2 C5:1/2 | r:4 | r:2 F4:1/2 G4:1/2 A4:1/2 C5:1/2 |").velocity(scale=0.85))
shami2.put(0, parse("| r:1 D4+A4:1/2@60 r:1/2 r:1 D4+A4:1/2@55 r:1/2 |").repeat(16))
strings.put(0, parse("| D3+A3:4~@45 | D3+A3:4@40 |").repeat(8))
bass.put(0, parse("| D2:2@80 A1:2@65 |").repeat(16))
taiko.put(0, parse("| D2:1@80 r:1 r:1/2 D2:1/2@50 D2:1@60 | D2:1@70 r:3 |").repeat(8))
ki.put(0, parse("| r:4 | r:4 | r:4 | r:3 77:1@50 |").repeat(4))
song.end(song.bar(17))
