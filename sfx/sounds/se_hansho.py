# 火事の半鐘（ジャン）: 甲高い金属を続けて打つ（1.5 秒）
from sfxlib import *

# 小さな釣鐘を木槌で打つ: 甲高い非整数倍の響き。打つ音の当たりは硬い
def jan(gain):
    f = 1250.0
    strike = bandpass(noise(0.004), 2000, 10000) * env_exp(0.004, 0.001)
    return modal([f, f * 1.47, f * 2.09, f * 2.56, f * 3.4], decays=[0.35, 0.25, 0.15, 0.1, 0.06],
                 amps=[1.0, 0.7, 0.5, 0.35, 0.2], seconds=0.6, strike=strike) * gain

# 火事を知らせる早打ち（ジャン、ジャン、ジャンジャン……）。少しずつ弱く、間合いをわずかに揺らす
hits = silence(1.5)
for i, at in enumerate([0.0, 0.2, 0.4, 0.55, 0.7, 0.85, 1.0]):
    hits = place(hits, jan(1.0 - 0.06 * i), at + 0.01 * rng.random())

sound = Sound("se_hansho", fade(trim(reverb(hits, seconds=0.5, wet=0.2, brightness=6000), 1.55), fade_out=0.3), title="半鐘", level=0)
