# 取消・閉じる: se_ok より低く、すっと引く（0.1 秒）
from sfxlib import *

# se_ok と同じ鈴の仲間を低く打ち、高さを少し下げながら早めに消す（引いていく感じ）
f = sweep(note("B5"), note("E5"), 0.1)
body = (sine(f) + 0.3 * sine(f * 2.76)) * env_exp(0.1, 0.03)
tick = bandpass(noise(0.003), 2000, 6000) * env_exp(0.003, 0.0007) * 0.4
sound = Sound("se_cancel", fade(mix(body, tick), fade_out=0.02), title="取消", level=-4)
