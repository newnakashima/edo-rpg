# 金物や家が崩れる: 金物が崩れ落ちて転がる（1.0 秒）
from sfxlib import *

# 崩れる: 強い当たりのあとに、大小の金物の当たりがばらばらと続き、転がって消える
crash = drive(bandpass(noise(0.05), 300, 9000) * env_exp(0.05, 0.015), 2.5)
body = lowpass(noise(0.6, "brown"), 1500) * env_exp(0.6, 0.15)
clatter = silence(1.0)
for i in range(22):
    at = 0.02 + 0.8 * (i / 22) ** 1.3 + 0.02 * rng.random()
    f = rng.uniform(500, 3000)
    piece = modal([f, f * 2.4, f * 3.9], decays=[0.05, 0.03, 0.015], amps=[1.0, 0.5, 0.25], seconds=0.15)
    clatter = place(clatter, piece, at, gain=(1.0 - at) * rng.uniform(0.3, 0.8))
# 転がる: 最後に 1 つ、小さな当たりが速く続いて止まる
roll = silence(0.3)
for i, at in enumerate([0.0, 0.06, 0.11, 0.15, 0.18, 0.2]):
    roll = place(roll, modal([1900, 4200], decays=[0.01, 0.005], seconds=0.03), at, gain=0.3 - 0.04 * i)

sound = Sound("se_crash", fade(mix(crash, body * 0.6, clatter * 0.8, (roll, 0.68)), fade_out=0.08), title="崩れる", level=1)
