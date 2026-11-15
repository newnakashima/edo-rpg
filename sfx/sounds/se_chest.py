# 葛籠を開ける: 蓋がきしむ短い「ギッ」。続けて se_item（0.3 秒）
from sfxlib import *

# きしみ: 竹と藤の蝶番が擦れる。細かく途切れる粒（スティックスリップ）を、少し高さを上げながら共鳴させる
creak_len = 0.2
rate = sweep(55, 90, creak_len)
pulses = (np.sin(2 * np.pi * np.cumsum(rate) / RATE) > 0.92).astype(float)
creak = mix(resonator(pulses, 780, 0.012), resonator(pulses, 1650, 0.008) * 0.6, resonator(pulses, 2900, 0.005) * 0.3)
creak *= env_points([(0, 0.0), (0.03, 1.0), (0.15, 0.8), (creak_len, 0.0)], creak_len)
# 蓋を置く、軽く乾いた「コト」
lid = mix(modal([360, 820], decays=[0.02, 0.01], amps=[1.0, 0.4], seconds=0.08),
          bandpass(noise(0.004), 400, 3000) * env_exp(0.004, 0.001) * 2)

sound = Sound("se_chest", fade(mix(creak, (lid * 0.5, 0.21)), fade_out=0.02), title="葛籠", level=-3)
