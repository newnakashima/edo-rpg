# 丁半で壺を振って伏せる: 賽が壺の中で転がり、ぽんと伏せる（0.6 秒）
from sfxlib import *

# 転がり: 賽が竹の壺の内側に当たる、小さく硬い木の音を不規則に並べる（だんだん速く、小さく）
roll = silence(0.45)
hits = [0.0, 0.07, 0.12, 0.18, 0.22, 0.27, 0.3, 0.33, 0.36]
for i, at in enumerate(hits):
    f = 2300 * (1 + 0.15 * rng.standard_normal())
    knock = modal([f, f * 1.7], decays=[0.008, 0.004], amps=[1.0, 0.5], seconds=0.03)
    roll = place(roll, knock, at, gain=1.0 - 0.06 * i)
cup = bandpass(roll, 600, 8000)
# 伏せる: 壺の口を盆に伏せる、こもった低い「ぽん」
pon = mix(modal([190, 420], decays=[0.05, 0.02], amps=[1.0, 0.3], seconds=0.15),
          lowpass(noise(0.01, "pink"), 1200) * env_exp(0.01, 0.003) * 1.5)

sound = Sound("se_dice", fade(mix(cup * 0.5, (pon, 0.43)), fade_out=0.03), title="丁半", level=-2)
