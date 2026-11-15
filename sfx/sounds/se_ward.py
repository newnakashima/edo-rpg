# 魔除けを使う・切れる: 鈴を 1 つ振る（0.4 秒）。切れるときも同じ音を鳴らす
from sfxlib import *

# 神楽鈴を 1 度振る: 小さな鈴がいくつか、わずかにずれて鳴る（非整数倍の響き、高い方ほど早く消える）
def suzu(f):
    tap = bandpass(noise(0.002), 4000, 12000) * env_exp(0.002, 0.0006)
    return modal([f, f * 2.32, f * 3.86, f * 5.1], decays=[0.16, 0.08, 0.04, 0.02],
                 amps=[1.0, 0.5, 0.3, 0.15], seconds=0.4, strike=tap)

shake = mix((suzu(note("D7")), 0.0), (suzu(note("D7") * 1.06) * 0.6, 0.012), (suzu(note("D7") * 0.94) * 0.5, 0.025))
# se_magic・se_revive の鈴より 1 つだけで澄ませ、静かな境内のような短い響き
sound = Sound("se_ward", fade(trim(reverb(shake, seconds=0.3, wet=0.2, brightness=8000), 0.42), fade_out=0.08), title="魔除け", level=-3)
