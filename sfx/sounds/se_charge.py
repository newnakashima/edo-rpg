# 敵が力をためる・装填する: ためて張り詰める（0.5 秒）
from sfxlib import *

# ため: 低いうなりが上へ上がりながら強くなる（揺れを速くして張り詰める）
rise_len = 0.42
rise = fm(sweep(110, 440, rise_len), ratio=2.0, index=env_points([(0, 0.5), (rise_len, 2.5)], rise_len))
rise = tremolo(rise, 14, 0.4) * env_points([(0, 0.3), (0.35, 1.0), (rise_len, 0.7)], rise_len)
# 空気が吸い込まれる音: ノイズのフィルタを上へ
air = sweep_filter(noise(rise_len, "pink"), sweep(300, 4000, rise_len), "bandpass", q=2.0)
air = air * env_points([(0, 0.2), (0.38, 1.0), (rise_len, 0.0)], rise_len)
# 最後に「カチッ」と張る（装填の金具）
click = modal([2600, 5200], decays=[0.02, 0.01], amps=[1.0, 0.4], seconds=0.08,
              strike=bandpass(noise(0.002), 2000, 9000) * env_exp(0.002, 0.0005))

sound = Sound("se_charge", fade(mix(rise * 0.5, air * 0.5, (click * 0.8, 0.42)), fade_out=0.04), title="ためる", level=-1)
