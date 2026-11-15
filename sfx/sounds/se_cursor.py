# カーソル移動: ごく短く乾いた、木を軽くはじく音。何度鳴っても耳に障らない（0.05 秒）
from sfxlib import *

# 小さな木片をはじく: 高めの共鳴を 2 つ、すぐ消す。打った瞬間の手ざわりに短いノイズ
tap = bandpass(noise(0.004), 1500, 7000) * env_exp(0.004, 0.0008)
wood = modal([1850, 3100], decays=[0.007, 0.004], amps=[1.0, 0.5], seconds=0.05, strike=tap)
sound = Sound("se_cursor", fade(wood, fade_out=0.01), title="カーソル移動", level=-6)
