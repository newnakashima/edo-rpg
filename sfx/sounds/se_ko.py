# 味方が倒れる: 重く沈む一打（0.5 秒）
from sfxlib import *

# 一打: 低く深い「ドン」を長めに下へ落とす（se_damage より低く、長く沈む）
f = sweep(110, 38, 0.45)
body = drive(sine(f) * env_exp(0.45, 0.12), 1.6)
punch = lowpass(noise(0.06, "pink"), 800) * env_exp(0.06, 0.015)
# 沈む: 低い和音が暗く下がって消える
sink_len = 0.45
sink = (sine(sweep(note("D4"), note("A3"), sink_len)) + 0.6 * sine(sweep(note("F4"), note("C4"), sink_len)))
sink = lowpass(sink, 1500) * env_points([(0, 0.0), (0.03, 0.8), (sink_len, 0.0)], sink_len)

sound = Sound("se_ko", fade(mix(body, punch * 0.7, sink * 0.25), fade_out=0.05), title="味方が倒れる", level=1)
