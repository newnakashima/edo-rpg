# 術・妖術・祓い（火・雷以外の術）: 鈴と、うねる響き（0.5 秒）
from sfxlib import *

# 鈴: 小さな鈴を 2 度振る（非整数倍の響き）
def suzu():
    f = note("A6")
    return modal([f, f * 2.32, f * 3.86], decays=[0.12, 0.06, 0.03], amps=[1.0, 0.5, 0.3], seconds=0.4)

bells = mix((suzu(), 0.0), (suzu() * 0.7, 0.08))
# うねり: FM で濁らせた低めの響きを、ゆっくり揺らしながら上へ持ち上げる
swell_len = 0.48
swell = fm(sweep(220, 330, swell_len), ratio=1.5, index=env_points([(0, 3.0), (swell_len, 0.5)], swell_len))
swell = tremolo(swell, 7, 0.5) * env_points([(0, 0.0), (0.12, 1.0), (0.3, 0.6), (swell_len, 0.0)], swell_len)

# 戦闘の音なので、響きは 0.55 秒で切る
sound = Sound("se_magic", fade(trim(reverb(mix(bells * 0.5, swell * 0.3), seconds=0.2, wet=0.25), 0.55), fade_out=0.08), title="術")
