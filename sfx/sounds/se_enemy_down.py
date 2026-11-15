# 敵を倒す: 崩れて消える（0.4 秒）
from sfxlib import *

# 崩れ: ざらざらした粒が、こもりながら細かく散って消える
crumble_len = 0.38
crumble = sweep_filter(crackle(crumble_len, density=900, decay=0.003), sweep(6000, 400, crumble_len), kind="lowpass")
crumble *= env_points([(0, 1.0), (0.1, 0.8), (crumble_len, 0.0)], crumble_len)
# 消える: 下へ抜けていく息のような音
fall = sweep_filter(noise(crumble_len, "pink"), sweep(2500, 250, crumble_len), kind="bandpass", q=1.5)
fall *= env_points([(0, 0.0), (0.03, 1.0), (crumble_len, 0.0)], crumble_len)
hit = lowpass(noise(0.03, "pink"), 1500) * env_exp(0.03, 0.008)

sound = Sound("se_enemy_down", fade(mix(crumble, fall * 0.5, hit * 0.6), fade_out=0.04), title="敵を倒す")
