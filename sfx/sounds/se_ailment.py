# 状態異常にかかる（毒・痺れ・眠り・混乱・縛り）: 揺らいで濁る音（0.4 秒）
from sfxlib import *

# 濁る: 少しずれた 2 つの音のうなりを、FM で濁らせ、ゆらゆらと揺らす。高さは少し下がる
ail_len = 0.4
f = vibrato(sweep(note("C5"), note("A4"), ail_len), rate=7, depth=0.03)
murk = fm(f, ratio=1.41, index=2.5) + 0.7 * sine(f * 1.06)
murk = tremolo(lowpass(murk, 2500), 11, 0.6) * env_points([(0, 0.0), (0.03, 1.0), (0.25, 0.7), (ail_len, 0.0)], ail_len)
# じわっと広がる低いもや
haze = lowpass(noise(ail_len, "brown"), 700) * env_points([(0, 0.0), (0.1, 1.0), (ail_len, 0.0)], ail_len)

sound = Sound("se_ailment", fade(mix(murk * 0.6, haze * 0.4), fade_out=0.05), title="状態異常", level=-2)
