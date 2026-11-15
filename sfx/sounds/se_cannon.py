# 大筒: se_gun より低く大きい「ドーン」と長い地鳴り（0.6 秒）
from sfxlib import *

# 破裂: se_gun より低い帯域の、太くひずんだ当たり
crack = drive(bandpass(noise(0.05), 200, 5000) * env_exp(0.05, 0.012), 4.0)
# 胴: 低い圧が下へ沈む「ドーン」
boom = drive(sine(sweep(80, 28, 0.45)) * env_exp(0.45, 0.14), 2.5)
# 地鳴り: 低いノイズが長く尾を引く
rumble = lowpass(noise(0.6, "brown"), 400) * env_points([(0, 0.0), (0.03, 1.0), (0.6, 0.0)], 0.6)
shot = mix(crack * 1.0, boom * 0.8, rumble * 0.9)

# 戦闘の音なので 0.6 秒で切る
sound = Sound("se_cannon", fade(trim(reverb(shot, seconds=0.4, wet=0.25, brightness=1500), 0.6), fade_out=0.12), title="大筒", level=2)
