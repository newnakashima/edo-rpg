# 敵が仲間を呼ぶ: 呼び声（0.5 秒）。からくりを呼ぶ技は se_karakuri
from sfxlib import *

# 指笛のような呼び声: 高く上がって伸び、少し下がって切れる
call_len = 0.42
pitch = glide([(0.0, 1300), (0.06, 1900), (0.3, 1850), (call_len, 1500)], call_len)
call = sine(vibrato(pitch, rate=6, depth=0.01)) + 0.25 * sine(vibrato(pitch * 2, rate=6, depth=0.01))
breath = bandpass(noise(call_len), 1500, 5000) * 0.15
call = mix(call, breath) * env_points([(0, 0.0), (0.03, 1.0), (0.3, 0.8), (call_len, 0.0)], call_len)

# 遠くまで届くような、やまびこ
sound = Sound("se_summon", fade(trim(echo(call, delay=0.09, feedback=0.3, repeats=2), 0.5), fade_out=0.08), title="仲間を呼ぶ", level=-2)
