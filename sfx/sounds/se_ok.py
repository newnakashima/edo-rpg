# 決定: 澄んだ短い一打。se_cursor より明るくはっきり（0.1 秒）
from sfxlib import *

# 小さな鈴を 1 つ打つ: 基音に、金物らしい少しずれた上の響きを足す
bell = modal([note("E6"), note("E6") * 2.76, note("E6") * 5.4], decays=[0.04, 0.02, 0.008],
             amps=[1.0, 0.45, 0.2], seconds=0.12)
tick = bandpass(noise(0.003), 3000, 9000) * env_exp(0.003, 0.0007) * 0.6
sound = Sound("se_ok", fade(mix(bell, tick), fade_out=0.02), title="決定", level=-3)
