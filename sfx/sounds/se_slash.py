# 刀・槍の攻撃: 空気を裂く「シュッ」に、斬れる「ザン」（0.3 秒）
from sfxlib import *

# シュッ: 帯域を高い方へ素早く動かしたノイズ。だんだん強まって、斬る瞬間に頂点
whoosh_len = 0.12
whoosh = sweep_filter(noise(whoosh_len), sweep(900, 6500, whoosh_len), kind="bandpass", q=2.5)
whoosh *= env_points([(0, 0.25), (0.09, 1.0), (whoosh_len, 0.2)], whoosh_len)

# ザン: 斬れる瞬間の、ひずんだ中低域のノイズと、刃のかすかな金属の鳴り
cut_len = 0.2
cut = drive(bandpass(noise(cut_len, "pink"), 250, 3500) * env_exp(cut_len, 0.035), 2.5)
ring = modal([2650, 4120], decays=[0.03, 0.02], amps=[0.25, 0.15], seconds=cut_len)

sound = Sound("se_slash", mix(whoosh * 0.7, (cut, 0.09), (ring, 0.09)), title="斬る")
