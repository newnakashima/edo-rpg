# 水に落ちる（ザブン）: 水しぶき（0.6 秒）
from sfxlib import *

# ザブ: 水面を打つ当たり（広い帯域のノイズの破裂）
impact = bandpass(noise(0.08), 300, 8000) * env_exp(0.08, 0.02)
# ン: 体が沈んで空気が抜ける、こもった低い音
plunge = lowpass(noise(0.3, "brown"), 500) * env_exp(0.3, 0.09)
gulp = sine(sweep(250, 120, 0.12)) * env_exp(0.12, 0.04)
# 水しぶき: 高い帯域のざらざらが広がって落ちる
spray = sweep_filter(noise(0.5), sweep(6000, 2000, 0.5), "bandpass", q=0.8)
spray = spray * env_points([(0, 0.0), (0.03, 1.0), (0.5, 0.0)], 0.5)
drops = bandpass(crackle(0.45, density=80, decay=0.004), 1500, 6000) * env_points([(0, 1.0), (0.45, 0.0)], 0.45)

sound = Sound("se_splash", fade(mix(impact * 0.9, plunge * 0.8, (gulp * 0.4, 0.02), spray * 0.5, (drops * 0.3, 0.1)), fade_out=0.08), title="水しぶき", level=0)
