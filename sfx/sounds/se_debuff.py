# 弱くなる: 上から下へずり落ちる（0.4 秒）
from sfxlib import *

# ずり落ちる: 高さが下へ滑る、少し濁った音（se_buff の逆向き。半音ずつ揺れながら落ちる）
fall_len = 0.38
f = sweep(note("E6"), note("A4"), fall_len)
slide = lowpass(saw(f) + saw(f * 1.01), 3000) * env_points([(0, 0.0), (0.02, 1.0), (0.25, 0.6), (fall_len, 0.0)], fall_len)
wobble = tremolo(slide, 14, 0.35)
# 下へ抜ける息
sink = sweep_filter(noise(fall_len, "pink"), sweep(4000, 400, fall_len), kind="bandpass", q=2.5)
sink *= env_points([(0, 0.0), (0.05, 1.0), (fall_len, 0.0)], fall_len)

sound = Sound("se_debuff", fade(mix(wobble * 0.5, sink * 0.3), fade_out=0.05), title="弱くなる", level=-2)
