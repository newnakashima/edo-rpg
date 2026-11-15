# 煙と消える・煙玉: こもった破裂と、煙が広がる音（0.5 秒）
from sfxlib import *

# 破裂: こもった低めの「ボンッ」（se_explode よりずっと軽く、高い帯域を落とす）
pop = lowpass(noise(0.03, "pink"), 1500) * env_exp(0.03, 0.008)
thump = sine(sweep(160, 70, 0.12)) * env_exp(0.12, 0.03)
# 煙: 広がって薄れていく「シュワー」。帯域を少しずつ下げ、左右に広げる
puff_len = 0.45
puff = sweep_filter(noise(puff_len), sweep(5000, 1500, puff_len), kind="bandpass", q=0.8)
puff *= env_points([(0, 0.0), (0.04, 1.0), (puff_len, 0.0)], puff_len)

sound = Sound("se_smoke", fade(widen(mix(pop * 1.2, thump * 0.7, (puff * 0.45, 0.02))), fade_out=0.05), title="煙")
