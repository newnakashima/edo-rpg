# 装備を替える: 金具が噛み合う「カチッ」（0.15 秒）
from sfxlib import *

# カ: 金具が触れる軽い当たり。チッ: 噛み合って止まる、少し低く締まった当たり（2 つの間は 35 ms）
# 当たりのノイズは響かせるだけにして、そのまま足さない（一瞬だけ大きくならないように）
def click(freqs, decays, gain):
    strike = bandpass(noise(0.003), 1500, 10000) * env_exp(0.003, 0.0008)
    return modal(freqs, decays=decays, amps=[1.0, 0.6, 0.3], seconds=0.12, strike=strike) * gain

first = click([3300, 5200, 7900], [0.012, 0.008, 0.005], 0.6)
second = click([1900, 3100, 4700], [0.035, 0.02, 0.01], 1.0)
sound = Sound("se_equip", fade(mix(first, (second, 0.035)), fade_out=0.02), title="装備", level=-3)
