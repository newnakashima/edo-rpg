# からくりが動く: ゼンマイを巻き、歯車が噛む（0.8 秒）
from sfxlib import *

# ゼンマイ: 細かい爪（ラチェット）の「ジリジリ」。小さな金物の当たりを速く並べる（だんだん遅く）
wind = silence(0.55)
at = 0.0
k = 0
while at < 0.5:
    f = 3400 * (1 + 0.03 * rng.standard_normal())
    tick = modal([f, f * 1.8], decays=[0.004, 0.002], amps=[1.0, 0.4], seconds=0.015)
    wind = place(wind, tick, at, gain=0.5 + 0.3 * (k % 2))
    at += 0.028 + 0.012 * at
    k += 1
# 歯車: 重い歯車が噛む、低く硬い「ガチッ」を 2 つ
def gear(gain):
    strike = bandpass(noise(0.005), 300, 5000) * env_exp(0.005, 0.0012)
    ring = modal([420, 980, 1700], decays=[0.04, 0.025, 0.012], amps=[1.0, 0.6, 0.3], seconds=0.18)
    return mix(ring, strike * 0.8) * gain

gears = mix((gear(0.8), 0.52), (gear(1.0), 0.64)) * 0.6
# 機械の唸り: うっすらとしたからくりの低い唸り（bitcrush で機械らしく）
hum_len = 0.8
hum = bitcrush(saw(sweep(70, 95, hum_len)), bits=6, hold=4)
hum = lowpass(hum, 900) * env_points([(0, 0.0), (0.1, 0.6), (0.6, 0.6), (hum_len, 0.0)], hum_len)

sound = Sound("se_karakuri", fade(mix(bandpass(wind, 1500, 10000) * 0.6, gears, hum * 0.12), fade_out=0.06), title="からくり", level=-1)
