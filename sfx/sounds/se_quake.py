# 地響き・大きな足音（ズシン・ゴゴゴ）: 低いうなりと揺れ（1.0 秒）
from sfxlib import *

# ズシン: 地面を踏む重い当たり。低い sine を下へ
thud = drive(sine(sweep(70, 30, 0.35)) * env_exp(0.35, 0.1), 2.0)
thump = lowpass(noise(0.08, "pink"), 600) * env_exp(0.08, 0.02)
# ゴゴゴ: 低いノイズがゆっくり揺れながら続き、消える
rumble = lowpass(noise(1.0, "brown"), 250)
rumble = tremolo(rumble, 9, 0.5) * env_points([(0, 0.0), (0.05, 1.0), (0.5, 0.7), (1.0, 0.0)], 1.0)
# 揺れて物が小さく鳴る
rattle = bandpass(crackle(0.6, density=60, decay=0.003), 800, 3000) * env_points([(0, 1.0), (0.6, 0.0)], 0.6)

sound = Sound("se_quake", fade(mix(thud * 1.0, thump * 0.8, rumble * 0.9, (rattle * 0.25, 0.08)), fade_out=0.15), title="地響き", level=1)
