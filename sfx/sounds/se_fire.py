# 火の術・火の攻撃: 燃え上がる「ゴウッ」（0.5 秒）
from sfxlib import *

# ゴウッ: 低い帯域のノイズが一気にふくらんで上へ抜ける（炎が立つ）。drive で太く
roar_len = 0.48
roar = sweep_filter(noise(roar_len, "brown"), glide([(0, 200), (0.08, 1500), (roar_len, 500)], roar_len), kind="lowpass", q=1.2)
roar = drive(roar * env_points([(0, 0.0), (0.06, 1.0), (0.2, 0.7), (roar_len, 0.0)], roar_len) * 2, 2.0)
# はぜる: 火の粉がぱちぱち
sparks = highpass(crackle(roar_len, density=120, decay=0.0012), 2000) * env_points([(0, 0.0), (0.08, 1.0), (roar_len, 0.0)], roar_len)
# 息: 炎が吸い込む中域のゆらぎ
breath = tremolo(bandpass(noise(roar_len, "pink"), 600, 2500), 9, 0.4) * env_points([(0, 0.0), (0.1, 1.0), (roar_len, 0.0)], roar_len)

sound = Sound("se_fire", fade(mix(roar, sparks * 0.5, breath * 0.35), fade_out=0.04), title="火", level=1)
