# 逃げる: 足早に遠ざかる（0.5 秒）
from sfxlib import *

# 足音: 土を蹴る短い音を、間を詰めながら 5 つ。だんだん小さく、こもらせる（遠ざかる）
def step(cut):
    s = bandpass(noise(0.05, "pink"), 120, cut) * env_exp(0.05, 0.012)
    return s + 0.5 * sine(sweep(160, 90, 0.05)) * env_exp(0.05, 0.015)

starts = [0.0, 0.09, 0.17, 0.24, 0.30]
steps = mix(*[(step(3500 - 550 * i) * (1.0 - 0.17 * i), t) for i, t in enumerate(starts)])
# 走り去る風
wind = sweep_filter(noise(0.45, "pink"), sweep(1800, 600, 0.45), kind="bandpass", q=1.0)
wind *= env_points([(0, 0.0), (0.1, 0.5), (0.45, 0.0)], 0.45)

sound = Sound("se_escape", fade(mix(steps, wind * 0.3), fade_out=0.05), title="逃げる", level=-2)
