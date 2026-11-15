# 会心の一撃: 攻撃の音に重ねる、鋭く高い一閃（0.3 秒）
from sfxlib import *

# 一閃: 高い帯域へ一気に駆け上がるノイズ
flash_len = 0.06
flash = sweep_filter(noise(flash_len), sweep(3000, 14000, flash_len), kind="bandpass", q=3.0)
flash *= env_points([(0, 0.3), (0.05, 1.0), (flash_len, 0.0)], flash_len)
# 刃の鳴り: 高く澄んだ金物の響きが光って消える
ring = modal([3900, 3900 * 1.47, 3900 * 2.09], decays=[0.08, 0.05, 0.03], amps=[1.0, 0.6, 0.35], seconds=0.25)

sound = Sound("se_critical", fade(mix(flash, (ring * 0.6, 0.05)), fade_out=0.04), title="会心", level=-1)
