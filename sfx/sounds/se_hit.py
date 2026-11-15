# 打つ・体当たり: 鈍く重い「ドッ」（0.3 秒）
from sfxlib import *

# 当たり: 中域の短い詰まったノイズ（布や肉に当たる手ざわり）
punch = drive(bandpass(noise(0.03, "pink"), 300, 2500) * env_exp(0.03, 0.008), 2.0)
# 体: 低い sine を下へ落とし、太くひずませる
f = sweep(140, 55, 0.25)
body = drive(sine(f) * env_exp(0.25, 0.06), 1.8)
thump = lowpass(noise(0.2, "brown"), 400) * env_exp(0.2, 0.04)

sound = Sound("se_hit", fade(mix(body * 0.8, punch * 1.3, thump * 0.6), fade_out=0.04), title="打つ", level=1)
