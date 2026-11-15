# 雷の術: はじける高い放電音（0.4 秒）
from sfxlib import *

# 放電: ごく短いぱちぱちが速く続き、高い帯域でジジッと鳴る
zap = highpass(crackle(0.35, density=900, decay=0.0015), 2500)
# 体: 高い音をぎざぎざに揺らしたうなり（鋸波を荒く量子化して電気らしく）
buzz_len = 0.32
buzz = bitcrush(saw(vibrato(sweep(1800, 900, buzz_len), rate=45, depth=0.08)), bits=5, hold=3)
buzz = bandpass(buzz, 1200, 9000) * env_points([(0, 1.0), (0.05, 0.6), (buzz_len, 0.0)], buzz_len)
# 当たり: 落ちた瞬間の「バチッ」
snap = drive(highpass(noise(0.015), 1500) * env_exp(0.015, 0.003), 3.0)
zap = zap * env_points([(0, 1.0), (0.1, 0.7), (0.35, 0.0)], 0.35)

sound = Sound("se_thunder", fade(mix(snap * 1.2, zap * 0.7, buzz * 0.35), fade_out=0.05), title="雷", level=0)
