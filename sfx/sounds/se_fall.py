# 人が倒れる（ドサッ）: 布と体が地面に落ちる（0.4 秒）
from sfxlib import *

# 膝をつく小さな当たり → 体が落ちる鈍い「ドサッ」 → 布がこすれて止まる
knee = lowpass(noise(0.03, "pink"), 900) * env_exp(0.03, 0.008)
body = mix(drive(sine(sweep(110, 50, 0.15)) * env_exp(0.15, 0.04), 1.5),
           lowpass(noise(0.12, "brown"), 700) * env_exp(0.12, 0.035) * 1.2)
cloth = bandpass(noise(0.2), 600, 3500) * env_points([(0, 0.0), (0.02, 1.0), (0.2, 0.0)], 0.2)

sound = Sound("se_fall", fade(mix(knee * 0.5, (body, 0.09), (cloth * 0.25, 0.11)), fade_out=0.06), title="倒れる", level=0)
