# 味方が傷を受ける（画面が揺れるところ）・毒で減る: 低く詰まった衝撃（0.3 秒）
from sfxlib import *

# 当たり: 広い帯域の破裂「バキッ」。強くひずませて、耳に刺さる立ち上がりにする
crack = drive(highpass(noise(0.015), 800) * env_exp(0.015, 0.004), 6.0)
# 体1: 中域のノイズを強くひずませた「ドガッ」（叩きつけられる荒さ）
smash = drive(bandpass(noise(0.12, "pink"), 180, 5000) * env_exp(0.12, 0.03), 5.0)
# 体2: 低い sine を大きく落として強くひずませる。倍音が増えて小さなスピーカーでも重さが出る
f = sweep(220, 55, 0.28)
thud = drive(sine(f), 4.0) * env_exp(0.28, 0.05)
# 崩れ: 骨や鎧が軋む、粗いざらつき
crunch = lowpass(bitcrush(crackle(0.12, density=900) + noise(0.12, "brown") * 0.5, bits=4, hold=4), 4000) \
    * env_exp(0.12, 0.035)
# 痛み: 矩形波を 900 Hz から 120 Hz へ急に落とす「グワッ」（受けた側のしるし）
g = sweep(900, 120, 0.22)
sting = drive(lowpass(square(g), 3000), 2.0) * env_points([(0, 0), (0.003, 1), (0.08, 0.6), (0.22, 0)], 0.22)

hit = mix(thud * 0.7, smash * 1.0, crack * 1.2, crunch * 0.6, sting * 0.6)
sound = Sound("se_damage", fade(hit, fade_out=0.05), title="傷を受ける", level=4,
              notes=["旧版（50〜95 Hz の sine と 900 Hz 以下のノイズ）はプレイ中に聞こえなかった。主な成分を 200 Hz〜6 kHz に置く",
                     "2 版目は「全くダメージを受けた感じがしない」。強いひずみと崩れる音を足し、長さと大きさを増やした"])
