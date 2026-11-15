# 段が上がる・技を覚える: 短く晴れやかな上がり調子（0.8 秒）
from sfxlib import *

# 鈴のような明るい音で、上へ駆け上がり、最後の音を長く響かせる
def bell(name, seconds, decay):
    f = note(name)
    hit = bandpass(noise(0.002), 3000, 10000) * env_exp(0.002, 0.0005)
    return modal([f, f * 2.0, f * 3.0, f * 4.2], decays=[decay, decay * 0.6, decay * 0.35, decay * 0.2],
                 amps=[1.0, 0.35, 0.15, 0.08], seconds=seconds, strike=hit * 4)

run = mix((bell("G5", 0.15, 0.05), 0.0), (bell("C6", 0.15, 0.05), 0.07), (bell("E6", 0.15, 0.05), 0.14),
          (bell("G6", 0.15, 0.05), 0.21))
top = mix(bell("C7", 0.5, 0.18), bell("E6", 0.5, 0.2) * 0.5, bell("G6", 0.5, 0.2) * 0.4)
sound = Sound("se_levelup", fade(mix(run, (top, 0.28)), fade_out=0.08), title="段が上がる")
