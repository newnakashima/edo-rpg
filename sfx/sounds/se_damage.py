# 味方が傷を受ける（画面が揺れるところ）・毒で減る: 低く詰まった衝撃（0.3 秒）
from sfxlib import *

# 当たり: 1.5〜6 kHz の鋭い「バシッ」。小さなスピーカーでもはっきり聞こえる帯域に置く
crack = drive(bandpass(noise(0.012), 1500, 6000) * env_exp(0.012, 0.0025), 2.5)
# 体: 中低域の「ドスッ」。260 Hz から 110 Hz へ落とし、ひずませて倍音を足す（スマホでも聞こえる）
f = sweep(260, 110, 0.16)
thud = drive(sine(f) * env_exp(0.16, 0.035), 3.0)
smack = drive(bandpass(noise(0.05, "pink"), 250, 2200) * env_exp(0.05, 0.012), 2.0)
# 痛み: 角の丸い矩形波を 700 Hz から 180 Hz へ落とす「ズン」。se_hit（打つ側）と区別する受けた側のしるし
g = sweep(700, 180, 0.2)
sting = lowpass(square(g), 2500) * env_points([(0, 0), (0.004, 1), (0.06, 0.5), (0.2, 0)], 0.2)

sound = Sound("se_damage", fade(mix(thud * 0.9, smack * 0.9, crack * 0.8, sting * 0.35), fade_out=0.04),
              title="傷を受ける", level=2,
              notes=["旧版（50〜95 Hz の sine と 900 Hz 以下のノイズ）はプレイ中に聞こえなかった。主な成分を 200 Hz〜6 kHz に置く"])
