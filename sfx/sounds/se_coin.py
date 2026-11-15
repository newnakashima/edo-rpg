# 支払い・売り買い・お金を得る: 銭が触れ合う「チャリン」（0.3 秒）
from sfxlib import *

# 銭: 小さな金物の円板。非整数倍の高い響きを、少しずらして 2 枚ぶん打つ
def coin(f0, amp):
    hit = bandpass(noise(0.002), 4000, 12000) * env_exp(0.002, 0.0005)
    ring = modal([f0, f0 * 1.59, f0 * 2.14, f0 * 2.65], decays=[0.09, 0.06, 0.04, 0.03],
                 amps=[1.0, 0.6, 0.4, 0.25], seconds=0.22, strike=hit * 3)
    return ring * amp

sound = Sound("se_coin", fade(mix(coin(2950, 0.8), (coin(3420, 1.0), 0.06)), fade_out=0.04), title="銭")
