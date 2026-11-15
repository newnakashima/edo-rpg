# 選べない・できない: 低く濁った短い音。叱られた感じは弱め（0.2 秒）
from sfxlib import *

# 低めの濁った音を 2 つ短く「ブブッ」。fm で濁らせ、lowpass で角を丸めて強く責めない音にする
def blip(seconds):
    tone = fm(155, 1.41, 1.6, seconds) + 0.4 * square(155, seconds)
    return lowpass(tone, 1400) * env_adsr(seconds, attack=0.004, decay=0.02, sustain=0.7, release=0.02)

sound = Sound("se_buzzer", fade(mix(blip(0.075), (blip(0.09), 0.1)), fade_out=0.015), title="選べない", level=-5)
