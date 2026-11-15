# 刀を納める（チン・カチャリ）: 鍔が鞘に当たる澄んだ「チン」（0.3 秒）
from sfxlib import *

# 刃が鞘を滑る短い「スッ」
slide = bandpass(noise(0.05), 3000, 9000) * env_points([(0, 0.3), (0.04, 1.0), (0.05, 0.0)], 0.05)
# 鍔が鯉口に当たる「チン」: 高く澄んだ金物（se_guard の「キン」より小さく短い）
f = note("A6") * 1.5
chin = modal([f, f * 2.76, f * 5.4], decays=[0.2, 0.07, 0.025], amps=[1.0, 0.4, 0.2], seconds=0.28)

# カチャリ: 鍔と鞘の金具が小さく鳴って収まる
kacha = modal([1800, 3300], decays=[0.012, 0.006], amps=[1.0, 0.5], seconds=0.05)

sound = Sound("se_sheathe", fade(mix(slide * 0.3, (chin, 0.045), (kacha * 0.25, 0.17)), fade_out=0.04), title="納刀", level=-2)
