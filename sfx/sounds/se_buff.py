# 強くなる: 下から上へ駆け上がる（0.4 秒）
from sfxlib import *

# 駆け上がる短い音の並び（5 音）に、上へ動く息のような帯域を重ねる。se_heal の和音より速く、鋭い
names = ["D5", "F#5", "A5", "D6", "F#6"]
run = silence(0.4)
for i, name in enumerate(names):
    f = note(name)
    tone = (triangle(f, 0.14) + 0.3 * sine(f * 2, 0.14)) * env_exp(0.14, 0.05, attack=0.003)
    run = place(run, tone, i * 0.055, gain=0.7 + 0.08 * i)
rise_len = 0.35
rise = sweep_filter(noise(rise_len, "pink"), sweep(600, 6000, rise_len), kind="bandpass", q=3.0)
rise *= env_points([(0, 0.0), (0.25, 1.0), (rise_len, 0.0)], rise_len)

sound = Sound("se_buff", fade(mix(run, rise * 0.25), fade_out=0.05), title="強くなる", level=-2)
