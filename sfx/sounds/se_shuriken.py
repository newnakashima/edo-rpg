# 手裏剣: 細く鋭い風切りが続けて刺さる（0.4 秒）
from sfxlib import *

# 風切り: 回る手裏剣の細い「ヒュルッ」。高い帯域のノイズを回転の速さで震わせ、高い方へ動かす
fly_len = 0.16
fly = sweep_filter(noise(fly_len), sweep(3500, 8000, fly_len), kind="bandpass", q=6.0)
fly = tremolo(fly, 45, 0.7) * env_points([(0, 0.1), (0.13, 1.0), (fly_len, 0.3)], fly_len)
# 刺さる: 木に刺さる短く硬い「トッ」と、刃の小さな震え
stick = mix(modal([1300, 2700], decays=[0.012, 0.006], amps=[1.0, 0.4], seconds=0.06),
            bandpass(noise(0.003), 2000, 10000) * env_exp(0.003, 0.0006) * 2)
quiver = modal([4800], decays=[0.04], amps=[0.15], seconds=0.12)

one = mix(fly * 0.7, (stick, fly_len), (quiver, fly_len))
# 2 つ続けて（2 つ目は少し小さく、高く）
sound = Sound("se_shuriken", fade(mix(one, (one * 0.75, 0.13)), fade_out=0.03), title="手裏剣", level=-1)
