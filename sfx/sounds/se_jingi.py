# 仁義が上がる・戦闘で仁義を切る: 拍子木を 2 つ打つ（0.5 秒）
from sfxlib import *

# 樫の拍子木を打ち合わせる「カン」。高い木の共鳴を短く。2 打目は少し強く
# 当たりのノイズは響かせるだけにする（一瞬だけ大きくならないように）
def clap(gain):
    strike = bandpass(noise(0.004), 1500, 9000) * env_exp(0.004, 0.001)
    return modal([1850, 2950, 4400], decays=[0.05, 0.025, 0.012], amps=[1.0, 0.45, 0.2], seconds=0.2, strike=strike) * gain

claps = mix((clap(0.8), 0.0), (clap(1.0), 0.22))
# 板の間に少しだけ響く
sound = Sound("se_jingi", fade(reverb(claps, seconds=0.25, wet=0.18, brightness=5000), fade_out=0.04), title="仁義")
