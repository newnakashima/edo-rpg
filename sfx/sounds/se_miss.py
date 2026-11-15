# 外れる・かわされる: 空を切る軽い「ヒュッ」（0.2 秒）
from sfxlib import *

# 細い風切り: 帯域を高い方から中ほどへ抜け、当たりのないまま消える（se_slash の「ザン」がない）
whoosh_len = 0.16
whoosh = sweep_filter(noise(whoosh_len), sweep(5000, 1600, whoosh_len), kind="bandpass", q=4.0)
whoosh *= env_points([(0, 0.0), (0.05, 1.0), (whoosh_len, 0.0)], whoosh_len)

sound = Sound("se_miss", fade(whoosh, fade_out=0.02), title="外れる", level=-4)
