# 文の次のページへ送る: se_cursor よりさらに小さく柔らかい（0.04 秒）
from sfxlib import *

# 紙をめくるような、ごく短く柔らかな「ぽ」。高い当たりを抑え、低めの丸い音にする（何百回鳴っても障らない）
body = sine(sweep(note("A5"), note("E5"), 0.04)) * env_exp(0.04, 0.009, attack=0.002)
touch = bandpass(noise(0.004, "pink"), 800, 3000) * env_exp(0.004, 0.0012) * 0.25
sound = Sound("se_message", fade(mix(body, touch), fade_out=0.008), title="送る", level=-9)
