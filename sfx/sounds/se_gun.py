# 鉄砲: 乾いた破裂「ダーン」と短い残響（0.5 秒）
from sfxlib import *

# 破裂: ごく短い広帯域のノイズを強くひずませる（火縄銃の乾いた音）
crack = drive(highpass(noise(0.03), 800) * env_exp(0.03, 0.006), 4.0)
# 胴: 低い圧の一押し
boom = drive(sine(sweep(110, 45, 0.18)) * env_exp(0.18, 0.04), 2.0)
blast = lowpass(noise(0.25, "pink"), 2500) * env_exp(0.25, 0.05)
shot = mix(crack * 1.4, boom * 0.45, blast * 0.8)

# 尾: 山あいに抜けるような短い残響
sound = Sound("se_gun", fade(reverb(shot, seconds=0.35, wet=0.3, brightness=3500), fade_out=0.08), title="鉄砲", level=1)
