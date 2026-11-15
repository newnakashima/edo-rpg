# 戦闘が始まる: 鋭い一打に、上ずって張り詰める響き（0.6 秒）
from sfxlib import *

# 一打: 金物を強く打つ。広い帯域の当たりに、非整数倍の響き
hit = drive(bandpass(noise(0.01), 1500, 12000) * env_exp(0.01, 0.003), 2.0)
gong = modal([880, 880 * 2.32, 880 * 4.1, 880 * 5.9], decays=[0.25, 0.15, 0.08, 0.05],
             amps=[0.8, 0.6, 0.4, 0.25], seconds=0.6, strike=hit)

# 張り詰める響き: 上へずり上がる高い音を、細かく震わせる
rise_len = 0.55
f = sweep(700, 1500, rise_len)
rise = tremolo(lowpass(saw(f) + saw(f * 1.012), 4000), 18, 0.5)
rise *= env_points([(0, 0.0), (0.05, 0.6), (0.4, 0.5), (rise_len, 0.0)], rise_len)

sound = Sound("se_encounter", fade(mix(gong, hit * 0.5, (rise * 0.25, 0.03)), fade_out=0.05), title="戦闘開始", level=1)
