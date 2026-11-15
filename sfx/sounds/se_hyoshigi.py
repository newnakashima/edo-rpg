# 場面の区切り: 拍子木を高く打つ（0.5 秒）
from sfxlib import *

# 芝居の幕切れの「チョン」: 拍子木を 1 つ、se_jingi（2 つ打ち）より高く鋭く、少し長く響かせる
strike = bandpass(noise(0.003), 2000, 11000) * env_exp(0.003, 0.0008)
clap = modal([2400, 3800, 5600], decays=[0.07, 0.035, 0.015], amps=[1.0, 0.45, 0.2], seconds=0.25, strike=strike)

# 芝居小屋の広さの響き
sound = Sound("se_hyoshigi", fade(trim(reverb(clap, seconds=0.45, wet=0.3, brightness=6000), 0.5), fade_out=0.1), title="拍子木", level=0)
