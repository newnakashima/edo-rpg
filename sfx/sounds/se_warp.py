# 道しるべの札・抜け道で戻る（凧で飛ぶのにも使う）: 風が巻いて遠ざかる（0.6 秒）
from sfxlib import *

# 風: 帯域を上げて巻き上げ、そのあと下げながら細くして遠ざける。左右にも流す
wind_len = 0.6
center = glide([(0, 500), (0.18, 2600), (wind_len, 900)], wind_len)
wind = sweep_filter(noise(wind_len, "pink"), center, kind="bandpass", q=3.0)
wind *= env_points([(0, 0.0), (0.12, 1.0), (0.3, 0.7), (wind_len, 0.0)], wind_len)
# 巻く音: 風の中のかすかな笛の音（高さが上がって消える）
whistle = sine(glide([(0, 900), (0.2, 1700), (0.45, 1300)], 0.45)) * env_points([(0, 0.0), (0.12, 1.0), (0.45, 0.0)], 0.45)

left = np.linspace(-0.6, 0.7, n_of(wind_len))
mono = mix(wind, (whistle * 0.08, 0.05))
st = np.stack([mono * np.sqrt((1 - left) / 2), mono * np.sqrt((1 + left) / 2)], axis=1)
sound = Sound("se_warp", fade(st, fade_out=0.05), title="戻る", level=-2)
