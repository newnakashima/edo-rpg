# 寺の鐘・弔いの鉦: 長く尾を引く鐘（2.5 秒）
from sfxlib import *

# 梵鐘: 撞木で突く低い当たりに、非整数倍の響き（低い方ほど長く残る）。少しうなる（近い 2 つの音）
f = 98.0
strike = lowpass(noise(0.02, "pink"), 1200) * env_exp(0.02, 0.006)
partial_ratios = [0.5, 1.0, 1.007, 1.68, 2.42, 3.2, 4.1]
decays = [1.6, 1.2, 1.2, 0.6, 0.35, 0.2, 0.12]
amps = [0.6, 1.0, 0.7, 0.5, 0.35, 0.25, 0.15]
bell = modal([f * r for r in partial_ratios], decays=decays, amps=amps, seconds=2.5)
hit = modal([f * 1.68, f * 4.1], decays=[0.1, 0.05], amps=[0.4, 0.3], seconds=0.3, strike=strike)

sound = Sound("se_bell", fade(trim(reverb(mix(bell, hit), seconds=1.2, wet=0.3, brightness=3000), 2.7), fade_out=0.5), title="鐘", level=1)
