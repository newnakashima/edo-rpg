# 味方が傷を受ける（画面が揺れるところ）・毒で減る: 低く詰まった衝撃（0.3 秒）
import numpy as np
from sfxlib import *


def clip(x, gain):
    """振幅を上げて ±1 で切る（ハードクリップ）。少し歪ませて潰れた打撃にする。"""
    x = x / (np.max(np.abs(x)) + 1e-9)
    return np.clip(x * gain, -1.0, 1.0)


# 1 打目: 低い打撃「ドッ」。体に重く響く
low_click = lowpass(noise(0.006), 3000) * env_exp(0.006, 0.0015)
low_body = sine(sweep(160, 55, 0.18)) * env_exp(0.18, 0.045)
low_thump = lowpass(noise(0.08, "pink"), 500) * env_exp(0.08, 0.02)
low_hit = mix(low_body, low_thump * 0.7, low_click * 0.5)

# 2 打目: 高い打撃「バシッ」。乾いた破裂に、短い中高域の鳴り
high_crack = bandpass(noise(0.03), 1500, 8000) * env_exp(0.03, 0.006)
high_body = modal([620, 1050, 1730], decays=[0.03, 0.02, 0.012], amps=[1.0, 0.6, 0.35], seconds=0.08)
high_hit = fade(mix(high_crack, high_body * 0.6), fade_out=0.02)

LAG = 0.055  # 2 打目までの間（立て続けに聞こえる長さ）
hit = mix(clip(low_hit, 1.8) * 1.0, (clip(high_hit, 2.5) * 0.75, LAG))
sound = Sound("se_damage", fade(clip(hit, 1.4), fade_out=0.04), title="傷を受ける", level=3,
              notes=["旧版（50〜95 Hz の sine と 900 Hz 以下のノイズ）はプレイ中に聞こえなかった",
                     "3 版目（ひずみ・ビット落とし・矩形波の「グワッ」）は「非常にチープで打撃に聞こえない」と言われた",
                     "要望: 低い打撃と高い打撃を立て続けに鳴らし、波形をクリップして少し歪ませる"])
