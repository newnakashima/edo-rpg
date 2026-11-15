# 大きな門が開く（ギギギ…ゴゴン）: 重い木がきしみ、止まる（1.5 秒）
from sfxlib import *

# ギギギ: 蝶番がきしむ。速い当たりの列（スティックスリップ）を木の共鳴に通す
creak_len = 1.1
rate = glide([(0.0, 18), (0.5, 26), (creak_len, 14)], creak_len)
phase = 0.999 + np.cumsum(rate) / RATE
pulses = np.diff(np.floor(phase), prepend=0.0)
creak = resonator(pulses * 1.0, 420, 0.02) + resonator(pulses * 0.6, 760, 0.012)
creak = bandpass(creak, 200, 3000) * env_points([(0, 0.5), (0.1, 1.0), (0.9, 0.8), (creak_len, 0.0)], creak_len)
# 重い扉が動く低い擦れ
drag = lowpass(noise(creak_len, "brown"), 300) * env_points([(0, 0.3), (0.2, 1.0), (creak_len, 0.3)], creak_len)
# ゴゴン: 開ききって止まる鈍い当たり 2 つ
def stop(gain):
    return mix(drive(sine(sweep(90, 45, 0.25)) * env_exp(0.25, 0.07), 1.5),
               lowpass(noise(0.06, "pink"), 800) * env_exp(0.06, 0.015)) * gain

sound = Sound("se_gate", fade(mix(creak * 2.0, drag * 0.6, (stop(1.0), 1.1), (stop(0.6), 1.22)), fade_out=0.12), title="門", level=0)
