# 防御・かばう: 刀で受ける「キン」（0.25 秒）
from sfxlib import *

# 鋼と鋼が当たる。当たりで非整数倍の響きを鳴らす（se_critical より低く、駆け上がる一閃はない）
strike = bandpass(noise(0.004), 2000, 14000) * env_exp(0.004, 0.001)
ring = modal([2950, 2950 * 1.53, 2950 * 2.41, 2950 * 3.2], decays=[0.09, 0.055, 0.03, 0.018],
             amps=[1.0, 0.7, 0.4, 0.2], seconds=0.26, strike=strike)
# 受け止めた手応え: 低い押し
push = lowpass(noise(0.04, "pink"), 600) * env_exp(0.04, 0.01)

# 高く澄んだ短い音で、ピークの割に大きく聞こえるので少し下げる
sound = Sound("se_guard", fade(mix(ring, push * 0.3), fade_out=0.04), title="防御", level=-2.5)
