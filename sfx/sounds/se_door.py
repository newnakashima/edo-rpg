# 戸・襖・出入り: 引き戸を滑らせる「スッ」（0.4 秒）
from sfxlib import *

# 滑り: 木の敷居を擦る柔らかいノイズ。中ほどで強く、帯域を少し下げながら消える
slide_len = 0.34
slide = sweep_filter(noise(slide_len, "pink"), sweep(2600, 1200, slide_len), kind="bandpass", q=0.9)
slide *= env_points([(0, 0.0), (0.06, 1.0), (0.22, 0.8), (slide_len, 0.0)], slide_len)
rumble = lowpass(noise(slide_len, "brown"), 300) * env_points([(0, 0.0), (0.08, 1.0), (slide_len, 0.0)], slide_len)

# 戸が柱に当たって止まる、軽い木の「トッ」
knock = mix(modal([520, 1150], decays=[0.02, 0.01], amps=[1.0, 0.4], seconds=0.06),
            bandpass(noise(0.004), 500, 4000) * env_exp(0.004, 0.001) * 2)

sound = Sound("se_door", fade(mix(slide * 0.6, rumble * 0.4, (knock * 0.35, 0.31)), fade_out=0.02), title="戸", level=-3)
