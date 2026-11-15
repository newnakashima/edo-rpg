# セーブ・ロード・書き出し: 筆を走らせて判を押す「トン」（0.4 秒）
from sfxlib import *

# 筆: 紙を擦るノイズ。帯域を少し上へ動かし、払うように消す
brush_len = 0.2
brush = sweep_filter(noise(brush_len, "pink"), sweep(1800, 4200, brush_len), kind="bandpass", q=1.2)
brush *= env_points([(0, 0.3), (0.015, 0.8), (0.12, 1.0), (brush_len, 0.0)], brush_len)

# 判: 木の判を紙に押す低い「トン」。短い当たりに、低い木の共鳴
thud = bandpass(noise(0.006), 300, 3000) * env_exp(0.006, 0.0015)
stamp = mix(modal([210, 470, 1050], decays=[0.05, 0.025, 0.01], amps=[1.0, 0.5, 0.2], seconds=0.17), thud * 3)

sound = Sound("se_save", fade(mix(brush * 0.5, (stamp, 0.22)), fade_out=0.03), title="セーブ")
