# 味方が傷を受ける: 低く詰まった衝撃（0.3 秒）
from sfxlib import *

# se_hit より高い帯域を落として、こもらせる（受けた側の、体に響く鈍さ）
punch = lowpass(noise(0.05, "pink"), 900) * env_exp(0.05, 0.012)
f = sweep(95, 50, 0.22)
body = drive(sine(f) * env_exp(0.22, 0.05), 2.5)
crunch = lowpass(bitcrush(noise(0.04, "brown"), bits=6, hold=3), 1200) * env_exp(0.04, 0.01)

sound = Sound("se_damage", fade(mix(body, punch * 0.8, crunch * 0.4), fade_out=0.04), title="傷を受ける")
