# 爆発（敵の自爆・火薬）: 破裂して崩れる（0.6 秒）
from sfxlib import *

# 破裂: 広い帯域の強い当たりと、低い圧
crack = drive(noise(0.02) * env_exp(0.02, 0.005), 4.0)
boom = drive(sine(sweep(90, 30, 0.4)) * env_exp(0.4, 0.1), 2.5)
blast = drive(lowpass(noise(0.5, "brown"), 1800) * env_exp(0.5, 0.12) * 2, 2.0)
# 崩れる: 破片がばらばらと落ちる
debris_len = 0.4
debris = bandpass(crackle(debris_len, density=150, decay=0.003), 400, 5000)
debris *= env_points([(0, 0.0), (0.05, 1.0), (debris_len, 0.0)], debris_len)

sound = Sound("se_explode", fade(mix(crack, boom * 0.7, blast * 0.8, (debris * 0.5, 0.12)), fade_out=0.06), title="爆発", level=2)
